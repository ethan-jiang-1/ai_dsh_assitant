#!/usr/bin/env node
/**
 * 会话日志的读取核：发现日志文件、解压成事件、把一条消息判成"本人 / 注入前导 / 面板"、
 * 以及会话目录快照（探针判决的 sessionId 取法）。
 *
 * 为什么单独成库（片 7）：这套判据在仓里被跨目录 import 过多次——报告、评测、探针都要同一份
 * 事实（例如 classifyUserMessage 的注释自证过"判据必须只有一份，各写一份已漂移过两次"）。
 * 它不属于任何一份报告：报告只做渲染，逻辑住这里。
 *
 * 两条纪律随代码一起搬来（原产地注释在 usage-report.mjs 头注）：日志文件名带写者代次
 * （`session.v<n>.jsonl.zstd`），**不写死某一代**；坏行跳过（append-only 日志末尾可能半行）。
 *
 * @module dev/lib/session-logs
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

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
 * 一个 home 当下的会话目录名快照（`session-<uuid>`，跨全部 project 子目录）。
 *
 * 为什么是"快照"而不是"取最新"（261020 深审 #20）：`capturedAt` 解决了探针判决的时钟，没解决
 * join key——日志↔截图对时此前靠「最新会话目录」推断，并行会话下最新目录会指到**别人的**会话。
 * 正确取法是差集：探针跑前/跑后各取一次快照，多出来的才是本次驱动新建的会话。
 * 为什么按目录名而不是按日志文件：会话创建即 mkdir（vendor session-persistence-jsonl），
 * 日志写出有时序差，差集不该依赖「日志已落盘」。
 * @param home - DSH home。
 * @returns `session-<uuid>` 目录名集合（home 没有 sessions 树时为空集）。
 */
export function sessionSnapshot(home) {
  const sessionsRoot = join(home, 'sessions')
  const names = new Set()
  if (!existsSync(sessionsRoot)) return names
  for (const project of readdirSync(sessionsRoot)) {
    let entries = []
    try {
      entries = readdirSync(join(sessionsRoot, project), { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('session-')) names.add(entry.name)
    }
  }
  return names
}

/**
 * 两次快照之间新建的会话目录（差集 = 本次运行驱动的会话，见 sessionSnapshot 的取法说明）。
 * @param before - 跑前快照。
 * @param after - 跑后快照。
 * @returns 新建的 `session-<uuid>` 目录名数组（可能为空）。
 */
export function sessionsCreatedBetween(before, after) {
  return [...after].filter(name => !before.has(name))
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
 * 剥掉粘在**首轮**前面的协作边界前言。
 *
 * 前言是 harness 注入的，落盘时挂在第一条 user/message 的正文前面（`source.kind` 仍是 `'user'`，
 * 所以结构判定分不出来——2026-09-27 真机抓出的读数缺陷）：它会整段冒充"本人的话"，也会把面板
 * 消息的 `[面板] ` 前缀顶掉。剥法是机械的：以该标记开头 ⇒ 丢掉第一个空行（含）之前的部分；
 * 剩下的才是人说的话。原住在 desk-loop-report.mjs；评测会话判据（`dev/lib/eval-sessions.mjs`）
 * 要剥同一层，判据只有一份（本模块的立库理由）。
 * @param text - 消息纯文本。
 * @returns 剥掉前言后的正文（可能为空＝这一轮没有人的内容）。
 */
export function stripPreamble(text) {
  const marker = '[Collaboration boundary]'
  const trimmed = text.trimStart()
  if (!trimmed.startsWith(marker)) return text
  const rest = trimmed.slice(marker.length)
  const blank = rest.indexOf('\n\n')
  return blank < 0 ? '' : rest.slice(blank + 2)
}
