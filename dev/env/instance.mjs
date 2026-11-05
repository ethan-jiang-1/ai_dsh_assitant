#!/usr/bin/env node
/**
 * dev Web 实例账本：让 `pnpm start` 在**已经有健康实例**时直接交接，而不是每次重造一个。
 *
 * 为什么需要（实测 2026-11-05）：一条 `pnpm start` 的热启动 ≈ 12.4s（setup 5.0s + boot 3.7s +
 * preflight 1.1s + 自证/杂项），冷启动那次 36.8s；而复用只需 preflight 的那 1.1s。开发时
 * "启动一下"按的往往是同一个实例——重造一个只是多等十几秒外加多一个端口。
 *
 * 判据保守：账本里记着没人杀、且**插件产物没有比它更新**才复用。陈旧实例最坏的样子是
 * "改了 lib/ 却没重建进浏览器"，所以任何 lib/、presets/、dev overlay、profile patch 的 mtime
 * 晚于实例启动时刻，就判定该实例已经过期，交回调用方去新起一个（`dev/env/start.sh` 会顺手收掉旧的）。
 *
 * 账本住仓库内 `.tmp/start/instance.json`（硬规则 8；`.tmp/` 不入库）。
 * CLI（供 start.sh 调用，不给人敲）：
 *   node dev/env/instance.mjs --check  <repoRoot> <profile>   # 可复用→stdout 打 URL、exit 0
 *   node dev/env/instance.mjs --record <repoRoot> <profile> <url> <pid>
 *   node dev/env/instance.mjs --stop   <repoRoot>             # 收掉账本里的实例（连带进程组）
 *   node dev/env/instance.mjs --clear  <repoRoot>
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 产物面：这些路径下任何文件比实例新，就说明实例加载的是旧代码。 */
const ARTIFACT_ROOTS = [
  'packages/dsh-smart-assistant/lib',
  'packages/dsh-smart-assistant/presets',
]

/**
 * pin 面：升级 vendor/dsh 后必须重启实例——它加载的 host/client 代码全来自那里。
 * 只看一个文件（升级簿记），因为整棵 vendor 树扫描太贵，而降 pin 一定会动这一行。
 */
const PIN_FILES = ['vendor/UPSTREAM.md']

export function registryPath(repoRoot) {
  return join(repoRoot, '.tmp', 'start', 'instance.json')
}

/** 目录/文件树里最新的 mtime（ms）；不存在算 0。 */
export function newestMtime(path) {
  let newest = 0
  const stack = [path]
  while (stack.length > 0) {
    const current = stack.pop()
    let stat
    try {
      stat = statSync(current)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) stack.push(join(current, entry))
      continue
    }
    if (stat.mtimeMs > newest) newest = stat.mtimeMs
  }
  return newest
}

export function readRegistry(repoRoot) {
  const file = registryPath(repoRoot)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM 说明进程在、只是不归我们；那也算活着（复用判据只关心"还有没有人在服务"）。
    return error?.code === 'EPERM'
  }
}

/**
 * 账本条目是否还能直接交接。
 * @param {{ repoRoot: string, profile: string, entry: unknown }} input
 * @returns {{ reusable: boolean, reasons: string[] }}
 */
export function instanceReusable({ repoRoot, profile, entry }) {
  if (!entry || typeof entry !== 'object') return { reusable: false, reasons: ['no instance recorded'] }
  const reasons = []
  if (entry.profile !== profile) reasons.push(`recorded profile is ${String(entry.profile)}, expected ${profile}`)
  if (typeof entry.url !== 'string' || !/^http:\/\/127\.0\.0\.1:\d+\/\?token=/.test(entry.url)) {
    reasons.push('recorded url is not a tokenised 127.0.0.1 URL')
  }
  if (!pidAlive(entry.pid)) reasons.push(`pid ${String(entry.pid)} is not running`)
  if (!Number.isFinite(entry.startedAt)) {
    reasons.push('recorded startedAt is not a timestamp')
  } else {
    const artifacts = [
      ...ARTIFACT_ROOTS.map(root => join(repoRoot, root)),
      ...PIN_FILES.map(file => join(repoRoot, file)),
      join(repoRoot, 'dev', 'harness-home', `dev-overlay-${profile}.yml`),
      join(repoRoot, 'dev', 'harness-home', 'profiles', profile, 'cordis.patch.yml'),
      join(repoRoot, 'dev', 'harness-home', 'profiles', profile, 'package.json'),
    ]
    const newest = artifacts.reduce((latest, path) => Math.max(latest, newestMtime(path)), 0)
    if (newest > entry.startedAt) {
      reasons.push('artifacts changed after the instance started (lib/presets/overlay newer than startedAt)')
    }
  }
  return { reusable: reasons.length === 0, reasons }
}

function record(repoRoot, profile, url, pid) {
  const file = registryPath(repoRoot)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify({ profile, url, pid: Number(pid), startedAt: Date.now() }, null, 2)}\n`)
}

function clear(repoRoot) {
  rmSync(registryPath(repoRoot), { force: true })
}

function stop(repoRoot) {
  const entry = readRegistry(repoRoot)
  if (entry && pidAlive(entry.pid)) {
    try {
      // 负 pid = 连进程组一起收（detach 出来的 CLI 自成一个组）。
      process.kill(-entry.pid, 'SIGTERM')
    } catch {
      try {
        process.kill(entry.pid, 'SIGTERM')
      } catch {
        /* already gone */
      }
    }
  }
  clear(repoRoot)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , command, ...rest] = process.argv
  if (command === '--check') {
    const [repoRoot, profile] = rest
    const entry = readRegistry(repoRoot)
    const { reusable, reasons } = instanceReusable({ repoRoot, profile, entry })
    if (!reusable) {
      console.error(reasons[0] ?? 'instance is not reusable')
      process.exit(1)
    }
    console.log(entry.url)
  } else if (command === '--record') {
    const [repoRoot, profile, url, pid] = rest
    record(repoRoot, profile, url, pid)
  } else if (command === '--stop') {
    stop(rest[0])
  } else if (command === '--print-pid') {
    const entry = readRegistry(rest[0])
    if (!entry) process.exit(1)
    console.log(String(entry.pid))
  } else if (command === '--clear') {
    clear(rest[0])
  } else {
    console.error('usage: instance.mjs --check|--record|--stop|--clear ...')
    process.exit(2)
  }
}
