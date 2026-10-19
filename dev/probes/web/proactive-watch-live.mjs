#!/usr/bin/env node
// 「让它替你盯」的 web 会话驱动回归（261018 proactive 片 2，验收表行 5 的模型侧车道）。
//
// 为什么存在：片 2 的两个按钮走桌面的 capture 代发车道（不切走主区），turn 在后台会话
// 里跑——headless eval 结构上够不着（schedule_* 是 web 绑定，BUG-008 教训），一次性 shots
// 也只证渲染不证回合。本探针用真模型把两个动作各走一遍，判据读会话日志与排程存储。
//
// 两个相位：
//   相位 1「先试跑一次」：点建议条第一个「先试跑一次」→ 判：真读真判断（toolCalls 含
//     assistant_operating）、排程存储字节不变（不建排程）、有一句话结论（answerText 非空）。
//   相位 2「替我盯上」：点第一个「替我盯上」→ 判：toolCalls 含 schedule_create；排程存储
//     出现 title 可读的新排程且无重复（同 prompt 仅一条）；回桌面行 3 呈现新排程。
//
// 复用（一个事实一个家）：判据的事件观察 = dev/eval/run.mjs 的 observe；会话日志发现 =
// dev/lib/session-logs.mjs；凭据与一次性 home = desk-daily-brief-live 同一口径（setup.sh +
// .credentials.yaml 0600）；种子 = e2e seed-ledger（m-1 在办，桌面有东西可读）+ 空排程。
// 创建的排程是真副作用，落在一次性 home 里随 home 丢弃。
//
// 不能证明什么：话术口味（本人）、送达（要等真实到期）、模型每次都会建（判的是这一次
// 的行为地板——措辞每次都不同，纪律由片 3 的红线段落管）。
//
// Usage（repo 根）: node dev/probes/web/proactive-watch-live.mjs [--home <dir>] [--keep-service]
// 前置：`pnpm build` 当前。判定输出 JSON verdict；任一相位失败 exit 1。
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'
import { createHash } from 'node:crypto'
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
const evalTimeout = Number(option(args, 'eval-timeout', '90000'))

const verdict = { probe: 'proactive-watch-live', phases: {}, consoleProblems: [], exceptions: [] }
const pass = (phase, detail) => { verdict.phases[phase] = { pass: true, ...detail } }
const fail = (phase, detail) => {
  verdict.phases[phase] = { pass: false, ...detail }
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}

