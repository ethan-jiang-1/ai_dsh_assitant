/**
 * The digest is the desktop of the home, and its budget is the guarantee that matters: whatever else
 * happens, the always-on view cannot grow without limit. These tests pin the budget, the selection
 * order, and the fact that the map survives even when nothing else fits.
 */

import { describe, expect, it } from 'vitest'
import { renderDigest } from '../src/home/digest.ts'
import type { MemoryRecord } from '../src/memory/record.ts'
import type { ResearchThread } from '../src/research/thread.ts'

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
      statusBlurb: '你的家比这次会话活得更久。',
      memories: [memory({ id: 'a-1', text: '用户偏好简洁的回答。'.repeat(20) })],
      threads: [],
      pages: [],
      maxBytes: 120,
    })

    expect(Buffer.byteLength(result.text, 'utf8')).toBeLessThanOrEqual(120)
    expect(result.truncated).toBe(true)
  })
})
