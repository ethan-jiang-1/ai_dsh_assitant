#!/usr/bin/env node
// 处理流真机走查探针：在一个**已起好的实例**上，用真模型走两条路，记录人判需要的话术素材。
//
// 为什么要有它（与 desk-process-e2e.mjs 分工不同）：
//   · `desk-process-e2e.mjs` 是**确定性回放**——判据是「接线对不对」（真工具、真账本、真导航，模型输出固定）；
//   · 本探针用**真模型**——判据是**导航契约**，素材是给本人做口味裁决用的（话术/层级/确认负担）。
//     ② 开屏卡 #5/R5 与 ③ 总助卡 A8/A9 的人判行都读它产出的屏幕文本与截图。
//   2026-10-11 之前这两条路只有 `.tmp` 里的一次性脚本，读数无法重取——按「能脚本化就脚本化」的口径固化在此。
//
// 断言什么（导航级，模型措辞不入断言）：
//   1. 首屏是账本桌面；选一件事 →「处理这件事」→ 处理会话接管主区，composer 挂载；
//   2. 回合跑完后：**桌面回来了 ⇒ 该事项当时没有任何待确认**（给 `--home` 时按账本核这条不变量；
//      没给就只报现象）。留在对话不是失败——那是「有事等你」的正确形态，脚本把它如实报出来；
//   3. 交代臂：「＋ 交代新事项」→ 说一件新事 → 自动返回，且选中的是**这次交代在账本里新建的那条**
//      （身份按账本 id 判，不按标题——标题会撞车；模型判定为既有事项时如实报 `created: []`，不判失败）。
//      这条不变量需要 `--home`；不给就只报现象。
//
// 不能证明什么：措辞好不好（那是本人的读）、跨周边界行为、模型稳定性（每次文本都可能不同）。
// 用法（仓根）：
//   node dev/probes/web/desk-flow-walk.mjs '<gui-url>' [--home <dir>] [--matter <子串>]
//        [--say '<进展一句>'] [--entrust '<新事一句>'] [--out <dir>] [--skip-intake]
//   前置：`pnpm build` 已跑；实例已起（真模型需要 key，实例侧负责）；`--home` 给实例的 home 才能核 2 的不变量。
//   输出：JSON 判决 + `<out>/<阶段>.txt|.png`（默认落仓内 .tmp/desk-walkthrough/<时间戳>/）。
import { launchCdpBrowser } from './cdp-driver.mjs'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpDir } from '../../env/tmp.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback
}
const url = args.find(argument => !argument.startsWith('--'))
if (url === undefined) throw new Error("usage: desk-flow-walk.mjs '<gui-url>' [--home <dir>] [--matter <substring>]")
const home = option('home')
const matterHint = option('matter', '')
const say = option('say', '客户刚才打电话说要推迟到 10/20 才能付，还没重新约定具体日子，先记一下。')
const entrust = option('entrust', '新添一件：商标续展材料 11 月 20 日前要递交，代理所说这次得先补使用证据。')
const skipIntake = args.includes('--skip-intake')
const outDir = option('out', join(tmpDir('desk-walkthrough'), new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)))
mkdirSync(outDir, { recursive: true })

const browser = await launchCdpBrowser({ url, windowSize: '1440,900' })
if (browser.failed !== undefined) throw new Error(String(browser.failed))
const { evaluate, captureScreenshot, consoleProblems, exceptions } = browser
const sleep = milliseconds => new Promise(resolve => { setTimeout(resolve, milliseconds) })
const deskText = `(() => { const root = document.querySelector('[data-assistant-operating-desk]'); return root === null ? null : root.innerText })()`
const turnRunning = `[...document.querySelectorAll('button')].some(b => ['停止生成','Stop generating'].includes(b.getAttribute('aria-label') ?? ''))`
const sendPresent = `[...document.querySelectorAll('button')].some(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''))`
const verdict = { url, home, outDir, phases: {}, consoleProblems: [], exceptions: [] }
const record = async (name) => {
  const text = String(await evaluate('document.body.innerText') ?? '')
  writeFileSync(join(outDir, `${name}.txt`), text)
  writeFileSync(join(outDir, `${name}.png`), await captureScreenshot())
  return text
}
const fail = (phase, detail) => {
  verdict.phases[phase] = { pass: false, ...detail }
  verdict.consoleProblems = consoleProblems.slice(0, 10)
  verdict.exceptions = exceptions.slice(0, 10)
  console.log(JSON.stringify(verdict, null, 2))
  process.exitCode = 1
}
const pass = (phase, detail = {}) => { verdict.phases[phase] = { pass: true, ...detail } }

