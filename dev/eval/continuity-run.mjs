#!/usr/bin/env node
/**
 * `pnpm eval:continuity` — the focused first-turn continuation eval (issue 261012, slice 2).
 *
 * Why it exists: `pnpm eval` runs every task through the SHARED dev home, so no existing task
 * pins the first-turn continuation behaviour to a KNOWN ledger — the readback slice's note said
 * exactly that ("现有 eval 没有专门独立 fixture 的首回合接续任务"), which is why the card's
 * A1/A2 rows stayed blocked. This driver owns that missing evidence asset: it provisions a
 * throwaway home inside the repo's `.tmp/` (profiles + plugin link via `dev/env/setup.sh`;
 * credentials copied from the dev home — the daily `~/.dsh` is never touched), seeds the
 * fixture ledger at `<home>/assistant-operating/ledger.json`, ASSERTS the seed before the
 * session runs, then runs one real preset session with a continuation prompt and reads the
 * verdict from the session log:
 *
 *   1. read-right-matter     an `assistant_operating` call with `action: "read"`, `matter_id: "m-1"`
 *   2. read-succeeded        that call's tool/result carries the seeded entrust-verbatim markers
 *                            (12.8 / 王会计) — an errored or wrong-matter read cannot fake them
 *   3. read-before-answer    a marker-bearing assistant message exists with a LATER seq than the
 *                            successful read — the package is delivered after reading, not before
 *   4. package-honesty       the answer carries the promised deadline, quotes a verbatim marker,
 *                            and presents the pending proposal as awaiting the principal
 *   5. no-unauthorized-write no mutating `assistant_operating` action in the whole session AND
 *                            the ledger file is byte-identical before/after the run
 *
 * The card's four evaluator negatives are proven red by `--self-check` (wired into
 * `pnpm verify`): a full-package answer with no read call (parroting / 后来追问补全), a read of
 * the WRONG matter (m-2, the similarly-named distractor), an answer after a FAILED read, and a
 * ledger that changed (无授权写入) — plus the package delivered BEFORE the read. Missing
 * credentials, fixtures or a session that never produced a log report BLOCKED and never fold
 * into green.
 *
 * Honest limits: this proves the model-side continuation floor in the headless (副入口) shape —
 * one continuation turn, one known ledger, simulated business content. It does not prove the
 * web processing-path seed chain (client spec + real composition own that), UX quality
 * (`pnpm desk-walk` / `pnpm shots` own that), or real-business value (only the card's natural
 * observation can).
 *
 * Usage:
 *   pnpm eval:continuity              # provision a throwaway home, seed, run, judge, clean up
 *   pnpm eval:continuity -- --keep    # keep the throwaway home for inspection
 *   node dev/eval/continuity-run.mjs --self-check   # evaluator red/green controls only
 *
 * @module dev/eval/continuity-run
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../env/tmp.mjs'
import { readEvents, sessionLogs } from '../lib/session-logs.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fixturePath = join(repoRoot, 'dev', 'fixtures', 'eval-continuity', 'seed-ledger.json')
const devHome = join(repoRoot, 'dev', 'harness-home')

/**
 * The continuation prompt (session B, 副入口 shape): names the matter, asks for the state of
 * play. The user says neither the amount, the accountant, the deadline, nor the pending change —
 * every one of those must come from the ledger, which is what makes the answer markers
 * authoritative readback rather than parroting.
 */
const PROMPT = 'XR-09 的尾款那件事，接着办——先说说现在到哪一步了。'
import { OPERATING_TOOL, SEED_EXPECTATIONS, analyzeContinuity, assertSeed, ledgerProblems, parseOperatingCall, sessionExpectations, sha256 } from '../lib/continuity-core.mjs'


// ── Evaluator red/green controls (prove-it-red: a harness that cannot fail is a report) ──────

/** Build a synthetic tool/call event. */
function callEvent(seq, callId, args) {
  return { type: 'tool/call', seq, data: { name: OPERATING_TOOL, callId, arguments: JSON.stringify(args) } }
}

/** Build a synthetic tool/result event. */
function resultEvent(seq, callId, text) {
  return { type: 'tool/result', seq, data: { message: { toolCallId: callId, content: [{ type: 'text', text }] } } }
}

/** Build a synthetic assistant/message event with one text block. */
function answerEvent(seq, text) {
  return { type: 'assistant/message', seq, data: { message: { content: [{ type: 'text', text }] } } }
}

