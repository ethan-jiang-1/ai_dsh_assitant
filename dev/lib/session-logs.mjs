#!/usr/bin/env node
/**
 * 会话日志的读取核：发现日志文件、解压成事件、把一条消息判成"本人 / 注入前导 / 面板"。
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
