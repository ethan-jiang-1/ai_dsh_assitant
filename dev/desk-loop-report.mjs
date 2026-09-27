#!/usr/bin/env node
/**
 * `pnpm desk-loop` —— 从**真实会话日志**里读培养循环的健康度（摩擦在这里长什么样）。
 *
 * 为什么存在：本产品的"摩擦"多数是**循环**事实——本人点一行 → 面板发一条带 `[桌面] ` 标记的消息 →
 * 助手应当重写 `.desk/state.json` → 面板跟着变。这条链断在哪，本人的体验就是"它没理我"，于是他
 * **再点一次**。这段读法如果留给未来的会话临场发明，摩擦就永远只能靠碰巧被发现；本工具把读法钉下来，
 * 好让发现直接变成切片。
 *
 * 读什么（全部来自会话日志，不读 stdout，也不读面板内部状态）：
 *   · `user/message` 的 content 文本块 —— 面板自己的消息带 `[桌面] ` 标记（A10），本人的话没有；
 *   · `tool/call` 的 name/arguments —— 桌面写入（谓词与评测器共用：[`wrotePath`](eval/checks.mjs)）
 *     与技能加载（`skill` 工具点名 `desk-refresh`）。
 *
 * 不做什么：不判定质量、不做语义分类。"本人的话是不是在抱怨"这类判断留给人读（§5 只把材料摆出来）。
 *
 * 用法：
 *   pnpm desk-loop                # dev home 里的全部会话
 *   pnpm desk-loop -- --since 7   # 只看最近 7 天动过的会话
 *   pnpm desk-loop -- --all       # 连评测会话一起算（默认把它们单列，不混进"本人"的账）
 *
 * @module dev/desk-loop-report
 */
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readEvents, sessionLogs } from './usage-report.mjs'
import { argumentsText, wrotePath } from './eval/checks.mjs'
import { TASKS } from './eval/tasks.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// 与 scripts/dsh.mjs 同一条硬规则：永不继承 DSH_HOME（见 dev/usage-report.mjs 的同名说明）
const harnessHome = resolve(process.env.ASSISTANT_DSH_HOME ?? join(repoRoot, 'dev', 'harness-home'))

const PANEL_MARKER = '[桌面] '
const SKILL = 'desk-refresh'
const DESK_PATH = '.desk/state.json'
const REPEAT_WINDOW_MS = 15 * 60 * 1000
const REACTION_WINDOW_MS = 10 * 60 * 1000

/** 面板消息 → 动作名（模板的 owner 是 client/index.ts 的各 sender；这里只认前缀，不复制文案全文）。 */
function actionOf(text) {
  if (text.startsWith('刷新我的桌面')) return '刷新桌面'
  if (text.includes('请给我两三个选项')) return '看选项'
  if (text.includes('——我的决定是：')) return '回答'
  if (text.includes('」已经办完了')) return '办完了'
  if (text.includes('」不办了')) return '不办了'
  if (text.includes('」要改：')) return '改这条'
  if (text.startsWith('缺口的原始读数')) return '补上'
  if (text.startsWith('关于线索')) return '问进展'
  return '其他'
}

/** 行身份：面板模板都把行放进『「…」』，取第一个；没有就退回动作名。 */
function rowKeyOf(text, action) {
  const open = text.indexOf('「')
  const close = open < 0 ? -1 : text.indexOf('」', open)
  return close > open ? text.slice(open + 1, close) : action
}

/** 一条 user/message 的纯文本（多个块拼起来）。 */
function textOf(event) {
  const blocks = event.data?.content
  if (!Array.isArray(blocks)) return ''
  return blocks.flatMap(block => block?.type === 'text' && typeof block.text === 'string' ? [block.text] : []).join('\n')
}

/**
 * 这条 user/message 是"人（或面板）说的"还是**注入的前言**？
 *
 * 为什么必须分开（2026-09-27 实测教训）：preset 会话的每一轮前会注入若干文本块（`<system-reminder>`
 * 技能清单、`[Collaboration boundary]` 协作边界……）。它们以 user/message 的形式落盘，但不是本人说的话，
 * 而且**夹在面板动作与它那一轮的工具调用之间**——把它们当"人说的"，既会污染 §5，又会把窗口切断，
 * 让 §4（技能有没有加载）读出假的 86%。判据取保守形态：`[桌面] ` 前缀＝面板；`<` 或 `[` 开头＝注入；
 * 其余＝本人的话。启发式，写在报告的限制里。
 * @param text - 消息纯文本。
 * @returns `'panel' | 'injected' | 'human'`。
 */
