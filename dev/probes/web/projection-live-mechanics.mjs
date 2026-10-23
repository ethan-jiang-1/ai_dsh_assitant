#!/usr/bin/env node
// K1/K2 已接受限制清单的 live 补证探针（规格卡 2026-10-06-desk-operating-entry ②③④⑧）。
//
// 一次运行覆盖四项（相位 verdict 逐项落 JSON，任一失败 exit 1）：
//   ② live Connection 断连/恢复——CDP 离线仿真：断连横幅出现 → 恢复在线 → 重连刷新、横幅消失、事项可见。
//   ③ 重载前后 Session 数量审计——磁盘会话数在 3 次页面重载前后相等（不增殖）。
//   ④ 窄视口逐项——420x900（容器查询驱动单 pane）：点击进详情 → 「返回事项列表」导航 →
//      选择保留；resize 回宽区面板存活；窄区无横向溢出；**所选事项从投影消失/回来**时
//      详情如实说它不在（不静默退回列表、不错显示别的事项），回来后选择仍指着同一条。
//   ⑧ 滚动位置保留——桌面根（真正的滚动容器）滚动后经面板卸载重挂（会话视图往返），
//      位置由 view store 恢复（记录＝根 onScroll，恢复＝根 ref 的渲染后 DOM 效应）。
//
// 自包含编排：共享探针 home（默认 <repo>/.tmp/probe-home/k4-probe-home，需跑过 prepare/setup）种子为
// eight-matters 固定夹具（无 ledger → fixture 态；desk-process-e2e 重放 ledger 时不冲突——
// ledger 优先）。无回放、无模型回合；服务直连 vendor CLI bin（启动器层会让 SIGTERM
// 孤儿化真服务，writer.lock 教训见 desk-process-e2e 头注）。
//
// Usage（repo 根）:
//   node dev/probes/web/projection-live-mechanics.mjs [--home <dir>] [--keep-service]
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpDir } from '../../env/tmp.mjs'
import { sessionSnapshot, sessionsCreatedBetween } from '../../lib/session-logs.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { option, sleep } from './probe-utils.mjs'
import { clickByText, deskText, openBoard, pollUntil } from './dialogue.mjs'
import { countSessions, registerProbeTeardown, startProbeService, stopStaleProbeServices } from './probe-service.mjs'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const fixture = join(repoRoot, 'dev', 'fixtures', 'desk-projection', 'eight-matters.json')

const args = process.argv.slice(2)
const home = option(args, 'home', join(tmpDir('probe-home'), 'k4-probe-home'))
const keepService = args.includes('--keep-service')

const verdict = { probe: 'projection-live-mechanics', home, phases: {}, sessionId: null, createdSessions: [] }
// 会话指针（审计 261020 #20）：相位 4 的会话视图往返会新建会话——差集取（sessionSnapshot），
// 不猜「最新目录」（并行会话下会指错）；fail() 里也落一次，半途红的判决同样带指针。
// 命名避开相位 6 的 sessionsBefore/sessionsAfter（那是重载审计的磁盘计数）。
const sessionsAtStart = sessionSnapshot(home)
const recordSessions = () => {
  const created = sessionsCreatedBetween(sessionsAtStart, sessionSnapshot(home))
  verdict.createdSessions = created
  verdict.sessionId = created.length === 1 ? created[0] : null
}
const pass = (phase, detail) => { verdict.phases[phase] = { pass: true, ...detail } }
const fail = (phase, detail) => {
  recordSessions()
  verdict.phases[phase] = { pass: false, ...detail }
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}

if (!existsSync(fixture)) throw new Error(`fixture missing: ${fixture}`)
if (!existsSync(join(home, 'profiles'))) throw new Error(`probe home not set up: ${home}`)

// —— 编排：清旧服务（共享 home 的 pid 登记单点在 probe-service.mjs）→ 种子夹具态 → 起服务 ——
stopStaleProbeServices(home)
const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
// fixture 态：无 ledger（有则移走），固定模拟资料在场。
rmSync(join(operatingDir, 'ledger.json'), { force: true })
copyFileSync(fixture, join(operatingDir, 'desk-projection.json'))

