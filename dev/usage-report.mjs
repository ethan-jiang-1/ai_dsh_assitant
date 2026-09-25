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

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 与 scripts/dsh.mjs 同一条硬规则：**永不继承 `DSH_HOME`**（会话环境里它可能是日用的 ~/.dsh），
// 一律指向仓内 dev home；显式出口只有 `ASSISTANT_DSH_HOME`。
// 这条不是洁癖：本工具第一次运行就读错 home（读到日用的 ~/.dsh，553 个会话）——
// 报告头会打印实际读取的 home，就是为了让这种默认值可见。
const harnessHome = resolve(process.env.ASSISTANT_DSH_HOME ?? join(repoRoot, 'dev', 'harness-home'))

/** 会话目录名把 cwd 里的 `/` 与 `.` 换成 `-`（`./` 前缀是路径安全用的）。 */
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
      const log = join(projectDir, entry, 'session.v3.jsonl.zstd')
      if (existsSync(log)) logs.push(log)
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
    assistantMessages: 0,
    toolCalls: {},
    assistantToolSessions: 0,
    errorTurns: 0,
    retries: 0,
    goalChanges: 0,
    models: new Set(),
    reasons: {},
  }
  let usedAssistantTool = false
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
      case 'user/message':
        summary.userMessages += 1
        break
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
        if (kind !== 'completed') summary.errorTurns += 1
        break
      }
      case 'llm/retry':
        summary.retries += 1
        break
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
    total.assistantMessages += summary.assistantMessages
    total.assistantToolSessions += summary.assistantToolSessions
    total.errorTurns += summary.errorTurns
    total.retries += summary.retries
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
  lines.push(`- 消息：用户 ${total.userMessages}，助手 ${total.assistantMessages}`)
  lines.push(`- 自用率：${total.withAssistantTool}/${total.sessions} 个会话调用过自家房间工具（${share(total.withAssistantTool, total.sessions)}）`)
  const tools = Object.entries(total.toolCalls).sort((left, right) => right[1] - left[1])
  lines.push(`- 工具混合（${tools.length} 种，共 ${tools.reduce((sum, entry) => sum + entry[1], 0)} 次）：${tools.slice(0, 8).map(([name, count]) => `${name}×${count}`).join('、') || '（无）'}`)
  const reasons = Object.entries(total.reasons).sort((left, right) => right[1] - left[1])
  lines.push(`- 摩擦：非完成轮 ${total.errorTurns}（结束原因：${reasons.map(([kind, count]) => `${kind}×${count}`).join('、') || '（无）'}）；LLM 重试 ${total.retries}`)
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
