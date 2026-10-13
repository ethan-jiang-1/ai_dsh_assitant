/**
 * Fixtures for the package's preset-runner driver
 * (src/dev/preset-runner/index.ts) — the verification driver, not a verify gate. Kept in
 * the tooling lane beside the other repo/package verification-driver specs.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { describe, expect, it } from 'vitest'

describe('composeRunnerTask', () => {
  it('prepends the standing collaboration boundary to every scripted task', async () => {
    const { composeRunnerTask, COLLABORATION_BOUNDARY } = await import('../../../../packages/dsh-smart-assistant/src/dev/preset-runner/index.ts')
    const composed = composeRunnerTask('跑一次 curate')
    expect(composed.startsWith(COLLABORATION_BOUNDARY)).toBe(true)
    expect(composed).toContain('跑一次 curate')
    expect(composed).toContain('you do not commit')
    expect(composed).toContain('not yours to trigger')
  })
})
