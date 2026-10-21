#!/usr/bin/env node
/**
 * `ov-doctor`: read-only checks for the optional OpenViking layer of a dsh-smart-assistant
 * install. It ships inside the package because the person who needs it is the person who
 * installed the tarball, not the person who has this repository checked out.
 *
 * The checks answer three questions in order: is the layer installed in this profile, is its
 * configuration self-consistent, and can the running server actually answer a read. A missing
 * optional layer is `off` (exit 2), a broken one is `fail` (exit 1), and a healthy one is 0.
 * No key is ever printed; only "configured / missing" is reported.
 *
 * The commit write probe is opt-in via `--write`: it creates a sentinel session and commits
 * it, which writes a memory. Without the flag it is SKIP, so the default run stays read-only.
 * The MCP `initialize.instructions` check is a read-only handshake and runs whenever the
 * server is reachable.
 *
 * @module dsh-smart-assistant/ov-doctor
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

export const TARGET_SERVER = '0.5.1.1'

const USAGE = `ov-doctor — read-only checks for the optional OpenViking layer

Usage:
  ov-doctor [--base-url URL] [--config PATH] [--dsh-home DIR] [--profile NAME] [--json] [--no-upstream] [--write]

Defaults:
  --base-url   $OPENVIKING_URL or http://127.0.0.1:1933
  --config     $OPENVIKING_CONF or ~/.openviking/ov.conf
  --dsh-home   $DSH_HOME or ~/.dsh
  --profile    web

Exit codes: 0 healthy, 1 broken, 2 layer absent / config unreadable (degraded).
--write runs the commit probe (creates a sentinel session and writes a memory).
`

const LABEL = { ok: 'ok', warn: 'WARN', fail: 'FAIL', off: 'OFF', skip: 'SKIP' }

/** Parse the CLI without a dependency. Unknown flags are an error. */
export function parseArgs(argv) {
  const options = {
    baseUrl: process.env.OPENVIKING_URL?.trim() || 'http://127.0.0.1:1933',
    config: process.env.OPENVIKING_CONF?.trim() || join(homedir(), '.openviking', 'ov.conf'),
    dshHome: process.env.DSH_HOME?.trim() || join(homedir(), '.dsh'),
    profile: 'web',
    json: false,
    help: false,
    noUpstream: false,
    write: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') { options.help = true; continue }
    if (arg === '--json') { options.json = true; continue }
    if (arg === '--no-upstream') { options.noUpstream = true; continue }
    if (arg === '--write') { options.write = true; continue }
    if (arg === '--base-url' || arg === '--config' || arg === '--dsh-home' || arg === '--profile') {
      const value = argv[i + 1]
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value`)
      i += 1
      if (arg === '--base-url') options.baseUrl = value.trim().replace(/\/+$/u, '')
      if (arg === '--config') options.config = value
      if (arg === '--dsh-home') options.dshHome = value
      if (arg === '--profile') options.profile = value
      continue
    }
    throw new Error(`unknown argument: ${arg}`)
  }
  return options
}

/** Read and validate the JSON config without echoing any secret. */
export function validateConfig(configPath) {
  if (!existsSync(configPath)) {
    return { status: 'fail', detail: `missing ${configPath}`, config: undefined, storage: undefined }
  }
  let mode
  try {
    mode = statSync(configPath).mode & 0o777
  } catch (error) {
    return { status: 'fail', detail: `cannot stat ${configPath}: ${messageOf(error)}`, config: undefined, storage: undefined }
  }
  if (mode !== 0o600) {
    return { status: 'fail', detail: `${configPath} mode is 0${mode.toString(8)}; expected 0600`, config: undefined, storage: undefined }
  }
  let config
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (error) {
    return { status: 'fail', detail: `${configPath} is not valid JSON: ${messageOf(error)}`, config: undefined, storage: undefined }
  }
  const vlm = config?.vlm ?? {}
  const embedding = config?.embedding?.dense ?? config?.embedding ?? {}
  const missing = []
  for (const [label, value] of [['vlm.provider', vlm.provider], ['vlm.api_base', vlm.api_base], ['vlm.model', vlm.model], ['vlm.api_key', vlm.api_key],
    ['embedding.provider', embedding.provider], ['embedding.api_base', embedding.api_base], ['embedding.model', embedding.model], ['embedding.api_key', embedding.api_key]]) {
    if (typeof value !== 'string' || value.trim() === '') missing.push(label)
  }
  if (embedding.dimension !== undefined && !Number.isInteger(embedding.dimension)) missing.push('embedding.dimension (integer)')
  const storage = typeof config?.storage?.workspace === 'string' && config.storage.workspace.trim() !== ''
    ? config.storage.workspace.trim()
    : join(homedir(), '.openviking', 'workspace')
  const storageProblem = storageProblemOf(storage)
  if (missing.length > 0) {
    return { status: 'fail', detail: `missing ${missing.join(', ')}; storage=${storage}`, config, storage }
  }
  if (storageProblem !== undefined) {
    return { status: 'fail', detail: storageProblem, config, storage }
  }
  return {
    status: 'ok',
    detail: `vlm=${vlm.provider}/${vlm.model}; embedding=${embedding.provider}/${embedding.model}; storage=${storage}`,
    config,
    storage,
  }
}

/** A storage root is persistent only when it is absolute and outside any `.tmp` segment. */
export function storageProblemOf(storage) {
  if (storage.startsWith('~')) return `storage ${storage} starts with ~; use an absolute path`
  if (!isAbsolute(storage)) return `storage ${storage} is not absolute`
  if (storage.split(/[\\/]/u).includes('.tmp')) return `storage ${storage} is under .tmp; use a persistent path`
  return undefined
}

/** Cloud providers require an explicit ack; captured tool results require filters. */
export function checkCloudCapture({ config, profilePatch = '', env = process.env }) {
  const problems = []
  const apiBase = String(config?.vlm?.api_base ?? '')
  const cloud = apiBase !== '' && !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/u.test(apiBase)
  const ack = env.OPENVIKING_CLOUD_ACK === '1'
  if (cloud && !ack) problems.push('cloud provider without OPENVIKING_CLOUD_ACK=1')

  const envCapture = env.OPENVIKING_CAPTURE_TOOL_RESULTS
  const patchCapture = /(?:^|\n)\s*captureToolResults:\s*(true|false)\b/u.exec(profilePatch)?.[1]
  // DSH's plugin default is true; an unset switch means tool results are captured.
  const captureOn = envCapture !== undefined ? envCapture === 'true' : patchCapture !== undefined ? patchCapture === 'true' : true
  const filters = /(?:^|\n)\s*captureFilters:\s*(?:\[[^\]]+\]|\n(?:\s*-\s*\S+.*\n?)+)/u.test(profilePatch)
  if (captureOn && !filters) problems.push('captureToolResults is on and captureFilters is empty')
  return {
    status: problems.length === 0 ? 'ok' : 'fail',
    detail: `cloud=${String(cloud)}; ack=${String(ack)}; captureToolResults=${String(captureOn)}; filters=${String(filters)}${problems.length ? `; ${problems.join('; ')}` : ''}`,
  }
}

/** Read the MCP `initialize` result without importing an MCP client (SSE or plain JSON). */
export async function mcpInstructions(baseUrl, fetchImpl = fetch, timeoutMs = 4000) {
  const response = await fetchJson(fetchImpl, `${baseUrl.replace(/\/+$/u, '')}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'ov-doctor', version: '0' } },
    }),
  }, timeoutMs)
  if (response.status === 0) return { status: 'warn', detail: `MCP endpoint unreachable (${response.text})` }
  if (!response.ok) return { status: 'warn', detail: `MCP initialize HTTP ${response.status}` }
  let body = response.body
  if (body === undefined) {
    const dataLine = response.text.split(/\r?\n/u).find(line => line.startsWith('data:'))
    if (dataLine !== undefined) {
      try { body = JSON.parse(dataLine.slice(5).trim()) } catch { body = undefined }
    }
  }
  if (body?.result === undefined) return { status: 'warn', detail: 'MCP initialize returned no result' }
  const server = body.result.serverInfo?.name ?? 'unknown'
  const instructions = typeof body.result.instructions === 'string' ? body.result.instructions.trim() : ''
  return instructions === ''
    ? { status: 'ok', detail: `server=${server}; instructions empty` }
    : { status: 'warn', detail: `server=${server}; instructions=${instructions.slice(0, 160)}` }
}

