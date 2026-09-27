#!/usr/bin/env node
/**
 * `pnpm eval:domain` —— 把**你的真实经营问题**逐题跑一遍，产出一份给人打分的报告（评测集 v0 / G2 关口）。
 *
 * 为什么存在：`pnpm eval`（`dev/eval/tasks.mjs`）守的是**机械地板**——技能有没有按名加载、文件有没有真写、
 * 该不该动保留项。它不判质量，也判不了"这个答案对公司对不对"。领域评测集补的正是这一层，而它的题目
 * 只能由本人出（真实经营问题、答案对不对他一眼知道）。本工具把这批题的**执行与材料整理**机械化：
 * 逐题跑一次真实 preset 会话，把答案原文与机器观测（查了哪些房间、加载了哪些技能、耗时、会话 id）
 * 落成一份打分表，质量交给人按固定规则打——**先定判据，免得事后争**。
 *
 * 题目格式与评分规则：`dev/eval/domain/TEMPLATE.md`（格式 owner）。填题副本默认
 * `dev/eval/domain/questions.local.md`，**已被 .gitignore 排除**（真实经营问题不该进 Git）。
 *
 * 用法：
 *   pnpm eval:domain                                   # 用默认题目文件
 *   pnpm eval:domain -- --file <path>                  # 指定题目文件
 *   pnpm eval:domain -- --only Q3                       # 只跑一题
 *   pnpm eval:domain -- --limit 5                       # 先跑前 5 题（分批跑，一题约 1–3 分钟）
 *   pnpm eval:domain -- --out <path>                    # 打分表落哪（默认与题目同目录、带时间戳）
 *   pnpm eval:domain -- --self-check                    # 只验解析器（合成题目 → 已知结果）
 *
 * @module dev/eval/domain-run
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPreset } from './run.mjs'


const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const domainDir = join(repoRoot, 'dev', 'eval', 'domain')
const defaultQuestions = join(domainDir, 'questions.local.md')
// 与 scripts/dsh.mjs 同一条硬规则：dev 工具**永不继承 DSH_HOME**（见 dev/usage-report.mjs 的同名说明）。
// 这里只用它来在打分表头上写清"跑的是哪个 home"。
const harnessHome = resolve(process.env.ASSISTANT_DSH_HOME ?? join(repoRoot, 'dev', 'harness-home'))

/** 家的四房间工具：用来回答"这一轮它有没有问过自己的房间"。 */
const HOME_TOOLS = new Set(['assistant_memory', 'assistant_knowledge', 'assistant_research', 'assistant_reflect'])

/**
 * 解析题目文件。
 *
 * 格式（人写的 markdown，见 TEMPLATE）：`## <id> · <标题>` 开一条题，其后 `- <键>：<值>` 是字段。
 * 值可以续行（缩进的行接到上一个字段上），这样长句不必挤成一行。**不猜语义**：认不出键就原样留着，
 * 打分表里照样印出来给人看。
 * @param text - 题目文件的全文。
 * @returns `{ id, title, ask, expect, refuse, rubric, extra }[]`；`ask` 为空视为无效题。
 */
export function parseQuestions(text) {
  const questions = []
  let current
  let lastKey
  const pushField = (key, value) => {
    if (current === undefined) return
    if (key === '问法') current.ask = value
    else if (key === '期望') current.expect = value
    else if (key === '该拒答') current.refuse = /^是/u.test(value.trim())
    else if (key === '评分要点') current.rubric = value
    else current.extra.push([key, value])
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd()
    const heading = /^##\s+(.+?)\s*$/u.exec(line)
    if (heading !== null) {
      if (current !== undefined) questions.push(current)
      const body = heading[1]
      const split = body.split('·')
      current = {
        id: (split[0] ?? '').trim() || `Q${String(questions.length + 1)}`,
        title: (split.slice(1).join('·') ?? '').trim(),
        ask: '', expect: '', refuse: false, rubric: '', extra: [],
      }
      lastKey = undefined
      continue
    }
    const field = /^-\s*([^：:]{1,12})[：:]\s*(.*)$/u.exec(line)
    if (field !== null && current !== undefined) {
      lastKey = field[1].trim()
      pushField(lastKey, field[2].trim())
      continue
    }
    // 续行：接到上一个字段上（只在缩进或非空、且不是新字段时）
    if (current !== undefined && lastKey !== undefined && line.trim() !== '' && /^\s/u.test(rawLine)) {
      pushField(lastKey, `${String(current.ask)} ${line.trim()}`.trim())
    }
  }
  if (current !== undefined) questions.push(current)
  return questions.filter(question => question.ask.trim() !== '')
}

