#!/usr/bin/env node
/**
 * Scene setup for `first-open-draft-banner`:
 *
 *   node seed.mjs patch <home>   # BEFORE boot: pin workspace-controller's documentsDirectory
 *                                # into the profile patch (P1-C fix, trial-home precedent) so the
 *                                # default workspace deterministically lives inside this home.
 *   node seed.mjs rooms <home>   # any time before the page opens: write the 5 working-folder
 *                                # knowledge pages (3 draft + 2 stable) the banner counts.
 *
 * Why a script instead of README prose: both steps are path-dependent and idempotent — a
 * half-run scene re-runs the same commands, not a divergent state. The pages mirror the rooms
 * route's truth; timestamps are fixed so the rendered DOM carries no clock.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [command, homeArg] = process.argv.slice(2)
if (command === undefined || homeArg === undefined) {
  console.error('usage: node seed.mjs <patch|rooms> <home-dir>')
  process.exit(1)
}
const home = resolve(homeArg)

/**
 * Merge the dev home's credential refs into the scene home (README: API Key guide is removed by
 * the refs, structure only grows). The scene keeps its own browser-session grant; only the
 * `refs:` block is copied when the scene has none. The file is 0600.
 */
function mergeCredentialRefs() {
  const sceneCred = join(home, '.credentials.yaml')
  const devCred = join(process.cwd(), 'dev', 'harness-home', '.credentials.yaml')
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
  // The welcome-notice ack comes from the trial-home precedent: the config field IS the
  // acknowledged version (ui-settings-general/src/index.ts:1), so pinning it pre-acks the
  // notice modal — this scene's tenant is the banner, the modal belongs to blank-first-open.
  const rows = [
    {
      marker: 'documentsDirectory',
      block: [
        '# first-open-draft-banner 场景预置（P1-C 既定修法，判据见本场景 README）：',
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
        '# 本场景的标的是横幅，弹窗归 blank-first-open 场景钉。',
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

if (command === 'rooms') {
  const fixedTime = '2026-10-05T09:00:00+08:00'
  const knowledgeDir = join(home, 'assistant', 'knowledge')
  mkdirSync(knowledgeDir, { recursive: true })
  const pages = [
    ['promo-discount-auth', '国庆大促折扣授权申请（三档）', 'draft', 'plan', '方案页给出 5%/8%/12% 三档授权梯度、各自的用量与审批人；三档金额与生效期只给了结构，缺本单毛利支撑数。'],
    ['payment-term-60d', '大客户账期放宽到 60 天的评估口径', 'draft', 'note', '评估页建立账期与垫资的换算式、触发条件与退出条款；缺现金流安全垫的实际天数。'],
    ['trial-pricing-floor', '新服务付费试点的定价底线', 'draft', 'plan', '底线页按成本人天与愿付证据给出试点价的下限推导；两个输入数仍未到位，页内数字是占位。'],
    ['reimb-policy', '差旅与招待报销口径', 'stable', 'policy', '差旅与招待报销口径：交通住宿按标准、招待按事前审批；超出部分需书面说明。'],
    ['client-tiering', '客户分级与跟进节奏', 'stable', 'policy', '客户分级与跟进节奏：按收入、战略性与交付风险分三级，各自定义跟进频率与负责人。'],
  ]
  for (const [id, title, status, type, body] of pages) {
    const frontmatter = [
      '---',
      `id: ${id}`,
      `status: ${status}`,
      `type: ${type}`,
      `title: ${title}`,
      'sources:',
      '  - resource: seeds/seed-pages/basis.md',
      'tags: []',
      'generated:',
      '  by: agent:seed',
      `  at: ${fixedTime}`,
      '---',
      '',
    ].join('\n')
    writeFileSync(join(knowledgeDir, `${id}.md`), `${frontmatter}${body}\n`)
  }
  console.log(`seed: working-folder knowledge written (3 drafts, 2 stable) → ${knowledgeDir}`)
  process.exit(0)
}

console.error(`seed: unknown command "${command}" — use patch or rooms`)
process.exit(1)
