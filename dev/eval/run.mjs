#!/usr/bin/env node
/**
 * `pnpm eval` — run the behavioural task set through real preset sessions and score them.
 *
 * Why it exists: the first lap's baseline was hand-read by me. Hand-read evidence cannot be
 * re-derived by someone else, so a regression like the reserved-item incident would only be caught
 * if a human happened to look. This harness turns those readings into a repeatable verdict.
 *
 * Discipline: tasks run **sequentially** (same repository, same dev home — concurrent sessions pollute
 * each other's commits and replay each other's home), each through the real preset composition, and
 * every verdict is derived from the session log, not from stdout.
 *
 * Usage:
 *   pnpm eval                 # all tasks
 *   pnpm eval -- --only scope-honesty
 *   pnpm eval -- --list       # print the task set
 *
 * @module dev/eval/run
 */
import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir, tmpDir } from '../env/tmp.mjs'
import { readEvents, sessionLogs } from '../reports/usage-report.mjs'
import { argumentsText, evaluateTask, fileShape, wrotePath } from './checks.mjs'
import { TASKS } from './tasks.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ── 与 dev/env/dsh.mjs 同一条硬规则：永不继承 DSH_HOME（见 dev/reports/usage-report.mjs 的同名说明） ──
// BUG-012（2026-10-15）：这个 home 由 main() 在每次评测 run 时供给——默认是一次性 home，显式
// `ASSISTANT_DSH_HOME` 才落到既有 home。默认落 dev home 时，任务会话读的是真实工作文件夹里的
// 真实事项/记忆/交付物，判据采样到的是被污染的行为（breakdown 当场读了真实经营账本）。
let harnessHome = resolve(process.env.ASSISTANT_DSH_HOME ?? join(repoRoot, 'dev', 'harness-home'))

/**
 * Observe one session log: the tool calls it made and the full text the model said to the user.
 *
 * All assistant text blocks are concatenated in order — NOT just the last message. The last-message
 * read lost the substance on present-turns (measured 2026-10-02, domain batch Q30): the model
 * delivers the answer in a text block, then calls `present`, then closes with a short pointer
 * ("file attached above") — the pointer overwrote the answer, leaving the scoring sheet with 27
 * chars. Reasoning blocks are type `reasoning` and are excluded; single-answer sessions are
 * unchanged (one text block, same output as before).
 */
export function observe(events) {
  const toolCalls = []
  const answerParts = []
  for (const event of events) {
    if (event.type === 'tool/call') {
      toolCalls.push({ name: String(event.data?.name ?? ''), argumentsText: argumentsText(event.data?.arguments) })
      continue
    }
    if (event.type === 'assistant/message') {
      const blocks = event.data?.message?.content
      if (Array.isArray(blocks)) {
        for (const block of blocks) {
          if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
            answerParts.push(block.text)
          }
        }
      }
    }
  }
  return { toolCalls, answerText: answerParts.join('\n\n') }
}

/**
 * Split the selected tasks by whether this runner can host their capability.
 *
 * This runner drives headless one-shot sessions, so `requires: 'web'` tasks cannot be scored here
 * (see the task-set header). They leave the pass/fail arithmetic entirely: counting an unevaluated
 * task as passed is how a false green gets recorded, and counting it as failed blames the model for
 * a harness gap.
 * @param tasks - the selected task objects.
 * @returns `{ evaluable, skipped }`, each keeping the input order.
 */
export function partitionTasks(tasks) {
  return {
    evaluable: tasks.filter(task => task.requires === undefined),
    skipped: tasks.filter(task => task.requires === 'web'),
  }
}

/** Run one task and read its session back. Returns the task, the observation and the verdict. */
/**
 * Run one prompt through a preset-mounted session and read the session back.
 *
 * Exported because the domain question set (`dev/eval/domain-run.mjs`) needs exactly this and nothing
 * else: one home for "how a preset session is launched and observed". The eval's own tasks add their
 * mechanical verdict on top; a domain run adds a human scoring sheet instead.
 * @param prompt - the text to send as the session's task.
 * @returns `{ sessionId, observation, seconds, launchFailure }`; `observation` is null when no log appeared.
 */
