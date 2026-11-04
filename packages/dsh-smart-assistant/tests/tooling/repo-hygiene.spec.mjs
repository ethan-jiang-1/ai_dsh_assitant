/**
 * Fixtures for the repo-hygiene reading (`dev/reports/repo-hygiene.mjs`). The instrument is
 * deliberately read-only: these pin the git parsers, the four sections, and the warning that
 * unmerged branches are reported but never deleted.
 */
import { describe, expect, it } from 'vitest'
import { parseBranches, parseWorktrees, renderReport, selfCheck } from '../../../../dev/reports/repo-hygiene.mjs'

const worktreeText = [
  'worktree /repo',
  'HEAD aaaaaaa',
  'branch refs/heads/master',
  '',
  'worktree /repo-wt',
  'HEAD bbbbbbb',
  'detached',
  'prunable gitdir file points to non-existent location',
].join('\n')

const refText = [
  'master\t2026-10-01T00:00:00+08:00\t',
  'feature\t2026-10-02T00:00:00+08:00\t[origin/feature: ahead 1]',
].join('\n')

describe('parseWorktrees', () => {
  it('reads the main worktree, a detached worktree and its prunable reason', () => {
    const worktrees = parseWorktrees(worktreeText)

    expect(worktrees).toHaveLength(2)
    expect(worktrees[0]).toMatchObject({ path: '/repo', branch: 'master', detached: false, prunable: '' })
    expect(worktrees[1]).toMatchObject({ path: '/repo-wt', detached: true })
    expect(worktrees[1]?.prunable).toContain('non-existent')
  })

  it('returns nothing for empty porcelain output', () => {
    expect(parseWorktrees('')).toEqual([])
  })
})

describe('parseBranches', () => {
  it('joins merged status and ahead/behind counts, newest first', () => {
    const branches = parseBranches(refText, { merged: ['master'], aheadBehind: { feature: { behind: 3, ahead: 2 } } })

    expect(branches.map(branch => branch.name)).toEqual(['feature', 'master'])
    expect(branches[0]).toMatchObject({ behind: 3, ahead: 2, merged: false })
    expect(branches[1]).toMatchObject({ behind: 0, ahead: 0, merged: true })
  })
})

describe('renderReport', () => {
  it('prints all four sections and never claims to delete', () => {
    const report = renderReport({
      tmp: { entries: 2, deletable: 1, kept: 1, deletableBytes: 1024, lsof: 'collected', top: [{ name: 'old', bytes: 1024, reason: 'expired' }] },
      worktrees: parseWorktrees(worktreeText),
      branches: parseBranches(refText, { merged: ['master'], aheadBehind: { feature: { behind: 3, ahead: 2 } } }),
      uncommitted: ['src/a.ts'],
    })

    expect(report).toContain('repo-hygiene — read-only')
    expect(report).toContain('## .tmp')
    expect(report).toContain('## worktrees')
    expect(report).toContain('## branches')
    expect(report).toContain('## uncommitted')
    expect(report).toContain('unmerged branches are reported, never deleted')
    expect(report).not.toContain('PASS')
    expect(report).not.toContain('FAIL')
  })
})

describe('selfCheck', () => {
  it('accepts the synthetic fixture', () => {
    expect(selfCheck(() => {})).toBe(0)
  })
})
