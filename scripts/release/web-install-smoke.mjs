#!/usr/bin/env node
/**
 * Standard Web install smoke: fresh `HOME` + `DSH_HOME`, shipped `web` profile, real tarball,
 * then preflight + the agent-preset UI probe. This is the path a normal user follows; it is
 * deliberately separate from `standalone-smoke`, which exercises the bootstrap profile.
 *
 * Usage: pnpm web-install-smoke [--dsh <path>] [--tarball <tgz>] [--keep]
 * Requires a prepared DSH CLI and Chrome (CHROME_PATH or the macOS default). No key is used.
 */
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const option = name => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const version = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).version
const dsh = resolve(option('--dsh') ?? 'dsh')
const tarball = resolve(option('--tarball') ?? join(repoRoot, '_dist', `dsh-smart-assistant-${version}.tgz`))
const keep = argv.includes('--keep')
const chrome = process.env.CHROME_PATH
  ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', ...options })

if (!existsSync(dsh)) {
  console.error(`web-install-smoke: DSH CLI not found: ${dsh}`)
  process.exit(2)
}
if (!existsSync(tarball)) {
  console.error(`web-install-smoke: tarball not found: ${tarball}`)
  process.exit(2)
}
if (chrome === undefined || !existsSync(chrome)) {
  console.log('web-install-smoke: skipped — no Chrome executable; set CHROME_PATH to run the UI path')
  process.exit(0)
}

const smokeRoot = join(repoRoot, '.tmp', 'web-install-smoke')
mkdirSync(smokeRoot, { recursive: true })
const root = mkdtempSync(join(smokeRoot, 'run-'))
const home = join(root, 'home')
const dshHome = join(root, 'dsh-home')
const agents = join(root, 'agents')
const workspace = join(root, 'workspace')
const tmp = join(root, 'tmp')
mkdirSync(home, { recursive: true })
mkdirSync(workspace, { recursive: true })
mkdirSync(tmp, { recursive: true })
const env = { ...process.env, HOME: home, DSH_HOME: dshHome, DSH_AGENTS_HOME: agents, TMPDIR: tmp }
const packagePath = join(dshHome, 'profiles', 'web', 'node_modules', 'dsh-smart-assistant')
let server

try {
  step('checking the DSH CLI')
  const versionRun = run(dsh, ['--version'], { env, cwd: workspace })
  if (versionRun.status !== 0) fail(`dsh --version failed: ${(versionRun.stderr ?? '').trim()}`)
  else ok(versionRun.stdout.trim())

  step('creating the shipped web profile')
  const profile = run(dsh, ['--profile', 'web', '--dump-config'], { env, cwd: workspace })
  if (profile.status !== 0) fail(`profile creation failed: ${(profile.stderr ?? profile.stdout ?? '').trim().slice(-400)}`)
  else ok('web profile ready')

  step('installing the tarball')
  const installed = run(dsh, ['plugin', '--profile', 'web', 'add', tarball], { env, cwd: workspace })
  if (installed.status !== 0) fail(`install failed: ${(installed.stderr ?? installed.stdout ?? '').trim().slice(-600)}`)
  else ok('installed')
  if (existsSync(join(dshHome, 'assistant'))) fail('install created a working folder')
  else ok('install wrote no working folder')

  step('starting the standard Web instance')
  const webLog = join(root, 'web.log')
  const logFd = openSync(webLog, 'a')
  server = spawn(dsh, ['--profile', 'web', '--port', '0', '--no-open'], {
    cwd: workspace,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  })
  closeSync(logFd)
  server.unref()
  let url
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    const text = existsSync(webLog) ? readFileSync(webLog, 'utf8') : ''
    url = /http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/.exec(text)?.[0]
    if (url !== undefined) break
    await new Promise(done => setTimeout(done, 500))
  }
  if (url === undefined) fail(`no URL within 90s; log tail:\n${readFileSync(webLog, 'utf8').split('\n').slice(-10).join('\n')}`)
  else ok(url)

  if (url !== undefined) {
    step('preflight')
    const preflight = run(process.execPath, [join(repoRoot, 'dev', 'probes', 'web', 'webui-preflight.mjs'), url], { timeout: 120_000 })
    if (preflight.status !== 0) fail(`preflight failed: ${(preflight.stderr ?? preflight.stdout ?? '').trim().split('\n').slice(-8).join(' | ')}`)
    else ok('preflight green')

    step('client boot and preset selection')
    const preset = run(process.execPath, [join(repoRoot, 'dev', 'probes', 'web', 'agent-preset-ui.mjs'), url], { timeout: 180_000 })
    if (preset.status !== 0) fail(`preset UI probe failed: ${(preset.stderr ?? preset.stdout ?? '').trim().split('\n').slice(-8).join(' | ')}`)
    else ok('client booted and preset selection passed')

    step('first-boot data')
    if (!existsSync(join(dshHome, 'assistant', 'SOUL.md'))) fail('first boot did not create SOUL.md')
    else if (!existsSync(join(dshHome, 'assistant', 'AGENTS.md'))) fail('first boot did not create AGENTS.md')
    else ok('working-folder identity scaffold created under the isolated home')
    if (existsSync(join(packagePath, 'assistant'))) fail('working folder was written into the package')
    else ok('package directory carries no working folder')
  }
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (server?.pid !== undefined) {
    try { process.kill(-server.pid, 'SIGTERM') } catch { /* already gone */ }
    await new Promise(done => setTimeout(done, 800))
    try { process.kill(-server.pid, 'SIGKILL') } catch { /* already gone */ }
  }
  if (keep || failures.length > 0) console.log(`\nkept ${root}`)
  else rmSync(root, { recursive: true, force: true })
}

console.log('')
if (failures.length === 0) {
  console.log('web-install-smoke: passed')
  process.exit(0)
}
console.log(`web-install-smoke: ${failures.length} failure(s)`)
process.exit(1)