const { service, url, pidFile } = await startProbeService({ repoRoot, home, pidName: '.projection-live-mechanics.pid' })
verdict.url = url

let browser = undefined
const teardown = registerProbeTeardown({ service, pidFile, getBrowser: () => browser, keepService })

browser = await launchCdpBrowser({ url, windowSize: '1280,800' })
if (browser.failed !== undefined) {
  teardown()
  verdict.error = browser.failed
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
const { evaluate, setViewport, setNetworkOffline, consoleProblems, exceptions } = browser
const deskRootState = `(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  return root === null ? null : { scrollTop: root.scrollTop, scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
})()`

// 相位 1：从一页纸进完整看板（夹具态）。
const boardEntry = await openBoard(evaluate, sleep)
if (boardEntry !== 'board' && boardEntry !== 'already') fail('board-entry', { boardEntry })
const deskReady = await pollUntil(evaluate, deskText, {
  intervalMs: 700, budget: 120, checkFirst: true,
  isDone: text => text !== null && text.includes('回款 A') && text.includes('模拟资料'),
})
if (deskReady === null || !deskReady.includes('回款 A')) { teardown(); fail('boot-fixture', { waitedMs: 84000 }) }
// ① 的精确 request URL 半边：投影下载的真实请求 URL（相对 baseURI 解析后的完整地址），
// 直接记入判决——子路径挂载半边属平台部署关切（vendor 无挂载配置面），维持已接受限制。
const projectionRequestUrl = await evaluate(`(() => {
  const entry = performance.getEntriesByType('resource').find(e => e.name.includes('desk-projection'));
  return entry === undefined ? null : entry.name;
})()`)
if (projectionRequestUrl === null || !projectionRequestUrl.includes('/api/assistant/desk-projection')) {
  teardown(); fail('projection-request-url', { projectionRequestUrl })
}
pass('boot-fixture', { projectionRequestUrl })

// 相位 2（④ 窄视口）：420x900 单 pane——点击进详情 → 返回导航 → 选择保留 → 无横向溢出。
await setViewport(420, 900)
await sleep(1200)
const narrowText = await pollUntil(evaluate, deskText, { checkFirst: true, budget: 20, isDone: text => text !== null })
if (narrowText === null) { teardown(); fail('narrow-boot', {}) }
const narrowClicked = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('回款 A'));
  if (button === undefined) return 'card-not-found';
  button.click(); return 'selected';
})()`)
if (narrowClicked !== 'selected') { teardown(); fail('narrow-select', { narrowClicked }) }
await sleep(600)
const narrowDetail = await evaluate(deskText)
if (narrowDetail === null || !narrowDetail.includes('返回事项列表') || !narrowDetail.includes('处理这件事')) {
  teardown(); fail('narrow-detail', { text: String(narrowDetail).slice(0, 300) })
}
const backNav = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const back = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '') === '返回事项列表');
  if (back === undefined) return 'back-not-found';
  back.click(); return 'returned';
})()`)
if (backNav !== 'returned') { teardown(); fail('narrow-back', { backNav }) }
await sleep(600)
const afterBack = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  if (root === null) return null;
  const card = [...root.querySelectorAll('button.dsha-card')].find(b => (b.textContent ?? '').includes('回款 A'));
  return { listBack: card !== undefined, selectionKept: card?.getAttribute('data-selected') === 'true',
    horizontalOverflow: root.scrollWidth > root.clientWidth + 1 };
})()`)
if (afterBack?.listBack !== true || afterBack?.selectionKept !== true) {
  teardown(); fail('narrow-back-state', { afterBack })
}
if (afterBack.horizontalOverflow === true) { teardown(); fail('narrow-overflow', { afterBack }) }
pass('narrow-viewport', { back: true, selectionKept: true, noOverflow: true })

// 相位 2b（④ 子项「所选消失恢复」）：所选事项从投影里消失时，详情如实说它不在，而不是
// 静静地退回列表或错显示别的事项；它回来以后，选择仍然指着同一条（view store 的 selectedId
// 不被一次缺席清掉）。做法是改服务端那份投影资料再点「重新读取」——读者每次真重新下载。
const matterFile = join(operatingDir, 'desk-projection.json')
const fullProjection = readFileSync(fixture, 'utf8')
const selectedAgain = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('回款 A'));
  if (button === undefined) return 'card-not-found';
  button.click(); return 'selected';
})()`)
if (selectedAgain !== 'selected') { teardown(); fail('selection-vanish-select', { selectedAgain }) }
await sleep(600)
const parseFixture = JSON.parse(fullProjection)
const withoutMatter = { ...parseFixture, revision: Number(parseFixture.revision ?? 0) + 1, matters: parseFixture.matters.filter(matter => !String(matter.title).includes('回款 A')) }
writeFileSync(matterFile, JSON.stringify(withoutMatter))
const reloadClicked = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('重新读取'));
  if (button === undefined) return 'reload-not-found';
  button.click(); return 'clicked';
})()`)
if (reloadClicked !== 'clicked') { teardown(); fail('selection-vanish-reload', { reloadClicked }) }
const vanishedText = await pollUntil(evaluate, deskText, {
  budget: 20, isDone: text => text !== null && text.includes('所选事项不在当前投影中'),
})
if (vanishedText === null || !vanishedText.includes('所选事项不在当前投影中')) {
  teardown(); fail('selection-vanish-state', { text: String(vanishedText).slice(0, 300) })
}
const vanishedOverflow = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  return root === null ? null : { horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
    wrongMatter: root.innerText.includes('回款 B') };
})()`)
if (vanishedOverflow === null || vanishedOverflow.horizontalOverflow === true || vanishedOverflow.wrongMatter === true) {
  teardown(); fail('selection-vanish-honesty', { vanishedOverflow })
}
writeFileSync(matterFile, JSON.stringify({ ...parseFixture, revision: Number(parseFixture.revision ?? 0) + 2 }))
await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('重新读取'));
  button?.click(); return 'clicked';
})()`)
const recoveredText = await pollUntil(evaluate, deskText, {
  budget: 20, isDone: text => text !== null && text.includes('处理这件事'),
})
if (recoveredText === null || !recoveredText.includes('回款 A') || !recoveredText.includes('处理这件事')) {
  teardown(); fail('selection-recovery', { text: String(recoveredText).slice(0, 300) })
}
pass('selection-vanish-and-recover', { saidNotInProjection: true, noWrongMatter: true, selectionSurvivedAbsence: true })

// 相位 3（④ resize 存活）：回宽区，面板与选择都活着。
await setViewport(1280, 800)
await sleep(1200)
const wideState = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  if (root === null) return null;
  const card = [...root.querySelectorAll('button.dsha-card')].find(b => (b.textContent ?? '').includes('回款 A'));
  return { deskAlive: root.innerText.includes('回款 A'), selectionKept: card?.getAttribute('data-selected') === 'true' };
})()`)
if (wideState?.deskAlive !== true || wideState?.selectionKept !== true) {
  teardown(); fail('resize-survival', { wideState })
}
pass('resize-survival', wideState)

