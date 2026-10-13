/**
 * Self-hosted service orchestration for the browser probes: stop stale services, spawn the
 * real one against a probe home, wait for its URL, and tear it down on exit.
 *
 * Both self-hosting probes (desk-process-e2e, projection-live-mechanics) carried a
 * line-by-line copy of this chain, plus a worse coupling: each probe had to know the OTHER
 * probe's pid file name to clean a shared home. The pid registry here is the single place
 * that knowledge lives.
 *
 * Why spawn the vendor CLI bin directly (not the `dev/env/dsh.mjs` launcher): the launcher
 * is a parameter pass-through, so SIGTERM through it kills only the launcher and orphans
 * the real service still holding the ledger writer.lock (first-run evidence in the
 * desk-process-e2e header). Hard rule 1 allows tooling to set DSH_HOME itself.
 *
 * Stale pid files only survive a crash (normal exits remove theirs), so stopping every
 * registered service is always the right call on a shared probe home.
 *
 * Style: scripts/AGENTS.md — pure ESM, Node built-ins only.
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { sleep } from './probe-utils.mjs'

/** Every pid file a self-hosting probe registers in its home — the shared-home protocol. */
export const PROBE_SERVICE_PID_FILES = ['.desk-process-e2e-service.pid', '.projection-live-mechanics.pid']

/**
 * SIGTERM every registered stale probe service on a home and clear its pid file.
 * @param {string} home - the probe home both self-hosting probes share.
 */
export function stopStaleProbeServices(home) {
  for (const pidName of PROBE_SERVICE_PID_FILES) {
    const pidFile = join(home, pidName)
    if (existsSync(pidFile)) {
      const stale = Number(readFileSync(pidFile, 'utf8'))
      if (Number.isInteger(stale)) { try { process.kill(stale, 'SIGTERM') } catch { /* already gone */ } }
      rmSync(pidFile)
    }
  }
}

/**
 * Count session directories under a home's `sessions/` tree — the single-session guard's
 * server-side verdict. A fresh home has no `sessions/` at all: zero is the correct answer,
 * not an error.
 * @param {string} home - the probe home.
 * @returns {number} session directory count.
 */
export function countSessions(home) {
  const root = join(home, 'sessions')
  if (!existsSync(root)) return 0
  let count = 0
  for (const workspace of readdirSync(root, { withFileTypes: true })) {
    if (!workspace.isDirectory()) continue
    for (const entry of readdirSync(join(root, workspace.name), { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('session-')) count += 1
    }
  }
  return count
}

/**
 * Spawn the real web service against a probe home and wait for its URL line.
 * @param {object} options
 * @param {string} options.repoRoot - repository root (spawn cwd; paths resolve against it).
 * @param {string} options.home - the probe home ($DSH_HOME).
 * @param {string} options.pidName - this probe's entry in {@link PROBE_SERVICE_PID_FILES}.
 * @param {string} [options.patch] - `--patch` argument (replay adapters); omitted when absent.
 * @param {Record<string, string>} [options.extraEnv] - extra environment (replay variables).
 * @returns {Promise<{ service: import('node:child_process').ChildProcess, url: string, pidFile: string }>}
 * @throws when the service never prints its URL (the service is killed; stderr tail included).
 */
export async function startProbeService({ repoRoot, home, pidName, patch, extraEnv = {} }) {
  const vendorBin = join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  const tsxEntry = import.meta.resolve('tsx/esm')
  const service = spawn(process.execPath, [
    '--import', tsxEntry, vendorBin,
    '--profile', 'dev',
    ...(patch !== undefined ? ['--patch', patch] : []),
    '--port', '0',
    '--no-open',
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DSH_HOME: home,
      DSH_AGENTS_HOME: join(home, 'agents-home'),
      DSH_TELEMETRY_DISABLED: '1',
      TSX_TSCONFIG_PATH: join(repoRoot, 'tsconfig.tsx.json'),
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const pidFile = join(home, pidName)
  writeFileSync(pidFile, String(service.pid))
  let url = undefined
  let bootError = undefined
  service.stdout.on('data', (chunk) => {
    const match = /dsh web: (http:\/\/\S+)/.exec(String(chunk))
    if (match !== null) url = match[1]
  })
  service.stderr.on('data', (chunk) => { bootError = String(chunk) })
  for (let i = 0; i < 120 && url === undefined; i++) await sleep(500)
  if (url === undefined) {
    service.kill('SIGTERM')
    throw new Error(`service never printed its URL (stderr tail: ${String(bootError).slice(-400)})`)
  }
  return { service, url, pidFile }
}

/**
 * Register the probe teardown (pid file, browser, service kill) on exit/SIGINT/SIGTERM.
 * The browser is passed as a GETTER on purpose: both probes register teardown before they
 * launch the browser, so an object snapshot would forever see `undefined`.
 * @param {object} parts
 * @param {import('node:child_process').ChildProcess} parts.service - the spawned service.
 * @param {string} parts.pidFile - its pid file.
 * @param {() => ({ close?: () => void }) | undefined} parts.getBrowser - late-bound CDP handle.
 * @param {boolean} [parts.keepService] - keep the service alive after the probe (debugging).
 * @returns {() => void} the teardown itself, for manual calls before process.exit.
 */
export function registerProbeTeardown({ service, pidFile, getBrowser, keepService }) {
  const teardown = () => {
    rmSync(pidFile, { force: true })
    getBrowser()?.close()
    if (!keepService) service.kill('SIGTERM')
  }
  process.on('exit', teardown)
  process.on('SIGINT', () => { teardown(); process.exit(130) })
  process.on('SIGTERM', () => { teardown(); process.exit(143) })
  return teardown
}
