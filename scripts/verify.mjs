#!/usr/bin/env node
/**
 * Mechanical gates for this repo. Run with `pnpm verify`.
 *
 * Everything here is a fact a machine can check, so a person does not have to remember it: the
 * identity names in `docs/identity.md` match the code, every `@deepseek-ai/*` import has a
 * resolution-facade entry, the published package stays self-contained, our skill-name grammar has not
 * drifted from the harness registry's, the home document lists the rooms the code creates, markdown
 * pointers (backticked paths, section references, relative links) name files and sections that exist,
 * the vendor/dsh pin matches its bookkeeping (tag, SHA, gitlink) with tracked sources clean, note
 * filenames and proposal status lines keep their shape, and the paths that must never be committed
 * are ignored.
 *
 * Exit code 1 with a per-check report when anything fails.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { agentsMdStabilityProblems, configParseProblems, deferralHomesProblems, dependencyPoseProblems, reservedItemProblems, GRADUATED_STATUS, implementedAlternativesProblems, languageGuardProblems, notesNamingProblems, notesStateProblems, notesTopLevelProblems, pinProblems, relativeLinkProblems, skillFrontmatterProblems, textHygieneProblems } from './verify-checks.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const vendorDsh = join(repoRoot, 'vendor', 'dsh')

const read = path => readFileSync(path, 'utf8')
const exists = path => existsSync(path)

/** Recursively list files under a directory, filtered by extension. */
function walk(directory, extensions) {
  if (!exists(directory)) return []
  const found = []
  for (const name of readdirSync(directory)) {
    // Dependency trees and the VCS store are never part of the managed corpus, and pnpm's
    // symlink chains can exceed the path limit before a filter would ever see them.
    if (name === 'node_modules' || name === '.git') continue
    const path = join(directory, name)
    if (statSync(path).isDirectory()) found.push(...walk(path, extensions))
    else if (extensions.some(extension => name.endsWith(extension))) found.push(path)
  }
  return found
}

const checks = []
const check = (name, run) => checks.push({ name, run })

// ── structure ───────────────────────────────────────────────────────────────────────────────────

const REQUIRED_PATHS = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  'ROADMAP.md',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'tsconfig.json',
  'docs/home.md',
  'docs/identity.md',
  'docs/discipline.md',
  'notes/intents.md',
  'notes/README.md',
  'dev/env.sh',
  'dev/setup.sh',
  'dev/profile-patch.yml',
  'snapshots/README.md',
  'vendor/UPSTREAM.md',
  '.gitmodules',
  'packages/dsh-smart-assistant/package.json',
  'packages/dsh-smart-assistant/cordis.patch.yml',
  'packages/dsh-smart-assistant/presets/assistant/agent.cordis.yml',
  'packages/dsh-smart-assistant/presets/assistant/preset.yml',
  'packages/dsh-smart-assistant/src/index.ts',
  'packages/dsh-smart-assistant/src/home/layout.ts',
  'packages/dsh-smart-assistant/src/memory/record.ts',
  'packages/dsh-smart-assistant/src/research/thread.ts',
  'packages/dsh-smart-assistant/src/skills/skill-file.ts',
  'packages/dsh-smart-assistant/src/tool-memory/index.ts',
  'packages/dsh-smart-assistant/src/tool-research/index.ts',
  'packages/dsh-smart-assistant/src/memory-digest/index.ts',
  'packages/dsh-smart-assistant/src/learn/index.ts',
  'scripts/release-smoke.mjs',
  'scripts/sync-dsh.mjs',
  'scripts/gen-paths.mjs',
  'tsconfig.tsx.json',
]

check('structure: required paths exist', () => REQUIRED_PATHS
  .filter(path => !exists(join(repoRoot, path)))
  .map(path => `missing ${path}`))

check('submodule: vendor/dsh matches UPSTREAM.md (tag, SHA, gitlink) and tracked sources are clean', () =>
  pinProblems(repoRoot))

// ── identity ────────────────────────────────────────────────────────────────────────────────────

