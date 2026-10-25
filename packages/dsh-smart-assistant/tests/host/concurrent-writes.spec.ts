/**
 * One home, two service instances: the working folder is shared across sessions by design, so
 * concurrent writers must not lose or half-write a record. The FAQ's "two sessions do not mix"
 * assertion becomes, for this product, "two writers on one home both land intact".
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AssistantMemory from '../../src/index.ts'
import { memoryPool } from '../support/host-harness.ts'

const boot = memoryPool('assistant-concurrent-writes-')

describe('concurrent writers on one home', () => {
  it('persists both records and reports no room failures', async () => {
    const first = boot()
    await first.service.ensureHome()
    const second = new AssistantMemory(new Context(), { dataDir: first.dataDir })

    await Promise.all([
      first.service.saveMemory({ text: 'written by the first service', kind: 'fact' }),
      second.saveMemory({ text: 'written by the second service', kind: 'fact' }),
    ])

    const listing = await first.service.listMemories()
    expect(listing.failures).toEqual([])
    expect(listing.entries.map(entry => entry.text).sort()).toEqual([
      'written by the first service',
      'written by the second service',
    ])
  })
})