/**
 * Create a sentinel session, commit it, and poll `/api/v1/tasks` until the session_commit
 * task reaches a terminal state. Writes one memory on success; the caller must pass
 * `--write`. The sentinel session is intentionally left in place (the API has no delete);
 * the unique id is reported so a human can clean it up.
 */
export async function commitProbe(baseUrl, fetchImpl = fetch, sessionId = `ov-doctor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`) {
  const base = baseUrl.replace(/\/+$/u, '')
  const created = await fetchJson(fetchImpl, `${base}/api/v1/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
  if (created.status === 0) return { status: 'fail', detail: `cannot create sentinel session (${created.text})` }
  if (!created.ok) return { status: 'fail', detail: `create sentinel session HTTP ${created.status}` }
  const message = await fetchJson(fetchImpl, `${base}/api/v1/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'user', content: 'ov-doctor sentinel; ignore this memory.' }),
  })
  if (!message.ok) return { status: 'fail', detail: `sentinel message HTTP ${message.status}` }
  const commit = await fetchJson(fetchImpl, `${base}/api/v1/sessions/${encodeURIComponent(sessionId)}/commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ keep_recent_count: 0 }),
  }, 30_000)
  if (commit.status === 0) return { status: 'fail', detail: `commit request failed (${commit.text})` }
  if (!commit.ok) return { status: 'fail', detail: `commit HTTP ${commit.status}; ${commit.text.slice(0, 200)}` }
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const tasks = await fetchJson(fetchImpl, `${base}/api/v1/tasks?limit=50`)
    const rows = Array.isArray(tasks.body?.result) ? tasks.body.result : []
    const task = rows.find(row => row?.resource_id === sessionId && row?.task_type === 'session_commit')
    if (task?.status === 'completed') {
      return { status: 'ok', detail: `sentinel ${sessionId} committed (task ${String(task.task_id)}); session left for manual cleanup` }
    }
    if (task?.status === 'failed' || task?.status === 'cancelled') {
      return { status: 'fail', detail: `commit task ${String(task.task_id)} ${String(task.status)}; sentinel ${sessionId}` }
    }
    await new Promise(resolve => setTimeout(resolve, 1_000))
  }
  return { status: 'fail', detail: `commit task timed out after 60s; sentinel ${sessionId}` }
}

/** What the profile actually contains; absent optional layer is information, not a crash. */
export function profileFacts({ dshHome, profile }) {
  const dir = join(dshHome, 'profiles', profile)
  const packagePath = join(dir, 'package.json')
  let manifest
  try {
    manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  } catch {
    manifest = undefined
  }
  const dependency = manifest?.dependencies?.['@openviking/dsh-memory-plugin']
    ?? manifest?.devDependencies?.['@openviking/dsh-memory-plugin']
  const bundles = manifest?.dsh?.profile?.bundles
  const installedPatch = join(dir, 'node_modules', '@openviking', 'dsh-memory-plugin', 'cordis.patch.yml')
  const profilePatchPath = join(dir, 'cordis.patch.yml')
  const profilePatch = existsSync(profilePatchPath) ? readFileSync(profilePatchPath, 'utf8') : ''
  const pluginPatch = existsSync(installedPatch) ? readFileSync(installedPatch, 'utf8') : ''
  const assistantPatchPath = join(dir, 'node_modules', 'dsh-smart-assistant', 'cordis.patch.yml')
  const assistantPatch = existsSync(assistantPatchPath) ? readFileSync(assistantPatchPath, 'utf8') : ''
  return {
    dir,
    packagePath,
    manifest,
    dependency,
    listed: Array.isArray(bundles) ? bundles.includes('@openviking/dsh-memory-plugin') : false,
    installedPatch,
    profilePatch,
    pluginPatch,
    assistantPatch,
  }
}

/** Resolve the Viki base URL from the environment or the profile patch. */
export function vikiBaseUrl({ profilePatch, env = process.env }) {
  const fromEnv = env.OPENVIKING_URL?.trim()
  if (fromEnv) return fromEnv
  const block = /(?:^|\n)\s*-\s*id:\s*assistant-viki\b[\s\S]{0,400}?(?:\n\s*-\s*id:|\n?$)/u.exec(profilePatch)?.[0] ?? ''
  return /(?:^|\n)\s*baseUrl:\s*['"]?([^'"\s]+)/u.exec(block)?.[1]
}

/** Version of the installed OpenViking plugin, from a tgz path or a range. */
export function pluginVersion(dependency) {
  if (typeof dependency !== 'string') return undefined
  return /(\d+\.\d+\.\d+)/u.exec(dependency)?.[1]
}

/** Small helper so one broken probe never hides the rest. */
async function fetchJson(fetchImpl, url, init = {}, timeoutMs = 4000) {
  try {
    const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    const text = await response.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = undefined
    }
    return { ok: response.ok, status: response.status, body, text }
  } catch (error) {
    return { ok: false, status: 0, body: undefined, text: messageOf(error) }
  }
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Run the checks. `fetchImpl` is injectable so a test can serve fake health/search responses.
 * @returns {{ exitCode: number, checks: {id: string, name: string, status: string, detail: string}[] }}
 */
export async function runDoctor(options, fetchImpl = fetch) {
  const checks = []
  const add = (id, name, status, detail) => checks.push({ id, name, status, detail })
  const facts = profileFacts(options)
  add('6', 'composition', facts.dependency === undefined && !facts.listed ? 'off' : 'ok',
    facts.dependency === undefined && !facts.listed
      ? `OpenViking plugin is not installed in profile ${options.profile} — the assistant works without this optional layer`
      : `profile ${options.profile} carries ${facts.dependency ?? 'a bundle row'}`)

  if (facts.dependency === undefined && !facts.listed) {
    add('5', 'commit probe', 'skip', 'skipped: layer is off')
    return { exitCode: 2, checks }
  }
  if (!existsSync(facts.installedPatch)) {
    add('6b', 'installed bundle patch', 'fail', `missing ${facts.installedPatch}`)
  } else if (!facts.pluginPatch.includes('openviking-memory-runtime')) {
    add('6b', 'installed bundle patch', 'fail', 'the installed plugin patch has no openviking-memory-runtime row')
  } else {
    add('6b', 'installed bundle patch', 'ok', 'openviking-memory-runtime row is present')
  }
  if (!facts.assistantPatch.includes('assistant-viki')) {
    add('6c', 'Viki row', 'warn', 'the installed assistant bundle patch has no assistant-viki row')
  } else {
    add('6c', 'Viki row', 'ok', 'assistant-viki row is present')
  }
  const mcp = await mcpInstructions(options.baseUrl, fetchImpl)
  add('6m', 'MCP instructions', mcp.status, mcp.detail)

  const configResult = validateConfig(options.config)
  add('2', 'config', configResult.status, configResult.detail)
  if (configResult.storage !== undefined) {
    add('7', 'storage', 'ok', `persistent root ${configResult.storage}`)
  } else {
    add('7', 'storage', 'skip', 'no readable config')
  }

  const health = await fetchJson(fetchImpl, `${options.baseUrl.replace(/\/+$/u, '')}/health`)
  if (health.status === 0) {
    add('1', 'health', 'off', `cannot reach ${options.baseUrl} (${health.text}); start the server or pass --base-url`)
  } else if (!health.ok || health.body?.healthy !== true) {
    add('1', 'health', 'fail', `HTTP ${health.status}; body says ${health.text.slice(0, 160)}`)
  } else {
    add('1', 'health', 'ok', `version=${String(health.body.version)}; auth=${String(health.body.auth_mode)}`)
  }

  if (health.status !== 0 && health.ok && health.body?.healthy === true) {
    const upstream = options.noUpstream ? ['skip', 'skipped by --no-upstream'] : upstreamDoctor(options.config)
    add('3', 'upstream doctor', upstream[0], upstream[1])
    const search = await fetchJson(fetchImpl, `${options.baseUrl.replace(/\/+$/u, '')}/api/v1/search/find`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'ov-doctor sentinel', limit: 1 }),
    })
    if (search.status === 0) add('4', 'search', 'fail', `cannot reach search/find (${search.text})`)
    else if (!search.ok || search.body?.status === 'error') add('4', 'search', 'fail', `HTTP ${search.status}; ${search.text.slice(0, 200)}`)
    else add('4', 'search', 'ok', `search/find answered (${search.body?.result?.length ?? 0} hit(s))`)
  } else {
    add('3', 'upstream doctor', 'skip', 'skipped: server is not reachable')
    add('4', 'search', 'skip', 'skipped: server is not reachable')
  }

  const viki = vikiBaseUrl({ profilePatch: facts.profilePatch })
  add('6d', 'Viki URL', 'ok',
    viki === undefined
      ? 'default local http://127.0.0.1:1933 (set OPENVIKING_URL or assistant-viki.baseUrl for a remote server)'
      : viki)

  if (configResult.config !== undefined) {
    const cloud = checkCloudCapture({ config: configResult.config, profilePatch: facts.profilePatch })
    add('8', 'cloud/capture', cloud.status, cloud.detail)
  } else {
    add('8', 'cloud/capture', 'skip', 'no readable config')
  }

  const dshVersion = dshVersionOf()
  const plugin = pluginVersion(facts.dependency)
  const server = health.body?.version
  const versionDetail = `server=${server ?? 'unknown'}; plugin=${plugin ?? 'unknown'}; dsh=${dshVersion ?? 'not on PATH'}; target server=${TARGET_SERVER}`
  add('9', 'versions', server === TARGET_SERVER ? 'ok' : 'warn', versionDetail)

  const envConfig = process.env.OPENVIKING_CONF
  add('10', 'config source', envConfig === undefined ? 'warn' : resolve(envConfig) === resolve(options.config) ? 'ok' : 'warn',
    envConfig === undefined
      ? `doctor reads ${options.config}; ensure the running server was started with the same file`
      : `OPENVIKING_CONF=${envConfig}; doctor reads ${resolve(options.config)}`)

  if (health.status !== 0 && health.ok && health.body?.healthy === true) {
    if (options.write) {
      const probe = await commitProbe(options.baseUrl, fetchImpl)
      add('5', 'commit probe', probe.status, probe.detail)
    } else {
      add('5', 'commit probe', 'skip', 'read-only run; pass --write to create a sentinel session and commit it')
    }
  } else {
    add('5', 'commit probe', 'skip', 'skipped: server is not reachable')
  }
  const fails = checks.filter(check => check.status === 'fail')
  const off = checks.filter(check => check.status === 'off')
  const exitCode = fails.length > 0 ? 1 : off.length > 0 ? 2 : 0
  return { exitCode, checks }
}

function upstreamDoctor(configPath) {
  const result = spawnSync('openviking-server', ['doctor', '--config', configPath], { encoding: 'utf8', timeout: 60_000 })
  if (result.error?.code === 'ENOENT') return ['warn', 'openviking-server is not on PATH; skipped']
  if (result.status === 0) return ['ok', 'openviking-server doctor passed']
  const tail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim().split('\n').slice(-4).join(' | ')
  return ['fail', `openviking-server doctor exit ${String(result.status)}${tail ? `: ${tail}` : ''}`]
}

function dshVersionOf() {
  const result = spawnSync('dsh', ['--version'], { encoding: 'utf8', timeout: 5_000 })
  if (result.error?.code === 'ENOENT') return undefined
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n')[0] || undefined
}

/** Print the report; JSON is for scripts, the line format is for humans. */
export async function main(argv = process.argv.slice(2), { stdout = console.log } = {}) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    stdout(`ov-doctor: ${messageOf(error)}\n\n${USAGE}`)
    return 1
  }
  if (options.help) {
    stdout(USAGE)
    return 0
  }
  const report = await runDoctor(options)
  if (options.json) {
    stdout(JSON.stringify({ exitCode: report.exitCode, baseUrl: options.baseUrl, config: options.config, checks: report.checks }, null, 2))
    return report.exitCode
  }
  stdout(`ov-doctor: base=${options.baseUrl} config=${options.config} profile=${options.profile}`)
  for (const check of report.checks) {
    stdout(`${LABEL[check.status] ?? check.status} ${check.id.padStart(2)} ${check.name}: ${check.detail}`)
  }
  const fails = report.checks.filter(check => check.status === 'fail').length
  const warns = report.checks.filter(check => check.status === 'warn').length
  const skips = report.checks.filter(check => check.status === 'skip').length
  stdout(`summary: exit ${report.exitCode}; ${fails} fail, ${warns} warn, ${skips} skip`)
  return report.exitCode
}

const entry = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href
if (import.meta.url === entry) {
  main().then((code) => {
    process.exitCode = code
  }).catch((error) => {
    console.error(`ov-doctor: ${messageOf(error)}`)
    process.exitCode = 1
  })
}
