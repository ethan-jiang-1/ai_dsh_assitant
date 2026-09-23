/**
 * The knowledge page vocabulary (tri-line proposal 2026-09-24, phase 2 slice 2b): OKF v0.2
 * governance fields, Obsidian-compatible wikilink parsing, and id-first/title-fallback link
 * resolution with ambiguity as a reported state.
 */

import { describe, expect, it } from 'vitest'
import type { RoomEntry } from '../src/home/room.ts'
import {
  backlinksOf,
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
    }
    const page = pageFromEntry(entry(data, 'Starts at [[staging-gate]], ends at [[release-checklist]].', 'deploy-pipeline'))
    expect(page).toMatchObject({ id: 'deploy-pipeline', status: 'stable', type: 'how-it-works' })
    expect(page?.links).toEqual(['staging-gate', 'release-checklist'])
    expect(page?.sources[0]?.resource).toContain('tri-line-synthesis')

    const document = pageToDocument(page as KnowledgePage)
    expect(document.data.status).toBe('stable')
    expect(document.body).toContain('[[staging-gate]]')
    expect(pageFromEntry(entry(document.data, document.body, 'deploy-pipeline'))).toEqual(page)
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

  it('computes backlinks across the room, deduped and without self-links', () => {
    const target = pages[1] as KnowledgePage
    expect(backlinksOf(target, pages)).toEqual(['staging-gate'])
    expect(backlinksOf(pages[0] as KnowledgePage, pages)).toEqual([])
  })
})
