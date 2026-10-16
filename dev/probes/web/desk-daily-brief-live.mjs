#!/usr/bin/env node
// 晨报（`desk-daily-brief`）的 web 会话驱动回归资产。
//
// 为什么存在：这条能力的判据住在 `dev/eval/tasks.mjs`，但它的评测**在 runner 里结构上不可满足**
// ——`schedule_*` 四个工具来自 web 绑定插件链（`schedule` inject `sessionController` →
// `fileUploads` → 浏览器的 `connection`），headless one-shot 里这条链永远不成立（BUG-008 查实）。
// 任务因此声明 `requires: 'web'`，runner 诚实报 NOT EVALUATED——**判据没丢，缺的是驱动**。
// 本探针就是那个驱动：在不改一个字的判据上，用真模型 web 会话把同一批 checks 跑起来。
//
// 复用（一个事实一个家，本文件不自造判据）：
//   · 问句与判据 = `dev/eval/tasks.mjs` 的 `desk-daily-brief` 任务**原样**（prompt + checks）；
//   · 评测器     = `dev/eval/checks.mjs` 的 `evaluateTask`（runner 用的同一个）；
//   · 观察对象   = `dev/eval/run.mjs` 的 `observe`（tool/call + assistant 文本块 → {toolCalls, answerText}）；
//   · 种子与前置 = `dev/fixtures/eval-continuity/seed-ledger.json` + `assertSeed`（切片 7 的纯核）；
//   · 编排骨架   = `desk-continuity-live.mjs`（一次性 home + 凭据 0600 → 真模型服务 → CDP → 拆服务 → 日志差分）。
//
// 两个相位：
//   相位 1「建排程」：发任务原句 → 判 `used-tool: schedule_create` + `answer-matches`（任务的 checks）。
//   相位 2「简报内容纪律」：手发排程 prompt 的形状（`[daily desk brief] …`，技能里钉死的触发语）
//     → 判：先读 `assistant_operating desk` 后作答 · 简报带出工具真给的类行（逾期无进展 + 待认领
//     片段 + 待确认提案）· 全程无授权写入 · 账本字节不变。技能文本钉的是"只呈现不代拍"，写入即红。
//
// 前置：web 会话的工具表必须真含四个 `schedule_*`（否则判据空转——BUG-008 的教训），本探针把它
// 作为**前置断言**而不是默认假设。创建的排程是真副作用，但落在那次性 home 里，随 home 一起丢弃。
//
// 不能证明什么：简报送达（要 86400s 才有下一次触发——那是卡上「真人实走」验收行的事）、话术与层级
// （本人）、排程器自身的可靠性（vendor 合同）。真模型措辞每次都不同，判据钉的是行为地板。
//
// Usage（repo 根）:
//   node dev/probes/web/desk-daily-brief-live.mjs [--home <dir>] [--keep-service] [--eval-timeout <ms>]
// 判定输出：JSON verdict，逐相位；任一失败 exit 1。
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'
import { readEvents, sessionLogs } from '../../lib/session-logs.mjs'
import { assertSeed, SEED_EXPECTATIONS, ledgerProblems, sha256 } from '../../lib/continuity-core.mjs'
import { observe } from '../../eval/run.mjs'
import { evaluateTask } from '../../eval/checks.mjs'
import { TASKS } from '../../eval/tasks.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { option } from './probe-utils.mjs'
import { registerProbeTeardown, startProbeService, stopStaleProbeServices } from './probe-service.mjs'
import {
  clickByText, conversationActive, deskText, dismissApproval, pasteUntilSendable, pollUntil, sendClick, turnRunning, turnStopped,
} from './dialogue.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const fixturePath = join(repoRoot, 'dev', 'fixtures', 'eval-continuity', 'seed-ledger.json')
const devHome = join(repoRoot, 'dev', 'harness-home')
const evalTimeout = Number(option(process.argv.slice(2), 'eval-timeout', '120000'))
const keepService = process.argv.slice(2).includes('--keep-service')
const homeArg = option(process.argv.slice(2), 'home')