const PACKAGE_NAME = 'dsh-smart-assistant'

check('identity: package name, bundle patch, and exports agree with the preset', () => {
  const problems = []
  const manifest = JSON.parse(read(join(packageDir, 'package.json')))
  if (manifest.name !== PACKAGE_NAME) problems.push(`package name is ${manifest.name}, expected ${PACKAGE_NAME}`)
  const patch = manifest.dsh?.bundle?.patch
  if (typeof patch !== 'string') problems.push('package.json declares no dsh.bundle.patch')
  else if (!exists(join(packageDir, patch))) problems.push(`dsh.bundle.patch points at missing ${patch}`)
  const preset = read(join(packageDir, 'presets', 'assistant', 'agent.cordis.yml'))
  const referenced = [...preset.matchAll(new RegExp(`name: '?${PACKAGE_NAME}/([a-z-]+)'?`, 'g'))]
    .map(match => match[1])
  for (const subpath of new Set(referenced)) {
    if (manifest.exports?.[`./${subpath}`] === undefined) {
      problems.push(`preset references ${PACKAGE_NAME}/${subpath}, which package.json does not export`)
    }
  }
  return problems
})

check('identity: every declared identity name appears in docs/identity.md', () => {
  const problems = []
  const identity = read(join(repoRoot, 'docs', 'identity.md'))
  const patch = read(join(packageDir, 'cordis.patch.yml'))
  const preset = read(join(packageDir, 'presets', 'assistant', 'agent.cordis.yml'))
  const rowIds = new Set([
    ...[...patch.matchAll(/^\s*-\s*id:\s*([a-z0-9-]+)/gm)].map(match => match[1]),
    ...[...preset.matchAll(/^\s*-\s*id:\s*([a-z0-9-]+)/gm)].map(match => match[1]),
  ])
  for (const id of rowIds) {
    if (id.startsWith('assistant-') && !identity.includes(id)) problems.push(`row id ${id} is not in docs/identity.md`)
  }
  const sources = walk(join(packageDir, 'src'), ['.ts'])
  const toolNames = new Set()
  for (const path of sources) {
    for (const match of read(path).matchAll(/name:\s*'(assistant_[a-z_]+)'/g)) toolNames.add(match[1])
  }
  for (const name of toolNames) {
    if (!identity.includes(name)) problems.push(`tool name ${name} is not in docs/identity.md`)
  }
  if (toolNames.size === 0) problems.push('no assistant_* tool names found in src')
  if (!identity.includes('assistantMemory')) problems.push('docs/identity.md does not record the ctx key')
  return problems
})

// ── resolution facade ───────────────────────────────────────────────────────────────────────────

