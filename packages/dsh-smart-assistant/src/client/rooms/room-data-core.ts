/**
 * The room-data store: the shared state the three rooms, the tab bodies and the docks read.
 *
 * Terminology (renamed 2026-10-14, the manual's own words): the ROOM DATA is the four rooms,
 * not the desk. The panel's source moved from the old per-session copy to the
 * host `assistant-rooms` route (working-folder truth); the desktop the principal sees is the
 * operating-ledger projection panel (`projection-panel.ts`), and this module plus `room-data-io.ts`
 * serve the room tabs.
 *
 * One loader feeds it (see room-data-io); the store notifies its subscribers, and the slices
 * keep each bound session's row-scoped facts apart. Pure store mechanics live here —
 * reading, patching, settling, expiring — while the I/O (workspace reads, prompt sends,
 * the pollers) lives in room-data-io.
 *
 * @module dsh-smart-assistant/client/room-data-core
 */

import { shortTime } from '../chrome/format'
import { reactSurface } from '../chrome/runtime'
import type { ApprovalLine } from '../../domain/maintenance/receipt.ts'
import type {
  RoomsCounts,
  RoomsKnowledgeRow,
  RoomsMemoryRow,
  RoomsProblem,
  RoomsResearchRow,
  RoomsSkillRow,
} from '../../domain/rooms/projection.ts'

/**
 * The client's tolerant view of the rooms payload. The wire contract is `RoomsPayload` in
 * `domain/rooms/projection.ts`; every field here is optional while a load settles, but the row
 * field names come from the wire types so a rename cannot leave a silent second copy behind.
 */
export interface DeskData {
  schemaVersion?: number
  generatedAt?: string
  revision?: string
  problems?: readonly RoomsProblem[]
  /** Newest approval-ledger lines (the maintenance receipt). */
  ledger?: readonly ApprovalLine[]
  research?: readonly Partial<RoomsResearchRow>[]
  counts?: Partial<RoomsCounts>
  memories?: readonly Partial<RoomsMemoryRow>[]
  knowledge?: readonly Partial<RoomsKnowledgeRow>[]
  skills?: readonly Partial<RoomsSkillRow>[]
}

/**
 * Per-session desk state (graduated 2026-09-29): the row-scoped facts — data, pending,
 * receipt, stalled, readError — belong to the session whose workspace produced them. The FLAT
 * fields are the primary slice: the session the newest-five walk last answered (recorded in
 * `sourceSession`). `bySession` carries one slice per additional tab-bound session, so two tabs
 * bound to different sessions no longer freeze each other's same-id rows, stamp receipts across
 * sessions, or invalidate each other's loads (the pre-slice store was one shared object with
 * bare-rowId matching and ONE global load sequence — a session A action froze session B's row,
 * and two mounted tabs re-fired each other's reloads forever).
 */
export interface DeskSlice {
  data?: DeskData | undefined
  source?: string | undefined
  /** A corrupt desk file from the bound session: the tab shows the error and a retry, not "reading…". */
  readError?: string | undefined
  /** The action in flight: which row, when it left, what it was. The DATA GATE — buttons stay
   *  frozen until the desk file is rewritten past `at`. The prompt promise resolving only means
   *  the queue accepted the message; the assistant then works for tens of seconds, and a freeze
   *  that lifts at acceptance invites repeat clicks (real use queued one decision three times
   *  and left an action with seven contradictory orders — reviews, 2026-09-26). */
  pending?: { rowId: string, at: number, action: string } | undefined
  /** Receipt of the last action the desk file confirmed, shown on its row. */
  lastReceipt?: { rowId: string, action: string, at: number } | undefined
  /** An action that left but whose desk rewrite never arrived (the poller gave up). Rendered on
   *  its row as a durable, honest state — clearing it silently would read as "done". */
  stalled?: { rowId: string, at: number, action: string } | undefined
  /** The bound session's own conversation clock, so a tab can say when it lags (the direct-write lane). */
  sessionUpdatedAt?: number | undefined
  /** This slice's load sequence; unused on the primary (which owns the module-level counter). */
  seq?: number | undefined
}

/**
 * Shared desk state: one loader, three panels. The panels are separate sidebar entries, so
 * they must not each re-fetch; the store is the single owner and notifies its subscribers.
 */
