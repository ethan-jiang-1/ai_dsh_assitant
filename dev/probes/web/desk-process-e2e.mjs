#!/usr/bin/env node
// K4 处理流确定性端到端探针（_backlog/_archive/settled_issues/261010-desk-k4-closure.md 开放面 2）。
//
// 链路：桌面(m-1) → 处理会话 → 回放 report/propose → 留在对话 → 显式拒绝 p-1 →
// 真工具写拒绝回执 → 投影读回 → 自动返回桌面（日期仍为 10/13）→ 第三轮走**交代首事臂**：
// 桌面「＋ 交代新事项」→ 对话里说一件新事 → 回放真调 entrust → 读回 → 返回并选中新建的那件 →
// 第四轮走**认领臂**（桌面选择契约卡 261012）：桌面选待认领片段 → 「认领这件事」→ 新会话 →
// 指归属 → 回放真调 claim 消费 u-1 → 片段离开通道 → 返回并选中归属事项。
//
// 录制的前四个模型调用和首轮答复来自 followup JSONL。明确拒绝这一轮是为确定性验收
// 编写的回放续段，不是录制或真实模型行为；工具执行、账本、投影、回程判定和导航都是真的。
// 新会话的 running 状态由回放回合真实建立（true→false），满足 judgeReturn 的
// fail-closed 前提（没有回合的会话 running 未知，返回被正确挡住——这正是设计行为）。
//
// 回放脚本的**对齐契约**（2026-10-11 两次实测教训，见 BUG-009）：处理会话一挂载，注入的
// 「正在处理事项…」消息就起了一个真实模型回合，它排在主轮之前——脚本第一格必须服务它
// （一句「读到了、等指令」，不产生工具调用），否则后面每一轮都错位一格：粘贴那一轮会拿到
// 拒绝续段、提案当场被拒，探针期望的「留在对话」必红，而产品行为其实完全正确。
// 同理，粘贴之前必须等这个会话 idle（相位 `conversation-idle`）：回合运行中 vendor 的 composer
// 是「停止」态（没有发送键、粘贴会被丢），不等它，判据就退化成「那个回合多快跑完」这个纯负载量。
//
// 自包含编排：每次运行 ①恢复种子账本（post-entrust 快照，report/propose 的
// operation_id 尚不存在，本轮回放可以真提交）→ ②在探针 home 上起带回放 patch 的
// web 服务 → ③CDP 驱动全链 → ④拆服务。重跑安全；账本快照让每次运行从同一态出发。
//
// Usage（repo 根）:
//   node dev/probes/web/desk-process-e2e.mjs [--home <dir>] [--keep-service] [--eval-timeout <ms>]
//     --home          探针 home（默认 <repo>/.tmp/probe-home/k4-probe-home；首次需跑过 prepare+setup）
//     --keep-service  结束后保留服务进程（调试用）
//     --eval-timeout  CDP evaluate 的预算（毫秒，默认 60000）：本探针的相位含「会话首屏挂载 +
//                     回放 burst」，机器被压满时驱动通用的 20s 默认会把健康实现判红（BUG-009，
//                     2026-10-11：load 20–26 / 10 核，且在两个不同代码版本上同样复现）。
//                     判决里的 `host` 字段记着当时负载——红之前先看它。
//
// 前置：`pnpm build` 已跑（服务装载 lib/client 构建物——改过客户端源码必须先重跑）。
// 判定输出：JSON verdict，逐相位；任一相位失败 exit 1。
// 已知假绿面（K1/K2 限制 ⑤）：本探针的断言全部落在相位 verdict 里，eval 异常 =
// 相位失败 = exit 1，不依赖 shots 的旁路产物；console/network 异常单独失败。
import os from 'node:os'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveReplayScript, parseSessionLog } from '../../../vendor/dsh/packages/test-support/llm-replay/lib/index.js'
import { tmpDir } from '../../env/tmp.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { option, sleep } from './probe-utils.mjs'
import { deskText, pollUntil } from './dialogue.mjs'
import { runClaim } from './desk-process-e2e-claim.mjs'
import { runFlow } from './desk-process-e2e-flow.mjs'
import { runWake } from './desk-process-e2e-wake.mjs'
import { countSessions, registerProbeTeardown, startProbeService, stopStaleProbeServices } from './probe-service.mjs'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const fixtures = join(repoRoot, 'dev', 'fixtures', 'desk-process')
const replaySource = join(fixtures, 'followup', 'session.v4.jsonl')
const seedLedger = join(fixtures, 'seed-ledger.json')
const shotDir = tmpDir('desk-process-e2e')