/** 等会话 idle：停止键消失、发送键回来（顺路点掉审批门）——与 desk-process-e2e 同一习语。 */
const waitIdle = async (budget = 240) => {
  for (let i = 0; i < budget; i++) {
    await sleep(500)
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次'); b?.click(); })()`)
    if (await evaluate(`(${turnRunning}) === false && (${sendPresent}) === true`) === true) return true
  }
  return false
}
const pasteAndSend = async (text) => {
  for (let i = 0; i < 12; i++) {
    await evaluate(`(() => {
      const composer = document.querySelector('[data-composer-input="true"]');
      if (composer === null) return 'no-composer';
      composer.focus();
      const data = new DataTransfer();
      data.setData('text/plain', ${JSON.stringify(text)});
      composer.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      return 'pasted';
    })()`)
    await sleep(700)
    if (await evaluate(`(() => {
      const send = [...document.querySelectorAll('button')].find(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''));
      return send !== undefined && send.disabled === false;
    })()`) === true) break
  }
  return await evaluate(`(() => {
    const send = [...document.querySelectorAll('button')].find(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''));
    if (send === undefined || send.disabled) return 'not-sent';
    send.click(); return 'sent';
  })()`)
}

// —— 相位 1：首屏＝账本桌面 ——
let desk = null
for (let i = 0; i < 120 && desk === null; i++) {
  const text = await evaluate(deskText)
  if (text !== null && text.includes('你的桌面')) desk = text
  else await sleep(700)
}
if (desk === null) { fail('desk-first-screen', { note: '桌面未挂载' }); await browser.settle(); process.exit() }
await record('1-desk-first-screen')
const mattersBefore = await evaluate(`[...document.querySelectorAll('[data-assistant-operating-desk] button.dsha-card')].map(b => (b.textContent ?? '').slice(0, 40))`)
pass('desk-first-screen', { matters: mattersBefore?.length ?? 0 })

