/**
 * Layer: agent (prompt-section contract). The mechanism under test — the constructor
 * chaining the first rendering — lives in the host service (src/host/index.ts); service-plane
 * behaviour has its own contracts in tests/host/.
 * Cold-start digest prewarm (2026-09-25, campaign slice: found live by the baseline probe).
 *
 * A one-shot session has exactly one request, so the digest section must already be warm when
 * the first prompt assembles — the constructor chains the first rendering after the home
 * scaffold instead of waiting for a write or a curate call. The vendor's section contract is
 * synchronous, so "wait for the refresh" is not an option the section itself can offer.
 *
 * The red case: before this slice, a fresh service on an existing home returned only the status
 * blurb forever (no writes would ever arrive on that instance), and every fresh session's first
 * request shipped 271 bytes where ~1530 belonged.
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import { dirPool } from '../support/host-harness.ts'

describe('digest prewarm (service)', () => {
  // Construction itself is the mechanism under test, so the pool stops at the directory:
  // bootIn stays local — an implicit service from a pool would warm the digest and mask it.
  const mkDir = dirPool('assistant-prewarm-')

  function bootIn(dir: string): AssistantMemory {
    return new AssistantMemory(new Context(), { dataDir: dir })
  }

  it('warms the digest at construction without any write or curate call on the instance', async () => {
    // Seed the home through a first service instance, then boot a second one on the same
    // directory: its cache starts cold, and nothing on this instance would trigger a refresh.
    const dir = mkDir()
    const seeder = bootIn(dir)
    await seeder.saveMemory({ text: 'prewarm probe claim', importance: 5 })

    const service = bootIn(dir)
    await vi.waitFor(() => {
      expect(service.digestSnapshot()).toContain('prewarm probe claim')
    })
  })

  it('keeps the digest warm after a write without an intervening curate', async () => {
    const dir = mkDir()
    const service = bootIn(dir)
    await service.saveMemory({ text: 'first claim stays warm', importance: 5 })
    await vi.waitFor(() => {
      expect(service.digestSnapshot()).toContain('first claim stays warm')
    })

    await service.saveMemory({ text: 'second claim arrives after touch', importance: 4 })
    await vi.waitFor(() => {
      expect(service.digestSnapshot()).toContain('second claim arrives after touch')
    })
  })

  it('awaits the cordis init hook: the loader-await is the warm guarantee, no polling', async () => {
    // Seed through a first instance, then boot a second one on the same directory and await the
    // lifecycle hook the plugin loader awaits — after that the digest is warm deterministically.
    const dir = mkDir()
    const seeder = bootIn(dir)
    await seeder.saveMemory({ text: 'init hook warms deterministically', importance: 5 })

    const service = bootIn(dir)
    await service[Service.init]()
    expect(service.digestSnapshot()).toContain('init hook warms deterministically')
  })
})
