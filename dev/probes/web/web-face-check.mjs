#!/usr/bin/env node
/**
 * One-command replay of the web-face scenes: fresh isolated home → seed → boot the real service
 * → capture/compare the committed expectation → stop.
 *
 * Default: the four customer scenes. `--all` adds the four Viki debug scenes: one fixed
 * OpenViking mock (viki-panel-connected/seed.mjs) serves connected/diagnostics/search, while
 * disconnected points at a dead port; all Viki pages use `#debug=1`.
 *
 * The unit lane has one real-DOM spec (happy-dom + react-dom); this lane stays the full
 * Chrome/CDP render, because the Viki tab, right rail and scene clicks are only real there.
 *
 * Usage:
 *   node dev/probes/web/web-face-check.mjs [--scenario <name>] [--all] [--keep]
 *   Customer: blank-first-open, first-open-draft-banner, desk-eight-matters-first-open,
 *             desk-eight-matters-brief-list (default)
 *   Viki:     viki-panel-connected, viki-panel-diagnostics, viki-panel-disconnected,
 *             viki-panel-search (only with --all or --scenario)
 */
import { spawn, spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'
import { sleep } from './probe-utils.mjs'
import { startProbeService } from './probe-service.mjs'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const args = process.argv.slice(2)
const keep = args.includes('--keep')
const all = args.includes('--all')
const scenarioArg = args.includes('--scenario') ? args[args.indexOf('--scenario') + 1] : undefined

const CUSTOMER = [
  'blank-first-open',
  'first-open-draft-banner',
  'desk-eight-matters-first-open',
  'desk-eight-matters-brief-list',
]
const VIKI = [
  'viki-panel-connected',
  'viki-panel-diagnostics',
  'viki-panel-disconnected',
  'viki-panel-search',
]
const ALL = [...CUSTOMER, ...VIKI]
if (scenarioArg !== undefined && !ALL.includes(scenarioArg)) {
  console.error(`web-face-check: unknown scenario ${scenarioArg}; choose one of ${ALL.join(', ')}`)
  process.exit(2)
}

const failures = []
const failed = (message) => {
  failures.push(message)
  console.error(`  FAIL ${message}`)
}
const ok = (message) => console.log(`  ok   ${message}`)

function sh(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: repoRoot, stdio: 'inherit', ...options })
  return result.status ?? 1
}

function provision(home) {
  console.log(`  · provisioning ${home}`)
  if (sh('bash', ['dev/env/prepare.sh'], { env: { ...process.env, ASSISTANT_DSH_HOME: home } }) !== 0) return false
  if (sh('bash', ['dev/env/setup.sh'], { env: { ...process.env, ASSISTANT_DSH_HOME: home } }) !== 0) return false
  return true
}

function seed(nodeArgs, home) {
  return sh(process.execPath, nodeArgs, { env: { ...process.env, ASSISTANT_DSH_HOME: home } }) === 0
}

function expected(url, scenario, expectedArgs) {
  const target = scenario.startsWith('viki-') ? `${url}#debug=1` : url
  return sh(process.execPath, [
    'dev/probes/web/webui-expected.mjs', target,
    '--scenario', `snapshots/web-face/${scenario}`,
    ...expectedArgs,
  ])
}

async function withService(home, options, run) {
  const { service, url, pidFile } = await startProbeService({
    repoRoot,
    home,
    pidName: '.web-face-check.pid',
    ...(options.patch !== undefined ? { patch: options.patch } : {}),
    ...(options.extraEnv !== undefined ? { extraEnv: options.extraEnv } : {}),
  })
  try {
    return await run(url)
  } finally {
    try { service.kill('SIGTERM') } catch { /* already gone */ }
    try { rmSync(pidFile, { force: true }) } catch { /* already gone */ }
    await sleep(400)
  }
}

function warmUp(scenario, url, name) {
  return sh(process.execPath, [
    'dev/probes/web/webui-shots.mjs', url,
    '--dom', '--size', '1600x1000', '--name', `web-face-check-${name}`,
  ])
}

