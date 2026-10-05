#!/usr/bin/env node
/**
 * Generate `docs/package-catalog.md` — the generated index of what this package currently
 * declares (entries × plane, composition rows, tool wire names × verbs, prompt sections,
 * curated skills, pin and dependency posture).
 *
 * Why generated: every hand-maintained inventory in this repo has drifted (the package README
 * carried "three rooms / three tools / 5 entries" long after the fourth room landed). The catalog
 * answers "what does the repo declare" from the real sources, and `--check` makes drift a red gate
 * (the same shape as `scripts/gen-paths.mjs`).
 *
 * Sources (all fail loud — a shape change must break the gate, not silently thin the catalog):
 *   packages/dsh-smart-assistant/package.json            exports, dsh bundle/client/compatibility
 *   packages/dsh-smart-assistant/cordis.patch.yml        host rows
 *   packages/dsh-smart-assistant/cordis.patch.yml        host row + the `agent-preset` row's plugins
 *   packages/dsh-smart-assistant/src/agent/{tool-*,learn}/index.ts          tool names + action verbs
 *   packages/dsh-smart-assistant/presets/assistant/skills/*\/SKILL.md  curated skill names
 *   vendor/UPSTREAM.md                                   pinned upstream tag
 *
 * @module scripts/generate/gen-catalog
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')

const read = path => readFileSync(path, 'utf8')

/** Parse `- id: … / name: … / disabled: …` rows out of a cordis yml. Fails loud on a nameless row. */
export function parseRows(text) {
  const rows = []
  let current
  for (const line of text.split('\n')) {
    const id = /^(\s*)- id:\s*(\S+)\s*$/.exec(line)
    if (id !== null) {
      if (current !== undefined && current.name === undefined && current.disabled === undefined) {
        throw new Error(`gen-catalog: row "${current.id}" has neither name nor disabled — the row shape changed`)
      }
      current = { id: id[2], indent: id[1].length }
      rows.push(current)
      continue
    }
    if (current === undefined) continue
    const indent = /^(\s*)/.exec(line)[1].length
    if (indent <= current.indent) continue
    const name = /^\s*name:\s*(.+?)\s*$/.exec(line)
    if (name !== null && current.name === undefined) current.name = name[1]
    const disabled = /^\s*disabled:\s*(.+?)\s*$/.exec(line)
    if (disabled !== null && current.disabled === undefined) current.disabled = disabled[1]
  }
  if (current !== undefined && current.name === undefined && current.disabled === undefined) {
    throw new Error(`gen-catalog: last row "${current.id}" has neither name nor disabled — the row shape changed`)
  }
  return rows
}

/** Extract a tool's wire name and action verbs from its source. Fails loud when either is absent. */
export function extractTool(source, label) {
  const name = /name:\s*'([a-z_]+)'/.exec(source)?.[1]
  if (name === undefined) throw new Error(`gen-catalog: ${label} declares no tool name`)
  const constActions = /const ACTIONS = \[([^\]]+)\]/s.exec(source)?.[1]
  const inlineActions = /action:\s*\{[^}]*enum:\s*\[([^\]]+)\]/s.exec(source)?.[1]
  const raw = constActions ?? inlineActions
  if (raw === undefined) throw new Error(`gen-catalog: ${label} declares no action enum (const ACTIONS or inline enum)`)
  const actions = [...raw.matchAll(/'([a-z_]+)'/g)].map(match => match[1])
  if (actions.length === 0) throw new Error(`gen-catalog: ${label} action enum parsed empty`)
  return { name, actions }
}

/** Extract the client seat surface from `src/client/index.ts`. Fails loud when the file
 *  carries no recognizable surface or when a room tab lacks its guide entry — a renamed
 *  helper or a not-discoverable tab must break the gate, not silently thin the catalog. */
