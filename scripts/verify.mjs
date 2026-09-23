#!/usr/bin/env node
/**
 * Mechanical gates for this repo. Run with `pnpm verify`.
 *
 * Everything here is a fact a machine can check, so a person does not have to remember it: the
 * identity names in `docs/identity.md` match the code, every `@deepseek-ai/*` import has a
 * resolution-facade entry, the published package stays self-contained, our skill-name grammar has not
 * drifted from the harness registry's, the home document lists the rooms the code creates, and the
 * paths that must never be committed are ignored.
 *
 * Exit code 1 with a per-check report when anything fails.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'tsconfig.json',
  'docs/home.md',
  'docs/identity.md',
  'notes/intents.md',
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

check('submodule: vendor/dsh is pinned and reachable', () => {
  const problems = []
  if (!exists(join(vendorDsh, 'packages', 'core', 'tools', 'src', 'index.ts'))) {
    problems.push('vendor/dsh is not checked out — run `git submodule update --init`')
  }
  const gitmodules = exists(join(repoRoot, '.gitmodules')) ? read(join(repoRoot, '.gitmodules')) : ''
  if (!gitmodules.includes('vendor/dsh')) problems.push('.gitmodules does not declare vendor/dsh')
  const upstream = exists(join(repoRoot, 'vendor', 'UPSTREAM.md')) ? read(join(repoRoot, 'vendor', 'UPSTREAM.md')) : ''
  const tag = /`(dsh-v[0-9][^`]*)`/.exec(upstream)?.[1]
  if (tag === undefined) problems.push('vendor/UPSTREAM.md does not record the pinned tag')
  else {
    try {
      const described = execFileSync('git', ['-C', vendorDsh, 'describe', '--tags'], { encoding: 'utf8' }).trim()
      if (described !== tag) problems.push(`vendor/dsh is at ${described}, UPSTREAM.md records ${tag}`)
    } catch {
      problems.push('could not read the submodule revision (git describe failed)')
    }
  }
  return problems
})

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

check('facade: every @deepseek-ai import has a tsconfig paths entry and a project reference', () => {
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
    const projectDir = resolve(repoRoot, target.replace(/\/src$/, ''))
    if (!references.has(projectDir)) {
      problems.push(`${specifier} resolves to ${relative(repoRoot, projectDir)}, which packages/dsh-smart-assistant/tsconfig.json does not reference`)
    }
    if (!exists(join(projectDir, 'src', 'index.ts'))) problems.push(`${specifier} paths entry ${target} has no index.ts`)
  }
  return problems
})

check('facade: the runtime tsconfig for the source launch is present and current', () => {
  const problems = []
  const runtime = join(repoRoot, 'tsconfig.tsx.json')
  if (!exists(runtime)) return ['tsconfig.tsx.json is missing — run `pnpm gen-paths`']
  const text = read(runtime)
  if (!text.includes('GENERATED by scripts/gen-paths.mjs')) problems.push('tsconfig.tsx.json is not the generated file')
  // Spot-check a package the harness loads by name at boot, so a stale facade cannot pass silently.
  for (const name of ['@deepseek-ai/dsh-app-boot', '@deepseek-ai/dsh-agent-presets']) {
    if (!text.includes(`"${name}"`)) problems.push(`tsconfig.tsx.json has no alias for ${name}`)
  }
  if (!read(join(repoRoot, 'package.json')).includes('TSX_TSCONFIG_PATH=tsconfig.tsx.json')) {
    problems.push('the `dsh` script does not point tsx at tsconfig.tsx.json')
  }
  return problems
})

check('facade: skill-name grammar matches the harness registry', () => {
  const ours = /SKILL_NAME_PATTERN = (\/.*\/)/.exec(read(join(packageDir, 'src', 'skills', 'skill-file.ts')))?.[1]
  const registryPath = join(vendorDsh, 'packages', 'skill', 'skill', 'src', 'index.ts')
  if (!exists(registryPath)) return ['vendor/dsh skill registry source is missing']
  const theirs = /const SKILL_NAME = (\/.*\/)/.exec(read(registryPath))?.[1]
  if (ours === undefined || theirs === undefined) return ['could not read one of the skill-name patterns']
  return ours === theirs ? [] : [`our pattern ${ours} differs from the registry's ${theirs}`]
})

check('facade: skill frontmatter keys we write are keys the provider reads', () => {
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
  for (const constant of ['MEMORY_ROOM', 'RESEARCH_ROOM', 'SKILLS_ROOM', 'ARCHIVE_DIRECTORY_NAME']) {
    const value = new RegExp(`export const ${constant} = '([a-z]+)'`).exec(layout)?.[1]
    if (value === undefined) problems.push(`layout.ts does not declare ${constant}`)
    else if (!document.includes(value)) problems.push(`docs/home.md never mentions ${value}`)
  }
  for (const tool of ['assistant_memory', 'assistant_research', 'assistant_reflect']) {
    if (!document.includes(tool)) problems.push(`docs/home.md never mentions ${tool}`)
  }
  return problems
})

check('contract: curated skills carry valid frontmatter and match their directory', () => {
  const problems = []
  const skillsDir = join(packageDir, 'presets', 'assistant', 'skills')
  for (const name of readdirSync(skillsDir)) {
    const file = join(skillsDir, name, 'SKILL.md')
    if (!exists(file)) {
      problems.push(`${name}/ has no SKILL.md`)
      continue
    }
    const text = read(file)
    const declared = /^name:\s*(\S+)\s*$/m.exec(text)?.[1]
    const description = /^description:\s*(.+)$/m.exec(text)?.[1]
    if (declared !== name) problems.push(`${name}/SKILL.md declares name ${declared ?? '(none)'}`)
    if (description === undefined || description.trim().length === 0) {
      problems.push(`${name}/SKILL.md has no description`)
    }
    if (!text.startsWith('---\n')) problems.push(`${name}/SKILL.md does not start with frontmatter`)
  }
  return problems.length > 0 ? problems : []
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
