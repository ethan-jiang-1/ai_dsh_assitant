/**
 * Fixtures for the pure sync-dsh bookkeeping (scripts/maintenance/sync-bookkeeping.mjs) — the two fragile
 * spots of an upgrade: rewriting the vendor/UPSTREAM.md rows (a drifted table must refuse, not
 * silently no-op) and the rule that the manifest's "verified" claim exists only after a
 * typecheck that ran and passed. Real pins are never moved by this suite.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it.
 */
import { describe, expect, it } from 'vitest'
import { applyUpstreamRecord, releaseClaim } from '../../../scripts/maintenance/sync-bookkeeping.mjs'

const UPSTREAM = [
  '# vendor/dsh 的簿记（钉住的 DSH 源码）',
  '',
  '| 项 | 值 |',
  '|---|---|',
  '| 上游 | `https://github.com/deepseek-ai/deepseek-harness.git` |',
  '| 钉住的 tag | `dsh-v0.1.5-rc.2` |',
  '| 精确 SHA | `fb2c4b9e698e30edb738bca4cf0618587db7d203` |',
  '| tag 提交时间 | 2026-09-10 |',
  '',
].join('\n')

describe('applyUpstreamRecord', () => {
  it('rewrites the tag, SHA, and commit-date rows', () => {
    const updated = applyUpstreamRecord(UPSTREAM, {
      tag: 'dsh-v0.1.6-rc.1',
      sha: '0123456789abcdef0123456789abcdef01234567',
      committed: '2026-10-01',
    })
    expect(updated).toContain('| 钉住的 tag | `dsh-v0.1.6-rc.1` |')
    expect(updated).toContain('| 精确 SHA | `0123456789abcdef0123456789abcdef01234567` |')
    expect(updated).toContain('| tag 提交时间 | 2026-10-01 |')
    expect(updated).not.toContain('dsh-v0.1.5-rc.2')
  })

  it('refuses a table whose bookkeeping rows drifted instead of silently no-oping', () => {
    const drifted = UPSTREAM.replace(/\| 精确 SHA \| [^\n]*\n/, '')
    expect(() => applyUpstreamRecord(drifted, {
      tag: 'dsh-v0.1.6-rc.1',
      sha: '0123456789abcdef0123456789abcdef01234567',
      committed: '2026-10-01',
    })).toThrow('精确 SHA')
  })
})

describe('releaseClaim', () => {
  it('records "verified" only after a typecheck that ran and passed', () => {
    expect(releaseClaim({ typecheckRequested: true, typecheckPassed: true }))
      .toEqual({ value: 'verified', reason: undefined })
  })

  it('records no claim when the typecheck was skipped', () => {
    const claim = releaseClaim({ typecheckRequested: false, typecheckPassed: false })
    expect(claim.value).toBeUndefined()
    expect(claim.reason).toContain('--no-typecheck')
  })

  it('records no claim when the typecheck failed', () => {
    const claim = releaseClaim({ typecheckRequested: true, typecheckPassed: false })
    expect(claim.value).toBeUndefined()
    expect(claim.reason).toContain('typecheck failed')
  })
})

describe('fetchArguments', () => {
  it('always names a remote, so git cannot read the refspec as a repository', async () => {
    const { fetchArguments } = await import('../../../scripts/maintenance/sync-dsh.mjs')
    expect(fetchArguments('dsh-v0.1.7-rc.2')).toEqual(['fetch', '--depth', '1', '--force', 'origin', 'tag', 'dsh-v0.1.7-rc.2'])
    expect(fetchArguments('dsh-v0.1.7-rc.2', 'https://example.invalid/dsh.git')).toContain('https://example.invalid/dsh.git')
  })
})
