#!/usr/bin/env node
// 处理流场景（--scenario flow，默认）：处理事项 → 留在对话 → 显式拒绝 → 交代新事项 → 返回选择。
//
// 本文件由 desk-process-e2e.mjs 拆出（片 6b）：正文逐字搬迁，只多了把共享上下文解构进来的
// 一行与结尾的 finish()。场景的相位名、判据、预算、措辞都保持原样。
/**
 * @param {Record<string, any>} ctx - 共享上下文（服务、浏览器、判决器、路径、提示词）。
 * @returns {Promise<void>} 结束时由 ctx.finish 决定退出码。
 */
import os from 'node:os'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { conversationActive, deskPresent, deskText, dismissApproval, pasteExpression, pasteUntilSendable, sendClick, sendEnabled, sendPresent, turnRunning, turnStopped } from './dialogue.mjs'
export async function runFlow(ctx) {
  const { browser, countSessions, evaluate, fail, finalReplyMarker, finish, followupPrompt, home, intakePrompt, operatingDir, pass, pollUntil, rejectPrompt, shotDir, sleep, teardown, verdict } = ctx
// 相位 2：选事项 → 详情（处理按钮 + 来源依据可见）。
const selectMatter = `(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const card = [...(root?.querySelectorAll('button.dsha-card') ?? [])].find(b => (b.textContent ?? '').includes('合同 NB-02 第二期款'));
  if (card === undefined) return 'card-not-found';
  card.click(); return 'selected';
})()`
if (await evaluate(selectMatter) !== 'selected') { teardown(); fail('matter-select', {}) }
await sleep(600)
const detailText = await evaluate(deskText)
if (detailText === null || !detailText.includes('处理这件事') || !detailText.includes('来源') && !detailText.includes('session-')) {
  teardown(); fail('matter-detail', { text: String(detailText).slice(0, 400) })
}
pass('matter-detail', {})

// 相位 3：「处理这件事」→ 处理会话接管主区（桌面卸载、composer 挂载）。
// 规格负例「双击发送两次」：同一次 evaluate 里连点两下（落在面板卸载窗口内），
// 复用守卫必须吞掉第二击——服务端会话计数只允许 +1。
const sessionsBeforeProcess = countSessions(home)
if (await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const process = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '') === '处理这件事');
  if (process === undefined) return 'button-not-found';
  process.click(); process.click(); return 'double-clicked';
})()`) !== 'double-clicked') { teardown(); fail('process-click', {}) }
const conversationTookOver = await pollUntil(evaluate, conversationActive, { checkFirst: true, budget: 40 })
if (conversationTookOver !== true) {
  const state = await evaluate(`(() => ({
    desk: document.querySelector('[data-assistant-operating-desk]') !== null,
    composer: document.querySelector('[data-composer-input="true"]') !== null,
    navCount: performance.getEntriesByType('navigation').length,
    hasDebugGlobal: '__deskProcessDebug' in globalThis,
    processLog: (globalThis.__deskProcessDebug ?? []).slice(-4),
    notice: (document.body?.innerText ?? '').slice(0, 250),
  }))()`)
  teardown()
  fail('conversation-switch', { waitedMs: 20000, state })
}
pass('conversation-switch', {})
// 双击负例的服务端判据：整个处理流结束时（会话已建、回合已跑）新会话数必须恰好 +1。
// 计数放在回合之后：create 是异步的，卸载窗口内读数会与 in-flight 竞态。
verdict.sessionsBeforeProcess = sessionsBeforeProcess

// 相位 3b（BUG-009 的真病根）：粘贴前等这个会话 idle。
// 处理会话一挂载，注入的「正在处理事项…」消息就起了一个回合；回合运行中 vendor 的 composer
// 是「停止」态——没有发送键、粘贴会被丢掉（失败取证实测：composer 在、valueLength 0、send false）。
// 不等它，判据就变成「那个回合多快跑完」——一个纯负载相关的量（本探针因此在空闲机上绿、
// 在负载机上红）。完成信号用「停止键消失 + 发送键回来」，与 loop-probe 同一习语；
// 审批门（「允许一次」）就地点掉，别让回合停在等真人上。
let conversationIdle = false
for (let i = 0; i < 240 && !conversationIdle; i++) {
  await sleep(500)
  await evaluate(dismissApproval)
  conversationIdle = await evaluate(`(${turnRunning}) === false && (${sendPresent}) === true`) === true
}
if (!conversationIdle) {
  const state = await evaluate(`(() => ({
    turnRunning: (${turnRunning}), sendPresent: (${sendPresent}),
    visibleText: (document.body?.innerText ?? '').slice(0, 300),
  }))()`)
  teardown(); fail('conversation-idle', { waitedMs: 120000, state })
}
pass('conversation-idle', {})

// 相位 4+5（本探针的存在理由）：发一句话 → 回放回合真跑（真工具真账本）→ 读回 → 自动返回。
// 粘贴/发送习语来自 webui-loop-probe（composer 拒绝 execCommand，合成 ClipboardEvent paste
// 是已验证的插入方式）；习语定义在两场景共享段。
// 失败时带上状态取证：composer 在不在、paste 有没有落进去、发送键为什么是灰的——
// 只报「没接受」的探针下一次还得从头查（2026-10-11 实测教训）。
const composerState = `(() => {
  const composer = document.querySelector('[data-composer-input="true"]');
  const send = [...document.querySelectorAll('button')].find(b =>
    (b.getAttribute('aria-label') ?? '') === '发送消息' || (b.getAttribute('aria-label') ?? '') === 'Send message');
  return {
    composer: composer !== null,
    valueLength: composer === null ? null : String(composer.value ?? '').length,
    send: send !== undefined,
    sendDisabled: send === undefined ? null : send.disabled,
    activeTag: document.activeElement?.tagName ?? null,
    activeComposer: document.activeElement === composer,
    turnRunning: [...document.querySelectorAll('button')].some(b => ['停止生成','Stop generating'].includes(b.getAttribute('aria-label') ?? '')),
    sendPresent: send !== undefined,
    visibleText: (document.body?.innerText ?? '').slice(0, 200),
  };
})()`
let ready = false
let pasteResult = null
for (let i = 0; i < 10 && !ready; i++) {
  pasteResult = await evaluate(pasteExpression(followupPrompt))
  await sleep(800)
  ready = await evaluate(sendEnabled) === true
}
if (!ready) {
  const state = await evaluate(composerState)
  const saturated = os.loadavg()[0] >= os.cpus().length
  teardown()
  fail('composer-accept', {
    pasteResult,
    state,
    // 会话挂载期相位：这条红在超载主机上不构成回归（BUG-009 的两个回退实证）。
    ...(saturated ? { hostHint: `loadavg ${os.loadavg()[0].toFixed(1)} on ${String(os.cpus().length)} cores — saturated host, treat as environmental until re-run idle` } : {}),
  })
}
await sleep(600)
const sent = await evaluate(sendClick)
if (sent !== 'sent') { teardown(); fail('send', { sent }) }

let settled = false
for (let i = 0; i < 600 && !settled; i++) {
  await sleep(500)
  await evaluate(dismissApproval)
  if (await evaluate(deskPresent)) fail('pending-stays-in-chat', { reason: 'returned before explicit decision' })
  settled = await evaluate(`(${turnStopped}) && (document.body.innerText ?? '').includes(${JSON.stringify(finalReplyMarker)})`) === true
}
if (!settled) fail('first-turn-settle', {})
const beforeReject = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
const matterBefore = Object.values(beforeReject.matters).find(m => m.id === 'm-1')
if (!matterBefore?.proposals.some(p => p.id === 'p-1' && p.status === 'pending')) fail('pending-proposal', { matterBefore })
pass('pending-stays-in-chat', {})
mkdirSync(shotDir, { recursive: true })
writeFileSync(join(shotDir, '1-pending-stays-in-chat.png'), await browser.captureScreenshot())
await evaluate(pasteExpression(rejectPrompt))
await sleep(500)
if (!await evaluate(sendEnabled)) fail('reject-composer', {})
await evaluate(sendClick)
const returnText = await pollUntil(evaluate, deskText, { budget: 120, isDone: text => text !== null })
if (returnText === null) fail('reject-auto-return', { body: await evaluate('document.body.innerText') })
const afterReject = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
const matterAfter = Object.values(afterReject.matters).find(m => m.id === 'm-1')
const rejection = afterReject.operations['op-authored-reject-p1']
if (rejection?.receipt.outcome.status !== 'proposal-rejected' || !matterAfter?.proposals.some(p => p.id === 'p-1' && p.status === 'rejected')) fail('durable-rejection', { rejection, matterAfter })
if (matterAfter.times.promisedDeadline !== '2026-10-13' || matterAfter.times.nextCheckpoint !== '2026-10-13' || matterAfter.revision !== matterBefore.revision) fail('confirmed-dates-unchanged', { matterAfter })
if (!returnText.includes('合同 NB-02 第二期款') || returnText.includes('等你确认')) fail('return-selection', { returnText })
pass('reject-auto-return', {})
pass('durable-rejection', { outcome: rejection.receipt.outcome })
pass('confirmed-dates-unchanged', { times: matterAfter.times, revision: matterAfter.revision })
pass('return-selection', {})
writeFileSync(join(shotDir, '2-returned-after-reject.png'), await browser.captureScreenshot())

// 相位 6（规格 K3 的交代首事臂）：桌面「＋ 交代新事项」→ 在对话里说一件事 → 回放回合真提交
// `entrust` → 读回 → 自动返回**并选中新建的那件事**（这一臂的「返回仍选 A」）。
const intakeEntry = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('交代新事项'));
  if (button === undefined) return 'button-not-found';
  button.click(); return 'clicked';
})()`)
if (intakeEntry !== 'clicked') { teardown(); fail('intake-entry', { intakeEntry }) }
const intakeConversation = await pollUntil(evaluate, conversationActive, { checkFirst: true, budget: 40 })
if (intakeConversation !== true) { teardown(); fail('intake-conversation', {}) }
pass('intake-entry', {})
const { sendable: intakeReady } = await pasteUntilSendable(evaluate, intakePrompt, { attempts: 10, gapMs: 800 })
if (!intakeReady) { teardown(); fail('intake-composer', {}) }
await sleep(600)
if (await evaluate(sendClick) !== 'sent') { teardown(); fail('intake-send', {}) }
const intakeReturnText = await pollUntil(evaluate, deskText, { budget: 180, isDone: text => text !== null })
if (intakeReturnText === null) fail('intake-auto-return', { body: await evaluate('document.body.innerText') })
const afterIntake = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
const entrusted = Object.values(afterIntake.matters).find(m => String(m.title).includes('供应商对账单'))
const entrustReceipt = afterIntake.operations['op-authored-entrust']
if (entrusted === undefined || entrustReceipt?.receipt.outcome.status !== 'committed') {
  fail('intake-durable', { entrusted, entrustReceipt })
}
// 「返回仍选 A」：返回后详情停在新事项上（标题 + 处理入口），不是停在列表或旧事项。
if (!intakeReturnText.includes('供应商对账单') || !intakeReturnText.includes('处理这件事')) {
  fail('intake-return-selection', { intakeReturnText })
}
pass('intake-auto-return', { matter: entrusted.id })
pass('intake-return-selection', { title: '供应商对账单：本月多出一笔待核' })
writeFileSync(join(shotDir, '3-entrusted-and-selected.png'), await browser.captureScreenshot())

// 双击负例终判（规格「双击发送两次」）：整个流结束时新会话数恰好 +1。
const sessionsAfterFlow = countSessions(home)
if (sessionsAfterFlow !== sessionsBeforeProcess + 1) {
  teardown()
  fail('double-click-single-session', { sessionsBeforeProcess, sessionsAfterFlow })
}
pass('double-click-single-session', { created: sessionsAfterFlow - sessionsBeforeProcess })
  finish("desk processing flow e2e")
}
