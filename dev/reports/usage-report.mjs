#!/usr/bin/env node
/**
 * 意图级仪表：把真实会话日志与 working folder 的现状读成一张表。
 *
 * 为什么存在：会话日志解析在本仓被手工重推了四次（数会话、看工具序列、量自用率、看降级），
 * 按根 AGENTS.md 的"同一多步流程重复第三次就立"的常设规则，固化成仓内工具。
 *
 * 两条诚实纪律：
 *   ① **只报测得到的东西**——日志里没有 preset 字段就不报 preset；所有数字都是事件计数，不做估计。
 *   ② **先枚举事件类型再取字段**（`--types`）：本仓已被事件形状差异坑过两次
 *      （`system/message` 是 `data.message.content`，`user/message` 是 `data.content`）。
 *
 * 用法：
 *   pnpm usage            # 读 dev home（或 $DSH_HOME）的会话与 working folder
 *   pnpm usage -- --types # 只打印事件类型直方图（形状变了先看这个）
 *
 * @module dev/usage-report
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { devHome } from '../env/home.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

// 与 dev/env/dsh.mjs 同一条硬规则：**永不继承 `DSH_HOME`**（会话环境里它可能是日用的 ~/.dsh），
// 一律指向仓内 dev home；显式出口只有 `ASSISTANT_DSH_HOME`。
// 这条不是洁癖：本工具第一次运行就读错 home（读到日用的 ~/.dsh，553 个会话）——
// 报告头会打印实际读取的 home，就是为了让这种默认值可见。
const harnessHome = devHome()

/**
 * 会话目录名把 cwd 里的 `/` 与 `.` 换成 `-`（`./` 前缀是路径安全用的）。
 * 日志文件名带写者代次（`session.v<n>.jsonl.zstd`，n = DSH 的 `SESSION_FORMAT_VERSION`），
 * **不写死某一代**：写者代次随 pin 升级前移（v3 → v4 实测于 0.1.7），写死会让仪表与 `pnpm eval`
 * 在升级后静默读不到任何新会话（症状是"没有会话日志"，不是报错）。
 */
export function sessionLogs(home) {
  const sessionsRoot = join(home, 'sessions')
  if (!existsSync(sessionsRoot)) return []
  const logs = []
  for (const project of readdirSync(sessionsRoot)) {
    const projectDir = join(sessionsRoot, project)
    let entries = []
    try {
      entries = readdirSync(projectDir)
    } catch {
      continue
    }
    for (const entry of entries) {
      let files = []
      try {
        files = readdirSync(join(projectDir, entry))
      } catch {
        continue
      }
      for (const file of files) {
        if (/^session\.v\d+\.jsonl\.zstd$/.test(file)) logs.push(join(projectDir, entry, file))
      }
    }
  }
  return logs
}

/** zstd 解压后逐行解析事件；坏行跳过（日志是 append-only，末尾可能半行）。 */
export function readEvents(log) {
  const raw = execFileSync('zstd', ['-dc', log], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8')
  const events = []
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue
    try {
      events.push(JSON.parse(line))
    } catch {
      continue
    }
  }
  return events
}

/**
 * 一条 `user/message` 的纯文本。
 * @param event - 事件对象。
 * @returns 拼接后的文本（非文本块忽略）。
 */
export function userMessageText(event) {
  const content = event?.data?.content
  return Array.isArray(content)
    ? content.filter(part => part && part.type === 'text').map(part => String(part.text ?? '')).join(' ')
    : String(content ?? '')
}

