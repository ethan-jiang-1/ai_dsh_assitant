#!/usr/bin/env node
/**
 * Standalone directory bootstrap: turn an unpacked `dsh-smart-assistant` package into one
 * isolated web instance, without a git checkout or the repo's dev environment.
 *
 * The script is a deployment wrapper, not a new application launcher: it creates a dedicated
 * `assistant-standalone` profile through the installed `dsh`, installs this package into it,
 * starts `dsh --profile <name> --port 0`, and hands over the URL. State, workspace, agents home
 * and temp all live under `--home`, so the daily `~/.dsh` is never touched.
 *
 * Usage:
 *   node bootstrap.mjs [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]
 *   node bootstrap.mjs --stop [--home <dir>]
 *   node bootstrap.mjs --no-start [--home <dir>]
 *
 * Prerequisites: a compatible `dsh` on PATH (or --dsh), Node's npm (packs this directory into a
 * tarball so the profile owns the package's `yaml` dependency), and that dependency obtainable
 * once (network or a warm pnpm store/cache; --offline makes that explicit). Moving the whole
 * `--home` is supported by re-running this script: it detects the stale profile dependency,
 * recreates the profile, and leaves the data directories alone. The home must resolve outside
 * the package, including through symlinks.
 */
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const option = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const flag = (name) => argv.includes(name)
const usage = `usage:
  node bootstrap.mjs [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]
  node bootstrap.mjs --stop [--home <dir>]
  node bootstrap.mjs --no-start [--home <dir>]`

if (flag('--help')) {
  console.log(usage)
  process.exit(0)
}

const home = resolve(option('--home') ?? join(dirname(packageRoot), 'assistant-data'))
const daily = resolve(join(homedir(), '.dsh'))
if (home === daily) {
  console.error('bootstrap: refusing to use the daily ~/.dsh as a standalone home')
  process.exit(2)
}
// Compare real paths: a symlink outside the package can still point into it. If the home does
// not exist yet, resolve its nearest existing ancestor and append the missing tail.
function realPathOf(target) {
  let probe = resolve(target)
  const tail = []
  while (!existsSync(probe)) {
    tail.unshift(basename(probe))
    probe = dirname(probe)
  }
  return join(realpathSync(probe), ...tail)
}
// The data root is beside the package, never inside it: a handoff copy of the agent directory
// must stay clean, and an extracted package upgraded over an old one must not overwrite data.
const insidePackage = relative(realpathSync(packageRoot), realPathOf(home))
if (insidePackage === '' || (!insidePackage.startsWith('..') && !isAbsolute(insidePackage))) {
  console.error(`bootstrap: --home must be outside the package directory (${packageRoot})`)
  console.error('  use the default sibling directory, or point --home at another writable location')
  process.exit(2)
}
const profile = option('--profile') ?? 'assistant-standalone'
if (['web', 'headless', 'sdk', 'sdk-minimal', 'acp'].includes(profile)) {
  console.error(`bootstrap: refusing shipped profile "${profile}" — standalone mode owns a custom profile`)
  process.exit(2)
}
const dsh = option('--dsh') ?? 'dsh'
const workspace = join(home, 'workspace')
const profileDir = join(home, 'profiles', profile)
const pidFile = join(home, 'bootstrap.pid')
const stateFile = join(home, 'bootstrap.json')
const logFile = join(home, 'logs', 'bootstrap.log')
const stop = flag('--stop')
const noStart = flag('--no-start')

function fail(message) {
  console.error(`bootstrap: ${message}`)
  process.exit(1)
}

function stopInstance() {
  if (!existsSync(pidFile)) {
    console.log(`bootstrap: no running instance recorded at ${pidFile}`)
    return
  }
  const pid = Number(readFileSync(pidFile, 'utf8').trim())
  if (!Number.isInteger(pid) || pid <= 0) fail(`invalid pid file ${pidFile}`)
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
  }
  rmSync(pidFile, { force: true })
  rmSync(stateFile, { force: true })
  console.log(`bootstrap: stopped process group ${pid}`)
}

