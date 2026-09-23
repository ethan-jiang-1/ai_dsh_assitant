/**
 * Recall ranking is the one part of memory a person cannot see, so the tests pin both the ordering
 * and the reasons: a hit that cannot explain itself is a hit nobody can audit.
 */

import { describe, expect, it } from 'vitest'
import { recallMemories } from '../src/memory/recall.ts'
import type { MemoryRecord } from '../src/memory/record.ts'

const now = new Date('2026-09-23T00:00:00.000Z')

function record(overrides: Partial<MemoryRecord> & { id: string }): MemoryRecord {
  return {
    kind: 'fact',
    status: 'active',
    created: '2026-09-01T00:00:00.000Z',
    updated: '2026-09-01T00:00:00.000Z',
    tags: [],
    importance: 3,
    text: 'placeholder',
    ...overrides,
  }
}

const records: MemoryRecord[] = [
  // importance 4 so the tag hit is unambiguous: the `preference` record below carries the same tag.
  record({ id: 'tagged', tags: ['deploy'], text: 'Deploys go through the staging gate.', importance: 4 }),
  record({ id: 'keyword', text: 'The staging database resets nightly.' }),
  record({ id: 'recent', text: 'Unrelated but fresh.', updated: '2026-09-22T00:00:00.000Z' }),
  record({ id: 'important', text: 'Unrelated but load-bearing.', importance: 5 }),
  record({ id: 'retired', status: 'retired', tags: ['deploy'], text: 'Old deploy rule.' }),
  record({ id: 'preference', kind: 'preference', tags: ['deploy'], text: 'Prefers terse answers.' }),
]

describe('recallMemories', () => {
  it('ranks tag matches above keyword matches and explains each hit', () => {
    const hits = recallMemories(records, { tags: ['deploy'], limit: 10 }, now)

    expect(hits[0]?.record.id).toBe('tagged')
    expect(hits[0]?.why).toContain('tag:deploy')
    expect(hits.every(hit => hit.record.tags.includes('deploy'))).toBe(true)
  })

  it('matches free text without a tag filter and says which term hit', () => {
    const hits = recallMemories(records, { query: 'staging', limit: 10 }, now)
    const ids = hits.map(hit => hit.record.id)

    expect(ids).toContain('keyword')
    expect(ids).toContain('tagged')
    expect(hits.find(hit => hit.record.id === 'keyword')?.why).toContain('term:staging')
  })

  it('excludes records that lack a required tag, even when the text matches', () => {
    const hits = recallMemories(records, { query: 'staging', tags: ['deploy'], limit: 10 }, now)

    expect(hits.map(hit => hit.record.id)).not.toContain('keyword')
  })

  it('never returns a record that left the active set', () => {
    const hits = recallMemories(records, { tags: ['deploy'], limit: 10 }, now)

    expect(hits.map(hit => hit.record.id)).not.toContain('retired')
  })

  it('filters by kind and requires every requested tag', () => {
    const byKind = recallMemories(records, { kind: 'preference', limit: 10 }, now)
    const byTag = recallMemories(records, { tags: ['deploy', 'missing'], limit: 10 }, now)

    expect(byKind.map(hit => hit.record.id)).toEqual(['preference'])
    expect(byTag).toEqual([])
  })

  it('marks an unfiltered call as a listing and honours the limit', () => {
    const hits = recallMemories(records, { limit: 2 }, now)

    expect(hits).toHaveLength(2)
    expect(hits.every(hit => hit.why.includes('listing'))).toBe(true)
  })

  it('lets importance outrank recency, then breaks ties by recency', () => {
    const hits = recallMemories(records, { limit: 10 }, now)
    const importantIndex = hits.findIndex(hit => hit.record.id === 'important')
    const recentIndex = hits.findIndex(hit => hit.record.id === 'recent')

    expect(importantIndex).toBeLessThan(recentIndex)
    expect(hits[importantIndex]?.why).toContain('importance:5')
  })
})
