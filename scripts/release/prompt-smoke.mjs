#!/usr/bin/env node
/**
 * Keyless prompt smoke: run the preset-mounted one-shot through the existing llm-replay patch,
 * then prove the assembled request actually carried the four prompt sections and the six tools.
 *
 * This is the T4 "model-visible" assertion without a real model or a full session replay: the
 * replay fixture answers deterministically; the evidence is the request side of the session log.
 * It writes only booleans and names to .tmp/prompt-smoke/report.json — never the prompt text,
 * which can contain the dev home's real working-folder data.
 *
 * Usage: pnpm prompt-smoke
 * Exit 0 = one-shot completed, one system message and one request header found, all checks pass.
 * Requires the dev profile (`pnpm start`/`dev/env/setup.sh`) and the `zstd` executable.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const home = join(repoRoot, 'dev', 'harness-home')
const profile = join(home, 'profiles', 'dev-task')
const outDir = join(repoRoot, '.tmp', 'prompt-smoke')
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}

if (!existsSync(profile)) {
  console.error(`prompt-smoke: dev-task profile missing at ${profile}`)
  console.error('  run `pnpm start` (or `bash dev/env/setup.sh`) once, then retry')
  process.exit(2)
}
if (spawnSync('zstd', ['--version'], { stdio: 'ignore' }).status !== 0) {
  console.error('prompt-smoke: the `zstd` executable is required to read session logs')
  process.exit(2)
}

const startedAt = Date.now() - 2_000
const task = 'Reply only with "prompt smoke complete"; do not call any tool.'

step('preparing a fresh working folder for the current manual generation')
// A dev home can carry an older, hand-edited manual; the smoke must test the assembled request
// from *this* build, not whatever the developer's home happens to contain. Point assistant-memory
// at a throwaway home whose AGENTS.md is the current render.
const freshAssistant = join(outDir, 'assistant-home')
mkdirSync(freshAssistant, { recursive: true })
const { renderHomeManual } = await import(pathToFileURL(join(repoRoot, 'packages', 'dsh-smart-assistant', 'lib', 'domain', 'home', 'home-map.js')).href)
writeFileSync(join(freshAssistant, 'AGENTS.md'), renderHomeManual(), 'utf8')
const dataPatch = join(outDir, 'data-dir.patch.yml')
writeFileSync(dataPatch, `- id: assistant-memory\n  config:\n    dataDir: ${JSON.stringify(freshAssistant)}\n`, 'utf8')
ok('fresh manual and dataDir overlay ready')

step('running the keyless replay one-shot')
try {
  execFileSync('pnpm', ['dsh', '--profile', 'dev-task', '--patch', 'dev/probes/session/preset-runner-replay.patch.yml', '--patch', dataPatch, task], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 180_000,
  })
  ok('replay one-shot completed')
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  fail(`one-shot failed: ${detail.slice(0, 400)}`)
}

function newestSessionLog() {
  const found = []
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      const info = statSync(path)
      if (info.isDirectory()) walk(path)
      else if (/^session\.v\d+\.jsonl\.zstd$/.test(name) && info.mtimeMs >= startedAt) found.push({ path, mtime: info.mtimeMs })
    }
  }
  const sessions = join(home, 'sessions')
  if (existsSync(sessions)) walk(sessions)
  found.sort((a, b) => b.mtime - a.mtime)
  return found[0]?.path
}

let log
if (failures.length === 0) {
  step('locating the request log')
  log = newestSessionLog()
  if (log === undefined) fail('no session log newer than this run')
  else ok(log.replace(`${repoRoot}/`, ''))
}

let systemText
let tools = []
if (log !== undefined) {
  step('parsing the request side')
  const decompressed = spawnSync('zstd', ['-dc', log], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (decompressed.status !== 0) fail(`cannot decompress ${log}`)
  else {
    let systemMessages = 0
    let headers = 0
    for (const line of decompressed.stdout.split('\n')) {
      if (line.trim() === '') continue
      let event
      try {
        event = JSON.parse(line)
      } catch {
        fail('session log contains a non-JSON line')
        break
      }
      if (event.type === 'system/message') {
        systemMessages += 1
        systemText = (event.data?.message?.content ?? []).map(part => part?.text ?? '').join('\n')
      }
      if (event.type === 'request/header') {
        headers += 1
        tools = (event.data?.header?.tools ?? []).map(tool => tool?.name).filter(name => typeof name === 'string')
      }
    }
    if (systemMessages !== 1) fail(`expected one system/message, got ${systemMessages}`)
    else if (headers !== 1) fail(`expected one request/header, got ${headers}`)
    else ok('one assembled system message and one request header')
  }
}

const sectionChecks = [
  ['identity', 'management-post expert'],
  ['working-folder manual', '# Your working folder'],
  ['delivery rule', 'Deliver files where the principal can take them'],
  ['session recall policy', 'Every session you have ever had is searchable'],
  ['project facts boundary', 'Project-bound facts stay with the project'],
  ['four standing sections', 'Four things ride in every request'],
  ['memory digest', 'Live status of your working folder'],
  ['operating brief', 'Desk capture lane'],
]
// A retired instruction that set the model against the mounted session tools (D1, 2026-10-28).
const absentChecks = [
  ['retired session-recall claim', 'Nothing indexes them'],
]
const requiredTools = [
  'assistant_memory',
  'assistant_recall',
  'assistant_research',
  'assistant_reflect',
  'assistant_knowledge',
  'assistant_operating',
]
const report = {
  generatedAt: new Date().toISOString(),
  session: log?.replace(`${repoRoot}/`, ''),
  sections: Object.fromEntries(sectionChecks.map(([name, needle]) => [name, systemText?.includes(needle) === true])),
  absent: Object.fromEntries(absentChecks.map(([name, needle]) => [name, systemText?.includes(needle) !== true])),
  tools: requiredTools.map(name => ({ name, present: tools.includes(name) })),
}
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (systemText !== undefined) {
  step('checking the prompt sections')
  for (const [name, needle] of sectionChecks) {
    if (systemText.includes(needle)) ok(`${name}: present`)
    else fail(`${name}: missing (${needle})`)
  }
  step('checking retired instructions are gone')
  for (const [name, needle] of absentChecks) {
    if (!systemText.includes(needle)) ok(`${name}: absent`)
    else fail(`${name}: still present (${needle})`)
  }
  step('checking the six assistant tools')
  for (const name of requiredTools) {
    if (tools.includes(name)) ok(name)
    else fail(`${name}: missing from request/header.tools`)
  }
}

console.log('')
console.log(`report: ${join(outDir, 'report.json')}`)
if (failures.length === 0) {
  console.log('prompt-smoke: passed')
  process.exit(0)
}
console.log(`prompt-smoke: ${failures.length} failure(s)`)
process.exit(1)
