/**
 * The research vocabulary carries the user's central requirement: an unresolved line of inquiry must
 * be able to die, and its death must leave a reason. These tests pin both rules at the file level, so
 * a hand-edited thread cannot quietly lose them either.
 */

import { describe, expect, it } from 'vitest'
import {
  ACTIVE_THREAD_STATUSES,
  CLOSED_THREAD_STATUSES,
  newThreadId,
  threadFromEntry,
  threadToDocument,
  validateThreadData,
} from '../src/research/thread.ts'
import type { ResearchThread } from '../src/research/thread.ts'
import { parseFrontmatterDocument, renderFrontmatterDocument } from '../src/home/frontmatter.ts'

const at = new Date('2026-09-23T10:00:00.000Z')

function thread(overrides: Partial<ResearchThread> = {}): ResearchThread {
  return {
    id: '20260923-one-file-per-memory-ab12',
    status: 'open',
    question: 'Should the home keep one file per memory or one index file?',
    why: 'It decides how the room is curated and how big the digest gets.',
    evidence: ['One file per record keeps supersede local.'],
    created: at.toISOString(),
    updated: at.toISOString(),
    ...overrides,
  }
}

describe('thread lifecycle vocabulary', () => {
  it('separates the statuses that stay in the room from the ones that leave it', () => {
    expect(ACTIVE_THREAD_STATUSES).toEqual(['open', 'parked'])
    expect(CLOSED_THREAD_STATUSES).toEqual(['promoted', 'dropped'])
  })
})

describe('newThreadId', () => {
  it('is date-sortable, readable, and unique by suffix', () => {
    expect(newThreadId(at, 'One file per memory?', 'ab12'))
      .toBe('20260923-one-file-per-memory-ab12')
  })
})

describe('validateThreadData', () => {
  it('accepts an open thread with a rationale', () => {
    expect(validateThreadData(threadToDocument(thread()).data)).toEqual([])
  })

  it('requires a reason on a dropped thread', () => {
    const data = threadToDocument(thread({ status: 'dropped' })).data

    expect(validateThreadData(data).join(' ')).toMatch(/dropped thread must record a reason/)
    expect(validateThreadData({ ...data, reason: 'Superseded by the index decision.' })).toEqual([])
  })

  it('requires a destination on a promoted thread', () => {
    const data = threadToDocument(thread({ status: 'promoted' })).data

    expect(validateThreadData(data).join(' ')).toMatch(/must name what carries the answer/)
    expect(validateThreadData({ ...data, promotedTo: '20260923-decision-ab12' })).toEqual([])
  })

  it('requires a rationale, because a thread without one is a hobby', () => {
    const data = { ...threadToDocument(thread()).data, why: '   ' }

    expect(validateThreadData(data).join(' ')).toMatch(/missing why/)
  })
})

describe('thread round trip', () => {
  it('keeps the question in the body and the decisions in the header', () => {
    const original = thread({
      status: 'parked',
      lean: 'One file per record, because supersede stays local.',
      source: 'session-9',
    })
    const document = threadToDocument(original)
    const parsed = parseFrontmatterDocument(renderFrontmatterDocument(document.data, document.body))
    const restored = threadFromEntry({
      id: original.id,
      path: '/tmp/t.md',
      data: parsed?.data ?? {},
      body: parsed?.body ?? '',
    })

    expect(restored).toEqual(original)
    expect(restored?.question).toBe(original.question)
  })
})
