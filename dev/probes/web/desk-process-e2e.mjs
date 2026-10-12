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
import { spawn } from 'node:child_process'
import os from 'node:os'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveReplayScript, parseSessionLog } from '../../../vendor/dsh/packages/test-support/llm-replay/lib/index.js'
import { tmpDir } from '../../env/tmp.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const fixtures = join(repoRoot, 'dev', 'fixtures', 'desk-process')
const replaySource = join(fixtures, 'followup', 'session.v4.jsonl')
const seedLedger = join(fixtures, 'seed-ledger.json')
const shotDir = tmpDir('desk-process-e2e')

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback
}
const home = option('home', join(tmpDir('probe-home'), 'k4-probe-home'))
const keepService = args.includes('--keep-service')
// 场景切分（llm-replay 的会话绑定模型）：回放脚本按「首个发起模型调用的活会话」按位绑定，
// 且回放适配器拒绝未录制会话的调用。处理流三臂共用一个会话（交代臂复用当前会话），一个
// 单会话场景即可承载；认领臂**总是新建会话**（当前会话可能正是产生歧义的那一个），所以
// 它是第二个调用会话 —— 单会话场景装不下，必须独立成场景：`--scenario claim` 起自己的
// 服务与回放脚本，认领会话在该场景里就是第一个调用会话，按位绑定主脚本。两个场景各自
// 完整走「恢复种子账本 → 起服务 → CDP 驱动 → 拆服务」。
const scenario = option('scenario', 'flow')
if (!['flow', 'claim'].includes(scenario)) throw new Error(`--scenario must be "flow" or "claim", got "${scenario}"`)
// The phases that mount a conversation are the heavy ones; the generic driver default (20s) is
// tuned for cheap reads (see the header note and BUG-009).
const evalTimeout = Number(option('eval-timeout', '60000'))
if (!Number.isFinite(evalTimeout) || evalTimeout <= 0) throw new Error(`--eval-timeout must be a positive number of milliseconds, got "${option('eval-timeout', '')}"`)

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
] : [
  blockEntry({ type: 'text', text: '读到了台账 m-1：约定到账日 2026-10-13、核对点 2026-10-13。等你的具体指令。' }, 'stop'),
  ...recorded,
  blockEntry({ type: 'tool-call', id: 'authored-reject-p1', name: 'assistant_operating', arguments: JSON.stringify({ action: 'reject', matter_id: 'm-1', proposal_id: 'p-1', operation_id: 'op-authored-reject-p1', quote: rejectPrompt }) }, 'tool-calls'),
  blockEntry({ type: 'text', text: '已拒绝改期提案 p-1。约定到账日与核对点仍为 2026-10-13。' }, 'stop'),
  blockEntry({ type: 'tool-call', id: 'authored-entrust', name: 'assistant_operating', arguments: JSON.stringify({ action: 'entrust', operation_id: 'op-authored-entrust', title: '供应商对账单：本月多出一笔待核', summary: '对账单多出一笔，需核对来源与金额。', quote: intakePrompt }) }, 'tool-calls'),
  blockEntry({ type: 'text', text: '记下了：供应商对账单多出一笔，已放进桌面，等你核对。' }, 'stop'),
]))

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
    DSH_SNAPSHOT_OVERRIDE: overrideFile,
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
browser = await launchCdpBrowser({ url, evaluateTimeoutMs: evalTimeout })
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

// —— 两场景共享的浏览器习语（粘贴/发送/idle 判据，来自 webui-loop-probe）——
const countProbeSessions = () => {
  const sessionsDir = join(home, 'sessions')
  // 全新 home 还没被 boot 过就没有这个目录——0 个会话是正确答案，不是错误。
  if (!existsSync(sessionsDir)) return 0
  let count = 0
  for (const workspace of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!workspace.isDirectory()) continue
    for (const entry of readdirSync(join(sessionsDir, workspace.name), { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('session-')) count += 1
    }
  }
  return count
}
const turnRunning = `[...document.querySelectorAll('button')].some(b => ['停止生成','Stop generating'].includes(b.getAttribute('aria-label') ?? ''))`
const sendPresent = `[...document.querySelectorAll('button')].some(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''))`
const stopped = `!(${turnRunning})`
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

