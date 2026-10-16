/**
 * Fixtures for the commit-safety core (scripts/checks/gates/commit-safety.mjs): the two ways the
 * repo's residue rules break — something that must be ignored becomes tracked, or something the
 * repo depends on becomes ignored. Plain .mjs (vitest runs it; the type gate does not include it).
 */
import { describe, expect, it } from 'vitest'
import { commitSafetyProblems } from '../../../../scripts/checks/gates/commit-safety.mjs'

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