const args = process.argv.slice(2)
const home = option(args, 'home', join(tmpDir('probe-home'), 'k4-probe-home'))
const keepService = args.includes('--keep-service')
// 场景切分（llm-replay 的会话绑定模型）：回放脚本按「首个发起模型调用的活会话」按位绑定，
// 且回放适配器拒绝未录制会话的调用。处理流三臂共用一个会话（交代臂复用当前会话），一个
// 单会话场景即可承载；认领臂**总是新建会话**（当前会话可能正是产生歧义的那一个），所以
// 它是第二个调用会话 —— 单会话场景装不下，必须独立成场景：`--scenario claim` 起自己的
// 服务与回放脚本，认领会话在该场景里就是第一个调用会话，按位绑定主脚本。两个场景各自
// 完整走「恢复种子账本 → 起服务 → CDP 驱动 → 拆服务」。
const scenario = option(args, 'scenario', 'flow')
if (!['flow', 'claim', 'wake'].includes(scenario)) throw new Error(`--scenario must be "flow", "claim" or "wake", got "${scenario}"`)
// The phases that mount a conversation are the heavy ones; the generic driver default (20s) is
// tuned for cheap reads (see the header note and BUG-009).
const evalTimeout = Number(option(args, 'eval-timeout', '60000'))
if (!Number.isFinite(evalTimeout) || evalTimeout <= 0) throw new Error(`--eval-timeout must be a positive number of milliseconds, got "${option(args, 'eval-timeout', '')}"`)

const verdict = {
  probe: 'desk-process-e2e',
  home,
  phases: {},
  consoleProblems: [],
  exceptions: [],
  // 判据面的环境凭据：红之前先看它（BUG-009 的教训——同一份代码在 2× 超载下会假红）。
  host: { ncpu: os.cpus().length, loadavg: os.loadavg().map(value => Math.round(value * 100) / 100), evalTimeoutMs: evalTimeout },
}

// The recorded followup task (dev/eval/tasks.mjs desk-followup-readback) and a stable
// marker from the recorded final reply — the turn-done signal when the burst replay
// finishes between stop-button polls.
const followupPrompt = '（接着刚才那笔 NB-02 第二期款）客户刚才打电话说可能要推迟到 10/20 才能付，但还没重新约定。帮我记一下这个变化。'
const finalReplyMarker = '记进经营台账'

