#!/usr/bin/env node
// 桌面受理车道的行为判决（261018 desk-side-capture 片 2，验收表行 8 的真实车道）。
//
// 为什么存在：受理位的默认行为是模型可见面（operating-brief 的 desk capture lane 段）——
// 合同测试只证段落在场；"含糊话 → 默认 note→retained + 同回合 ack + 需要选择时走 question
// 交互、绝不直接立项"只有让一次真实投递跑过才知道。eval 任务 desk-capture-note 给行为地板
// （headless 无 [桌面] 车道，prompt 直带标记模拟）；本探针走**真车道**：真点受理位、真投递、
// 真回合、真账本读回。
//
// 判据（红的形态对照验收表）：
//   直接立项 = 红   → 账本 matters 数不变（种子 2 件）；toolCalls 无 `entrust`
//   无 ack   = 红   → answerText 非空
//   只在正文问 = 红 → toolCalls 含 ask 族 或 事件流含 pendingInteraction（探针话术里
//                     立项选择真实在桌上：到期日＋待定决策）
//   逐字落账      → ledger.json 含投递原文（quote 逐字）；来源会话可重建（操作落在
//                     投递目标会话的日志里）
//
// Usage（repo 根）: node dev/probes/web/desk-capture-live.mjs [--home <dir>] [--keep-service]
// 前置：`pnpm build` 当前。判定输出 JSON verdict；任一判据失败 exit 1。
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'
import { readEvents, sessionLogs } from '../../lib/session-logs.mjs'
import { observe } from '../../eval/run.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { clickByText, deskPresent, deskText, pollUntil } from './dialogue.mjs'
import { option } from './probe-utils.mjs'
import { registerProbeTeardown, startProbeService, stopStaleProbeServices } from './probe-service.mjs'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const devHome = resolve(repoRoot, 'dev', 'harness-home')
const args = process.argv.slice(2)
const homeArg = option(args, 'home', undefined)
const keepService = args.includes('--keep-service')

const CAPTURE_LINE = '北边的仓库月底到期，租金可能涨'
const verdict = { probe: 'desk-capture-live', phases: {}, consoleProblems: [], exceptions: [] }
// 走查产物落点（片 4）：在途条在场与结果接管两帧，供人判话术与层级。
import { tmpDir } from '../../env/tmp.mjs'
const shotDir = tmpDir('shots')
mkdirSync(shotDir, { recursive: true })
const pass = (phase, detail) => { verdict.phases[phase] = { pass: true, ...detail } }
const fail = (phase, detail) => {
  verdict.phases[phase] = { pass: false, ...detail }
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}

