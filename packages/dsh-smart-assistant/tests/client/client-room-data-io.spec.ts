/**
 * The room-data I/O paths (`src/client/room-data-io.ts`) after A1a: the panel reads the host
 * `GET /api/assistant/rooms` route (working-folder truth), never `.desk/state.json`.
 *
 * Acceptance points:
 * - A failed route read surfaces as readError wherever the principal is, with a retry (R6).
 * - The apply path keeps the Session-list refresh working in a headless context without `ctx.effect`.
 * - An unowned flat slice serves anyone; the first targeted load claims it (R11 claim path).
 * - Two first loads racing for the unowned flat: only the newest sequence writes (R11 claim race).
 * - One session's load no longer cancels another's in-flight read (per-slice seq).
 * - The walk re-homing carries the previous owner's row state into its own slice (R11).
 *
 * Cross-module note: the fake supplies `ctx.web` (baseURI/origin/fetch), the same shape
 * `bindDeskEnv` captures from `document` in production; no test reaches into the fetch internals.
 */
import { describe, expect, it, vi } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  apply: (ctx: unknown) => void
  loadDeskFor: (sessionId: string) => void
  KnowledgeTabBody: (props: { sessionId?: string }) => unknown
  deskStore: {
    data?: Record<string, unknown> | undefined
    readError?: string | undefined
    note?: string | undefined
    pending?: { rowId: string, at: number, action: string } | undefined
    sourceSession?: string | undefined
  }
  deskSlice: (sessionId?: string) => {
    data?: Record<string, unknown> | undefined
    pending?: { rowId: string, at: number, action: string } | undefined
  }
}

const materialize = (): ClientExports =>
  materializeClient(registration, inertReactShim()) as unknown as ClientExports

/** One rooms response with a known generatedAt; the route shape is the only contract the client needs. */
const rooms = (generatedAt: string): Response => new Response(JSON.stringify({
  schemaVersion: 1,
  generatedAt,
  counts: { memories: 0, threads: 0, skills: 0, knowledgeStable: 0, knowledgeDraft: 0 },
  memories: [],
  research: [],
  skills: [],
  knowledge: [],
}), { headers: { 'content-type': 'application/json' } })

/** Microtask flush for the async read chains (real-timer tests). */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

const makeDeferred = (): { promise: Promise<Response>, resolve: (value: Response) => void } => {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>((r) => { resolve = r })
  return { promise, resolve }
}

/**
 * The fake client ctx. `respond(call)` returns the route's Response in call order; the apply
 * fires `loadDesk` once, so tests that want to control the first read count from 0.
 */
const fakeCtx = (
  respond: (call: number) => Response | Promise<Response>,
  list: { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void },
  withEffect = true,
): unknown => {
  let call = 0
  return {
    remote: {},
    web: {
      baseURI: 'http://localhost:3080/mount/',
      origin: 'http://localhost:3080',
      fetch: async () => respond(call++),
    },
    sessions: { list },
    ...(withEffect ? { effect: (install: () => () => void) => { install() } } : {}),
    slots: { inject: () => {} },
    sidebarRightTabs: { register: () => {} },
  }
}

const inertList = { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => () => {} }

describe('rooms io: the read paths', () => {
  it('turns a failed route read into a visible error with a retry, not an eternal reading state (R6)', async () => {
    const fetch = vi.fn(async (): Promise<Response> => { throw new Error('boom') })
    const exports = materialize()
    exports.apply(fakeCtx(fetch, inertList))
    await flush()
    exports.deskStore.readError = undefined
    exports.deskStore.note = undefined
    exports.loadDeskFor('s1')
    await flush()

    expect(fetch).toHaveBeenCalled()
    expect(exports.deskStore.readError).toContain('读房间数据失败')
    const tab = textsOf(exports.KnowledgeTabBody({ sessionId: 's1' })).join(' | ')
    expect(tab).toContain('读房间数据失败')
    expect(tab).toContain('重读一次')
    expect(tab).not.toContain('正在读')
  })
})

