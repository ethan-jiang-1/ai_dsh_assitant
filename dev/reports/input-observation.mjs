#!/usr/bin/env node
// 输入边界 30 天观察的读数脚本 —— 对应 _backlog/_archive/settled_issues/261007-input-boundary.md 的观察方案 A/B/C。
//
// 为什么长这样：读数必须机械、可重算、可复核，且**不许另造一套证据系统**
// （_backlog/methods/validation-evidence.md §1：按行为选既有 owner）。所以：
//   · 会话日志一律经 usage-report 的 `sessionLogs`/`readEvents` 读——绝不硬编码 `session.v<n>` 代次；
//   · 「本人 vs 注入前言 vs [面板] 标记」的分类沿用 usage-report 的同一条判据（2026-09-26 的实测教训：
//     注入前言被当成本人使用会让仪表自我认证）；
//   · 账本是唯一真相，直接按 matter/proposal 的时间字段算，不从渲染结果反推。
//
// 三项判读口径（与卡上表格一一对应）：
//   A 自发投递：非注入、非 `[面板] ` 标记的本人轮次 = 候选碎片；脚本**列出**它们，
//               「是否业务碎片」由人判——机器不替人做这一刀。
//   B 时长    ：①事项 `createdAt` → `times.completedAt`（未完成列出挂起天数，不假装闭合）；
//               ②提案 `proposedAt` → 解决时刻（未决列出挂起天数）。
//   C 入口后的操作：每条 `[面板] ` 标记消息**之后那一回合**的工具调用。这是**操作代理信号**，
//               写文件不等于真补数或真拍板（卡上原文），所以脚本只呈现证据、不下结论。
//
// 用法（仓根）：
//   node dev/reports/input-observation.mjs [--home <dir>] [--label baseline|<yyyy-mm-dd>] [--json]
//     --home   观察环境；默认 ASSISTANT_DSH_HOME，否则 dev/harness-home
//     --label  读数标签（基线用 baseline，之后每周用日期）
// 输出：可直接粘进 `_backlog/research/usage/261011-input-observation.md` 的 Markdown 块；`--json` 出机器可读件。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { classifyUserMessage, readEvents, sessionLogs, stripPanelMarker, summarizeEvents, userMessageText } from './usage-report.mjs'
import { devHome } from '../env/home.mjs'
import { option } from '../probes/web/probe-utils.mjs'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const home = option(args, 'home', devHome())
const label = option(args, 'label', new Date().toISOString().slice(0, 10))

// 分类不在这里定义：一律用 usage-report 导出的共用判据（结构优先，两代面板标记与注入前言都认）。
// 另立一份必然漂移——2026-10-11 的实测就是教训（本脚本初版用文本前缀判，把旧 `[桌面] ` 机器消息
// 与每回合一条的 time-context 前言都算成了本人的话）。
const head = (text, length = 70) => text.replace(/\s+/g, ' ').trim().slice(0, length)
/** 事件时间是 epoch 毫秒（desk-loop 同款读法）。 */
const stamp = (time) => typeof time === 'number' && time > 0 ? new Date(time).toISOString().slice(0, 16).replace('T', ' ') : '—'
const days = (from, to) => Math.round(((to === undefined ? Date.now() : Date.parse(to)) - Date.parse(from)) / 86_400_000 * 10) / 10

// —— A/C：读会话日志 ——
const logs = sessionLogs(home)
const candidateTurns = []
const entryActions = []
const totals = { sessions: logs.length, principalMessages: 0, panelMessages: 0, injectedMessages: 0, toolCalls: {} }
for (const log of logs) {
  const events = readEvents(log)
  const summary = summarizeEvents(events)
  totals.principalMessages += summary.principalMessages
  totals.panelMessages += summary.panelMessages
  totals.injectedMessages += summary.injectedUserMessages
  for (const [name, count] of Object.entries(summary.toolCalls)) {
    totals.toolCalls[name] = (totals.toolCalls[name] ?? 0) + count
  }
  const session = log.split('/').slice(-2)[0]
  let pending = null // 遇到 [面板] 消息后开窗，收集本回合的工具调用
  let lastAssistantText = '' // 只为一个提示：这一轮是不是在回答助手的提问（卡上 A 要「非回答提问」）
  for (const event of events) {
    const data = event.data ?? {}
    if (event.type === 'user/message') {
      if (pending !== null) {
        entryActions.push(pending)
        pending = null
      }
      const text = userMessageText(event)
      const speaker = classifyUserMessage(event)
      if (speaker === 'injected') continue
      if (speaker === 'panel') pending = { at: event.time, session, marked: head(stripPanelMarker(text), 60), tools: [] }
      else candidateTurns.push({ at: event.time, session, text: head(text), followsQuestion: /[？?]\s*$/.test(lastAssistantText.trim()) })
    } else if (event.type === 'assistant/message') {
      const content = data.message?.content
      lastAssistantText = Array.isArray(content)
        ? content.filter(part => part && part.type === 'text').map(part => String(part.text ?? '')).join(' ')
        : ''
    } else if (event.type === 'tool/call' && pending !== null) {
      pending.tools.push(String(data.name ?? '(unnamed)'))
    }
  }
  if (pending !== null) entryActions.push(pending)
}