// 相位 4（⑧ 滚动保留）：根滚动 → 面板卸载重挂（去会话视图再回桌面）→ 位置恢复。
// 视口先压矮（1280x500）：夹具八条在 800px 高度下不溢出（首轮实测 scrollTop 恒 0），
// 压矮后根才有真实可滚空间。
await setViewport(1280, 500)
await sleep(1000)
const scrolled = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  if (root === null) return null;
  root.scrollTop = 600;
  root.dispatchEvent(new Event('scroll'));
  return { recorded: root.scrollTop };
})()`)
await sleep(800)
if (scrolled?.recorded === undefined || scrolled.recorded <= 0) {
  teardown(); fail('scroll-record', { scrolled, note: 'fixture content must overflow the 800px viewport for a scroll position to exist' })
}
// 面板卸载：问助手 → 会话视图；再点侧栏「桌面」回面板（与自动返回同一重挂路径）。
await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const ask = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '') === '有问题？跟助手说');
  if (ask === undefined) return 'ask-not-found';
  ask.click(); return 'asked';
})()`)
const deskGone = await pollUntil(evaluate, `document.querySelector('[data-assistant-operating-desk]') === null`, { checkFirst: true, budget: 20 })
if (deskGone !== true) { teardown(); fail('scroll-unmount', { note: 'conversation view never took over' }) }
await sleep(600)
const returnedToDesk = await evaluate(clickByText('桌面', { notFound: 'desk-button-not-found' }))
if (returnedToDesk !== 'clicked') { teardown(); fail('scroll-remount-nav', { returnedToDesk }) }
const restored = await pollUntil(evaluate, deskRootState, { checkFirst: true, budget: 30, isDone: state => state !== null })
if (restored === null) { teardown(); fail('scroll-remount', { note: 'desk never remounted' }) }
if (Math.abs(restored.scrollTop - scrolled.recorded) > 2) {
  teardown(); fail('scroll-restore', { scrolled: scrolled.recorded, restored: restored.scrollTop })
}
pass('scroll-restore', { recorded: scrolled.recorded, restored: restored.scrollTop })
// 会话视图往返已发生：此刻差集就是本次运行新建的会话（后面相位不再进会话）。
recordSessions()