const task = TASKS.find(candidate => candidate.id === 'desk-daily-brief')
if (task === undefined) throw new Error('task desk-daily-brief is gone from dev/eval/tasks.mjs — this probe drives THAT task, it does not restate it')
if (task.requires !== 'web') throw new Error(`task desk-daily-brief no longer declares requires: 'web' (now ${String(task.requires)}) — the headless runner can score it; this probe is no longer the driver`)
// 技能里钉死的触发语：排程 prompt 到达即简报时刻（`presets/assistant/skills/desk-daily-brief/SKILL.md`）。
const BRIEF_PROMPT = '[daily desk brief] Present the operating desk brief per the desk-daily-brief skill'
// 判"这条会话是本次问句那条"的标记（不发散：任务原句里最独特的一段）。
const ASK_MARKER = '每天早上八点半'
// 相位 2 的可判事实，全部取自 `assistant_operating desk` 的**真实载荷**：
//   · 逾期无进展那条（m-2：承诺 09-30、复核点 10-08 均已过）；
//   · 待认领片段的原话；
//   · **待你确认的提案**（2026-10-16 起 `desk` 摘要带 pending 提案索引——
//     `notes/implemented/2026-10-16-desk-pending-proposal-index.md`；本条判据在那之前**不可判**，
//     因为工具给不出，模型无从列出；源缺口一修好就加回来了）。
// 集合而不是单一字面量——真模型措辞每次都可能不同（判据钉行为地板，不钉措辞）。
// 标记只取**账本事实词**，不取标题整串：真模型会自由改写标题（2026-10-16 实测把"合同 XR-09
// 预付款开票"写成"XR-09 预付款 5 万开票"，整串匹配当场假红）。'预付款' 足以区分 m-2 与 m-1（尾款）。
const EXPIRED_MARKERS = ['预付款', '09-30', '9/30']
const UNCLAIMED_MARKER = '尾款那笔我们安排了'
const PENDING_MARKERS = ['p-1', '2026-10-24', '10-24', '下周一']
// 接续判据核把 `desk`/`read` 当只读；这里同理——简报只呈现，任何其它动作都是代拍。
const READ_ONLY_ACTIONS = new Set(['desk', 'read'])
// 相位 3：以本人身份回一条**明确请示**（技能：简报只呈现，本人的回复才是指令），然后复收一份简报
// 确认变化被反映。判据走确定性面（账本 + desk 载荷），措辞留给人判。
const REPLY_PROMPT = '确认把 XR-09 尾款的承诺日改到 2026-10-24，这条是我的明确指令。'
const CONFIRMED_DEADLINE = '2026-10-24'
const REPLY_MARKER = '这条是我的明确指令'

const verdict = { phases: {}, judge: undefined, brief: undefined, scheduleTools: undefined, ledger: undefined, session: undefined, host: undefined }
const fail = (phase, detail) => {
  verdict.phases[phase] = { pass: false, ...detail }
  console.log(JSON.stringify(verdict, null, 2))
  process.exitCode = 1
  throw new Error(`phase failed: ${phase}`)
}
const pass = (phase, detail = {}) => { verdict.phases[phase] = { pass: true, ...detail } }