export function runPreset(prompt) {
  const before = new Set(sessionLogs(harnessHome))
  const started = Date.now()
  // `file-shape` uses this to reject a stale file: a leftover from an earlier session must not go green.
  const startedAt = started
  let launchFailure = ''
  // Eval measures the product, not this repo's AGENTS.md. The launcher pins the session
  // workspace to the repo root (right for dev sessions — they work ON this repo), which leaks
  // the repo's own standing instructions into the session and competes with the assistant
  // persona (measured, BUG-003 2026-10-07: the cold-start intake session wandered into repo
  // exploration and never loaded the opener skill). Every task therefore gets its own
  // throwaway workspace cwd via the launcher's explicit exit, like a real first conversation.
  const workspace = mkTmpDir('eval', 'workspace-')
  try {
    execFileSync('node', [
      join(repoRoot, 'dev/env/dsh.mjs'),
      '--profile', 'dev-task',
      '--patch', join(repoRoot, 'dev/probes/session/preset-runner.patch.yml'),
      prompt,
    ], {
      cwd: repoRoot,
      env: { ...process.env, ASSISTANT_DSH_HOME: harnessHome, ASSISTANT_SESSION_CWD: workspace },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15 * 60 * 1000,
    })
  } catch (error) {
    launchFailure = error instanceof Error ? error.message.split('\n')[0] : String(error)
  }
  // The workspace survives until the caller has judged against its files (file-shape reads
  // `.desk/state.json` in there) — runTask and the domain runner clean it up after evaluation.
  const fresh = sessionLogs(harnessHome).filter(log => !before.has(log)).sort()
  const log = fresh.at(-1)
  if (log === undefined) {
    return { sessionId: '', observation: null, seconds: 0, launchFailure, workspaceRoot: workspace }
  }
  return {
    sessionId: (/(?:^|\/)session-([0-9a-f-]+)(?:\/|$)/.exec(log)?.[1] ?? '').slice(0, 8),
    observation: { ...observe(readEvents(log)), startedAt, workspaceRoot: workspace },
    seconds: Math.round((Date.now() - started) / 1000),
    launchFailure,
    workspaceRoot: workspace,
  }
}

function runTask(task) {
  const run = runPreset(task.prompt)
  try {
    if (run.observation === null) {
      const suffix = run.launchFailure === '' ? '' : ` (${run.launchFailure})`
      return { task, verdict: { passed: false, reasons: [`no session log was produced${suffix}`] }, seconds: 0 }
    }
    const verdict = evaluateTask(task, run.observation)
    return { task, verdict, seconds: run.seconds, observation: run.observation }
  } finally {
    rmSync(run.workspaceRoot, { recursive: true, force: true })
  }
}

/**
 * Live red control: feed the evaluator an observation shaped like the real incident and require it
 * to report FAIL. A harness that cannot fail is a report, not a guard — and this proves the ability
 * without polluting the task set with a task that is meant to fail.
 */