// —— 相位 2：选一件事 →「处理这件事」→ 处理会话接管 ——
const picked = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('[data-assistant-operating-desk] button.dsha-card')];
  const card = ${matterHint === '' ? 'cards[0]' : `cards.find(b => (b.textContent ?? '').includes(${JSON.stringify(matterHint)}))`};
  if (card === undefined) return 'no-card';
  card.click(); return (card.textContent ?? '').slice(0, 40);
})()`)
if (picked === 'no-card' || picked === undefined) { fail('matter-detail', { picked, note: '选不到事项（--matter 没匹配？）' }); await browser.settle(); process.exit() }
await sleep(800)
const started = await evaluate(`(() => {
  const button = [...document.querySelectorAll('[data-assistant-operating-desk] button')].find(b => (b.textContent ?? '') === '处理这件事');
  if (button === undefined) return 'no-process-button';
  button.click(); return 'clicked';
})()`)
if (started !== 'clicked') { fail('matter-detail', { picked, started }); await browser.settle(); process.exit() }
let conversation = false
for (let i = 0; i < 60 && !conversation; i++) {
  conversation = await evaluate(`document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`) === true
  if (!conversation) await sleep(500)
}
if (!conversation) { fail('processing-session', { picked, note: '处理会话没接管主区' }); await browser.settle(); process.exit() }
const idle = await waitIdle()
await record('2-processing-session')
pass('processing-session', { picked, idle })

// —— 相位 2b：手动回桌面 → 再点同一件事「处理」→ 复用绑定会话 + 续接种子（Q11，2026-10-12 确认）——
// 此刻路径仍绑定（回合刚落定、返回判定还没跑）：侧栏手动回桌面不碰路径，再点同一件事的
// 「处理」是明确的续接意图——应重开同一会话并带 [面板] 续接种子，模型重新读台账交包，
// 不凭对话旧印象作答。普通侧栏打开旧聊天不在此相位（那不该播报）。
{
  const deskNav = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').includes('桌面')); if (b === undefined) return 'no-desk-button'; b.click(); return 'clicked'; })()`)
  let deskBack = false
  for (let i = 0; i < 40 && !deskBack; i++) {
    deskBack = await evaluate(`document.querySelector('[data-assistant-operating-desk]') !== null`) === true
    if (!deskBack) await sleep(500)
  }
  let resumeOutcome = { deskNav, deskBack, resumed: 'not-tried', resumeClicked: 'not-tried', backInConversation: false, resumeSeeded: false, resumeIdle: false }
  if (deskNav === 'clicked' && deskBack) {
    const resumed = await evaluate(`(() => {
      const cards = [...document.querySelectorAll('[data-assistant-operating-desk] button.dsha-card')];
      const card = ${matterHint === '' ? 'cards[0]' : `cards.find(b => (b.textContent ?? '').includes(${JSON.stringify(matterHint)}))`};
      if (card === undefined) return 'no-card';
      card.click(); return 'picked';
    })()`)
    resumeOutcome.resumed = resumed
    if (resumed === 'picked') {
      await sleep(800)
      resumeOutcome.resumeClicked = await evaluate(`(() => {
        const button = [...document.querySelectorAll('[data-assistant-operating-desk] button')].find(b => (b.textContent ?? '') === '处理这件事');
        if (button === undefined) return 'no-process-button';
        button.click(); return 'clicked';
      })()`)
      for (let i = 0; i < 60 && !resumeOutcome.backInConversation; i++) {
        resumeOutcome.backInConversation = await evaluate(`document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`) === true
        if (!resumeOutcome.backInConversation) await sleep(500)
      }
      if (resumeOutcome.backInConversation) {
        resumeOutcome.resumeIdle = await waitIdle()
        await record('2b-resume-reopen')
        const resumeText = String(await evaluate('document.body.innerText') ?? '')
        resumeOutcome.resumeSeeded = resumeText.includes('[面板] 继续处理')
      }
    }
  }
  if (resumeOutcome.backInConversation && resumeOutcome.resumeSeeded && resumeOutcome.resumeIdle) {
    pass('resume-reopen', { seeded: true, idle: true })
  } else {
    fail('resume-reopen', resumeOutcome)
    // 不退出：后面的进展臂照走，素材仍有价值。
  }
}

// —— 相位 3：说一句进展 → 回合跑完 → 桌面回没回（并核「回来 ⇒ 无待确认」的不变量） ——
if (await pasteAndSend(say) !== 'sent') { fail('say-turn', { note: '发送失败' }); await browser.settle(); process.exit() }
let settled = false
for (let i = 0; i < 300 && !settled; i++) {
  await sleep(500)
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次'); b?.click(); })()`)
  settled = await evaluate(turnRunning) === false
}
await sleep(2500)
const returnedText = await evaluate(deskText)
const returned = returnedText !== null
await record(returned ? '3-returned-to-desk' : '3-stayed-in-conversation')
pass('say-turn', { settled, returned })

// 不变量（给 --home 才核）：桌面回来了 ⇒ 该 home 的账本里没有 pending 提案。
// 「留在对话」不判失败——那是「有东西等你」的正确形态；脚本把待确认项如实报出来。
if (returned && home !== undefined) {
  const ledgerPath = join(home, 'assistant-operating', 'ledger.json')
  if (existsSync(ledgerPath)) {
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
    const pending = Object.values(ledger.matters ?? {}).flatMap(matter =>
      (matter.proposals ?? []).filter(proposal => proposal.status === 'pending').map(proposal => ({ matter: matter.id, proposal: proposal.id })))
    if (pending.length > 0) fail('return-invariant', { note: '桌面回来了，但账本还有 pending 提案', pending })
    else pass('return-invariant', { pending: 0 })
  }
} else if (!returned) {
  verdict.stayedWithPendingText = String(returnedText ?? (await evaluate('document.body.innerText')) ?? '').slice(0, 400)
}

