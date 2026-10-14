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
import { agentsMdStabilityProblems, backtickedRepoPathProblems, backlogGraduationProblems, backlogLivenessProblems, clientScriptSafetyProblems, commandAliasProblems, compositionRowProblems, configParseProblems, crossFileSectionProblems, dependencyPoseProblems, devDrawerCoverageProblems, dshHomeInheritanceProblems, exportManualProblems, gateWiringProblems, GRADUATED_STATUS, implementedAlternativesProblems, identityNameProblems, languageGuardProblems, markdownCorpusFromTracked, notesNamingProblems, notePointerProblems, notesStateProblems, notesTopLevelProblems, pinProblems, machineLocalPathProblems, packageSubpathProblems, playbookFrontmatterProblems, projectReferenceMatches, relativeLinkProblems, researchSubdirProblems, scratchPathProblems, skillFrontmatterProblems, startPathProblems, testAssetNamingProblems, textHygieneProblems, vendorClientFreshnessProblems } from './verify-checks.mjs'
import * as gateCores from './verify-checks.mjs'
import { pinnedTagFrom } from '../maintenance/sync-bookkeeping.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
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

// The wiring gate reads this runner's own source: a core that exists in verify-checks.mjs but is
// never invoked here guards nothing (imported-but-never-called collapses to a single occurrence).
check('wiring: every check core is invoked by this command', () =>
  gateWiringProblems({ exportedCores: gateCores, verifySource: read(fileURLToPath(import.meta.url)) }))

// ── structure ───────────────────────────────────────────────────────────────────────────────────

const REQUIRED_PATHS = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',

  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'tsconfig.json',
  'docs/home.md',
  'docs/identity.md',
  'docs/discipline.md',
  'notes/README.md',
  'dev/env/env.sh',
  'dev/env/setup.sh',
  'dev/profiles/profile-patch.yml',
  'snapshots/README.md',
  'vendor/UPSTREAM.md',
  '.gitmodules',
  'packages/dsh-smart-assistant/package.json',
  'packages/dsh-smart-assistant/cordis.patch.yml',
  'packages/dsh-smart-assistant/src/index.ts',
  'packages/dsh-smart-assistant/src/domain/home/layout.ts',
  'packages/dsh-smart-assistant/src/domain/memory/record.ts',
  'packages/dsh-smart-assistant/src/domain/research/thread.ts',
  'packages/dsh-smart-assistant/src/domain/skills/skill-file.ts',
  'packages/dsh-smart-assistant/src/agent/tool-memory/index.ts',
  'packages/dsh-smart-assistant/src/agent/tool-research/index.ts',
  'packages/dsh-smart-assistant/src/agent/memory-digest/index.ts',
  'packages/dsh-smart-assistant/src/agent/learn/index.ts',
  'scripts/release/release-smoke.mjs',
  'scripts/maintenance/sync-dsh.mjs',
  'scripts/generate/gen-paths.mjs',
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
  // 0.1.7: the agent rows live inside the bundle patch's `agent-preset` row, so the exports
  // consistency check reads the file a deployment actually composes — plus every dev probe patch,
  // which resolves our subpaths at runtime and had no coverage until the 2026-10-10 audit.
  const patchFiles = [...walk(join(repoRoot, 'dev', 'probes'), ['.yml']), join(packageDir, 'cordis.patch.yml')]
  return problems.concat(packageSubpathProblems({
    sources: patchFiles.map(file => ({ file: relative(repoRoot, file), text: read(file) })),
    exported: manifest.exports ?? {},
  }))
})

