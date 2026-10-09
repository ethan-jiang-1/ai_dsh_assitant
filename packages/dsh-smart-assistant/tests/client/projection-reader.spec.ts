/** Network is external; real pinned snapshot store drives generation and publication. No DOM. */
import { describe, expect, it } from 'vitest'
// Platform-composition seam consumes pinned built store/declarations (build prerequisite).
import { createSnapshotStore } from '../../../../vendor/dsh/packages/client/store/lib/types/index.js'
import { createProjectionReader } from '../../src/client/projection-reader.ts'
import { parseOperatingProjection } from '../../src/client/operating-projection.ts'
import type { ProjectionDownload } from '../../src/client/projection-reader.ts'

const projection = (revision: number) => ({ schemaVersion: 1 as const, ledgerId: 'ledger-a', revision, matters: [] })

function fixture() {
  const generation = createSnapshotStore<{ readonly id: number } | undefined>(undefined)
  const state = createSnapshotStore<'connected' | 'connecting' | 'disconnected' | undefined>(undefined)
  const snapshot = createSnapshotStore<ProjectionDownload>({ status: 'disconnected' })
  const requests: { url: string | URL | Request; options: RequestInit; resolve: (response: Response) => void; reject: (error: Error) => void }[] = []
  const fetch: typeof globalThis.fetch = (url, options) => new Promise<Response>((resolve, reject) => { requests.push({ url, options: options ?? {}, resolve, reject }) })
  const reader = createProjectionReader({ generation, state }, snapshot, {
    baseURI: 'http://localhost:3080/mount/', origin: 'http://localhost:3080', fetch,
  })
  const request = (index: number) => {
    const captured = requests[index]
    if (captured === undefined) throw new Error(`missing captured request ${String(index)}`)
    return captured
  }
  return { generation, state, snapshot, requests, request, reader }
}
const flush = async () => { await new Promise<void>(resolve => setImmediate(() => { resolve(undefined) })) }

describe('Web projection reader', () => {
  it('keeps last valid projection stale when valid JSON fails the operating schema', async () => {
    const f = fixture()
    const valid = { schemaVersion: 1, ledgerId: 'ledger-a', revision: 1, matters: [] }
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.request(0).resolve(new Response(JSON.stringify(valid)))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: parseOperatingProjection(valid) })
    f.reader.refresh()
    f.request(1).resolve(new Response('{"revision":2}'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'error', error: 'projection-invalid', data: parseOperatingProjection(valid), stale: true })
    f.reader.dispose()
  })

  it.each(['dispose', 'refresh'] as const)('does not start an obsolete Fetch after synchronous loading subscriber calls %s', action => {
    const f = fixture()
    let handled = false
    const off = f.snapshot.subscribe(() => {
      if (handled || f.snapshot.getSnapshot().status !== 'loading') return
      handled = true
      f.reader[action]()
    })
    f.generation.set({ id: 1 })
    f.state.set('connected')
    expect(f.requests).toHaveLength(action === 'dispose' ? 0 : 1)
    if (action === 'refresh') expect(f.request(0).options.signal?.aborted).toBe(false)
    off()
    f.reader.dispose()
  })

  it('retains stale last success on authentication failure and recovers on explicit reread', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.request(0).resolve(new Response(JSON.stringify(projection(1))))
    await flush()
    f.reader.refresh()
    f.request(1).resolve(new Response('', { status: 401 }))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'error', error: 'authentication-required', data: parseOperatingProjection(projection(1)), stale: true })
    f.reader.refresh()
    f.request(2).resolve(new Response(JSON.stringify(projection(2))))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: parseOperatingProjection(projection(2)) })
    f.reader.dispose()
  })

  it('cancels replaced refreshes within one generation and ignores their late errors', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.reader.refresh()
    expect(f.request(0).options.signal?.aborted).toBe(true)
    f.request(1).resolve(new Response(JSON.stringify(projection(2))))
    await flush()
    f.request(0).reject(new Error('obsolete failure'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: parseOperatingProjection(projection(2)) })
    f.reader.dispose()
  })

  it.each([[404, 'missing', undefined], [401, 'error', 'authentication-required'], [403, 'error', 'download-forbidden'], [422, 'error', 'projection-invalid'], [500, 'error', 'download-failed']])('separates HTTP %s from successful data', async (status, expectedStatus, error) => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.request(0).resolve(new Response('{"error":"server detail"}', { status }))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual(error ? { status: expectedStatus, error } : { status: expectedStatus })
    f.reader.dispose()
  })
  it('does not publish malformed JSON or accept a cross-origin document base', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.request(0).resolve(new Response('{broken'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'error', error: 'projection-invalid' })
    f.reader.dispose()
    expect(() => createProjectionReader({ generation: f.generation, state: f.state }, f.snapshot, { baseURI: 'https://foreign.example/', origin: 'http://localhost:3080', fetch: globalThis.fetch })).toThrow('same-origin')
  })

  it('preserves last success as stale on loss and rejects late success/errors after replacement or disposal', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.request(0).resolve(new Response(JSON.stringify(projection(1))))
    await flush()
    f.reader.refresh()
    f.generation.set(undefined)
    f.state.set('connecting')
    expect(f.request(1).options.signal?.aborted).toBe(true)
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'disconnected', data: parseOperatingProjection(projection(1)), stale: true })
    f.generation.set({ id: 2 })
    f.state.set('connected')
    expect(f.requests).toHaveLength(3)
    f.request(2).resolve(new Response(JSON.stringify(projection(2))))
    await flush()
    f.request(1).resolve(new Response(JSON.stringify(projection(0))))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: parseOperatingProjection(projection(2)) })
    f.reader.refresh()
    f.reader.dispose()
    const afterDispose = f.snapshot.getSnapshot()
    f.request(3).reject(new Error('late error'))
    await flush()
    expect(f.snapshot.getSnapshot()).toBe(afterDispose)
    f.generation.set({ id: 3 })
    expect(f.requests).toHaveLength(4)
  })

  it('reads mount-relative with cookies once per ready generation and publishes a JSON download', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    expect(f.requests).toHaveLength(1)
    expect(String(f.request(0).url)).toBe('http://localhost:3080/mount/api/assistant/desk-projection')
    expect(f.request(0).options).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error' })
    f.request(0).resolve(new Response(JSON.stringify(projection(7))))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: parseOperatingProjection(projection(7)) })
    f.reader.dispose()
  })
})