/** The compliant synthetic answer: six-piece shape with the seeded facts. */
const COMPLIANT_ANSWER = '接着办。现在的状态：\n1. 目的与你的原话：盯 XR-09 尾款，对方答应 10 月 20 日前付清，一共 12.8 万，到账后跟王会计核一遍再开票。\n2. 已确认事实：10-11 客户来电说财务周五统一安排，预计 10-17 前后到账。\n3. 待你确认的变化：客户后来改口说可能推迟到 10-24（下周一），这是待确认提案，还没生效。\n4. 时间：承诺 2026-10-20；外部预测 10-17；下一核对点 10-21。\n5. 未知：改口后的确切到账日；「尾款那笔安排了」那条微信还没归属。\n6. 下一步：等你确认要不要接受 10-24 的新期限。'

/** The good seed state, minimal but complete for assertSeed. */
function goodSeedState() {
  return {
    version: 1,
    matters: {
      'm-1': {
        id: 'm-1', title: '合同 XR-09 尾款收回', status: 'active', revision: 3,
        times: {}, materials: [{ source: { quote: '一共 12.8 万，到账后我要跟王会计核一遍再开票。' } }],
        proposals: [{ id: 'p-1', status: 'pending', change: { kind: 'reschedule', promisedDeadline: '2026-10-24' } }],
      },
      'm-2': { id: 'm-2', title: '合同 XR-09 预付款开票', status: 'active', revision: 1, materials: [], proposals: [] },
      'm-3': { id: 'm-3', title: '九月社保缴纳', status: 'completed', revision: 2, materials: [], proposals: [] },
    },
    operations: {}, unclaimed: { 'u-1': { id: 'u-1' } }, nextMatterSeq: 4, nextUnclaimedSeq: 2,
  }
}

/**
 * Prove the evaluator red on every negative the card names, green on the compliant shape.
 * Pure — no session, no filesystem, no home.
 */