// ── home：一次性（setup + 凭据 0600）——desk-daily-brief-live 同一口径。
let home = homeArg !== undefined ? resolve(homeArg) : undefined
if (home === undefined) {
  home = mkTmpDir('watch-web', 'home-')
  execFileSync('bash', [join(repoRoot, 'dev', 'env', 'setup.sh')], {
    cwd: repoRoot, env: { ...process.env, ASSISTANT_DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  const credentials = join(devHome, '.credentials.yaml')
  if (!existsSync(credentials)) throw new Error('no credential store at dev/harness-home/.credentials.yaml — prepare the dev home once, or pass --home')
  copyFileSync(credentials, join(home, '.credentials.yaml'))
  execFileSync('chmod', ['600', join(home, '.credentials.yaml')])
}
if (!existsSync(join(home, 'profiles'))) throw new Error(`probe home not set up: ${home}`)

// ── 种子：e2e seed-ledger 原样（m-1 在办）+ 空排程存储（任何 schedule_create 都是本探针的新副作用）。
const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
copyFileSync(join(repoRoot, 'dev', 'fixtures', 'desk-process', 'seed-ledger.json'), join(operatingDir, 'ledger.json'))
const ledgerPath = join(operatingDir, 'ledger.json')
const schedulePath = join(home, 'storages', 'schedule.json')
mkdirSync(join(home, 'storages'), { recursive: true })
const emptySchedule = { unit: { name: 'schedule', version: 1 }, global: null, tables: { tasks: {} } }
// The service owns this file once booted; seed it BEFORE boot so the first load sees empty tables.
writeFileSync(schedulePath, JSON.stringify(emptySchedule, null, 2))
const sha256hex = (buffer) => createHash('sha256').update(buffer).digest('hex')
const scheduleBefore = sha256hex(readFileSync(schedulePath))

stopStaleProbeServices(home)
const sessionsBefore = new Set(sessionLogs(home))
let turnBaseline = undefined
let browser = undefined
const { service, url, pidFile } = await startProbeService({ repoRoot, home, pidName: '.proactive-watch-live.pid' })
const teardown = registerProbeTeardown({ service, pidFile, getBrowser: () => browser, keepService })

// The capture lane's turns run in BACKGROUND sessions — nothing to poll in the conversation UI.
// Deliveries land in the CURRENT session (which may be shared between the two actions), so a
// "fresh log file" detector is wrong: count settle signals per log (turn/end, or an ask-family
// tool call — a turn suspended on a question never writes turn/end) and diff against the phase's
// own baseline; the new events slice is exactly this phase's turn.
const isAskCall = event => event.type === 'tool/call' && /ask/i.test(String(event.data?.name ?? event.data?.tool ?? ''))
const settledCount = events => events.filter(event => event.type === 'turn/end').length + events.filter(isAskCall).length
const readBaseline = async () => {
  const map = new Map()
  for (const log of sessionLogs(home)) {
    const events = await readEvents(log)
    map.set(log, { length: events.length, signals: settledCount(events) })
  }
  return map
}
const pollForFreshTurn = async (baseline, budgetSeconds) => {
  const deadline = Date.now() + budgetSeconds * 1000
  while (Date.now() < deadline) {
    for (const log of sessionLogs(home)) {
      const events = await readEvents(log)
      const base = baseline.get(log)
      const signals = settledCount(events)
      if (base === undefined) {
        if (signals > 0) return { log, events }
      } else if (signals > base.signals) {
        return { log, events: events.slice(base.length) }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  return undefined
}

try {
  browser = await launchCdpBrowser({ url, evaluateTimeoutMs: evalTimeout })
  if (browser.failed !== undefined) fail('browser', { error: browser.failed })
  const { evaluate, consoleProblems, exceptions } = browser
  verdict.consoleProblems = consoleProblems.slice(0, 10)
  verdict.exceptions = exceptions.slice(0, 10)

  const deskReady = await pollUntil(evaluate, deskText, { intervalMs: 700, budget: 120, checkFirst: true, isDone: text => text !== null && text.includes('合同 NB-02') && text.includes('让它替你盯') })
  if (deskReady === null) fail('desk-mount', { lastState: String(deskReady).slice(0, 200) })
  pass('desk-mount', {})
  // Phase baselines read after the desk mounts (functions above are now defined).
  turnBaseline = await readBaseline()

  // ── 相位 1：先试跑一次（真读真判断、不建排程）。
  if (await evaluate(clickByText('先试跑一次')) !== 'clicked') fail('trial-click', {})
  const trial = await pollForFreshTurn(turnBaseline, 240)
  if (trial === undefined) fail('trial-turn', { hint: 'no fresh settled session log within 240s' })
  const trialSeen = observe(trial.events)
  const trialRead = trialSeen.toolCalls.some(call => String(call.name ?? '').includes('assistant_operating'))
  const trialScheduleUnchanged = sha256hex(readFileSync(schedulePath)) === scheduleBefore
  if (!trialRead) fail('trial-read', { toolCalls: trialSeen.toolCalls.map(call => call.name).slice(0, 6) })
  if (!trialScheduleUnchanged) fail('trial-no-schedule', { hint: '先试跑 must not create a schedule' })
  if (String(trialSeen.answerText ?? '').trim() === '') fail('trial-answer', { hint: 'expected a one-line conclusion' })
  pass('trial', { tools: trialSeen.toolCalls.map(call => call.name).slice(0, 6), answerHead: String(trialSeen.answerText ?? '').slice(0, 120) })

  // ── 相位 1b：试跑的无账本终态（261019）。先试跑按定义不写账本，所以回执不能等 revision：
  // 回合结束后输入必须解禁、行改说「结果在会话里」、给「去会话」与「关闭」。修之前这里会永远
  // 停在「还没进账」且输入 disabled——真机证据见 .tmp/shots/trial-inflight-after-turn.png。
  const trialUi = await pollUntil(evaluate, `(() => {
    const row = document.querySelector('.dsha-inflight');
    if (row === null) return null;
    const chip = row.querySelector('.dsha-chip')?.innerText ?? '';
    if (chip !== '它说完了') return null;
    return {
      disabled: document.querySelector('.dsha-capture-input')?.disabled ?? null,
      close: [...row.querySelectorAll('button')].some(b => b.innerText === '关闭'),
      claimsPending: row.innerText.includes('还没进账'),
      sessionPointer: [...row.querySelectorAll('button')].some(b => b.innerText === '去会话'),
      rowHead: row.innerText.replace(/\\s+/g, ' ').slice(0, 160),
    };
  })()`, { intervalMs: 1000, budget: 90, checkFirst: true, isDone: value => value !== null })
  if (trialUi === null) fail('trial-terminal', { hint: 'the desk never reached the settled receipt state within 90s' })
  if (trialUi.disabled !== false || trialUi.close !== true || trialUi.claimsPending !== false || trialUi.sessionPointer !== true) fail('trial-terminal', trialUi)
  pass('trial-terminal', trialUi)

  // ── 相位 2：替我盯上（一键建、恰好一条、title 可读、不把指令记进待认领、桌面行 3 呈现）。
  // Baseline re-read AFTER the trial settled: the watch turn may land in the SAME session.
  const unclaimedBefore = Object.keys(JSON.parse(readFileSync(ledgerPath, 'utf8')).unclaimed ?? {}).length
  const postTrialBaseline = await readBaseline()
  if (await evaluate(clickByText('替我盯上')) !== 'clicked') fail('watch-click', {})
  const watch = await pollForFreshTurn(postTrialBaseline, 240)
  if (watch === undefined) fail('watch-turn', { hint: 'no second fresh settled session log within 240s' })
  const watchSeen = observe(watch.events)
  const created = watchSeen.toolCalls.some(call => String(call.name ?? '') === 'schedule_create')
  if (!created) fail('watch-schedule-create', { toolCalls: watchSeen.toolCalls.map(call => call.name).slice(0, 8) })
  pass('watch-create', { tools: watchSeen.toolCalls.map(call => call.name).slice(0, 8), answerHead: String(watchSeen.answerText ?? '').slice(0, 120) })

  // 排程存储判据：恰好一条（一次接受=一条盯守）、title 可读；指令本身不落待认领。
  const scheduleAfter = JSON.parse(readFileSync(schedulePath, 'utf8'))
  const tasks = Object.values(scheduleAfter.tables?.tasks ?? {})
  if (tasks.length === 0) fail('watch-storage', { hint: 'no tasks in storage after schedule_create' })
  if (tasks.length !== 1) fail('watch-one-schedule', { count: tasks.length, titles: tasks.map(task => task.record?.title) })
  const readable = tasks.filter(task => typeof task.record?.title === 'string' && task.record.title.trim().length >= 2)
  if (readable.length !== tasks.length) fail('watch-title-readable', { titles: tasks.map(task => task.record?.title) })
  const prompts = tasks.map(task => String(task.record?.prompt ?? ''))
  const duplicatePrompts = prompts.filter((prompt, index) => prompts.indexOf(prompt) !== index)
  if (duplicatePrompts.length > 0) fail('watch-no-duplicate', { duplicatePrompts: [...new Set(duplicatePrompts)].slice(0, 3) })
  const unclaimedAfter = Object.keys(JSON.parse(readFileSync(ledgerPath, 'utf8')).unclaimed ?? {}).length
  if (unclaimedAfter !== unclaimedBefore) fail('watch-no-instruction-note', { before: unclaimedBefore, after: unclaimedAfter })
  pass('watch-storage', { count: tasks.length, titles: tasks.map(task => task.record?.title), unclaimed: `${unclaimedBefore}→${unclaimedAfter}` })

  // 261019 片 4 的判据键：pending acceptance 用投递会话对账，所以排程的接收会话必须就是回执的会话。
  const receiptRaw = await evaluate(`sessionStorage.getItem('dsha-capture-receipt-v1')`)
  const deliveredSession = receiptRaw === null ? undefined : (JSON.parse(String(receiptRaw))?.sessionId)
  const sessionMatch = deliveredSession !== undefined && tasks.every(task => task.sessionId === deliveredSession)
  if (!sessionMatch) fail('watch-session-match', { deliveredSession, taskSessions: tasks.map(task => task.sessionId) })
  pass('watch-session-match', { deliveredSession })

  // 桌面回读：行 3 呈现新排程（"它下次替你看：<title>"）。
  const deskAfter = await pollUntil(evaluate, deskText, { intervalMs: 1000, budget: 60, checkFirst: true, isDone: text => text !== null && text.includes('它下次替你看') })
  if (deskAfter === null) fail('watch-desk-row3', { lastState: String(deskAfter).slice(0, 200) })
  const deskTitles = tasks.map(task => task.record?.title).filter(title => deskAfter.includes(String(title)))
  if (deskTitles.length === 0) fail('watch-desk-title', { deskHead: String(deskAfter).slice(0, 300) })
  pass('watch-desk', { row3Head: String(deskAfter).split('\n').find(line => line.includes('它下次替你看')) ?? '' })

  verdict.host = { ncpu: os.cpus().length, loadavg: os.loadavg().map(value => Number(value.toFixed(2))) }
} finally {
  teardown()
}
console.log(JSON.stringify(verdict, null, 2))
process.exit(Object.values(verdict.phases).some(phase => phase.pass !== true) ? 1 : 0)
