/**
 * The knowledge write path and its bridges (tri-line proposal 2026-09-24, phase 2 slice 2e):
 * `save_page` distills a DRAFT page (staged out of recall until the principal approves it; the
 * approval is theirs, `promotePage` only performs the edit they asked for), research `promote`
 * accepts a knowledge page as its destination, and the memory↔knowledge bridge is two provenance
 * conventions over existing verbs.
 */

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'

describe('writePage (staged draft write path)', () => {
  const boot = memoryPool('assistant-page-write-')

  it('writes a draft with provenance stamps, out of search until reviewed by hand', async () => {
    const { service } = boot()
    const written = await service.writePage({
      type: 'how-it-works',
      title: 'Deploy pipeline',
      description: 'how deploys reach production',
      body: 'Begins at [[staging-gate]].',
      // A real id that has since been archived (dropped 2026-09-25): sources are provenance
      // strings, stored and read back verbatim — the service does not check the target exists.
      sources: ['research:20260924-note-zt0j'],
      tags: ['deploy'],
    })

    expect(written.id).toMatch(/^2026\d{4}-deploy-pipeline-[a-z0-9]{4}$/)
    expect(written.findings).toEqual([])

    // Draft: readable by id, invisible to search and the digest tree.
    const read = await service.readKnowledgePage(written.id)
    expect(read?.page.status).toBe('draft')
    expect(read?.page.generated?.by).toBe('process:assistant-reflect')
    expect(read?.page.sources[0]?.resource).toBe('research:20260924-note-zt0j')
    expect((await service.searchKnowledge({ text: 'deploy' }))).toEqual([])
    expect((await service.digest()).text).not.toContain('deploy')

    // The hand review: flipping status in the file is the approval gate.
    const path = join(service.paths.knowledgeDir, `${written.id}.md`)
    const text = (await import('node:fs')).readFileSync(path, 'utf8')
    ;(await import('node:fs')).writeFileSync(path, text.replace('status: draft', 'status: stable'), 'utf8')
    const hits = await service.searchKnowledge({ text: 'deploy' })
    expect(hits.map(hit => hit.page.id)).toEqual([written.id])
    expect((await service.digest()).text).toContain(written.id)
  })

  it('promotePage flips one draft to stable, idempotently, and fails loudly on an unknown id', async () => {
    const { service } = boot()
    const written = await service.writePage({
      type: 'how-it-works',
      title: 'Promotion path',
      body: 'Promoted on the principal word alone.',
      sources: ['probe'],
    })
    expect((await service.readKnowledgePage(written.id))?.page.status).toBe('draft')
    expect(await service.searchKnowledge({ text: 'Promotion path' })).toEqual([])

    const promoted = await service.promotePage(written.id)
    expect(promoted.status).toBe('stable')
    expect((await service.readKnowledgePage(written.id))?.page.status).toBe('stable')
    expect((await service.searchKnowledge({ text: 'Promotion path' })).map(hit => hit.page.id))
      .toEqual([written.id])

    // Promoting an already-stable page is a no-op, not an error: the panel's approve button may
    // be clicked twice, and a second click must not fail the turn.
    await expect(service.promotePage(written.id)).resolves.toMatchObject({ status: 'stable' })
    // An unknown id is a loud failure rather than a silent success.
    await expect(service.promotePage('no-such-page-0000')).rejects.toThrow(/no knowledge page/)
  })

  it('deprecatePage keeps the page in place and out of current knowledge', async () => {
    const { service } = boot()
    const written = await service.writePage({
      type: 'concept',
      title: 'Retired concept',
      body: 'Superseded, but links still point here.',
      sources: ['probe'],
    })
    await service.promotePage(written.id)

    const deprecated = await service.deprecatePage(written.id)
    expect(deprecated.status).toBe('deprecated')
    const read = await service.readKnowledgePage(written.id)
    expect(read?.page.status).toBe('deprecated')
    // Deprecated pages stay readable by id so inbound links resolve.
    expect(read?.page.body).toContain('Superseded')
    // Idempotent, and an unknown id still fails loudly.
    await expect(service.deprecatePage(written.id)).resolves.toMatchObject({ status: 'deprecated' })
    await expect(service.deprecatePage('no-such-page-0000')).rejects.toThrow(/no knowledge page/)
  })

  it('normalizes links into the form Obsidian also clicks, and mirrors the title into aliases', async () => {
    const { service } = boot()
    const first = await service.writePage({ type: 'concept', title: 'Staging Gate', body: 'the gate', sources: ['repo'] })
    const second = await service.writePage({
      type: 'how-it-works',
      title: 'Deploy pipeline',
      body: 'Begins at [[Staging Gate]], and [[Some Unwritten Page]] stays as written.',
      sources: ['repo'],
    })

    const read = await service.readKnowledgePage(second.id)
    expect(read?.page.body).toContain(`[[${first.id}|Staging Gate]]`)
    expect(read?.page.body).toContain('[[Some Unwritten Page]]')
    // Backlinks work off the normalized target, so the graph is intact on our side too.
    expect(read?.page.links).toEqual([first.id, 'Some Unwritten Page'])
    expect((await service.readKnowledgePage(first.id))?.backlinks).toEqual([second.id])

    // On disk: the id-form link plus the alias list Obsidian's autocomplete reads.
    const text = (await import('node:fs')).readFileSync(join(service.paths.knowledgeDir, `${second.id}.md`), 'utf8')
    expect(text).toContain(`[[${first.id}|Staging Gate]]`)
    expect(text).toContain('aliases:\n  - Deploy pipeline')
  })

  it('requires a body, a type, and at least one source', async () => {
    const { service } = boot()
    await expect(service.writePage({ type: 'concept', body: 'text', sources: [] }))
      .rejects.toThrow('requires sources')
    await expect(service.writePage({ type: 'concept', body: '', sources: ['x'] }))
      .rejects.toThrow('requires a body')
    await expect(service.writePage({ type: '', body: 'text', sources: ['x'] }))
      .rejects.toThrow('requires a type')
  })

  it('audits credentials on pages the same as on skills', async () => {
    const { service } = boot()
    const written = await service.writePage({
      type: 'source',
      body: 'the key was sk-abcdefghijklmnopqrstuvwx',
      sources: ['some-log'],
    })
    expect(written.findings.map(finding => finding.code)).toEqual(['skill-credential-leak'])
  })
})

