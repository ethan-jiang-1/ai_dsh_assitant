#!/usr/bin/env node
/**
 * `node dev/reports/continuity-observation.mjs [--home <dir>]` —— 261012 的「真实跨时接续」观察读数。
 *
 * 它做什么：把**账本**（唯一真相）与**会话日志**对起来，产出「事项 × 会话」矩阵，并把每个事项-会话里
 * **本人的轮次逐条列出**（原话，供人判哪句是重讲、哪句是追问），末尾附一份**验收表初稿**骨架。
 *
 * 它不做什么（固定自报，见输出首行）：**本读数不构成真实效果证据** —— 它只统计既有日志，不判断价值、
 * 不替本人下结论。价值只能由本人在真实使用里给（261012 卡红线：开发/eval/演示会话不算真实效果）。
 *
 * 复用（一个事实一个家）：会话发现/解压/消息分类一律走 `dev/lib/session-logs.mjs`（切片 7 抽出的核）；
 * 事项与会话的绑定**直接读账本**里材料/提案/待认领的 `sessionId`，不从渲染结果反推。
 *
 * 口径（都如实标注）：
 *   · 劳动 = 该事项-会话里「本人」轮次数（分类沿用 session-logs 的判据：非注入前言、非 `[面板]` 标记）；
 *   · 模型等待 = 会话日志里 `turn/start`→`turn/end` 的时长和；事件不带时间戳时印 `n/a`，不猜；
 *   · 外部等待 = 相邻会话的间隔（本轮只印会话数，间隔需真实跨天数据才有意义）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { devHome } from '../env/home.mjs'
import { classifyUserMessage, readEvents, sessionLogs, stripPanelMarker, userMessageText } from '../lib/session-logs.mjs'

const argv = process.argv.slice(2)
const flag = name => {
  const at = argv.indexOf(`--${name}`)
  return at === -1 ? undefined : argv[at + 1]
}
const home = resolve(flag('home') ?? devHome())
const SELF_DECLARATION = '**本读数不构成真实效果证据**：它只统计既有日志，不判断价值；价值结论只能由本人在真实使用中给出（开发/eval/演示会话不算真实效果）。'

console.log(`# 261012 接续观察读数\n`)
console.log(`> ${SELF_DECLARATION}\n`)
console.log(`- home：\`${home}\``)

const ledgerPath = join(home, 'assistant-operating', 'ledger.json')
if (!existsSync(ledgerPath)) {
  console.log(`\n**没有账本**（\`assistant-operating/ledger.json\` 不在）：还没有真实事项进过这个 home —— 这本身就是「未触发」的证据之一，不是负面结论。`)
  process.exit(0)
}
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))

/** 事项 →（会话 → 该会话里这条事项的痕迹）。只读账本字段，不推断。 */
const touches = new Map()
const addTouch = (matterId, sessionId, what, at) => {
  if (typeof sessionId !== 'string' || sessionId === '') return
  const byMatter = touches.get(matterId) ?? new Map()
  const list = byMatter.get(sessionId) ?? []
  list.push({ what, at: typeof at === 'string' ? at : undefined })
  byMatter.set(sessionId, list)
  touches.set(matterId, byMatter)
}
for (const matter of Object.values(ledger.matters ?? {})) {
  for (const material of matter.materials ?? []) addTouch(matter.id, material.source?.sessionId, '材料', material.receivedAt)
  for (const proposal of matter.proposals ?? []) addTouch(matter.id, proposal.source?.sessionId, `提案(${String(proposal.status)})`, proposal.proposedAt)
  for (const receipt of Object.values(matter.operations ?? {})) addTouch(matter.id, receipt.sessionId, `回执(${String(receipt.outcome?.status ?? '')})`, receipt.submittedAt)
}
for (const fragment of Object.values(ledger.unclaimed ?? {})) addTouch(`待认领 ${String(fragment.id)}`, fragment.source?.sessionId, '待认领片段', fragment.receivedAt)

const logs = sessionLogs(home)
const logOf = sessionId => logs.find(log => log.includes(sessionId))
const principalTurns = async sessionId => {
  const log = logOf(sessionId)
  if (log === undefined) return undefined
  const events = await readEvents(log)
  const turns = events.filter(event => event.type === 'user/message' && classifyUserMessage(event) === 'principal')
    .map(event => stripPanelMarker(userMessageText(event)).trim()).filter(text => text !== '')
  let modelMs = 0
  let started
  for (const event of events) {
    const at = Date.parse(event.time ?? event.timestamp ?? '')
    if (Number.isNaN(at)) continue
    if (event.type === 'turn/start') started = at
    if (event.type === 'turn/end' && started !== undefined) { modelMs += at - started; started = undefined }
  }
  return { turns, modelMs: modelMs > 0 ? modelMs : undefined, events: events.length }
}

console.log(`\n## 事项 × 会话\n`)
console.log('| 事项 | 会话数 | 跨会话？ | 会话 id | 该会话里的痕迹 |')
console.log('|---|---|---|---|---|')
for (const [matterId, byMatter] of touches) {
  const sessions = [...byMatter.entries()]
  for (const [sessionId, list] of sessions) {
    console.log(`| ${matterId} | ${sessions.length} | ${sessions.length > 1 ? '**是**' : '否（同一会话）'} | \`${sessionId.slice(0, 18)}…\` | ${list.map(x => `${x.what}${x.at === undefined ? '' : ` @${x.at.slice(0, 10)}`}`).join('；')} |`)
  }
}

console.log(`\n## 本人在这些事项-会话里说了什么（逐条原话，供人判"重讲/追问"）\n`)
for (const [matterId, byMatter] of touches) {
  for (const [sessionId] of byMatter) {
    const info = await principalTurns(sessionId)
    if (info === undefined) { console.log(`- **${matterId}** · \`${sessionId.slice(0, 18)}…\`：找不到会话日志 ✗`); continue }
    const wait = info.modelMs === undefined ? 'n/a（事件不带时间戳）' : `${String(Math.round(info.modelMs / 1000))}s`
    console.log(`- **${matterId}** · \`${sessionId.slice(0, 18)}…\`：本人轮次 **${String(info.turns.length)}** 条 · 模型等待 ${wait} · 事件 ${String(info.events)}`)
    for (const text of info.turns) console.log(`  - 「${text.slice(0, 90)}${text.length > 90 ? '…' : ''}」`)
  }
}

console.log(`\n## 验收表初稿（261012 验收标准的头两行，待人填）\n`)
console.log('| 行为 / 需求 | 通过信号 | 本读数能给什么 | 人判什么 |')
console.log('|---|---|---|---|')
console.log('| 是否减少现场恢复摩擦 | 记录重讲/查找/追问与恢复起止；劳动/模型等待/外部等待分开 | 上表的「本人轮次原话 + 模型等待 + 事项×会话矩阵」 | 哪几句是重讲、省掉了哪些真实步骤、值不值 |')
console.log('| 维护与提示成本是否低于收益 | 参与者判断收益大于维护/打断成本并指出具体省掉步骤 | 本人轮次数与逐条原话（可数"修正/澄清"） | 这些劳动算不算负担；无提醒事件记不适用 |')
console.log('\n> 填表人：本人。**不许**把本读数的"无事项/无跨会话"写成正面或负面证明（261012 验收标准第三行的负例）。')
