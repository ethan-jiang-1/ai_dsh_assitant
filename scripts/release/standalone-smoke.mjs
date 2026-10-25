#!/usr/bin/env node
/**
 * Clean-room proof for the standalone directory mode:
 * pack → extract without .git → `bootstrap.mjs` with a wrapper `dsh` → preflight → stop.
 *
 * The wrapper exists only because this checkout's `dsh` is the pinned source CLI; a real user has
 * `dsh` on PATH. The test never starts the repo's normal dev stack, and keeps the bootstrap's home
 * under `.tmp/` so the daily `~/.dsh` is not involved.
 *
 * Usage: node scripts/release/standalone-smoke.mjs [--keep]
 * Exit 0 = instance started, preflight green, data under the chosen home, stop left no process.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const keep = process.argv.includes('--keep')
const root = mkTmpDir('standalone-smoke', 'run-')
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options })
}

function bootstrap(args, binary = join(packageDir, 'bootstrap.mjs')) {
  return run(process.execPath, [binary, ...args], { cwd: root, timeout: 300_000 })
}

const home = join(root, 'data')
const profile = 'assistant-standalone'
const wrapperDir = join(root, 'bin')
const wrapper = join(wrapperDir, 'dsh')

try {
  step(`packing into ${root}`)
  const packed = run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', root])
  const tarball = join(root, `dsh-smart-assistant-${JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).version}.tgz`)
  if (packed.status !== 0 || !existsSync(tarball)) fail(`pack failed: ${(packed.stderr ?? '').trim().slice(0, 300)}`)
  else ok(`packed ${tarball}`)

  const extracted = join(root, 'pkg')
  mkdirSync(extracted, { recursive: true })
  const untar = run('tar', ['-xzf', tarball, '-C', extracted])
  const pkg = join(extracted, 'package')
  if (untar.status !== 0 || !existsSync(join(pkg, 'bootstrap.mjs'))) fail('extracted package has no bootstrap.mjs')
  else if (existsSync(join(pkg, '.git'))) fail('extracted package unexpectedly carries .git')
  else ok('extracted package has bootstrap.mjs and no .git')

  mkdirSync(wrapperDir, { recursive: true })
  const tsx = fileURLToPath(import.meta.resolve('tsx/esm'))
  const cli = join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  writeFileSync(wrapper, `#!/bin/sh\nexport TSX_TSCONFIG_PATH="${join(repoRoot, 'tsconfig.tsx.json')}"\nexec "${process.execPath}" --import "${tsx}" "${cli}" "$@"\n`, 'utf8')
  chmodSync(wrapper, 0o755)

  step('bootstrapping the extracted directory with an isolated home')
  const started = bootstrap(['--home', home, '--dsh', wrapper], join(pkg, 'bootstrap.mjs'))
  if (started.status !== 0) {
    fail(`bootstrap failed (exit ${String(started.status)}):\n${(started.stderr ?? started.stdout ?? '').trim().split('\n').slice(-12).join('\n')}`)
  } else {
    ok('bootstrap exited after handing over a URL')
  }

  let state
  try {
    state = JSON.parse(readFileSync(join(home, 'bootstrap.json'), 'utf8'))
  } catch {
    fail(`no bootstrap.json under ${home}`)
  }

  if (state !== undefined) {
    if (typeof state.url !== 'string' || !state.url.startsWith('http://127.0.0.1:')) fail('bootstrap.json has no loopback URL')
    else ok(`URL ${state.url}`)
    if (!existsSync(join(home, 'profiles', profile, 'package.json'))) fail('profile manifest is missing')
    else ok(`profile ${profile} is in ${home}`)
    if (!existsSync(join(home, 'profiles', profile, 'node_modules', 'dsh-smart-assistant', 'package.json'))) fail('the package is not installed in the profile')
    else ok('package installed into the isolated profile')
    if (!existsSync(join(home, 'workspace')) || !existsSync(join(home, 'agents-home'))) fail('workspace/agents-home missing')
    else ok('workspace and agents-home live under the chosen home')

    step('preflight against the standalone instance')
    const preflight = run(process.execPath, [join(repoRoot, 'dev', 'probes', 'web', 'webui-preflight.mjs'), state.url], { timeout: 120_000 })
    if (preflight.status !== 0) fail(`preflight failed: ${(preflight.stderr ?? preflight.stdout ?? '').trim().split('\n').slice(-10).join(' | ')}`)
    else ok('preflight green')

    step('stopping the standalone instance')
    const stopped = bootstrap(['--stop', '--home', home], join(pkg, 'bootstrap.mjs'))
    if (stopped.status !== 0) fail(`stop failed: ${(stopped.stderr ?? '').trim()}`)
    else ok('stop command returned')
    await new Promise(resolve => setTimeout(resolve, 800))
    let alive = false
    try { process.kill(Number(state.pid), 0); alive = true } catch { /* expected */ }
    if (alive) fail(`process ${String(state.pid)} is still alive after stop`)
    else ok('the service process is gone')
    if (existsSync(join(home, 'bootstrap.pid'))) fail('bootstrap.pid still exists after stop')
    else ok('bootstrap.pid removed')
  }
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (keep || failures.length > 0) {
    console.log(`\nkept ${root}`)
  } else {
    rmSync(root, { recursive: true, force: true })
  }
}

console.log('')
if (failures.length === 0) {
  console.log('standalone-smoke: passed')
  process.exit(0)
}
console.log(`standalone-smoke: ${failures.length} failure(s)`)
process.exit(1)