if (stop) {
  stopInstance()
  process.exit(0)
}

mkdirSync(home, { recursive: true })
mkdirSync(workspace, { recursive: true })
mkdirSync(join(home, 'tmp'), { recursive: true })
mkdirSync(join(home, 'agents-home'), { recursive: true })
mkdirSync(join(home, 'logs'), { recursive: true })

const env = {
  ...process.env,
  DSH_HOME: home,
  DSH_AGENTS_HOME: join(home, 'agents-home'),
  DSH_TELEMETRY_DISABLED: process.env.DSH_TELEMETRY_DISABLED ?? '1',
  TMPDIR: join(home, 'tmp'),
  TMP: join(home, 'tmp'),
  TEMP: join(home, 'tmp'),
  ...(flag('--offline') ? { npm_config_offline: 'true', pnpm_config_offline: 'true' } : {}),
}

function runDsh(args, label) {
  const result = spawnSync(dsh, args, { cwd: workspace, env, encoding: 'utf8', timeout: 180_000 })
  if (result.error !== undefined) fail(`${label}: cannot run ${dsh}: ${result.error.message}`)
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim().split('\n').slice(-8).join('\n')
    fail(`${label} failed (exit ${String(result.status)}):\n${detail}`)
  }
  return result.stdout ?? ''
}

console.log(`bootstrap: home ${home}`)
console.log(`bootstrap: profile ${profile}; dsh ${dsh}`)
const profileManifestPath = join(profileDir, 'package.json')
if (existsSync(profileManifestPath)) {
  // A moved home leaves the profile manifest pointing at the old absolute tarball path.
  // pnpm resolves that dependency before `plugin add`, so the profile cannot be repaired in
  // place. The profile is bootstrap-owned; recreate it and leave the data dirs untouched.
  let manifest
  try {
    manifest = JSON.parse(readFileSync(profileManifestPath, 'utf8'))
  } catch {
    manifest = undefined
  }
  if (manifest === undefined) {
    console.log('bootstrap: profile manifest is corrupt; recreating the profile; data dirs stay')
    rmSync(profileDir, { recursive: true, force: true })
  } else {
    const recorded = manifest.dependencies?.['dsh-smart-assistant']
    const recordedPath = typeof recorded === 'string' && (recorded.startsWith('file:') || recorded.startsWith('link:'))
      ? recorded.slice(recorded.indexOf(':') + 1)
      : undefined
    if (recordedPath !== undefined && !existsSync(recordedPath)) {
      console.log('bootstrap: profile points at a missing package tarball (home moved?); recreating the profile; data dirs stay')
      rmSync(profileDir, { recursive: true, force: true })
    }
  }
}
if (!existsSync(profileManifestPath)) {
  console.log('bootstrap: creating the profile from the shipped web template')
  runDsh(['--profile', profile, '--from-default-profile', 'web', '--dump-config'], 'create profile')
}
console.log('bootstrap: packing this directory and installing the tarball')
// `dsh plugin add <directory>` installs a link, and pnpm does not install a linked
// package's dependencies into the profile. Outside a repo checkout the ONLY runtime
// dependency (`yaml`) is then missing. Pack first, install the tarball, so the profile
// owns the dependency closure and `--offline` has something concrete to resolve.
const packDir = join(home, '.bootstrap')
mkdirSync(packDir, { recursive: true })
const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--silent', '--cache', join(packDir, 'npm-cache'), '--pack-destination', packDir], { cwd: packageRoot, encoding: 'utf8' })
if (packed.error !== undefined) fail(`cannot pack ${packageRoot}: ${packed.error.message} (Node's npm is required)`)
if (packed.status !== 0) fail(`npm pack failed (exit ${String(packed.status)}): ${(packed.stderr ?? '').trim().slice(-400)}`)
const tarball = join(packDir, (packed.stdout ?? '').trim().split('\n').pop() ?? '')
if (!existsSync(tarball)) fail(`npm pack produced no tarball under ${packDir}`)
runDsh(['plugin', '--profile', profile, 'add', tarball, ...(flag('--offline') ? ['--offline'] : [])], 'install package')
// Keep the tarball: the profile manifest records it as the dependency's file: source. Removing
// it leaves a manifest that a later `dsh plugin`/pnpm repair cannot resolve. Drop only the
// private npm cache used for packing.
rmSync(join(packDir, 'npm-cache'), { recursive: true, force: true })