check('resolution: every @deepseek-ai import has a tsconfig paths entry and a project reference', () => {
  const problems = []
  const base = read(join(repoRoot, 'tsconfig.base.json'))
  const pathsKeys = new Set([...base.matchAll(/^\s*"(@deepseek-ai\/[^"]+)":/gm)].map(match => match[1]))
  const projectConfig = read(join(packageDir, 'tsconfig.json'))
  // References are written relative to the package directory; compare absolute paths so the two
  // spellings of the same project cannot look like a mismatch.
  const references = new Set([...projectConfig.matchAll(/"path":\s*"([^"]+)"/g)]
    .map(match => resolve(packageDir, match[1])))
  const imported = new Set()
  for (const path of walk(join(packageDir, 'src'), ['.ts'])) {
    for (const match of read(path).matchAll(/from\s+'(@deepseek-ai\/[^']+)'/g)) imported.add(match[1])
  }
  for (const specifier of imported) {
    if (!pathsKeys.has(specifier)) {
      problems.push(`${specifier} is imported but has no paths entry in tsconfig.base.json`)
      continue
    }
    const target = new RegExp(`"${specifier.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}":\\s*\\["([^"]+)"\\]`).exec(base)?.[1]
    if (target === undefined) continue
    // Package-root entries end at a `src` directory; client-face entries end at `src/<subpath>`
    // (the vendor convention, e.g. `pkg/client` → `<pkg>/src/client`). In both cases the owning
    // project is the package directory the `src` tree belongs to.
    const srcSplit = target.indexOf('/src/')
    const projectDir = resolve(repoRoot, srcSplit === -1 ? target.replace(/\/src$/, '') : target.slice(0, srcSplit))
    if (!references.has(projectDir)) {
      problems.push(`${specifier} resolves to ${relative(repoRoot, projectDir)}, which packages/dsh-smart-assistant/tsconfig.json does not reference`)
    }
    if (!exists(join(repoRoot, target, 'index.ts'))) {
      problems.push(`${specifier} paths entry ${target} has no index.ts`)
    }
  }
  return problems
})

check('resolution: the runtime tsconfig for the source launch is present and current', () => {
  const problems = []
  const runtime = join(repoRoot, 'tsconfig.tsx.json')
  if (!exists(runtime)) return ['tsconfig.tsx.json is missing — run `pnpm gen-paths`']
  const text = read(runtime)
  if (!text.includes('GENERATED by scripts/gen-paths.mjs')) problems.push('tsconfig.tsx.json is not the generated file')
  // Spot-check a package the harness loads by name at boot, so a stale facade cannot pass silently.
  for (const name of ['@deepseek-ai/dsh-app-boot', '@deepseek-ai/dsh-agent-presets']) {
    if (!text.includes(`"${name}"`)) problems.push(`tsconfig.tsx.json has no alias for ${name}`)
  }
  // The source launch goes through scripts/dsh.mjs (which also enforces the dev home);
  // the gate follows the contract there, not the one-line package.json script.
  const launcher = read(join(repoRoot, 'scripts', 'dsh.mjs'))
  if (!launcher.includes('tsconfig.tsx.json') || !launcher.includes('TSX_TSCONFIG_PATH')) {
    problems.push('scripts/dsh.mjs does not point tsx at tsconfig.tsx.json')
  }
  return problems
})

check('client: the browser half registers via the loader facade and stays classic-script-safe', () => {
  const problems = []
  const files = walk(join(packageDir, 'src', 'client'), ['.ts'])
  if (files.length === 0) {
    return ['src/client is empty — the dsh.client declaration in package.json promises a browser half']
  }
  for (const path of files) {
    const where = relative(repoRoot, path)
    const text = read(path)
    // The shell concatenates client bundles into classic-script combos: a runtime
    // import/export statement is a parse error there and kills every later registration in
    // the same combo (learned the hard way: 2026-09-24, the ESM-shaped first attempt broke
    // the whole browser boot). Type-only forms are erased at emit and stay allowed.
    if (/^import\s+(?!type\s)/m.test(text)) {
      problems.push(`${where} has a runtime import — the browser half must take everything through the factory require`)
    }
    if (/^export\s+(?!type\s|interface\s)/m.test(text)) {
      problems.push(`${where} has a runtime export — the browser half must submit its surface through the loader registration`)
    }
    if (!text.includes('__ModuleLoader__')) {
      problems.push(`${where} never touches __ModuleLoader__ — the browser half must submit a factory registration`)
    }
  }
  // The emitted bundle is what the shell actually serves into classic-script combos, and
  // tsc synthesizes module markers (e.g. `export {};`) that a source-level scan cannot
  // see. So compile the artifact as a classic-script body — parse only, never executed.
  // `new Function` is the honest check; `node --check` is a false negative under Node's
  // module-syntax detection. A missing lib is not a failure (verify runs on fresh clones
  // before the first build; the source gate above is always active).
  const bundle = join(packageDir, 'lib', 'client', 'index.js')
  if (exists(bundle)) {
    const emitted = read(bundle)
    if (!emitted.includes('__ModuleLoader__')) {
      problems.push('lib/client/index.js never touches __ModuleLoader__ — run pnpm build after changing the browser half')
    }
    try {
      void new Function(emitted)
    } catch (error) {
      problems.push(`lib/client/index.js does not parse as a classic script (${String(error)}) — the combo it rides in would kill every later registration at browser boot`)
    }
  }
  return problems
})

check('resolution: skill-name grammar matches the harness registry', () => {
  const ours = /SKILL_NAME_PATTERN = (\/.*\/)/.exec(read(join(packageDir, 'src', 'skills', 'skill-file.ts')))?.[1]
  const registryPath = join(vendorDsh, 'packages', 'skill', 'skill', 'src', 'index.ts')
  if (!exists(registryPath)) return ['vendor/dsh skill registry source is missing']
  const theirs = /const SKILL_NAME = (\/.*\/)/.exec(read(registryPath))?.[1]
  if (ours === undefined || theirs === undefined) return ['could not read one of the skill-name patterns']
  return ours === theirs ? [] : [`our pattern ${ours} differs from the registry's ${theirs}`]
})

check('resolution: skill frontmatter keys we write are keys the provider reads', () => {
  const provider = read(join(vendorDsh, 'packages', 'skill', 'skill-filesystem', 'src', 'index.ts'))
  const problems = []
  // The provider reads fields by property access (`data.metadata`), so match the identifier.
  for (const key of ['name', 'description', 'whenToUse', 'metadata']) {
    if (!new RegExp(`\\b${key}\\b`).test(provider)) {
      problems.push(`provider source never reads frontmatter key ${key}`)
    }
  }
  return problems
})

// ── self-containment ────────────────────────────────────────────────────────────────────────────

check('self-containment: published files never reach outside the package', () => {
  const problems = []
  const published = [
    ...walk(join(packageDir, 'src'), ['.ts']),
    ...walk(join(packageDir, 'presets'), ['.yml', '.md']),
    join(packageDir, 'cordis.patch.yml'),
  ]
  for (const path of published) {
    const text = read(path)
    const where = relative(repoRoot, path)
    // Relative imports are fine as long as they resolve inside the package: the published tarball
    // has no repo around it, so `../../` past the package root is the failure being checked.
    for (const match of text.matchAll(/from\s+'(\.[^']+)'/g)) {
      const target = resolve(dirname(path), match[1])
      if (target !== packageDir && !target.startsWith(`${packageDir}/`)) {
        problems.push(`${where} imports ${match[1]}, which escapes the package`)
      }
    }
    if (/\bvendor\//.test(text)) {
      problems.push(`${where} mentions vendor/ — the published package must not depend on the submodule`)
    }
  }
  return problems
})

