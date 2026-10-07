/**
 * The bulk-import write path: an explicit id makes re-import update the same page instead of
 * minting a second one (the generated form carries a random suffix), and the provenance stamp names
 * the caller that actually wrote it. Both are what makes an imported corpus governable.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('writePage with an explicit id', () => {
  it('keeps the id across re-imports, so a second run updates instead of duplicating', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-write-'))
    dirs.push(dir)
    const service = new AssistantMemory(new Context(), { dataDir: dir })
    const page = {
      id: 'source-q3-sales-review-4afaab80',
      type: 'source',
      title: 'Q3 Sales Review',
      body: 'Revenue fell 20%.',
      sources: ['docs/q3.md'],
      tags: ['imported'],
      generatedBy: 'process:import-knowledge',
    }
    const first = await service.writePage(page)
    const second = await service.writePage({ ...page, body: 'Revenue fell 20% (revised).' })

    expect(first.id).toBe(page.id)
    expect(second.id).toBe(page.id)
    expect(readdirSync(join(dir, 'knowledge'))).toEqual([`${page.id}.md`])
    const text = readFileSync(join(dir, 'knowledge', `${page.id}.md`), 'utf8')
    expect(text).toContain('by: process:import-knowledge')
    expect(text).toContain('status: draft')
    expect(text).toContain('docs/q3.md')
  })

  it('re-imports update content without rolling an approved page back to draft', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-write-'))
    dirs.push(dir)
    const service = new AssistantMemory(new Context(), { dataDir: dir })
    const page = {
      id: 'source-q4-margin-review-8ba0be12',
      type: 'source',
      title: 'Q4 Margin Review',
      body: 'Margin held flat.',
      sources: ['docs/q4.md'],
      tags: ['imported'],
      generatedBy: 'process:import-knowledge',
    }
    await service.writePage(page)
    // The principal approved it: the hand flip of status is the approval.
    const pagePath = join(dir, 'knowledge', `${page.id}.md`)
    writeFileSync(pagePath, readFileSync(pagePath, 'utf8').replace('status: draft', 'status: stable'), 'utf8')

    // BUG-005 F10 (2026-10-07): the re-import used to rewrite the whole file with
    // `status: draft` — a mechanical content refresh silently undoing the approval.
    await service.writePage({ ...page, body: 'Margin held flat (approved revision).' })

    const text = readFileSync(pagePath, 'utf8')
    expect(text).toContain('status: stable')
    expect(text).toContain('Margin held flat (approved revision).')
    expect((await service.readKnowledgePage(page.id))?.page.status).toBe('stable')
  })
})