export function selfCheck() {
  const expectations = sessionExpectations()
  const fail = (label, condition) => {
    if (!condition) throw new Error(`eval:continuity --self-check: FAIL — ${label}`)
  }

  // Green: the compliant continuation — read the right matter, authoritative result, then answer.
  const good = analyzeContinuity([
    callEvent(10, 'c-read', { action: 'read', matter_id: 'm-1' }),
    resultEvent(11, 'c-read', 'Matter m-1 (revision 3): … 12.8 万 … 王会计 … pending proposal p-1 reschedule → 2026-10-24 …'),
    answerEvent(12, COMPLIANT_ANSWER),
  ], expectations)
  fail('the compliant continuation must pass', good.passed)
  if (good.facts.successfulReads !== 1 || good.facts.mutatingActions.length !== 0) {
    throw new Error('eval:continuity --self-check: FAIL — the compliant facts were not counted as expected')
  }

  // Red N1 (后来追问补全 / parroting): the full package with NO read call at all.
  const parrot = analyzeContinuity([answerEvent(5, COMPLIANT_ANSWER)], expectations)
  fail('a full-package answer with no read call must fail', !parrot.passed && parrot.reasons.some(reason => reason.includes('read-right-matter')))

  // Red N2 (错事项): a read of the distractor m-2 — similarly named, wrong money.
  const wrongMatter = analyzeContinuity([
    callEvent(10, 'c-read', { action: 'read', matter_id: 'm-2' }),
    resultEvent(11, 'c-read', 'Matter m-2 (revision 1): 预付款 5 万已开票并寄出……'),
    answerEvent(12, COMPLIANT_ANSWER),
  ], expectations)
  fail('a read of the wrong matter must fail', !wrongMatter.passed && wrongMatter.reasons.some(reason => reason.includes('read-right-matter')))

  // Red N3 (读调用失败): the right call errored (no markers in the result), answered anyway.
  const failedRead = analyzeContinuity([
    callEvent(10, 'c-read', { action: 'read', matter_id: 'm-1' }),
    resultEvent(11, 'c-read', 'Error: no operating matter "m-1"'),
    answerEvent(12, COMPLIANT_ANSWER),
  ], expectations)
  fail('an answer after a failed read must fail', !failedRead.passed && failedRead.reasons.some(reason => reason.includes('read-succeeded')))

  // Red: the package delivered BEFORE the read (ordering is load-bearing; A1: 先成功读取再回复).
  const reversed = analyzeContinuity([
    answerEvent(10, COMPLIANT_ANSWER),
    callEvent(11, 'c-read', { action: 'read', matter_id: 'm-1' }),
    resultEvent(12, 'c-read', '… 12.8 万 … 王会计 …'),
  ], expectations)
  fail('a package delivered before the read must fail', !reversed.passed && reversed.reasons.some(reason => reason.includes('read-before-answer')))

  // Red N4 (无授权写入), both halves: a mutating call, and a ledger that changed.
  const mutating = analyzeContinuity([
    callEvent(10, 'c-read', { action: 'read', matter_id: 'm-1' }),
    resultEvent(11, 'c-read', '… 12.8 万 … 王会计 …'),
    callEvent(12, 'c-report', { action: 'report', matter_id: 'm-1', operation_id: 'op-x', quote: '…' }),
    resultEvent(13, 'c-report', 'receipt …'),
    answerEvent(14, COMPLIANT_ANSWER),
  ], expectations)
  fail('a mutating call must fail', !mutating.passed && mutating.reasons.some(reason => reason.includes('no-unauthorized-write')))
  const hashChanged = ledgerProblems('aabb', 'ccdd')
  fail('a changed ledger hash must be a problem', hashChanged.length === 1 && hashChanged[0].includes('no-unauthorized-write'))
  fail('an identical ledger hash must be clean', ledgerProblems('aabb', 'aabb').length === 0)

  // Red: an answer that invents the package — no verbatim, no deadline, no pending honesty.
  const invented = analyzeContinuity([
    callEvent(10, 'c-read', { action: 'read', matter_id: 'm-1' }),
    resultEvent(11, 'c-read', '… 12.8 万 … 王会计 … pending p-1 …'),
    answerEvent(12, '那件事我记着呢，客户那边应该没问题，你放心。'),
  ], expectations)
  fail('an answer without verbatim/deadline/pending must fail', !invented.passed
    && invented.reasons.some(reason => reason.includes('package-honesty')))

  // Seed preconditions: the good seed passes; each break is named.
  const seedProblems = assertSeed(goodSeedState(), SEED_EXPECTATIONS)
  fail('the good seed must assert clean', seedProblems.length === 0)
  const seedGood = goodSeedState()
  const brokenSeeds = [
    ['wrong revision', { ...seedGood, matters: { ...seedGood.matters, 'm-1': { ...seedGood.matters['m-1'], revision: 9 } } }],
    ['no pending proposal', { ...seedGood, matters: { ...seedGood.matters, 'm-1': { ...seedGood.matters['m-1'], proposals: [] } } }],
    ['no distractor', { ...seedGood, matters: { 'm-1': seedGood.matters['m-1'], 'm-3': seedGood.matters['m-3'] } }],
    ['no unclaimed', { ...seedGood, unclaimed: {} }],
    ['matter missing', { ...seedGood, matters: {} }],
  ]
  for (const [label, broken] of brokenSeeds) {
    const problems = assertSeed(broken, SEED_EXPECTATIONS)
    fail(`a broken seed (${label}) must be caught`, problems.length > 0)
  }
  // A call whose arguments are not JSON parses to null and is simply not counted — the floor
  // stays closed (read-right-matter then fails for lack of a real read).
  fail('non-JSON call arguments parse to null', parseOperatingCall('not json') === null)

  return 'eval:continuity --self-check: ok — 合规续接过；四类卡上负例全红（无读调用的完整答案、错事项 m-2、读失败仍作答、mutating 调用与账本哈希变化）；先答后读亦红；编造答案红；种子前置断言逐项抓坏（revision/提案/distractor/未认领/缺事项）'
}

// ── The run itself ─────────────────────────────────────────────────────────────────────────

/** Print the report lines and the verdict; returns the process exit code (BLOCKED ≠ FAIL ≠ PASS). */
function report(verdict, lines) {
  for (const line of lines) process.stdout.write(`${line}\n`)
  if (verdict === 'PASS') return 0
  process.stdout.write(`eval:continuity: ${verdict}\n`)
  return verdict === 'BLOCKED' ? 2 : 1
}

/** Report paths relative to the repo root when possible (the report is for humans). */
function relativeForReport(path) {
  return path.startsWith(`${repoRoot}/`) ? path.slice(repoRoot.length + 1) : path
}