// ── documentation contracts ─────────────────────────────────────────────────────────────────────

check('contract: docs/home.md lists the rooms and archives the layout creates', () => {
  const problems = []
  const layout = read(join(packageDir, 'src', 'home', 'layout.ts'))
  const document = read(join(repoRoot, 'docs', 'home.md'))
  for (const constant of ['MEMORY_ROOM', 'RESEARCH_ROOM', 'SKILLS_ROOM', 'KNOWLEDGE_ROOM', 'ARCHIVE_DIRECTORY_NAME']) {
    const value = new RegExp(`export const ${constant} = '([a-z]+)'`).exec(layout)?.[1]
    if (value === undefined) problems.push(`layout.ts does not declare ${constant}`)
    else if (!document.includes(value)) problems.push(`docs/home.md never mentions ${value}`)
  }
  // All four tools: the fourth room's tool was missing from this list until a red-control run
  // showed the contract could drop assistant_knowledge without a word.
  for (const tool of ['assistant_memory', 'assistant_research', 'assistant_reflect', 'assistant_knowledge']) {
    if (!document.includes(tool)) problems.push(`docs/home.md never mentions ${tool}`)
  }
  return problems
})

// ── queue discipline ────────────────────────────────────────────────────────────────────────────

check('queue: every proposal is scheduled in ROADMAP.md', () => {
  const problems = []
  const roadmap = read(join(repoRoot, 'ROADMAP.md'))
  for (const file of walk(join(repoRoot, 'notes', 'proposed'), ['.md'])) {
    const name = relative(repoRoot, file)
    if (!roadmap.includes(basename(name))) {
      problems.push(`${name} has no home in ROADMAP.md — a proposal without a queue slot is a proposal being forgotten`)
    }
  }
  return problems
})

