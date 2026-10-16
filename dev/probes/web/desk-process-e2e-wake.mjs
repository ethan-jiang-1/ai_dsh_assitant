#!/usr/bin/env node
// 唤醒轮场景（--scenario wake）：已完成事项的合法动作是唤醒 → 带原因 reopen → 回在办 → 返回仍选它。
//
// 本文件由 desk-process-e2e.mjs 拆出（片 6b）：正文逐字搬迁，只多了把共享上下文解构进来的
// 一行与结尾的 finish()。场景的相位名、判据、预算、措辞都保持原样。
/**
 * @param {Record<string, any>} ctx - 共享上下文（服务、浏览器、判决器、路径、提示词）。
 * @returns {Promise<void>} 结束时由 ctx.finish 决定退出码。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { clickByText, conversationActive, deskText, dismissApproval, pasteUntilSendable, sendClick, turnStopped } from './dialogue.mjs'
export async function runWake(ctx) {
  const { browser, countSessions, evaluate, fail, finish, home, operatingDir, pass, pollUntil, shotDir, sleep, teardown, verdict, wakePrompt } = ctx
  // 相位（状态门控动作卡 261012）：状态决定合法动作——已完成事项的动作是「唤醒这件事」，
  // 不是「处理这件事」；唤醒走真 reopen（带原因），事项回在办后按钮变回「处理这件事」。
  const settledSelect = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const card = [...(root?.querySelectorAll('button.dsha-card') ?? [])].find(b => (b.textContent ?? '').includes('九月银行对账单核对'));
    if (card === undefined) return 'settled-card-not-found';
    card.click(); return 'selected';
  })()`)
  if (settledSelect !== 'selected') { teardown(); fail('settled-select', { settledSelect }) }
  const settledDetail = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const text = root?.innerText ?? '';
    const wake = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('唤醒这件事'));
    const process = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').trim() === '处理这件事');
    return { wakePresent: wake !== undefined, processPresent: process !== undefined };
  })()`)
  if (settledDetail?.wakePresent !== true || settledDetail?.processPresent !== false) {
    fail('settled-action-gate', { settledDetail })
  }
  pass('settled-action-gate', { detail: settledDetail })

  const sessionsBeforeWake = countSessions(home)
  const wakeEntry = await evaluate(clickByText('唤醒这件事', { exact: false }))
  if (wakeEntry !== 'clicked') { teardown(); fail('wake-entry', { wakeEntry }) }
  const wakeConversation = await pollUntil(evaluate, conversationActive, { checkFirst: true, budget: 40 })
  if (wakeConversation !== true) { teardown(); fail('wake-conversation', {}) }
  pass('wake-entry', {})
  const wakeSeedSettled = await pollUntil(evaluate, `(${turnStopped}) && (document.body.innerText ?? '').includes('重新打开它需要一个理由')`, { budget: 240, eachCycle: dismissApproval })
  if (wakeSeedSettled !== true) fail('wake-seed-turn', {})
  pass('wake-seed-turn', {})
  const { pasteResult: wakePasteResult, sendable: wakeReady } = await pasteUntilSendable(evaluate, wakePrompt, { attempts: 10, gapMs: 800 })
  if (!wakeReady) { teardown(); fail('wake-composer', { wakePasteResult }) }
  await sleep(600)
  if (await evaluate(sendClick) !== 'sent') { teardown(); fail('wake-send', {}) }
  const wakeReturnText = await pollUntil(evaluate, deskText, { budget: 180, eachCycle: dismissApproval, isDone: text => text !== null })
  if (wakeReturnText === null) fail('wake-auto-return', { body: await evaluate('document.body.innerText') })
  const afterWake = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
  const reopenReceipt = afterWake.operations['op-authored-reopen-m2']
  if (reopenReceipt?.receipt.outcome.status !== 'committed') fail('wake-durable', { reopenReceipt })
  const woken = afterWake.matters['m-2']
  if (woken?.status !== 'active' || woken.times.completedAt !== undefined) fail('wake-status-active', { status: woken?.status, times: woken?.times })
  if (!woken.materials.some(m => (m.note ?? '').includes('漏核'))) fail('wake-reason-material', { materials: woken.materials })
  // 状态机闭合的可见证明：唤醒回在办后，详情的动作按钮变回「处理这件事」。
  if (!wakeReturnText.includes('九月银行对账单核对') || !wakeReturnText.includes('处理这件事')) fail('wake-return-selection', { wakeReturnText })
  pass('wake-auto-return', {})
  pass('wake-durable', { outcome: reopenReceipt.receipt.outcome })
  pass('wake-state-machine-closed', { status: woken.status, completedAt: woken.times.completedAt ?? null })
  writeFileSync(join(shotDir, '6-woken-and-processing.png'), await browser.captureScreenshot())
  const sessionsAfterWake = countSessions(home)
  if (sessionsAfterWake !== sessionsBeforeWake + 1) {
    teardown()
    fail('wake-single-session', { sessionsBeforeWake, sessionsAfterWake })
  }
  pass('wake-single-session', { created: sessionsAfterWake - sessionsBeforeWake })

  finish("desk wake flow e2e")
}
