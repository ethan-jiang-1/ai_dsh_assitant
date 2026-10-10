#!/usr/bin/env node
// K4 处理流确定性端到端探针（_backlog/issues/261010-desk-k4-closure.md 开放面 2）。
//
// 链路：桌面(m-1) → 选中事项 → 「处理这件事」→ 处理会话 → 发一句话 → [回放的真实回合：
// 真工具执行 report/propose，真账本写入] → 回合结算 → settle-follow 刷新经营投影 →
// judgeReturn 判定 → 自动返回桌面（原选择保留）。
//
// 为什么它是确定性的：唯一被脚本化的是**模型的选择**——来自录制的 followup 会话
// （dev/fixtures/desk-process/followup/session.v4.jsonl，经 llm-replay 派生回放）；
// 工具执行、账本写入、投影下载、返回判定、面板导航全部走真实产品链路。
// 新会话的 running 状态由回放回合真实建立（true→false），满足 judgeReturn 的
// fail-closed 前提（没有回合的会话 running 未知，返回被正确挡住——这正是设计行为）。
//
// 自包含编排：每次运行 ①恢复种子账本（post-entrust 快照，report/propose 的
// operation_id 尚不存在，本轮回放可以真提交）→ ②在探针 home 上起带回放 patch 的
// web 服务 → ③CDP 驱动全链 → ④拆服务。重跑安全；账本快照让每次运行从同一态出发。
//
// Usage（repo 根）:
//   node dev/probes/web/desk-process-e2e.mjs [--home <dir>] [--keep-service]
//     --home          探针 home（默认 /tmp/k4-probe-home；首次需跑过 prepare+setup）
//     --keep-service  结束后保留服务进程（调试用）
//
// 前置：`pnpm build` 已跑（服务装载 lib/client 构建物——改过客户端源码必须先重跑）。
// 判定输出：JSON verdict，逐相位；任一相位失败 exit 1。
// 已知假绿面（K1/K2 限制 ⑤）：本探针的断言全部落在相位 verdict 里，eval 异常 =
// 相位失败 = exit 1，不依赖 shots 的旁路产物；console/network 异常单独失败。
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchCdpBrowser } from './cdp-driver.mjs'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const fixtures = join(repoRoot, 'dev', 'fixtures', 'desk-process')
const replaySource = join(fixtures, 'followup', 'session.v4.jsonl')
const seedLedger = join(fixtures, 'seed-ledger.json')

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback
}
const home = option('home', '/tmp/k4-probe-home')
const keepService = args.includes('--keep-service')