check('queue: digested proposals graduate out of notes/proposed/', () => {
  const problems = []
  for (const file of walk(join(repoRoot, 'notes', 'proposed'), ['.md'])) {
    const status = /状态：\*\*([^*]*)\*/.exec(read(file))?.[1] ?? ''
    if (GRADUATED_STATUS.test(status)) {
      problems.push(`${relative(repoRoot, file)} says it is done but still sits in notes/proposed/ — graduate it to notes/implemented/`)
    }
  }
  return problems
})

check('notes: top-level entries are the documented lifecycle set', () =>
  notesTopLevelProblems(join(repoRoot, 'notes')))

check('notes: state lines agree with their lifecycle directory', () =>
  notesStateProblems(join(repoRoot, 'notes')))

check('notes: note files follow YYYY-MM-DD-topic naming', () =>
  notesNamingProblems(join(repoRoot, 'notes')))

check('structure: every composition file we own parses as YAML', () =>
  configParseProblems([
    ...walk(join(repoRoot, 'dev'), ['.yml']).filter(file => !file.includes('harness-home')),
    join(packageDir, 'cordis.patch.yml'),
    ...walk(join(packageDir, 'presets'), ['.yml']),
  ]))

check('queue: reserved items name the person and stay non-actionable', () =>
  reservedItemProblems(read(join(repoRoot, 'ROADMAP.md'))))

check('notes: every stated trigger names its queue home (deferrals live in ROADMAP)', () =>
  deferralHomesProblems([
    ...walk(join(repoRoot, 'notes', 'implemented'), ['.md']),
    ...walk(join(repoRoot, 'notes', 'proposed'), ['.md']),
    ...walk(join(repoRoot, 'notes', 'research'), ['.md']),
  ]))

check('entry files: every AGENTS.md stays standing orders (no dates, no progress marks)', () =>
  [
    join(repoRoot, 'AGENTS.md'),
    join(repoRoot, 'docs', 'AGENTS.md'),
    join(repoRoot, 'dev', 'AGENTS.md'),
    join(repoRoot, 'scripts', 'AGENTS.md'),
    join(repoRoot, 'snapshots', 'AGENTS.md'),
    join(packageDir, 'AGENTS.md'),
  ].flatMap(agentsMdStabilityProblems))

check('language: model-facing sources and skill bodies are English (skin face exempt)', () =>
  languageGuardProblems([
    ...walk(join(packageDir, 'src'), ['.ts']).filter(file => !file.endsWith('.spec.ts')),
    ...walk(join(packageDir, 'presets', 'assistant', 'skills'), ['.md']),
  ].filter(file => !file.endsWith('web-branding.ts') && !file.includes(`${sep}client${sep}`))))

check('text: managed text is strict UTF-8 with exactly one trailing newline', () =>
  textHygieneProblems([
    join(repoRoot, 'AGENTS.md'), join(repoRoot, 'README.md'), join(repoRoot, 'ROADMAP.md'), join(repoRoot, 'CLAUDE.md'),
    ...walk(join(repoRoot, 'docs'), ['.md']),
    ...walk(join(repoRoot, 'notes'), ['.md']),
    ...walk(join(repoRoot, 'snapshots'), ['.md']),
    ...walk(packageDir, ['.md']).filter(file => !file.includes(`${sep}node_modules${sep}`)),
    ...walk(join(repoRoot, 'scripts'), ['.mjs']),
  ]))

check('dependencies: harness packages are peers and the pinned tag is recorded as verified', () =>
  dependencyPoseProblems(join(packageDir, 'package.json'), join(repoRoot, 'vendor', 'UPSTREAM.md')))

check('notes: implemented notes carry what they beat (输掉的方案)', () =>
  implementedAlternativesProblems(join(repoRoot, 'notes', 'implemented')))