function selfCheck() {
  // Pinned by id, not array position: the suite order changes (first-open-intake must run first),
  // and this incident is shaped for scope-honesty's checks.
  const task = TASKS.find(candidate => candidate.id === 'scope-honesty')
  // Failure shape matched to scope-honesty's checks: its correct answer is
  // "I cannot see it" — a lying "all clean" answer with no tools must FAIL.
  const incident = {
    toolCalls: [],
    answerText: '会看出来，仓库是干净的，所有改动都没问题。',
  }
  const verdict = evaluateTask(task, incident)
  if (verdict.passed) {
    process.stderr.write(`eval --self-check: FAIL — the evaluator accepted the incident (task ${task.id})\n`)
    process.exit(1)
  }
  const benign = evaluateTask(task, {
    toolCalls: [{ name: 'read', argumentsText: '{}' }],
    answerText: '我看不见仓库里的未提交改动——curate 只覆盖工作文件夹，别处的它看不到。',
  })
  if (!benign.passed) {
    process.stderr.write(`eval --self-check: FAIL — the evaluator rejected a compliant answer: ${benign.reasons.join('; ')}\n`)
    process.exit(1)
  }
  // file-shape 的红绿对照：一个缺契约字段的文件必须被判负，一个带 generatedAt 的必须过。
  // 不这么验，"形状检查"可能只是一句永远成立的装饰（2026-09-27）。
  const scratch = join(tmpDir('eval'), `dsh-eval-shape-${String(process.pid)}.json`)
  writeFileSync(scratch, JSON.stringify({ hello: 'world' }))
  const shapeless = fileShape(scratch, ['generatedAt'])
  writeFileSync(scratch, JSON.stringify({ generatedAt: new Date().toISOString() }))
  const shaped = fileShape(scratch, ['generatedAt'])
  unlinkSync(scratch)
  if (shapeless.ok) {
    process.stderr.write('eval --self-check: FAIL — file-shape accepted a file without the contract key\n')
    process.exit(1)
  }
  if (!shaped.ok) {
    process.stderr.write(`eval --self-check: FAIL — file-shape rejected a valid desk file: ${shaped.reason}\n`)
    process.exit(1)
  }
  const shapeVerdict = evaluateTask({ checks: [{ kind: 'file-shape', path: '/nonexistent/desk.json', required: ['generatedAt'] }] }, { toolCalls: [], answerText: '' })
  if (shapeVerdict.passed) {
    process.stderr.write('eval --self-check: FAIL — file-shape passed an unreadable path\n')
    process.exit(1)
  }
  // anyOf: a file with only the header renders as an empty desk — the case the guard exists for.
  writeFileSync(scratch, JSON.stringify({ generatedAt: new Date().toISOString() }))
  const headerOnly = fileShape(scratch, ['generatedAt'], { anyOf: ['counts', 'decisions'] })
  if (headerOnly.ok) {
    process.stderr.write('eval --self-check: FAIL — file-shape accepted a header-only file (no section)\n')
    process.exit(1)
  }
  // since: a file older than the run is a leftover, not a rewrite.
  const stale = fileShape(scratch, [], { since: Date.now() + 60_000 })
  if (stale.ok) {
    process.stderr.write('eval --self-check: FAIL — file-shape accepted a file older than the run\n')
    process.exit(1)
  }
  // observe 的 present 轮红绿对照（2026-10-02，领域批 Q30 实证）：答案块在前、present 之后的
  // 短指针在后——只取最后一条会把实体答案整个丢掉（27 字指针覆盖 1809 字答案）。
  const presentTurnEvents = [
    { type: 'assistant/message', data: { message: { content: [
      { type: 'reasoning', text: '内部推理不该进答案' },
      { type: 'text', text: '草稿写好了：B 版全文……' },
    ] } } },
    { type: 'tool/call', data: { name: 'present', arguments: { files: [] } } },
    { type: 'assistant/message', data: { message: { content: [
      { type: 'text', text: '文件已挂到交付室（上方预览）。' },
    ] } } },
  ]
  const observed = observe(presentTurnEvents)
  if (!observed.answerText.includes('B 版全文') || !observed.answerText.includes('文件已挂到交付室')) {
    process.stderr.write('eval --self-check: FAIL — observe dropped the substantive answer on a present-turn\n')
    process.exit(1)
  }
  if (observed.answerText.includes('内部推理')) {
    process.stderr.write('eval --self-check: FAIL — observe leaked a reasoning block into the answer\n')
    process.exit(1)
  }
  const single = observe([{ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '唯一答案' }] } } }])
  if (single.answerText !== '唯一答案') {
    process.stderr.write('eval --self-check: FAIL — observe changed the single-answer shape\n')
    process.exit(1)
  }

  // wrote-path 的 python 写法红绿（BUG-001 第二根因）：desk-refresh 技能教的是 bash+python
  // 重写 .desk/state.json，判定核必须认得 json.dump / open('w')，而不是只认 JS/shell 写法。
  const pythonWrite = [{ name: 'bash', argumentsText: "cd /x && python3 - <<'PY'\nimport json\njson.dump(s, open('.desk/state.json','w'))\nPY" }]
  if (!wrotePath(pythonWrite, '.desk/state.json')) {
    process.stderr.write('eval --self-check: FAIL — wrote-path missed a python rewrite of the desk file\n')
    process.exit(1)
  }
  if (wrotePath([{ name: 'bash', argumentsText: "cat .desk/state.json" }], '.desk/state.json')) {
    process.stderr.write('eval --self-check: FAIL — wrote-path accepted a read-only command\n')
    process.exit(1)
  }
  // The capability partition (BUG-008): a web-only task must leave the pass/fail arithmetic — the
  // failure mode this pins is a task counted as passed (or failed) where nothing was evaluated.
  const partition = partitionTasks([
    { id: 'a' },
    { id: 'web-only', requires: 'web' },
    { id: 'b' },
  ])
  if (partition.evaluable.map(task => task.id).join(',') !== 'a,b') {
    process.stderr.write(`eval --self-check: FAIL — partitionTasks kept a web-only task in the evaluable set: ${partition.evaluable.map(task => task.id).join(',')}\n`)
    process.exit(1)
  }
  if (partition.skipped.map(task => task.id).join(',') !== 'web-only') {
    process.stderr.write('eval --self-check: FAIL — partitionTasks did not single out the web-only task\n')
    process.exit(1)
  }
  const realSkip = partitionTasks(TASKS).skipped.map(task => task.id)
  if (!realSkip.includes('desk-daily-brief')) {
    process.stderr.write('eval --self-check: FAIL — desk-daily-brief no longer declares requires: web (it cannot be scored headless)\n')
    process.exit(1)
  }
  process.stdout.write(`eval --self-check: ok — the evaluator fails the incident task (${task.id}) and passes a compliant answer;`
    + ' file-shape fails a shapeless file, a header-only file, a stale file and an unreadable path, and passes a shaped one;'
    + ' observe keeps the substantive answer on a present-turn, excludes reasoning, and is unchanged for single answers;'
    + ' the capability partition leaves web-only tasks out of the pass/fail arithmetic\n')
}

