/**
 * The bulk-import write path: an explicit id makes re-import update the same page instead of
 * minting a second one (the generated form carries a random suffix), and the provenance stamp names
 * the caller that actually wrote it. Both are what makes an imported corpus governable.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
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
})
