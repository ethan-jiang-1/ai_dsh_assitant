#!/usr/bin/env node
/**
 * Scene setup for `first-open-draft-banner` — the two steps the boot order forces apart:
 *
 *   node seed.mjs patch <home>   # BEFORE boot: pin workspace-controller's documentsDirectory
 *                                # into the profile patch (P1-C fix, trial-home precedent) so the
 *                                # default workspace deterministically lives inside this home.
 *   node seed.mjs desk <home>    # AFTER boot: once the default workspace exists, write the seeded
 *                                # desk file (3 draft knowledge rows) that the banner counts.
 *
 * Why a script instead of README prose: both steps are path-dependent (the pin carries the
 * home's absolute path; the workspace dir name is only known after first boot) and both must
 * be idempotent — a half-run scene re-runs the same two commands, not a divergent state.
 * The desk file shape mirrors real desk-refresh output (contract: the desk-refresh skill);
 * timestamps are fixed so the rendered DOM carries no clock.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [command, homeArg] = process.argv.slice(2)
if (command === undefined || homeArg === undefined) {
  console.error('usage: node seed.mjs <patch|desk> <home-dir>')
  process.exit(1)
}
const home = resolve(homeArg)

if (command === 'patch') {
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

if (command === 'desk') {
  const workspacesRoot = join(home, 'workspaces')
  // The default workspace is created asynchronously on first boot (~10s observed); poll rather
  // than sleep so a fast boot and a slow one take the same path.
  const deadline = Date.now() + 30_000
  let workspaceDir
  while (Date.now() < deadline) {
    workspaceDir = existsSync(workspacesRoot)
      ? readdirSync(workspacesRoot)
          .map(name => join(workspacesRoot, name, 'default-workspace'))
          .find(candidate => existsSync(candidate))
      : undefined
    if (workspaceDir !== undefined) break
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
  }
  if (workspaceDir === undefined) {
    console.error(`seed: no default workspace appeared under ${workspacesRoot} within 30s — was the service booted with the patched profile?`)
    process.exit(1)
  }
  const fixedTime = '2026-10-05T09:00:00+08:00'
  const draft = (id, title, excerpt, type) => ({
    id, title, status: 'draft', type, updated: fixedTime,
    sources: ['seeds/seed-pages/basis.md'],
    excerpt,
  })
  const desk = {
    generatedBy: 'desk-refresh',
    generatedAt: fixedTime,
    counts: { memories: 0, knowledgeStable: 2, knowledgeDraft: 3, skills: 0, threads: 0 },
    decisions: [],
    actions: [],
    gaps: [],
    recentActivity: [],
    threads: [],
    memories: [],
    skills: [],
    knowledge: [
      ...[
        ['promo-discount-auth', '国庆大促折扣授权申请（三档）', '方案页给出 5%/8%/12% 三档授权梯度、各自的用量与审批人；三档金额与生效期只给了结构，缺本单毛利支撑数。', 'plan'],
        ['payment-term-60d', '大客户账期放宽到 60 天的评估口径', '评估页建立账期与垫资的换算式、触发条件与退出条款；缺现金流安全垫的实际天数。', 'note'],
        ['trial-pricing-floor', '新服务付费试点的定价底线', '底线页按成本人天与愿付证据给出试点价的下限推导；两个输入数仍未到位，页内数字是占位。', 'plan'],
      ].map(([id, title, excerpt, type]) => draft(id, title, excerpt, type)),
      { id: 'reimb-policy', title: '差旅与招待报销口径', status: 'stable', type: 'policy', updated: fixedTime, sources: ['seeds/seed-pages/basis.md'], excerpt: undefined },
      { id: 'client-tiering', title: '客户分级与跟进节奏', status: 'stable', type: 'policy', updated: fixedTime, sources: ['seeds/seed-pages/basis.md'], excerpt: undefined },
    ],
  }
  const deskDir = join(workspaceDir, '.desk')
  mkdirSync(deskDir, { recursive: true })
  writeFileSync(join(deskDir, 'state.json'), JSON.stringify(desk, null, 2) + '\n')
  console.log(`seed: desk file written (3 drafts, 2 stable) → ${join(deskDir, 'state.json')}`)

  // A1a: the panel reads the host rooms route from the assistant working folder, not the
  // per-session desk copy. Seed the same 5 knowledge pages there so the banner's 3/2 counts and
  // the eventual room tab read the same truth. The desk file above stays for the preflight and
  // the prompt path until A1b retires it.
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

console.error(`seed: unknown command "${command}" — use patch or desk`)
process.exit(1)