// ── 一次性 home（setup + 凭据 0600）——desk-daily-brief-live 同一口径。
let home = homeArg !== undefined ? resolve(homeArg) : undefined
if (home === undefined) {
  home = mkTmpDir('capture-web', 'home-')
  execFileSync('bash', [join(repoRoot, 'dev', 'env', 'setup.sh')], {
    cwd: repoRoot, env: { ...process.env, ASSISTANT_DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  const credentials = join(devHome, '.credentials.yaml')
  if (!existsSync(credentials)) throw new Error('no credential store at dev/harness-home/.credentials.yaml')
  copyFileSync(credentials, join(home, '.credentials.yaml'))
  execFileSync('chmod', ['600', join(home, '.credentials.yaml')])
}
if (!existsSync(join(home, 'profiles'))) throw new Error(`probe home not set up: ${home}`)

const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
const seedLedger = JSON.parse(readFileSync(join(repoRoot, 'dev', 'fixtures', 'desk-process', 'seed-ledger.json'), 'utf8'))
writeFileSync(join(operatingDir, 'ledger.json'), JSON.stringify(seedLedger, null, 2))
const mattersBefore = Object.keys(seedLedger.matters).length
const ledgerPath = join(operatingDir, 'ledger.json')

await stopStaleProbeServices(home)
// Turn-level baseline: the capture lane delivers into the current (or a fresh) session —
// count turn/end per log and diff, exactly like the unattended probe.
const turnBaseline = new Map()
for (const log of sessionLogs(home)) {
  const events = await readEvents(log)
  turnBaseline.set(log, { length: events.length, turnEnds: settledCount(events) })
}
// A turn that ends in the question interaction NEVER writes turn/end until answered —
// and that ask is exactly the 片-2 success shape. So "settled" = a turn/end OR an ask-family
// tool call; the baseline counts both and the diff exposes the new turn's slice.
const isAskCall = event => event.type === 'tool/call' && /ask/i.test(String(event.data?.name ?? event.data?.tool ?? ''))
const settledCount = events => events.filter(e => e.type === 'turn/end').length + events.filter(isAskCall).length
const findNewTurn = async () => {
  for (const log of sessionLogs(home)) {
    const events = await readEvents(log)
    const base = turnBaseline.get(log)
    const signals = settledCount(events)
    if (base === undefined) {
      if (signals > 0) return { log, events }
    } else if (signals > base.turnEnds) {
      return { log, events: events.slice(base.length) }
    }
  }
  return undefined
}

let browser = undefined
const { service, url, pidFile } = await startProbeService({ repoRoot, home, pidName: '.desk-capture-live.pid' })
const teardown = registerProbeTeardown({ service, pidFile, getBrowser: () => browser, keepService })
try {
  browser = await launchCdpBrowser({ url, evaluateTimeoutMs: 30_000 })
  if (browser.failed !== undefined) fail('browser', { error: browser.failed })
  const { evaluate, consoleProblems, exceptions } = browser
  verdict.consoleProblems = consoleProblems.slice(0, 10)
  verdict.exceptions = exceptions.slice(0, 10)

  const deskReady = await pollUntil(evaluate, deskText, { intervalMs: 700, budget: 120, checkFirst: true, isDone: text => text !== null && text.includes('合同 NB-02') })
  if (deskReady === null) fail('desk-mount', { lastState: String(deskReady).slice(0, 200) })
  pass('desk-mount', {})

  // ── 投递：受理位输入含糊话（立项选择真实在桌上）→ 点「交给助手」。
  const typed = await evaluate(`(() => {
    const input = document.querySelector('.dsha-capture-input');
    if (input === null) return 'input-not-found';
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(CAPTURE_LINE)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'typed';
  })()`)
  if (typed !== 'typed') fail('capture-type', { typed })
  if (await evaluate(clickByText('交给助手')) !== 'clicked') fail('capture-click', {})
  pass('capture-sent', { line: CAPTURE_LINE })
  await new Promise(resolve => setTimeout(resolve, 800))
  writeFileSync(join(shotDir, 'desk-capture-inflight.png'), await browser.captureScreenshot())

  // ── 等回合（capture 车道不切主区，轮询日志差分）。
  const turnStarted = Date.now()
  const delivery = await (async () => {
    const deadline = Date.now() + 300_000
    while (Date.now() < deadline) {
      const found = await findNewTurn()
      if (found !== undefined) return found
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    return undefined
  })()
  if (delivery === undefined) fail('capture-turn', { hint: 'no fresh settled turn within 300s', waitedMs: Date.now() - turnStarted })
  pass('capture-turn', { seconds: Math.round((Date.now() - turnStarted) / 1000) })

  // ── 判据。
  const seen = observe(delivery.events)
  const calledNames = seen.toolCalls.map(call => String(call.name ?? ''))
  // The ack may ride INSIDE the question payload ("这条我先按原话记下了…要不要立项？") —
  // folding ack+question into one interaction is a same-turn acknowledgement; only silence is red.
  const askCall = delivery.events.find(isAskCall)
  const askPayload = askCall === undefined ? '' : JSON.stringify(askCall.data ?? {})
  const acknowledged = String(seen.answerText ?? '').trim() !== '' || askPayload.length > 40
  if (!acknowledged) fail('ack', { hint: 'no acknowledgement in the same turn', called: calledNames.slice(0, 8) })
  const ledgerAfter = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  const mattersAfter = Object.keys(ledgerAfter.matters ?? {}).length
  // The desk card shows the fragment's NOTE (may be a paraphrase), not the verbatim quote — the
  // takeover proof uses the new card's own note prefix, not the captured line.
  const newUnclaimed = Object.entries(ledgerAfter.unclaimed ?? {})
    .find(([id]) => seedLedger.unclaimed?.[id] === undefined)
  const fragmentNeedle = String(newUnclaimed?.[1]?.note ?? newUnclaimed?.[1]?.source?.quote ?? '').slice(0, 10)
  if (fragmentNeedle === '') fail('verbatim-note', { hint: 'new unclaimed fragment has no text to look for on the desk' })
  if (mattersAfter !== mattersBefore) fail('no-direct-matter', { before: mattersBefore, after: mattersAfter, hint: '直接立项 = 红' })
  const entrustCalled = calledNames.some(name => name === 'entrust' || name.includes('entrust'))
  if (entrustCalled) fail('no-direct-entrust', { called: calledNames.slice(0, 8), hint: 'tool-level entrust on a captured line = 红' })
  const ledgerText = JSON.stringify(ledgerAfter)
  if (!ledgerText.includes(CAPTURE_LINE)) fail('verbatim-note', { hint: 'captured line not found verbatim in the ledger' })
  const askSignal = calledNames.some(name => /ask/i.test(name))
    || delivery.events.some(event => JSON.stringify(event.data ?? {}).includes('pendingInteraction'))
  if (!askSignal) fail('proper-question', { called: calledNames.slice(0, 8), hint: ' promotion choice exists on this line; asking in prose only = 红' })
  pass('red-line-and-note', {
    called: calledNames.slice(0, 10),
    answerHead: String(seen.answerText ?? '').slice(0, 140),
    matters: `${mattersBefore}→${mattersAfter}`,
  })
  // 桌面回读（261019, BUG-022）：在途条让位于账本实况的判据必须是"新片段可见 + 在途条消失"，
  // 不能在种子本来就含"待认领"时拍一张早帧。旧断言只找"待认领"，截图里在途条与计数都还是旧的。
  const takeover = await pollUntil(evaluate, `(() => {
    const row = document.querySelector('.dsha-inflight');
    const text = document.body.innerText;
    const count = document.querySelector('.dsha-sub')?.innerText ?? '';
    return {
      inflight: row !== null,
      count,
      fragment: text.includes(${JSON.stringify(fragmentNeedle)}),
      head: text.replace(/\\s+/g, ' ').slice(0, 160),
    };
  })()`, { intervalMs: 1000, budget: 60, checkFirst: true, isDone: value => value.inflight === false && value.fragment === true && value.count.includes('2 条待认领') })
  if (takeover === null || takeover.inflight !== false || takeover.fragment !== true || !takeover.count.includes('2 条待认领')) {
    fail('desk-readback', { lastState: takeover })
  }
  writeFileSync(join(shotDir, 'desk-capture-takeover.png'), await browser.captureScreenshot())
  pass('desk-readback', { count: takeover.count, head: takeover.head })

  verdict.host = { ncpu: os.cpus().length, loadavg: os.loadavg().map(value => Number(value.toFixed(2))) }
} finally {
  teardown()
}
console.log(JSON.stringify(verdict, null, 2))
process.exit(Object.values(verdict.phases).some(phase => phase.pass !== true) ? 1 : 0)
