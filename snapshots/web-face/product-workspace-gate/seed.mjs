#!/usr/bin/env node
/**
 * Scene setup for `product-workspace-gate`:
 *
 *   node seed.mjs patch <home>   # before boot: pin workspace-controller's documentsDirectory and
 *                                # pre-ack the welcome notice (same rows as the banner scene).
 *   node seed.mjs bind <home>    # before boot: create a workspace OUTSIDE the product home and
 *                                # write assistant-product.workspaceDir into the dev profile patch.
 *
 * The workspace must stay outside the home: the product row refuses paths inside its own data
 * plane. The sibling directory keeps the gate label deterministic (`product-workspace`).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { addProfileRows } from '../../../dev/probes/web/scene-home.mjs'

const [command, homeArg] = process.argv.slice(2)
if (command === undefined || homeArg === undefined) {
  console.error('usage: node seed.mjs <patch|bind> <home-dir>')
  process.exit(1)
}
const home = resolve(homeArg)
const workspace = join(dirname(home), 'product-workspace')

if (command === 'patch') {
  const patchPath = join(home, 'profiles', 'dev', 'cordis.patch.yml')
  if (!existsSync(patchPath)) {
    console.error(`seed: no profile patch at ${patchPath} — run prepare.sh && setup.sh first`)
    process.exit(1)
  }
  const current = readFileSync(patchPath, 'utf8')
  const rows = [
    {
      marker: 'documentsDirectory',
      block: [
        '# product-workspace-gate 场景预置：默认工作区落在本 home 内（P1-C 修法）。',
        '- id: workspace-controller',
        "  name: '@deepseek-ai/dsh-api-workspace-controller'",
        '  config:',
        `    documentsDirectory: ${join(home, 'workspaces')}`,
      ],
    },
    {
      marker: 'welcomeNoticeVersion',
      block: [
        '# product-workspace-gate 场景预置：预确认内测声明（配置字段即已确认版本）。',
        '- id: ui-settings-general',
        "  name: '@deepseek-ai/dsh-client-ui-settings-general'",
        '  config:',
        '    welcomeNoticeVersion: 2026-09-28.1',
      ],
    },
  ]
  const missing = rows.filter(row => !current.includes(row.marker))
  if (missing.length === 0) {
    console.log('seed: product scene rows already present — skip')
    process.exit(0)
  }
  addProfileRows(patchPath, missing.map(row => row.block.join('\n')))
  console.log(`seed: ${missing.length} profile row(s) written → ${patchPath}`)
  process.exit(0)
}

if (command === 'bind') {
  mkdirSync(workspace, { recursive: true, mode: 0o700 })
  const patchPath = join(home, 'profiles', 'dev', 'cordis.patch.yml')
  if (!existsSync(patchPath)) {
    console.error(`seed: no profile patch at ${patchPath} — run prepare.sh && setup.sh first`)
    process.exit(1)
  }
  const current = readFileSync(patchPath, 'utf8')
  if (current.includes('assistant-product') && current.includes('workspaceDir')) {
    console.log(`seed: product Config workspace already present — skip`)
    process.exit(0)
  }
  const block = [
    '# product-workspace-gate 场景预置：产品工作区绑定（profile Config）。',
    '- id: assistant-product',
    '  config:',
    `    workspaceDir: ${workspace}`,
  ].join('\n')
  addProfileRows(patchPath, [block])
  console.log(`seed: product Config binding written → ${workspace}`)
  process.exit(0)
}

console.error(`seed: unknown command "${command}" — use patch or bind`)
process.exit(1)