const verdict = {
  probe: 'desk-process-e2e',
  home,
  phases: {},
  consoleProblems: [],
  exceptions: [],
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
const pass = (phase, detail) => { verdict.phases[phase] = { pass: true, ...detail } }

if (!existsSync(replaySource)) throw new Error(`replay fixture missing: ${replaySource}`)
if (!existsSync(seedLedger)) throw new Error(`seed ledger missing: ${seedLedger}`)
if (!existsSync(join(home, 'profiles'))) throw new Error(`probe home not set up (no profiles/): ${home} — run prepare.sh + setup.sh with ASSISTANT_DSH_HOME`)

// —— 编排：清旧服务 → 恢复种子账本 → 起服务 → 等 URL ——
// 直连 vendor CLI bin（绕过 dev/env/dsh.mjs 启动器，先例＝release-smoke/setup.sh，硬规则 1
// 允许 tooling 自设 DSH_HOME）：启动器只是参数透传层，经它 SIGTERM 会只杀启动器、把真服务
// 留成孤儿继续持有 writer.lock（首轮实测：第二跑的 report/propose 全被「owned by another
// writer」拒绝）。直连后探针的子进程就是真服务，优雅退出即释放锁。
const pidFile = join(home, '.desk-process-e2e-service.pid')
if (existsSync(pidFile)) {
  const stale = Number(readFileSync(pidFile, 'utf8'))
  if (Number.isInteger(stale)) { try { process.kill(stale, 'SIGTERM') } catch { /* already gone */ } }
  rmSync(pidFile)
}
const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
copyFileSync(seedLedger, join(operatingDir, 'ledger.json'))

const vendorBin = join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
const tsxEntry = import.meta.resolve('tsx/esm')
const service = spawn(process.execPath, ['--import', tsxEntry, vendorBin, '--profile', 'dev', '--patch', 'dev/probes/web/replay-adapter.patch.yml', '--port', '0', '--no-open'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    DSH_HOME: home,
    DSH_AGENTS_HOME: join(home, 'agents-home'),
    DSH_TELEMETRY_DISABLED: '1',
    TSX_TSCONFIG_PATH: join(repoRoot, 'tsconfig.tsx.json'),
    REPLAY_PRIMARY: replaySource,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
writeFileSync(pidFile, String(service.pid))
let url = undefined
let bootError = undefined
service.stdout.on('data', (chunk) => {
  const match = /dsh web: (http:\/\/\S+)/.exec(String(chunk))
  if (match !== null) url = match[1]
})
service.stderr.on('data', (chunk) => { bootError = String(chunk) })
for (let i = 0; i < 120 && url === undefined; i++) await new Promise((resolve) => { setTimeout(resolve, 500) })
if (url === undefined) {
  service.kill('SIGTERM')
  throw new Error(`service never printed its URL (stderr tail: ${String(bootError).slice(-400)})`)
}
verdict.url = url

let browser = undefined
const teardown = () => {
  rmSync(pidFile, { force: true })
  browser?.close()
  if (!keepService) service.kill('SIGTERM')
}
process.on('exit', teardown)
process.on('SIGINT', () => { teardown(); process.exit(130) })
process.on('SIGTERM', () => { teardown(); process.exit(143) })

// —— 浏览器全链 ——
browser = await launchCdpBrowser({ url })
if (browser.failed !== undefined) {
  teardown()
  verdict.error = browser.failed
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
const { evaluate, consoleProblems, exceptions } = browser
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
const deskPresent = `document.querySelector('[data-assistant-operating-desk]') !== null`
const deskText = `(() => { const root = document.querySelector('[data-assistant-operating-desk]'); return root === null ? null : root.innerText })()`

// 相位 1：桌面挂载 + 种子事项可见（投影 live 读到 m-1）。启动竞态下首帧可能是
// loading/disconnected 横幅——轮询到 m-1 出现或超时，不把竞态当失败。
let deskReady = null
for (let i = 0; i < 120 && deskReady === null; i++) {
  const text = await evaluate(deskText)
  if (text !== null && text.includes('合同 NB-02 第二期款到账核对') && text.includes('1 件在办')) deskReady = text
  else if (i < 119) await sleep(700)
}
if (deskReady === null) {
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
const countProbeSessions = () => {
  let count = 0
  const sessionsDir = join(home, 'sessions')
  for (const workspace of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!workspace.isDirectory()) continue
    for (const entry of readdirSync(join(sessionsDir, workspace.name), { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('session-')) count += 1
    }
  }
  return count
}
const sessionsBeforeProcess = countProbeSessions()
if (await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const process = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '') === '处理这件事');
  if (process === undefined) return 'button-not-found';
  process.click(); process.click(); return 'double-clicked';
})()`) !== 'double-clicked') { teardown(); fail('process-click', {}) }
let conversationActive = false
for (let i = 0; i < 40 && !conversationActive; i++) {
  conversationActive = await evaluate(`document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`) === true
  if (!conversationActive) await sleep(500)
}
if (!conversationActive) {
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

// 相位 4+5（本探针的存在理由）：发一句话 → 回放回合真跑（真工具真账本）→ 读回 → 自动返回。
// 粘贴/发送习语来自 webui-loop-probe（composer 拒绝 execCommand，合成 ClipboardEvent paste
// 是已验证的插入方式）。
const pasteOnce = `(() => {
  const composer = document.querySelector('[data-composer-input="true"]');
  if (composer === null) return 'no-composer';
  composer.focus();
  const data = new DataTransfer();
  data.setData('text/plain', ${JSON.stringify(followupPrompt)});
  composer.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  return 'pasted';
})()`
const sendEnabled = `(() => {
  const send = [...document.querySelectorAll('button')].find(b =>
    (b.getAttribute('aria-label') ?? '') === '发送消息' || (b.getAttribute('aria-label') ?? '') === 'Send message');
  return send !== undefined && send.disabled === false;
})()`
let ready = false
for (let i = 0; i < 10 && !ready; i++) {
  await evaluate(pasteOnce)
  await sleep(800)
  ready = await evaluate(sendEnabled) === true
}
if (!ready) { teardown(); fail('composer-accept', {}) }
await sleep(600)
const sent = await evaluate(`(() => {
  const send = [...document.querySelectorAll('button')].find(b =>
    (b.getAttribute('aria-label') ?? '') === '发送消息' || (b.getAttribute('aria-label') ?? '') === 'Send message');
  if (send === undefined) return 'no-send-button';
  if (send.disabled) return 'send-disabled';
  send.click(); return 'sent';
})()`)
if (sent !== 'sent') { teardown(); fail('send', { sent }) }

// 完成信号 = 桌面重新挂载——它蕴含「回合已结算＋回执已读回＋judge 判 return」整链；
// 不能把「终答文本可见」当门槛：自动返回会把会话视图换走、标记随之离开 body，
// 两个信号在赛跑，标记必输（实测：return 在回合结束后 100ms 触发，标记窗口没有
// 任何一个 1.5s 轮询拍抓到）。终答标记降级为过程遥测（sawTurnActivity），不作判据。
let approvals = 0
let sawTurnActivity = false
const flowStartedAt = Date.now()
let returnText = null
for (let i = 0; i < 200 && returnText === null; i++) {
  await sleep(1500)
  // 审批门：回放回合里的 bash 等工具会停在「允许一次」等真人——探针就地点掉并计数。
  const approval = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次');
    if (b === undefined) return 'none';
    b.click(); return 'clicked';
  })()`)
  if (approval === 'clicked') approvals += 1
  if (!sawTurnActivity) {
    sawTurnActivity = await evaluate(`(() => {
      const stop = [...document.querySelectorAll('button')].some(b => {
        const label = b.getAttribute('aria-label') ?? '';
        return label === '停止生成' || label === 'Stop generating';
      });
      return stop || (document.body.textContent ?? '').includes(${JSON.stringify(finalReplyMarker)});
    })()`) === true
  }
  returnText = await evaluate(deskText)
}
if (returnText === null) {
  // 区分三种红：回放没真执行（账本没动）vs 回合没结算 vs 返回链断了（账本动了、
  // 回合结束了、桌面没回来）。judgeLog 与 fetch 时间线是零侵入取证。
  const state = await evaluate(`(() => ({
    stopButton: [...document.querySelectorAll('button')].some(b => {
      const label = b.getAttribute('aria-label') ?? '';
      return label === '停止生成' || label === 'Stop generating';
    }),
    bodyHasMarker: (document.body.textContent ?? '').includes(${JSON.stringify(finalReplyMarker)}),
    processLog: (globalThis.__deskProcessDebug ?? []).slice(-6),
    fetches: performance.getEntriesByType('resource').filter(e => e.name.includes('desk-projection')).map(e => Math.round(e.startTime)),
  }))()`)
  const ledger = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
  const ops = Object.values(ledger.operations ?? {})
  teardown()
  fail('auto-return', {
    waitedMs: Date.now() - flowStartedAt,
    approvals,
    sawTurnActivity,
    ledgerOperations: ops.map((entry) => `${entry.operation?.kind ?? '?'}:${entry.receipt?.outcome?.status ?? '?'}`),
    state,
  })
}
pass('turn-settle', { approvals, sawTurnActivity, seconds: Math.round((Date.now() - flowStartedAt) / 1000) })
pass('auto-return', { waitedMs: Math.round((Date.now() - flowStartedAt) / 1000) })
if (!returnText.includes('合同 NB-02 第二期款')) {
  teardown(); fail('return-selection', { text: returnText.slice(0, 400) })
}
const readback = {
  materialLanded: /客户电话告知|推迟到 10\/20|口头/.test(returnText),
  proposalPending: returnText.includes('等你确认'),
}
if (!readback.materialLanded || !readback.proposalPending) {
  teardown(); fail('readback-visible', { readback, text: returnText.slice(0, 600) })
}
pass('return-selection', {})
pass('readback-visible', readback)

// 双击负例终判（规格「双击发送两次」）：整个流结束时新会话数恰好 +1。
const sessionsAfterFlow = countProbeSessions()
if (sessionsAfterFlow !== sessionsBeforeProcess + 1) {
  teardown()
  fail('double-click-single-session', { sessionsBeforeProcess, sessionsAfterFlow })
}
pass('double-click-single-session', { created: sessionsAfterFlow - sessionsBeforeProcess })

// —— 控制台与网络面（与 projection 探针同口径）——
verdict.consoleProblems = consoleProblems
verdict.exceptions = exceptions
teardown()
if (consoleProblems.length > 0 || exceptions.length > 0) {
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
console.log(`PASS desk processing flow e2e: ${JSON.stringify(verdict.phases)}`)
process.exit(0)