describe('research promote into knowledge', () => {
  const bootPromote = memoryPool('assistant-page-promote-')
  const bootPin = memoryPool('assistant-page-pin-')

  it('accepts a knowledge page as the destination, and rejects unknown ones', async () => {
    const { service } = bootPromote()
    const thread = await service.openThread({
      question: 'how should deploys work?',
      why: 'the pipeline keeps surprising people',
    })
    const page = await service.writePage({
      type: 'how-it-works',
      title: 'Deploy pipeline',
      body: 'Gate first.',
      sources: [`research:${thread.id}`],
    })
    const promoted = await service.promoteThread(thread.id, { promotedTo: page.id })
    expect(promoted.status).toBe('promoted')
    expect(promoted.promotedTo).toBe(page.id)

    const other = await service.openThread({ question: 'another?', why: 'checking rejection' })
    await expect(service.promoteThread(other.id, { promotedTo: 'no-such-page' }))
      .rejects.toThrow('neither a memory record, a learned skill, nor a knowledge page')
  })

  it('pins a page into memory as a plain save with provenance (the bridge convention)', async () => {
    const { service } = bootPin()
    mkdirSync(service.paths.knowledgeDir, { recursive: true })
    const page = await service.writePage({ type: 'concept', title: 'Staging', body: 'gate', sources: ['repo'] })
    // knowledge_pin is a convention, not a verb: save with source=knowledge:<id> links both rooms.
    const pinned = await service.saveMemory({
      text: 'Deploys must pass the staging gate before production.',
      kind: 'fact',
      source: `knowledge:${page.id}`,
    })
    expect(pinned.source).toBe(`knowledge:${page.id}`)
    const recall = await service.recall({ query: 'staging' })
    expect(recall.some(hit => hit.record.id === pinned.id)).toBe(true)
  })
})

describe('knowledge write wiring', () => {
  const boot = memoryPool('assistant-knowledge-wiring-')

  it('passes the raw entry text to Room.write when promoting', async () => {
    const { service } = boot()
    const written = await service.writePage({ type: 'concept', title: 'CAS page', body: 'body', sources: ['probe'] })
    const entry = await service.knowledge.read(written.id)
    const spy = vi.spyOn(service.knowledge, 'write')
    try {
      await service.promotePage(written.id)
      expect(spy.mock.calls.at(-1)?.[3]).toBe(entry?.text)
    } finally {
      spy.mockRestore()
    }
  })

  it('surfaces a missing memory/research source in the real curate brief', async () => {
    const { service } = boot()
    const written = await service.writePage({
      type: 'concept',
      title: 'Missing source',
      body: 'claims',
      sources: ['memory:missing-record'],
    })
    const brief = await service.curate()
    expect(brief.findings.find(finding => finding.code === 'page-source-missing' && finding.refs?.[0] === written.id))
      .toBeDefined()
  })
})