/* Viki evals are copied from the scene READMEs; each is one page-context snippet. */
const CONTINUE = "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='继续');b?.click();return true})()"
const NEW_SESSION = "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim().includes('新会话'));b?.click();return !!b})()"
const RIGHT_BAR = "(()=>{const b=document.querySelector('button[aria-label=\"打开右侧边栏\"]');b?.click();return !!b})()"
const VIKI_TAB = "(()=>{const el=[...document.querySelectorAll('button,[role=tab],a')].find(e=>e.textContent?.trim().startsWith('Viki'));if(!el)return false;el.click();return true})()"
const DIAGNOSTICS = "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='诊断');b?.click();return !!b})()"
const SEARCH = "(()=>{const i=[...document.querySelectorAll('input')].find(e=>e.placeholder?.includes('搜索记忆'));if(!i)return false;const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'夹具');i.dispatchEvent(new Event('input',{bubbles:true}));const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='搜索');b?.click();return !!b})()"

const VIKI_RECIPES = {
  'viki-panel-connected': { evals: [CONTINUE, NEW_SESSION, RIGHT_BAR, VIKI_TAB], wait: '固定夹具' },
  'viki-panel-diagnostics': { evals: [CONTINUE, NEW_SESSION, RIGHT_BAR, VIKI_TAB, DIAGNOSTICS], wait: '健康' },
  'viki-panel-disconnected': { evals: [CONTINUE, NEW_SESSION, RIGHT_BAR, VIKI_TAB], wait: 'Viki 未连接' },
  'viki-panel-search': { evals: [CONTINUE, NEW_SESSION, RIGHT_BAR, VIKI_TAB, SEARCH], wait: '搜索「夹具」' },
}

async function startVikiMock() {
  const mock = spawn(process.execPath, ['snapshots/web-face/viki-panel-connected/seed.mjs', '--port', '19433'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let base
  mock.stdout.on('data', chunk => {
    const match = /viki mock on (http:\/\/\S+)/.exec(String(chunk))
    if (match !== null) base = match[1]
  })
  for (let i = 0; i < 80 && base === undefined; i++) await sleep(250)
  if (base === undefined) {
    mock.kill('SIGTERM')
    throw new Error('viki mock never announced its URL')
  }
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`${base}/health`)
      if (response.ok) return { mock, base }
    } catch {
      // not listening yet
    }
    await sleep(200)
  }
  mock.kill('SIGTERM')
  throw new Error(`viki mock did not answer /health at ${base}`)
}

async function runViki(names) {
  const home = mkTmpDir('web-face-check', 'viki-home-')
  console.log(`\n▶ viki (${home})`)
  if (!provision(home)) return failed('viki: provision failed')

  const connected = names.filter(name => name !== 'viki-panel-disconnected')
  if (connected.length > 0) {
    let mock
    let base
    try {
      ({ mock, base } = await startVikiMock())
    } catch (error) {
      failed(`viki mock: ${error instanceof Error ? error.message : String(error)}`)
      if (!keep) rmSync(home, { recursive: true, force: true })
      return
    }
    try {
      const code = await withService(home, { extraEnv: { OPENVIKING_URL: base } }, async url => {
        let status = 0
        for (const scenario of connected) {
          const recipe = VIKI_RECIPES[scenario]
          const result = expected(url, scenario, [
            ...recipe.evals.flatMap(evalSnippet => ['--eval', evalSnippet]),
            '--wait-text', recipe.wait,
          ])
          if (result === 0) ok(scenario)
          else { failed(`${scenario} (exit ${result})`); status = 1 }
        }
        return status
      })
      if (code !== 0 && connected.length === 1) failed(`viki connected group (exit ${code})`)
    } finally {
      try { mock.kill('SIGTERM') } catch { /* already gone */ }
      await sleep(400)
    }
  }

  if (names.includes('viki-panel-disconnected')) {
    const code = await withService(home, { extraEnv: { OPENVIKING_URL: 'http://127.0.0.1:9' } }, url => {
      const recipe = VIKI_RECIPES['viki-panel-disconnected']
      return expected(url, 'viki-panel-disconnected', [
        ...recipe.evals.flatMap(evalSnippet => ['--eval', evalSnippet]),
        '--wait-text', recipe.wait,
      ])
    })
    if (code === 0) ok('viki-panel-disconnected')
    else failed(`viki-panel-disconnected (exit ${code})`)
  }
  if (!keep) rmSync(home, { recursive: true, force: true })
}