const fail = (phase, detail) => {
  verdict.phases[phase] = { pass: false, ...detail }
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
const pass = (phase, detail) => { verdict.phases[phase] = { pass: true, ...detail }; console.log('PASS ' + phase) }

if (!existsSync(replaySource)) throw new Error(`replay fixture missing: ${replaySource}`)
if (!existsSync(seedLedger)) throw new Error(`seed ledger missing: ${seedLedger}`)
if (!existsSync(join(home, 'profiles'))) throw new Error(`probe home not set up (no profiles/): ${home} — run prepare.sh + setup.sh with ASSISTANT_DSH_HOME`)

// —— 编排：清旧服务（共享 home 的 pid 登记单点在 probe-service.mjs）→ 恢复种子账本 → 起服务 ——
// 服务直连 vendor CLI bin（绕过 dev/env/dsh.mjs 启动器，先例＝release-smoke/setup.sh，硬规则 1
// 允许 tooling 自设 DSH_HOME）：启动器只是参数透传层，经它 SIGTERM 会只杀启动器、把真服务
// 留成孤儿继续持有 writer.lock（首轮实测：第二跑的 report/propose 全被「owned by another
// writer」拒绝）。直连后探针的子进程就是真服务，优雅退出即释放锁。
stopStaleProbeServices(home)
const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
copyFileSync(seedLedger, join(operatingDir, 'ledger.json'))

const rejectPrompt = '拒绝改期提案 p-1，约定到账日和核对点仍保留 2026-10-13。'
const overrideFile = join(home, 'desk-process-authored-replay.json')
const recorded = deriveReplayScript(parseSessionLog(readFileSync(replaySource, 'utf8')))
const blockEntry = (block, reason) => ({ kind: 'chunks', chunks: [
  { type: 'block-start', block }, { type: 'block-end', block },
  { type: 'finish', reason: { kind: reason } },
] })
// 交代首事臂（规格 K3 的另一侧）的续段：作者回合真调 entrust 建一件新事项。
const intakePrompt = '新的一件：供应商对账单这个月多出一笔，帮我盯着核对一下。'
// 认领臂（桌面选择契约卡 261012）的指归属回合：本人一句话把片段认领到既有事项。
const claimPrompt = '那条「二期款已经付了」就是 NB-02 的，认领到它名下。'
// 唤醒轮（状态门控动作卡 261012）的指变化回合：本人说明什么变了，模型带原因 reopen。
const wakePrompt = '客户反馈九月对账有一笔漏核，需要重新打开核对。'
// 第一格服务「种子回合」：处理会话挂载时注入的「正在处理事项…」消息会起一个真实模型回合，
// 它排在主轮之前。不给它一格，记录里的第一组（report+propose）就被它吃掉，后面每一轮都错位一格
// （2026-10-11 实测：粘贴那一轮拿到的是拒绝续段，提案当场被拒 → 未读回→ 探针期望「留在对话」必红，
// 而产品行为其实是对的）。种子只该回一句「读到了、等指令」，不产生任何工具调用。
// 认领场景（--scenario claim）的脚本独立成组：认领会话在该场景里是第一个调用会话，
// 其种子回合（不产生工具调用）吃第一格，指归属那一轮真调 claim 消费 u-1 ——
// 片段离开待认领通道、原文与来源随附入账。
writeFileSync(overrideFile, JSON.stringify(scenario === 'claim' ? [
  blockEntry({ type: 'text', text: '读到了待认领片段 u-1：「有一笔二期款已经付了」。它还没归户——请告诉我它属于哪件在办事项，还是应当立为新事项；未经你确认我不会归户。' }, 'stop'),
  blockEntry({ type: 'tool-call', id: 'authored-claim-u1', name: 'assistant_operating', arguments: JSON.stringify({ action: 'claim', matter_id: 'm-1', unclaimed_id: 'u-1', operation_id: 'op-authored-claim-u1', quote: claimPrompt }) }, 'tool-calls'),
  blockEntry({ type: 'text', text: '已把 u-1 认领到「合同 NB-02 第二期款到账核对」名下，原文与来源随附，桌面待认领已清空。' }, 'stop'),
] : scenario === 'wake' ? [
  // 唤醒轮（状态门控动作卡 261012）：已完成事项 m-2 的唤醒——种子回合吃一格；指变化那一轮
  // 真调 reopen（带原因），事项回在办、completedAt 清掉，按钮随之变回「处理这件事」。
  blockEntry({ type: 'text', text: '读到了已完成事项「九月银行对账单核对」（m-2）。重新打开它需要一个理由——请告诉我是什么变化需要唤醒它；未经你确认我不会自行 reopen。' }, 'stop'),
  blockEntry({ type: 'tool-call', id: 'authored-reopen-m2', name: 'assistant_operating', arguments: JSON.stringify({ action: 'reopen', matter_id: 'm-2', observed_revision: 2, reason: '客户反馈九月对账有一笔漏核', operation_id: 'op-authored-reopen-m2', quote: wakePrompt }) }, 'tool-calls'),
  blockEntry({ type: 'text', text: '已重新打开 m-2，原因已作为材料入账，事项回到在办。' }, 'stop'),
] : [
  blockEntry({ type: 'text', text: '读到了台账 m-1：约定到账日 2026-10-13、核对点 2026-10-13。等你的具体指令。' }, 'stop'),
  ...recorded,
  blockEntry({ type: 'tool-call', id: 'authored-reject-p1', name: 'assistant_operating', arguments: JSON.stringify({ action: 'reject', matter_id: 'm-1', proposal_id: 'p-1', operation_id: 'op-authored-reject-p1', quote: rejectPrompt }) }, 'tool-calls'),
  blockEntry({ type: 'text', text: '已拒绝改期提案 p-1。约定到账日与核对点仍为 2026-10-13。' }, 'stop'),
  blockEntry({ type: 'tool-call', id: 'authored-entrust', name: 'assistant_operating', arguments: JSON.stringify({ action: 'entrust', operation_id: 'op-authored-entrust', title: '供应商对账单：本月多出一笔待核', summary: '对账单多出一笔，需核对来源与金额。', quote: intakePrompt }) }, 'tool-calls'),
  blockEntry({ type: 'text', text: '记下了：供应商对账单多出一笔，已放进桌面，等你核对。' }, 'stop'),
]))

const { service, url, pidFile } = await startProbeService({
  repoRoot,
  home,
  pidName: '.desk-process-e2e-service.pid',
  patch: 'dev/probes/web/replay-adapter.patch.yml',
  extraEnv: {
    REPLAY_PRIMARY: replaySource,
    DSH_SNAPSHOT_OVERRIDE: overrideFile,
  },
})
verdict.url = url

let browser = undefined
const teardown = registerProbeTeardown({ service, pidFile, getBrowser: () => browser, keepService })

// —— 浏览器全链 ——
browser = await launchCdpBrowser({ url, evaluateTimeoutMs: evalTimeout })
if (browser.failed !== undefined) {
  teardown()
  verdict.error = browser.failed
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
const { evaluate, consoleProblems, exceptions } = browser

// 相位 1：桌面挂载 + 种子事项可见（投影 live 读到 m-1）。启动竞态下首帧可能是
// loading/disconnected 横幅——轮询到 m-1 出现或超时，不把竞态当失败。
const deskReady = await pollUntil(evaluate, deskText, {
  intervalMs: 700, budget: 120, checkFirst: true,
  isDone: text => text !== null && text.includes('合同 NB-02 第二期款到账核对') && text.includes('1 件在办'),
})
if (deskReady === null || !deskReady.includes('合同 NB-02 第二期款到账核对')) {
  const lastState = await evaluate(`(() => ({
    readyState: document.readyState,
    hasBody: document.body !== null,
    bodyHead: (document.body?.textContent ?? '').slice(0, 200),
    desk: document.querySelector('[data-assistant-operating-desk]') !== null,
  }))()`)
  teardown()
  fail('matter-list', { waitedMs: 84000, lastState })
}
pass('matter-list', { matter: 'm-1' })

// —— 两场景共享的浏览器习语住 dialogue.mjs（粘贴/发送/idle 判据的原产地注释也在那）；
// 会话计数是服务侧的，住 probe-service.mjs 的 countSessions(home) ——


/**
 * The console/network tail every scenario ended with: publish the collected problems, tear the
 * service down, and exit on the verdict. One copy, so a scenario cannot drift in how it reports.
 * @param {string} label - the PASS line's label.
 */
const finish = (label) => {
  verdict.consoleProblems = browser.consoleProblems
  verdict.exceptions = browser.exceptions
  teardown()
  if (browser.consoleProblems.length > 0 || browser.exceptions.length > 0) {
    console.log(JSON.stringify(verdict, null, 2))
    process.exit(1)
  }
  console.log(`PASS ${label}: ${JSON.stringify(verdict.phases)}`)
  process.exit(0)
}

// The three scenario bodies live in their own modules (片 6b); this file owns the CLI face,
// the shared preamble and the verdict shape.
const ctx = {
  browser, claimPrompt, countSessions, evaluate, fail, finalReplyMarker, finish, followupPrompt,
  home, intakePrompt, operatingDir, pass, pollUntil, rejectPrompt, shotDir, sleep, teardown,
  verdict, wakePrompt,
}
await { flow: runFlow, claim: runClaim, wake: runWake }[scenario](ctx)
