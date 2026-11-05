#!/usr/bin/env node
/**
 * `dev/env/setup.sh` 的"已经装好就跳过 `dsh plugin add`"判据。
 *
 * 为什么需要（实测 2026-11-05）：`pnpm start` 热启动 12.4s 里 setup 占 5.0s，其中两段
 * `dsh plugin add`（dev 与 dev-task 各一次）≈ 4s——而它们只在**插件清单或 profile 变过**
 * 时才可能产生不同结果。每次启动都重跑，等于为"可能变过"付 4s。
 *
 * 判据保守，三件事同时成立才算"已经装好"：
 *   1. profile 的 `dsh.profile.bundles` 点名本插件；
 *   2. 依赖项是**同一路径的 link**（裸路径 = pnpm link 语义；`file:` 是复制语义，不算）；
 *   3. `node_modules/<name>` 在，且安装时留下的**清单指纹**与本包当前 package.json 一致。
 * 任何一条不成立就照常 `plugin add`——跳过只在"跑了也不会变"时发生。指纹变了、profile 被
 * 手改过、包被挪过位置，都会回到安装路径。`ASSISTANT_FORCE_PLUGIN_ADD=1` 是无条件重装的口子。
 *
 * CLI（供 setup.sh 调用）：
 *   node dev/env/plugin-link.mjs --check <profileDir> <packageDir>   # 可跳过→exit 0
 *   node dev/env/plugin-link.mjs --stamp <profileDir> <packageDir>   # plugin add 成功后记指纹
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PLUGIN_NAME = 'dsh-smart-assistant'
export const STAMP_FILE = '.assistant-plugin.stamp'

/** 清单指纹：package.json 字节 + 安装路径（路径换了，link 就不是同一条）。 */
export function pluginFingerprint(packageDir) {
  const manifest = readFileSync(join(packageDir, 'package.json'))
  return createHash('sha256').update(manifest).update(`\n${packageDir}\n`).digest('hex')
}

/**
 * @param {{ profileDir: string, packageDir: string, name?: string }} input
 * @returns {{ current: boolean, reasons: string[] }}
 */
export function pluginLinkIsCurrent({ profileDir, packageDir, name = PLUGIN_NAME }) {
  const manifestPath = join(profileDir, 'package.json')
  if (!existsSync(manifestPath)) return { current: false, reasons: [`${manifestPath} missing`] }
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    return { current: false, reasons: [`${manifestPath} is not valid JSON: ${String(error)}`] }
  }
  const reasons = []
  const bundles = manifest?.dsh?.profile?.bundles ?? []
  if (!Array.isArray(bundles) || !bundles.includes(name)) reasons.push(`bundles does not list ${name}`)
  const expected = `link:${packageDir}`
  const recorded = manifest?.dependencies?.[name]
  if (recorded !== expected) reasons.push(`dependency is ${String(recorded ?? 'missing')}, expected ${expected}`)
  if (!existsSync(join(profileDir, 'node_modules', name))) reasons.push(`node_modules/${name} is missing`)
  const stampPath = join(profileDir, 'node_modules', STAMP_FILE)
  const stamp = existsSync(stampPath) ? readFileSync(stampPath, 'utf8').trim() : ''
  if (stamp !== pluginFingerprint(packageDir)) reasons.push('plugin manifest changed since the last plugin add')
  return { current: reasons.length === 0, reasons }
}

/** plugin add 成功之后落指纹；下次启动凭它判断清单有没有变。 */
export function writePluginStamp(profileDir, packageDir) {
  const file = join(profileDir, 'node_modules', STAMP_FILE)
  writeFileSync(file, `${pluginFingerprint(packageDir)}\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , command, profileDir, packageDir] = process.argv
  if (command === '--check') {
    const { current, reasons } = pluginLinkIsCurrent({ profileDir, packageDir })
    if (!current) {
      console.error(reasons[0] ?? 'plugin link is not current')
      process.exit(1)
    }
  } else if (command === '--stamp') {
    writePluginStamp(profileDir, packageDir)
  } else {
    console.error('usage: plugin-link.mjs --check|--stamp <profileDir> <packageDir>')
    process.exit(2)
  }
}
