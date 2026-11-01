#!/usr/bin/env node
/**
 * Native product proof: create the dedicated `assistant` profile from the shipped web template,
 * install the tarball through `dsh plugin` (CLI web automation), start `dsh --profile assistant`,
 * and prove the product works **without** the bootstrap launcher:
 *
 *   GET  /api/assistant/product        → not-configured + onboarding
 *   POST /api/assistant/product        → ready + workspace registration + profile Config
 *   in-process probe                   → a session created with that workspaceId has header.cwd
 *
 * The smoke never touches the daily `~/.dsh`: home and workspace live under `.tmp/`.
 *
 * Usage: node scripts/release/product-native-smoke.mjs [--keep]
 * Exit 0 = profile/install/dump/GET/POST/registration/session cwd/Config all correct.
 */
import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const keep = process.argv.includes('--keep')
const root = mkTmpDir('product-native-smoke', 'run-')
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', ...options })
const text = result => `${result.stdout ?? ''}${result.stderr ?? ''}`

const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const wrapperDir = join(root, 'bin')
const wrapper = join(wrapperDir, 'dsh')
const home = join(root, 'home')
const workspace = join(root, 'workspace')
const profilesDir = join(home, 'profiles', 'assistant')
let server

try {
  step('packing and extracting the shipped package')
  const packed = run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', root])
  const tarball = join(root, `${packageJson.name}-${packageJson.version}.tgz`)
  if (packed.status !== 0 || !existsSync(tarball)) fail(`pack failed: ${(packed.stderr ?? '').trim().slice(0, 300)}`)
  else ok(`packed ${tarball}`)

  mkdirSync(wrapperDir, { recursive: true })
  mkdirSync(home, { recursive: true })
  mkdirSync(workspace, { recursive: true })
  const tsx = fileURLToPath(import.meta.resolve('tsx/esm'))
  const cli = join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  writeFileSync(wrapper, `#!/bin/sh\nexport TSX_TSCONFIG_PATH="${join(repoRoot, 'tsconfig.tsx.json')}"\nexec "${process.execPath}" --import "${tsx}" "${cli}" "$@"\n`, 'utf8')
  chmodSync(wrapper, 0o755)
  const env = {
    ...process.env,
    DSH_HOME: home,
    DSH_AGENTS_HOME: join(home, 'agents-home'),
    DSH_TELEMETRY_DISABLED: '1',
    TMPDIR: join(home, 'tmp'),
    TMP: join(home, 'tmp'),
    TEMP: join(home, 'tmp'),
  }
  mkdirSync(join(home, 'tmp'), { recursive: true })

  step('creating the dedicated assistant profile and installing the tarball (no launcher)')
  const created = run(wrapper, ['--profile', 'assistant', '--from-default-profile', 'web', '--dump-config'], { env, cwd: workspace, timeout: 180_000 })
  if (created.status !== 0) fail(`profile creation failed: ${text(created).trim().slice(-500)}`)
  else ok('assistant profile created from the web template')
  const installed = run(wrapper, ['plugin', '--profile', 'assistant', 'add', tarball], { env, cwd: workspace, timeout: 300_000 })
  if (installed.status !== 0) fail(`plugin add failed: ${text(installed).trim().slice(-500)}`)
  else ok('tarball installed through dsh plugin')

  const dump = run(wrapper, ['--profile', 'assistant', '--dump-config'], { env, cwd: workspace, timeout: 120_000 })
  if (dump.status !== 0) fail('dump-config failed')
  else if (!dump.stdout.includes('assistant-product') || !dump.stdout.includes('preset-assistant')) {
    fail('dump-config lacks assistant-product or preset-assistant')
  } else ok('dump-config has the product row and preset')

  step('installing the in-process session probe')
  writeFileSync(join(profilesDir, 'product-native-probe.mjs'), `import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const name = 'product-native-probe'
export const inject = ['workspaceRegistry', 'sessionController', 'sessions']

export function apply(ctx) {
  const home = process.env.DSH_HOME
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const write = value => writeFileSync(join(home, 'native-probe.json'), JSON.stringify(value) + '\\n', { encoding: 'utf8', mode: 0o600 })
  const main = async () => {
    let ws
    for (let index = 0; index < 200; index += 1) {
      ws = ctx.workspaceRegistry.list()[0]
      if (ws !== undefined) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (ws === undefined) throw new Error('no registered workspace within 20s')
    const created = await ctx.sessionController.create({ workspaceId: ws.id, agentPreset: 'assistant' })
    const session = ctx.sessions.get(created.sessionId)
    write({ workspacePath: ws.path, workspaceId: ws.id, cwd: session?.header.cwd, preset: created.agentPreset })
  }
  main().catch(error => { try { write({ error: String(error?.stack ?? error) }) } catch { /* best effort */ } })
}
`, 'utf8')
  const patchPath = join(profilesDir, 'cordis.patch.yml')
  const currentPatch = readFileSync(patchPath, 'utf8')
  const probeBlock = `- insert:
    - id: product-native-probe
      name: './product-native-probe.mjs'
`
  // A fresh web template ends in a bare `[]`; appending after it is a second YAML document.
  writeFileSync(patchPath, /^\s*\[\]\s*$/m.test(currentPatch)
    ? currentPatch.replace(/^\s*\[\]\s*$/m, probeBlock.trimEnd())
    : `${currentPatch.trimEnd()}\n${probeBlock}`, 'utf8')

  step('booting dsh --profile assistant without a workspace binding')
  const logPath = join(home, 'native-server.log')
  const logFd = openSync(logPath, 'a')
  server = spawn(wrapper, ['--profile', 'assistant', '--port', '0', '--no-open'], {
    cwd: workspace,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  })
  closeSync(logFd)
  server.unref()
  const deadline = Date.now() + 90_000
  let url
  while (Date.now() < deadline) {
    const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : ''
    url = /http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/.exec(log)?.[0]
    if (url !== undefined) break
    if (server.pid !== undefined) {
      try { process.kill(server.pid, 0) } catch { fail(`server exited before a URL; log:\n${log.slice(-800)}`); throw new Error('server exited') }
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  if (url === undefined) { fail(`no URL within 90s; log:\n${existsSync(logPath) ? readFileSync(logPath, 'utf8').slice(-800) : ''}`); throw new Error('no url') }
  ok('server handed over a token URL')

  const tokenResponse = await fetch(url, { redirect: 'manual' })
  const cookie = tokenResponse.headers.get('set-cookie')?.split(';')[0]
  if (tokenResponse.status !== 303 || cookie === undefined) fail(`token gate failed: ${tokenResponse.status} ${String(cookie)}`)
  else ok('token URL set the session cookie')
  const base = new URL(url)
  base.search = ''
  base.pathname = '/api/assistant/product'
  const getResponse = await fetch(base, { headers: { cookie } })
  const initial = await getResponse.json()
  if (getResponse.status !== 200 || initial.status !== 'not-configured' || initial.onboarding !== true) {
    fail(`expected not-configured + onboarding, got ${getResponse.status} ${JSON.stringify(initial)}`)
  } else ok('GET reports not-configured + onboarding')

  step('binding a workspace through the product route')
  const posted = await fetch(base, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceDir: workspace }),
  })
  const ready = await posted.json()
  if (posted.status !== 200 || ready.status !== 'ready' || typeof ready.workspaceId !== 'string') {
    fail(`POST did not bind: ${posted.status} ${JSON.stringify(ready)}`)
  } else ok('POST bound the workspace and returned a registration id')

  step('waiting for the probe-created session')
  const probePath = join(home, 'native-probe.json')
  const probeDeadline = Date.now() + 30_000
  while (!existsSync(probePath) && Date.now() < probeDeadline) await new Promise(resolve => setTimeout(resolve, 250))
  if (!existsSync(probePath)) fail('probe result did not appear within 30s')
  else {
    let probe
    try { probe = JSON.parse(readFileSync(probePath, 'utf8')) } catch { probe = undefined }
    if (probe?.error !== undefined) fail(`probe failed: ${String(probe.error).slice(0, 400)}`)
    else if (probe?.cwd !== realpathSync(workspace)) fail(`session cwd mismatch: ${JSON.stringify(probe)}`)
    else if (probe?.preset !== 'assistant') fail(`session preset mismatch: ${JSON.stringify(probe)}`)
    else ok('session header.cwd equals the workspace')
  }

  const patchText = readFileSync(join(profilesDir, 'cordis.patch.yml'), 'utf8')
  if (!new RegExp(`workspaceDir:.*${realpathSync(workspace).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`).test(patchText)) {
    fail(`profile patch does not persist workspaceDir: ${patchText.slice(-500)}`)
  } else ok('profile Config persists the canonical workspace')
} finally {
  if (server?.pid !== undefined) {
    try { process.kill(-server.pid, 'SIGTERM') } catch { try { process.kill(server.pid, 'SIGTERM') } catch { /* already gone */ } }
  }
  if (!keep) rmSync(root, { recursive: true, force: true })
  else console.log(`\nkept ${root}`)
}

if (failures.length > 0) {
  console.log(`\nproduct-native-smoke: ${failures.length} failure(s)`)
  process.exit(1)
}
console.log('\nproduct-native-smoke: passed')