/**
 * One question's run under the transient-failure retry policy.
 *
 * Measured 2026-09-27: a question's launch can die to a transient model-side failure the harness
 * retry set does not cover — MALFORMED_RESPONSE (invalid tool-input JSON) is not among
 * EMPTY_RESPONSE/RATE_LIMIT/SERVER/TIMEOUT/TRANSPORT, so one malformed chunk kills the whole
 * question on first occurrence (real incident: Q2's first smoke run; the retry succeeded).
 * One automatic retry; `retriedAfter` carries the first failure into the sheet so both attempts
 * stay on the record.
 * @param ask - the question text.
 * @param launch - the launcher to retry (injected so the policy is fixtureable).
 * @returns the last run plus `retriedAfter` ('' when the first attempt succeeded).
 */
export function runQuestionWithRetry(ask, launch) {
  const first = launch(ask)
  if (first.launchFailure === '') return { ...first, retriedAfter: '' }
  const second = launch(ask)
  return { ...second, retriedAfter: first.launchFailure }
}

/** 把一次运行的观测压成打分表里的"机器观测"块。 */
function observationsOf(run) {
  const tools = run.observation?.toolCalls ?? []
  const rooms = [...new Set(tools.filter(call => HOME_TOOLS.has(call.name)).map(call => call.name.replace('assistant_', '')))]
  const skills = [...new Set(tools
    .filter(call => call.name === 'skill')
    .map(call => /"name"\s*:\s*"([^"]+)"/.exec(call.argumentsText)?.[1] ?? '')
    .filter(name => name !== ''))]
  return {
    rooms,
    skills,
    toolCount: tools.length,
    answerChars: (run.observation?.answerText ?? '').length,
    seconds: run.seconds,
    sessionId: run.sessionId,
    launchFailure: run.launchFailure,
    retriedAfter: run.retriedAfter ?? '',
  }
}

