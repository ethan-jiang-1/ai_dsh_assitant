/**
 * The knowledge-room curation check (tri-line proposal 2026-09-24, phase 2 slice 2c): broken-link
 * tiers per the settled OKF semantics (unwritten=info, deprecated-cited=warn, ambiguous=error),
 * plus orphans, due stale_after stamps, aging drafts, and stable pages without sources.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'
import { curateKnowledge } from '../../src/domain/knowledge/health.ts'
import type { KnowledgePage } from '../../src/domain/knowledge/page.ts'

const NOW = new Date('2026-09-24T00:00:00.000Z')

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

function codes(pages: readonly KnowledgePage[]): string[] {
  return curateKnowledge({ pages, failures: [], now: NOW, staleResearchDays: 30 })
    .map(finding => finding.code)
}

describe('knowledge source integrity', () => {
  it('reports a memory/research source pointer that no longer resolves', () => {
    const findings = curateKnowledge({
      now: NOW,
      staleResearchDays: 30,
      failures: [],
      knownSourceIds: new Set(['memory:kept']),
      pages: [
        page({
          id: 'proof',
          sources: [{ resource: 'memory:gone' }, { resource: 'research:gone' }, { resource: 'memory:kept' }, { resource: 'https://example.com' }],
          body: 'claims',
        }),
      ],
    })
    const missing = findings.filter(finding => finding.code === 'page-source-missing')
    expect(missing.map(finding => finding.refs?.[1])).toEqual(['memory:gone', 'research:gone'])
  })

  it('stays quiet when no source set is supplied or every source resolves', () => {
    const one = page({ id: 'proof', sources: [{ resource: 'memory:gone' }], body: 'claims' })
    expect(codes([one])).not.toContain('page-source-missing')
    const known = curateKnowledge({
      now: NOW,
      staleResearchDays: 30,
      failures: [],
      knownSourceIds: new Set(['memory:gone']),
      pages: [one],
    })
    expect(known.map(finding => finding.code)).not.toContain('page-source-missing')
  })
})

describe('curateKnowledge (pure graph check)', () => {
  it('tiers broken links the settled way: unwritten=info, deprecated-cited=warn, ambiguous=error', () => {
    const findings = curateKnowledge({
      now: NOW,
      staleResearchDays: 30,
      failures: [],
      pages: [
        page({ id: 'hub', body: 'see [[unwritten]] and [[old-thing]] and [[shared name]]', links: ['unwritten', 'old-thing', 'shared name'] }),
        page({ id: 'old-thing', status: 'deprecated', body: 'retired but still linked', links: [] }),
        page({ id: 'one', title: 'Shared Name', body: '', links: [] }),
        page({ id: 'two', title: 'Shared Name', body: '', links: [] }),
      ],
    })

    const byCode = new Map(findings.map(finding => [finding.code, finding]))
    expect(byCode.get('page-link-unwritten')?.severity).toBe('info')
    expect(byCode.get('page-link-deprecated')?.severity).toBe('warn')
    const ambiguous = byCode.get('page-link-ambiguous')
    expect(ambiguous?.severity).toBe('error')
    expect(ambiguous?.refs).toEqual(['hub', 'one', 'two'])
  })

  it('reports orphans, due stale_after, aging drafts, and sourceless stable pages', () => {
    const found = codes([
      page({ id: 'island', body: 'no links in or out' }),
      page({ id: 'due', staleAfter: '2026-09-01T00:00:00.000Z', body: 'links [[hub]]', links: ['hub'] }),
      page({ id: 'hub', body: 'links [[due]]', links: ['due'] }),
      page({ id: 'old-draft', status: 'draft', sources: [], generated: { by: 'process:x', at: '2026-08-01T00:00:00.000Z' }, body: 'waiting too long' }),
      page({ id: 'unproven', sources: [], body: 'no provenance', links: ['hub'] }),
    ])

    expect(found).toContain('page-orphan')
    expect(found).toContain('page-stale')
    expect(found).toContain('page-draft-stale')
    expect(found).toContain('page-unproven')
    // The draft has no inbound or outbound links, but drafts are not orphan candidates.
    expect(found.filter(code => code === 'page-orphan')).toHaveLength(1)
  })

  it('reports unreadable knowledge files as errors — silent graph loss', () => {
    const findings = curateKnowledge({
      now: NOW,
      staleResearchDays: 30,
      failures: [{ path: '/h/knowledge/broken.md', reason: 'no frontmatter' }],
      pages: [],
    })
    expect(findings[0]?.code).toBe('page-unreadable')
    expect(findings[0]?.severity).toBe('error')
  })
})

describe('knowledge curation (service plumbing)', () => {
  const boot = memoryPool('assistant-knowledge-')

  it('reads the room through the service and merges findings into the curate brief', async () => {
    const { service } = boot()
    const knowledgeDir = service.paths.knowledgeDir
    mkdirSync(knowledgeDir, { recursive: true })
    writeFileSync(join(knowledgeDir, 'deploy-pipeline.md'), [
      '---',
      'type: how-it-works',
      'status: stable',
      'sources:',
      '  - resource: notes/proposed/x.md',
      '---',
      '',
      'Starts at [[staging-gate]].',
      '',
    ].join('\n'), 'utf8')

    const listing = await service.listKnowledge()
    expect(listing.entries.map(item => item.id)).toEqual(['deploy-pipeline'])

    const brief = await service.curate()
    expect(brief.counts.knowledgePages).toBe(1)
    expect(brief.findings.map(finding => finding.code)).toContain('page-link-unwritten')
  })
})
