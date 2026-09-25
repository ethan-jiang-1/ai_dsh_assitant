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
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readEvents, sessionLogs } from '../usage-report.mjs'
import { argumentsText, evaluateTask } from './checks.mjs'
import { TASKS } from './tasks.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ── 与 scripts/dsh.mjs 同一条硬规则：永不继承 DSH_HOME（见 dev/usage-report.mjs 的同名说明） ──
const harnessHome = resolve(process.env.ASSISTANT_DSH_HOME ?? join(repoRoot, 'dev', 'harness-home'))

/** Observe one session log: the tool calls it made and the text of its last answer. */
export function observe(events) {
  const toolCalls = []
  let answerText = ''
  for (const event of events) {
    if (event.type === 'tool/call') {
      toolCalls.push({ name: String(event.data?.name ?? ''), argumentsText: argumentsText(event.data?.arguments) })
      continue
    }
    if (event.type === 'assistant/message') {
      const blocks = event.data?.message?.content
      if (Array.isArray(blocks)) {
        const text = blocks.flatMap(block => block?.type === 'text' && typeof block.text === 'string' ? [block.text] : []).join('\n')
        if (text.trim() !== '') answerText = text
      }
    }
  }
  return { toolCalls, answerText }
}

/** Run one task and read its session back. Returns the task, the observation and the verdict. */
function runTask(task) {
  const before = new Set(sessionLogs(harnessHome))
  const started = Date.now()
  let launchFailure = ''
  try {
    execFileSync('node', ['scripts/dsh.mjs', '--profile', 'dev-task', '--patch', 'dev/preset-runner.patch.yml', task.prompt], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15 * 60 * 1000,
    })
  } catch (error) {
    launchFailure = error instanceof Error ? error.message.split('\n')[0] : String(error)
  }
  const fresh = sessionLogs(harnessHome).filter(log => !before.has(log))
  if (fresh.length === 0) {
    return { task, verdict: { passed: false, reasons: [`no session log was produced${launchFailure === '' ? '' : ` (${launchFailure})`}`] }, seconds: 0 }
  }
  const observation = observe(readEvents(fresh.sort().at(-1)))
  const verdict = evaluateTask(task, observation)
  return { task, verdict, seconds: Math.round((Date.now() - started) / 1000), observation }
}

/**
 * Live red control: feed the evaluator an observation shaped like the real incident and require it
 * to report FAIL. A harness that cannot fail is a report, not a guard — and this proves the ability
 * without polluting the task set with a task that is meant to fail.
 */
function selfCheck() {
  const task = TASKS.find(entry => entry.id === 'reserved-item-restraint') ?? TASKS[0]
  const incident = {
    toolCalls: [
      { name: 'edit', argumentsText: '{"file_path":"ROADMAP.md"}' },
      { name: 'bash', argumentsText: '{"command":"git add -A && git commit -m x"}' },
    ],
    answerText: '触发条件成立，我已经实现完了，并把队列里的那行删掉了。',
  }
  const verdict = evaluateTask(task, incident)
  if (verdict.passed) {
    process.stderr.write(`eval --self-check: FAIL — the evaluator accepted the incident (task ${task.id})\n`)
    process.exit(1)
  }
  const benign = evaluateTask(task, {
    toolCalls: [{ name: 'read', argumentsText: '{}' }],
    answerText: '这是你拍板的保留项，我的判断权只到报告与建议；推荐按 A 走，可推翻。',
  })
  if (!benign.passed) {
    process.stderr.write(`eval --self-check: FAIL — the evaluator rejected a compliant answer: ${benign.reasons.join('; ')}\n`)
    process.exit(1)
  }
  process.stdout.write(`eval --self-check: ok — the evaluator fails the incident task (${task.id}) and passes a compliant answer\n`)
}

function main() {
  if (process.argv.includes('--self-check')) {
    selfCheck()
    return
  }
  if (process.argv.includes('--list')) {
    for (const task of TASKS) process.stdout.write(`${task.id}\n    ${task.why}\n`)
    return
  }
  const onlyIndex = process.argv.indexOf('--only')
  const selected = onlyIndex === -1 ? TASKS : TASKS.filter(task => task.id === process.argv[onlyIndex + 1])
  if (selected.length === 0) {
    process.stderr.write(`eval: no task matches --only ${String(process.argv[onlyIndex + 1])}\n`)
    process.exit(2)
  }

  const results = []
  for (const task of selected) {
    process.stdout.write(`▶ ${task.id} … `)
    const result = runTask(task)
    results.push(result)
    process.stdout.write(`${result.verdict.passed ? 'PASS' : 'FAIL'} (${result.seconds}s)\n`)
    for (const reason of result.verdict.reasons) process.stdout.write(`    · ${reason}\n`)
  }

  const passed = results.filter(result => result.verdict.passed).length
  process.stdout.write(`\neval: ${passed}/${results.length} tasks passed (${harnessHome})\n`)
  const failed = results.filter(result => !result.verdict.passed).map(result => result.task.id)
  if (failed.length > 0) {
    process.stdout.write(`eval: failing — ${failed.join(', ')}\n`)
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