async function runBlank() {
  const home = mkTmpDir('web-face-check', 'blank-home-')
  console.log(`\n▶ blank-first-open (${home})`)
  if (!provision(home)) return failed('blank-first-open: provision failed')
  const workspace = join(home, 'workspace.patch.yml')
  writeFileSync(workspace, [
    '- id: workspace-controller',
    "  name: '@deepseek-ai/dsh-api-workspace-controller'",
    '  config:',
    `    documentsDirectory: ${join(home, 'workspaces')}`,
    '',
  ].join('\n'))
  const code = await withService(home, { patch: workspace }, url =>
    expected(url, 'blank-first-open', ['--wait-text', '最近哪件事让你拿不准']))
  if (code === 0) ok('blank-first-open') ; else failed(`blank-first-open (exit ${code})`)
  if (!keep) rmSync(home, { recursive: true, force: true })
}

async function runBanner() {
  const home = mkTmpDir('web-face-check', 'banner-home-')
  console.log(`\n▶ first-open-draft-banner (${home})`)
  if (!provision(home)) return failed('first-open-draft-banner: provision failed')
  const seedScript = 'snapshots/web-face/first-open-draft-banner/seed.mjs'
  if (!seed([seedScript, 'patch', home], home)) return failed('first-open-draft-banner: seed patch failed')
  const code = await withService(home, {}, async url => {
    if (warmUp('first-open-draft-banner', url, 'banner') !== 0) return 1
    if (!seed([seedScript, 'rooms', home], home)) return 1
    return expected(url, 'first-open-draft-banner', [
      '--eval', "(() => { const b = [...document.querySelectorAll('button')].find(x => ((x.getAttribute('aria-label') ?? '') + (x.textContent ?? '')).includes('新建会话') || (x.textContent ?? '').trim() === '新会话'); if (!b) return 'no-new'; b.click(); return 'clicked'; })()",
      '--wait-text', '描述你想要构建的内容',
    ])
  })
  if (code === 0) ok('first-open-draft-banner') ; else failed(`first-open-draft-banner (exit ${code})`)
  if (!keep) rmSync(home, { recursive: true, force: true })
}

async function runDesk() {
  const home = mkTmpDir('web-face-check', 'desk-home-')
  console.log(`\n▶ desk-eight-matters (${home})`)
  if (!provision(home)) return failed('desk-eight-matters: provision failed')
  const seedScript = 'snapshots/web-face/desk-eight-matters-first-open/seed.mjs'
  if (!seed([seedScript, 'patch', home], home)) return failed('desk-eight-matters: seed patch failed')
  if (!seed([seedScript, 'desk', home], home)) return failed('desk-eight-matters: seed desk failed')
  const code = await withService(
    home,
    { patch: join(repoRoot, 'dev/probes/web/projection-fixture.patch.yml') },
    async url => {
      if (warmUp('desk-eight-matters', url, 'desk') !== 0) return 1
      const first = expected(url, 'desk-eight-matters-first-open', ['--wait-text', '还有 7 件'])
      if (first !== 0) return first
      return expected(url, 'desk-eight-matters-brief-list', [
        '--eval', "(() => { const b=[...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim().startsWith('全部')); if (!b) return 'no-all'; b.click(); return 'all' })()",
        '--wait-text', '它在盯什么',
      ])
    })
  if (code === 0) ok('desk-eight-matters-first-open + brief-list') ; else failed(`desk-eight-matters (exit ${code})`)
  if (!keep) rmSync(home, { recursive: true, force: true })
}

const selected = scenarioArg !== undefined ? [scenarioArg] : all ? ALL : CUSTOMER
let deskDone = false
let vikiDone = false
for (const scenario of selected) {
  if (scenario === 'blank-first-open') await runBlank()
  else if (scenario === 'first-open-draft-banner') await runBanner()
  else if (scenario.startsWith('viki-')) {
    if (!vikiDone) {
      vikiDone = true
      await runViki(selected.filter(name => name.startsWith('viki-')))
    }
  } else if (!deskDone) {
    deskDone = true
    await runDesk()
  }
}

console.log('')
if (failures.length > 0) {
  console.log(`web-face-check: ${failures.length} failure(s)`)
  process.exit(1)
}
const lane = all ? 'customer + viki' : scenarioArg?.startsWith('viki-') ? 'viki' : scenarioArg === undefined ? 'customer' : 'one scene'
console.log(`web-face-check: PASS — all selected scenes match (${lane})`)
