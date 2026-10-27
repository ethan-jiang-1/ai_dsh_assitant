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
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const keep = process.argv.includes('--keep')
const root = mkTmpDir('standalone-smoke', 'run-')
const failures = []
const blocked = []
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

  step('refusing a data home inside the package')
  const inside = bootstrap(['--home', join(pkg, 'data'), '--no-start', '--dsh', wrapper], join(pkg, 'bootstrap.mjs'))
  if (inside.status === 0) fail('bootstrap accepted a data home inside the package')
  else ok('inside-package home refused')

  step('refusing a symlinked data home inside the package')
  const linkedHome = join(root, 'package-link')
  try {
    symlinkSync(pkg, linkedHome, 'dir')
    const linked = bootstrap(['--home', linkedHome, '--no-start', '--dsh', wrapper], join(pkg, 'bootstrap.mjs'))
    if (linked.status === 0) fail('bootstrap accepted a symlinked home that resolves inside the package')
    else ok('symlinked inside-package home refused')
  } catch (error) {
    console.log(`  skip cannot create a directory symlink: ${error instanceof Error ? error.message : String(error)}`)
  }

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
    // The state carries a live launch token: it must be owner-only, and the log must not carry
    // the same token (support threads copy logs).
    const stateMode = statSync(join(home, 'bootstrap.json')).mode & 0o777
    if (stateMode !== 0o600) fail(`bootstrap.json mode is ${stateMode.toString(8)}, expected 600`)
    else ok('bootstrap.json is owner-only')
    const bootstrapLog = readFileSync(join(home, 'logs', 'bootstrap.log'), 'utf8')
    if (/\?token=[A-Za-z0-9_-]+/.test(bootstrapLog)) fail('bootstrap.log leaks the launch token')
    else ok('bootstrap.log carries no launch token')
    if (!existsSync(join(home, 'profiles', profile, 'package.json'))) fail('profile manifest is missing')
    else ok(`profile ${profile} is in ${home}`)
    if (!existsSync(join(home, 'profiles', profile, 'node_modules', 'dsh-smart-assistant', 'package.json'))) fail('the package is not installed in the profile')
    else ok('package installed into the isolated profile')
    const installedPackage = join(home, 'profiles', profile, 'node_modules', 'dsh-smart-assistant')
    if (lstatSync(installedPackage).isSymbolicLink()) fail('bootstrap installed a symlink; a real machine outside the repo would lose its yaml dependency')
    else if (!existsSync(join(home, 'profiles', profile, 'node_modules', 'yaml'))) fail('the profile has no yaml dependency')
    else ok('bootstrap installs a tarball copy with its yaml dependency')
    const profileManifest = JSON.parse(readFileSync(join(home, 'profiles', profile, 'package.json'), 'utf8'))
    const recorded = profileManifest.dependencies?.['dsh-smart-assistant']
    if (typeof recorded !== 'string' || !recorded.startsWith('file:')) fail('profile does not record the installed tarball')
    else if (!existsSync(recorded.slice(5))) fail('profile dependency points at a removed tarball')
    else ok('profile dependency points at the retained tarball')
    if (!existsSync(join(home, 'workspace')) || !existsSync(join(home, 'agents-home'))) fail('workspace/agents-home missing')
    else ok('workspace and agents-home live under the chosen home')

    step('preflight against the standalone instance')
    const preflight = run(process.execPath, [join(repoRoot, 'dev', 'probes', 'web', 'webui-preflight.mjs'), state.url], { timeout: 120_000 })
    if (preflight.status !== 0) fail(`preflight failed: ${(preflight.stderr ?? preflight.stdout ?? '').trim().split('\n').slice(-10).join(' | ')}`)
    else ok('preflight green')

    step('booting the client from the extracted package')
    const chrome = process.env.CHROME_PATH
      ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)
    if (chrome === undefined || !existsSync(chrome)) {
      blocked.push('client boot/preset UI: no Chrome executable; set CHROME_PATH')
      console.log('  BLOCKED no Chrome executable; set CHROME_PATH to run the client-boot check')
    } else {
      const presetProbe = run(process.execPath, [join(repoRoot, 'dev', 'probes', 'web', 'agent-preset-ui.mjs'), state.url], { timeout: 180_000 })
      if (presetProbe.status !== 0) fail(`client boot/preset probe failed: ${(presetProbe.stderr ?? presetProbe.stdout ?? '').trim().split('\n').slice(-8).join(' | ')}`)
      else ok('client booted and the preset selection probe passed')
    }

    step('stopping the standalone instance')
    const stopped = bootstrap(['--stop', '--home', home], join(pkg, 'bootstrap.mjs'))
    if (stopped.status !== 0) fail(`stop failed: ${(stopped.stderr ?? '').trim()}`)
    else ok('stop command returned')
    await new Promise(done => setTimeout(done, 800))
    let alive = false
    try { process.kill(Number(state.pid), 0); alive = true } catch { /* expected */ }
    if (alive) fail(`process ${String(state.pid)} is still alive after stop`)
    else ok('the service process is gone')
    if (existsSync(join(home, 'bootstrap.pid'))) fail('bootstrap.pid still exists after stop')
    else ok('bootstrap.pid removed')

    step('restarting the same home (URL must not be stale)')
    const restarted = bootstrap(['--home', home, '--dsh', wrapper], join(pkg, 'bootstrap.mjs'))
    if (restarted.status !== 0) {
      fail(`restart failed: ${(restarted.stderr ?? restarted.stdout ?? '').trim().split('\n').slice(-10).join(' | ')}`)
    } else {
      const second = JSON.parse(readFileSync(join(home, 'bootstrap.json'), 'utf8'))
      if (typeof second.url !== 'string' || second.url === state.url) fail('restart reused the previous URL')
      else ok(`restart URL ${second.url}`)
      const secondPreflight = run(process.execPath, [join(repoRoot, 'dev', 'probes', 'web', 'webui-preflight.mjs'), second.url], { timeout: 120_000 })
      if (secondPreflight.status !== 0) fail(`restart preflight failed: ${(secondPreflight.stderr ?? secondPreflight.stdout ?? '').trim().split('\n').slice(-10).join(' | ')}`)
      else ok('restart preflight green')
      const secondStop = bootstrap(['--stop', '--home', home], join(pkg, 'bootstrap.mjs'))
      if (secondStop.status !== 0) fail(`restart stop failed: ${(secondStop.stderr ?? '').trim()}`)
      else ok('restart stop returned')
      await new Promise(done => setTimeout(done, 800))
      let secondAlive = false
      try { process.kill(Number(second.pid), 0); secondAlive = true } catch { /* expected */ }
      if (secondAlive) fail(`restart process ${String(second.pid)} is still alive after stop`)
      else ok('restart service process is gone')
    }

    step('moving the home and repairing the profile')
    const movedHome = join(root, 'data-moved')
    renameSync(home, movedHome)
    const repaired = bootstrap(['--home', movedHome, '--dsh', wrapper, '--no-start'], join(pkg, 'bootstrap.mjs'))
    if (repaired.status !== 0) {
      fail(`moved-home bootstrap failed: ${(repaired.stderr ?? repaired.stdout ?? '').trim().split('\n').slice(-8).join(' | ')}`)
    } else {
      const manifest = JSON.parse(readFileSync(join(movedHome, 'profiles', profile, 'package.json'), 'utf8'))
      const dependency = manifest.dependencies?.['dsh-smart-assistant']
      if (typeof dependency !== 'string' || !dependency.startsWith('file:')) fail('moved home did not record the repacked tarball')
      else if (!existsSync(dependency.slice(5))) fail('moved home points at a missing profile tarball')
      else if (!existsSync(join(movedHome, 'assistant'))) fail('moved home lost the working folder')
      else ok('moved home recreated the profile and kept user data')
    }

    step('recovering a corrupt profile manifest')
    writeFileSync(join(movedHome, 'profiles', profile, 'package.json'), '{broken\n', 'utf8')
    const recovered = bootstrap(['--home', movedHome, '--dsh', wrapper, '--no-start'], join(pkg, 'bootstrap.mjs'))
    if (recovered.status !== 0) {
      fail(`corrupt-profile bootstrap failed: ${(recovered.stderr ?? recovered.stdout ?? '').trim().split('\n').slice(-8).join(' | ')}`)
    } else {
      const manifest = JSON.parse(readFileSync(join(movedHome, 'profiles', profile, 'package.json'), 'utf8'))
      const dependency = manifest.dependencies?.['dsh-smart-assistant']
      if (typeof dependency !== 'string' || !dependency.startsWith('file:')) fail('corrupt-profile repair did not reinstall the package')
      else if (!existsSync(dependency.slice(5))) fail('corrupt-profile repair points at a missing tarball')
      else if (!existsSync(join(movedHome, 'assistant'))) fail('corrupt-profile repair lost the working folder')
      else ok('corrupt profile manifest recreated the profile and kept user data')
    }
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
if (failures.length > 0) {
  console.log(`standalone-smoke: ${failures.length} failure(s)`)
  process.exit(1)
}
if (blocked.length > 0) {
  console.log(`standalone-smoke: BLOCKED — ${blocked.join('; ')}`)
  process.exit(2)
}
console.log('standalone-smoke: passed')
process.exit(0)