export function extractClientSurface(source) {
  const seats = [...source.matchAll(/ctx\.slots\.inject\('([a-z][a-z.]+)'/g)].map(match => match[1])
  const roomTabs = [...source.matchAll(/\{\s*\n\s*id: '([^']+)', kind: '([A-Za-z]+)',/g)]
    .map(match => ({ id: match[1], kind: match[2] }))
  const guideEntries = [...source.matchAll(/guide: \[\{/g)].length
  const commands = [...source.matchAll(/\{\s*\n\s*name: '([a-z]+)',\s*\n\s*label:/g)].map(match => match[1])
  if (seats.length === 0 || roomTabs.length === 0) {
    throw new Error('gen-catalog: client source declares no recognizable seat surface — the extraction shape changed')
  }
  if (roomTabs.length > 0 && guideEntries === 0) {
    throw new Error('gen-catalog: room tabs registered without any guide entry — every addable tab must be discoverable in the "+" picker')
  }
  return { seats: [...new Set(seats)], roomTabs, guideEntries, commands: [...new Set(commands)] }
}

/** Read every catalog input from disk. */
export function collectCatalog(root = repoRoot) {
  const pkg = JSON.parse(read(join(root, 'packages', 'dsh-smart-assistant', 'package.json')))
  const patchRows = parseRows(read(join(root, 'packages', 'dsh-smart-assistant', 'cordis.patch.yml')))
  const hostRows = patchRows.filter(row => row.name === 'dsh-smart-assistant')
  // 0.1.7: one file carries both planes — the host `insert` rows and the `agent-preset` row whose
  // `plugins` list is the agent plane. Classification is by composition position (nesting under the
  // `preset-assistant` row), NOT by plugin name: a host row may carry a package subpath too
  // (assistant-knowledge-approve 先例——按名字分会把它错标成 agent 面，与 identity.md 相抵，2026-10-04 实修).
  const presetRow = patchRows.find(row => row.id === 'preset-assistant')
  if (presetRow === undefined) throw new Error('gen-catalog: cordis.patch.yml has no preset-assistant row — the patch shape changed')
  const agentRows = patchRows.filter(row => (row.name ?? '').startsWith('dsh-smart-assistant/') && row.indent > presetRow.indent)
  const hostSubRows = patchRows.filter(row => (row.name ?? '').startsWith('dsh-smart-assistant/') && row.indent <= presetRow.indent)
  const devPatch = join(root, 'dev', 'probes', 'session', 'preset-runner.patch.yml')
  const devRows = existsSync(devPatch)
    ? parseRows(read(devPatch)).filter(row => (row.name ?? '').startsWith('dsh-smart-assistant'))
    : []
  const tools = ['tool-memory', 'tool-research', 'tool-knowledge', 'learn'].map(dir => ({
    label: `src/agent/${dir}/index.ts`,
    ...extractTool(read(join(root, 'packages', 'dsh-smart-assistant', 'src', 'agent', dir, 'index.ts')), `src/agent/${dir}/index.ts`),
  }))
  const skillsDir = join(root, 'packages', 'dsh-smart-assistant', 'presets', 'assistant', 'skills')
  const skills = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter(name => existsSync(join(skillsDir, name, 'SKILL.md'))).sort()
    : []
  const upstream = read(join(root, 'vendor', 'UPSTREAM.md'))
  const pin = /钉住的 tag \| `([^`]+)`/.exec(upstream)?.[1]
  if (pin === undefined) throw new Error('gen-catalog: vendor/UPSTREAM.md carries no pinned tag row')
  const clientSurface = pkg.dsh?.client !== undefined
    ? extractClientSurface(read(join(root, 'packages', 'dsh-smart-assistant', 'src', 'client', 'index.ts')))
    : undefined
  return {
    exports: Object.keys(pkg.exports ?? {}),
    hostRows,
    hostSubRows,
    agentRows,
    devRows,
    tools,
    skills,
    pin,
    clientSurface,
    releases: Object.keys(pkg.dsh?.compatibility?.dshReleases ?? {}),
    dependencies: Object.keys(pkg.dependencies ?? {}),
    peers: Object.keys(pkg.peerDependencies ?? {}),
    client: pkg.dsh?.client !== undefined,
  }
}

/** Render the catalog markdown from collected inputs (pure). */
export function renderCatalog(input) {
  const pluginEntries = new Map()
  for (const row of input.hostRows) {
    if (row.name === 'dsh-smart-assistant') pluginEntries.set('.', 'HOST')
  }
  for (const row of input.hostSubRows ?? []) {
    const match = /^dsh-smart-assistant\/(.+)$/.exec(row.name ?? '')
    if (match !== null) pluginEntries.set(`./${match[1]}`, 'HOST')
  }
  for (const row of input.agentRows) {
    const match = /^dsh-smart-assistant\/(.+)$/.exec(row.name ?? '')
    if (match !== null) pluginEntries.set(`./${match[1]}`, 'AGENT')
  }
  for (const row of input.devRows) {
    const match = /^dsh-smart-assistant\/(.+)$/.exec(row.name ?? '')
    if (match !== null) pluginEntries.set(`./${match[1]}`, 'AGENT（dev 专用）')
  }
  if (input.client) pluginEntries.set('./client', 'CLIENT（浏览器面）')
  const otherExports = input.exports.filter(entry => !pluginEntries.has(entry))
  const countOf = plane => [...pluginEntries.values()].filter(value => value.startsWith(plane)).length
  const lines = []
  lines.push('<!-- GENERATED by scripts/generate/gen-catalog.mjs — do not edit by hand; run `pnpm gen-catalog`. -->')
  lines.push('')
  lines.push('# 包形状目录（生成物）')
  lines.push('')
  lines.push('> **生成物，不手改**：本文件由 `scripts/generate/gen-catalog.mjs` 从 `package.json` 的 exports、')
  lines.push('> `cordis.patch.yml`（host 行 + `agent-preset` 行的 plugins）/ `dev/probes/session/preset-runner.patch.yml` 的组合行、')
  lines.push('> 四个工具源码的 name/ACTIONS、')
  lines.push('> `src/client/index.ts` 的座位注册、')
  lines.push('> 策展技能目录与 `vendor/UPSTREAM.md` 的 pin 抽取而成；')
  lines.push('> freshness 由 `pnpm verify`（`gen-catalog --check`）守——改了源却没重生成即红。')
  lines.push('> 语义与改名代价的 owner 是 [`identity.md`](identity.md)；这里只回答"当前声明了什么"。')
  lines.push('')
  lines.push(`## 入口与平面（${pluginEntries.size} 个 plugin 子路径 = host ${countOf('HOST')} + agent ${countOf('AGENT')} + client ${countOf('CLIENT')}）`)
  lines.push('')
  lines.push('| 入口 | 平面 | 组合行 id |')
  lines.push('|---|---|---|')
  const rowFor = name => [...input.hostRows, ...(input.hostSubRows ?? []), ...input.agentRows].find(row => row.name === name)
  for (const [entry, plane] of pluginEntries) {
    const name = entry === '.' ? 'dsh-smart-assistant' : `dsh-smart-assistant${entry.slice(1)}`
    lines.push(`| \`${entry}\` | ${plane} | ${rowFor(name)?.id ?? '—'} |`)
  }
  lines.push('')
  if (otherExports.length > 0) {
    lines.push(`非 plugin 导出（不挂组合行）：${otherExports.map(entry => `\`${entry}\``).join('、')}`)
    lines.push('')
  }
  lines.push('## 组合行')
  lines.push('')
  lines.push('| 文件 | id | plugin | 状态 |')
  lines.push('|---|---|---|---|')
  for (const [file, rows] of [
    ['cordis.patch.yml（host 面）', [...input.hostRows, ...(input.hostSubRows ?? [])]],
    ['cordis.patch.yml（agent 面 = preset 行的 plugins）', input.agentRows],
    ['dev/probes/session/preset-runner.patch.yml（dev 专用）', input.devRows],
  ]) {
    for (const row of rows) {
      lines.push(`| ${file} | \`${row.id}\` | \`${row.name}\` | ${row.disabled === undefined ? '启用' : `条件：${row.disabled}`} |`)
    }
  }
  lines.push('')
  lines.push('## 工具与动词（wire 名是身份，动词集互不重叠）')
  lines.push('')
  lines.push('| 工具 | 动词 | 源码 |')
  lines.push('|---|---|---|')
  for (const tool of input.tools) {
    lines.push(`| \`${tool.name}\` | ${tool.actions.map(action => `\`${action}\``).join(' ')} | ${tool.label} |`)
  }
  lines.push('')
  lines.push(`## 策展技能（模型用，${input.skills.length} 个）`)
  lines.push('')
  lines.push(input.skills.map(name => `\`${name}\``).join('、'))
  lines.push('')
  lines.push('> 开发用 Skill（若有）在 `.agents/skills/`，不进 preset——两类同名概念的分工见根 `AGENTS.md`。')
  lines.push('')
  if (input.clientSurface !== undefined) {
    lines.push('## 客户端座位面（CLIENT，全走 vendor 通用座位；皮肤面，不进模型上下文）')
    lines.push('')
    lines.push(`- 消费 slot 座位（slots.inject）：${input.clientSurface.seats.map(seat => `\`${seat}\``).join('、')}`)
    lines.push(`- 右栏 tab 定义（sidebarRightTabs.register，含「+」向导 guide 条目）：${input.clientSurface.roomTabs.map(tab => `\`${tab.id}\`（${tab.kind}）`).join('、')}`)
    lines.push(`- 命令注册（commandUi，slash 菜单与 composer 加号菜单的发现面）：${input.clientSurface.commands.map(command => `\`${command}\``).join('、') || '（无）'}`)
    lines.push('')
  }
  lines.push('## 兼容与依赖姿态')
  lines.push('')
  lines.push(`- 钉住的上游 tag：\`${input.pin}\``)
  lines.push(`- 记录为 verified 的 DSH release：${input.releases.map(version => `\`${version}\``).join('、')}`)
  lines.push(`- 运行时 dependencies：${input.dependencies.map(name => `\`${name}\``).join('、') || '（无）'}`)
  lines.push(`- peerDependencies：${input.peers.length} 个 \`@deepseek-ai/*\`（姿态由门禁守：harness 包只许 peer）`)
  lines.push(`- client 面（浏览器包）：${input.client ? '有' : '无'}`)
  lines.push('')
  return lines.join('\n')
}

/** Build the catalog text from disk. */
export function buildCatalog(root = repoRoot) {
  return renderCatalog(collectCatalog(root))
}

// CLI: `node scripts/generate/gen-catalog.mjs` writes; `--check` fails when the file is stale.
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = join(repoRoot, 'docs', 'package-catalog.md')
  const rendered = buildCatalog()
  if (process.argv.includes('--check')) {
    const current = existsSync(target) ? read(target) : ''
    if (current !== rendered) {
      console.error('gen-catalog: docs/package-catalog.md is stale — run `pnpm gen-catalog` and commit the result')
      process.exit(1)
    }
    console.log('gen-catalog: docs/package-catalog.md is current')
  } else {
    writeFileSync(target, rendered)
    console.log(`gen-catalog: wrote ${target}`)
  }
}
