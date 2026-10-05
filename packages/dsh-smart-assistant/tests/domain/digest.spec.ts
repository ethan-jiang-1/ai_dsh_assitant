/**
 * The digest is the desktop of the home, and its budget is the guarantee that matters: whatever else
 * happens, the always-on view cannot grow without limit. These tests pin the budget, the selection
 * order, and the fact that the map survives even when nothing else fits.
 */

import { describe, expect, it } from 'vitest'
import { renderDigest } from '../../src/domain/home/digest.ts'
import type { MemoryRecord } from '../../src/domain/memory/record.ts'
import type { ResearchThread } from '../../src/domain/research/thread.ts'
import type { KnowledgePage } from '../../src/domain/knowledge/page.ts'

function memory(overrides: Partial<MemoryRecord> & { id: string }): MemoryRecord {
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

function thread(overrides: Partial<ResearchThread> & { id: string }): ResearchThread {
  return {
    status: 'open',
    question: 'placeholder?',
    why: 'because',
    evidence: [],
    created: '2026-09-01T00:00:00.000Z',
    updated: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function page(id: string, description: string): KnowledgePage {
  return { id, status: 'stable', type: 'concept', title: id.toUpperCase(), description, sources: [], tags: [], body: '', links: [] }
}

const blurb = 'Your home outlives this session.'

describe('renderDigest', () => {
  it('renders the map, the strongest memories, and the open-thread count', () => {
    const result = renderDigest({
      statusBlurb: blurb,
      memories: [
        memory({ id: 'a-1', text: 'The user prefers terse answers.', importance: 5 }),
        memory({ id: 'a-2', text: 'Deploys go through staging.' }),
      ],
      threads: [thread({ id: 't-1', question: 'One file per memory?' })],
      pages: [],
      maxBytes: 4096,
    })

    expect(result.text).toContain(blurb)
    expect(result.memoryIds).toEqual(['a-1', 'a-2'])
    expect(result.openThreads).toBe(1)
    expect(result.truncated).toBe(false)
    expect(result.text.indexOf('a-1')).toBeLessThan(result.text.indexOf('a-2'))
  })

  it('leaves retired records and archived threads out', () => {
    const result = renderDigest({
      statusBlurb: blurb,
      memories: [memory({ id: 'gone', status: 'retired' })],
      threads: [thread({ id: 'parked-1', status: 'parked' }), thread({ id: 'closed-1', status: 'dropped' })],
      pages: [],
      maxBytes: 4096,
    })

    expect(result.text).not.toContain('gone')
    expect(result.text).not.toContain('closed-1')
    expect(result.openThreads).toBe(0)
    expect(result.parkedThreads).toBe(1)
  })

  it('stops at the budget and says so', () => {
    const memories = Array.from({ length: 40 }, (_, index) => memory({
      id: `a-${String(index).padStart(2, '0')}`,
      text: `A claim long enough to consume budget number ${index}.`,
    }))

    const result = renderDigest({ statusBlurb: blurb, memories, threads: [], pages: [], maxBytes: 400 })

    expect(result.bytes).toBeLessThanOrEqual(400)
    expect(result.truncated).toBe(true)
    expect(result.memoryIds.length).toBeLessThan(memories.length)
  })

  it('keeps the map even when the budget cannot hold a single record', () => {
    const result = renderDigest({
      statusBlurb: blurb,
      memories: [memory({ id: 'a-1', text: 'x'.repeat(500) })],
      threads: [],
      pages: [],
      maxBytes: 64,
    })

    expect(result.text).toContain('Your home outlives this session.')
    expect(result.memoryIds).toEqual([])
    expect(result.truncated).toBe(true)
  })

  it('counts bytes, not characters, so a CJK digest is bounded too', () => {
    const result = renderDigest({
      statusBlurb: '你的 working folder 比这次会话活得更久。',
      memories: [memory({ id: 'a-1', text: '用户偏好简洁的回答。'.repeat(20) })],
      threads: [],
      pages: [],
      maxBytes: 120,
    })

    expect(Buffer.byteLength(result.text, 'utf8')).toBeLessThanOrEqual(120)
    expect(result.truncated).toBe(true)
  })
})

describe('renderDigest degradation', () => {
  // The digest may shorten what it shows, but it must never silently hide a whole room: when the
  // budget bites, descriptions go first, and what still does not fit is announced.
  const pages = Array.from({ length: 6 }, (_unused, index) =>
    page(`p-${index}`, 'a description long enough that dropping it visibly saves bytes in the tree'))
  const manyMemories = Array.from({ length: 6 }, (_unused, index) =>
    memory({ id: `m-${index}`, text: `record ${index} `.repeat(12), importance: 9 - index }))

  it('keeps every page signposted by dropping descriptions before it drops pages', () => {
    const generous = renderDigest({ statusBlurb: blurb, memories: [], threads: [], pages, maxBytes: 4096 })
    const tight = renderDigest({ statusBlurb: blurb, memories: [], threads: [], pages, maxBytes: generous.bytes - 40 })

    expect(tight.truncated).toBe(false)
    for (const entry of pages) expect(tight.text).toContain(entry.id)
    expect(tight.text).not.toContain('a description long enough')
  })

  it('announces what it omitted once even the compact tree does not fit', () => {
    const result = renderDigest({ statusBlurb: blurb, memories: manyMemories, threads: [], pages, maxBytes: 700 })

    expect(result.truncated).toBe(true)
    expect(Buffer.byteLength(result.text, 'utf8')).toBeLessThanOrEqual(700)
    expect(result.text).toContain('omitted — digest budget')
    expect(result.text).toContain(blurb)
  })

  it('keeps the map and drops the marker when there is no room for either', () => {
    const result = renderDigest({
      statusBlurb: blurb,
      memories: [memory({ id: 'big', text: 'x'.repeat(400) })],
      threads: [],
      pages,
      maxBytes: 70,
    })

    expect(result.text).toContain(blurb)
    expect(result.text).not.toContain('omitted — digest budget')
    expect(result.memoryIds).toEqual([])
  })

  it('is deterministic: the same input renders byte-identical output', () => {
    const input = { statusBlurb: blurb, memories: manyMemories, threads: [], pages, maxBytes: 700 }
    expect(renderDigest(input).text).toBe(renderDigest(input).text)
  })
})