// —— 相位 4：交代臂 ——「＋ 交代新事项」→ 说一件新事 → 返回并选中**新**事项 ——
if (!skipIntake) {
  if (!returned) {
    // 还留在对话里就先手动回桌面（走查工具不去猜怎么回；这一步如实记录）
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').includes('桌面')); b?.click(); })()`)
    for (let i = 0; i < 40; i++) { await sleep(500); if (await evaluate(deskText) !== null) break }
  }
  // 身份按**账本 id** 判（标题可能撞车：同一次走查重复说同一件事时，模型会照样新建一件事，
  // 而标题与上一次那条几乎一样——2026-10-11 首跑就是这样把「新建成功」误判成「没新建」）。
  const ledgerIds = () => {
    if (home === undefined) return undefined
    const path = join(home, 'assistant-operating', 'ledger.json')
    if (!existsSync(path)) return undefined
    const ledger = JSON.parse(readFileSync(path, 'utf8'))
    return Object.values(ledger.matters ?? {}).map(matter => ({ id: matter.id, title: String(matter.title ?? '') }))
  }
  const beforeIds = ledgerIds()
  const opened = await evaluate(`(() => {
    const button = [...document.querySelectorAll('[data-assistant-operating-desk] button')].find(b => (b.textContent ?? '').includes('交代新事项'));
    if (button === undefined) return 'no-intake-button';
    button.click(); return 'clicked';
  })()`)
  if (opened !== 'clicked') { fail('intake-entry', { opened }); await browser.settle(); process.exit() }
  let intakeConversation = false
  for (let i = 0; i < 60 && !intakeConversation; i++) {
    intakeConversation = await evaluate(`document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`) === true
    if (!intakeConversation) await sleep(500)
  }
  if (!intakeConversation) { fail('intake-entry', { opened, note: '交代入口没开会话' }); await browser.settle(); process.exit() }
  await waitIdle(60)
  if (await pasteAndSend(entrust) !== 'sent') { fail('intake-entry', { note: '交代消息发送失败' }); await browser.settle(); process.exit() }
  let intakeReturned = null
  for (let i = 0; i < 300 && intakeReturned === null; i++) { await sleep(500); intakeReturned = await evaluate(deskText) }
  if (intakeReturned === null) { fail('intake-return', { note: '交代后没有返回桌面' }); await browser.settle(); process.exit() }
  const selected = String(await evaluate(`(() => {
    const card = document.querySelector('[data-assistant-operating-desk] button.dsha-card[data-selected="true"]');
    return card === null ? null : (card.textContent ?? '');
  })()`) ?? '')
  await record('4-intake-returned')
  const afterIds = ledgerIds()
  if (beforeIds !== undefined && afterIds !== undefined) {
    const before = new Set(beforeIds.map(matter => matter.id))
    const created = afterIds.filter(matter => !before.has(matter.id))
    // 断言：交代产生了新事项，且返回时选中的就是它（按标题精确匹配账本里的新事项）。
    const matched = created.find(matter => matter.title !== '' && selected.includes(matter.title))
    if (created.length === 0) {
      // 模型判定这是既有事项（没新建）——那是它对本人话的读法，不是接线失败，如实报出来。
      pass('intake-return', { created: [], selected: selected.slice(0, 40), note: '模型判定为既有事项，未新建' })
    } else if (matched !== undefined) {
      pass('intake-return', { created: created.map(matter => matter.id), selected: matched.id })
    } else {
      fail('intake-return', { created, selected, note: '返回后选中的不是这次新建的事项' })
    }
  } else {
    // 没有 --home 就拿不到身份：只报现象，不判（标题前缀判定会误报）。
    pass('intake-return', { selected: selected.slice(0, 40), note: '未给 --home，只报现象（身份未核）' })
  }
}

writeFileSync(join(outDir, 'verdict.json'), JSON.stringify(verdict, null, 2))
verdict.consoleProblems = consoleProblems.slice(0, 10)
verdict.exceptions = exceptions.slice(0, 10)
console.log(JSON.stringify(verdict, null, 2))
if (Object.values(verdict.phases).some(phase => phase.pass === false)) process.exitCode = 1
await browser.settle()
