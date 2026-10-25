#!/usr/bin/env node
/**
 * Agent-preset UI probe: on an already-running clean Web instance, open Settings → Agent 预设,
 * set 章鱼管家 as the new-task default, and assert the card becomes the default.
 *
 * Why a probe rather than a unit test: the install manual's Web path depends on the shipped
 * `ui-agent-preset` surface rendering the bundle's custom preset and the Remote `settings.update`
 * accepting `selectedDefault`. Only the real client can show that. The probe leaves the selected
 * default in the instance's home; run it against a throwaway home.
 *
 * Usage:
 *   node dev/probes/web/agent-preset-ui.mjs '<url-with-token>'
 *
 * The caller owns the instance (clean home + installed tarball + `dsh --profile web --port 0`).
 * Exit 0 = the card was found, clicked, and reports `新任务默认: 章鱼管家`.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const url = process.argv[2]
if (url === undefined || !url.startsWith('http')) {
  console.error("usage: node dev/probes/web/agent-preset-ui.mjs '<url-with-token>'")
  process.exit(2)
}

const shots = join(dirname(fileURLToPath(import.meta.url)), 'webui-shots.mjs')
const name = 'agent-preset-ui'

// A shadow-root-aware walk: the settings surface may render controls behind an open shadow root.
const deep = `
  const deep = root => {
    const out = []
    const seen = new Set()
    const visit = r => {
      for (const el of r.querySelectorAll('*')) {
        if (seen.has(el)) continue
        seen.add(el)
        out.push(el)
        if (el.shadowRoot) visit(el.shadowRoot)
      }
    }
    visit(root)
    return out
  }
`

const steps = [
  `(() => {
    const b = Array.from(document.querySelectorAll('button')).find(e => ((e.getAttribute('aria-label') || '') + e.textContent).includes('账号菜单'))
    if (!b) return 'no account menu'
    b.click()
    return 'clicked account menu'
  })()`,
  `(() => {
    const b = Array.from(document.querySelectorAll('button,[role=menuitem],a')).find(e => (e.textContent || '').includes('设置'))
    if (!b) return 'no settings entry'
    b.click()
    return 'clicked settings'
  })()`,
  `(() => {
    const b = Array.from(document.querySelectorAll('button,[role=tab]')).find(e => (e.textContent || '').includes('Agent 预设'))
    if (!b) return 'no Agent presets tab'
    b.click()
    return 'clicked Agent presets'
  })()`,
  `(async () => {
    ${deep}
    for (let i = 0; i < 50; i++) {
      const label = e => e.getAttribute('aria-label') || ''
      const already = deep(document).find(e => label(e) === '新任务默认: 章鱼管家')
      if (already) return 'already default'
      const b = deep(document).find(e => label(e) === '设为新任务默认: 章鱼管家')
      if (b) {
        b.click()
        return 'clicked set-default'
      }
      await new Promise(r => setTimeout(r, 200))
    }
    return 'no set-default control'
  })()`,
  `(async () => {
    ${deep}
    for (let i = 0; i < 30; i++) {
      const b = deep(document).find(e => (e.getAttribute('aria-label') || '') === '新任务默认: 章鱼管家')
      if (b) return 'default now: ' + b.getAttribute('aria-label')
      await new Promise(r => setTimeout(r, 200))
    }
    return 'default marker never appeared'
  })()`,
]

const args = [shots, url, '--dom', '--size', '1600x1000', '--name', name]
for (const step of steps) args.push('--eval', step)
args.push('--require-eval', 'default now: 新任务默认: 章鱼管家')

const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
process.exit(result.status ?? 1)