const patchPath = join(profileDir, 'cordis.patch.yml')
const patchBlock = `# Written by dsh-smart-assistant bootstrap.mjs
- id: agent-preset-registry
  config:
    default: assistant
`
const currentPatch = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
if (currentPatch.trim() === '' || currentPatch.trim() === '[]' || currentPatch.includes('dsh-smart-assistant bootstrap.mjs')) {
  writeFileSync(patchPath, patchBlock, 'utf8')
} else if (/^\s*\[\]\s*$/m.test(currentPatch)) {
  // A fresh profile ships a commented template whose only entry is `[]`; replacing that line
  // keeps the template comments and leaves one valid YAML array (appending after `[]` is a
  // second document and fails to parse).
  writeFileSync(patchPath, currentPatch.replace(/^\s*\[\]\s*$/m, patchBlock.trimEnd()), 'utf8')
} else if (!currentPatch.includes('agent-preset-registry')) {
  writeFileSync(patchPath, `${currentPatch.trimEnd()}\n${patchBlock}`, 'utf8')
}

const dump = runDsh(['--profile', profile, '--dump-config'], 'verify composition')
if (!dump.includes('preset-assistant')) fail('the profile dump has no preset-assistant row')
if (dump.includes('default: standard') && !dump.includes('default: assistant')) {
  console.log('bootstrap: profile default still standard; select 章鱼管家 in the Web UI or add the registry patch')
}

if (noStart) {
  console.log('bootstrap: profile ready (--no-start); not starting the web server')
  process.exit(0)
}

if (existsSync(pidFile)) {
  const old = Number(readFileSync(pidFile, 'utf8').trim())
  try {
    process.kill(old, 0)
    fail(`another standalone instance is already recorded at ${pidFile}; run --stop first`)
  } catch { /* stale pid: continue */ }
  rmSync(pidFile, { force: true })
}

// Reset the log on every start: URL discovery reads the whole file, and an append-only log made
// the previous instance's URL match first after a stop/restart.
writeFileSync(logFile, '', 'utf8')
const logFd = openSync(logFile, 'a')
const child = spawn(dsh, ['--profile', profile, '--port', '0', '--no-open'], {
  cwd: workspace,
  env,
  detached: true,
  stdio: ['ignore', logFd, logFd],
})
closeSync(logFd)
if (child.pid === undefined) fail('the dsh process did not start')
child.unref()
writeFileSync(pidFile, `${child.pid}\n`, 'utf8')

const deadline = Date.now() + 90_000
let url
while (Date.now() < deadline) {
  const text = existsSync(logFile) ? readFileSync(logFile, 'utf8') : ''
  url = /http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/.exec(text)?.[0]
  if (url !== undefined) break
  try {
    process.kill(child.pid, 0)
  } catch {
    fail(`the dsh process exited before printing a URL; log tail:\n${text.split('\n').slice(-12).join('\n')}`)
  }
  await new Promise(resolve => setTimeout(resolve, 500))
}
if (url === undefined) fail(`no URL within 90s; see ${logFile}`)

writeFileSync(stateFile, `${JSON.stringify({ pid: child.pid, url, profile, home, startedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
console.log('')
console.log(`✅ standalone instance ready`)
console.log(`   ${url}`)
console.log(`   home: ${home}`)
console.log(`   logs: ${logFile}`)
console.log(`   stop: node bootstrap.mjs --stop --home ${home}`)
console.log('   model: configure the provider in the Web UI if this home has no credential yet')
