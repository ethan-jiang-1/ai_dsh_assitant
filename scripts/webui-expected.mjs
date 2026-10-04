#!/usr/bin/env node
/**
 * Expected-comparison for the web-face snapshot pilot (test-strategy adoption, slice 2) —
 * the "regression" half the shots tool lacks: shots captures (PNG + DOM evidence), this
 * compares a capture against the committed expectation and exits non-zero on drift.
 *
 * Why a separate tool instead of a `--compare` flag on shots: shots owns the capture
 * mechanics (CDP quirks, locale, watchdogs — see its header); this owns the scenario
 * contract (which state, which fields count). The capture is reused by spawning shots as
 * a subprocess — its battle-tested flags are the interface, and a second CDP client would
 * be a second copy of every 2026-09-26 lesson. The comparison core lives in
 * `webui-expected-core.mjs` so the spec can pin accepted/rejected shapes on fixtures
 * (scripts/AGENTS.md: check logic and checked corpus stay apart).
 *
 * Two modes:
 *   node scripts/webui-expected.mjs '<url>'                # capture → compare → exit 1 on drift
 *   node scripts/webui-expected.mjs '<url>' --refresh      # capture → write the expectation
 *
 * Every written expectation is human-reviewed before commit (the DOM JSON is the diffable
 * surface; the PNG stays in the temp dir for eyeballing and never enters git). Scenario
 * contract — how to serve the isolated home, what the state is, why each field is
 * ignored — lives in the scenario's own README, per snapshots/AGENTS.md.
 *
 * Usage:
 *   node scripts/webui-expected.mjs '<url-with-token>' [--scenario <dir>] [--refresh]
 *        [--size <WxH>]   (default 1600x1000, must match the committed expectation)
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareEvidence, normalizeDomEvidence } from './webui-expected-core.mjs'

const args = process.argv.slice(2)
const targetUrl = args.find(a => !a.startsWith('--'))
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback
}
const scriptRoot = fileURLToPath(new URL('.', import.meta.url))
const scenarioDir = resolve(option('scenario', join(scriptRoot, '..', 'snapshots', 'web-face', 'blank-first-open')))
const size = option('size', '1600x1000')
const refresh = args.includes('--refresh')

if (targetUrl === undefined) {
  console.error("usage: node scripts/webui-expected.mjs <url-with-token> [--scenario <dir>] [--refresh] [--size <WxH>]")
  process.exit(1)
}
const expectedPath = join(scenarioDir, 'expected.dom.json')

try {
  if (!refresh) {
    // Reading the expectation first means a broken scenario fails before spending a
    // capture — and a missing expectation is a refresh request, not a pass.
    JSON.parse(readFileSync(expectedPath, 'utf8'))
  }
} catch {
  console.error(`no expectation at ${expectedPath} — run with --refresh to create it`)
  process.exit(1)
}

const workDir = mkdtempSync(join(tmpdir(), 'webui-expected-'))
const capture = spawnSync(process.execPath, [
  join(scriptRoot, 'webui-shots.mjs'),
  targetUrl,
  '--out', workDir,
  '--name', 'expected',
  '--size', size,
  '--dom',
], { stdio: 'inherit' })
if (capture.status !== 0) {
  console.error(`webui-expected: capture failed (shots exit ${capture.status}) — evidence dir: ${workDir}`)
  process.exit(1)
}

const domPath = join(workDir, `expected-${size}.dom.txt`)
let raw
try {
  raw = JSON.parse(readFileSync(domPath, 'utf8'))
} catch {
  console.error(`webui-expected: no DOM evidence at ${domPath} (capture reported ok but wrote nothing readable)`)
  process.exit(1)
}

const actual = normalizeDomEvidence(raw)

if (refresh) {
  mkdirSync(scenarioDir, { recursive: true })
  writeFileSync(expectedPath, JSON.stringify(actual, null, 1) + '\n')
  console.log(`webui-expected: expectation written → ${expectedPath}`)
  console.log(`webui-expected: capture for human review (not committed): ${join(workDir, `expected-${size}.png`)}`)
  process.exit(0)
}

const expected = normalizeDomEvidence(JSON.parse(readFileSync(expectedPath, 'utf8')))
const problems = compareEvidence(actual, expected)
if (problems.length === 0) {
  console.log(`webui-expected: PASS — ${scenarioDir.replace(process.cwd() + '/', '')} matches (capture: ${workDir})`)
  process.exit(0)
}
console.error(`webui-expected: FAIL — ${problems.length} drift line(s) against ${expectedPath}:`)
for (const line of problems) console.error(`  - ${line}`)
console.error(`webui-expected: renders to compare by eye: ${join(workDir, `expected-${size}.png`)}`)
console.error('webui-expected: intended change → review the diff, then re-run with --refresh; unintended → treat as a regression')
process.exit(1)
