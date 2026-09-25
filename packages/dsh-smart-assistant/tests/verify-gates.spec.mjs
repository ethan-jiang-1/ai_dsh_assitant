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
  GRADUATED_STATUS,
  notesNamingProblems,
  notesStateProblems,
  notesTopLevelProblems,
  pinProblems,
  implementedAlternativesProblems,
  relativeLinkProblems,
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
    for (const sub of ['proposed', 'implemented', 'research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-24-a-proposal.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-23-a-decision.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'research', 'README.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '.gitkeep'), '', 'utf8')
    writeFileSync(join(notes, 'research', 'random-jottings.md'), 'x', 'utf8')

    const problems = notesNamingProblems(notes)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('notes/research/random-jottings.md')
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

  it('requires a rejection reason and the two research states', () => {
    const notes = temp('notes-state-')
    for (const sub of ['rejected', 'research', 'research/archive']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'rejected', '2026-09-25-bare.md'), '日期：2026-09-25 · 状态：**rejected**\n', 'utf8')
    writeFileSync(join(notes, 'research', '2026-09-25-live.md'), '日期：2026-09-25 · 状态：进行中 · 底稿\n', 'utf8')
    writeFileSync(join(notes, 'research', 'archive', '2026-09-25-done.md'), '日期：2026-09-25 · 状态：已收卷 · 结论在 §5\n', 'utf8')
    writeFileSync(join(notes, 'research', 'archive', '2026-09-25-not-wound.md'), '日期：2026-09-25 · 状态：进行中\n', 'utf8')

    const problems = notesStateProblems(notes)
    expect(problems.some(p => p.includes('bare.md') && p.includes('rejection reason'))).toBe(true)
    expect(problems.some(p => p.includes('not-wound.md') && p.includes('已收卷'))).toBe(true)
    expect(problems.some(p => p.includes('live.md'))).toBe(false)
  })
})

describe('notesTopLevelProblems', () => {
  it('accepts the documented lifecycle set and rejects an undocumented bucket', () => {
    const notes = temp('notes-top-')
    for (const sub of ['proposed', 'implemented', 'rejected', 'archived', 'research']) mkdirSync(join(notes, sub), { recursive: true })
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
