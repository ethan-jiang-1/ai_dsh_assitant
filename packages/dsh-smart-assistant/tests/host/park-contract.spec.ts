import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'

/**
 * The park contract (I11): a parked thread stays in the active `research/` room — digest
 * visibility is a render concern, not a location concern. Only a closed thread (dropped or
 * promoted) is archived. Found live (campaign step C, 2026-09-24): park archived the file,
 * which also broke the later drop. This is the regression test.
 */
describe('park keeps the thread in the active room', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function boot(): AssistantMemory {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-park-'))
    dirs.push(dir)
    return new AssistantMemory(new Context(), { dataDir: dir })
  }

  it('parks without archiving, and the parked thread can still be dropped', async () => {
    const service = boot()
    const thread = await service.openThread({
      question: 'park roundtrip contract',
      why: 'the campaign found park archiving the file',
      source: 'live-verification-campaign step C',
    })

    await service.parkThread(thread.id)

    // Still in the active room, counted as parked, not archived.
    const listing = await service.listThreads()
    expect(listing.entries.map(entry => entry.id)).toContain(thread.id)
    expect(listing.entries.find(entry => entry.id === thread.id)?.status).toBe('parked')
    expect(listing.archived).toHaveLength(0)

    // The digest does not list it as an open thread, but counts it as parked.
    const digest = await service.digest()
    expect(digest.openThreads).toBe(0)
    expect(digest.parkedThreads).toBe(1)

    // A parked thread still has its exit: drop with a reason works.
    const dropped = await service.dropThread(thread.id, 'test complete')
    expect(dropped.status).toBe('dropped')
    const after = await service.listThreads()
    expect(after.entries).toHaveLength(0)
    expect(after.archived.find(entry => entry.id === thread.id)?.status).toBe('dropped')
  })
})
