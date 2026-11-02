#!/usr/bin/env node
/**
 * Scene setup for `product-onboarding`:
 *
 *   node seed.mjs patch <home>   # before boot: pin workspace-controller's documentsDirectory and
 *                                # pre-ack the welcome notice (same rows as the banner scene).
 *
 * There is deliberately no `bind` step: the product row is `not-configured`, so the client gate
 * must render the first-run chooser instead of the ordinary dashboard.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [command, homeArg] = process.argv.slice(2)
if (command !== 'patch' || homeArg === undefined) {
  console.error('usage: node seed.mjs patch <home-dir>')
  process.exit(1)
}
const home = resolve(homeArg)
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
      '# product-onboarding 场景预置：默认工作区落在本 home 内。',
      '- id: workspace-controller',
      "  name: '@deepseek-ai/dsh-api-workspace-controller'",
      '  config:',
      `    documentsDirectory: ${join(home, 'workspaces')}`,
    ],
  },
  {
    marker: 'welcomeNoticeVersion',
    block: [
      '# product-onboarding 场景预置：预确认内测声明（配置字段即已确认版本）。',
      '- id: ui-settings-general',
      "  name: '@deepseek-ai/dsh-client-ui-settings-general'",
      '  config:',
      '    welcomeNoticeVersion: 2026-09-28.1',
    ],
  },
]
const missing = rows.filter(row => !current.includes(row.marker))
if (missing.length === 0) {
  console.log('seed: onboarding scene rows already present — skip')
  process.exit(0)
}
const addition = missing.map(row => ['', ...row.block].join('\n')).join('\n')
// The dev profile's user layer is an empty array after setup.sh; an appended list
// must replace that placeholder, not follow it (two YAML documents do not parse).
writeFileSync(patchPath, current.replace(/^\s*\[\s*\]\s*$/m, '').replace(/\n*$/, '\n') + addition + '\n')
console.log(`seed: ${missing.length} profile row(s) written → ${patchPath}`)