/**
 * 一条 `user/message` 是谁说的：`'panel'`（面板经 RPC 写入的机器文本）| `'injected'`（harness 注入的前言）
 * | `'principal'`（本人的话）。
 *
 * 判据**结构优先**：`data.source.kind` 只要不是 `'user'` 就是注入前言（`runtime-context` / `skill-catalog` /
 * `time-context` / `agent-instructions` …）；`kind: 'user'` 里 `rpcId` 以 `desk-` 开头的是面板写的
 * （RPC 由面板发起），其余是本人的话。**两代面板标记都靠这一条**：2026-10-11 之前面板写 `[桌面] `、
 * 之后写 `[面板] `，而 `rpcId` 两代都是 `desk-…`——按文本前缀判会把旧日志里的机器文本算成本人的话。
 * 缺 `source` 的旧日志退回文本前缀（两种标记与前缀式前言都认）。
 *
 * 为什么必须只有一份：三个读数都按它分类 —— 本仪表、[`desk-loop-report`](desk-loop-report.mjs)、
 * [`input-observation`](input-observation.mjs)。各写一份已经在真机上漂移过两次：2026-09-26 注入前言被算成
 * 「本人在用面板」，2026-10-11 `time-context` 前言（每回合一条）与旧标记 `[桌面] ` 又被纯文本判据漏掉。
 * @param event - 一条 `user/message` 事件。
 * @returns 说话方分类。
 */
export function classifyUserMessage(event) {
  const raw = event?.data?.source
  let source = raw
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw)
    } catch {
      source = undefined
    }
  }
  const kind = source !== null && typeof source === 'object' ? String(source.kind ?? '') : ''
  if (kind !== '') {
    if (kind !== 'user') return 'injected'
    return typeof source.rpcId === 'string' && source.rpcId.startsWith('desk-') ? 'panel' : 'principal'
  }
  const text = userMessageText(event)
  if (/^\s*(\[Collaboration boundary\]|<system-reminder>|Current runtime context|Time sampled while preparing)/.test(text)) return 'injected'
  if (/^\s*\[(面板|桌面)\]/.test(text)) return 'panel'
  return 'principal'
}

/** 剥掉面板消息开头的标记（两代都认）；不是面板消息则原样返回。 */
export function stripPanelMarker(text) {
  return text.replace(/^\s*\[(?:面板|桌面)\]\s?/u, '')
}

/**
 * 单个会话日志的读数（纯函数，可夹具）。
 * @param events - 该会话的事件序列。
 */
export function summarizeEvents(events) {
  const summary = {
    hasSession: false,
    requests: 0,
    turns: 0,
    steps: 0,
    userMessages: 0,
    principalMessages: 0,
    panelMessages: 0,
    injectedUserMessages: 0,
    assistantMessages: 0,
    toolCalls: {},
    assistantToolSessions: 0,
    errorTurns: 0,
    errorTurnsWithRetries: 0,
    retries: 0,
    failureCodes: {},
    goalChanges: 0,
    models: new Set(),
    reasons: {},
  }
  let usedAssistantTool = false
  // Retries seen per turn, so an error turn can be told apart from an unexplained one: the
  // turn/end reason carries only the kind, never the cause (verified in real logs, 2026-09-27 —
  // all 5 error turns were API TRANSPORT failures the retry policy could not absorb).
  const retriesByTurn = new Map()
  for (const event of events) {
    const data = event.data ?? {}
    switch (event.type) {
      case 'session':
        summary.hasSession = true
        break
      case 'system/message':
        summary.requests += 1
        break
      case 'turn/start':
        summary.turns += 1
        break
      case 'step/start':
        summary.steps += 1
        break
      case 'user/message': {
        summary.userMessages += 1
        // The harness injects standing preambles as user messages (collaboration boundary,
        // workspace instructions, runtime context) — the meter's job is real use, so they count
        // separately instead of inflating the principal's side. Real misread this fixes: a run of
        // injected preambles looked like "the principal tested the panel" (2026-09-26).
        // 分类只有一份判据（结构优先）：见 classifyUserMessage 的注释——文本前缀判据在真机上漏过
        // 两代标记与 time-context 前言。
        const speaker = classifyUserMessage(event)
        if (speaker === 'injected') summary.injectedUserMessages += 1
        else if (speaker === 'panel') summary.panelMessages += 1
        else summary.principalMessages += 1
        break
      }
      case 'assistant/message':
        summary.assistantMessages += 1
        break
      case 'tool/call': {
        const name = String(data.name ?? '(unnamed)')
        summary.toolCalls[name] = (summary.toolCalls[name] ?? 0) + 1
        if (name.startsWith('assistant_')) usedAssistantTool = true
        break
      }
      case 'turn/end': {
        const kind = data.reason?.kind ?? 'unknown'
        summary.reasons[kind] = (summary.reasons[kind] ?? 0) + 1
        if (kind !== 'completed') {
          summary.errorTurns += 1
          if ((retriesByTurn.get(data.turn) ?? 0) > 0) summary.errorTurnsWithRetries += 1
        }
        break
      }
      case 'llm/retry': {
        summary.retries += 1
        const code = String(data.failure?.code ?? 'UNKNOWN')
        summary.failureCodes[code] = (summary.failureCodes[code] ?? 0) + 1
        retriesByTurn.set(data.turn, (retriesByTurn.get(data.turn) ?? 0) + 1)
        break
      }
      case 'goal/change':
        summary.goalChanges += 1
        break
      case 'request/context':
        if (data.model !== undefined) summary.models.add(`${data.provider ?? '?'}/${data.model}`)
        break
      default:
        break
    }
  }
  summary.assistantToolSessions = usedAssistantTool ? 1 : 0
  return summary
}

