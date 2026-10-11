/**
 * The desk I/O paths (`src/client/desk-io.ts`): the workspace reads (walk + targeted
 * `loadDeskFor`), the controller-bound `openBeside`, and the per-session slice mechanics
 * the R11 acceptance rounds pinned on them.
 *
 * Acceptance points:
 * - openBeside calls THROUGH the sidebarRight controller — a detached openTab loses the
 *   receiver (runtime-proven 2026-09-26).
 * - A failed read surfaces as readError wherever the principal is (R6).
 * - An unowned flat slice serves anyone; the first targeted load claims it (R11 claim path).
 * - Two first loads racing for the unowned flat: only the newest sequence writes (claim race).
 * - One session's load no longer cancels another's in-flight read (per-slice seq).
 * - The walk re-homing carries the previous owner's row state into its own slice (R11).
 *
 * Cross-module note: assertions partly read the rendered tab (room-tabs) — the file owns the
 * io/interface itself; all store claims go through the exported surface (`apply` +
 * `loadDeskFor`) with a fake remote, never by poking internals.
 */
import { describe, expect, it, vi } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  apply: (ctx: unknown) => void
  loadDeskFor: (sessionId: string) => void
  DeskTabBody: (props: { sessionId?: string }) => unknown
  deskStore: {
    data?: Record<string, unknown> | undefined
    readError?: string | undefined
    note?: string | undefined
    pending?: { rowId: string, at: number, action: string } | undefined
    sourceSession?: string | undefined
  }
  /** The slice a surface reads: flat for the primary, `bySession[sid]` for a bound tab (R11). */
  deskSlice: (sessionId?: string) => {
    data?: Record<string, unknown> | undefined
    pending?: { rowId: string, at: number, action: string } | undefined
  }
}