function speakerOf(text) {
  const head = text.trimStart()
  if (head.startsWith(PANEL_MARKER)) return 'panel'
  if (head.startsWith('<') || head.startsWith('[')) return 'injected'
  return 'human'
}

/**
 * 把一个会话切成"反应窗"：每条用户消息之后、下一条用户消息之前的工具调用。
 * @param events - 一个会话的事件序列（seq 序）。
 * @returns `{ message, at, tools }` 列表。
 */
function reactionWindows(events) {
  const windows = []
  let current
  for (const event of events) {
    if (event.type === 'user/message') {
      const message = textOf(event)
      // 注入的前言既不算一条消息、也不切断窗口：它夹在面板动作与那一轮工具调用之间。
      if (speakerOf(message) === 'injected') continue
      if (current !== undefined) windows.push(current)
      current = { message, at: Number(event.time ?? 0), tools: [] }
      continue
    }
    if (event.type === 'tool/call' && current !== undefined) {
      current.tools.push({ name: String(event.data?.name ?? ''), argumentsText: argumentsText(event.data?.arguments) })
    }
  }
  if (current !== undefined) windows.push(current)
  return windows
}

/** 评测会话的题面（用来把它们从"本人"的账里分出去：消息层与真人不可区分，题面可以）。 */
const TASK_PROMPTS = TASKS.map(task => task.prompt)