/** 渲染打分表（人读的 markdown）。 */
export function renderSheet(questions, runs, { title, home }) {
  const lines = []
  lines.push(`# 领域评测集打分表 — ${title}`)
  lines.push('')
  lines.push(`题目 ${questions.length} 条｜跑于 ${new Date().toISOString().replace('T', ' ').slice(0, 16)}｜dev home：${home}`)
  lines.push('')
  lines.push('**评分规则**（先定死，免得事后争）：事实正确 0/1/2 · 依据在场 0/1/2 · 该拒答就拒答（是/否/不适用）·'
    + ' 可用性 0/1/2。**G2 判据**：事实正确 ≥1 的比例 ≥90%、0 分题 ≤2 道、`该拒答：是` 的题全部拒答。')
  lines.push('')
  lines.push('机器只填"观测"那一栏（查了哪些房间、加载了哪些技能、耗时）——**质量由你打**。')
  lines.push('')
  for (const [index, question] of questions.entries()) {
    const run = runs[index]
    const observed = run === undefined ? undefined : observationsOf(run)
    lines.push(`## ${question.id} · ${question.title === '' ? '（无标题）' : question.title}`)
    lines.push('')
    lines.push(`- **问法**：${question.ask}`)
    if (question.expect !== '') lines.push(`- **作者期望**：${question.expect}`)
    if (question.rubric !== '') lines.push(`- **评分要点**：${question.rubric}`)
    lines.push(`- **该拒答**：${question.refuse ? '是' : '否'}`)
    for (const [key, value] of question.extra) lines.push(`- **${key}**：${value}`)
    lines.push('')
    if (observed === undefined) {
      lines.push('> 没跑（`--only` / `--limit` 之外）。')
      lines.push('')
      continue
    }
    lines.push(`**机器观测**：会话 \`${observed.sessionId || '（无）'}\` · 耗时 ${observed.seconds}s · 工具 ${observed.toolCount} 次`
      + ` · 房间 ${observed.rooms.length === 0 ? '（一个都没问）' : observed.rooms.join('/')}`
      + ` · 技能 ${observed.skills.length === 0 ? '（没加载）' : observed.skills.join('/')}`
      + ` · 答案 ${observed.answerChars} 字`)
    if (observed.retriedAfter !== '') lines.push(`> 首跑启动失败（${observed.retriedAfter}），自动重跑后采用本次结果`)
    if (observed.launchFailure !== '') lines.push(`> 启动异常：${observed.launchFailure}`)
    lines.push('')
    lines.push('**答案原文**：')
    lines.push('')
    lines.push('```text')
    lines.push(run?.observation?.answerText ?? '（没有答案）')
    lines.push('```')
    lines.push('')
    lines.push('**打分**：事实正确 `__` · 依据在场 `__` · 该拒答就拒答 `__` · 可用性 `__` · 备注：')
    lines.push('')
  }
  return lines.join('\n') + '\n'
}