// —— 认领臂场景（--scenario claim，桌面选择契约卡 261012）：桌面选待认领片段 →
// 「认领这件事」→ 新会话（种子回合吃主脚本第一格，对齐契约同上）→ 本人指归属 →
// 回放真调 claim 消费 u-1 → 片段离开待认领通道 + 本会话 committed 回执读回 →
// 自动返回并**选中归属事项**（「这条落在哪」的桌面回答）。认领臂总建自己的会话
// （当前会话可能正是产生歧义的那一个），单会话守卫与处理流同一口径。
if (scenario === 'claim') {
  const claimCard = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const card = [...(root?.querySelectorAll('button.dsha-card') ?? [])].find(b => (b.textContent ?? '').includes('二期款已经付了'));
    if (card === undefined) return 'fragment-card-not-found';
    card.click(); return 'selected';
  })()`)
  if (claimCard !== 'selected') { teardown(); fail('claim-fragment-selection', { claimCard }) }
  const claimDetail = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const text = root?.innerText ?? '';
    const claim = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').trim() === '认领这件事');
    return { noteVisible: text.includes('二期款已经付了'), sourceVisible: text.includes('来自 session-e2e-fragment-source'), claimButtonPresent: claim !== undefined };
  })()`)
  if (claimDetail?.noteVisible !== true || claimDetail?.claimButtonPresent !== true) {
    teardown(); fail('claim-detail', { claimDetail })
  }
  pass('claim-fragment-detail', { detail: claimDetail })

  const sessionsBeforeClaim = countProbeSessions()
  const claimEntry = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').trim() === '认领这件事');
    if (button === undefined) return 'button-not-found';
    button.click(); return 'clicked';
  })()`)
  if (claimEntry !== 'clicked') { teardown(); fail('claim-entry', { claimEntry }) }
  let claimConversation = false
  for (let i = 0; i < 40 && !claimConversation; i++) {
    claimConversation = await evaluate(`document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`) === true
    if (!claimConversation) await sleep(500)
  }
  if (!claimConversation) { teardown(); fail('claim-conversation', {}) }
  pass('claim-entry', {})
  // 种子回合对齐：等「正在处理待认领片段…」那一轮跑完（其答复含「还没归户」）再粘贴，
  // 否则粘贴那轮会吃错回放格（BUG-009 的教训在认领臂同样成立）。
  let claimSeedSettled = false
  for (let i = 0; i < 240 && !claimSeedSettled; i++) {
    await sleep(500)
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次'); b?.click(); })()`)
    claimSeedSettled = await evaluate(`(${stopped}) && (document.body.innerText ?? '').includes('还没归户')`) === true
  }
  if (!claimSeedSettled) fail('claim-seed-turn', {})
  pass('claim-seed-turn', {})
  let claimReady = false
  let claimPasteResult = null
  for (let i = 0; i < 10 && !claimReady; i++) {
    claimPasteResult = await evaluate(pasteOnce.replace(JSON.stringify(followupPrompt), JSON.stringify(claimPrompt)))
    await sleep(800)
    claimReady = await evaluate(sendEnabled) === true
  }
  if (!claimReady) { teardown(); fail('claim-composer', { claimPasteResult }) }
  await sleep(600)
  if (await evaluate(`(() => {
    const send = [...document.querySelectorAll('button')].find(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''));
    if (send === undefined || send.disabled) return 'not-sent';
    send.click(); return 'sent';
  })()`) !== 'sent') { teardown(); fail('claim-send', {}) }
  let claimReturnText = null
  for (let i = 0; i < 180 && claimReturnText === null; i++) {
    await sleep(500)
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次'); b?.click(); })()`)
    claimReturnText = await evaluate(deskText)
  }
  if (claimReturnText === null) fail('claim-auto-return', { body: await evaluate('document.body.innerText') })
  const afterClaim = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
  const claimReceipt = afterClaim.operations['op-authored-claim-u1']
  if (claimReceipt?.receipt.outcome.status !== 'committed') fail('claim-durable', { claimReceipt })
  if (afterClaim.unclaimed['u-1'] !== undefined) fail('claim-fragment-consumed', { unclaimed: afterClaim.unclaimed })
  const claimedMatter = Object.values(afterClaim.matters).find(m => m.id === 'm-1')
  if (!claimedMatter?.materials.some(m => (m.note ?? '').includes('二期款已经付了'))) fail('claim-material-attached', { materials: claimedMatter?.materials })
  // 「这条落在哪」：返回后详情停在归属事项上；「通道清空」的信号是计数行不再有
  // 「条待认领」、列表标签消失——片段的原文此时作为**已附着的材料**出现在归属事项的
  // 依据里（来源与原文随附），那是成功态而不是未清态。
  if (!claimReturnText.includes('合同 NB-02 第二期款') || !claimReturnText.includes('处理这件事')) fail('claim-return-selection', { claimReturnText })
  if (claimReturnText.includes('条待认领') || claimReturnText.includes('还没说清是哪件事')) fail('claim-lane-cleared', { claimReturnText })
  pass('claim-auto-return', {})
  pass('claim-durable', { outcome: claimReceipt.receipt.outcome })
  pass('claim-lane-cleared-and-selected', { matter: 'm-1' })
  mkdirSync(shotDir, { recursive: true })
  writeFileSync(join(shotDir, '4-claimed-and-selected.png'), await browser.captureScreenshot())
  const sessionsAfterClaim = countProbeSessions()
  if (sessionsAfterClaim !== sessionsBeforeClaim + 1) {
    teardown()
    fail('claim-single-session', { sessionsBeforeClaim, sessionsAfterClaim })
  }
  pass('claim-single-session', { created: sessionsAfterClaim - sessionsBeforeClaim })

  // 相位（桌面历史视角卡 261012 ③）：流水视角——切到流水，操作按天倒序在场（今天的认领
  // 在种子账本 10-10 的交办立项之前），点认领条目跳转回看板并选中归属事项。
  const activitySwitch = await evaluate(`(() => {
    const chip = [...document.querySelectorAll('button.dsha-filter-chip')].find(b => (b.textContent ?? '').trim() === '流水');
    if (chip === undefined) return 'mode-chip-not-found';
    chip.click(); return 'switched';
  })()`)
  if (activitySwitch !== 'switched') { teardown(); fail('activity-switch', { activitySwitch }) }
  const feedText = await evaluate(deskText)
  if (feedText === null || !feedText.includes('认领归户') || !feedText.includes('交办立项')) fail('activity-feed', { feedText: String(feedText).slice(0, 300) })
  if (feedText.indexOf('认领归户') > feedText.indexOf('交办立项')) fail('activity-order', { feedText: String(feedText).slice(0, 300) })
  const entryJump = await evaluate(`(() => {
    const entry = [...document.querySelectorAll('button.dsha-activity-entry')].find(b => (b.textContent ?? '').includes('认领归户'));
    if (entry === undefined) return 'entry-not-found';
    entry.click(); return 'jumped';
  })()`)
  if (entryJump !== 'jumped') { teardown(); fail('activity-jump', { entryJump }) }
  const jumpedText = await evaluate(deskText)
  if (jumpedText === null || !jumpedText.includes('处理这件事') || !jumpedText.includes('合同 NB-02 第二期款')) {
    fail('activity-jump-selection', { jumpedText: String(jumpedText).slice(0, 200) })
  }
  pass('activity-feed-and-jump', {})
  writeFileSync(join(shotDir, '5-activity-feed.png'), await browser.captureScreenshot())

  verdict.consoleProblems = consoleProblems
  verdict.exceptions = exceptions
  teardown()
  if (consoleProblems.length > 0 || exceptions.length > 0) {
    console.log(JSON.stringify(verdict, null, 2))
    process.exit(1)
  }
  console.log(`PASS desk claim flow e2e: ${JSON.stringify(verdict.phases)}`)
  process.exit(0)
}

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

