/**
 * Fixtures for the commit-safety core (scripts/checks/gates/commit-safety.mjs): the two ways the
 * repo's residue rules break — something that must be ignored becomes tracked, or something the
 * repo depends on becomes ignored. Plain .mjs (vitest runs it; the type gate does not include it).
 */
import { describe, expect, it } from 'vitest'
import { commitSafetyProblems, trackedContentProblems, trackedDataPaths } from '../../../../scripts/checks/gates/commit-safety.mjs'

const fixture = (ignored, overrides = {}) => ({
  mustIgnore: ['dev/harness-home/.credentials.yaml', '.env'],
  mustTrack: ['docs/home.md', 'pnpm-workspace.yaml'],
  isIgnored: path => ignored.includes(path),
  ...overrides,
})

describe('commitSafetyProblems', () => {
  it('accepts residue that is ignored and repo files that are tracked', () => {
    expect(commitSafetyProblems(fixture(['dev/harness-home/.credentials.yaml', '.env']))).toEqual([])
  })

  it('flags a credential or residue path that would be committed', () => {
    const problems = commitSafetyProblems(fixture(['.env']))
    expect(problems).toEqual(['dev/harness-home/.credentials.yaml must be ignored but is not'])
  })

  it('flags a tracked-by-contract file that an ignore rule swallowed', () => {
    // Keep the residue side green, so the assertion isolates the swallowed-file rule.
    const problems = commitSafetyProblems(fixture(['dev/harness-home/.credentials.yaml', '.env', 'docs/home.md', 'pnpm-workspace.yaml']))
    expect(problems).toEqual([
      'docs/home.md must be tracked but is ignored',
      'pnpm-workspace.yaml must be tracked but is ignored',
    ])
  })
})

describe('trackedContentProblems', () => {
  it('accepts content and keeps a lockfile under the ceiling', () => {
    expect(trackedContentProblems({ files: [
      { path: 'docs/dev.md', size: 12_000 },
      { path: 'pnpm-lock.yaml', size: 861_819 },
    ] })).toEqual([])
  })

  it('flags built output that is tracked', () => {
    expect(trackedContentProblems({ files: [{ path: 'packages/dsh-smart-assistant/lib/index.js', size: 10 }] }))
      .toEqual(['packages/dsh-smart-assistant/lib/index.js is build or runtime residue — keep it ignored and recreate it with the documented command'])
  })

  it('flags a run home, the repo temp root, and a coverage directory', () => {
    const problems = trackedContentProblems({ files: [
      { path: 'dev/harness-home/settings.json', size: 1 },
      { path: '.tmp/probe/out.json', size: 1 },
      { path: 'coverage/report.html', size: 1 },
      // A source tree that happens to be named lib is content, not residue.
      { path: 'dev/lib/session-logs.mjs', size: 1 },
    ] })
    expect(problems).toHaveLength(3)
  })

  it('flags an oversized blob unless it is deliberately allowlisted', () => {
    const files = [{ path: 'dev/fixtures/dump.json', size: 2 * 1024 * 1024 }]
    expect(trackedContentProblems({ files })).toHaveLength(1)
    expect(trackedContentProblems({ files, allow: ['dev/fixtures/dump.json'] })).toEqual([])
  })
})

describe('trackedDataPaths', () => {
  it('picks data/config and leaves prose, code, and the recorded corpus', () => {
    expect(trackedDataPaths([
      'snapshots/web-face/x/snapshot.yml',
      'snapshots/web-face/x/expected.dom.json',
      'packages/dsh-smart-assistant/package.json',
      'README.md',
      'scripts/checks/verify.mjs',
      'dev/fixtures/desk-process/followup/session.v4.jsonl',
    ])).toEqual([
      'snapshots/web-face/x/snapshot.yml',
      'snapshots/web-face/x/expected.dom.json',
      'packages/dsh-smart-assistant/package.json',
    ])
  })
})