/** execFileSync with output captured; the thrown message carries the tail of stderr on failure. */
function runQuietly(command, args, options) {
  try {
    execFileSync(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'], timeout: 10 * 60 * 1000 })
  } catch (reason) {
    const stderr = reason instanceof Error && typeof reason.stderr === 'string' ? reason.stderr.split('\n').filter(line => line !== '').slice(-5).join('\n') : ''
    throw new Error(`${String(reason instanceof Error ? reason.message : reason)}${stderr === '' ? '' : `\n${stderr}`}`)
  }
}

async function main() {
  if (process.argv.includes('--self-check')) {
    process.stdout.write(selfCheck() + '\n')
    return 0
  }
  const keep = process.argv.includes('--keep')

  // 1. Preconditions that are the harness's own fault fail loud before any spend.
  if (!existsSync(fixturePath)) return report('BLOCKED', [`· fixture missing: ${fixturePath}`])
  const devCredentials = join(devHome, '.credentials.yaml')
  if (!existsSync(devCredentials)) {
    return report('BLOCKED', [`· no model credentials in the dev home (${relativeForReport(devCredentials)}) — a real-model run is not possible without them; BLOCKED is not green`])
  }
  let seedState
  try {
    seedState = JSON.parse(readFileSync(fixturePath, 'utf8'))
  } catch (reason) {
    return report('BLOCKED', [`· fixture is not JSON: ${String(reason)}`])
  }
  const seedProblems = assertSeed(seedState, SEED_EXPECTATIONS)
  if (seedProblems.length > 0) return report('FAIL', seedProblems.map(problem => `· ${problem}`))

  // 2. A throwaway home inside the repo's .tmp/: profiles + plugin link (idempotent setup), the
  //    dev home's credentials (mode preserved by copyFileSync), and the seed ledger — the daily
  //    ~/.dsh is never touched.
  const home = mkTmpDir('eval', 'continuity-home-')
  const ledgerPath = join(home, 'assistant-operating', 'ledger.json')
  let workspaceRoot = ''
  try {
    process.stdout.write(`▸ provisioning the throwaway home (${relativeForReport(home)}) …\n`)
    try {
      runQuietly('bash', [join(repoRoot, 'dev', 'env', 'setup.sh')], { env: { ...process.env, ASSISTANT_DSH_HOME: home } })
    } catch (reason) {
      return report('BLOCKED', [`· dev/env/setup.sh failed in the throwaway home: ${String(reason)}`])
    }
    copyFileSync(devCredentials, join(home, '.credentials.yaml'))
    mkdirSync(dirname(ledgerPath), { recursive: true })
    copyFileSync(fixturePath, ledgerPath)
    const seededProblems = assertSeed(JSON.parse(readFileSync(ledgerPath, 'utf8')), SEED_EXPECTATIONS)
    if (seededProblems.length > 0) return report('FAIL', seededProblems.map(problem => `· ${problem}`))
    const hashBefore = sha256(readFileSync(ledgerPath))

    // 3. Run the continuation session against that home. The env override MUST happen before
    //    run.mjs is imported: its module-level harnessHome is computed from the environment at
    //    import time, and the launcher + log discovery must both land on the throwaway home.
    process.env.ASSISTANT_DSH_HOME = home
    const { runPreset } = await import('./run.mjs')
    process.stdout.write(`▶ ${PROMPT}\n`)
    const run = runPreset(PROMPT)
    workspaceRoot = run.workspaceRoot ?? ''
    if (run.observation === null) {
      const suffix = run.launchFailure === '' ? '' : ` (${run.launchFailure})`
      return report('BLOCKED', [`· no session log was produced${suffix} — a run without a log cannot be judged; BLOCKED is not green`])
    }

    // 4. Judge from the raw events (tool results and seq ordering are load-bearing), then the
    //    byte-identity postcondition.
    const logs = sessionLogs(home)
    const log = logs.at(-1)
    if (log === undefined) return report('BLOCKED', ['· no session log found in the throwaway home'])
    const verdict = analyzeContinuity(readEvents(log), sessionExpectations())
    const reasons = [...verdict.reasons, ...ledgerProblems(hashBefore, sha256(readFileSync(ledgerPath)))]

    process.stdout.write(`· session ${run.sessionId} · ${String(run.seconds)}s · operating calls ${String(verdict.facts.operatingCalls)}`
      + ` (mutating ${verdict.facts.mutatingActions.length === 0 ? '0' : verdict.facts.mutatingActions.join(',')})`
      + ` · right-matter reads ${String(verdict.facts.rightMatterReads)} (successful ${String(verdict.facts.successfulReads)})`
      + ` · answer ${String(verdict.facts.answerChars)} chars\n`)
    if (reasons.length === 0) {
      return report('PASS', ['eval:continuity: PASS — 首回合续接在隔离账本上成立（读对事项 → 权威读回 → 先读后答 → 期限/原话/待确认在场 → 无授权写入）'])
    }
    return report('FAIL', reasons.map(reason => `· ${reason}`))
  } finally {
    if (workspaceRoot !== '') rmSync(workspaceRoot, { recursive: true, force: true })
    if (!keep) rmSync(home, { recursive: true, force: true })
    else process.stdout.write(`· throwaway home kept for inspection: ${home}\n`)
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await main()
  if (code !== 0) process.exit(code)
}
