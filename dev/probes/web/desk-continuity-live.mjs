#!/usr/bin/env node
// web 主入口接续首回合的模型行为回归资产（issue 261012 点名缺口；BUG-012/013 的隔离地基之上）。
//
// 与既有两位的分工：
//   · `desk-process-e2e.mjs` 是确定性回放——判据「接线对不对」，模型输出固定；
//   · `pnpm eval:continuity`（continuity-run.mjs）是副入口（headless 随口续接）的模型行为判据；
//   · 本探针补**主入口**（web 桌面「处理」路径）的模型行为：真模型、种子账本、一次性 home，
//     判据直接复用 continuity-run 导出的 `analyzeContinuity`（两入口的会话日志同为 v4 形状，
//     五条判据同构：先读对事项 → 读回带种子独有标记 → 先读后答 → 承诺期限/待确认在场 →
//     全程无授权写入 + 账本字节不变）。
//
// 链路（自包含编排，先例 = desk-process-e2e）：供给一次性 home（setup.sh + 凭据 0600，BUG-001
// 教训）→ 种子账本 + `assertSeed` 前置断言 → 起真模型 web 服务（无回放 patch）→ CDP 打开桌面 →
// 点 XR-09 那张卡的「处理这件事」→ 等注入种子回合（真模型）跑完 → 优雅拆服务（释放
// writer.lock、日志落定）→ 会话日志差分选出绑定会话 → 判据 + 账本字节比对 → JSON 判决。
//
// 不能证明什么：桌面返回/导航契约（client spec 与确定性 e2e 的事）、话术与层级（desk-walk /
// 本人的事）、真实业务价值（卡上自然观察的事）。真模型每次文本都可能不同——判据钉的是行为
// 地板（读纪律、忠实标记、权限边界），不是措辞。
//
// Usage（repo 根）:
//   node dev/probes/web/desk-continuity-live.mjs [--home <dir>] [--keep-service] [--eval-timeout <ms>]
//     --home   探针 home（默认供给一次性 home 于 .tmp/continuity-web/home-*；给定时须已 prepare+setup）
// 前置：`pnpm build` 已跑（服务装载构建物）；dev home 有凭据存储（供一次性 home 复制）。
// 判定输出：JSON verdict，逐判据；任一失败 exit 1。home 留作 post-mortem 直到 .tmp 清扫。
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'
import { readEvents, sessionLogs } from '../../lib/session-logs.mjs'
import {
  analyzeContinuity, assertSeed, ledgerProblems, SEED_EXPECTATIONS, sessionExpectations, sha256,
} from '../../eval/continuity-run.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { option } from './probe-utils.mjs'
import { registerProbeTeardown, startProbeService, stopStaleProbeServices } from './probe-service.mjs'
import { conversationActive, deskText, dismissApproval, pollUntil, turnRunning, turnStopped } from './dialogue.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const fixturePath = join(repoRoot, 'dev', 'fixtures', 'eval-continuity', 'seed-ledger.json')
const devHome = join(repoRoot, 'dev', 'harness-home')
const evalTimeout = Number(option(process.argv.slice(2), 'eval-timeout', '120000'))
const keepService = process.argv.slice(2).includes('--keep-service')
const homeArg = option(process.argv.slice(2), 'home')

const verdict = { phases: {}, judge: undefined, ledger: undefined, session: undefined, host: undefined }
const fail = (phase, detail) => {
  verdict.phases[phase] = { pass: false, ...detail }
  console.log(JSON.stringify(verdict, null, 2))
  process.exitCode = 1
  throw new Error(`phase failed: ${phase}`)
}
const pass = (phase, detail = {}) => { verdict.phases[phase] = { pass: true, ...detail } }

