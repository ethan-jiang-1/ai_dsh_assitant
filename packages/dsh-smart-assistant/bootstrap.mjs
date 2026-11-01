#!/usr/bin/env node
/**
 * Deployment wrapper for `dsh-smart-assistant`: turn an unpacked package into one web instance.
 *
 * Two modes share one profile/install/boot pipeline:
 *
 * - **product** (`--workspace <dir>` or `--product`): a product-owned home
 *   (`~/.dsh-smart-assistant` by default), profile `assistant`, and the user's project directory
 *   as the boot cwd when one is supplied. The workspace itself is owned by the product row's
 *   `assistant-product.workspaceDir` Config (profile patch); `--workspace` only passes a one-shot
 *   `ASSISTANT_WORKSPACE` override for the first boot. The daily `~/.dsh` is untouched unless
 *   `--home` names it explicitly.
 * - **standalone** (no `--workspace`/`--product`): the original clean-room mode — home beside the
 *   package, profile `assistant-standalone`, an internally created workspace under the home.
 *
 * The launcher is a deployment wrapper, not an application runtime: it creates/reuses a profile
 * through the installed `dsh`, installs this package, starts `dsh --profile <name> --port 0`, and
 * hands over the URL. It never writes a profile manifest by hand; `--from-default-profile` only
 * runs when the profile does not exist, and `dsh plugin` owns dependencies and bundle membership.
 *
 * Usage:
 *   node bootstrap.mjs --workspace <dir> [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]
 *   node bootstrap.mjs --product [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]
 *   node bootstrap.mjs [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]   # standalone
 *   node bootstrap.mjs --stop [--home <dir>] [--product]
 *   node bootstrap.mjs --no-start [--workspace <dir> | --product] [--home <dir>]
 *
 * Prerequisites: a compatible `dsh` on PATH (or --dsh), Node's npm (packs this directory into a
 * tarball so the profile owns the package's `yaml` dependency), and that dependency obtainable
 * once (network or a warm pnpm store/cache; --offline makes that explicit). Moving a home is
 * supported by re-running the launcher: a stale `file:` dependency or corrupt profile manifest is
 * recreated while the data directories stay.
 */
import { spawn, spawnSync } from 'node:child_process'
import {
  accessSync,
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, parse, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))
const packageManifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
const isWindows = process.platform === 'win32'

/**
 * npm and the npm-installed `dsh` are `.cmd` shims on Windows; CreateProcess cannot launch them
 * directly. Shell mode resolves the shim, and every argument is quoted first so paths with
 * spaces survive. POSIX keeps the direct spawn (no shell, no quoting ambiguity). Windows with a
 * space-containing `--dsh` path is not claimed: use a PATH command or a wrapper.
 */
function toolArgs(args) {
  return isWindows ? args.map(argument => `"${String(argument).replaceAll('"', '""')}"`) : args
}

function toolOptions(options) {
  return isWindows ? { ...options, shell: true, windowsHide: true } : options
}

function spawnToolSync(command, args, options = {}) {
  return spawnSync(command, toolArgs(args), toolOptions(options))
}

function spawnTool(command, args, options = {}) {
  return spawn(command, toolArgs(args), toolOptions(options))
}

/** Terminate the detached tree: a POSIX process group, or Windows' taskkill /T. */
function terminateTree(pid) {
  if (isWindows) {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
  }
}
const argv = process.argv.slice(2)
const option = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const flag = (name) => argv.includes(name)
const usage = `usage:
  node bootstrap.mjs --workspace <dir> [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]
  node bootstrap.mjs --product [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]
  node bootstrap.mjs [--home <dir>] [--profile <name>] [--dsh <command>] [--offline]   # standalone
  node bootstrap.mjs --stop [--home <dir>] [--product]
  node bootstrap.mjs --no-start [--workspace <dir> | --product] [--home <dir>]`

if (flag('--help')) {
  console.log(usage)
  process.exit(0)
}

const stop = flag('--stop')
const noStart = flag('--no-start')
const requestedWorkspace = option('--workspace')
const product = flag('--product') || requestedWorkspace !== undefined
const daily = resolve(join(homedir(), '.dsh'))
const home = resolve(option('--home') ?? (product ? join(homedir(), '.dsh-smart-assistant') : join(dirname(packageRoot), 'assistant-data')))

