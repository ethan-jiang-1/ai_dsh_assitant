/** Real Cordis fiber and pinned snapshot store: apply-owned reader cancels and detaches on unload. */
import { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { describe, expect, it, vi } from 'vitest'
import { mountProjectionReader } from '../../src/client/projection/projection-lifecycle'
import type { ProjectionDownload } from '../../src/client/projection/projection-reader'

describe('projection reader apply lifecycle', () => {
  it('cancels on fiber disposal and remount reads independently without old listeners', async () => {
    const root = new Context()
    const generation = createSnapshotStore<{ id: number } | undefined>({ id: 1 })
    const state = createSnapshotStore<'connected' | 'connecting' | 'disconnected' | undefined>('connected')
    const signals: AbortSignal[] = []
    const fetch: typeof globalThis.fetch = vi.fn((_url, options) => {
      if (options?.signal) signals.push(options.signal)
      return new Promise<Response>(() => {})
    })
    const mount = async () => {
      const fork = root.plugin((ctx: Context) => {
        mountProjectionReader(ctx, { generation, state }, createSnapshotStore<ProjectionDownload>({ status: 'disconnected' }), { baseURI: 'http://localhost/mount/', origin: 'http://localhost', fetch })
      })
      return fork
    }
    try {
      const first = await mount()
      expect(fetch).toHaveBeenCalledTimes(1)
      await first.dispose()
      expect(signals[0]?.aborted).toBe(true)
      generation.set({ id: 2 })
      expect(fetch).toHaveBeenCalledTimes(1)
      const second = await mount()
      expect(fetch).toHaveBeenCalledTimes(2)
      generation.set({ id: 3 })
      expect(fetch).toHaveBeenCalledTimes(3)
      await second.dispose()
      // Disposal cancels the read still on the wire; the middle one was superseded by the
      // generation change and is left to settle (late results are ignored — reader spec).
      expect(signals.at(-1)?.aborted).toBe(true)
      expect(signals[1]?.aborted).toBe(false)
    } finally { await root.fiber.dispose() }
  })
})