// —— B：读账本 ——
const ledgerPath = join(home, 'assistant-operating', 'ledger.json')
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : undefined
const matterDurations = []
const proposalDurations = []
if (ledger !== undefined) {
  for (const matter of Object.values(ledger.matters ?? {})) {
    matterDurations.push({
      id: matter.id,
      title: String(matter.title ?? '').slice(0, 40),
      status: String(matter.status ?? ''),
      createdAt: matter.createdAt,
      completedAt: matter.times?.completedAt,
      days: matter.createdAt === undefined ? undefined : days(matter.createdAt, matter.times?.completedAt),
      open: matter.times?.completedAt === undefined,
    })
    for (const proposal of matter.proposals ?? []) {
      const resolved = (ledger.operations === undefined ? [] : Object.values(ledger.operations))
        .filter(operation => operation.operation?.proposalId === proposal.id
          && ['confirm', 'reject'].includes(String(operation.operation?.kind ?? '')))
        .map(operation => operation.receipt?.at ?? operation.submittedAt)
        .filter(at => typeof at === 'string')
        .sort()
      proposalDurations.push({
        id: proposal.id,
        matterId: matter.id,
        status: String(proposal.status ?? ''),
        proposedAt: proposal.proposedAt,
        resolvedAt: resolved.at(-1),
        days: proposal.proposedAt === undefined ? undefined : days(proposal.proposedAt, resolved.at(-1)),
        open: proposal.status === 'pending',
      })
    }
  }
}

const reading = {
  label,
  home,
  at: new Date().toISOString(),
  A: {
    note: '非注入、非 [面板] 标记的本人轮次＝候选碎片；是否业务碎片由人判',
    candidateCount: candidateTurns.length,
    candidateTurns,
    totals: { sessions: totals.sessions, principalMessages: totals.principalMessages, panelMessages: totals.panelMessages, injectedMessages: totals.injectedMessages },
  },
  B: { ledger: ledger === undefined ? 'absent' : ledgerPath, matters: matterDurations, proposals: proposalDurations },
  C: { note: '每条 [面板] 标记消息之后那一回合的工具调用（操作代理信号，不等于真补数）', entries: entryActions },
}

if (asJson) {
  console.log(JSON.stringify(reading, null, 2))
  process.exit(0)
}

const lines = []
lines.push(`### 读数 ${label}（${reading.at.slice(0, 16).replace('T', ' ')}）`)
lines.push('')
lines.push(`环境：\`${home}\` ｜ 会话 ${totals.sessions} 个 ｜ 本人轮次 ${totals.principalMessages} ｜ \`[面板]\` 标记 ${totals.panelMessages} ｜ 注入前言 ${totals.injectedMessages}`)
lines.push('')
lines.push(`**A 自发投递（候选 ${candidateTurns.length} 条，\"是否业务碎片\"由人判）**`)
if (candidateTurns.length === 0) lines.push('- （无：该环境还没有本人轮次）')
for (const turn of candidateTurns) {
  // `followsQuestion` 是**启发式提示**（前一条助手消息以问号结尾），不是过滤：卡上 A 要的是
  // 「非回答提问」的条数，那一刀仍由人判——脚本只把线索摆在旁边。
  lines.push(`- ${stamp(turn.at)} · ${turn.session.slice(-8)}${turn.followsQuestion ? ' · 〔可能是在回答提问〕' : ''} · ${turn.text}`)
}
lines.push('')
lines.push('**B 时长**')
if (ledger === undefined) lines.push('- （该环境还没有账本）')
if (matterDurations.length > 0) {
  lines.push('')
  lines.push('| 事项 | 状态 | 建立 | 完成 | 天数 |')
  lines.push('|---|---|---|---|---|')
  for (const matter of matterDurations) {
    lines.push(`| ${matter.id} ${matter.title} | ${matter.status}${matter.open ? '（未闭合）' : ''} | ${String(matter.createdAt ?? '').slice(0, 10)} | ${String(matter.completedAt ?? '—').slice(0, 10)} | ${matter.days ?? '—'} |`)
  }
}
if (proposalDurations.length > 0) {
  lines.push('')
  lines.push('| 提案 | 事项 | 状态 | 提出 | 解决 | 天数 |')
  lines.push('|---|---|---|---|---|---|')
  for (const proposal of proposalDurations) {
    lines.push(`| ${proposal.id} | ${proposal.matterId} | ${proposal.status}${proposal.open ? '（未决）' : ''} | ${String(proposal.proposedAt ?? '').slice(0, 10)} | ${String(proposal.resolvedAt ?? '—').slice(0, 10)} | ${proposal.days ?? '—'} |`)
  }
}
lines.push('')
lines.push(`**C 入口后的操作（${entryActions.length} 次入口）**`)
if (entryActions.length === 0) lines.push('- （无：该环境还没有面板写入的入口消息）')
for (const entry of entryActions) {
  lines.push(`- ${stamp(entry.at)} · ${entry.session.slice(-8)} · 「${entry.marked}」→ ${entry.tools.length === 0 ? '**无工具调用**' : entry.tools.join(', ')}`)
}
console.log(lines.join('\n'))
