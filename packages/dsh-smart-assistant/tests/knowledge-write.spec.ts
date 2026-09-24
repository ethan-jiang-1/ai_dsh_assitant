/**
 * The knowledge write path and its bridges (tri-line proposal 2026-09-24, phase 2 slice 2e):
 * `save_page` distills a DRAFT page (staged out of recall until a hand edit flips it to stable —
 * the edit is the review), research `promote` accepts a knowledge page as its destination, and
 * the memory↔knowledge bridge is two provenance conventions over existing verbs.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../src/index.ts'

describe('writePage (staged draft write path)', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function boot(): AssistantMemory {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-page-write-'))
    dirs.push(dir)
    return new AssistantMemory(new Context(), { dataDir: dir })
  }

  it('writes a draft with provenance stamps, out of search until reviewed by hand', async () => {
    const service = boot()
    const written = await service.writePage({
      type: 'how-it-works',
      title: 'Deploy pipeline',
      description: 'how deploys reach production',
      body: 'Begins at [[staging-gate]].',
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

  it('requires a body, a type, and at least one source', async () => {
    const service = boot()
    await expect(service.writePage({ type: 'concept', body: 'text', sources: [] }))
      .rejects.toThrow('requires sources')
    await expect(service.writePage({ type: 'concept', body: '', sources: ['x'] }))
      .rejects.toThrow('requires a body')
    await expect(service.writePage({ type: '', body: 'text', sources: ['x'] }))
      .rejects.toThrow('requires a type')
  })

  it('audits credentials on pages the same as on skills', async () => {
    const service = boot()
    const written = await service.writePage({
      type: 'source',
      body: 'the key was sk-abcdefghijklmnopqrstuvwx',
      sources: ['some-log'],
    })
    expect(written.findings.map(finding => finding.code)).toEqual(['skill-credential-leak'])
  })
})

describe('research promote into knowledge', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  it('accepts a knowledge page as the destination, and rejects unknown ones', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-page-promote-'))
    dirs.push(dir)
    const service = new AssistantMemory(new Context(), { dataDir: dir })
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
    const dir = mkdtempSync(join(tmpdir(), 'assistant-page-pin-'))
    dirs.push(dir)
    const service = new AssistantMemory(new Context(), { dataDir: dir })
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