export type DeskStore = DeskSlice & {
  note?: string | undefined
  /** The Session whose workspace answered the last walk — the flat fields above belong to it. */
  sourceSession?: string | undefined
  /** A count that could not open its panel (self-review, 2026-09-27): the cell used to swallow the throw and stay
   *  clickable, so the principal saw an underlined number that did nothing. */
  jumpError?: string | undefined
  /** The desk tab could not be opened: visible on the chip, which is where the click was. */
  openError?: string | undefined
  /** The desk's draft pointer just sent the principal over: highlight and scroll to the drafts. */
  focusKnowledge?: 'drafts' | undefined
  /** Sessions whose workspace is known to have no desk file (moved onto the store: testable). */
  misses: Set<string>
  /** One slice per tab-bound session that is not the primary. */
  bySession: Record<string, DeskSlice>
  /** Sessions with a mounted tab — the follow-the-conversation reload refreshes each of these. */
  boundSessions: Set<string>
  listeners: Set<() => void>
}

/** A fresh store: the exact initial value the single-file original created per factory run. */
function createFreshDeskStore(): DeskStore {
  return { listeners: new Set(), misses: new Set<string>(), bySession: {}, boundSessions: new Set<string>() }
}

let deskStore: DeskStore = createFreshDeskStore()

/**
 * Monotonic load sequence per slice: a newer load invalidates every older attempt of the SAME
 * slice only. The pre-slice single counter made a load for one session cancel an in-flight read
 * for another (two mounted tabs then re-fired each other forever — the reload ping-pong of the
 * pre-slice store).
 */
let deskLoadSeq = 0

/**
 * Re-create the store for one materialized factory. The original created the store inside
 * the factory closure — one fresh store per `__ModuleLoader__.load` materialization — and
 * the entry calls this at factory start to keep that contract.
 * @returns the fresh store (the value the factory surface exposes as `deskStore`).
 */
export function initDeskStore(): DeskStore {
  deskStore = createFreshDeskStore()
  deskLoadSeq = 0
  return deskStore
}

/** The current store (the panels' only input; tests fill it to render every section). */
export function getDeskStore(): DeskStore {
  return deskStore
}

/**
 * The slice a surface reads: the flat fields for the primary session (or the walk view —
 * `undefined`), a per-session slice for a tab bound to another session. While no session owns
 * the flat fields yet (`sourceSession` unset), the first targeted load claims them — the
 * loadDeskFor success path sets `sourceSession`, so an owned flat never serves a stranger.
 */
export function deskSlice(sessionId: string | undefined): DeskSlice {
  if (sessionId === undefined || deskStore.sourceSession === undefined || sessionId === deskStore.sourceSession) return deskStore
  if (deskStore.bySession[sessionId] === undefined) deskStore.bySession[sessionId] = {}
  return deskStore.bySession[sessionId]
}

export const patchDesk = (next: Partial<DeskStore>): void => {
  Object.assign(deskStore, next)
  for (const listener of [...deskStore.listeners]) listener()
}

/** Patch one session's slice (the flat object is the primary session's slice). */
export const patchSlice = (slice: DeskSlice, next: Partial<DeskSlice>): void => {
  Object.assign(slice, next)
  for (const listener of [...deskStore.listeners]) listener()
}

/** The sequence holder for one slice: the flat slice owns the module counter, others their own. */
export const sliceSeq = (slice: DeskSlice): { current: () => number, next: () => number } => {
  if (slice === (deskStore as DeskSlice)) {
    return { current: () => deskLoadSeq, next: () => ++deskLoadSeq }
  }
  return { current: () => slice.seq ?? 0, next: () => (slice.seq = (slice.seq ?? 0) + 1) }
}

/**
 * When the walk re-homes the flat fields to a different session, the row-scoped facts still
 * belong to the OLD owner: carry them into that session's OWN slice (`bySession[previous]` —
 * resolved EXPLICITLY, because at call time `sourceSession` still names the previous owner, so
 * `deskSlice(previous)` would return the flat itself and hand the row state right back to the
 * slice being re-homed; acceptance round 3, 2026-09-29, caught the walk path doing exactly
 * that — the new owner's settle then consumed the old owner's pending as its own).
 */
export function carryRowStateTo(previous: string, next: string): void {
  if (previous === next) return
  const carry: Partial<DeskSlice> = {}
  for (const key of ['pending', 'lastReceipt', 'stalled', 'readError'] as const) {
    if (deskStore[key] !== undefined) {
      (carry as Record<string, unknown>)[key] = deskStore[key]
      patchDesk({ [key]: undefined } as Partial<DeskStore>)
    }
  }
  if (Object.keys(carry).length > 0) {
    if (deskStore.bySession[previous] === undefined) deskStore.bySession[previous] = {}
    Object.assign(deskStore.bySession[previous], carry)
  }
}

/**
 * The per-session fields of a slice. A merge must set each of these EXPLICITLY from the slice:
 * a plain `{ ...deskStore, ...slice }` leaves the flat values in place for keys the slice does
 * not carry, which is exactly the cross-session leak the slices exist to prevent.
 */
