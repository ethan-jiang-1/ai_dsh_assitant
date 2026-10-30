#!/usr/bin/env node
// M1 多视图首片的 live 走查探针（handoff 261030-m1-verification-plan §四 Phase 3）。
//
// 一次运行覆盖四条真实浏览器路径（相位 verdict 逐项落 JSON，任一失败 exit 1）：
//   A attention 全流程——三 tab 在场 → attention 卡（到期与待确认同显）→ 同件详情
//     （来源/提案/回执同列）→ 详情内滚动不覆写列表 offset → 返回列表 offset 恢复。
//   B 归档分页——运行时合成种子（ledger.json 新窗 61 条 + operations-archive.jsonl 53 条，
//     真实 compaction 形状）：客户端「显示更早」→「读取更早记录」路由翻页 →
//     before 游标单调变老 → 部分页即耗尽、按钮消失。
//   C Activity 条目跳转——流水条目点击 → board 对应事项详情。
//   D 窄屏单 pane——420x900 三 mode 往返、detail 返回恢复 offset、无横向溢出。
//
// 与 projection-live-mechanics 共用共享探针 home 与 pid 登记单（probe-service.mjs）；不带
// fixture patch——ledger.json 是唯一权威（真链路）。种子时间全部相对运行时刻合成，永不过期
// （eight-matters 夹具是 v1 无时间字段，产不出 overdue——handoff §四 Phase 3 注）；产物不入库，
// verdict JSON 落 .tmp/probe-runs/。无回放、无模型回合。
//
// Usage（repo 根）:
//   node dev/probes/web/multiview-live.mjs [--home <dir>] [--keep-service]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpDir } from '../../env/tmp.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { option, sleep } from './probe-utils.mjs'
import { deskText, openBoard, pollUntil } from './dialogue.mjs'
import { registerProbeTeardown, startProbeService, stopStaleProbeServices } from './probe-service.mjs'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const args = process.argv.slice(2)
const home = option(args, 'home', join(tmpDir('probe-home'), 'k4-probe-home'))
const keepService = args.includes('--keep-service')
const verdictPath = join(tmpDir('probe-runs'), 'multiview-live-verdict.json')