check('contract: skill files carry valid frontmatter and match their directory', () => [
  // Both homes ride the same provider contract; the development home is discovered natively via
  // the provider's `project-agents` root (vendor: skill-filesystem/src/index.ts, rank 200).
  ...skillFrontmatterProblems(join(packageDir, 'presets', 'assistant', 'skills')),
  ...skillFrontmatterProblems(join(repoRoot, '.agents', 'skills')),
])

// ── reference integrity ─────────────────────────────────────────────────────────────────────────
//
// Markdown is this repo's routing surface: AGENTS.md and docs/ point at files and sections the
// reader is meant to reach, so a pointer naming a moved file or a vanished section is a dead route
// the gate should catch. Scope is deliberately narrow (the honest line between what this catches
// and what stays probe territory is registered in the absorb note):
//   · paths — backticked tokens whose first segment is a repo top-level directory, plus a small
//     allowlist of root/package basenames. External material (URLs, absolute paths, $VARS, globs)
//     and home-internal bare names (HOME.md, SKILL.md) are out of scope; dev/harness-home is
//     runtime residue created by dev/setup.sh and exempt.
//   · relative markdown links — `[text](path)` targets that are relative and path-shaped must
//     resolve to an existing file (standard markdown semantics: relative to the linking file).
//     Anchors/query strings are stripped but NOT validated (heading slugs are out of scope), and
//     prose placeholders (`(url)`, `(…)`) are out of scope by the path-shape rule. Fixtures pin
//     both sides: scripts' verify-checks.mjs ↔ tests/verify-gates.spec.mjs.
//   · sections — cross-file references only ("`docs/x.md` §三" / "x.md 第三节"). A trailing
//     「anchor」 must appear in the target heading, which is the branch that catches retargeted
//     numbers, not just removed ones. Same-file §N and pointers living in code comments are out
//     of scope: their staleness is semantic, which is audit/probe territory.
//   · absolute paths — contract docs (AGENTS.md, README.md, docs/) must not cite machine-local
//     absolute paths; notes/ is the registered home for external provenance.

const CHINESE_NUMERALS = '一二三四五六七八九十'
const TOP_LEVEL_DIRECTORIES = new Set(['docs', 'notes', 'packages', 'scripts', 'vendor', 'dev', 'snapshots'])
const KNOWN_ROOT_BASENAMES = new Set([
  'AGENTS.md', 'README.md', 'CLAUDE.md', 'package.json', 'pnpm-lock.yaml',
  'pnpm-workspace.yaml', 'tsconfig.base.json', 'tsconfig.json', 'tsconfig.tsx.json',
])
const KNOWN_PACKAGE_BASENAMES = new Set(['cordis.patch.yml'])

const markdownCorpus = [
  join(repoRoot, 'AGENTS.md'),
  join(repoRoot, 'README.md'),
  join(repoRoot, 'ROADMAP.md'),
  ...walk(join(repoRoot, 'docs'), ['.md']),
  ...walk(join(repoRoot, 'notes'), ['.md']),
  ...walk(join(repoRoot, 'snapshots'), ['.md']),
]

/** Resolve a backticked token to a repo path it may legitimately name, or null when out of scope. */
function resolveMarkdownPathReference(token) {
  if (token.includes(' ') || /[*<>~$@:'"()]/.test(token)) return null
  if (token.includes('…') || token.includes('...')) return null // abbreviated paths, same class as globs
  if (token.startsWith('/') || token.startsWith('.')) return null
  if (token === 'dev/harness-home' || token.startsWith('dev/harness-home/')) return null
  const [firstSegment] = token.split('/')
  if (token.includes('/')) {
    if (!TOP_LEVEL_DIRECTORIES.has(firstSegment)) return null
    return join(repoRoot, token)
  }
  if (KNOWN_ROOT_BASENAMES.has(token)) return join(repoRoot, token)
  if (KNOWN_PACKAGE_BASENAMES.has(token)) return join(packageDir, token)
  return null
}

check('links: backticked repo paths in markdown exist', () => {
  const problems = []
  const vendorPresent = exists(join(vendorDsh, 'packages', 'core', 'tools', 'src', 'index.ts'))
  for (const file of markdownCorpus) {
    const where = relative(repoRoot, file)
    for (const match of read(file).matchAll(/`([^`\n]+)`/g)) {
      const target = resolveMarkdownPathReference(match[1])
      if (target === null) continue
      if (!vendorPresent && target.startsWith(`${vendorDsh}/`)) continue
      if (!exists(target)) problems.push(`${where} references \`${match[1]}\`, which does not exist`)
    }
  }
  return problems
})

