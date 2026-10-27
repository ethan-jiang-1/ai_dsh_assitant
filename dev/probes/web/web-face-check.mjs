#!/usr/bin/env node
/**
 * One-command replay of the customer web-face scenes: fresh isolated home → seed → boot the
 * real service → capture/compare the committed expectation → stop. This is the keyless lane
 * the scene READMEs describe by hand; Viki debug scenes stay out because they need the OpenViking
 * mock server and are not customer faces.
 *
 * Why not jsdom: the DOM-test packages are in the pnpm store but adding them offline is blocked
 * by the supply-chain policy. The existing Chrome/CDP lane is already the real render; this
 * script only removes the manual orchestration and the stale-runbook class of failure.
 *
 * Usage:
 *   node dev/probes/web/web-face-check.mjs [--scenario <name>] [--keep]
 *   Scenarios: blank-first-open, first-open-draft-banner, desk-eight-matters-first-open,
 *              desk-eight-matters-brief-list (default: all four).
 */
import { spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'
import { sleep } from './probe-utils.mjs'
import { startProbeService } from './probe-service.mjs'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const args = process.argv.slice(2)
const keep = args.includes('--keep')
const scenarioArg = args.includes('--scenario') ? args[args.indexOf('--scenario') + 1] : undefined

const CUSTOMER = [
  'blank-first-open',
  'first-open-draft-banner',
  'desk-eight-matters-first-open',
  'desk-eight-matters-brief-list',
]
if (scenarioArg !== undefined && !CUSTOMER.includes(scenarioArg)) {
  console.error(`web-face-check: unknown scenario ${scenarioArg}; choose one of ${CUSTOMER.join(', ')}`)
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
  return sh(process.execPath, [
    'dev/probes/web/webui-expected.mjs', url,
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

const selected = scenarioArg === undefined ? CUSTOMER : [scenarioArg]
for (const scenario of selected) {
  if (scenario === 'blank-first-open') await runBlank()
  else if (scenario === 'first-open-draft-banner') await runBanner()
  else await runDesk()
}

console.log('')
if (failures.length > 0) {
  console.log(`web-face-check: ${failures.length} failure(s)`)
  process.exit(1)
}
console.log('web-face-check: PASS — all selected customer scenes match')
