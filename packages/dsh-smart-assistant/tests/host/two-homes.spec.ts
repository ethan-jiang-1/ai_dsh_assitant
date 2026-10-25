/**
 * Two homes are two owners: writes through one `AssistantMemory` never appear in the other.
 * This is the service-level half of the "one person = one DSH_HOME" boundary; the other half is
 * the data bundle roundtrip in tests/tooling/assistant-data.spec.mjs.
 */
import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'

const boot = memoryPool('assistant-two-homes-')

describe('two homes', () => {
  it('keeps memory writes isolated and uses distinct roots', async () => {
    const a = boot()
    const b = boot()
    await a.service.ensureHome()
    await b.service.ensureHome()
    expect(a.service.paths.root).not.toBe(b.service.paths.root)

    await a.service.saveMemory({ text: 'only in home a', kind: 'fact' })
    expect((await a.service.listMemories()).entries.map(entry => entry.text)).toContain('only in home a')
    expect((await b.service.listMemories()).entries).toEqual([])

    await b.service.saveMemory({ text: 'only in home b', kind: 'fact' })
    expect((await a.service.listMemories()).entries.map(entry => entry.text)).not.toContain('only in home b')
    expect((await b.service.listMemories()).entries.map(entry => entry.text)).toContain('only in home b')
  })
})
