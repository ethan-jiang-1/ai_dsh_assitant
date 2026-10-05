/**
 * Record vocabulary: id shape, validation, and the round trip through frontmatter. The CJK case is
 * pinned deliberately — the user's memories will often be Chinese, and a slug that silently produced
 * an invalid file name would lose the record.
 */

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_IMPORTANCE,
  memoryFromEntry,
  memoryToDocument,
  newMemoryId,
  slugify,
  validateMemoryData,
} from '../../src/domain/memory/record.ts'
import type { MemoryRecord } from '../../src/domain/memory/record.ts'
import { renderFrontmatterDocument, parseFrontmatterDocument } from '../../src/domain/home/frontmatter.ts'

const at = new Date('2026-09-23T10:00:00.000Z')

function record(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: '20260923-the-user-prefers-terse-answers-ab12',
    kind: 'preference',
    status: 'active',
    created: at.toISOString(),
    updated: at.toISOString(),
    tags: ['style'],
    importance: DEFAULT_IMPORTANCE,
    text: 'The user prefers terse answers.',
    ...overrides,
  }
}

describe('slugify', () => {
  it('keeps ascii words and falls back to a safe word for text it cannot transliterate', () => {
    expect(slugify('The user prefers terse answers!')).toBe('the-user-prefers-terse-answers')
    expect(slugify('用户偏好简洁的回答')).toBe('note')
    expect(slugify('!!!')).toBe('note')
  })

  it('never emits a leading or trailing dash', () => {
    expect(slugify('  -- leading and trailing -- ')).toBe('leading-and-trailing')
  })
})

describe('newMemoryId', () => {
  it('is date-sortable and unique by suffix', () => {
    const id = newMemoryId(at, 'The user prefers terse answers', 'ab12')

    expect(id).toBe('20260923-the-user-prefers-terse-answers-ab12')
    expect(newMemoryId(at, 'x', 'zzzz')).not.toBe(id)
  })

  it('honours an explicit slug', () => {
    expect(newMemoryId(at, '用户偏好简洁', 'ab12', 'terse-style')).toBe('20260923-terse-style-ab12')
  })
})

describe('validateMemoryData', () => {
  it('accepts a complete header', () => {
    expect(validateMemoryData(memoryToDocument(record()).data)).toEqual([])
  })

  it('names every missing or out-of-range field', () => {
    const problems = validateMemoryData({ kind: 'rumour', status: 'live', tags: 'style', importance: 9 })

    expect(problems.join(' ')).toMatch(/missing id/)
    expect(problems.join(' ')).toMatch(/kind must be one of/)
    expect(problems.join(' ')).toMatch(/status must be one of/)
    expect(problems.join(' ')).toMatch(/importance must be an integer/)
    expect(problems.join(' ')).toMatch(/tags must be a list of strings/)
  })
})

describe('memory round trip', () => {
  it('survives write and read through frontmatter', () => {
    const original = record({ source: 'session-1', supersedes: '20260901-old-ab12', importance: 5 })
    const document = memoryToDocument(original)
    const text = renderFrontmatterDocument(document.data, document.body)
    const parsed = parseFrontmatterDocument(text)
    const restored = memoryFromEntry({
      id: original.id,
      path: '/tmp/x.md',
      data: parsed?.data ?? {},
      body: parsed?.body ?? '',
    })

    expect(restored).toEqual(original)
  })

  it('rejects an entry whose body is empty', () => {
    expect(memoryFromEntry({ id: 'a-1', path: '/tmp/a.md', data: { ...memoryToDocument(record()).data }, body: '' }))
      .toBeUndefined()
  })
})
