/**
 * Pure core for the web-face expected-comparison pilot (test-strategy adoption, slice 2).
 *
 * Owns comparison, scene capture arguments, and the explicit-scenario gate, so the CLI
 * shell (`webui-expected.mjs`) stays thin and the spec (`tests/tooling/webui-expected-core.spec.mjs`)
 * can pin every accepted/rejected shape on fixtures:
 *
 *   1. normalizeDomEvidence — strip/rename the fields that CANNOT be part of the expected
 *      state (per-capture volatility), leaving the text-structural evidence.
 *   2. compareEvidence — diff normalized actual against the committed expectation,
 *      returning human-readable problem lines (empty = pass).
 *   3. discoverScenarios + buildMissingScenarioUsage — enumerate the runnable scenario
 *      directories under snapshots/web-face and refuse a bare invocation with that list
 *      (261020 audit #8: the old silent blank-only default left the banner scenario
 *      unverified after the S4 client refactor).
 *
 * The ignore list is a REVIEWED SOURCE CONSTANT, not a knob: every field left out must
 * carry the reason it can never be evidence. This is the "fix fixtures, not normalizers"
 * boundary from the other side — the normalizer is allowed to exist, but only with an
 * explicit, reviewable reason per exclusion (a silent widening is the failure mode).
 * Pixel comparison is deliberately absent: the DOM outline is the diffable surface, and
 * the PNG travels beside it for human review only.
 */

/**
 * Fields dropped before comparison, each with the reason it can never carry evidence.
 * `bootEntries` is the composition surface — owned by preflight / --dump-config, not by
 * a render. Counting fields (elementCount/pageHeight/screens) move with font metrics and
 * unrelated DOM churn; the structural lists below are the actual regression surface.
 * `href` carries the per-serve port and token. `capturedAt` is the capture clock. `lang`
 * reads the host locale: the locale override cannot reach the first document
 * (webui-shots.mjs header), so the field reports the machine, not the product — the rendered
 * copy (visibleText) is the evidence.
 */
import { homedir } from 'node:os'

const IGNORED_FIELDS = new Set(['href', 'lang', 'elementCount', 'pageHeight', 'screens', 'bootEntries', 'capturedAt'])

/**
 * Fields compared verbatim after normalization. `readyState` must be "complete" (a half-
 * booted capture should fail, not pass); `viewport` pins the capture geometry to the
 * scenario's declared size; `title` is a stable identity face; the three text-structural
 * lists ARE the evidence; console/network failure lists must stay empty for this state.
 */
const COMPARED_FIELDS = ['title', 'viewport', 'readyState', 'visibleText', 'textOutline', 'controls', 'consoleErrors', 'networkFailures']

/**
 * Replace per-serve volatility inside compared strings with typed tokens (DSH snapshot
 * shape: identity moves to a token, relations stay). Currently only the console/network
 * lists can embed the origin (a failed request URL); `href` itself is already ignored.
 */
function tokenize(value) {
  if (typeof value === 'string') {
    const home = homedir()
    const withHome = home === '' ? value : value.split(home).join('{{home}}')
    return withHome.replace(/https?:\/\/127\.0\.0\.1:\d+/g, '{{origin}}')
  }
  if (Array.isArray(value)) return value.map(tokenize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tokenize(v)]))
  }
  return value
}

/**
 * Drop ignored fields and tokenize. Returns a plain object holding only compared fields —
 * an unknown top-level field (shots gained a new output) is KEPT under `unowned`, so a
 * new evidence channel becomes a visible diff instead of silently joining the contract.
 */
export function normalizeDomEvidence(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`DOM evidence must be a JSON object, got ${typeof raw}`)
  }
  const normalized = {}
  const unowned = {}
  for (const [key, value] of Object.entries(raw)) {
    if (IGNORED_FIELDS.has(key)) continue
    if (COMPARED_FIELDS.includes(key)) normalized[key] = tokenize(value)
    else unowned[key] = value
  }
  if (unowned.unowned === undefined && Object.keys(unowned).length > 0) normalized.unowned = unowned
  return normalized
}

/** One-line render of a scalar mismatch, bounded so a wall of text stays readable. */
function preview(value, max = 120) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (text === undefined) return 'undefined'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** First differing index of two string arrays, or -1 when one is a prefix of the other. */
function firstDelta(actual, expected) {
  const len = Math.max(actual.length, expected.length)
  for (let i = 0; i < len; i++) if (actual[i] !== expected[i]) return i
  return -1
}

/**
 * Build the page-context readiness snippet for a scene that pins async-loaded content.
 * The shots settle window is a fixed clock, and a fetch that straddles it produces a
 * false red (first-open-draft-banner: the desk walk-view read missed the window in
 * ~2/10 captures, 2026-10-05). A scene that declares a wait token gets a polling eval
 * (shots runs evals with awaitPromise and re-settles after each) instead of a longer
 * guess. Timeout resolves rather than rejects: the capture proceeds and the comparison
 * fails on the missing content — a legitimately absent token (negative probe) stays a
 * content drift, not a tool error.
 */
