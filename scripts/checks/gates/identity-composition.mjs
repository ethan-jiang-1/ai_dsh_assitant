/**
 * Gate cores tying identity docs and composition rows to the code: package
 * subpaths, identity names, and the §二 plane trees vs the bundle patch.
 */
import { parseRows } from '../../generate/gen-catalog.mjs'
import { read } from './shared.mjs'

// ── package subpaths ───────────────────────────────────────────────────────────

/**
 * Every patch in this repo that names one of our package subpaths is a load-bearing reference:
 * a dev probe that resolves `dsh-smart-assistant/preset-runner` at runtime breaks the moment that
 * export is renamed, with no compile-time signal.
 *
 * The historical exports check read only `cordis.patch.yml`, which never references `preset-runner`
 * at all — so the four dev runner patches were unguarded, and renaming that single export would have
 * broken all of them while `verify` stayed green (found by audit, 2026-10-10).
 *
 * The corpus is passed in rather than discovered here: `verify.mjs` owns "what counts as corpus",
 * and a caller that forgets a patch is a visible gap instead of a silent one.
 *
 * @param options - `{ sources, exported }`; `sources` is `[{ file, text }]`, `exported` the manifest's
 *   `exports` keys.
 * @returns problem strings, empty when every referenced subpath is exported.
 */
