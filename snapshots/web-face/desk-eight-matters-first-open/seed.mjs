#!/usr/bin/env node
/**
 * Scene setup for `desk-eight-matters-first-open`:
 *
 *   node seed.mjs patch <home>   # BEFORE boot: pin workspace-controller's documentsDirectory
 *                                # into the profile patch (banner-scene posture), pre-ack the
 *                                # welcome notice (the modal belongs to blank-first-open), and
 *                                # merge the dev home's credential refs (structure only grows).
 *   node seed.mjs desk <home>    # any time before the page opens: seed the operating ledger's
 *                                # fixed simulation input — the eight-matters fixture copied to
 *                                # <home>/assistant-operating/desk-projection.json, with any
 *                                # ledger.json removed (a live ledger always wins over the
 *                                # fixture; this scene pins the fixture state).
 *
 * Why a script instead of README prose: every step is path-dependent and idempotent — a
 * half-run scene re-runs the same commands, not a divergent state. The fixture bytes are
 * the repo's committed `dev/fixtures/desk-projection/eight-matters.json` (served verbatim
 * by the host route), so the rendered desk carries no clock.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const fixture = join(repoRoot, 'dev', 'fixtures', 'desk-projection', 'eight-matters.json')

const [command, homeArg] = process.argv.slice(2)
if (command === undefined || homeArg === undefined) {
  console.error('usage: node seed.mjs <patch|desk> <home-dir>')
  process.exit(1)
}
const home = resolve(homeArg)

/**
 * Merge the dev home's credential refs into the scene home (banner-scene posture: the
 * onboarding pair is removed from the capture — notice pre-acked by config, API Key guide
 * removed by the refs). The scene keeps its own browser-session grant; only the `refs:`
 * block is copied when the scene has none. The file is 0600.
 */
function mergeCredentialRefs() {
  const sceneCred = join(home, '.credentials.yaml')
  const devCred = join(repoRoot, 'dev', 'harness-home', '.credentials.yaml')
  let devText
  try { devText = readFileSync(devCred, 'utf8') } catch { return }
  const refs = devText.match(/(^refs:\n(?:[ \t]+.*\n)*)/m)?.[1]
  if (refs === undefined) return
  let sceneText = ''
  try { sceneText = readFileSync(sceneCred, 'utf8') } catch { /* first run: copy the whole file */ }
  if (sceneText.includes('refs:')) return
  const next = sceneText === '' ? devText : sceneText.replace(/^records:/m, `${refs}records:`)
  writeFileSync(sceneCred, next.endsWith('\n') ? next : `${next}\n`, { mode: 0o600 })
  chmodSync(sceneCred, 0o600)
  console.log('seed: credential refs merged from the dev home')
}

if (command === 'patch') {
  mergeCredentialRefs()
  const patchPath = join(home, 'profiles', 'dev', 'cordis.patch.yml')
  if (!existsSync(patchPath)) {
    console.error(`seed: no profile patch at ${patchPath} — run prepare.sh && setup.sh first`)
    process.exit(1)
  }
  // Both rows are idempotent and independent: a half-patched home gets only what it lacks.
  // Same posture as first-open-draft-banner: the workspace pin makes the default workspace
  // deterministically live inside this home; the notice ack keeps the modal out of the
  // capture (the modal-present first open is blank-first-open's tenant, not this scene's).
  const rows = [
    {
      marker: 'documentsDirectory',
      block: [
        '# desk-eight-matters-first-open 场景预置（banner 场景同款姿势，判据见本场景 README）：',
        '# 默认工作区指到本 home 内的可写路径——确定创建、桌面文件有确定落点。',
        '- id: workspace-controller',
        "  name: '@deepseek-ai/dsh-api-workspace-controller'",
        '  config:',
        `    documentsDirectory: ${join(home, 'workspaces')}`,
      ],
    },
    {
      marker: 'welcomeNoticeVersion',
      block: [
        '# 场景预置：预确认内测声明（配置字段即已确认版本，vendor ui-settings-general）——',
        '# 本场景的标的是种子账本的桌面卡片，弹窗归 blank-first-open 场景钉。',
        '- id: ui-settings-general',
        '  name: \'@deepseek-ai/dsh-client-ui-settings-general\'',
        '  config:',
        '    welcomeNoticeVersion: 2026-09-28.1',
      ],
    },
  ]
  const current = readFileSync(patchPath, 'utf8')
  const missing = rows.filter(row => !current.includes(row.marker))
  if (missing.length === 0) {
    console.log('seed: workspace pin and notice ack already present — skip')
    process.exit(0)
  }
  const addition = missing.map(row => ['', ...row.block].join('\n')).join('\n')
  writeFileSync(patchPath, current.replace(/\n*$/, '\n') + addition + '\n')
  console.log(`seed: ${missing.length} profile row(s) written → ${patchPath}`)
  process.exit(0)
}

if (command === 'desk') {
  if (!existsSync(fixture)) {
    console.error(`seed: eight-matters fixture missing at ${fixture} (dev/fixtures/desk-projection/README.md owns it)`)
    process.exit(1)
  }
  // The operating ledger's separate data directory — the desk-projection route resolves
  // `<dshHome>/assistant-operating` when no dataDir is configured (host/desk-projection/index.ts),
  // which is exactly this path under ASSISTANT_DSH_HOME.
  const operatingDir = join(home, 'assistant-operating')
  mkdirSync(operatingDir, { recursive: true })
  // Fixture state: no ledger (the route renders ledger.json live when it exists — a ledger
  // always wins over the fixture; removing it keeps this scene on the fixed bytes), and the
  // fixed simulation input in place. Same shape as dev/probes/web/projection-live-mechanics.mjs.
  rmSync(join(operatingDir, 'ledger.json'), { force: true })
  copyFileSync(fixture, join(operatingDir, 'desk-projection.json'))
  console.log(`seed: eight-matters fixture copied (no ledger) → ${join(operatingDir, 'desk-projection.json')}`)
  process.exit(0)
}

console.error(`seed: unknown command "${command}" — use patch or desk`)
process.exit(1)
