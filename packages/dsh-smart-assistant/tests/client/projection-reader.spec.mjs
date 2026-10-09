/** Network is external; real pinned snapshot store drives generation and publication. No DOM. */
import { describe, expect, it } from 'vitest'
import { createSnapshotStore } from '../../../../vendor/dsh/packages/client/store/src/index.ts'
import { createProjectionReader } from '../../src/client/projection-reader.ts'

function fixture() {
  const generation = createSnapshotStore(undefined)
  const state = createSnapshotStore(undefined)
  const snapshot = createSnapshotStore({ status: 'disconnected' })
  const requests = []
  const fetch = (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }))
  const reader = createProjectionReader({ generation, state }, snapshot, {
    baseURI: 'http://localhost:3080/mount/', origin: 'http://localhost:3080', fetch,
  })
  return { generation, state, snapshot, requests, reader }
}
const flush = async () => { await new Promise(resolve => setImmediate(resolve)) }

describe('Web projection reader', () => {
  it.each(['dispose', 'refresh'])('does not start an obsolete Fetch after synchronous loading subscriber calls %s', action => {
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
    if (action === 'refresh') expect(f.requests[0].options.signal.aborted).toBe(false)
    off()
    f.reader.dispose()
  })

  it('retains stale last success on authentication failure and recovers on explicit reread', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.requests[0].resolve(new Response('{"revision":1}'))
    await flush()
    f.reader.refresh()
    f.requests[1].resolve(new Response('', { status: 401 }))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'error', error: 'authentication-required', data: { revision: 1 }, stale: true })
    f.reader.refresh()
    f.requests[2].resolve(new Response('{"revision":2}'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: { revision: 2 } })
    f.reader.dispose()
  })

  it('cancels replaced refreshes within one generation and ignores their late errors', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.reader.refresh()
    expect(f.requests[0].options.signal.aborted).toBe(true)
    f.requests[1].resolve(new Response('{"revision":2}'))
    await flush()
    f.requests[0].reject(new Error('obsolete failure'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: { revision: 2 } })
    f.reader.dispose()
  })

  it.each([[404, 'missing', undefined], [401, 'error', 'authentication-required'], [403, 'error', 'download-forbidden'], [422, 'error', 'projection-invalid'], [500, 'error', 'download-failed']])('separates HTTP %s from successful data', async (status, expectedStatus, error) => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.requests[0].resolve(new Response('{"error":"server detail"}', { status }))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual(error ? { status: expectedStatus, error } : { status: expectedStatus })
    f.reader.dispose()
  })
  it('does not publish malformed JSON or accept a cross-origin document base', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.requests[0].resolve(new Response('{broken'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'error', error: 'projection-invalid' })
    f.reader.dispose()
    expect(() => createProjectionReader({ generation: f.generation, state: f.state }, f.snapshot, { baseURI: 'https://foreign.example/', origin: 'http://localhost:3080', fetch: globalThis.fetch })).toThrow('same-origin')
  })

  it('preserves last success as stale on loss and rejects late success/errors after replacement or disposal', async () => {
    const f = fixture()
    f.generation.set({ id: 1 })
    f.state.set('connected')
    f.requests[0].resolve(new Response('{"revision":1}'))
    await flush()
    f.reader.refresh()
    f.generation.set(undefined)
    f.state.set('connecting')
    expect(f.requests[1].options.signal.aborted).toBe(true)
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'disconnected', data: { revision: 1 }, stale: true })
    f.generation.set({ id: 2 })
    f.state.set('connected')
    expect(f.requests).toHaveLength(3)
    f.requests[2].resolve(new Response('{"revision":2}'))
    await flush()
    f.requests[1].resolve(new Response('{"revision":0}'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: { revision: 2 } })
    f.reader.refresh()
    f.reader.dispose()
    const afterDispose = f.snapshot.getSnapshot()
    f.requests[3].reject(new Error('late error'))
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
    expect(String(f.requests[0].url)).toBe('http://localhost:3080/mount/api/assistant/desk-projection')
    expect(f.requests[0].options).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error' })
    f.requests[0].resolve(new Response('{"fixture":true}'))
    await flush()
    expect(f.snapshot.getSnapshot()).toEqual({ status: 'ready', data: { fixture: true } })
    f.reader.dispose()
  })
})