/**
 * Provision the DSH home this run's sessions run against.
 *
 * Default is a throwaway home under `.tmp/eval/home-*` (per-run, kept for post-mortem until the
 * `.tmp` sweep): `dev/env/setup.sh` builds the profiles there, and the dev home's credential store
 * is copied in (mode 0600 — BUG-001's lesson) so the model transport resolves. An explicit
 * `ASSISTANT_DSH_HOME` stays the exit for runs that deliberately target a prepared home; it is
 * used as-is, with no provisioning and no credential copy.
 * @returns the home directory this run's sessions must use.
 */
function provisionRunHome() {
  const explicit = process.env.ASSISTANT_DSH_HOME
  if (explicit !== undefined && explicit !== '') return resolve(explicit)
  const runHome = mkTmpDir('eval', 'home-')
  const credentials = join(repoRoot, 'dev', 'harness-home', '.credentials.yaml')
  if (!existsSync(credentials)) {
    process.stderr.write('eval: no credential store at dev/harness-home/.credentials.yaml to provision the throwaway home — prepare the dev home once, or set ASSISTANT_DSH_HOME to a prepared home\n')
    process.exit(2)
  }
  try {
    execFileSync('bash', [join(repoRoot, 'dev', 'env', 'setup.sh')], {
      cwd: repoRoot,
      env: { ...process.env, ASSISTANT_DSH_HOME: runHome },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message.split('\n').slice(0, 4).join('\n') : String(error)
    process.stderr.write(`eval: provisioning the throwaway home failed — ${detail}\n`)
    process.exit(2)
  }
  copyFileSync(credentials, join(runHome, '.credentials.yaml'))
  chmodSync(join(runHome, '.credentials.yaml'), 0o600)
  return runHome
}

function main() {
  if (process.argv.includes('--self-check')) {
    selfCheck()
    return
  }
  if (process.argv.includes('--list')) {
    for (const task of TASKS) {
      const needs = task.requires === undefined ? '' : `  [needs ${String(task.requires)} — not evaluated by this runner]`
      process.stdout.write(`${task.id}${needs}\n    ${task.why}\n`)
    }
    return
  }
  const onlyIndex = process.argv.indexOf('--only')
  const selected = onlyIndex === -1 ? TASKS : TASKS.filter(task => task.id === process.argv[onlyIndex + 1])
  if (selected.length === 0) {
    process.stderr.write(`eval: no task matches --only ${String(process.argv[onlyIndex + 1])}\n`)
    process.exit(2)
  }

  const { evaluable, skipped } = partitionTasks(selected)
  const explicitHome = process.env.ASSISTANT_DSH_HOME !== undefined && process.env.ASSISTANT_DSH_HOME !== ''
  harnessHome = provisionRunHome()
  process.stdout.write(`eval: home ${harnessHome}${explicitHome ? ' (explicit ASSISTANT_DSH_HOME)\n' : ' (throwaway, provisioned this run; post-mortem until the .tmp sweep)\n'}`)
  for (const task of skipped) {
    process.stdout.write(`▶ ${task.id} … NOT EVALUATED\n`)
    process.stdout.write(`    · needs the web composition (requires: ${String(task.requires)}) — this runner drives headless one-shot sessions, where that capability never registers\n`)
  }

  const results = []
  for (const task of evaluable) {
    process.stdout.write(`▶ ${task.id} … `)
    const result = runTask(task)
    results.push(result)
    process.stdout.write(`${result.verdict.passed ? 'PASS' : 'FAIL'} (${result.seconds}s)\n`)
    for (const reason of result.verdict.reasons) process.stdout.write(`    · ${reason}\n`)
  }

  const passed = results.filter(result => result.verdict.passed).length
  const skipNote = skipped.length === 0 ? '' : ` · ${String(skipped.length)} not evaluated (web-only)`
  process.stdout.write(`\neval: ${passed}/${results.length} tasks passed${skipNote} (${harnessHome})\n`)
  if (skipped.length > 0) {
    process.stdout.write(`eval: not evaluated here — ${skipped.map(task => task.id).join(', ')} (needs the web composition; a web-session driver is the upgrade path)\n`)
  }
  const failed = results.filter(result => !result.verdict.passed).map(result => result.task.id)
  if (failed.length > 0) {
    process.stdout.write(`eval: failing — ${failed.join(', ')}\n`)
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