export function buildWaitSnippet(needle, timeoutMs = 15_000) {
  const literal = String(needle).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return [
    'new Promise(resolve => {',
    `  const needle = '${literal}'`,
    `  const deadline = Date.now() + ${Number(timeoutMs)}`,
    '  const iv = setInterval(() => {',
    "    if (document.body !== null && document.body.innerText.includes(needle)) { clearInterval(iv); resolve('ready: ' + needle) }",
    "    if (Date.now() > deadline) { clearInterval(iv); resolve('timeout: ' + needle) }",
    '  }, 200)',
    '})',
  ].join('\n')
}

/** Forward ordered scene actions before the readiness wait; shots owns their execution. */
export function buildCaptureEvalArgs(args, waitText) {
  const evalArgs = args.flatMap((arg, index) => arg === '--eval' && index + 1 < args.length
    ? ['--eval', args[index + 1]]
    : [])
  if (waitText !== undefined) evalArgs.push('--eval', buildWaitSnippet(waitText))
  return evalArgs
}

/**
 * What makes a directory under snapshots/web-face a runnable scenario: the committed
 * expectation this tool compares against. A directory without it (a draft README, an
 * unrelated subdir) is not offered to the caller as a scenario.
 */
export const SCENARIO_EXPECTATION_FILE = 'expected.dom.json'

/**
 * The usage line in one place because two runtime error paths print it: the CLI's
 * missing-url error and the missing-scenario gate below. `--scenario` is spelled without
 * brackets — it is required, not optional.
 */
export const USAGE_LINE = 'usage: node dev/probes/web/webui-expected.mjs <url-with-token> --scenario <dir> [--refresh] [--size <WxH>] [--eval <js>] [--wait-text <substring>]'

/**
 * Enumerate the runnable scenario directory names under the web-face root. Pure over the
 * injected directory view: `dirents` is a Dirent-like listing ({ name, isDirectory() }),
 * and `hasExpectation(name)` answers whether that directory holds the committed
 * expectation — the CLI passes the real fs, the spec passes fixture shapes (empty root,
 * two scenarios, non-scenario entries) without ever touching snapshots/.
 */
export function discoverScenarios(dirents, hasExpectation) {
  return dirents
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(hasExpectation)
    .sort()
}

/**
 * The explicit-scenario gate (261020 audit #8): a bare invocation used to silently
 * compare only blank-first-open, and that is exactly how the banner scenario went
 * unverified after the S4 client refactor. Every scenario carries its own home recipe —
 * how the isolated home is served and seeded; each directory's README is the contract —
 * so no single default can cover the web face and the caller must name one. Returns the
 * usage-error text when the scenario value is missing (flag absent, or flag with no
 * value), or null when the invocation is already explicit and must proceed untouched.
 */
export function buildMissingScenarioUsage(scenarioValue, names, webFaceDir) {
  if (scenarioValue !== undefined) return null
  const lines = [
    'webui-expected: --scenario is required — each scenario has its own home recipe (its README is the contract), so no default can cover the web face.',
    USAGE_LINE,
  ]
  if (names.length === 0) {
    lines.push(`no runnable scenarios found under ${webFaceDir} — a scenario is a directory with a committed ${SCENARIO_EXPECTATION_FILE}`)
  } else {
    lines.push(`scenarios under ${webFaceDir}:`)
    for (const name of names) {
      lines.push(`  --scenario ${webFaceDir}/${name}    (contract: ${webFaceDir}/${name}/README.md)`)
    }
  }
  return lines.join('\n')
}

/**
 * Compare normalized actual against the committed expectation. Returns problem lines
 * (empty array = pass). Line lists diff by first-delta with bounded extra/missing
 * previews: a UI regression shifts or inserts lines, and the reviewer needs WHAT moved,
 * not a full unified dump.
 */
export function compareEvidence(actual, expected) {
  const problems = []
  for (const field of COMPARED_FIELDS) {
    const a = actual[field]
    const e = expected[field]
    if (Array.isArray(e) || Array.isArray(a)) {
      const av = Array.isArray(a) ? a : []
      const ev = Array.isArray(e) ? e : []
      if (JSON.stringify(av) !== JSON.stringify(ev)) {
        const at = firstDelta(av, ev)
        const detail = at === -1
          ? `length ${ev.length} → ${av.length}`
          : `first change at [${at}]: "${preview(ev[at])}" → "${preview(av[at])}"`
        problems.push(`${field}: ${detail}`)
        const extra = av.length - ev.length
        if (extra > 0) problems.push(`${field}: +${extra} line(s), e.g. ${preview(av.slice(ev.length).find(x => !ev.includes(x)) ?? av[av.length - 1], 90)}`)
        if (extra < 0) problems.push(`${field}: ${-extra} line(s) missing, e.g. ${preview(ev.slice(av.length).find(x => !av.includes(x)) ?? ev[ev.length - 1], 90)}`)
      }
      continue
    }
    if (JSON.stringify(a) !== JSON.stringify(e)) {
      problems.push(`${field}: expected ${preview(e)}, actual ${preview(a)}`)
    }
  }
  return problems
}
