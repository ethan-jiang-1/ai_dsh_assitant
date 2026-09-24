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
  GRADUATED_STATUS,
  notesNamingProblems,
  pinProblems,
  proposalStatusProblems,
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

describe('proposalStatusProblems', () => {
  it('accepts a bold status line and flags its absence', () => {
    const proposed = temp('proposed-')
    writeFileSync(join(proposed, '2026-09-24-with-status.md'), '状态：**待接手实施**\n', 'utf8')
    writeFileSync(join(proposed, '2026-09-24-without-status.md'), '# a proposal with no state\n', 'utf8')

    const problems = proposalStatusProblems(proposed)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('without-status.md')
    expect(problems[0]).toContain('graduation gate')
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
    for (const done of ['已全部实施', '已消化', '已毕业', '已完成', '已实施']) {
      expect(GRADUATED_STATUS.test(done)).toBe(true)
    }
    for (const pending of ['待接手实施', '部分实施', '草稿', 'proposed']) {
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
