/**
 * The knowledge retrieval surface (tri-line proposal 2026-09-24, phase 2 slice 2d): keyword
 * search over retrievable pages, and the digest's signpost tree. Service-level plumbing of the
 * read path (`searchKnowledge` / `readKnowledgePage` with on-demand backlinks) is covered here;
 * the `assistant_knowledge` tool is a thin adapter over these, verified live in the phase-2
 * end-to-end session.
 * The exported listing helper is also pinned to the narrow capability it consumes.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'
import { renderDigest } from '../../src/domain/home/digest.ts'
import { searchPages } from '../../src/domain/knowledge/search.ts'
import type { RoomListing } from '../../src/domain/home/room.ts'
import { listKnowledge } from '../../src/host/knowledge-room.ts'
import type { KnowledgePage } from '../../src/domain/knowledge/page.ts'

function page(overrides: Partial<KnowledgePage> & { id: string }): KnowledgePage {
  return {
    status: 'stable',
    type: 'concept',
    sources: [{ resource: 'somewhere' }],
    tags: [],
    body: 'placeholder',
    links: [],
    ...overrides,
  }
}

const listedEntry: RoomListing['entries'][number] = {
  id: 'deploy-pipeline',
  path: '/home/knowledge/deploy-pipeline.md',
  data: { type: 'how-it-works', status: 'stable', title: 'Deploy pipeline' },
  body: 'Starts at [[staging-gate]].',
}
const unreadablePage: RoomListing['entries'][number] = {
  id: 'invalid-page',
  path: '/home/knowledge/invalid-page.md',
  data: {},
  body: 'Missing the required type.',
}
const listFailure: RoomListing['failures'][number] = {
  path: '/home/knowledge/broken.md',
  reason: 'no frontmatter',
}
const knowledgeListing: RoomListing = { entries: [listedEntry, unreadablePage], failures: [listFailure] }
const narrowKnowledgeReader = {
  knowledge: { list: async (): Promise<RoomListing> => knowledgeListing },
} satisfies Parameters<typeof listKnowledge>[0]

describe('searchPages (pure ranking)', () => {
  const pages: KnowledgePage[] = [
    page({ id: 'deploy-pipeline', title: 'Deploy pipeline', description: 'how deploys ship', body: 'staging then production', tags: ['deploy'] }),
    page({ id: 'staging-gate', title: 'Staging gate', body: 'the gate before production for deploys', tags: ['deploy', 'gate'] }),
    page({ id: 'old-gate', status: 'deprecated', title: 'Old gate', body: 'the previous gate for deploys' }),
    page({ id: 'hidden-draft', status: 'draft', title: 'Deploy draft', body: 'deploys deploys deploys' }),
  ]

  it('ranks by match surfaces with reasons, and keeps deprecated hits flagged', () => {
    const hits = searchPages(pages, { text: 'deploys' })
    expect(hits.map(hit => hit.page.id)).toContain('old-gate')
    const deprecated = hits.find(hit => hit.page.id === 'old-gate')
    expect(deprecated?.page.status).toBe('deprecated')
    expect(hits.every(hit => hit.why.length > 0)).toBe(true)
  })

  it('stages drafts out of recall and honors required tags', () => {
    expect(searchPages(pages, { text: 'deploys' }).map(hit => hit.page.id)).not.toContain('hidden-draft')
    expect(searchPages(pages, { tags: ['gate'] }).map(hit => hit.page.id)).toEqual(['staging-gate'])
    expect(searchPages(pages, {})).toEqual([])
  })
})

describe('listKnowledge narrow reader', () => {
  it('maps valid pages, filters invalid entries, and preserves Room listing failures', async () => {
    const result = await listKnowledge(narrowKnowledgeReader)
    expect(result.entries).toEqual([{
      id: 'deploy-pipeline',
      status: 'stable',
      type: 'how-it-works',
      title: 'Deploy pipeline',
      aliases: ['Deploy pipeline'],
      sources: [],
      tags: [],
      body: 'Starts at [[staging-gate]].',
      links: ['staging-gate'],
    }])
    expect(result.failures).toEqual([listFailure])
  })
})

describe('knowledge retrieval (service + digest tree)', () => {
  const boot = memoryPool('assistant-knowledge-retrieval-')

  it('searches, reads with backlinks, and keeps drafts readable by id but hidden from search', async () => {
    const { service } = boot()
    const knowledgeDir = service.paths.knowledgeDir
    mkdirSync(knowledgeDir, { recursive: true })
    const write = (id: string, frontmatter: string[], body: string): void => {
      writeFileSync(join(knowledgeDir, `${id}.md`), ['---', ...frontmatter, '---', '', body, ''].join('\n'), 'utf8')
    }
    write('deploy-pipeline', ['type: how-it-works', 'title: Deploy pipeline', 'status: stable', 'sources:', '  - resource: repo'], 'Begins at [[staging-gate]].')
    write('staging-gate', ['type: concept', 'title: Staging gate', 'status: stable', 'sources:', '  - resource: repo'], 'The gate every deploy passes.')
    write('scratch-draft', ['type: concept', 'status: draft'], 'Half-written thoughts about deploy.')

    const hits = await service.searchKnowledge({ text: 'deploy' })
    expect(hits.map(hit => hit.page.id)).toEqual(['deploy-pipeline', 'staging-gate'])

    const read = await service.readKnowledgePage('staging-gate')
    expect(read?.page.title).toBe('Staging gate')
    expect(read?.backlinks).toEqual(['deploy-pipeline'])

    const draft = await service.readKnowledgePage('scratch-draft')
    expect(draft?.page.status).toBe('draft')
    await expect(service.readKnowledgePage('missing-page')).resolves.toBeUndefined()
  })

  it('renders the stable-page signpost tree inside the digest budget', () => {
    const result = renderDigest({
      statusBlurb: 'status',
      memories: [],
      threads: [],
      pages: [
        page({ id: 'beta-page', title: 'Beta', description: 'second concept' }),
        page({ id: 'alpha-page', title: 'Alpha', description: 'first concept' }),
        page({ id: 'gone-page', status: 'deprecated', title: 'Gone' }),
        page({ id: 'draft-page', status: 'draft', title: 'Draft' }),
      ],
      maxBytes: 4096,
    })
    expect(result.text).toContain('## Knowledge (2 pages)')
    expect(result.text).toContain('Alpha — first concept (alpha-page)')
    // Stable pages in id order; deprecated and draft pages stay off the signpost tree.
    expect(result.text.indexOf('alpha-page')).toBeLessThan(result.text.indexOf('beta-page'))
    expect(result.text).not.toContain('gone-page')
    expect(result.text).not.toContain('draft-page')
  })
})