if (product && home === daily) {
  console.error('bootstrap: warning: --home names the daily ~/.dsh; the product will share that home')
} else if (!product && home === daily) {
  console.error('bootstrap: refusing to use the daily ~/.dsh as a standalone home')
  process.exit(2)
}
if (home === resolve(homedir()) || dirname(home) === home) {
  console.error(`bootstrap: refusing to use ${home} as a home; choose a dedicated subdirectory`)
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
// The data root is never inside the package: an upgrade replaces that directory, and a handoff
// copy of the agent directory must stay clean.
const insidePackage = relative(realpathSync(packageRoot), realPathOf(home))
if (insidePackage === '' || (!insidePackage.startsWith('..') && !isAbsolute(insidePackage))) {
  console.error(`bootstrap: home must be outside the package directory (${packageRoot})`)
  process.exit(2)
}

const profile = option('--profile') ?? (product ? 'assistant' : 'assistant-standalone')
const profilesRoot = join(home, 'profiles')
const profileDir = resolve(profilesRoot, profile)

/** True when `child` equals `parent` or sits beneath it. */
function isInsideOrEqual(parent, child) {
  const nested = relative(parent, child)
  return nested === '' || (!nested.startsWith('..') && !isAbsolute(nested))
}

// A profile is a directory name, never a path: reject separators, traversal, and the shipped
// profile names. The containment check is defence in depth; the recursive profile repair below
// must never be able to reach outside `<home>/profiles`.
const PROFILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const RESERVED_PROFILES = new Set(['web', 'headless', 'sdk', 'sdk-minimal', 'acp', 'desktop'])
if (!stop) {
  if (!PROFILE_NAME.test(profile)) {
    console.error(`bootstrap: invalid profile name ${JSON.stringify(profile)}; use letters, digits, dot, dash, underscore, starting with a letter or digit`)
    process.exit(2)
  }
  if (RESERVED_PROFILES.has(profile)) {
    console.error(`bootstrap: refusing shipped profile "${profile}" — the product owns a custom profile`)
    process.exit(2)
  }
  if (!isInsideOrEqual(profilesRoot, profileDir) || profilesRoot === profileDir) {
    console.error(`bootstrap: profile path escapes the home: ${profileDir}`)
    process.exit(2)
  }
}

const dsh = option('--dsh') ?? 'dsh'
const legacyWorkspace = join(home, 'workspace')
const pidFile = join(home, 'bootstrap.pid')
const stateFile = join(home, 'bootstrap.json')
const logFile = join(home, 'logs', 'bootstrap.log')

/**
 * The first pnpm release whose profile settings (`nodeLinker`, `autoInstallPeers`) are read from
 * `pnpm-workspace.yaml`. Older releases either refuse to add to the workspace root or silently
 * install an isolated tree, so the profile needs this floor.
 */
const MIN_PNPM = [10, 6, 0]

/** Read a tool's `--version`; undefined when the executable is missing or does not answer. */
function toolVersion(command) {
  const result = spawnToolSync(command, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.error !== undefined || result.status !== 0) return undefined
  return (result.stdout ?? '').trim()
}

/** Parse the numeric prefix of a version string; undefined when it has no `major.minor.patch`. */
function parseVersion(text) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(text.trim())
  return match === null ? undefined : [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** True when `version` is at least `minimum`, comparing the numeric triple. */
function versionAtLeast(version, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    if (version[index] !== minimum[index]) return version[index] > minimum[index]
  }
  return true
}

if (!stop) {
  const pnpmVersion = toolVersion('pnpm')
  if (pnpmVersion === undefined) {
    fail('pnpm was not found on PATH; install pnpm >= 10.6.0 (or enable corepack) and retry')
  }
  const parsed = parseVersion(pnpmVersion)
  if (parsed === undefined || !versionAtLeast(parsed, MIN_PNPM)) {
    fail(`pnpm ${pnpmVersion} is too old; this profile needs pnpm >= 10.6.0. Older pnpm fails with ERR_PNPM_ADDING_TO_ROOT or ignores the profile linker settings.`)
  }
  if (toolVersion('npm') === undefined) {
    fail("Node's npm was not found on PATH; bootstrap uses it to pack this directory before installing")
  }
}

function fail(message) {
  console.error(`bootstrap: ${message}`)
  process.exit(1)
}

/**
 * Validate the workspace the product will bind. The host row re-validates with the shipped pure
 * policy; this pre-check keeps a bad path from creating a home/profile first.
 * @param {string} input - Absolute or resolvable user directory.
 * @returns {string} canonical directory.
 */
function validateWorkspace(input) {
  if (typeof input !== 'string' || input.trim() === '') fail('--workspace needs a directory')
  const requested = resolve(input)
  let info
  try {
    info = statSync(requested)
  } catch {
    fail(`workspace directory does not exist: ${requested}`)
  }
  if (!info.isDirectory()) fail(`workspace path is not a directory: ${requested}`)
  const canonical = realpathSync(requested)
  if (canonical === parse(canonical).root) fail('the filesystem root is not a product workspace')
  const userHome = realpathSync(homedir())
  if (canonical === userHome) fail('the user home directory is not a product workspace')
  if (isInsideOrEqual(realPathOf(home), canonical)) {
    fail('a workspace inside the product home would mix data planes')
  }
  if (isInsideOrEqual(realpathSync(packageRoot), canonical)) {
    fail('the installed package directory is not a product workspace')
  }
  try {
    accessSync(requested, fsConstants.R_OK | fsConstants.W_OK)
  } catch {
    fail(`workspace directory is not readable and writable: ${requested}`)
  }
  return canonical
}

/** Validate `--workspace` before the home exists; the product row owns persistence. */
const providedWorkspace = requestedWorkspace === undefined ? undefined : validateWorkspace(requestedWorkspace)

function processAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

/** A launch token in a URL is a secret; logs and error tails carry its redacted form. */
const URL_TOKEN = /(\?token=)[A-Za-z0-9_-]+/g

function redactToken(text) {
  return text.replace(URL_TOKEN, '$1[redacted]')
}

/**
 * Rewrite the log with the launch token redacted. Called on success and on every failure path:
 * a failed boot must not leave a live-token log behind for a support thread to copy.
 */
function redactLogFile() {
  try {
    if (!existsSync(logFile)) return
    const text = readFileSync(logFile, 'utf8')
    const redacted = redactToken(text)
    if (redacted !== text) writeFileSync(logFile, redacted, { encoding: 'utf8', mode: 0o600 })
  } catch { /* the log is best-effort; the failure being reported is the real one */ }
}

async function stopInstance() {
  if (!existsSync(pidFile)) {
    console.log(`bootstrap: no running instance recorded at ${pidFile}`)
    return
  }
  const pid = Number(readFileSync(pidFile, 'utf8').trim())
  if (!Number.isInteger(pid) || pid <= 0) fail(`invalid pid file ${pidFile}`)
  terminateTree(pid)
  // Do not hand the home to the next instance while the old one still owns data locks.
  for (let attempt = 0; attempt < 50 && processAlive(pid); attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  if (processAlive(pid)) fail(`process ${pid} did not exit within 5s after SIGTERM; run with --stop again or inspect it`)
  rmSync(pidFile, { force: true })
  rmSync(stateFile, { force: true })
  console.log(`bootstrap: stopped process group ${pid}`)
}

if (stop) {
  await stopInstance()
  process.exit(0)
}

try {
  mkdirSync(home, { recursive: true, mode: 0o700 })
} catch (error) {
  fail(`cannot create home ${home}: ${error instanceof Error ? error.message : String(error)}`)
}
// Product mode without --workspace is valid: the product row shows the first-run chooser and
// persists the chosen directory in the profile Config. The launcher only supplies a one-shot
// override; it never writes the binding.
const workspace = product ? (providedWorkspace ?? home) : legacyWorkspace
if (!product) mkdirSync(workspace, { recursive: true, mode: 0o700 })
mkdirSync(join(home, 'tmp'), { recursive: true, mode: 0o700 })
mkdirSync(join(home, 'agents-home'), { recursive: true, mode: 0o700 })
mkdirSync(join(home, 'logs'), { recursive: true, mode: 0o700 })

const env = {
  ...process.env,
  DSH_HOME: home,
  DSH_AGENTS_HOME: join(home, 'agents-home'),
  DSH_TELEMETRY_DISABLED: process.env.DSH_TELEMETRY_DISABLED ?? '1',
  TMPDIR: join(home, 'tmp'),
  TMP: join(home, 'tmp'),
  TEMP: join(home, 'tmp'),
  ...(product && providedWorkspace !== undefined ? { ASSISTANT_WORKSPACE: providedWorkspace } : {}),
  ...(flag('--offline') ? { npm_config_offline: 'true', pnpm_config_offline: 'true' } : {}),
}

function runDsh(args, label) {
  const result = spawnToolSync(dsh, args, { cwd: workspace, env, encoding: 'utf8', timeout: 180_000 })
  if (result.error !== undefined) fail(`${label}: cannot run ${dsh}: ${result.error.message}`)
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim().split('\n').slice(-8).join('\n')
    fail(`${label} failed (exit ${String(result.status)}):\n${detail}`)
  }
  return result.stdout ?? ''
}

console.log(`bootstrap: mode ${product ? 'product' : 'standalone'}`)
console.log(`bootstrap: home ${home}`)
console.log(`bootstrap: profile ${profile}; dsh ${dsh}`)
console.log(`bootstrap: workspace ${providedWorkspace ?? (product ? 'unbound (the product will ask)' : workspace)}`)
const profileManifestPath = join(profileDir, 'package.json')
let profileExisted = existsSync(profileManifestPath)
if (profileExisted) {
  // A moved home leaves the profile manifest pointing at the old absolute tarball path.
  // pnpm resolves that dependency before `plugin add`, so the profile cannot be repaired in
  // place. The profile is launcher-owned; recreate it and leave the data dirs untouched.
  let manifest
  try {
    manifest = JSON.parse(readFileSync(profileManifestPath, 'utf8'))
  } catch {
    manifest = undefined
  }
  if (manifest === undefined) {
    console.log('bootstrap: profile manifest is corrupt; recreating the profile; data dirs stay')
    rmSync(profileDir, { recursive: true, force: true })
    profileExisted = false
  } else {
    const recorded = manifest.dependencies?.['dsh-smart-assistant']
    const recordedPath = typeof recorded === 'string' && (recorded.startsWith('file:') || recorded.startsWith('link:'))
      ? recorded.slice(recorded.indexOf(':') + 1)
      : undefined
    if (recordedPath !== undefined && !existsSync(recordedPath)) {
      console.log('bootstrap: profile points at a missing package tarball (home moved?); recreating the profile; data dirs stay')
      rmSync(profileDir, { recursive: true, force: true })
      profileExisted = false
    }
  }
}
if (profileExisted) {
  const manifest = JSON.parse(readFileSync(profileManifestPath, 'utf8'))
  const bundles = manifest.dsh?.profile?.bundles
  const owns = Array.isArray(bundles) && bundles.includes('dsh-smart-assistant')
    || manifest.dependencies?.['dsh-smart-assistant'] !== undefined
  if (!owns) {
    fail(`profile "${profile}" exists but is not owned by dsh-smart-assistant; choose another --profile or remove it`)
  }
}
if (!existsSync(profileManifestPath)) {
  console.log('bootstrap: creating the profile from the shipped web template')
  runDsh(['--profile', profile, '--from-default-profile', 'web', '--dump-config'], 'create profile')
}

const installedManifestPath = join(profileDir, 'node_modules', 'dsh-smart-assistant', 'package.json')
let installedVersion
try {
  installedVersion = JSON.parse(readFileSync(installedManifestPath, 'utf8')).version
} catch {
  installedVersion = undefined
}
const needInstall = installedVersion !== packageManifest.version
if (needInstall) {
  console.log(`bootstrap: packing this directory and installing the tarball (${installedVersion ?? 'not installed'} → ${packageManifest.version})`)
  // `dsh plugin add <directory>` installs a link, and pnpm does not install a linked
  // package's dependencies into the profile. Outside a repo checkout the ONLY runtime
  // dependency (`yaml`) is then missing. Pack first, install the tarball, so the profile
  // owns the dependency closure and `--offline` has something concrete to resolve.
  const packDir = join(home, '.bootstrap')
  mkdirSync(packDir, { recursive: true })
  const packed = spawnToolSync('npm', ['pack', '--ignore-scripts', '--silent', '--cache', join(packDir, 'npm-cache'), '--pack-destination', packDir], { cwd: packageRoot, encoding: 'utf8' })
  if (packed.error !== undefined) fail(`cannot pack ${packageRoot}: ${packed.error.message} (Node's npm is required)`)
  if (packed.status !== 0) fail(`npm pack failed (exit ${String(packed.status)}): ${(packed.stderr ?? '').trim().slice(-400)}`)
  const tarball = join(packDir, (packed.stdout ?? '').trim().split('\n').pop() ?? '')
  if (!existsSync(tarball)) fail(`npm pack produced no tarball under ${packDir}`)
  runDsh(['plugin', '--profile', profile, 'add', tarball, ...(flag('--offline') ? ['--offline'] : [])], 'install package')
  // Keep the tarball: the profile manifest records it as the dependency's file: source. Removing
  // it leaves a manifest that a later `dsh plugin`/pnpm repair cannot resolve. Drop only the
  // private npm cache used for packing.
  rmSync(join(packDir, 'npm-cache'), { recursive: true, force: true })
} else {
  console.log(`bootstrap: install is current (${installedVersion})`)
}

// The default preset is NOT written here any more (2026-11-02, bundle-first). It ships in the
// bundle patch (`- id: agent-preset-registry` in cordis.patch.yml), so every install channel —
// the Plugins page, `dsh plugin add`, the market — delivers the product without a second profile
// writer. This installer therefore only builds the profile, installs the tarball, verifies, and
// launches; if the composition does not already default to the product, that is a packaging bug
// worth failing on rather than papering over with a hand-written profile patch.
const patchPath = join(profileDir, 'cordis.patch.yml')
const currentPatch = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
if (currentPatch.includes('dsh-smart-assistant bootstrap.mjs')) {
  // Older installers wrote a default-preset block here. Leave it: removing rows the principal may
  // have edited is worse than a redundant override that now matches the bundle anyway.
  console.log('bootstrap: profile patch still carries the pre-0.2.0 default-preset block (harmless; delete it to inherit the bundle default)')
}

const dump = runDsh(['--profile', profile, '--dump-config'], 'verify composition')
if (!dump.includes('preset-assistant')) fail('the profile dump has no preset-assistant row')
if (product && !dump.includes('assistant-product')) fail('the profile dump has no assistant-product row; rebuild/reinstall this package')
if (!/default:\s*assistant/.test(dump)) {
  fail('the profile default is not the product preset; this package\'s bundle patch should set it — reinstall the package instead of patching the profile by hand')
}

if (noStart) {
  console.log(`bootstrap: profile ready (--no-start); not starting the web server`)
  process.exit(0)
}

if (existsSync(pidFile)) {
  const old = Number(readFileSync(pidFile, 'utf8').trim())
  try {
    process.kill(old, 0)
    fail(`another instance is already recorded at ${pidFile}; run --stop first`)
  } catch { /* stale pid: continue */ }
  rmSync(pidFile, { force: true })
}

// Reset the log on every start: URL discovery reads the whole file, and an append-only log made
// the previous instance's URL match first after a stop/restart. The file carries the launch
// token until it is redacted below, so it is owner-only from the first byte.
writeFileSync(logFile, '', { encoding: 'utf8', mode: 0o600 })
chmodSync(logFile, 0o600)
const logFd = openSync(logFile, 'a')
const child = spawnTool(dsh, ['--profile', profile, '--port', '0', '--no-open'], {
  cwd: workspace,
  env,
  detached: true,
  stdio: ['ignore', logFd, logFd],
})
closeSync(logFd)
if (child.pid === undefined) fail('the dsh process did not start')
child.unref()
writeFileSync(pidFile, `${child.pid}\n`, { encoding: 'utf8', mode: 0o600 })
chmodSync(pidFile, 0o600)

const deadline = Date.now() + 90_000
let url
while (Date.now() < deadline) {
  const text = existsSync(logFile) ? readFileSync(logFile, 'utf8') : ''
  url = /http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/.exec(text)?.[0]
  if (url !== undefined) break
  try {
    process.kill(child.pid, 0)
  } catch {
    redactLogFile()
    fail(`the dsh process exited before printing a URL; log tail:\n${redactToken(text).split('\n').slice(-12).join('\n')}`)
  }
  await new Promise(resolve => setTimeout(resolve, 500))
}
if (url === undefined) {
  redactLogFile()
  fail(`no URL within 90s; see ${logFile}`)
}

// The URL is needed once to hand the address to the owner (and to the stop/restart path); the
// log is not. Redact it in place so a log copied into a support thread carries no live token.
redactLogFile()

writeFileSync(stateFile, `${JSON.stringify({ pid: child.pid, url, profile, home, mode: product ? 'product' : 'standalone', startedAt: new Date().toISOString() }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
chmodSync(stateFile, 0o600)
console.log('')
console.log(`✅ ${product ? 'product' : 'standalone'} instance ready`)
console.log(`   ${url}`)
console.log(`   home: ${home}`)
console.log(`   workspace: ${providedWorkspace ?? (product ? 'unbound (choose in the product first screen)' : workspace)}`)
console.log(`   logs: ${logFile}`)
console.log(`   stop: node bootstrap.mjs --stop --home ${home}${product ? ' --product' : ''}`)
console.log('   model: configure the provider in the Web UI if this home has no credential yet')
