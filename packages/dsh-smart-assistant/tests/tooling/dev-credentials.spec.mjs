/**
 * Fixtures for the dev credential resolver (`dev/lib/dev-credentials.mjs`): the rule eval and
 * release-smoke share, so a live turn is BLOCKED only when neither the environment nor the dev
 * home's `.credentials.yaml` has the key. Values never appear in a report; these fixtures use a
 * fake one.
 */
import { describe, expect, it } from 'vitest'
import { credentialEnv, deepseekKey, deepseekKeyFrom } from '../../../../dev/lib/dev-credentials.mjs'

const file = [
  'version: 1',
  'refs:',
  '  DEEPSEEK_API_KEY: sk-fixture-key',
  'records:',
  '  client-connection/browser-session:',
  '    kind: secret',
  '',
].join('\n')

describe('dev credentials', () => {
  it('an exported key wins and the file is not consulted', () => {
    let read = false
    const env = { DEEPSEEK_API_KEY: 'sk-from-env' }
    expect(credentialEnv({ env, exists: () => { read = true; return true }, read: () => file })).toEqual({})
    expect(deepseekKey({ env })).toBe('sk-from-env')
    expect(read).toBe(false)
  })

  it('mirrors the refs line when the environment has none', () => {
    const env = {}
    expect(credentialEnv({ env, exists: () => true, read: () => file })).toEqual({ DEEPSEEK_API_KEY: 'sk-fixture-key' })
    expect(deepseekKey({ env, exists: () => true, read: () => file })).toBe('sk-fixture-key')
  })

  it('returns nothing (never a fake) when the file or the refs line is absent', () => {
    expect(credentialEnv({ env: {}, exists: () => false })).toEqual({})
    expect(credentialEnv({ env: {}, exists: () => true, read: () => 'version: 1\nrefs: {}\n' })).toEqual({})
    expect(deepseekKey({ env: {}, exists: () => false })).toBeUndefined()
  })

  it('reads only the refs line, not a same-named record field', () => {
    const recordOnly = 'records:\n  DEEPSEEK_API_KEY: sk-not-a-ref\n'
    expect(deepseekKeyFrom(recordOnly)).toBeUndefined()
    expect(deepseekKeyFrom('refs:\n  DEEPSEEK_API_KEY: "sk-quoted"\n')).toBe('sk-quoted')
  })
})