// 相位 3b（BUG-009 的真病根）：粘贴前等这个会话 idle。
// 处理会话一挂载，注入的「正在处理事项…」消息就起了一个回合；回合运行中 vendor 的 composer
// 是「停止」态——没有发送键、粘贴会被丢掉（失败取证实测：composer 在、valueLength 0、send false）。
// 不等它，判据就变成「那个回合多快跑完」——一个纯负载相关的量（本探针因此在空闲机上绿、
// 在负载机上红）。完成信号用「停止键消失 + 发送键回来」，与 loop-probe 同一习语；
// 审批门（「允许一次」）就地点掉，别让回合停在等真人上。
let conversationIdle = false
for (let i = 0; i < 240 && !conversationIdle; i++) {
  await sleep(500)
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次'); b?.click(); })()`)
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
  pasteResult = await evaluate(pasteOnce)
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
const sent = await evaluate(`(() => {
  const send = [...document.querySelectorAll('button')].find(b =>
    (b.getAttribute('aria-label') ?? '') === '发送消息' || (b.getAttribute('aria-label') ?? '') === 'Send message');
  if (send === undefined) return 'no-send-button';
  if (send.disabled) return 'send-disabled';
  send.click(); return 'sent';
})()`)
if (sent !== 'sent') { teardown(); fail('send', { sent }) }

let settled = false
for (let i = 0; i < 600 && !settled; i++) {
  await sleep(500)
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次'); b?.click(); })()`)
  if (await evaluate(deskPresent)) fail('pending-stays-in-chat', { reason: 'returned before explicit decision' })
  settled = await evaluate(`(${stopped}) && (document.body.innerText ?? '').includes(${JSON.stringify(finalReplyMarker)})`) === true
}
if (!settled) fail('first-turn-settle', {})
const beforeReject = JSON.parse(readFileSync(join(operatingDir, 'ledger.json'), 'utf8'))
const matterBefore = Object.values(beforeReject.matters).find(m => m.id === 'm-1')
if (!matterBefore?.proposals.some(p => p.id === 'p-1' && p.status === 'pending')) fail('pending-proposal', { matterBefore })
pass('pending-stays-in-chat', {})
mkdirSync(shotDir, { recursive: true })
writeFileSync(join(shotDir, '1-pending-stays-in-chat.png'), await browser.captureScreenshot())
await evaluate(pasteOnce.replace(JSON.stringify(followupPrompt), JSON.stringify(rejectPrompt)))
await sleep(500)
if (!await evaluate(sendEnabled)) fail('reject-composer', {})
await evaluate(`(() => { [...document.querySelectorAll('button')].find(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''))?.click(); })()`)
let returnText = null
for (let i = 0; i < 120 && returnText === null; i++) { await sleep(500); returnText = await evaluate(deskText) }
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
let intakeConversation = false
for (let i = 0; i < 40 && !intakeConversation; i++) {
  intakeConversation = await evaluate(`document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`) === true
  if (!intakeConversation) await sleep(500)
}
if (!intakeConversation) { teardown(); fail('intake-conversation', {}) }
pass('intake-entry', {})
let intakeReady = false
for (let i = 0; i < 10 && !intakeReady; i++) {
  await evaluate(pasteOnce.replace(JSON.stringify(followupPrompt), JSON.stringify(intakePrompt)))
  await sleep(800)
  intakeReady = await evaluate(sendEnabled) === true
}
if (!intakeReady) { teardown(); fail('intake-composer', {}) }
await sleep(600)
if (await evaluate(`(() => {
  const send = [...document.querySelectorAll('button')].find(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''));
  if (send === undefined || send.disabled) return 'not-sent';
  send.click(); return 'sent';
})()`) !== 'sent') { teardown(); fail('intake-send', {}) }
let intakeReturnText = null
for (let i = 0; i < 180 && intakeReturnText === null; i++) { await sleep(500); intakeReturnText = await evaluate(deskText) }
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