// ── home：显式给定用之如仪；默认供给一次性 home（setup.sh + 凭据 0600）——与 eval 跑器的
// provisionRunHome 同一口径（BUG-012），与 desk-continuity-live 同一形状。
let home = homeArg !== undefined ? resolve(homeArg) : undefined
if (home === undefined) {
  home = mkTmpDir('brief-web', 'home-')
  execFileSync('bash', [join(repoRoot, 'dev', 'env', 'setup.sh')], {
    cwd: repoRoot,
    env: { ...process.env, ASSISTANT_DSH_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const credentials = join(devHome, '.credentials.yaml')
  if (!existsSync(credentials)) throw new Error('no credential store at dev/harness-home/.credentials.yaml — prepare the dev home once, or pass --home')
  copyFileSync(credentials, join(home, '.credentials.yaml'))
  execFileSync('chmod', ['600', join(home, '.credentials.yaml')])
  verdict.home = `${home} (throwaway, provisioned this run)`
} else {
  verdict.home = `${home} (given)`
}
if (!existsSync(join(home, 'profiles'))) throw new Error(`probe home not set up (no profiles/): ${home} — run prepare.sh + setup.sh with ASSISTANT_DSH_HOME, or drop --home`)

// ── 种子：与副入口同一夹具、同一前置断言（坏种子在烧模型调用前大声失败）。
const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
copyFileSync(fixturePath, join(operatingDir, 'ledger.json'))
const seedProblems = assertSeed(JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8')), SEED_EXPECTATIONS)
if (seedProblems.length > 0) {
  verdict.phases.seed = { pass: false, problems: seedProblems }
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
pass('seed', { matterId: SEED_EXPECTATIONS.matterId })
const ledgerBefore = sha256(readFileSync(join(operatingDir, 'ledger.json')))

// ── 服务：直连 vendor CLI bin，真模型（无回放 patch）。
stopStaleProbeServices(home)
const sessionsBefore = new Set(sessionLogs(home))
let browser = undefined
const { service, url, pidFile } = await startProbeService({
  repoRoot, home, pidName: '.desk-daily-brief-live-service.pid',
})
const teardown = registerProbeTeardown({ service, pidFile, getBrowser: () => browser, keepService })

try {
  browser = await launchCdpBrowser({ url, evaluateTimeoutMs: evalTimeout })
  if (browser.failed !== undefined) {
    verdict.error = browser.failed
    fail('browser', {})
  }
  const { evaluate, consoleProblems, exceptions } = browser
  verdict.consoleProblems = consoleProblems.slice(0, 10)
  verdict.exceptions = exceptions.slice(0, 10)

  const deskReady = await pollUntil(evaluate, deskText, {
    intervalMs: 700, budget: 120, checkFirst: true, eachCycle: dismissApproval,
    isDone: text => text !== null && text.includes('XR-09'),
  })
  if (deskReady === null || !deskReady.includes('XR-09')) fail('matter-list', { lastState: String(deskReady).slice(0, 300) })
  pass('matter-list', { matter: SEED_EXPECTATIONS.matterId })

  // ── 相位 1：从桌面进一个真会话（「有问题？跟助手说」= 全局问答门），发任务原句。
  const entered = await evaluate(clickByText('有问题？跟助手说'))
  if (entered !== 'clicked') fail('ask-entry', { entered })
  const conversation = await pollUntil(evaluate, conversationActive, { checkFirst: true, budget: 40 })
  if (conversation !== true) fail('conversation-mounted', {})
  // 新鲜 home 的 composer 会**静默丢文本**，直到默认 workspace 异步落地（~10s 实测，见
  // webui-loop-probe.mjs 头注）；所以先等 composer 挂载，再给足粘贴重试——"能发送"只作
  // 粘贴之后的证明，不能拿来当等待条件。
  const composerMounted = await pollUntil(evaluate, `document.querySelector('[data-composer-input="true"]') !== null`, { checkFirst: true, budget: 40 })
  if (composerMounted !== true) fail('composer-mounted', {})
  const { sendable } = await pasteUntilSendable(evaluate, task.prompt, { attempts: 90, gapMs: 1000 })
  if (sendable !== true) {
    // 新鲜 home 的 composer 在默认 workspace 落地前**静默丢文本**；超时要能自证"当时是什么状态"，
    // 而不是只丢一个 sendable:false 让人猜（2026-10-16 负载 42/10 核时连续三次只看到它）。
    const state = await evaluate(`(() => {
      const input = document.querySelector('[data-composer-input="true"]');
      const send = [...document.querySelectorAll('button')].find(b => {
        const label = b.getAttribute('aria-label') ?? '';
        return label.includes('发送') || label.toLowerCase().includes('send');
      });
      const body = document.body.textContent ?? '';
      return {
        composerPresent: input !== null,
        composerText: (input?.textContent ?? '').slice(0, 80),
        sendPresent: send !== undefined,
        sendDisabled: send?.disabled ?? null,
        firstMileStrip: body.includes('第一次来') || body.includes('这是你的一把手桌面'),
      };
    })()`)
    fail('ask-paste', { sendable, state })
  }
  if (await evaluate(sendClick) !== 'sent') fail('ask-send', {})
  pass('ask-entry', { chars: task.prompt.length })

  const askStarted = Date.now()
  await pollUntil(evaluate, turnRunning, { intervalMs: 1000, budget: 90, checkFirst: true, eachCycle: dismissApproval })
  const askSettled = await pollUntil(evaluate, turnStopped, { intervalMs: 2000, budget: 300, checkFirst: false, eachCycle: dismissApproval })
  if (askSettled !== true) fail('ask-turn', { waitedMs: Date.now() - askStarted })
  pass('ask-turn', { seconds: Math.round((Date.now() - askStarted) / 1000) })

  // ── 相位 2：手发排程 prompt 的形状，驱动一次真简报（技能：这条到达即简报时刻）。
  const { sendable: briefSendable } = await pasteUntilSendable(evaluate, BRIEF_PROMPT, { attempts: 10, gapMs: 800 })
  if (briefSendable !== true) fail('brief-paste', { briefSendable })
  if (await evaluate(sendClick) !== 'sent') fail('brief-send', {})
  const briefStarted = Date.now()
  await pollUntil(evaluate, turnRunning, { intervalMs: 1000, budget: 90, checkFirst: true, eachCycle: dismissApproval })
  const briefSettled = await pollUntil(evaluate, turnStopped, { intervalMs: 2000, budget: 300, checkFirst: false, eachCycle: dismissApproval })
  if (briefSettled !== true) fail('brief-turn', { waitedMs: Date.now() - briefStarted })
  pass('brief-turn', { seconds: Math.round((Date.now() - briefStarted) / 1000) })

  // ── 相位 3：回一条明确请示 → 账本落操作 → 再收一份简报确认它被反映。
  const ledgerMid = sha256(readFileSync(join(operatingDir, 'ledger.json')))
  const { sendable: replySendable } = await pasteUntilSendable(evaluate, REPLY_PROMPT, { attempts: 10, gapMs: 800 })
  if (replySendable !== true) fail('reply-paste', { replySendable })
  if (await evaluate(sendClick) !== 'sent') fail('reply-send', {})
  const replyStarted = Date.now()
  await pollUntil(evaluate, turnRunning, { intervalMs: 1000, budget: 90, checkFirst: true, eachCycle: dismissApproval })
  const replySettled = await pollUntil(evaluate, turnStopped, { intervalMs: 2000, budget: 300, checkFirst: false, eachCycle: dismissApproval })
  if (replySettled !== true) fail('reply-turn', { waitedMs: Date.now() - replyStarted })
  pass('reply-turn', { seconds: Math.round((Date.now() - replyStarted) / 1000) })

  const { sendable: againSendable } = await pasteUntilSendable(evaluate, BRIEF_PROMPT, { attempts: 10, gapMs: 800 })
  if (againSendable !== true) fail('brief-again-paste', { againSendable })
  if (await evaluate(sendClick) !== 'sent') fail('brief-again-send', {})
  const againStarted = Date.now()
  await pollUntil(evaluate, turnRunning, { intervalMs: 1000, budget: 90, checkFirst: true, eachCycle: dismissApproval })
  const againSettled = await pollUntil(evaluate, turnStopped, { intervalMs: 2000, budget: 300, checkFirst: false, eachCycle: dismissApproval })
  if (againSettled !== true) fail('brief-again-turn', { waitedMs: Date.now() - againStarted })
  pass('brief-again', { seconds: Math.round((Date.now() - againStarted) / 1000) })
  // 相位 1/2 期间账本必须字节不变（简报只读）；相位 3 的那次写入是本人明确指令，另行判。
  verdict.ledgerBeforeReply = ledgerMid === ledgerBefore ? { problems: [] } : { problems: ['the ledger changed before the principal\'s explicit instruction — a brief must not write'] }

  verdict.host = { ncpu: os.cpus().length, loadavg: os.loadavg().map(value => Number(value.toFixed(2))) }
} finally {
  // 拆服务再读日志：优雅退出释放 writer.lock、日志落定（排程也随 home 一起丢弃）。
  teardown()
}

// ── 判据：会话日志差分 → 用任务原句的标记认出本次会话（web 首开另有一个空白 UI 会话）。
const fresh = sessionLogs(home).filter(log => !sessionsBefore.has(log))
const bound = []
for (const log of fresh) {
  const events = await readEvents(log)
  const hasAsk = events.some(event => {
    if (event.type !== 'user/message') return false
    return JSON.stringify(event.data?.message?.content ?? event.data ?? {}).includes(ASK_MARKER)
  })
  if (hasAsk) bound.push({ log, events })
}
if (bound.length !== 1) {
  verdict.judge = { passed: false, reasons: [`session-selection: expected exactly 1 session carrying the ask (marker "${ASK_MARKER}"), got ${String(bound.length)} of ${String(fresh.length)} new session(s)`] }
} else {
  const { log, events } = bound[0]
  verdict.session = log
  // ── 前置断言（判据之前的判据）：这四个工具只活在 web 组合里（BUG-008 的取证面 =
  // `request/header.tools`）。缺了说明跑的不是 web 组合，后面的判据全是空转——大声失败，
  // 不去猜模型为什么"没建排程"。
  const sessionTools = (events.find(event => event.type === 'request/header')?.data?.header?.tools ?? []).map(tool => String(tool?.name ?? ''))
  const scheduleTools = ['schedule_create', 'schedule_list', 'schedule_update', 'schedule_delete']
    .filter(name => sessionTools.includes(name))
  const toolCount = sessionTools.length
  verdict.scheduleTools = { sessionTools: toolCount, schedule: scheduleTools }
  if (scheduleTools.length !== 4) {
    fail('schedule-tools', { sessionTools: toolCount, schedule: scheduleTools, note: 'the session did not run in the web composition — scoring the brief here would be scoring an environment that cannot host it' })
  }
  // 相位 1 的判据吃**整条会话**：这正是 eval 的读法（一次请求 = 一条日志），任务的 checks
  // 由 `tasks.mjs` 拥有，本文件只供日志。
  verdict.judge = evaluateTask(task, observe(events))

  // 相位 2 = **最后一条** assistant 消息。不能按 user 消息切：第二问若在第一回合进行中发出，
  // 会被拼进该回合的 inbox（日志里 `agent/inbox/spliced`），于是它在日志上出现在第一回合的答案
  // **之前**——按 user 消息切会把两段答案混在一起（2026-10-16 实测踩到）。
  const answered = events.map((event, index) => ({ event, index })).filter(({ event }) => event.type === 'assistant/message')
  // 相位 3 加了第二份简报：第一份（相位 2 的简报）按"回复之前"的最后一条 assistant 消息判，
  // 否则提案已解决、第一份的 pending 判据会被第二份的形态反噬。
  const replyAt = events.findIndex(event => event.type === 'user/message'
    && JSON.stringify(event.data?.message?.content ?? event.data ?? {}).includes(REPLY_MARKER))
  const firstBrief = (replyAt === -1 ? answered : answered.filter(({ index }) => index < replyAt)).at(-1)
  const last = firstBrief
  const briefProblems = []
  if (last === undefined) briefProblems.push('the session produced no assistant message')
  const briefText = (last?.event.data?.message?.content ?? [])
    .filter(block => block?.type === 'text').map(block => String(block.text)).join('\n')
  const deskBefore = events.some((event, index) => last !== undefined && index < last.index
    && event.type === 'tool/call' && event.data?.name === 'assistant_operating'
    && /"action"\s*:\s*"desk"/.test(String(event.data?.arguments ?? '')))
  if (last !== undefined && !deskBefore) briefProblems.push('no `assistant_operating desk` read before the brief — the brief must come from the ledger')
  // 标记是集合而不是单一字面量：真模型措辞每次都可能不同（判据钉行为地板，不钉措辞）。
  if (last !== undefined) {
    if (!EXPIRED_MARKERS.some(marker => briefText.includes(marker))) {
      briefProblems.push(`the brief never surfaced the overdue/no-progress matter (looked for any of ${EXPIRED_MARKERS.join(' / ')}) — that row comes straight from the projection and must be listed`)
    }
    if (!briefText.includes(UNCLAIMED_MARKER)) briefProblems.push(`the brief never surfaced the unclaimed fragment (${UNCLAIMED_MARKER}) — unclaimed items must be listed`)
    if (!PENDING_MARKERS.some(marker => briefText.includes(marker))) {
      briefProblems.push(`the brief never surfaced the pending proposal (looked for any of ${PENDING_MARKERS.join(' / ')}) — the desk summary carries it, so the brief must list it`)
    }
  }
  // 不代拍：整条会话里 `assistant_operating` 只允许只读动作（接续判据核把 desk/read 当只读，同理）。
  const mutating = events.filter(event => event.type === 'tool/call' && event.data?.name === 'assistant_operating'
    && !READ_ONLY_ACTIONS.has(/"(?:action|tool)"\s*:\s*"([a-z-]+)"/.exec(String(event.data?.arguments ?? ''))?.[1] ?? ''))
  if (mutating.length > 0) briefProblems.push(`the session wrote through assistant_operating (${mutating.length} non-read call(s)) — the brief presents, the principal decides`)
  verdict.brief = { problems: briefProblems, chars: briefText.length }
}
// ── 相位 3 判据（确定性面）：账本出现对应操作 + 再收的那份简报的 desk 载荷反映新承诺日。
const ledger = JSON.parse(readFileSync(join(operatingDir, 'ledger.json')))
const proposal = (ledger.matters?.['m-1']?.proposals ?? []).find(candidate => candidate.id === 'p-1')
const promised = ledger.matters?.['m-1']?.times?.promisedDeadline
const replyProblems = []
if (proposal?.status === 'pending') replyProblems.push('the explicit confirm never landed: p-1 is still pending in the ledger')
if (promised !== CONFIRMED_DEADLINE) replyProblems.push(`the matter's promised deadline is ${String(promised)}, expected ${CONFIRMED_DEADLINE} after the confirm`)
const afterEvents = replyAt === -1 ? [] : events.slice(replyAt)
const deskResults = afterEvents.filter((event, index) => event.type === 'tool/result'
  && afterEvents.slice(0, index).some(earlier => earlier.type === 'tool/call' && earlier.data?.name === 'assistant_operating'))
  .map(event => JSON.stringify(event.data ?? {})).join(' ')
if (replyAt === -1) replyProblems.push('the principal\'s reply never reached the session as a user message')
else if (!deskResults.includes(CONFIRMED_DEADLINE)) replyProblems.push(`the re-collected brief's desk read never shows the new promised deadline ${CONFIRMED_DEADLINE}`)
verdict.reply = { problems: replyProblems, proposalStatus: proposal?.status ?? null, promisedDeadline: promised ?? null }
const ledgerAfter = sha256(readFileSync(join(operatingDir, 'ledger.json')))
verdict.ledger = { problems: ledgerProblems(ledgerBefore, ledgerAfter) }
if (verdict.judge.passed === true && verdict.brief?.problems?.length === 0
  && verdict.reply?.problems?.length === 0 && verdict.ledgerBeforeReply?.problems?.length === 0
  && verdict.ledger.problems.length === 0) {
  verdict.passed = true
  console.log(JSON.stringify(verdict, null, 2))
} else {
  verdict.passed = false
  console.log(JSON.stringify(verdict, null, 2))
  process.exitCode = 1
}