// 相位 5（② 断连/恢复）：离线 → 断连横幅；恢复在线 → 重连代际变化 → 自动刷新、横幅消失。
await setNetworkOffline(true)
const disconnected = await pollUntil(evaluate, `(() => { const root = document.querySelector('[data-assistant-operating-desk]'); return root !== null && root.innerText.includes('连接已断开') })()`, { checkFirst: true, intervalMs: 700, budget: 30 })
if (disconnected !== true) { teardown(); fail('disconnect-banner', { waitedMs: 21000 }) }
await setNetworkOffline(false)
const recovered = await pollUntil(evaluate, `(() => { const root = document.querySelector('[data-assistant-operating-desk]'); return root !== null && !root.innerText.includes('连接已断开') && root.innerText.includes('回款 A') })()`, { checkFirst: true, intervalMs: 700, budget: 45 })
if (recovered !== true) { teardown(); fail('reconnect-recovery', { waitedMs: 31500 }) }
pass('disconnect-recovery', {})

// 相位 6（③ Session 审计）：三次页面重载，磁盘会话数不变。
// 基线的位置就是这条审计的语义：取在本次运行已经把「会建会话的交互」走完之后
// （相位 4 的会话视图往返会创建全新 home 的第一个会话），之后再数三次重载——重载才是被测对象。
const sessionsBefore = countSessions(home)
for (let round = 0; round < 3; round++) {
  await evaluate('location.reload()')
  const back = await pollUntil(evaluate, `(() => { const root = document.querySelector('[data-assistant-operating-desk]'); return root === null ? null : root.innerText.includes('回款 A') })()`, { checkFirst: true, intervalMs: 700, budget: 40, isDone: value => value !== null })
  if (back !== true) { teardown(); fail('reload-boot', { round }) }
}
const sessionsAfter = countSessions(home)
if (sessionsAfter !== sessionsBefore) {
  teardown(); fail('session-audit', { sessionsBefore, sessionsAfter })
}
pass('session-audit', { reloads: 3, sessionsBefore, sessionsAfter })

// —— 控制台与网络面 ——
// ② 的故意离线必然让平台连接层打「connection lost, retry」警告——这是被测行为自身的
// 预期日志，不是缺陷；白名单只放行这一形状，其余 console 问题照旧致命。
const unexpectedProblems = consoleProblems.filter((line) => !line.includes('connection lost, retry'))
verdict.consoleProblems = consoleProblems
verdict.exceptions = exceptions
teardown()
if (unexpectedProblems.length > 0 || exceptions.length > 0) {
  verdict.unexpectedProblems = unexpectedProblems
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
console.log(`PASS projection live mechanics (K1/K2 ②③④⑧): ${JSON.stringify(verdict.phases)}`)
process.exit(0)