const verdict = { probe: 'multiview-live', home, verdictPath, phases: {} }
const writeVerdict = () => writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`)
const pass = (phase, detail) => { verdict.phases[phase] = { pass: true, ...detail } }
const die = (phase, detail) => {
  verdict.phases[phase] = { pass: false, ...detail }
  writeVerdict()
  teardown()
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}

if (!existsSync(join(home, 'profiles'))) throw new Error(`probe home not set up: ${home}`)

// —— 种子：时间相对 now 合成，compaction 形状（老操作在 archive，新窗在 ledger）——
const DAY = 86_400_000
const now = Date.now()
const iso = ms => new Date(ms).toISOString()
const committed = (operationId, matterId, submittedAt, revision) => ({ operationId, matterId, submittedAt, outcome: { status: 'committed', revision } })

const matters = {
  'm-1': {
    id: 'm-1', title: 'NB-02 二期款核对', status: 'active', summary: '等待客户付款凭证', responsible: '财务',
    revision: 102,
    times: { promisedDeadline: iso(now - 3 * DAY) },
    materials: [{ id: 'e-1', source: { sessionId: 's-src', quote: '本周五前到账' }, note: '原承诺：本周五前到账', receivedAt: iso(now - 6 * DAY) }],
    proposals: [{ id: 'p-1', change: { kind: 'reschedule', promisedDeadline: iso(now + 7 * DAY) }, source: { sessionId: 's-propose', quote: '客户希望延后一周' }, proposedAt: iso(now - 3_600_000), status: 'pending' }],
    createdAt: iso(now - 20 * DAY), updatedAt: iso(now - 3_600_000),
  },
  'm-calm': {
    id: 'm-calm', title: '安静推进的事项', status: 'active', summary: '没有到期也没有待确认', responsible: '',
    revision: 1, times: {}, materials: [], proposals: [],
    createdAt: iso(now - 15 * DAY), updatedAt: iso(now - 15 * DAY),
  },
}
const matterIds = ['m-1']
for (let i = 2; i <= 12; i++) {
  const id = `m-${i}`
  matterIds.push(id)
  matters[id] = {
    id, title: `回款跟进 ${i} 号`, status: 'active', summary: '常规跟进', responsible: '财务',
    revision: 1,
    times: { promisedDeadline: iso(now - (3 + i) * DAY) },
    materials: [], proposals: [],
    createdAt: iso(now - (15 + i) * DAY), updatedAt: iso(now - (15 + i) * DAY),
  }
}
matterIds.push('m-calm')

const ledgerOperations = {}
const archiveLines = []
// archive：13 条 create（最老，−20d..−8d）+ 40 条 m-1 update（−4d 起，每小时一条）。
matterIds.forEach((id, index) => {
  const at = iso(now - (20 - index) * DAY)
  archiveLines.push(JSON.stringify({ operation: { kind: 'create', operationId: `op-create-${id}`, title: matters[id].title, source: { sessionId: 's-seed' } }, receipt: committed(`op-create-${id}`, id, at, 1) }))
})
for (let k = 0; k < 40; k++) {
  const opId = `op-old-${k}`
  archiveLines.push(JSON.stringify({ operation: { kind: 'update', operationId: opId, matterId: 'm-1', source: { sessionId: 's-seed' } }, receipt: committed(opId, 'm-1', iso(now - 4 * DAY - k * 3_600_000), 2 + k) }))
}
// ledger 新窗：60 条 m-1 update（−2d 起，每 40 分钟一条）+ 1 条 propose（−1h）。
for (let k = 0; k < 60; k++) {
  const opId = `op-new-${k}`
  ledgerOperations[opId] = { operation: { kind: 'update', operationId: opId, matterId: 'm-1', source: { sessionId: 's-ops' } }, receipt: committed(opId, 'm-1', iso(now - 2 * DAY - k * 2_400_000), 42 + k) }
}
ledgerOperations['op-propose-1'] = {
  operation: { kind: 'propose', operationId: 'op-propose-1', matterId: 'm-1', change: { kind: 'reschedule', promisedDeadline: iso(now + 7 * DAY) }, source: { sessionId: 's-propose', quote: '客户希望延后一周' } },
  receipt: { operationId: 'op-propose-1', matterId: 'm-1', submittedAt: iso(now - 3_600_000), outcome: { status: 'proposed', proposalId: 'p-1' } },
}

const ledger = {
  version: 1,
  matters,
  operations: ledgerOperations,
  operationCount: 13 + 40 + 60 + 1,
  unclaimed: {},
  nextMatterSeq: 14,
  nextUnclaimedSeq: 1,
}

// —— 编排：清旧服务 → 种子 → 起服务（无 fixture patch，ledger 优先）——
stopStaleProbeServices(home)
const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
writeFileSync(join(operatingDir, 'ledger.json'), `${JSON.stringify(ledger)}\n`)
writeFileSync(join(operatingDir, 'operations-archive.jsonl'), `${archiveLines.join('\n')}\n`)

let browser = undefined
const { service, url, pidFile } = await startProbeService({ repoRoot, home, pidName: '.multiview-live.pid' })
verdict.url = url
const teardown = registerProbeTeardown({ service, pidFile, getBrowser: () => browser, keepService })

browser = await launchCdpBrowser({ url, windowSize: '1280,800' })
if (browser.failed !== undefined) { teardown(); verdict.error = browser.failed; writeVerdict(); console.log(JSON.stringify(verdict, null, 2)); process.exit(1) }
const { evaluate, setViewport, consoleProblems, exceptions } = browser

// —— 浏览器侧求值片段 ——
const clickTab = label => `(() => {
  const tab = [...document.querySelectorAll('[role="tab"]')].find(b => (b.textContent ?? '').includes('${label}'))
  if (tab === undefined) return 'tab-not-found'
  tab.click(); return 'clicked'
})()`
const clickButtonWithText = needle => `(() => {
  const root = document.querySelector('[data-assistant-operating-desk]')
  const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('${needle}'))
  if (button === undefined) return 'button-not-found'
  button.click(); return 'clicked'
})()`
const entryCount = `document.querySelectorAll('button.dsha-activity-entry').length`
const deskState = `(() => {
  const root = document.querySelector('[data-assistant-operating-desk]')
  return root === null ? null : { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
})()`
const receiptRequestBefores = `(() => performance.getEntriesByType('resource')
  .filter(entry => entry.name.includes('operating-receipts'))
  .map(entry => { const match = entry.name.match(/before=([^&]+)/); return match === null ? null : decodeURIComponent(match[1]) })
  .filter(value => value !== null))()`

// —— 启动：进看板，种子在板（hero 在列表，三 tab 在场）——
const boardEntry = await openBoard(evaluate, sleep)
if (boardEntry !== 'board' && boardEntry !== 'already') die('board-entry', { boardEntry })
const deskReady = await pollUntil(evaluate, deskText, {
  intervalMs: 700, budget: 120, checkFirst: true,
  isDone: text => text !== null && text.includes('NB-02 二期款核对') && text.includes('全部事项'),
})
if (deskReady === null) die('boot-seed', { waitedMs: 84_000 })

// —— 相位 A：attention 全流程（压矮视口让列表真溢出，offset 恢复才非平凡）——
await setViewport(1280, 500)
await sleep(800)
if (await evaluate(clickTab('关注')) !== 'clicked') die('attention-tab', {})
const attentionText = await pollUntil(evaluate, deskText, { checkFirst: true, budget: 20, isDone: text => text !== null && text.includes('现在值得看') })
if (attentionText === null || !attentionText.includes('尚无完成结果') || !attentionText.includes('另有 1 条待确认') || !attentionText.includes('NB-02 二期款核对')) {
  die('attention-signals', { seen: String(attentionText).slice(0, 400) })
}
const threeTabs = await evaluate(`[...document.querySelectorAll('[role="tab"]')].map(b => (b.textContent ?? '').trim()).join('|')`)
if (threeTabs !== '关注|全部事项|流水') die('three-tabs', { threeTabs })
const scrolled = await evaluate(`(() => {
  const viewport = document.querySelector('.dsha-viewport')
  if (viewport === null) return null
  viewport.scrollTop = 260
  viewport.dispatchEvent(new Event('scroll'))
  return viewport.scrollTop
})()`)
await sleep(500)
if (scrolled === null || scrolled <= 0) die('attention-scroll-record', { scrolled })
if (await evaluate(clickButtonWithText('NB-02 二期款核对')) !== 'clicked') die('attention-open', {})
const detailText = await pollUntil(evaluate, deskText, { checkFirst: true, budget: 20, isDone: text => text !== null && text.includes('这件事的记录') })
if (detailText === null || !detailText.includes('来源材料') || !detailText.includes('变更提案') || !detailText.includes('待本人确认 · 尚未生效') || !detailText.includes('原承诺：本周五前到账') || !detailText.includes('更新事项')) {
  die('attention-detail-content', { seen: String(detailText).slice(0, 400) })
}
const detailScroll = await evaluate(`(() => {
  const viewport = document.querySelector('.dsha-viewport')
  viewport.scrollTop = 520
  viewport.dispatchEvent(new Event('scroll'))
  return viewport.scrollTop
})()`)
await sleep(500)
if (detailScroll === null || detailScroll <= 0) die('detail-scroll-record', { detailScroll })
if (await evaluate(clickTab('关注')) !== 'clicked') die('attention-back-tab', {})
const restored = await pollUntil(evaluate, `(() => { const v = document.querySelector('.dsha-viewport'); return v === null ? null : v.scrollTop })()`, { checkFirst: true, budget: 20, isDone: value => value !== null && Math.abs(value - scrolled) <= 2 })
if (restored === null) die('attention-offset-restore', { scrolled, note: 'attention list offset must survive detail detour via the tab path (wide mode)' })
const backPane = await evaluate(`(() => { const s = document.querySelector('.dsha-matters'); return s === null ? null : s.getAttribute('data-mode') + '/' + s.getAttribute('data-pane') })()`)
if (backPane !== 'attention/list') die('attention-back-pane', { backPane })
pass('attention-flow', { scrolled, restored, detailScroll, timelineComplete: true })

// —— 相位 B：归档分页（reveal 窗口作用于合并列表：50 → 「显示更早」61 → 路由页取回 50、
// 显示 100 → 「显示更早」放完 111 → 第二页余 3 → 114 耗尽、按钮消失）——
if (await evaluate(clickTab('流水')) !== 'clicked') die('activity-tab', {})
const initialCount = await pollUntil(evaluate, entryCount, { checkFirst: true, budget: 20, isDone: count => count === 50 })
if (initialCount !== 50) die('activity-window', { expected: 50, initialCount })
if (await evaluate(clickButtonWithText('显示更早')) !== 'clicked') die('activity-reveal-more', {})
const revealedCount = await pollUntil(evaluate, entryCount, { checkFirst: true, budget: 20, isDone: count => count === 61 })
if (revealedCount !== 61) die('activity-revealed', { expected: 61, revealedCount })
if (await evaluate(clickButtonWithText('读取更早记录')) !== 'clicked') die('archive-first-click', {})
const afterFirstPage = await pollUntil(evaluate, entryCount, { checkFirst: true, budget: 30, isDone: count => count === 100 })
if (afterFirstPage !== 100) die('archive-first-page', { expected: 100, afterFirstPage })
if (await evaluate(clickButtonWithText('显示更早')) !== 'clicked') die('archive-reveal-fetched', {})
const fullyRevealed = await pollUntil(evaluate, entryCount, { checkFirst: true, budget: 20, isDone: count => count === 111 })
if (fullyRevealed !== 111) die('archive-fully-revealed', { expected: 111, fullyRevealed })
if (await evaluate(clickButtonWithText('读取更早记录')) !== 'clicked') die('archive-second-click', {})
const exhausted = await pollUntil(evaluate, `(() => {
  const root = document.querySelector('[data-assistant-operating-desk]')
  const more = [...(root?.querySelectorAll('button') ?? [])].some(b => (b.textContent ?? '').includes('读取更早记录'))
  return more ? null : document.querySelectorAll('button.dsha-activity-entry').length
})()`, { checkFirst: true, budget: 30, isDone: value => value === 114 })
if (exhausted !== 114) die('archive-exhausted', { expected: 114, exhausted })
const befores = await evaluate(receiptRequestBefores)
const instants = befores.map(value => Date.parse(value))
const monotonicOlder = instants.every((value, index) => index === 0 || value < instants[index - 1])
if (befores.length < 2 || !monotonicOlder) die('archive-cursor', { befores })
pass('archive-paging', { initialCount, revealedCount, afterFirstPage, fullyRevealed, exhausted: true, archiveRequests: befores.length, cursorStrictlyOlder: monotonicOlder })

// —— 相位 C：流水条目跳转（条目按钮 → board 对应事项详情）——
const jumpTarget = await evaluate(`(() => {
  const entry = [...document.querySelectorAll('button.dsha-activity-entry')].find(b => (b.textContent ?? '').includes('NB-02 二期款核对'))
  if (entry === undefined) return 'entry-not-found'
  entry.click(); return 'clicked'
})()`)
if (jumpTarget !== 'clicked') die('activity-jump-click', { jumpTarget })
const jumped = await pollUntil(evaluate, `(() => {
  const section = document.querySelector('.dsha-matters')
  if (section === null) return null
  return section.getAttribute('data-mode') + '/' + section.getAttribute('data-pane') + '/' + String(document.querySelector('[data-assistant-operating-desk]')?.innerText.includes('这件事的记录'))
})()`, { checkFirst: true, budget: 20, isDone: value => value !== null && value === 'board/detail/true' })
if (jumped !== 'board/detail/true') die('activity-jump-state', { jumped })
pass('activity-jump', { jumped })

// —— 相位 D：窄屏单 pane（420x900 三 mode 往返 + detail 返回恢复 + 无横向溢出）——
await setViewport(420, 900)
await sleep(900)
for (const label of ['关注', '全部事项', '流水']) {
  if (await evaluate(clickTab(label)) !== 'clicked') die(`narrow-tab-${label}`, {})
  await sleep(400)
  const state = await evaluate(deskState)
  if (state === null || state.scrollWidth > state.clientWidth + 1) die('narrow-overflow', { label, state })
}
if (await evaluate(clickTab('关注')) !== 'clicked') die('narrow-attention-tab', {})
const narrowScrolled = await evaluate(`(() => {
  const viewport = document.querySelector('.dsha-viewport')
  if (viewport === null) return null
  viewport.scrollTop = 200
  viewport.dispatchEvent(new Event('scroll'))
  return viewport.scrollTop
})()`)
await sleep(500)
if (narrowScrolled === null || narrowScrolled <= 0) die('narrow-scroll-record', { narrowScrolled })
if (await evaluate(clickButtonWithText('NB-02 二期款核对')) !== 'clicked') die('narrow-open', {})
const narrowDetail = await pollUntil(evaluate, `(() => {
  const section = document.querySelector('.dsha-matters')
  if (section === null) return null
  const list = section.querySelector('.dsha-matter-list')
  const back = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').includes('返回「关注」'))
  return section.getAttribute('data-pane') + '/' + String(list === null || getComputedStyle(list).display === 'none') + '/' + String(back !== null)
})()`, { checkFirst: true, budget: 20, isDone: value => value !== null && value === 'detail/true/true' })
if (narrowDetail !== 'detail/true/true') die('narrow-single-pane', { narrowDetail })
if (await evaluate(clickButtonWithText('返回「关注」')) !== 'clicked') die('narrow-back-click', {})
const narrowRestored = await pollUntil(evaluate, `(() => { const v = document.querySelector('.dsha-viewport'); return v === null ? null : v.scrollTop })()`, { checkFirst: true, budget: 20, isDone: value => value !== null && Math.abs(value - narrowScrolled) <= 2 })
if (narrowRestored === null) die('narrow-offset-restore', { narrowScrolled })
const narrowState = await evaluate(deskState)
if (narrowState === null || narrowState.scrollWidth > narrowState.clientWidth + 1) die('narrow-back-overflow', { narrowState })
pass('narrow-roundtrip', { narrowScrolled, narrowRestored, noOverflow: true })

// —— 控制台与网络面：M1 路径无故意离线，任何 console 问题都致命 ——
verdict.consoleProblems = consoleProblems
verdict.exceptions = exceptions
verdict.verdictFile = verdictPath
teardown()
writeVerdict()
if (consoleProblems.length > 0 || exceptions.length > 0) {
  verdict.unexpectedProblems = [...consoleProblems, ...exceptions]
  writeVerdict()
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
console.log(`PASS multiview live (M1 attention/archive/jump/narrow): ${JSON.stringify(verdict.phases)}\nverdict: ${verdictPath}`)
process.exit(0)
