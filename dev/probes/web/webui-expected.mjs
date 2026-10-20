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
 * Two modes (each names its scenario explicitly — see the gate note under Usage):
 *   node dev/probes/web/webui-expected.mjs '<url>' --scenario <dir>              # capture → compare → exit 1 on drift
 *   node dev/probes/web/webui-expected.mjs '<url>' --scenario <dir> --refresh    # capture → write the expectation
 *
 * Every written expectation is human-reviewed before commit (the DOM JSON is the diffable
 * surface; the PNG stays in the temp dir for eyeballing and never enters git). Scenario
 * contract — how to serve the isolated home, what the state is, why each field is
 * ignored — lives in the scenario's own README, per snapshots/AGENTS.md.
 *
 * Usage:
 *   node dev/probes/web/webui-expected.mjs '<url-with-token>' --scenario <dir> [--refresh]
 *        [--size <WxH>]   (default 1600x1000, must match the committed expectation)
 *        [--eval <js>] [--wait-text <substring>]   (readiness token polled before capture; scenes pinning
 *                                     async-loaded content declare theirs in snapshot.yml)
 *
 * --scenario is required (2026-10-20, audit #8): each scenario carries its own home
 * recipe — how the isolated home is served and seeded — so a default that quietly picks
 * one scenario is a selective-run trap (the banner scenario went unverified after the
 * S4 client refactor for exactly this reason). A bare run stops with the discovered
 * scenario list and each README pointer instead of guessing.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'
import { buildCaptureEvalArgs, buildMissingScenarioUsage, compareEvidence, discoverScenarios, normalizeDomEvidence, SCENARIO_EXPECTATION_FILE, USAGE_LINE } from './webui-expected-core.mjs'
import { option } from './probe-utils.mjs'

const args = process.argv.slice(2)
const targetUrl = args.find(a => !a.startsWith('--'))
const scriptRoot = fileURLToPath(new URL('.', import.meta.url))
const webFaceRoot = resolve(scriptRoot, '..', '..', '..', 'snapshots', 'web-face')
const size = option(args, 'size', '1600x1000')
const refresh = args.includes('--refresh')
// Scenes pinning async-loaded content declare their readiness token; the polling eval
// replaces a longer settle guess (see buildWaitSnippet for the flake it closes).
const waitText = option(args, 'wait-text')

if (targetUrl === undefined) {
  console.error(USAGE_LINE)
  process.exit(1)
}

// 261020 (audit #8): --scenario is required. The old silent default compared
// blank-first-open only, and the banner scenario went unverified after the S4 client
// refactor for exactly that reason. Discovery runs only on this error path — an
// explicit invocation never consults it.
const scenarioArg = option(args, 'scenario')
if (scenarioArg === undefined) {
  let names = []
  try {
    names = discoverScenarios(
      readdirSync(webFaceRoot, { withFileTypes: true }),
      name => existsSync(join(webFaceRoot, name, SCENARIO_EXPECTATION_FILE)),
    )
  } catch {
    // An unreadable web-face root leaves discovery empty; the gate reports that honestly.
  }
  console.error(buildMissingScenarioUsage(scenarioArg, names, relative(process.cwd(), webFaceRoot) || '.'))
  process.exit(1)
}
const scenarioDir = resolve(scenarioArg)
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

const workDir = mkTmpDir('web-expected', 'webui-expected-')
const evalArgs = buildCaptureEvalArgs(args, waitText)
const capture = spawnSync(process.execPath, [
  join(scriptRoot, 'webui-shots.mjs'),
  targetUrl,
  '--out', workDir,
  '--name', 'expected',
  '--size', size,
  '--dom',
  ...evalArgs,
  // 261019 (BUG-021): a scene's readiness token is a gate, not a sleep. If the wait snippet
  // reports `timeout: <token>` instead of `ready: <token>`, shots exits non-zero and no
  // expectation is written or compared against the wrong state.
  ...(waitText !== undefined ? ['--require-eval', `ready: ${waitText}`] : []),
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
