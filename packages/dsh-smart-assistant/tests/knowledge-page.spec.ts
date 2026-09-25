/**
 * The knowledge page vocabulary (tri-line proposal 2026-09-24, phase 2 slice 2b): OKF v0.2
 * governance fields, Obsidian-compatible wikilink parsing, and id-first/title-fallback link
 * resolution with ambiguity as a reported state. Also the 2026-09-25 Obsidian interop slice:
 * links are normalized to `[[<id>|<title>]]` (the one form both resolvers click) and every page
 * mirrors its title into `aliases` for Obsidian's autocomplete.
 */

import { describe, expect, it } from 'vitest'
import type { RoomEntry } from '../src/home/room.ts'
import {
  backlinksOf,
  normalizeWikiLinks,
  pageFromEntry,
  pageToDocument,
  parseWikiLinks,
  resolveWikiLink,
  validatePageData,
  type KnowledgePage,
} from '../src/knowledge/page.ts'

function entry(data: Record<string, unknown>, body: string, id = 'test-page'): RoomEntry {
  return { id, path: `/h/knowledge/${id}.md`, data, body }
}

describe('parseWikiLinks', () => {
  it('extracts targets from all three syntaxes, in order, ignoring markdown links', () => {
    const text = [
      'See [[deploy-pipeline]] first, then [[deploy-pipeline|the pipeline]] again.',
      'The [[release-checklist#sign-off]] step matters. Not [markdown](links.md).',
    ].join('\n')
    expect(parseWikiLinks(text)).toEqual(['deploy-pipeline', 'deploy-pipeline', 'release-checklist'])
  })

  it('trims whitespace around targets', () => {
    expect(parseWikiLinks('[[ spaced-target ]]')).toEqual(['spaced-target'])
  })

  it('ignores [[literals]] inside code spans and fenced blocks, keeps real links', () => {
    const text = [
      'The syntax is `[[wikilink]]`; a fenced example:',
      '```text',
      'a [[fenced-example]] is not parsed',
      '```',
      'But [[real-page]] is a link, and so is the one in the fenced-free line [[second-page]].',
    ].join('\n')
    expect(parseWikiLinks(text)).toEqual(['real-page', 'second-page'])
  })
})

describe('normalizeWikiLinks', () => {
  const pages: KnowledgePage[] = [
    { id: '20260924-staging-gate-k3p7', status: 'stable', type: 'concept', title: 'Staging Gate', sources: [], tags: [], body: '', links: [] },
    { id: '20260924-untitled-page-a1b2', status: 'stable', type: 'concept', sources: [], tags: [], body: '', links: [] },
  ]

  it('rewrites a resolvable name link into the form Obsidian also clicks', () => {
    expect(normalizeWikiLinks('Gate first: [[Staging Gate]].', pages))
      .toBe('Gate first: [[20260924-staging-gate-k3p7|Staging Gate]].')
    // Case-insensitive, like title resolution itself.
    expect(normalizeWikiLinks('see [[staging gate]]', pages))
      .toBe('see [[20260924-staging-gate-k3p7|Staging Gate]]')
  })

  it('keeps anchors, falls back to the written name for a page without a title', () => {
    expect(normalizeWikiLinks('[[Staging Gate#sign-off]]', pages))
      .toBe('[[20260924-staging-gate-k3p7#sign-off|Staging Gate]]')
    expect(normalizeWikiLinks('[[20260924-untitled-page-a1b2]]', pages))
      .toBe('[[20260924-untitled-page-a1b2|20260924-untitled-page-a1b2]]')
  })

  it('leaves alone what it must not guess at: links with display text, unknown names, code spans', () => {
    const body = [
      '[[Staging Gate|the gate]] stays as written.',
      '[[Some Unwritten Page]] stays unresolved.',
      'The syntax is `[[Staging Gate]]` in backticks.',
      '```text',
      '[[Staging Gate]] in a fence',
      '```',
    ].join('\n')
    const normalized = normalizeWikiLinks(body, pages)
    expect(normalized).toBe(body)
    expect(parseWikiLinks(normalized)).toEqual(['Staging Gate', 'Some Unwritten Page'])
  })

  it('is idempotent, so re-saving a page does not nest replacements', () => {
    const once = normalizeWikiLinks('[[Staging Gate]] and [[Some Unwritten Page]]', pages)
    expect(normalizeWikiLinks(once, pages)).toBe(once)
  })
})