check('links: relative markdown links point at existing files', () =>
  relativeLinkProblems(markdownCorpus.map(file => ({ file, where: relative(repoRoot, file) }))))

check('links: cross-file section references name a real section', () => {
  const problems = []
  const reference = new RegExp(
    '`?([\\w./-]+\\.md)`?\\s*(?:§|第)([' + CHINESE_NUMERALS + ']+)(?:节)?(?:「([^」]+)」)?',
    'g',
  )
  for (const file of markdownCorpus) {
    const where = relative(repoRoot, file)
    for (const occurrence of read(file).matchAll(reference)) {
      const [, referenced, numeral, anchor] = occurrence
      const target = resolve(repoRoot, referenced)
      if (!exists(target)) continue // the path check owns missing-file reports
      const headings = [...read(target).matchAll(new RegExp(`^#{1,3}\\s*${numeral}、.*$`, 'gm'))]
        .map(heading => heading[0].replace(/^#+\s*/, ''))
      if (headings.length === 0) {
        problems.push(`${where} references ${referenced} §${numeral}, which has no such section`)
      } else if (anchor !== undefined && !headings.some(heading => heading.includes(anchor))) {
        problems.push(`${where} anchors ${referenced} §${numeral} on 「${anchor}」, but the section is "${headings[0]}"`)
      }
    }
  }
  return problems
})

check('links: contract docs cite no machine-local absolute paths', () => {
  const problems = []
  const machineLocal = /\/Users\/|(?<![a-z])\/home\//
  for (const file of markdownCorpus) {
    if (file.startsWith(join(repoRoot, 'notes'))) continue // notes/ is the registered home for external provenance
    if (machineLocal.test(read(file))) {
      problems.push(`${relative(repoRoot, file)} cites a machine-local absolute path — provenance belongs in notes/`)
    }
  }
  return problems
})

// ── commit safety ───────────────────────────────────────────────────────────────────────────────

check('commit safety: residue and credentials are ignored', () => {
  const mustIgnore = [
    'dev/harness-home/.credentials.yaml',
    'dev/harness-home/sessions/example.jsonl',
    'node_modules/example/index.js',
    '.pnpm-store/v11/index.db',
    'packages/dsh-smart-assistant/lib/index.js',
    '.env',
  ]
  const mustTrack = [
    'dev/env.sh',
    'dev/profile-patch.yml',
    'vendor/UPSTREAM.md',
    'docs/home.md',
    'pnpm-workspace.yaml',
  ]
  const problems = []
  const isIgnored = path => {
    try {
      execFileSync('git', ['check-ignore', '-q', path], { cwd: repoRoot, stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
  for (const path of mustIgnore) if (!isIgnored(path)) problems.push(`${path} must be ignored but is not`)
  for (const path of mustTrack) if (isIgnored(path)) problems.push(`${path} must be tracked but is ignored`)
  return problems
})

// ── run ─────────────────────────────────────────────────────────────────────────────────────────

let failed = 0
for (const { name, run } of checks) {
  let problems
  try {
    problems = run()
  } catch (error) {
    problems = [`check threw: ${error instanceof Error ? error.message : String(error)}`]
  }
  if (problems.length === 0) {
    console.log(`  ok   ${name}`)
  } else {
    failed += 1
    console.log(`  FAIL ${name}`)
    for (const problem of problems) console.log(`         ${problem}`)
  }
}

console.log('')
console.log(failed === 0 ? `verify: ${checks.length} checks passed` : `verify: ${failed} of ${checks.length} checks failed`)
process.exit(failed === 0 ? 0 : 1)
