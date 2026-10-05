/**
 * Frontmatter is the substrate of every home file. The behavior worth pinning is that a bad file is
 * reported as unparsable rather than throwing, because a throw would take down a curation pass that
 * is supposed to *name* the bad file.
 */

import { describe, expect, it } from 'vitest'
import { parseFrontmatterDocument, renderFrontmatterDocument } from '../../src/home/frontmatter.ts'

describe('renderFrontmatterDocument', () => {
  it('writes fields in insertion order and omits undefined values', () => {
    const text = renderFrontmatterDocument({ id: 'a-1', status: 'active', lean: undefined }, 'Body text.')

    expect(text).toBe('---\nid: a-1\nstatus: active\n---\n\nBody text.\n')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('quotes values that would otherwise change meaning', () => {
    const text = renderFrontmatterDocument({ note: 'yes: no' }, 'body')
    const parsed = parseFrontmatterDocument(text)

    expect(parsed?.data.note).toBe('yes: no')
  })
})

describe('parseFrontmatterDocument', () => {
  it('round-trips fields and body', () => {
    const parsed = parseFrontmatterDocument(
      renderFrontmatterDocument({ id: 'x', tags: ['a', 'b'], importance: 4 }, 'One claim.\nSecond line.'),
    )

    expect(parsed?.data).toEqual({ id: 'x', tags: ['a', 'b'], importance: 4 })
    expect(parsed?.body).toBe('One claim.\nSecond line.')
  })

  it('reports a missing delimiter, an unterminated header, and non-mapping YAML as unparsable', () => {
    expect(parseFrontmatterDocument('no frontmatter here')).toBeUndefined()
    expect(parseFrontmatterDocument('---\nid: a\n')).toBeUndefined()
    expect(parseFrontmatterDocument('---\n- just\n- a list\n---\nbody')).toBeUndefined()
    expect(parseFrontmatterDocument('---\nid: [unclosed\n---\nbody')).toBeUndefined()
  })

  it('tolerates a BOM and CRLF line endings', () => {
    const parsed = parseFrontmatterDocument('\uFEFF---\r\nid: a\r\n---\r\n\r\nbody\r\n')

    expect(parsed?.data.id).toBe('a')
    expect(parsed?.body).toBe('body')
  })
})
