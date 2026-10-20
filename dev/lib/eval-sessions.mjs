#!/usr/bin/env node
/**
 * 评测会话的识别判据（261020 深审 #21 抽出的共享核）。
 *
 * 为什么单独成库：判据原先只住在 desk-loop-report.mjs 里，而 usage 与 input-observation 读的是
 * 同一个 dev home——评测 one-shot 会话在那里被算成「本人使用」（desk-loop 默认剔了 101 个评测
 * 会话，另两个报告没剔，机器流量混进自用率）。判据必须只有一份：分类判据各写一份在真机上
 * 漂移过两次后才收进 session-logs.mjs（见那里的注释），评测判据不再走同一条老路。
 *
 * 判据三条件（与 desk-loop 的 evalRun 完全同源；BUG-002 的双向钉 = desk-loop --self-check）：
 *   ① 题面命中 `dev/eval/tasks.mjs` 的 prompt（trim 后精确匹配）；
 *   ② 整个会话只有那一条消息窗（评测是 headless one-shot）；
 *   ③ 那条消息不走面板（面板消息必带 `rpcId: desk-…`；评测题面经 argv 进来，source 是裸
 *      `{kind:"user"}`）。
 * 残余（benign，如实声明）：真人在 web 里逐字敲出题面且只此一条，结构上与评测不可区分——
 * desk-loop 的 `--all` 仍可见。
 *
 * @module dev/lib/eval-sessions
 */
import { classifyUserMessage, stripPreamble, userMessageText } from './session-logs.mjs'
import { TASKS } from '../eval/tasks.mjs'

/** 评测题面清单（原定义在 desk-loop-report.mjs，随判据一起搬到唯一家）。 */
export const TASK_PROMPTS = TASKS.map(task => task.prompt)

/**
 * 判据核：一组消息窗是不是评测 one-shot。窗形状 = `{ panel, message }`（desk-loop 的
 * reactionWindows 产物是它的超集，直接传入）。
 * @param windows - 消息窗数组（`{ panel: boolean, message: string }`）。
 * @returns 是否评测会话。
 */
export function isEvalOneShot(windows) {
  return windows.length === 1 && windows[0].panel !== true
    && TASK_PROMPTS.includes(windows[0].message.trim())
}

/**
 * 判据的事件面适配器：usage / input-observation 不构建 desk-loop 的窗口（它们不要工具归属），
 * 从原始事件直接判。窗口构建与 desk-loop 的 reactionWindows 同语义：结构分类
 * （classifyUserMessage）、剥协作边界前言（stripPreamble）、空轮不计窗。
 * @param events - 一个会话日志的事件序列（seq 序）。
 * @returns 是否评测会话。
 */
export function isEvalSessionLog(events) {
  const windows = []
  for (const event of events) {
    if (event.type !== 'user/message') continue
    const speaker = classifyUserMessage(event)
    if (speaker === 'injected') continue
    const message = stripPreamble(userMessageText(event))
    if (message.trim() === '') continue
    windows.push({ panel: speaker === 'panel', message })
  }
  return isEvalOneShot(windows)
}
