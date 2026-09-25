/**
 * The ingest core is pure and decides what a bulk import writes: a stable id per provenance ref
 * (so re-import updates instead of duplicating), provenance that is never empty, and a truncation
 * marker instead of silently shortened text. These tests pin those properties.
 */
import { describe, expect, it } from 'vitest'
import {
  BODY_LIMIT_BYTES,
  planSourcePage,
  segmentDocument,
  slugify,
  sourcePageId,
} from '../src/knowledge/ingest.ts'

describe('slugify', () => {
  it('keeps ASCII alphanumerics, folds everything else to dashes, and never returns empty', () => {
    expect(slugify('Q3 Sales Review!!')).toBe('q3-sales-review')
    expect(slugify('  2026 -- 预算  ')).toBe('2026')
    expect(slugify('季度经营复盘')).toBe('doc')
  })
})

describe('sourcePageId', () => {
  it('is deterministic per reference and differs across references', () => {
    const first = sourcePageId('Q3 Sales Review', 'docs/q3.md')
    expect(first).toBe(sourcePageId('Q3 Sales Review', 'docs/q3.md'))
    expect(first).not.toBe(sourcePageId('Q3 Sales Review', 'docs/q3-v2.md'))
    expect(first).toMatch(/^source-q3-sales-review-[0-9a-f]{8}$/)
  })
})

describe('segmentDocument', () => {
  it('splits at headings and keeps the preamble', () => {
    const sections = segmentDocument('intro line\n\n# One\nalpha\n\n## Two\nbeta\n')
    expect(sections).toEqual([
      { body: 'intro line' },
      { heading: 'One', body: 'alpha' },
      { heading: 'Two', body: 'beta' },
    ])
  })

  it('treats fenced code as opaque, so a # inside a fence is not a heading', () => {
    const sections = segmentDocument('# Real\n```sh\n# not a heading\n```\ntail\n')
    expect(sections).toHaveLength(1)
    expect(sections[0]?.heading).toBe('Real')
    expect(sections[0]?.body).toContain('# not a heading')
  })

  it('returns nothing for empty input', () => {
    expect(segmentDocument('   \n\n')).toEqual([])
  })
})

describe('planSourcePage', () => {
  it('carries provenance, a summary line, and stable ids', () => {
    const document = { ref: 'docs/q3.md', title: 'Q3 Sales Review', text: 'Revenue fell 20%.\n\n# Causes\nPricing.\n' }
    const plan = planSourcePage(document)
    expect(plan.sources).toEqual(['docs/q3.md'])
    expect(plan.description).toBe('Revenue fell 20%.')
    expect(plan.id).toBe(sourcePageId('Q3 Sales Review', 'docs/q3.md'))
    expect(plan.tags).toEqual(['imported'])
    expect(plan.sections).toHaveLength(2)
    expect(planSourcePage(document)).toEqual(plan)
  })

  it('falls back to an English description when the document has no prose', () => {
    const plan = planSourcePage({ ref: 'empty.md', title: 'Empty', text: '# Only a heading\n' })
    expect(plan.description).toBe('Empty (imported source)')
  })

  it('marks truncation instead of silently shortening the text', () => {
    const plan = planSourcePage({ ref: 'big.txt', title: 'Big', text: 'x'.repeat(200) }, { truncatedAt: 64 })
    expect(Buffer.byteLength(plan.body, 'utf8')).toBeLessThan(BODY_LIMIT_BYTES)
    expect(plan.body).toContain('truncated at 64 bytes of 200')
    expect(plan.body).toContain('big.txt')
  })
})