export function packageSubpathProblems({ sources, exported }) {
  const problems = []
  const subpaths = new Set(Object.keys(exported).map(key => key.replace(/^\.\//, '')).filter(key => key !== '' && key !== 'package.json'))
  let references = 0
  for (const { file, text } of sources) {
    for (const match of text.matchAll(/name:\s*'?(dsh-smart-assistant\/[a-z0-9-]+)'?/g)) {
      references++
      const subpath = match[1].slice('dsh-smart-assistant/'.length)
      if (!subpaths.has(subpath)) {
        problems.push(`${file} references dsh-smart-assistant/${subpath}, which package.json does not export — renaming an export breaks every patch that names it`)
      }
    }
  }
  if (references === 0) problems.push('no patch references a dsh-smart-assistant subpath — the exports check has nothing to compare against')
  return problems
}

// ── identity names ─────────────────────────────────────────────────────────────

/**
 * `docs/identity.md` is the single authority for identity names, and its row-id cell is a hand copy
 * of what the patch mounts — so it rots in both directions, not just one. The historical check only
 * asked "does every mounted row appear in identity.md", which cannot see a rename: the new id gets
 * added, the dead id stays, and `verify` goes green while the page still advertises a row that no
 * longer exists (found by audit, 2026-10-10; reproduced with a rename fixture).
 *
 * Names are read from backticked tokens **in the rows that own them** (「插件行 id」/「工具 wire 名」),
 * not page-wide. The page legitimately writes counter-examples in prose — a note like "不要写成
 * `assistant-Memory`" would otherwise be read as a claim and red the check on good documentation.
 * Reading only the owning rows keeps the reverse direction honest without punishing explanation.
 *
 * @param options - `{ patchText, avatars, identityText }`; `avatars` maps a source label to its text.
 * @returns problem strings, empty when the page and the code agree.
 */
export function identityNameProblems({ patchText, avatars, identityText }) {
  const problems = []
  const rowLine = label => {
    const line = identityText.split('\n').find(candidate => candidate.includes(label) && candidate.trimStart().startsWith('|'))
    return line === undefined ? '' : line
  }
  const rowIdLine = rowLine('插件行 id')
  const toolLine = rowLine('工具 wire 名')
  // A row-id *claim* is an id the cell annotates with its plane — `` `assistant-x`（agent） ``. The
  // cell also names non-row vocabulary in backticks (the `assistant-` prefix itself, the
  // `assistant-operating` dataDir, config keys like `denyToolPrefix`), and the annotation convention
  // is exactly what separates "this is one of our rows" from "this word appears nearby".
  const rowNames = new Set([...rowIdLine.matchAll(/`(assistant-[a-z0-9]+(?:-[a-z0-9]+)*)`（(?:host|agent)/g)].map(match => match[1]))
  const toolNames = new Set([...toolLine.matchAll(/`(assistant_[a-z0-9]+(?:_[a-z0-9]+)*)`/g)].map(match => match[1]))
  if (rowNames.size === 0) {
    problems.push('docs/identity.md declares no `assistant-` row ids — the reverse check cannot verify a page that names nothing')
  }

  const rows = parseRows(patchText)
  const mounted = new Set(rows.map(row => row.id))
  const ourRows = rows
    .filter(row => row.name !== undefined && /^dsh-smart-assistant(\/|$)/.test(row.name))
    .map(row => row.id)
  if (ourRows.length === 0) {
    problems.push('cordis.patch.yml declares no dsh-smart-assistant rows — the identity check has nothing to compare against')
  }

  // Forward: a mounted row must be named in the row-id line.
  for (const id of ourRows) {
    if (!rowNames.has(id)) problems.push(`row id ${id} is not in docs/identity.md`)
  }
  // Reverse: a row id the page names must really be mounted (catches the dead id after a rename).
  for (const id of rowNames) {
    if (!mounted.has(id)) {
      problems.push(`docs/identity.md names row id ${id}, but cordis.patch.yml mounts no such row — a renamed or deleted row left a dead id behind`)
    }
  }

  // Tool wire names: the same two directions against the sources that declare them.
  const declaredTools = new Set()
  for (const source of Object.values(avatars)) {
    for (const match of source.matchAll(/name:\s*'(assistant_[a-z_]+)'/g)) declaredTools.add(match[1])
  }
  if (declaredTools.size === 0) problems.push('no assistant_* tool names found in src')
  for (const name of declaredTools) {
    if (!toolNames.has(name)) problems.push(`tool name ${name} is not in docs/identity.md`)
  }
  for (const name of toolNames) {
    if (!declaredTools.has(name)) {
      problems.push(`docs/identity.md names tool ${name}, but no src module declares it — a renamed tool left a dead name behind`)
    }
  }

  if (!identityText.includes('assistantMemory')) problems.push('docs/identity.md does not record the ctx key')
  return problems
}

// ── composition rows: the hand-copied plane trees ───────────────────────────────

/**
 * `docs/architecture.md` §二 is a hand-copied diff of the generated catalog's 组合行 table: two
 * plane trees naming the rows `cordis.patch.yml` mounts. Prose has no freshness check, and this
 * copy has the most surface to rot — the audited drift class is "the composition grew, the tree
 * stayed short" (a row mounts with no line in the picture). Two directions, both mechanical:
 *
 *   · every row the patch mounts under our own package name must be named by a §二 tree line;
 *   · every row id those tree lines name must be a real row in the patch.
 *
 * Only the §二 fenced blocks count: they are the composition picture; a prose mention elsewhere is
 * not one. Capture covers both shapes the trees use — `├── id` / `└── id` and the indented `+ id 行`
 * continuation — so a restyled tree fails loud instead of passing by naming nothing.
 *
 * @param options - `{ patchText, architectureText }`.
 * @returns problem strings, empty when the trees and the patch agree.
 */
export function compositionRowProblems({ patchText, architectureText }) {
  const problems = []
  const rows = parseRows(patchText)
  const mounted = new Set(rows.map(row => row.id))
  const ourRows = rows
    .filter(row => row.name !== undefined && /^dsh-smart-assistant(\/|$)/.test(row.name))
    .map(row => row.id)

  const start = architectureText.indexOf('## 二、')
  const end = architectureText.indexOf('\n## 三、', start)
  if (start < 0 || end < 0) {
    return ['docs/architecture.md carries no §二/§三 heading pair — the composition-tree slice cannot be cut; restore the section titles before trusting this gate']
  }
  const named = new Set()
  let inFence = false
  for (const line of architectureText.slice(start, end).split('\n')) {
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (!inFence) continue
    const match = /^\s*(?:[├└]──|[+])\s*([a-z][a-z0-9-]*)/.exec(line)
    if (match !== null) named.add(match[1])
  }

  for (const id of ourRows) {
    if (!named.has(id)) {
      problems.push(`composition: cordis.patch.yml mounts row ${id} but no §二 plane-tree line in docs/architecture.md names it — the composition grew and the hand copy stayed short`)
    }
  }
  for (const id of named) {
    if (!mounted.has(id)) {
      problems.push(`composition: docs/architecture.md §二 names row ${id} but cordis.patch.yml mounts no such row — the hand copy kept a row that is gone`)
    }
  }
  return problems
}