/** 合并多个会话读数。 */
export function mergeSummaries(summaries) {
  const total = summarizeEvents([])
  total.models = new Set()
  for (const summary of summaries) {
    total.hasSession ||= summary.hasSession
    total.requests += summary.requests
    total.turns += summary.turns
    total.steps += summary.steps
    total.userMessages += summary.userMessages
    total.principalMessages += summary.principalMessages
    total.panelMessages += summary.panelMessages
    total.injectedUserMessages += summary.injectedUserMessages
    total.assistantMessages += summary.assistantMessages
    total.assistantToolSessions += summary.assistantToolSessions
    total.errorTurns += summary.errorTurns
    total.errorTurnsWithRetries += summary.errorTurnsWithRetries
    total.retries += summary.retries
    for (const [code, count] of Object.entries(summary.failureCodes)) {
      total.failureCodes[code] = (total.failureCodes[code] ?? 0) + count
    }
    total.goalChanges += summary.goalChanges
    for (const [name, count] of Object.entries(summary.toolCalls)) {
      total.toolCalls[name] = (total.toolCalls[name] ?? 0) + count
    }
    for (const [kind, count] of Object.entries(summary.reasons)) {
      total.reasons[kind] = (total.reasons[kind] ?? 0) + count
    }
    for (const model of summary.models) total.models.add(model)
  }
  total.sessions = summaries.filter(summary => summary.hasSession).length
  total.withAssistantTool = summaries.filter(summary => summary.assistantToolSessions > 0).length
  return total
}

/**
 * working folder 的现状：只数条目，不解释内容。
 * 计数规则必须与房间语义一致——**子目录 `archive/` 不是条目**（第一版把 `archive` 当成一条线索和一个技能：
 * 报出"线索 1、技能 3"而实际是"0、2"）。记忆/线索/知识页数 `.md` 文件，技能数含 `SKILL.md` 的目录。
 * @param assistantDir - working folder 根。
 */