function main() {
  const argv = process.argv.slice(2)
  const sinceIndex = argv.indexOf('--since')
  const sinceDays = sinceIndex >= 0 ? Number(argv[sinceIndex + 1]) : undefined
  const includeEval = argv.includes('--all')
  const cutoff = sinceDays === undefined ? undefined : Date.now() - sinceDays * 24 * 60 * 60 * 1000

  const sessions = []
  for (const log of sessionLogs(harnessHome)) {
    const events = readEvents(log)
    if (events.length === 0) continue
    const windows = reactionWindows(events).filter(window => window.message.trim() !== '')
    if (windows.length === 0) continue
    const startedAt = Number(events[0]?.time ?? windows[0].at)
    if (cutoff !== undefined && startedAt < cutoff) continue
    sessions.push({
      // 会话身份从**日志目录名**取（`session-<uuid>`）：事件里的 data.sessionId 并不总在，回退到
      // 日志路径会印出 "/Users/b" 这种废值（2026-09-27 实测）。
      id: (/(?:^|\/)session-([0-9a-f-]+)(?:\/|$)/.exec(log)?.[1] ?? 'unknown').slice(0, 8),
      startedAt,
      evalRun: TASK_PROMPTS.includes(windows[0].message.trim()),
      windows,
    })
  }

  const human = sessions.filter(session => !session.evalRun)
  const evalRuns = sessions.filter(session => session.evalRun)
  const considered = includeEval ? sessions : human

  const noWrite = []
  const noSkill = []
  const repeats = []
  const doubleAnswers = []
  const reactions = []

  for (const session of considered) {
    const actions = []
    for (const window of session.windows) {
      const isPanel = window.message.startsWith(PANEL_MARKER)
      if (!isPanel) {
        // 本人的话：如果前面 10 分钟内有面板动作，把它作为"反应"摆出来（人工读，不判定）
        const previous = actions[actions.length - 1]
        if (previous !== undefined && window.at - previous.at <= REACTION_WINDOW_MS) {
          reactions.push({ session: session.id, at: window.at, action: previous, said: window.message.trim().slice(0, 160) })
        }
        continue
      }
      const body = window.message.slice(PANEL_MARKER.length)
      const action = { session: session.id, at: window.at, action: actionOf(body), rowKey: rowKeyOf(body, actionOf(body)), asksRefresh: body.includes(SKILL), window }
      actions.push(action)
      if (!wrotePath(window.tools, DESK_PATH)) noWrite.push(action)
      if (action.asksRefresh && !window.tools.some(call => call.name === 'skill' && call.argumentsText.includes(SKILL))) noSkill.push(action)
    }

    for (let i = 0; i < actions.length; i += 1) {
      for (let j = i + 1; j < actions.length; j += 1) {
        if (actions[j].rowKey !== actions[i].rowKey) continue
        if (actions[j].at - actions[i].at > REPEAT_WINDOW_MS) continue
        if (actions[j].action === '回答' && actions[i].action === '回答') doubleAnswers.push([actions[i], actions[j]])
        else if (actions[j].action !== '回答' && actions[i].action !== '回答') repeats.push([actions[i], actions[j]])
      }
    }
  }

  const panelActions = considered.reduce((sum, session) =>
    sum + session.windows.filter(window => window.message.startsWith(PANEL_MARKER)).length, 0)
  const pct = (count) => panelActions === 0 ? '—' : `${Math.round(count / panelActions * 100)}%`

  const when = (at) => new Date(at).toISOString().replace('T', ' ').slice(0, 16)
  const lines = []
  lines.push(`# 培养循环摩擦报告 — ${harnessHome}`)
  lines.push('')
  lines.push(`会话 ${considered.length}（本人 ${human.length} · 评测 ${evalRuns.length}${includeEval ? '，已含' : '，默认不计' }）`
    + `｜面板动作 ${panelActions}${sinceDays === undefined ? '' : `｜窗口：最近 ${sinceDays} 天`}`)
  lines.push('')
  lines.push(`## 1. 面板动作之后，桌面文件没有被重写（循环的硬保证）— ${noWrite.length}/${panelActions}（${pct(noWrite.length)}）`)
  lines.push('')
  lines.push('这一类的体验就是"它没理我"：本人点了、消息发了、文件没动，面板自然也不变。')
  lines.push('')
  for (const item of noWrite.slice(0, 20)) lines.push(`- ${when(item.at)} · 会话 ${item.session} · ${item.action} · 「${item.rowKey.slice(0, 60)}」`)
  if (noWrite.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 2. 同一个行被反复动（15 分钟内 ≥2 次）— ${repeats.length} 组`)
  lines.push('')
  for (const [first, second] of repeats.slice(0, 20)) {
    lines.push(`- ${when(first.at)} → ${when(second.at)} · 会话 ${first.session} · ${first.action}/${second.action} · 「${first.rowKey.slice(0, 60)}」`)
  }
  if (repeats.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 3. 同一个决定被答了多次 — ${doubleAnswers.length} 组`)
  lines.push('')
  for (const [first, second] of doubleAnswers.slice(0, 20)) {
    lines.push(`- ${when(first.at)} → ${when(second.at)} · 会话 ${first.session} · 「${first.rowKey.slice(0, 60)}」`)
  }
  if (doubleAnswers.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 4. 面板消息点名了 desk-refresh，那一轮却没加载它 — ${noSkill.length}/${panelActions}（${pct(noSkill.length)}）`)
  lines.push('')
  lines.push('面板的提示语写死了"完成后加载 desk-refresh 技能"；没加载却动了桌面，就是冷发现不可靠的那一类。')
  lines.push('')
  for (const item of noSkill.slice(0, 20)) lines.push(`- ${when(item.at)} · 会话 ${item.session} · ${item.action} · 「${item.rowKey.slice(0, 60)}」`)
  if (noSkill.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 5. 面板动作之后 10 分钟内本人的话（人工读，不判定）— ${reactions.length} 条`)
  lines.push('')
  for (const item of reactions.slice(0, 25)) {
    lines.push(`- ${when(item.at)} · 会话 ${item.session}`)
    lines.push(`  - 面板：${item.action.action}「${item.action.rowKey.slice(0, 60)}」`)
    lines.push(`  - 本人：${item.said}`)
  }
  if (reactions.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push('## 限制（先说清，免得把数字当结论）')
  lines.push('')
  lines.push('- 注入前言按启发式排除（`<` 或 `[` 开头）：若将来有前缀不同的注入文本，它会混进 §5——看到可疑条目先核原文。')
  lines.push('- 评测会话按题面识别（消息层与真人不可区分，题面可以）；用 `--all` 可以合并看。')
  lines.push('- §1/§4 只认"同一窗口内的工具调用"；跨窗口的补救（例如下一轮才写文件）不算数——那是另一种问题（延迟），不是这一节要量的。')
  lines.push('')
  lines.push('## 怎么读')
  lines.push('')
  lines.push('- §1 有量 ⇒ 循环在"写文件"这一步真的丢过东西：先看是不是模型侧不遵守（对照 §4），是则考虑机械兜底；')
  lines.push('  单条则看那一轮它到底干了什么（会话 id 可以直接 rg）。')
  lines.push('- §2 有量 ⇒ 行上的按钮要么在骗人（点了没反应），要么反馈太慢（本人等不及）——两轮整改已修掉几个已知源，')
  lines.push('  剩下的按同一把尺子变成切片。')
  lines.push('- §3 有量 ⇒ 决定没被接住（回答落盘失败或行没撤），这是信任问题，优先于任何新功能。')
  lines.push('- §5 是唯一需要人眼的一段：本人那句话是不是新的别扭，决定要不要立新切片。')
  process.stdout.write(lines.join('\n') + '\n')
}

main()
