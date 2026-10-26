#!/usr/bin/env node
/**
 * Install-failure smoke: a corrupt tarball must leave an empty profile, and the same profile
 * must accept a valid tarball on retry. This is the package-manager failure boundary that a
 * clean-home happy-path smoke cannot see.
 *
 * Usage: pnpm install-resilience-smoke [--dsh <path>] [--tarball <tgz>] [--keep]
 */
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, truncateSync } from 'node:fs'
import { homedir } from 'node:os'
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
const dshArgument = option('--dsh')
// A bare default is a PATH command; resolving it against the repo would look for <repo>/dsh.
const dsh = dshArgument === undefined ? 'dsh' : resolve(dshArgument)
const goodTarball = resolve(option('--tarball') ?? join(repoRoot, '_dist', `dsh-smart-assistant-${version}.tgz`))
const keep = argv.includes('--keep')
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', ...options })

/** Run a child without blocking; used only by the concurrency probe. */
const runAsync = (command, args, options = {}) => new Promise(resolvePromise => {
  const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  child.on('error', error => resolvePromise({ status: null, stdout, stderr, error }))
  child.on('close', status => resolvePromise({ status, stdout, stderr }))
})

if (dshArgument !== undefined && !existsSync(dsh)) {
  console.error(`install-resilience-smoke: DSH CLI not found: ${dsh}`)
  process.exit(2)
}
if (!existsSync(goodTarball)) {
  console.error(`install-resilience-smoke: tarball not found: ${goodTarball}`)
  process.exit(2)
}

const smokeRoot = join(repoRoot, '.tmp', 'install-resilience-smoke')
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
const env = {
  ...process.env,
  HOME: home,
  DSH_HOME: dshHome,
  DSH_AGENTS_HOME: agents,
  TMPDIR: tmp,
  COREPACK_HOME: process.env.COREPACK_HOME ?? join(homedir(), '.cache', 'node', 'corepack'),
}
const profileDir = join(dshHome, 'profiles', 'web')
const badTarball = join(root, 'corrupt.tgz')

try {
  step('creating the shipped web profile')
  const profile = run(dsh, ['--profile', 'web', '--dump-config'], { env, cwd: workspace })
  if (profile.status !== 0) fail(`profile creation failed: ${(profile.stderr ?? profile.stdout ?? '').trim().slice(-400)}`)
  else ok('profile ready')

  step('installing a truncated tarball')
  copyFileSync(goodTarball, badTarball)
  truncateSync(badTarball, 4096)
  const bad = run(dsh, ['plugin', '--profile', 'web', 'add', badTarball], { env, cwd: workspace })
  if (bad.status === 0) fail('truncated tarball was accepted')
  else ok('truncated tarball rejected')
  const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  if (manifest.dependencies?.['dsh-smart-assistant'] !== undefined) fail('failed install left a profile dependency')
  else ok('failed install left no profile dependency')
  if (existsSync(join(profileDir, 'node_modules', 'dsh-smart-assistant'))) fail('failed install left package files')
  else ok('failed install left no package files')

  step('retrying with the valid tarball')
  const good = run(dsh, ['plugin', '--profile', 'web', 'add', goodTarball], { env, cwd: workspace })
  if (good.status !== 0) fail(`retry failed: ${(good.stderr ?? good.stdout ?? '').trim().slice(-600)}`)
  else ok('retry installed')
  const installed = JSON.parse(readFileSync(join(profileDir, 'node_modules', 'dsh-smart-assistant', 'package.json'), 'utf8'))
  if (installed.version !== version) fail(`retry installed ${String(installed.version)}, expected ${version}`)
  else ok(`retry installed ${version}`)
  if (existsSync(join(dshHome, 'assistant'))) fail('install created a working folder')
  else ok('install wrote no working folder')

  step('two concurrent adds are serialized by the profile lock')
  // DSH 0.2.1 wraps every profile operation in a 120s file lock. The documentation used to say
  // there was no cross-process lock; this probe pins the actual behaviour: both adds may run, but
  // the final profile must carry exactly one dependency and one bundle row.
  const concurrentProfile = 'concurrent'
  const [firstAdd, secondAdd] = await Promise.all([
    runAsync(dsh, ['plugin', '--profile', concurrentProfile, 'add', goodTarball], { env, cwd: workspace }),
    runAsync(dsh, ['plugin', '--profile', concurrentProfile, 'add', goodTarball], { env, cwd: workspace }),
  ])
  if (firstAdd.status !== 0 || secondAdd.status !== 0) {
    fail(`concurrent adds did not both succeed: ${String(firstAdd.status)} / ${String(secondAdd.status)}; ${(firstAdd.stderr + secondAdd.stderr).trim().slice(-500)}`)
  } else {
    const concurrentManifest = JSON.parse(readFileSync(join(dshHome, 'profiles', concurrentProfile, 'package.json'), 'utf8'))
    const dependencyCount = Object.keys(concurrentManifest.dependencies ?? {}).filter(name => name === 'dsh-smart-assistant').length
    const bundleCount = (concurrentManifest.dsh?.profile?.bundles ?? []).filter(name => name === 'dsh-smart-assistant').length
    if (dependencyCount !== 1 || bundleCount !== 1) fail(`concurrent adds left ${String(dependencyCount)} dependency and ${String(bundleCount)} bundle row(s)`)
    else {
      const dump = run(dsh, ['--profile', concurrentProfile, '--dump-config'], { env, cwd: workspace })
      if (dump.status !== 0 || !dump.stdout.includes('preset-assistant')) fail(`concurrent-add composition is broken: ${(dump.stderr ?? dump.stdout ?? '').trim().slice(-400)}`)
      else ok('both adds completed; one dependency, one bundle row, composition intact')
    }
  }
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (keep || failures.length > 0) console.log(`\nkept ${root}`)
  else rmSync(root, { recursive: true, force: true })
}

console.log('')
if (failures.length === 0) {
  console.log('install-resilience-smoke: passed')
  process.exit(0)
}
console.log(`install-resilience-smoke: ${failures.length} failure(s)`)
process.exit(1)