// ── home：显式给定用之如仪；默认供给一次性 home（setup.sh + 凭据 0600）——
// 与 eval 跑器的 provisionRunHome 同一口径（BUG-012）。
let home = homeArg !== undefined ? resolve(homeArg) : undefined
if (home === undefined) {
  home = mkTmpDir('continuity-web', 'home-')
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
  verdict.home = `${home} (explicit)`
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

// ── 服务：直连 vendor CLI bin（硬规则 1 允许 tooling 自设 DSH_HOME；孤儿锁教训与直连理由见
// desk-process-e2e.mjs 头注）。真模型：无回放 patch。
stopStaleProbeServices(home)
const sessionsBefore = new Set(sessionLogs(home))
let browser = undefined
const { service, url, pidFile } = await startProbeService({
  repoRoot, home, pidName: '.desk-continuity-live-service.pid',
})
const teardown = registerProbeTeardown({ service, pidFile, getBrowser: () => browser, keepService })

try {
  // ── 浏览器：桌面是默认主区；种子账本让 m-1 直接在场。
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
  if (deskReady === null || !deskReady.includes('XR-09')) {
    const lastState = await evaluate(`(() => ({ desk: document.querySelector('[data-assistant-operating-desk]') !== null, head: (document.body?.innerText ?? '').slice(0, 300) }))()`)
    fail('matter-list', { waitedMs: 84000, lastState })
  }
  pass('matter-list', { matter: SEED_EXPECTATIONS.matterId })

  // ── 主入口：选 XR-09 卡（身份按种子标题判，不按位置）→ 详情出现相称动作 →「处理这件事」。
  const selected = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const card = [...(root?.querySelectorAll('button.dsha-card') ?? [])].find(b => (b.textContent ?? '').includes('XR-09'));
    if (card === undefined) return 'card-not-found';
    card.click(); return 'selected';
  })()`)
  if (selected !== 'selected') fail('matter-select', { selected })
  const detail = await pollUntil(evaluate, deskText, {
    intervalMs: 500, budget: 20, checkFirst: true,
    isDone: text => text !== null && text.includes('处理这件事'),
  })
  if (detail === null || !detail.includes('处理这件事')) fail('matter-detail', { detail: String(detail).slice(0, 300) })
  const clicked = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const process = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').trim() === '处理这件事');
    if (process === undefined) return 'button-not-found';
    process.click(); return 'clicked';
  })()`)
  if (clicked !== 'clicked') fail('process-entry', { clicked })
  const conversation = await pollUntil(evaluate, conversationActive, { checkFirst: true, budget: 40 })
  if (conversation !== true) fail('conversation-mounted', {})
  pass('process-entry', {})

  // ── 种子回合（注入消息起的真模型回合）跑完——它就是被判据的对象，等它写完日志。
  // 先等回合**开始**（挂载竞态：轮询可能落在回合起步前），再等它结束；回合时长本身就是
  // 数据（真模型），预算给足，负载形态记进判决（BUG-009 的红前先看它）。
  const started = Date.now()
  await pollUntil(evaluate, turnRunning, { intervalMs: 1000, budget: 90, checkFirst: true, eachCycle: dismissApproval })
  const settled = await pollUntil(evaluate, turnStopped, {
    intervalMs: 2000, budget: 300, checkFirst: false, eachCycle: dismissApproval,
  })
  if (settled !== true) fail('seed-turn', { waitedMs: Date.now() - started })
  pass('seed-turn', { seconds: Math.round((Date.now() - started) / 1000) })
  verdict.host = { ncpu: os.cpus().length, loadavg: os.loadavg().map(value => Number(value.toFixed(2))) }
} finally {
  // 拆服务再读日志：优雅退出释放 writer.lock、日志落定。
  teardown()
}

// ── 判据：会话日志差分 → 绑定会话以种子消息标记识别（web 首开另有一个空白 UI 会话，
// 两者都在差分里）→ 复用副入口的 analyzeContinuity（同构判据）+ 账本字节比对。
const fresh = sessionLogs(home).filter(log => !sessionsBefore.has(log))
const bound = []
for (const log of fresh) {
  const events = await readEvents(log)
  const hasSeedMarker = events.some(event => {
    if (event.type !== 'user/message') return false
    return JSON.stringify(event.data?.message?.content ?? event.data ?? {}).includes('XR-09')
  })
  if (hasSeedMarker) bound.push({ log, events })
}
if (bound.length !== 1) {
  verdict.judge = { passed: false, reasons: [`session-selection: expected exactly 1 session bound to the seeded matter (marker "XR-09"), got ${String(bound.length)} of ${String(fresh.length)} new session(s)`] }
} else {
  verdict.session = bound[0].log
  verdict.judge = analyzeContinuity(bound[0].events, sessionExpectations())
}
const ledgerAfter = sha256(readFileSync(join(operatingDir, 'ledger.json')))
verdict.ledger = { problems: ledgerProblems(ledgerBefore, ledgerAfter) }
if (verdict.judge.passed === true && verdict.ledger.problems.length === 0) {
  verdict.passed = true
  console.log(JSON.stringify(verdict, null, 2))
} else {
  verdict.passed = false
  console.log(JSON.stringify(verdict, null, 2))
  process.exitCode = 1
}
