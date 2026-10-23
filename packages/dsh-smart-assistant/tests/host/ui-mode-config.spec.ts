/**
 * The Host config's interface-density field: three accepted values, default standard.
 * The Host stores the preference only; the client renders it.
 */
import { describe, expect, it } from 'vitest'
import { AssistantMemory } from '../../src/host/index.ts'

describe('host uiMode config', () => {
  it('defaults to standard and accepts every mode', () => {
    expect(AssistantMemory.Config({}).uiMode).toBe('standard')
    expect(AssistantMemory.Config({ uiMode: 'simple' }).uiMode).toBe('simple')
    expect(AssistantMemory.Config({ uiMode: 'expert' }).uiMode).toBe('expert')
  })

  it('rejects an unknown mode', () => {
    expect(() => AssistantMemory.Config({ uiMode: 'loud' as never })).toThrow()
  })
})
