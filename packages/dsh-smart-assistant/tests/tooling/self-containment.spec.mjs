/**
 * Fixtures for the self-containment core (scripts/checks/gates/self-containment.mjs): the two
 * ways a published file stops being self-contained — a relative import resolving outside the
 * package, and any mention of the `vendor/` submodule. Plain .mjs (vitest runs it; the type gate
 * does not include it), same contract as the other tooling specs.
 */
import { describe, expect, it } from 'vitest'
import { selfContainmentProblems } from '../../../../scripts/checks/gates/self-containment.mjs'

const fixture = files => ({ repoRoot: '/fixture/repo', packageDir: '/fixture/repo/packages/ours', files })

describe('selfContainmentProblems', () => {
  it('accepts a published file whose relative imports stay inside the package', () => {
    expect(selfContainmentProblems(fixture([
      { path: '/fixture/repo/packages/ours/src/index.ts', text: "import { a } from './a'\nimport { b } from '../ours/b'" },
    ]))).toEqual([])
  })

  it('flags a relative import that escapes the package directory', () => {
    const problems = selfContainmentProblems(fixture([
      { path: '/fixture/repo/packages/ours/src/index.ts', text: "import { x } from '../../outside/thing'" },
    ]))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('escapes the package')
    expect(problems[0]).toContain('packages/ours/src/index.ts')
  })

  it('flags any mention of vendor/, even without an import', () => {
    const problems = selfContainmentProblems(fixture([
      { path: '/fixture/repo/packages/ours/presets/x.yml', text: '# see vendor/dsh/docs/architecture.md' },
    ]))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('mentions vendor/')
  })

  it('reports every offending file, not just the first', () => {
    const problems = selfContainmentProblems(fixture([
      { path: '/fixture/repo/packages/ours/a.ts', text: "import { x } from '../../outside'" },
      { path: '/fixture/repo/packages/ours/b.ts', text: 'vendor/dsh' },
    ]))
    expect(problems).toHaveLength(2)
  })
})
