/**
 * Fixtures for the mechanical-gate cores in scripts/verify-checks.mjs (slice E of the
 * development-foundation remediation, 2026-09-24). Every accepted and rejected shape of the
 * pin, notes-naming, proposal-status, and relative-link checks is pinned here against
 * throwaway directories and throwaway git repositories — the real vendor tree, ROADMAP, and
 * notes are never touched, and no pin is ever upgraded.
 *
 * This file is deliberately plain .mjs: vitest runs it, while `tsc -p tsconfig.test.json`
 * (type-checking the TS specs) does not include non-TS files, so importing the untyped script
 * module costs the type gate nothing.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  agentsMdStabilityProblems,
  commandAliasProblems,
  configParseProblems,
  dshHomeInheritanceProblems,
  dependencyPoseProblems,
  GRADUATED_STATUS,
  languageGuardProblems,
  notesNamingProblems,
  notesStateProblems,
  notesTopLevelProblems,
  pinProblems,
  implementedAlternativesProblems,
  relativeLinkProblems,
  skillFrontmatterProblems,
  textHygieneProblems,
} from '../../../scripts/verify-checks.mjs'

const dirs = []

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  dirs.length = 0
})

function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

// ── relative markdown links ────────────────────────────────────────────────────────────────────

describe('commandAliasProblems', () => {
  const scripts = { verify: 'node scripts/verify.mjs', 'eval:domain': 'node dev/eval/domain-run.mjs' }
  const doc = (path, text) => ({ path, text })

  it('accepts docs whose commands are aliases and whose aliases are documented', () => {
    expect(commandAliasProblems({
      scripts,
      documents: [doc('AGENTS.md', 'pnpm verify  # 门禁\npnpm eval:domain  # 领域评测\npnpm install'), doc('docs/dev.md', 'pnpm exec dsh')],
    })).toEqual([])
  })

  it('rejects a documented command that no alias provides (the class that caught `pnpm symlink`)', () => {
    // Scope note: this rule owns the *alias table*. A bare `dsh plugin add …` invocation belongs to
    // DSH's CLI, not to package.json, so it is deliberately out of scope here.
    const problems = commandAliasProblems({
      scripts,
      documents: [doc('docs/dev.md', '（pnpm symlink 语义）'), doc('AGENTS.md', 'pnpm verify')],
    })
    expect(problems.join(' ')).toContain('pnpm symlink')
    expect(problems.join(' ')).toContain('the doc outlived the alias')
  })

  it('rejects an alias that no current doc names', () => {
    const problems = commandAliasProblems({
      scripts: { ...scripts, silent: 'node scripts/silent.mjs' },
      documents: [doc('AGENTS.md', 'pnpm verify')],
    })
    expect(problems.join(' ')).toContain('pnpm silent')
    expect(problems.join(' ')).toContain('named in no current doc')
  })

  it('reports an empty corpus rather than passing silently', () => {
    expect(commandAliasProblems({ scripts, documents: [] }).join(' ')).toContain('corpus is empty')
  })
})

describe('relativeLinkProblems', () => {
  it('accepts resolving links, anchors on them, and out-of-scope targets; rejects broken ones', () => {
    const root = temp('links-')
    writeFileSync(join(root, 'a.md'), [
      '[good](b.md)',
      '[good with anchor](b.md#heading)',
      '[external](https://example.com/x.md) is fine',
      '[same-file anchor](#section) is fine',
      '[placeholder](url) and [placeholder](…) are prose, not links',
      '[broken](missing.md)',
    ].join('\n'), 'utf8')
    writeFileSync(join(root, 'b.md'), '# B\n', 'utf8')

    const problems = relativeLinkProblems([
      { file: join(root, 'a.md'), where: 'a.md' },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('a.md links to missing.md')
  })

  it('resolves relative to the linking file, not the corpus root', () => {
    const root = temp('links-nested-')
    mkdirSync(join(root, 'sub'), { recursive: true })
    writeFileSync(join(root, 'sub', 'page.md'), '[parent](../index.md)\n[peer](other.md)\n', 'utf8')
    writeFileSync(join(root, 'index.md'), '# index\n', 'utf8')

    const problems = relativeLinkProblems([
      { file: join(root, 'sub', 'page.md'), where: 'sub/page.md' },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('other.md')
  })
})

// ── notes naming & proposal status ─────────────────────────────────────────────────────────────

describe('notesNamingProblems', () => {
  it('accepts date-named notes and README/non-markdown exemptions; rejects other names', () => {
    const notes = temp('notes-')
    for (const sub of ['proposed', 'implemented', 'archived/research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-24-a-proposal.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-23-a-decision.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', 'README.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '.gitkeep'), '', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', 'random-jottings.md'), 'x', 'utf8')

    const problems = notesNamingProblems(notes)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('notes/archived/research/random-jottings.md')
    expect(problems[0]).toContain('YYYY-MM-DD-topic.md')
  })
})

describe('notesStateProblems', () => {
  const line = (date, word) => `# t\n\n日期：${date} · 状态：**${word}**（说明）\n`

  it('accepts canonical lines whose word matches the directory and the filename date', () => {
    const notes = temp('notes-state-')
    for (const sub of ['proposed', 'implemented', 'archived', 'rejected']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-25-a.md'), line('2026-09-25', 'proposed'), 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-b.md'), line('2026-09-25', 'implemented'), 'utf8')
    writeFileSync(join(notes, 'archived', '2026-09-25-c.md'), line('2026-09-25', 'implemented') + '已归档：2026-09-25（冻结）\n', 'utf8')
    writeFileSync(join(notes, 'rejected', '2026-09-25-d.md'), line('2026-09-25', 'rejected'), 'utf8')

    expect(notesStateProblems(notes)).toEqual([])
  })

  it('rejects a missing line, a wrong directory word, a date mismatch, and an unfrozen archive', () => {
    const notes = temp('notes-state-')
    for (const sub of ['proposed', 'implemented', 'archived']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-25-no-line.md'), '# no state line\n', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-wrong-dir.md'), line('2026-09-25', 'proposed'), 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-date-drift.md'), line('2026-09-24', 'implemented'), 'utf8')
    writeFileSync(join(notes, 'archived', '2026-09-25-unfrozen.md'), line('2026-09-25', 'implemented'), 'utf8')

    const problems = notesStateProblems(notes)
    expect(problems.some(p => p.includes('no-line.md') && p.includes('unreadable'))).toBe(true)
    expect(problems.some(p => p.includes('wrong-dir.md') && p.includes('directory and status must agree'))).toBe(true)
    expect(problems.some(p => p.includes('date-drift.md') && p.includes('filename date'))).toBe(true)
    expect(problems.some(p => p.includes('unfrozen.md') && p.includes('已归档'))).toBe(true)
  })

  it('requires a rejection reason and a wound-up survey in the ledger', () => {
    const notes = temp('notes-state-')
    for (const sub of ['rejected', 'archived/research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'rejected', '2026-09-25-bare.md'), '日期：2026-09-25 · 状态：**rejected**\n', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', '2026-09-25-done.md'), '日期：2026-09-25 · 状态：已收卷 · 结论在 §5\n', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', '2026-09-25-not-wound.md'), '日期：2026-09-25 · 状态：进行中\n', 'utf8')

    const problems = notesStateProblems(notes)
    expect(problems.some(p => p.includes('bare.md') && p.includes('rejection reason'))).toBe(true)
    expect(problems.some(p => p.includes('not-wound.md') && p.includes('已收卷'))).toBe(true)
    expect(problems.some(p => p.includes('live.md'))).toBe(false)
  })
})

describe('notesTopLevelProblems', () => {
  it('accepts the documented lifecycle set and rejects an undocumented bucket', () => {
    const notes = temp('notes-top-')
    for (const sub of ['proposed', 'implemented', 'rejected', 'archived', 'archived/research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'README.md'), '# map\n', 'utf8')
    writeFileSync(join(notes, 'intents.md'), '# intents\n', 'utf8')

    expect(notesTopLevelProblems(notes)).toEqual([])

    mkdirSync(join(notes, 'postmortem'), { recursive: true })
    writeFileSync(join(notes, 'scratch.md'), 'x', 'utf8')
    const problems = notesTopLevelProblems(notes)
    expect(problems.some(p => p.includes('notes/postmortem/'))).toBe(true)
    expect(problems.some(p => p.includes('notes/scratch.md'))).toBe(true)
  })
})

describe('agentsMdStabilityProblems', () => {
  it('accepts standing orders and rejects dates and progress marks', () => {
    const dir = temp('agents-')
    const clean = join(dir, 'AGENTS.md')
    writeFileSync(clean, '## 规则\n- 永远不要碰日用的 ~/.dsh。\n', 'utf8')
    expect(agentsMdStabilityProblems(clean)).toEqual([])

    const dirty = join(dir, 'DIRTY.md')
    writeFileSync(dirty, '## 规则\n- （用户拍板 2026-09-24）开工即立卡。\n- 队列标记：▶ 可开工。\n', 'utf8')
    const problems = agentsMdStabilityProblems(dirty)
    expect(problems.some(p => p.includes('carries a date'))).toBe(true)
    expect(problems.some(p => p.includes('progress mark'))).toBe(true)
  })
})

describe('implementedAlternativesProblems', () => {
  it('requires 输掉的方案 from the gate date on; grandfathers and English headings pass', () => {
    const implemented = temp('implemented-')
    // Gate date and later: must carry the section (Chinese or English heading both count).
    writeFileSync(join(implemented, '2026-09-25-with-alternatives.md'), '## 决定\n…\n## 输掉的方案\n- b) 慢而稳\n', 'utf8')
    writeFileSync(join(implemented, '2026-09-25-english-heading.md'), '## Decision\n…\n## Alternatives considered\n- b\n', 'utf8')
    writeFileSync(join(implemented, '2026-09-26-bare.md'), '## 决定\n只有决定，没记击败了什么。\n', 'utf8')
    // Before the gate date: grandfathered, shape untouched.
    writeFileSync(join(implemented, '2026-09-24-old-shape.md'), '## 决定\n没有备选节的旧 note。\n', 'utf8')

    const problems = implementedAlternativesProblems(implemented)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('2026-09-26-bare.md')
    expect(problems[0]).toContain('输掉的方案')
    expect(problems[0]).toContain('re-litigation')
  })
})

describe('GRADUATED_STATUS', () => {
  it('matches every known completion word and no in-progress wording', () => {
    for (const done of ['状态：**已全部实施', '状态：**已消化', '状态：**已毕业', '状态：**已完成', '状态：**已实施', '状态：**implemented', '状态：**rejected', '状态：**archived']) {
      expect(GRADUATED_STATUS.test(done)).toBe(true)
    }
    for (const pending of ['状态：**待接手实施', '状态：**部分实施', '状态：**proposed', '状态：**调研中', '待接手实施']) {
      expect(GRADUATED_STATUS.test(pending)).toBe(false)
    }
  })
})

// ── submodule pin ──────────────────────────────────────────────────────────────────────────────

/** Minimal inner git repo standing in for vendor/dsh, tagged so `describe --tags` is exact. */
function makeInnerRepo(dir, tagName) {
  execFileSync('git', ['init', '-q', dir], { env: process.env })
  const git = args => execFileSync('git', ['-C', dir, '-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { stdio: 'ignore' })
  mkdirSync(join(dir, 'packages', 'core', 'tools', 'src'), { recursive: true })
  writeFileSync(join(dir, 'packages', 'core', 'tools', 'src', 'index.ts'), 'export {}\n', 'utf8')
  git(['add', '.'])
  git(['commit', '-q', '-m', 'pin'])
  git(['tag', tagName])
  return git
}

function recordUpstream(root, tagName, sha) {
  writeFileSync(join(root, 'vendor', 'UPSTREAM.md'), [
    '# bookkeeping',
    '| 项 | 值 |',
    '|---|---|',
    `| 钉住的 tag | \`${tagName}\` |`,
    `| 精确 SHA | \`${sha}\` |`,
    '',
  ].join('\n'), 'utf8')
}

/** Outer repo shaped like ours: .gitmodules + vendor/UPSTREAM.md + a committed gitlink. */
function makePinnedRepo() {
  const root = temp('pin-')
  mkdirSync(join(root, 'vendor'), { recursive: true })
  execFileSync('git', ['init', '-q', root], { env: process.env })
  const outerGit = args => execFileSync('git', ['-C', root, '-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { stdio: 'ignore' })
  const tagName = 'dsh-v0.1.5-rc.2'
  const innerGit = makeInnerRepo(join(root, 'vendor', 'dsh'), tagName)
  const sha = execFileSync('git', ['-C', join(root, 'vendor', 'dsh'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  writeFileSync(join(root, '.gitmodules'), '[submodule "vendor/dsh"]\n\tpath = vendor/dsh\n\turl = https://example.com/dsh.git\n', 'utf8')
  recordUpstream(root, tagName, sha)
  outerGit(['add', '.gitmodules', 'vendor/UPSTREAM.md', 'vendor/dsh'])
  outerGit(['commit', '-q', '-m', 'pin vendor/dsh'])
  return { root, outerGit, innerGit, tagName, sha }
}

describe('pinProblems', () => {
  it('passes a consistent pin', () => {
    const { root } = makePinnedRepo()
    expect(pinProblems(root)).toEqual([])
  })

  it('flags a checkout that moved without bookkeeping', () => {
    const { root, innerGit } = makePinnedRepo()
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'index.ts'), 'export const drift = 1\n', 'utf8')
    innerGit(['add', '.'])
    innerGit(['commit', '-q', '-m', 'move ahead'])

    const problems = pinProblems(root)
    expect(problems.some(p => p.includes('UPSTREAM.md records'))).toBe(true)
  })

  it('allows the pending tail of a sync-dsh run (gitlink behind, bookkeeping current)', () => {
    const { root, innerGit, tagName } = makePinnedRepo()
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'index.ts'), 'export const next = 1\n', 'utf8')
    innerGit(['add', '.'])
    innerGit(['commit', '-q', '-m', 'next tag'])
    innerGit(['tag', 'dsh-v0.1.6-rc.1'])
    const newSha = execFileSync('git', ['-C', join(root, 'vendor', 'dsh'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    recordUpstream(root, 'dsh-v0.1.6-rc.1', newSha)
    // The outer repo's committed gitlink deliberately stays at the old SHA.

    expect(pinProblems(root)).toEqual([])
    expect(tagName).toBe('dsh-v0.1.5-rc.2') // the fixture moved off it, as asserted above
  })

  it('flags modified tracked sources but not untracked artifacts', () => {
    const { root } = makePinnedRepo()
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'index.ts'), 'export const edit = 1\n', 'utf8')
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'generated.artifact.js'), 'generated\n', 'utf8')

    const problems = pinProblems(root)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('tracked-source changes')
  })
})

// ── language guard, text hygiene, dependency posture ────────────────────────────────────────────

describe('languageGuardProblems', () => {
  it('flags CJK outside comments, exempts comment lines, and passes English sources', () => {
    const dir = temp('language-')
    const good = join(dir, 'good.ts')
    writeFileSync(good, "// 中文注释随文件现状（允许）\nexport const message = 'Load the skill first.'\n", 'utf8')
    const bad = join(dir, 'bad.ts')
    writeFileSync(bad, "export const message = '先加载技能'\n", 'utf8')
    const skill = join(dir, 'SKILL.md')
    writeFileSync(skill, '# Title\n\nLoad this before saving.\n', 'utf8')

    const problems = languageGuardProblems([good, bad, skill])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('bad.ts')
    expect(problems[0]).toContain('English')
  })
})

describe('textHygieneProblems', () => {
  it('accepts exact UTF-8 + one newline and rejects missing, doubled, or invalid endings', () => {
    const dir = temp('text-')
    const clean = join(dir, 'clean.md')
    writeFileSync(clean, '# ok\n', 'utf8')
    const noNewline = join(dir, 'no-newline.md')
    writeFileSync(noNewline, '# ok', 'utf8')
    const doubleNewline = join(dir, 'double.md')
    writeFileSync(doubleNewline, '# ok\n\n', 'utf8')
    const invalid = join(dir, 'invalid.md')
    writeFileSync(invalid, Buffer.from([0xff, 0xfe, 0x0a]))

    expect(textHygieneProblems([clean])).toEqual([])
    const problems = textHygieneProblems([noNewline, doubleNewline, invalid])
    expect(problems.some(p => p.includes('no-newline.md') && p.includes('no trailing newline'))).toBe(true)
    expect(problems.some(p => p.includes('double.md') && p.includes('more than one newline'))).toBe(true)
    expect(problems.some(p => p.includes('invalid.md') && p.includes('not valid UTF-8'))).toBe(true)
  })
})

describe('dependencyPoseProblems', () => {
  const upstream = (tag) => `| 项 | 值 |\n|---|---|\n| 钉住的 tag | \`${tag}\` |\n`

  it('accepts peers + a recorded pinned tag and rejects a runtime dep or a drifted list', () => {
    const dir = temp('deps-')
    const upstreamPath = join(dir, 'UPSTREAM.md')
    writeFileSync(upstreamPath, upstream('dsh-v0.1.5-rc.2'), 'utf8')

    const good = join(dir, 'good.json')
    writeFileSync(good, JSON.stringify({
      dependencies: { yaml: '^2.8.1' },
      peerDependencies: { '@deepseek-ai/cordis': '*' },
      dsh: { compatibility: { dshReleases: { '0.1.5-rc.2': 'verified' } } },
    }), 'utf8')
    expect(dependencyPoseProblems(good, upstreamPath)).toEqual([])

    const bad = join(dir, 'bad.json')
    writeFileSync(bad, JSON.stringify({
      dependencies: { '@deepseek-ai/cordis': '0.1.5-rc.2' },
      dsh: { compatibility: { dshReleases: { '0.1.4': 'verified' } } },
    }), 'utf8')
    const problems = dependencyPoseProblems(bad, upstreamPath)
    expect(problems.some(p => p.includes('peerDependencies'))).toBe(true)
    expect(problems.some(p => p.includes('does not name the pinned upstream tag'))).toBe(true)
  })
})

describe('skillFrontmatterProblems', () => {
  it('accepts a well-formed bundle and flags a name/directory mismatch, a missing description, and a missing file', () => {
    const dir = temp('skills-')
    mkdirSync(join(dir, 'good-skill'), { recursive: true })
    writeFileSync(join(dir, 'good-skill', 'SKILL.md'), '---\nname: good-skill\ndescription: does a thing\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'wrong-name'), { recursive: true })
    writeFileSync(join(dir, 'wrong-name', 'SKILL.md'), '---\nname: other-name\ndescription: x\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'no-description'), { recursive: true })
    writeFileSync(join(dir, 'no-description', 'SKILL.md'), '---\nname: no-description\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'empty-bundle'), { recursive: true })

    const problems = skillFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('good-skill'))).toBe(false)
    expect(problems.some(p => p.includes('declares name other-name'))).toBe(true)
    expect(problems.some(p => p.includes('has no description'))).toBe(true)
    expect(problems.some(p => p.includes('empty-bundle/ has no SKILL.md'))).toBe(true)
  })

  // The shape that hid two curated skills (2026-09-25): present on disk, absent from the catalog,
  // `skill <name>` answering "unknown" — a plain scalar with an inner `: ` is a YAML parse error,
  // which a line-scanning gate cannot see. The loader skips such a file with a warning only.
  it('rejects frontmatter the loader would silently skip, not just a wrong name', () => {
    const dir = temp('skills-')
    mkdirSync(join(dir, 'inner-colon'), { recursive: true })
    writeFileSync(join(dir, 'inner-colon', 'SKILL.md'),
      '---\nname: inner-colon\ndescription: ok\nwhenToUse: the execution shape: who does what by when\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'legacy-invocation'), { recursive: true })
    writeFileSync(join(dir, 'legacy-invocation', 'SKILL.md'),
      '---\nname: legacy-invocation\ndescription: ok\ndisableModelInvocation: true\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'non-boolean-invocation'), { recursive: true })
    writeFileSync(join(dir, 'non-boolean-invocation', 'SKILL.md'),
      '---\nname: non-boolean-invocation\ndescription: ok\nuser-invocable: maybe\n---\n\nbody\n', 'utf8')

    const problems = skillFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('inner-colon') && p.includes('not parsable YAML'))).toBe(true)
    expect(problems.some(p => p.includes('uses unsupported "disableModelInvocation"'))).toBe(true)
    expect(problems.some(p => p.includes('sets "user-invocable" to a non-boolean value'))).toBe(true)
  })
})

describe('composeRunnerTask', () => {
  it('prepends the standing collaboration boundary to every scripted task', async () => {
    const { composeRunnerTask, COLLABORATION_BOUNDARY } = await import('../../../packages/dsh-smart-assistant/src/preset-runner/index.ts')
    const composed = composeRunnerTask('跑一次 curate')
    expect(composed.startsWith(COLLABORATION_BOUNDARY)).toBe(true)
    expect(composed).toContain('跑一次 curate')
    expect(composed).toContain('you do not commit')
    expect(composed).toContain('not yours to trigger')
  })
})

describe('configParseProblems', () => {
  it('accepts a resolvable !!js scalar and rejects a plain scalar starting with a backtick', () => {
    const dir = temp('config-')
    const good = join(dir, 'good.yml')
    writeFileSync(good, 'task: !!js ctx.headlessStartup.task\n', 'utf8')
    const bad = join(dir, 'bad.yml')
    writeFileSync(bad, 'task: !!js `prefix${ctx.headlessStartup.task}`\n', 'utf8')

    expect(configParseProblems([good])).toEqual([])
    const problems = configParseProblems([bad])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('does not parse as YAML')
  })
})

describe('dshHomeInheritanceProblems', () => {
  it('rejects dev tooling that reads the inherited DSH_HOME and accepts ASSISTANT_DSH_HOME', () => {
    const dir = temp('dev-home-')
    const bad = join(dir, 'bad.mjs')
    writeFileSync(bad, "const home = process.env.DSH_HOME ?? 'x'\n", 'utf8')
    const good = join(dir, 'good.mjs')
    writeFileSync(good, "const home = process.env.ASSISTANT_DSH_HOME ?? 'dev/harness-home'\n", 'utf8')

    expect(dshHomeInheritanceProblems([good])).toEqual([])
    expect(dshHomeInheritanceProblems([bad])[0]).toContain('must use ASSISTANT_DSH_HOME')
  })
})