/** Every string in a rendered element tree, for asserting on copy without a DOM. */
function textsOf(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string') return [node]
  if (typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(textsOf)
  const element = node as { type?: unknown, props?: { children?: unknown } }
  if (typeof element.type === 'function') {
    return textsOf((element.type as (props: unknown) => unknown)(element.props))
  }
  return element.props === undefined ? [] : textsOf(element.props.children)
}

const materialize = (): ClientExports =>
  materializeClient(registration, inertReactShim()) as unknown as ClientExports

describe('desk io: the read paths', () => {
  it('turns a failed desk read into a visible error with a retry, not an eternal reading state (R6)', async () => {
    const ctx = {
      slots: { inject: (_name: string, contribute: () => unknown) => { contribute() }, register: () => undefined },
      sidebarRightTabs: { register: () => undefined },
      sidebarRight: { openTab: () => {} },
      inject: () => undefined,
      remote: { workspaceFiles: { read: () => { throw new Error('boom') } } },
      sessions: {
        list: {
          getSnapshot: () => ({ ids: ['s1'], byId: { s1: { updatedAt: 1, cwd: '.tmp/ws' } } }),
          subscribe: () => () => {},
        },
      },
    }
    const exports = materialize() as unknown as ClientExports
    exports.apply(ctx)
    // Let apply()'s own walk finish, then clear its verdict: the assertion must depend on the TAB
    // path alone (the main panels render notes, so their failure was never invisible).
    await new Promise(resolve => { setTimeout(resolve, 0) })
    exports.deskStore.readError = undefined
    exports.deskStore.note = undefined
    // Drive the tab path directly: this is the one whose failure used to be invisible, because the
    // tab returns before any Panel renders notes.
    exports.loadDeskFor('s1')
    await new Promise(resolve => { setTimeout(resolve, 0) })

    expect(exports.deskStore.readError).toContain('读桌面文件失败')
    const tab = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    // Before R6 a throwing read only patched a note, which this tab never renders: the pane sat on
    // "正在读这个会话的桌面…" forever, with no retry anywhere.
    expect(tab).toContain('读桌面文件失败')
    expect(tab).not.toContain('正在读')
  })
})

/**
 * The slice MECHANICS the R11 note claims (acceptance round 3, 2026-09-29): the fixtures pin
 * the claiming path, the claim race on the unowned flat, the walk re-homing carry, and the
 * per-slice load sequence — all driven through the exported surface (`apply` + `loadDeskFor`)
 * with a fake remote, never by poking the internals.
 */
describe('per-session slice mechanics (R11, acceptance round 2026-09-29)', () => {
  /** A readable desk file for one session, stamped `generatedAt`. */
  const deskFile = (generatedAt: string): { ok: boolean, value: { text: string } } => ({
    ok: true,
    value: { text: JSON.stringify({ generatedAt, decisions: [{ id: 'd1', question: '先办这件', kind: 'business' }] }) },
  })
  /** Microtask flush for the async read chains (real-timer tests). */
  const flush = async (): Promise<void> => {
    for (let i = 0; i < 6; i++) await new Promise((resolve) => setTimeout(resolve, 0))
  }
  const makeDeferred = (): { promise: Promise<unknown>, resolve: (value: unknown) => void } => {
    let resolve!: (value: unknown) => void
    const promise = new Promise<unknown>((r) => { resolve = r })
    return { promise, resolve }
  }
  /** The fake browser ctx apply() needs: a controllable workspaceFiles.read, a mutable Session
    * list, and no-op slot/tab registries (their registrations never fire without a real mount). */
  const fakeCtx = (
    read: (sessionId: string) => Promise<unknown>,
    list: { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void },
  ): unknown => ({
    remote: { workspaceFiles: { read: (sessionId: string, _path: string, _options: unknown) => read(sessionId) } },
    sessions: { list },
    slots: { inject: () => {} },
    sidebarRightTabs: { register: () => {} },
  })
  const inertList = { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => () => {} }

  it('an unowned flat slice serves anyone; the first targeted load claims it (R11 claim path)', async () => {
    const exports = materialize()
    exports.apply(fakeCtx(async (sid) => (sid === 's1' ? deskFile('2026-09-28T10:00:00+08:00') : { ok: false }), inertList))
    // Pre-claim: no walk ever answered, so the flat fields serve whichever session asks first.
    expect(exports.deskSlice('s2')).toBe(exports.deskStore)
    exports.loadDeskFor('s1')
    await flush()
    expect(exports.deskStore.sourceSession).toBe('s1')
    expect((exports.deskStore.data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T10:00:00+08:00')
    // Post-claim: an owned flat never serves a stranger — s2 now reads its own slice.
    expect(exports.deskSlice('s2')).not.toBe(exports.deskStore)
  })

  it('two first loads racing for the unowned flat: only the newest sequence writes (R11 claim race)', async () => {
    const exports = materialize()
    const deferred = { s1: makeDeferred(), s2: makeDeferred() }
    exports.apply(fakeCtx((sid) => (deferred as Record<string, { promise: Promise<unknown> }>)[sid]?.promise ?? Promise.resolve({ ok: false }), inertList))
    // Both fire while the flat is unowned, so both capture the flat slice — and its ONE sequence.
    exports.loadDeskFor('s1')
    exports.loadDeskFor('s2')
    deferred.s1.resolve(deskFile('2026-09-28T10:00:00+08:00')) // the FIRST fire completes first
    await flush()
    expect(exports.deskStore.sourceSession).toBeUndefined() // stale seq: dropped, no claim, no write
    expect(exports.deskStore.data).toBeUndefined()
    deferred.s2.resolve(deskFile('2026-09-28T11:00:00+08:00')) // the newest sequence lands and claims
    await flush()
    expect(exports.deskStore.sourceSession).toBe('s2')
    expect((exports.deskStore.data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T11:00:00+08:00')
  })

  it("one session's load no longer cancels another's in-flight read (R11 per-slice seq)", async () => {
    const exports = materialize()
    const deferred = { s1: makeDeferred(), s2: makeDeferred() }
    exports.apply(fakeCtx((sid) => (deferred as Record<string, { promise: Promise<unknown> }>)[sid]?.promise ?? Promise.resolve({ ok: false }), inertList))
    exports.deskStore.sourceSession = 's1' // flat owned by s1; s2 reads its own slice
    exports.loadDeskFor('s1')              // in-flight on the primary slice…
    exports.loadDeskFor('s2')              // …a later load for ANOTHER session
    deferred.s2.resolve(deskFile('2026-09-28T11:00:00+08:00')) // completes first
    await flush()
    expect((exports.deskSlice('s2').data as { generatedAt?: string })?.generatedAt).toBe('2026-09-28T11:00:00+08:00')
    expect(exports.deskStore.data).toBeUndefined() // the flat still waits on its own read
    deferred.s1.resolve(deskFile('2026-09-28T10:00:00+08:00')) // the OLDER fire completes last…
    await flush()
    // …and lands: with the pre-slice single counter this completion was cancelled by s2's load.
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
      exports.apply(fakeCtx(async (sid) => (sid === 's1' ? deskFile('2026-09-28T10:00:00+08:00') : sid === 's2' ? deskFile('2026-09-28T11:00:00+08:00') : { ok: false }), list))
      for (let i = 0; i < 8; i++) await Promise.resolve() // the walk's read chain is all microtasks
      expect(exports.deskStore.sourceSession).toBe('s1') // the newest-five walk answered s1
      exports.deskStore.pending = { rowId: 'd1', at: 1, action: '看选项' }
      snapshot = { ids: ['s1', 's2'], byId: { ...snapshot.byId, s2: { updatedAt: 99, cwd: '/w2' } } }
      for (const fn of [...notified]) fn()               // s2's conversation settles
      await vi.advanceTimersByTimeAsync(4000)            // the follow-the-conversation debounce
      for (let i = 0; i < 8; i++) await Promise.resolve()
      expect(exports.deskStore.sourceSession).toBe('s2') // the walk re-homed the flat fields…
      expect(exports.deskStore.pending).toBeUndefined()  // …so s1's row state left the flat…
      expect(exports.deskSlice('s1').pending?.rowId).toBe('d1') // …and rode into s1's own slice
    } finally {
      vi.useRealTimers()
    }
  })
})
