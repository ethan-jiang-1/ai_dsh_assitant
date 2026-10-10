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
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
const pidFile = join(home, '.desk-process-e2e-service.pid')
if (existsSync(pidFile)) {
  const stale = Number(readFileSync(pidFile, 'utf8'))
  if (Number.isInteger(stale)) { try { process.kill(stale, 'SIGTERM') } catch { /* already gone */ } }
  rmSync(pidFile)
}
const operatingDir = join(home, 'assistant-operating')
mkdirSync(operatingDir, { recursive: true })
copyFileSync(seedLedger, join(operatingDir, 'ledger.json'))

const service = spawn(process.execPath, ['dev/env/dsh.mjs', '--profile', 'dev', '--patch', 'dev/probes/web/replay-adapter.patch.yml', '--port', '0', '--no-open'], {
  cwd: repoRoot,
  env: { ...process.env, ASSISTANT_DSH_HOME: home, REPLAY_PRIMARY: replaySource },
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

const teardown = () => {
  rmSync(pidFile, { force: true })
  if (!keepService) service.kill('SIGTERM')
}
process.on('exit', teardown)

// —— 浏览器全链 ——
const handle = await launchCdpBrowser({ url })
if (handle.failed !== undefined) {
  teardown()
  verdict.error = handle.failed
  console.log(JSON.stringify(verdict, null, 2))
  process.exit(1)
}
const { evaluate, consoleProblems, exceptions } = handle
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
const deskPresent = `document.querySelector('[data-assistant-operating-desk]') !== null`
const deskText = `(() => { const root = document.querySelector('[data-assistant-operating-desk]'); return root === null ? null : root.innerText })()`

// 相位 1：桌面挂载 + 种子事项可见（投影 live 读到 m-1）。
let deskTextValue = null
for (let i = 0; i < 60 && deskTextValue === null; i++) {
  deskTextValue = await evaluate(deskText)
  if (deskTextValue === null) await sleep(500)
}
if (deskTextValue === null) { teardown(); fail('desk-boot', { waitedMs: 30000 }) }
if (!deskTextValue.includes('合同 NB-02 第二期款到账核对') || !deskTextValue.includes('1 件在办')) {
  teardown(); fail('matter-list', { text: deskTextValue.slice(0, 400) })
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
if (await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const process = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '') === '处理这件事');
  if (process === undefined) return 'button-not-found';
  process.click(); return 'clicked';
})()`) !== 'clicked') { teardown(); fail('process-click', {}) }
let conversationActive = false
for (let i = 0; i < 40 && !conversationActive; i++) {
  conversationActive = await evaluate(`document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`) === true
  if (!conversationActive) await sleep(500)
}
if (!conversationActive) { teardown(); fail('conversation-switch', { waitedMs: 20000 }) }
pass('conversation-switch', {})

// 相位 4：发一句话 → 回放回合真跑（真工具真账本）。粘贴/发送习语来自 webui-loop-probe
// （composer 拒绝 execCommand，合成 ClipboardEvent paste 是已验证的插入方式）。
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

// done 信号 = 回合结束：停止按钮消失，或录制终答文本出现（burst 回放可能在轮询间隙跑完）。
const turnDone = `(() => {
  const stop = [...document.querySelectorAll('button')].some(b => {
    const label = b.getAttribute('aria-label') ?? '';
    return label === '停止生成' || label === 'Stop generating';
  });
  const body = document.body.textContent ?? '';
  return !stop && body.includes(${JSON.stringify(finalReplyMarker)});
})()`
let approvals = 0
let done = false
const turnStartedAt = Date.now()
for (let i = 0; i < 160 && !done; i++) {
  await sleep(1500)
  // 审批门：回放回合里的 bash 等工具会停在「允许一次」等真人——探针就地点掉并计数。
  const approval = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次');
    if (b === undefined) return 'none';
    b.click(); return 'clicked';
  })()`)
  if (approval === 'clicked') approvals += 1
  done = await evaluate(turnDone) === true
}
if (!done) { teardown(); fail('turn-settle', { waitedMs: Date.now() - turnStartedAt, approvals }) }
pass('turn-settle', { approvals, seconds: Math.round((Date.now() - turnStartedAt) / 1000) })

// 相位 5（本探针的存在理由）：读回 → 自动返回。settle-follow 刷新投影（4s 防抖）→
// evaluateReturn → judgeReturn → selectPanel(桌面)。等桌面重新挂载，断言原选择保留
// 且回执落地（report 的材料 + propose 的「等你确认」提案）。
let returned = false
let returnText = null
const returnStartedAt = Date.now()
for (let i = 0; i < 40 && !returned; i++) {
  returnText = await evaluate(deskText)
  returned = returnText !== null
  if (!returned) await sleep(700)
}
if (!returned) {
  // 区分两种红：账本没动（回放没真执行）vs 账本动了但返回没触发（刷新/判定接线缺口）。
  const ledger = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
  const ops = Object.values(ledger.operations ?? {})
  teardown()
  fail('auto-return', {
    waitedMs: Date.now() - returnStartedAt,
    ledgerOperations: ops.map((op) => `${op.kind ?? op.action ?? '?'}:${op.status ?? '?'}`).slice(0, 6),
  })
}
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
pass('auto-return', { waitedMs: Date.now() - returnStartedAt })
pass('return-selection', {})
pass('readback-visible', readback)

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