/** 解析器的自检：合成题目 → 已知结果（含续行与无效题）。 */
export function selfCheck() {
  const scratch = mkdtempSync(join(tmpdir(), 'dsh-domain-'))
  const file = join(scratch, 'questions.md')
  writeFileSync(file, [
    '# 合成题集',
    '',
    '## Q1 · 签单为什么慢',
    '',
    '- 问法：这个月签单为什么慢？',
    '  别泛泛而谈。',
    '- 期望：先给数字，再给可检验的假设。',
    '- 该拒答：否',
    '- 评分要点：① 数字可核 ② 假设可推翻',
    '',
    '## Q2 · 明年人力成本',
    '',
    '- 问法：按现在编制，明年人力成本多少？',
    '- 该拒答：是',
    '',
    '## 没有问法的题',
    '',
    '- 期望：这条应当被丢掉（缺 问法）。',
  ].join('\n'))
  const questions = parseQuestions(readFileSync(file, 'utf8'))
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(wanted)}`)
  }
  expect('question count (invalid dropped)', questions.length, 2)
  expect('id parsed', questions[0].id, 'Q1')
  expect('title parsed', questions[0].title, '签单为什么慢')
  expect('continuation line joins', questions[0].ask, '这个月签单为什么慢？ 别泛泛而谈。')
  expect('expect parsed', questions[0].expect, '先给数字，再给可检验的假设。')
  expect('rubric parsed', questions[0].rubric, '① 数字可核 ② 假设可推翻')
  expect('refuse false by default', questions[0].refuse, false)
  expect('refuse true when 是', questions[1].refuse, true)
  expect('missing ask dropped', questions.some(question => question.id.includes('没有问法')), false)

  // Retry policy (measured 2026-09-27): a launch can die to a transient model-side failure the
  // harness retry set does not cover (MALFORMED_RESPONSE — invalid tool-input JSON — kills the
  // question on first occurrence). One automatic retry, both attempts recorded.
  const failing = { sessionId: 's-fail', observation: { toolCalls: [], answerText: '' }, seconds: 10,
    launchFailure: 'MALFORMED_RESPONSE: tool input is invalid JSON' }
  const good = { sessionId: 's-ok', observation: { toolCalls: [{ name: 'assistant_memory', argumentsText: '{}' }],
    answerText: '答案' }, seconds: 159, launchFailure: '' }
  const launchSequence = sequence => () => {
    const item = sequence.shift()
    if (item === undefined) throw new Error('unexpected extra launch')
    return item
  }
  const retried = runQuestionWithRetry('问', launchSequence([failing, good]))
  expect('retry carries first failure', retried.retriedAfter, failing.launchFailure)
  expect('retry adopts second run', retried.sessionId, 's-ok')
  expect('retry clears current failure', retried.launchFailure, '')
  expect('no retry on first success', runQuestionWithRetry('问', launchSequence([good])).retriedAfter, '')
  const bothFail = runQuestionWithRetry('问', launchSequence([failing, { ...failing, sessionId: 's-fail-2' }]))
  expect('double failure records second run', bothFail.sessionId, 's-fail-2')
  expect('double failure keeps first reason', bothFail.retriedAfter, failing.launchFailure)
  const sheet = renderSheet(
    [{ id: 'Q1', title: 't', ask: '问', expect: '', refuse: false, rubric: '', extra: [] }],
    [{ sessionId: 's-ok', observation: { toolCalls: [], answerText: '答案' }, seconds: 5, launchFailure: '', retriedAfter: 'boom' }],
    { title: 'x', home: 'y' })
  if (!sheet.includes('首跑启动失败（boom）')) throw new Error('sheet must record the first-attempt failure')
  return 'eval:domain --self-check: ok — 解析 2 条（续行、该拒答=是、缺问法被丢）· 重试策略：瞬态失败重跑一次、双次尝试都入表'
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-check')) {
    process.stdout.write(selfCheck() + '\n')
    return
  }
  const valueOf = (flag, fallback) => {
    const index = argv.indexOf(flag)
    return index >= 0 && argv[index + 1] !== undefined ? argv[index + 1] : fallback
  }
  const file = resolve(valueOf('--file', defaultQuestions))
  if (!existsSync(file)) {
    process.stderr.write(`eval:domain: 找不到题目文件 ${file}\n`
      + `把 dev/eval/domain/TEMPLATE.md 复制成 ${defaultQuestions}（已被 .gitignore 排除）再填题。\n`)
    process.exit(2)
  }
  const questions = parseQuestions(readFileSync(file, 'utf8'))
  if (questions.length === 0) {
    process.stderr.write(`eval:domain: ${file} 里没有解析出题目（每条以 \`## <id> · <标题>\` 开头，且要有 \`- 问法：\`）\n`)
    process.exit(2)
  }
  const only = valueOf('--only', '')
  const limit = Number(valueOf('--limit', String(questions.length)))
  const selected = questions
    .map((question, index) => ({ question, index }))
    .filter(entry => only === '' || entry.question.id === only)
    .slice(0, Number.isFinite(limit) ? limit : questions.length)
  if (selected.length === 0) {
    process.stderr.write(`eval:domain: --only ${only} 没匹配到题目\n`)
    process.exit(2)
  }

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/gu, '-')
  const out = resolve(valueOf('--out', join(dirname(file), `sheet-${stamp}.md`)))
  const runs = new Array(questions.length).fill(undefined)
  process.stdout.write(`eval:domain: 跑 ${selected.length}/${questions.length} 题（一题约 1–3 分钟）\n`)
  for (const { question, index } of selected) {
    process.stdout.write(`▶ ${question.id} … `)
    const run = runQuestionWithRetry(question.ask, runPreset)
    runs[index] = run
    const observed = observationsOf(run)
    process.stdout.write(`${observed.retriedAfter === '' ? '' : '首跑启动失败，重试 '}`
      + `${run.observation === null ? '没跑出会话' : 'ok'} (${observed.seconds}s`
      + `${observed.rooms.length === 0 ? '，没问房间' : `，房间 ${observed.rooms.join('/')}`})\n`)
  }
  writeFileSync(out, renderSheet(questions, runs, { title: file.replace(`${repoRoot}/`, ''), home: harnessHome }))
  process.stdout.write(`\n打分表：${out}\n按 TEMPLATE.md 的评分规则打分；达不到 G2 判据的题攒成下一批切片。\n`)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