check('identity: docs/identity.md and the code name the same rows and tools, in both directions', () => {
  const avatars = {}
  for (const path of walk(join(packageDir, 'src'), ['.ts'])) avatars[path] = read(path)
  return identityNameProblems({
    patchText: read(join(packageDir, 'cordis.patch.yml')),
    avatars,
    identityText: read(join(repoRoot, 'docs', 'identity.md')),
  })
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
    if (!projectReferenceMatches(projectDir, references)) {
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
  if (!text.includes('GENERATED by scripts/generate/gen-paths.mjs')) problems.push('tsconfig.tsx.json is not the generated file')
  // Spot-check a package the harness loads by name at boot, so a stale facade cannot pass silently.
  for (const name of ['@deepseek-ai/dsh-app-boot', '@deepseek-ai/dsh-agent-preset-registry']) {
    if (!text.includes(`"${name}"`)) problems.push(`tsconfig.tsx.json has no alias for ${name}`)
  }
  // The source launch goes through dev/env/dsh.mjs (which also enforces the dev home);
  // the gate follows the contract there, not the one-line package.json script.
  const launcher = read(join(repoRoot, 'dev', 'env', 'dsh.mjs'))
  if (!launcher.includes('tsconfig.tsx.json') || !launcher.includes('TSX_TSCONFIG_PATH')) {
    problems.push('dev/env/dsh.mjs does not point tsx at tsconfig.tsx.json')
  }
  return problems
})

check('client: the browser half registers via the loader facade and stays classic-script-safe', () => {
  // Pure core in gates/docs-commands.mjs (fixture-pinned in tests/tooling/docs-commands.spec.mjs):
  // since S2 the client is a multi-module source tree bundled by tsdown, so the gate is
  // "no bare external runtime imports + entry names the facade + the served bundle parses
  // as a classic script", not per-file "no imports/exports at all".
  return clientScriptSafetyProblems({
    clientDir: join(packageDir, 'src', 'client'),
    bundlePath: join(packageDir, 'lib', 'client', 'index.js'),
  })
})

check('resolution: skill-name grammar matches the harness registry', () => {
  const ours = /SKILL_NAME_PATTERN = (\/.*\/)/.exec(read(join(packageDir, 'src', 'domain', 'skills', 'skill-file.ts')))?.[1]
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
  const layout = read(join(packageDir, 'src', 'domain', 'home', 'layout.ts'))
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

check('backlog: liveness (status lines, institution dirs, index membership)', () =>
  backlogLivenessProblems(join(repoRoot, '_backlog')))

// A completed deliberation must leave the active area independently of downstream notes processing.
// Liveness only proves a card exists; the separate closure verdict prevents closed work from lingering.
check('backlog: issues ready to close leave the active shelf', () =>
  backlogGraduationProblems(join(repoRoot, '_backlog')))

// Drawer maps and the research index are prose→tree claims; both drifted silently until the
// 2026-10-12 round (three unnamed dev/ drawers, one claimed-active research theme with zero
// materials). Entries come from disk so even gitignored runtime homes must be covered by a row.
check('structure: dev/ tree entries are all named in the dev drawer map', () =>
  devDrawerCoverageProblems({
    entries: readdirSync(join(repoRoot, 'dev'), { withFileTypes: true }).map(dirent => dirent.name),
    drawerText: read(join(repoRoot, 'dev', 'AGENTS.md')),
  }))

check('backlog research: theme dirs on disk match the research README index', () =>
  researchSubdirProblems({
    subdirs: readdirSync(join(repoRoot, '_backlog', 'research'), { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name),
    readmeText: read(join(repoRoot, '_backlog', 'research', 'README.md')),
    trackedRelPaths: execFileSync('git', ['ls-files', '_backlog/research/'], { cwd: repoRoot })
      .toString().split('\n').filter(Boolean)
      .map(path => path.replace(/^_backlog\/research\//, '')),
  }))

check('structure: dev tooling never inherits DSH_HOME', () =>
  dshHomeInheritanceProblems(walk(join(repoRoot, 'dev'), ['.mjs'])))

// 升 pin 只换源不换产物：gitignore 的 lib/client.js 与 web dist 会停在旧 pin。部分重建还会把
// web client 打碎（新 ui-user-questions 配旧 api/remotes 装配 = 全屏 Failed to load plugins，
// 2026-10-03 实录）。机制与 playbook：notes/archived/2026-09-30-dsh-0-2-0-rc-2-pin.md。
check('vendor: client faces and web dist are not older than their sources', () =>
  vendorClientFreshnessProblems({ vendorPackagesRoot: join(vendorDsh, 'packages'), webAppRoot: join(vendorDsh, 'apps', 'web') }))

// 文档里的命令与 package.json 的别名必须互相成立：别名必须进命令表，文档提到的命令必须真存在
// （README 那条 stale 的 npm 发布路径就是这么烂掉的）。notes 不在语料里——它们记录的是当时为真的事。
check('docs: commands named in the docs exist, and every alias is named in a current doc', () => {
  const corpus = [join(repoRoot, 'AGENTS.md'), join(repoRoot, 'README.md'), join(repoRoot, 'docs', 'dev.md'),
    join(repoRoot, 'docs', 'discipline.md'), join(repoRoot, 'dev', 'AGENTS.md'), join(repoRoot, 'scripts', 'AGENTS.md'),
    join(packageDir, 'AGENTS.md'), join(packageDir, 'README.md')]
    .filter(existsSync)
    .map(file => ({ path: relative(repoRoot, file), text: read(file) }))
    .concat(walk(join(repoRoot, '.agents', 'skills'), ['.md'])
      .map(file => ({ path: relative(repoRoot, file), text: read(file) })))
  return commandAliasProblems({
    scripts: JSON.parse(read(join(repoRoot, 'package.json'))).scripts ?? {},
    documents: corpus,
  })
})

// 起服务是 fresh agent 第一次读就会照做的那条路，也是唯一在任何工具能帮上忙之前就失败的环节：
// 漏掉 setup.sh，DSH 回答的是 `create it with 'dsh plugin --profile dev add <package>'`——
// 照它做得到的是既没本插件也没 roster 的模板 profile。所以命令表的启动块钉死三件事：
// 脚本被标成第一步、它排在任何起服务的命令之前、两个 profile 各有路由。
check('docs: the startup path in AGENTS.md is reachable in first-step order', () =>
  startPathProblems({ agentsPath: 'AGENTS.md', source: read(join(repoRoot, 'AGENTS.md')) }))

check('structure: every composition file we own parses as YAML', () =>
  configParseProblems([
    ...walk(join(repoRoot, 'dev'), ['.yml']).filter(file => !file.includes('harness-home')),
    join(packageDir, 'cordis.patch.yml'),
    ...walk(join(packageDir, 'presets'), ['.yml']),
  ]))

// §二 of the architecture page is a hand copy of the generated catalog's 组合行 table and the most
// drift-prone prose we own; the generator's own row parser is the second opinion here.
check('composition: our mounted rows are all named in the §二 trees, and every row they name is mounted', () =>
  compositionRowProblems({
    patchText: read(join(packageDir, 'cordis.patch.yml')),
    architectureText: read(join(repoRoot, 'docs', 'architecture.md')),
  }))

check('entry files: every AGENTS.md stays standing orders (no dates, no progress marks or prose)', () =>
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
    join(repoRoot, 'AGENTS.md'), join(repoRoot, 'README.md'), join(repoRoot, 'CLAUDE.md'),
    ...walk(join(repoRoot, 'docs'), ['.md']),
    ...walk(join(repoRoot, 'notes'), ['.md']),
    ...walk(join(repoRoot, 'snapshots'), ['.md']),
    ...walk(packageDir, ['.md']).filter(file => !file.includes(`${sep}node_modules${sep}`)),
    ...walk(join(repoRoot, 'scripts'), ['.mjs']),
    ...walk(join(repoRoot, 'dev'), ['.mjs']),
  ]))

check('dependencies: harness packages are peers and the pinned tag is recorded as verified', () =>
  dependencyPoseProblems(join(packageDir, 'package.json'), join(repoRoot, 'vendor', 'UPSTREAM.md')))

check('release: the exported install manual matches the package', () =>
  exportManualProblems({
    manualPath: join(repoRoot, '_dist', '安装手册.md'),
    manifest: JSON.parse(read(join(packageDir, 'package.json'))),
    // The manual's 验证基线 row must track the pin, not the last re-export date: a pin bump
    // without a re-export used to leave the manual advertising the previous DSH baseline.
    upstreamTag: pinnedTagFrom(read(join(repoRoot, 'vendor', 'UPSTREAM.md'))),
  }))

check('notes: implemented notes carry what they beat (输掉的方案)', () =>
  implementedAlternativesProblems(join(repoRoot, 'notes', 'implemented')))

check('contract: skill files carry valid frontmatter and match their directory', () => [
  // Both homes ride the same provider contract; the development home is discovered natively via
  // the provider's `project-agents` root (vendor: skill-filesystem/src/index.ts, rank 200).
  ...skillFrontmatterProblems(join(packageDir, 'presets', 'assistant', 'skills')),
  ...skillFrontmatterProblems(join(repoRoot, '.agents', 'skills')),
  // Method drafts are SKILL-shaped for agent consumption, so their frontmatter is checked
  // even though this area is not a serving skill home. A missing directory is an empty result.
  ...playbookFrontmatterProblems(join(repoRoot, '_backlog', 'methods')),
])

// ── reference integrity ─────────────────────────────────────────────────────────────────────────
//
// Markdown is this repo's routing surface: AGENTS.md and docs/ point at files and sections the
// reader is meant to reach. Gate cores own parsing and diagnostics; this runner owns the tracked
// corpus and exclusions, so rule scope remains explicit where the repository selects its inputs.
// Relative links resolve against their source file. The corpus excludes the frozen _archive pool.

// The corpus is every tracked markdown file (minus the frozen `_archive` pool), not a remembered
// list: the 2026-10-10 audit found both live broken links in files the previous hand-picked
// corpus (root + docs + notes + snapshots) never covered — dev/, packages/, scripts/, .agents/.
const markdownCorpus = markdownCorpusFromTracked(
  execFileSync('git', ['ls-files', '*.md'], { cwd: repoRoot }).toString().split('\n').filter(Boolean),
  repoRoot,
)

check('links: backticked repo paths in markdown exist', () => {
  const vendorPresent = exists(join(vendorDsh, 'packages', 'core', 'tools', 'src', 'index.ts'))
  return backtickedRepoPathProblems({
    repoRoot,
    packageDir,
    corpus: markdownCorpus.map(file => ({ file, where: relative(repoRoot, file) })),
    vendorPresent,
  })
})

// Active deliberation needs resolving routes too; frozen evidence under _archive keeps its
// historical prose (excluded by the corpus builder). Only relative links extend here —
// contract/path/section scopes stay intact.
const relativeLinkCorpus = markdownCorpus

check('links: relative markdown links point at existing files', () =>
  relativeLinkProblems(relativeLinkCorpus.map(file => ({ file, where: relative(repoRoot, file) }))))

// Note- and backlog-card pointers hide outside markdown too (patch-YAML comments, dev script
// headers) — every audit escape so far lived there; inside notes/ the tree's own contract
// demands relative markdown links. The corpus is every tracked .mjs/.yml/.yaml outside:
// vendor/ (not ours), test fixtures (synthetic pointer-shaped paths by design — the gate's
// own spec lives there), scripts/checks/ (the checker's own source strings), and the pnpm
// lock/workspace files (generated). The prior narrower corpus (cordis.patch.yml +
// dev/probes/*.yml) missed the five stale dev/*.mjs pointers the 2026-10-12 round found.
const pointerCorpus = execFileSync('git', ['ls-files', '*.mjs', '*.yml', '*.yaml'], { cwd: repoRoot })
  .toString().split('\n').filter(Boolean)
  .filter(path => !path.startsWith('vendor/')
    && !path.split('/').includes('tests')
    && !path.startsWith('scripts/checks/')
    && path !== 'pnpm-lock.yaml'
    && path !== 'pnpm-workspace.yaml')
  .map(path => ({ file: join(repoRoot, path), where: path, text: read(join(repoRoot, path)) }))
check('notes: note-card pointers resolve and are linked inside notes/', () =>
  notePointerProblems({
    repoRoot,
    files: [
      ...markdownCorpus.map(file => ({ file, where: relative(repoRoot, file), text: read(file) })),
      ...pointerCorpus,
    ],
  }))

check('test assets: only admitted shapes in the tests tree, scene contracts beside web-face fixtures', () =>
  testAssetNamingProblems(repoRoot))

check('links: cross-file section references name a real section', () =>
  crossFileSectionProblems({ repoRoot, corpus: markdownCorpus.map(file => ({ file, where: relative(repoRoot, file) })) }))

check('links: contract docs cite no machine-local absolute paths', () => {
  // The active deliberation space routes readers the same way the contract docs do, so it is held
  // to the same rule: a checkout path or home directory baked into tracked prose breaks for
  // every other machine. Frozen `_archive/` keeps its historical prose (the corpus builder's
  // exclusion); `notes/` is the registered provenance home and stays exempt.
  const corpus = markdownCorpus
    .filter(file => !file.startsWith(join(repoRoot, 'notes')))
    .map(file => ({ file, where: relative(repoRoot, file) }))
  return machineLocalPathProblems(corpus)
})

// Scratch paths: every temporary file this repo produces belongs under `<repo>/.tmp/` (hard rule 8),
// because a write outside the session workspace comes back as a sandbox approval. The corpus is the
// live, repo-owned surface taken from git: `notes/` and `_backlog/` keep the evidence of their day,
// `vendor/dsh` ships its own policy, and ignored runtime dirs (`.tmp/`, `.pnpm-store/`, homes) are
// untracked by construction. Root files are listed because they carry the commands people copy.
check('scratch: temporary files stay under the repo .tmp/', () => {
  const directoryPrefixes = ['dev/', 'scripts/', 'docs/', 'snapshots/', 'packages/', '.agents/']
  // The gate names the forms it forbids, so its own directory is out of its corpus (nothing there
  // writes scratch: the fixtures that do live under `packages/…/tests/`).
  const excludedPrefixes = ['scripts/checks/']
  const rootFiles = new Set([
    'AGENTS.md', 'README.md', 'CLAUDE.md', 'package.json', '.gitignore',
    'pnpm-workspace.yaml', 'tsconfig.base.json', 'tsconfig.json',
  ])
  // Tests may hand scratch paths to `os.tmpdir()` only while the package's vitest config redirects
  // that root into the repo: the exemption is the redirect's shadow, so deleting the redirect (or
  // running the same spec outside vitest) removes it instead of silently keeping the allowance.
  const vitestConfig = read(join(packageDir, 'vitest.config.ts'))
  const testsRunInRepo = vitestConfig.includes('TMPDIR') && vitestConfig.includes('.tmp')
  const testsPrefix = join('packages', 'dsh-smart-assistant', 'tests') + '/'
  const corpus = execFileSync('git', ['ls-files'], { cwd: repoRoot }).toString().split('\n').filter(Boolean)
    .filter(path => directoryPrefixes.some(prefix => path.startsWith(prefix)) || rootFiles.has(path))
    .filter(path => !excludedPrefixes.some(prefix => path.startsWith(prefix)))
    .map(path => ({
      file: join(repoRoot, path),
      where: path,
      allowTmpdir: testsRunInRepo && path.startsWith(testsPrefix),
    }))
  return scratchPathProblems(corpus)
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
    'dev/env/env.sh',
    'dev/profiles/profile-patch.yml',
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
