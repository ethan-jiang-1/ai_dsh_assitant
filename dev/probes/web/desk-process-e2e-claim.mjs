#!/usr/bin/env node
// 认领臂场景（--scenario claim）：桌面选待认领片段 → 认领这件事 → 指归属 → 读回 → 返回并选中归属事项。
//
// 本文件由 desk-process-e2e.mjs 拆出（片 6b）：正文逐字搬迁，只多了把共享上下文解构进来的
// 一行与结尾的 finish()。场景的相位名、判据、预算、措辞都保持原样。
/**
 * @param {Record<string, any>} ctx - 共享上下文（服务、浏览器、判决器、路径、提示词）。
 * @returns {Promise<void>} 结束时由 ctx.finish 决定退出码。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { conversationActive, deskText, dismissApproval, pasteUntilSendable, sendClick, turnStopped } from './dialogue.mjs'
export async function runClaim(ctx) {
  const { browser, claimPrompt, countSessions, evaluate, fail, finish, home, operatingDir, pass, pollUntil, shotDir, sleep, teardown, verdict } = ctx
  const claimCard = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const card = [...(root?.querySelectorAll('button.dsha-card') ?? [])].find(b => (b.textContent ?? '').includes('二期款已经付了'));
    if (card === undefined) return 'fragment-card-not-found';
    card.click(); return 'selected';
  })()`)
  if (claimCard !== 'selected') { teardown(); fail('claim-fragment-selection', { claimCard }) }
  const claimDetail = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const text = root?.innerText ?? '';
    const claim = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').trim() === '认领这件事');
    return { noteVisible: text.includes('二期款已经付了'), sourceVisible: text.includes('来自 session-e2e-fragment-source'), claimButtonPresent: claim !== undefined };
  })()`)
  if (claimDetail?.noteVisible !== true || claimDetail?.claimButtonPresent !== true) {
    teardown(); fail('claim-detail', { claimDetail })
  }
  pass('claim-fragment-detail', { detail: claimDetail })

  const sessionsBeforeClaim = countSessions(home)
  const claimEntry = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').trim() === '认领这件事');
    if (button === undefined) return 'button-not-found';
    button.click(); return 'clicked';
  })()`)
  if (claimEntry !== 'clicked') { teardown(); fail('claim-entry', { claimEntry }) }
  const claimConversation = await pollUntil(evaluate, conversationActive, { checkFirst: true, budget: 40 })
  if (claimConversation !== true) { teardown(); fail('claim-conversation', {}) }
  pass('claim-entry', {})
  // 种子回合对齐：等「正在处理待认领片段…」那一轮跑完（其答复含「还没归户」）再粘贴，
  // 否则粘贴那轮会吃错回放格（BUG-009 的教训在认领臂同样成立）。
  const claimSeedSettled = await pollUntil(evaluate, `(${turnStopped}) && (document.body.innerText ?? '').includes('还没归户')`, { budget: 240, eachCycle: dismissApproval })
  if (claimSeedSettled !== true) fail('claim-seed-turn', {})
  pass('claim-seed-turn', {})
  const { pasteResult: claimPasteResult, sendable: claimReady } = await pasteUntilSendable(evaluate, claimPrompt, { attempts: 10, gapMs: 800 })
  if (!claimReady) { teardown(); fail('claim-composer', { claimPasteResult }) }
  await sleep(600)
  if (await evaluate(sendClick) !== 'sent') { teardown(); fail('claim-send', {}) }
  const claimReturnText = await pollUntil(evaluate, deskText, { budget: 180, eachCycle: dismissApproval, isDone: text => text !== null })
  if (claimReturnText === null) fail('claim-auto-return', { body: await evaluate('document.body.innerText') })
  const afterClaim = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
  const claimReceipt = afterClaim.operations['op-authored-claim-u1']
  if (claimReceipt?.receipt.outcome.status !== 'committed') fail('claim-durable', { claimReceipt })
  if (afterClaim.unclaimed['u-1'] !== undefined) fail('claim-fragment-consumed', { unclaimed: afterClaim.unclaimed })
  const claimedMatter = Object.values(afterClaim.matters).find(m => m.id === 'm-1')
  if (!claimedMatter?.materials.some(m => (m.note ?? '').includes('二期款已经付了'))) fail('claim-material-attached', { materials: claimedMatter?.materials })
  // 「这条落在哪」：返回后详情停在归属事项上；「通道清空」的信号是计数行不再有
  // 「条待认领」、列表标签消失——片段的原文此时作为**已附着的材料**出现在归属事项的
  // 依据里（来源与原文随附），那是成功态而不是未清态。
  if (!claimReturnText.includes('合同 NB-02 第二期款') || !claimReturnText.includes('处理这件事')) fail('claim-return-selection', { claimReturnText })
  if (claimReturnText.includes('条待认领') || claimReturnText.includes('还没说清是哪件事')) fail('claim-lane-cleared', { claimReturnText })
  pass('claim-auto-return', {})
  pass('claim-durable', { outcome: claimReceipt.receipt.outcome })
  pass('claim-lane-cleared-and-selected', { matter: 'm-1' })
  mkdirSync(shotDir, { recursive: true })
  writeFileSync(join(shotDir, '4-claimed-and-selected.png'), await browser.captureScreenshot())
  const sessionsAfterClaim = countSessions(home)
  if (sessionsAfterClaim !== sessionsBeforeClaim + 1) {
    teardown()
    fail('claim-single-session', { sessionsBeforeClaim, sessionsAfterClaim })
  }
  pass('claim-single-session', { created: sessionsAfterClaim - sessionsBeforeClaim })

  // 相位（桌面历史视角卡 261012 ③）：流水视角——切到流水，操作按天倒序在场（今天的认领
  // 在种子账本 10-10 的交办立项之前），点认领条目跳转回看板并选中归属事项。
  const activitySwitch = await evaluate(`(() => {
    const tab = [...document.querySelectorAll('button.dsha-tab')].find(b => (b.textContent ?? '').trim() === '流水');
    if (tab === undefined) return 'mode-tab-not-found';
    tab.click(); return 'switched';
  })()`)
  if (activitySwitch !== 'switched') { teardown(); fail('activity-switch', { activitySwitch }) }
  const feedText = await evaluate(deskText)
  if (feedText === null || !feedText.includes('认领归户') || !feedText.includes('交办立项')) fail('activity-feed', { feedText: String(feedText).slice(0, 300) })
  if (feedText.indexOf('认领归户') > feedText.indexOf('交办立项')) fail('activity-order', { feedText: String(feedText).slice(0, 300) })
  const entryJump = await evaluate(`(() => {
    const entry = [...document.querySelectorAll('button.dsha-activity-entry')].find(b => (b.textContent ?? '').includes('认领归户'));
    if (entry === undefined) return 'entry-not-found';
    entry.click(); return 'jumped';
  })()`)
  if (entryJump !== 'jumped') { teardown(); fail('activity-jump', { entryJump }) }
  const jumpedText = await evaluate(deskText)
  if (jumpedText === null || !jumpedText.includes('处理这件事') || !jumpedText.includes('合同 NB-02 第二期款')) {
    fail('activity-jump-selection', { jumpedText: String(jumpedText).slice(0, 200) })
  }
  pass('activity-feed-and-jump', {})
  writeFileSync(join(shotDir, '5-activity-feed.png'), await browser.captureScreenshot())

  finish("desk claim flow e2e")
}