describe('per-session slice mechanics (R11, acceptance round 2026-09-29)', () => {
  it('keeps the headless Session refresh path when the context has no effect owner', async () => {
    vi.useFakeTimers()
    try {
      let snapshot: { ids: string[], byId: Record<string, { updatedAt?: number, cwd?: string }> } = { ids: [], byId: {} }
      const notified: Array<() => void> = []
      const fetch = vi.fn(async () => rooms('2026-09-28T10:00:00+08:00'))
      const list = {
        getSnapshot: () => snapshot,
        subscribe: (notify: () => void) => { notified.push(notify); return () => {} },
      }
      const exports = materialize()
      expect(() => exports.apply(fakeCtx(fetch, list, false))).not.toThrow()

      snapshot = { ids: ['s1'], byId: { s1: { updatedAt: 1, cwd: '.tmp/ws' } } }
      for (const notify of notified) notify()
      await vi.advanceTimersByTimeAsync(4000)

      expect(fetch).toHaveBeenCalled()
      expect(exports.deskStore.sourceSession).toBe('s1')
    } finally {
      vi.useRealTimers()
    }
  })

  it('an unowned flat slice serves anyone; the first targeted load claims it (R11 claim path)', async () => {
    const exports = materialize()
    exports.apply(fakeCtx(() => rooms('2026-09-28T10:00:00+08:00'), inertList))
    await flush()
    expect(exports.deskSlice('s2')).toBe(exports.deskStore)
    exports.loadDeskFor('s1')
    await flush()
    expect(exports.deskStore.sourceSession).toBe('s1')
    expect((exports.deskStore.data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T10:00:00+08:00')
    expect(exports.deskSlice('s2')).not.toBe(exports.deskStore)
  })

  it('two first loads racing for the unowned flat: only the newest sequence writes (R11 claim race)', async () => {
    const exports = materialize()
    const initial = makeDeferred()
    const s1 = makeDeferred()
    const s2 = makeDeferred()
    exports.apply(fakeCtx((call) => call === 0 ? initial.promise : call === 1 ? s1.promise : s2.promise, inertList))
    // Leave the apply-time walk pending: both targeted loads capture the still-unowned flat.
    exports.loadDeskFor('s1')
    exports.loadDeskFor('s2')
    s1.resolve(rooms('2026-09-28T10:00:00+08:00')) // the FIRST fire completes first
    await flush()
    expect(exports.deskStore.sourceSession).toBeUndefined() // stale seq: dropped, no claim, no write
    expect(exports.deskStore.data).toBeUndefined()
    s2.resolve(rooms('2026-09-28T11:00:00+08:00')) // the newest sequence lands and claims
    await flush()
    expect(exports.deskStore.sourceSession).toBe('s2')
    expect((exports.deskStore.data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T11:00:00+08:00')
    initial.resolve(rooms('2026-09-28T09:00:00+08:00')) // the oldest walk is still stale
    await flush()
    expect((exports.deskStore.data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T11:00:00+08:00')
  })

  it("one session's load no longer cancels another's in-flight read (R11 per-slice seq)", async () => {
    const exports = materialize()
    const initial = makeDeferred()
    const s1 = makeDeferred()
    const s2 = makeDeferred()
    exports.apply(fakeCtx((call) => call === 0 ? initial.promise : call === 1 ? s1.promise : s2.promise, inertList))
    exports.deskStore.sourceSession = 's1' // flat owned by s1; s2 reads its own slice
    exports.loadDeskFor('s1')              // in-flight on the primary slice…
    exports.loadDeskFor('s2')              // …a later load for ANOTHER session
    s2.resolve(rooms('2026-09-28T11:00:00+08:00')) // completes first
    await flush()
    expect((exports.deskSlice('s2').data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T11:00:00+08:00')
    expect(exports.deskStore.data).toBeUndefined() // the flat still waits on its own read
    s1.resolve(rooms('2026-09-28T10:00:00+08:00')) // the OLDER fire completes last…
    await flush()
    expect((exports.deskStore.data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T10:00:00+08:00')
    initial.resolve(rooms('2026-09-28T09:00:00+08:00')) // the walk's stale first read must not overwrite
    await flush()
    expect((exports.deskStore.data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T10:00:00+08:00')
  })

  it("carries the previous owner's row state into its own slice when the walk re-homes (R11)", async () => {
    vi.useFakeTimers()
    try {
      const exports = materialize()
      const notified: Array<() => void> = []
      let snapshot: { ids: string[], byId: Record<string, { updatedAt?: number, cwd?: string }> } =
        { ids: ['s1'], byId: { s1: { updatedAt: 10, cwd: '/w1' } } }
      const list = {
        getSnapshot: () => snapshot,
        subscribe: (fn: () => void) => { notified.push(fn); return () => {} },
      }
      const initial = makeDeferred()
      const next = makeDeferred()
      exports.apply(fakeCtx((call) => call === 0 ? initial.promise : next.promise, list))
      initial.resolve(rooms('2026-09-28T10:00:00+08:00'))
      await vi.advanceTimersByTimeAsync(0)
      expect(exports.deskStore.sourceSession).toBe('s1') // the walk answered the newest session
      exports.deskStore.pending = { rowId: 'd1', at: 1, action: '看选项' }
      snapshot = { ids: ['s1', 's2'], byId: { ...snapshot.byId, s2: { updatedAt: 99, cwd: '/w2' } } }
      for (const fn of [...notified]) fn()               // s2's conversation settles
      await vi.advanceTimersByTimeAsync(4000)            // the follow-the-conversation debounce
      next.resolve(rooms('2026-09-28T11:00:00+08:00'))
      await vi.advanceTimersByTimeAsync(0)
      expect(exports.deskStore.sourceSession).toBe('s2') // the walk re-homed the flat fields…
      expect(exports.deskStore.pending).toBeUndefined()  // …so s1's row state left the flat…
      expect(exports.deskSlice('s1').pending?.rowId).toBe('d1') // …and rode into s1's own slice
    } finally {
      vi.useRealTimers()
    }
  })
})