describe('validatePageData', () => {
  it('requires only type, and defaults status to stable', () => {
    expect(validatePageData({ type: 'concept' })).toEqual([])
  })

  it('rejects a missing type, a bad status, bad sources, and a relative staleAfter', () => {
    expect(validatePageData({}).join('; ')).toContain('missing type')
    expect(validatePageData({ type: 'concept', status: 'live' }).join('; ')).toContain('status must be one of')
    expect(validatePageData({ type: 'concept', sources: ['nope'] }).join('; ')).toContain('each source needs a non-empty resource')
    expect(validatePageData({ type: 'concept', staleAfter: '30d' }).join('; ')).toContain('staleAfter must be an absolute ISO-8601 time')
    expect(validatePageData({ type: 'concept', generated: { by: 'x' } }).join('; ')).toContain('generated must be { by, at }')
  })

  it('rejects a scalar alias list, which Obsidian would silently ignore', () => {
    expect(validatePageData({ type: 'concept', aliases: ['ok'] })).toEqual([])
    expect(validatePageData({ type: 'concept', aliases: 'ok' }).join('; ')).toContain('aliases must be a list of strings')
  })
})

describe('pageFromEntry / pageToDocument', () => {
  it('roundtrips a full page and parses links from the body', () => {
    const data = {
      id: 'deploy-pipeline',
      type: 'how-it-works',
      status: 'stable',
      title: 'Deploy pipeline',
      description: 'How deploys reach production',
      generated: { by: 'process:assistant-reflect', at: '2026-09-24T00:00:00.000Z' },
      verified: [{ by: 'human:bowhead', at: '2026-09-24T01:00:00.000Z' }],
      staleAfter: '2027-01-01T00:00:00.000Z',
      sources: [{ resource: 'notes/proposed/2026-09-24-tri-line-synthesis.md', title: 'proposal' }],
      tags: ['deploy', 'pipeline'],
      aliases: ['deploy'],
    }
    const page = pageFromEntry(entry(data, 'Starts at [[staging-gate]], ends at [[release-checklist]].', 'deploy-pipeline'))
    expect(page).toMatchObject({ id: 'deploy-pipeline', status: 'stable', type: 'how-it-works' })
    expect(page?.links).toEqual(['staging-gate', 'release-checklist'])
    expect(page?.sources[0]?.resource).toContain('tri-line-synthesis')
    // Obsidian only ever reads aliases for autocomplete, so the title has to be in there itself.
    expect(page?.aliases).toEqual(['deploy', 'Deploy pipeline'])

    const document = pageToDocument(page as KnowledgePage)
    expect(document.data.status).toBe('stable')
    expect(document.data.aliases).toEqual(['deploy', 'Deploy pipeline'])
    expect(document.body).toContain('[[staging-gate]]')
    expect(pageFromEntry(entry(document.data, document.body, 'deploy-pipeline'))).toEqual(page)
  })

  it('writes an alias list for a titled page even when the page declares none', () => {
    const untitled: KnowledgePage = { id: 'staging-gate', status: 'draft', type: 'concept', sources: [], tags: [], body: 'text', links: [] }
    expect(pageToDocument({ ...untitled, title: 'Staging Gate' }).data.aliases).toEqual(['Staging Gate'])
    expect(pageToDocument(untitled).data.aliases).toBeUndefined()
  })

  it('returns undefined for an invalid mapping, keeping the failure to the scan', () => {
    expect(pageFromEntry(entry({ status: 'stable' }, 'body without a type'))).toBeUndefined()
    expect(pageFromEntry(entry({ type: 'concept' }, ''))).toBeUndefined()
  })
})

describe('resolveWikiLink / backlinksOf', () => {
  const pages: KnowledgePage[] = [
    { id: 'staging-gate', status: 'stable', type: 'concept', title: 'Staging Gate', sources: [], tags: [], body: 'see [[release-checklist]]', links: ['release-checklist'] },
    { id: 'release-checklist', status: 'stable', type: 'source', sources: [], tags: [], body: '', links: [] },
    { id: 'gate-one', status: 'stable', type: 'concept', title: 'Gate', sources: [], tags: [], body: '', links: [] },
    { id: 'gate-two', status: 'stable', type: 'concept', title: 'Gate', sources: [], tags: [], body: '', links: [] },
  ]

  it('resolves by id first, then by title, and reports ambiguity instead of guessing', () => {
    expect(resolveWikiLink('staging-gate', pages).kind).toBe('page')
    expect(resolveWikiLink('staging gate', pages).kind).toBe('page')
    const ambiguous = resolveWikiLink('gate', pages)
    expect(ambiguous.kind).toBe('ambiguous')
    if (ambiguous.kind === 'ambiguous') expect(ambiguous.candidates).toEqual(['gate-one', 'gate-two'])
    expect(resolveWikiLink('nowhere', pages).kind).toBe('missing')
  })

  it('accepts the `.md` suffix Obsidian writes for the same link', () => {
    const resolved = resolveWikiLink('staging-gate.md', pages)
    expect(resolved.kind).toBe('page')
    if (resolved.kind === 'page') expect(resolved.page.id).toBe('staging-gate')
  })

  it('computes backlinks across the room, deduped and without self-links', () => {
    const target = pages[1] as KnowledgePage
    expect(backlinksOf(target, pages)).toEqual(['staging-gate'])
    expect(backlinksOf(pages[0] as KnowledgePage, pages)).toEqual([])
  })
})