const DESK_SLICE_KEYS = ['data', 'source', 'readError', 'pending', 'lastReceipt', 'stalled', 'sessionUpdatedAt'] as const

/** The view one surface reads: the shared fields plus one session's slice, slice keys explicit. */
export function mergeDeskSlice(sessionId?: string): DeskStore {
  const slice = deskSlice(sessionId)
  const merged: Record<string, unknown> = { ...deskStore }
  for (const key of DESK_SLICE_KEYS) merged[key] = slice[key]
  return merged as unknown as DeskStore
}

/**
 * Subscribe one surface to the desk store. `undefined` follows the walk view (the primary
 * slice); a tab passes its own session and reads that session's slice merged over the shared
 * fields.
 */
export function useDesk(sessionId?: string): DeskStore {
  const { useEffect, useState } = reactSurface()
  const [snapshot, setSnapshot] = useState(mergeDeskSlice(sessionId))
  useEffect(() => {
    const update = (): void => setSnapshot(mergeDeskSlice(sessionId))
    deskStore.listeners.add(update)
    update()
    return () => { deskStore.listeners.delete(update) }
  }, [sessionId])
  return snapshot
}

/** The desk file's generation time in ms, or undefined when missing or unparseable. */
export function deskGeneratedAtMs(data: DeskData | undefined): number | undefined {
  const raw = data?.generatedAt
  if (raw === undefined) return undefined
  const parsed = new Date(raw).getTime()
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * The DATA GATE: an action is in flight until the desk file is rewritten past the moment it was
 * sent. @see DeskSlice.pending for why the promise resolving must not lift this.
 */
export function pendingInFlight(store: DeskStore): boolean {
  const pending = store.pending
  if (pending === undefined) return false
  const generated = deskGeneratedAtMs(store.data)
  return generated === undefined || generated <= pending.at
}

/**
 * Release the data gate when the poller gives up waiting for the assistant to rewrite the room
 * data file. Leaving `pending` set froze every action button behind a "正在处理" that never ended,
 * while the escape hatch (刷新房间数据) was disabled by that same flag — the data was 13 h stale in
 * exactly that state (self-review, 2026-09-27). Expiry is honest: the action was sent and is not
 * revoked; only the "still working" claim stops.
 */
export function expirePending(sessionId?: string): void {
  const slice = deskSlice(sessionId)
  const pending = slice.pending
  patchSlice(slice, {
    pending: undefined,
    // The row keeps an honest, durable state: the action DID leave, the file just has not caught
    // up. A transient note would be wiped by the next successful load (verified live: the note
    // was gone by the time the release was captured), and silence would read as "done".
    stalled: pending === undefined ? undefined : { ...pending },
  })
  patchDesk({ note: '它还没写进房间数据——点「重读房间数据」再试一次（动作已发出，不会被撤销）' })
}

/** A finished load settles the pending action: the file moving past `at` is the completion
 *  signal — on the slice of the session whose file moved (another session's file moving
 *  past the send must not settle this one's rows). */
export function settlePending(generatedAt: string | undefined, sessionId?: string): void {
  const generated = deskGeneratedAtMs({ generatedAt } as DeskData)
  if (generated === undefined) return
  const slice = deskSlice(sessionId)
  const pending = slice.pending
  if (pending !== undefined && generated > pending.at) {
    patchSlice(slice, { pending: undefined, stalled: undefined, lastReceipt: { rowId: pending.rowId, action: pending.action, at: Date.now() } })
    return
  }
  // A stalled row is settled by the same signal: the file moving past its send.
  const stalled = slice.stalled
  if (stalled !== undefined && generated > stalled.at) {
    patchSlice(slice, { stalled: undefined, lastReceipt: { rowId: stalled.rowId, action: stalled.action, at: Date.now() } })
  }
}

/**
 * Whether the rooms lag the conversation. The panel reads the working-folder truth, so this line
 * only means the assistant has not written this turn's learning into a room yet; there is no
 * copy to rewrite and no refresh to click.
 * @param store - The shared desk store.
 * @returns A warning line, or undefined when the rooms are current.
 */
export function staleWarning(store: DeskStore): string | undefined {
  const generated = store.data?.generatedAt
  const sessionAt = store.sessionUpdatedAt
  if (generated === undefined || sessionAt === undefined) return undefined
  const generatedAt = new Date(generated).getTime()
  if (Number.isNaN(generatedAt)) return undefined
  if (sessionAt - generatedAt <= 60_000) return undefined
  return `对话比这份房间数据新（对话 ${shortTime(new Date(sessionAt).toISOString())}，房间数据 ${shortTime(generated)}）——助手还没把这次对话学到的东西写进房间，等它写完再回来看`
}
