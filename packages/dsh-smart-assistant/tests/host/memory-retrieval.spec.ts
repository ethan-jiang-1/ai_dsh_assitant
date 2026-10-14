/**
 * The memory recall service seam: it ranks valid active room entries and obeys the configured
 * default limit without requiring the full AssistantMemory host.
 */
import { describe, expect, it } from 'vitest'
import type { RoomListing } from '../../src/domain/home/room.ts'
import { recall } from '../../src/host/memory-room.ts'

const now = new Date().toISOString()

const activeListing: RoomListing = {
  entries: [
    {
      id: 'staging-important',
      path: '/home/memory/staging-important.md',
      data: { id: 'staging-important', kind: 'fact', status: 'active', created: '2000-01-01T00:00:00.000Z', updated: '2000-01-01T00:00:00.000Z', tags: [], importance: 5 },
      body: 'Use the staging gate before production.',
    },
    {
      id: 'staging-recent',
      path: '/home/memory/staging-recent.md',
      data: { id: 'staging-recent', kind: 'fact', status: 'active', created: now, updated: now, tags: [], importance: 3 },
      body: 'Check the staging database.',
    },
    {
      id: 'unrelated',
      path: '/home/memory/unrelated.md',
      data: { id: 'unrelated', kind: 'fact', status: 'active', created: now, updated: now, tags: [], importance: 3 },
      body: 'Prepare the meeting agenda.',
    },
    {
      id: 'retired-staging',
      path: '/home/memory/retired-staging.md',
      data: { kind: 'fact', status: 'retired', created: now, updated: now, tags: [], importance: 5 },
      body: 'The old staging process.',
    },
  ],
  failures: [],
}

const archivedListing: RoomListing = {
  entries: [{
    id: 'archived-staging',
    path: '/home/memory/archive/archived-staging.md',
    data: { id: 'archived-staging', kind: 'fact', status: 'active', created: now, updated: now, tags: [], importance: 5 },
    body: 'An archived staging process.',
  }],
  failures: [],
}

const narrowRecallReader = {
  memory: {
    list: async (): Promise<RoomListing> => activeListing,
    listArchived: async (): Promise<RoomListing> => archivedListing,
  },
  recallLimit: 1,
} satisfies Parameters<typeof recall>[0]

describe('recall', () => {
  it('ranks active matching memories and applies the configured default limit', async () => {
    const hits = await recall(narrowRecallReader, { query: 'staging' })

    expect(hits.map(hit => hit.record.id)).toEqual(['staging-important'])
    expect(hits[0]?.why).toContain('term:staging')
    expect(hits[0]?.why).toContain('importance:5')
  })
})