export function homeCounts(assistantDir) {
  const entries = relative => {
    const dir = join(assistantDir, relative)
    if (!existsSync(dir)) return []
    return readdirSync(dir, { withFileTypes: true }).filter(entry => !entry.name.startsWith('.'))
  }
  const files = relative => entries(relative).filter(entry => entry.isFile() && entry.name.endsWith('.md')).length
  const bundles = relative => entries(relative).filter(entry => entry.isDirectory() && existsSync(join(assistantDir, relative, entry.name, 'SKILL.md'))).length
  const archived = relative => join(relative, 'archive')
  return {
    memories: files('memory'),
    archivedMemories: files(archived('memory')),
    threads: files('research'),
    archivedThreads: files(archived('research')),
    skills: bundles('skills'),
    archivedSkills: bundles(archived('skills')),
    pages: files('knowledge'),
  }
}

/** 渲染报告（纯函数，可夹具）。 */
export function renderReport(total, home) {
  const lines = []
  const share = (part, whole) => (whole === 0 ? '0%' : `${Math.round((part / whole) * 100)}%`)
  lines.push(`# 意图级仪表（${harnessHome}）`)
  lines.push('')
  lines.push(`- 会话 ${total.sessions}（有请求 ${total.requests} 次 / 轮 ${total.turns} / 步 ${total.steps}）`)
  lines.push(`- 消息：真人 ${total.principalMessages}，助手 ${total.assistantMessages}（面板动作 ${total.panelMessages}、注入前导 ${total.injectedUserMessages} 另计）`)
  lines.push(`- 自用率：${total.withAssistantTool}/${total.sessions} 个会话调用过自家房间工具（${share(total.withAssistantTool, total.sessions)}）`)
  const tools = Object.entries(total.toolCalls).sort((left, right) => right[1] - left[1])
  lines.push(`- 工具混合（${tools.length} 种，共 ${tools.reduce((sum, entry) => sum + entry[1], 0)} 次）：${tools.slice(0, 8).map(([name, count]) => `${name}×${count}`).join('、') || '（无）'}`)
  const reasons = Object.entries(total.reasons).sort((left, right) => right[1] - left[1])
  const codes = Object.entries(total.failureCodes).sort((left, right) => right[1] - left[1])
  const codeText = codes.length === 0 ? '' : `（${codes.map(([code, count]) => `${code}×${count}`).join('、')}）`
  const errorText = total.errorTurns === 0
    ? ''
    : ` · 伴随重试 ${total.errorTurnsWithRetries}/${total.errorTurns}（伴随＝API 侧瞬时；无重试的非完成轮才指向产品缺陷）`
  lines.push(`- 摩擦：非完成轮 ${total.errorTurns}（结束原因：${reasons.map(([kind, count]) => `${kind}×${count}`).join('、') || '（无）'}）；LLM 重试 ${total.retries}${codeText}${errorText}`)
  lines.push(`- 模型：${[...total.models].join('、') || '（未记录）'}`)
  lines.push(`- 家的现状：记忆 ${home.memories}（归档 ${home.archivedMemories}）、线索 ${home.threads}（归档 ${home.archivedThreads}）、技能 ${home.skills}（归档 ${home.archivedSkills}）、知识页 ${home.pages}`)
  lines.push(`- 职责圈事件：goal/change ${total.goalChanges} 次`)
  lines.push('')
  lines.push('> 只报测得到的：日志没有 preset 字段故不报 preset；数字全部来自事件计数，不含估计。')
  return lines.join('\n')
}

function main() {
  const logs = sessionLogs(harnessHome)
  if (process.argv.includes('--types')) {
    const histogram = {}
    for (const log of logs) {
      for (const event of readEvents(log)) {
        const type = String(event.type ?? '(none)')
        histogram[type] = (histogram[type] ?? 0) + 1
      }
    }
    for (const [type, count] of Object.entries(histogram).sort((left, right) => right[1] - left[1])) {
      process.stdout.write(`${String(count).padStart(6)}  ${type}\n`)
    }
    return
  }
  const summaries = logs.map(log => summarizeEvents(readEvents(log)))
  const total = mergeSummaries(summaries)
  total.sessions = summaries.length
  process.stdout.write(renderReport(total, homeCounts(join(harnessHome, 'assistant'))) + '\n')
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
