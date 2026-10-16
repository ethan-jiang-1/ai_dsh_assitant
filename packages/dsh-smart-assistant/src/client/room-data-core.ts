/**
 * The room-data store: the shared state the three rooms, the tab bodies and the docks read.
 *
 * Terminology (renamed 2026-10-14, the manual's own words): `.desk/state.json` is the ROOM
 * DATA file — "It is not the desk". The desktop the principal sees is the operating-ledger
 * projection panel (`projection-panel.ts`); this module and `room-data-io.ts` serve the
 * room-data file the three room tabs render.
 *
 * One loader feeds it (see room-data-io); the store notifies its subscribers, and the slices
 * keep each bound session's row-scoped facts apart (R11). Pure store mechanics live here —
 * reading, patching, settling, expiring — while the I/O (workspace reads, prompt sends,
 * the pollers) lives in room-data-io.
 *
 * @module dsh-smart-assistant/client/room-data-core
 */

import { shortTime } from './format'
import { reactSurface } from './runtime'

/** One desk snapshot as the assistant writes it (see the desk-refresh skill). */
export interface DeskData {
  generatedAt?: string
  counts?: { memories?: number, knowledgeStable?: number, knowledgeDraft?: number, skills?: number, threads?: number }
  threads?: { id?: string, status?: string, title?: string, why?: string, lean?: string }[]
  decisions?: {
    id?: string, question?: string, context?: string,
    /** The choices the assistant presented (written back after "看选项"); rendered as one-click answers. */
    options?: { label?: string, cost?: string, irreversible?: boolean }[] | undefined
    /** The assistant's latest word on this row, rendered as its own line. */
    reply?: string | undefined
    /**
     * `"business"` = only the principal can call it and calling it changes what happens outside;
     * anything else (including a missing field) is the assistant's own upkeep and cannot lead on
     * `kind` alone — but R4 gives the lead slot to an options-bearing decision when no business
     * one is waiting. Contract rule: at most one decision leads.
     */
    kind?: string,
    /** Optional ordering among business decisions; lower first. */
    rank?: number,
  }[]
  gaps?: { id?: string, what?: string, why?: string }[]
  actions?: {
    id?: string, what?: string, owner?: string, due?: string,
    metric?: string, stop?: string, status?: string,
    /** The assistant's outcome/seal record for this action (real files already carry it). */
    note?: string | undefined
  }[]
  recentActivity?: { at?: string, what?: string }[]
  memories?: { id?: string, kind?: string, text?: string, updated?: string, source?: string }[]
  knowledge?: { id?: string, title?: string, status?: string, type?: string, updated?: string, sources?: string[], excerpt?: string }[]
  skills?: { name?: string, description?: string, kind?: string }[]
}

/**
 * One desk decision as the file carries it.
 * @see DeskData.decisions for the `kind` rule that keeps upkeep off the lead card.
 */
export type DeskDecision = NonNullable<DeskData['decisions']>[number]

/**
 * Per-session desk state (R11, graduated 2026-09-29): the row-scoped facts — data, pending,
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
  /** A corrupt desk file from the bound session (A5): the tab shows the error and a retry, not "reading…". */
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
   *  its row as a durable, honest state — clearing it silently would read as "done" (R1). */
  stalled?: { rowId: string, at: number, action: string } | undefined
  /** The bound session's own conversation clock, so a tab can say when it lags (A2). */
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
  /** A count that could not open its panel (R9): the cell used to swallow the throw and stay
   *  clickable, so the principal saw an underlined number that did nothing. */
  jumpError?: string | undefined
  /** The desk tab could not be opened (R9): visible on the chip, which is where the click was. */
  openError?: string | undefined
  /** The desk's draft pointer just sent the principal over (S4): highlight and scroll to the drafts. */
  focusKnowledge?: 'drafts' | undefined
  /** Sessions whose workspace is known to have no desk file (moved onto the store: testable). */
  misses: Set<string>
  /** One slice per tab-bound session that is not the primary (R11). */
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
 * for another (two mounted tabs then re-fired each other forever — the R11 reload ping-pong).
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
 * not carry, which is exactly the cross-session leak the slices exist to prevent (R11).
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
 * fields (R11).
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
 * exactly that state (self-review R1, 2026-09-27). Expiry is honest: the action was sent and is not
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
  patchDesk({ note: '它还没重写房间数据——点「刷新房间数据」再试一次（动作已发出，不会被撤销）' })
}

/**
 * A receipt claims "the principal answered this row". When a load comes back still carrying that row
 * unanswered, the claim is stale — the assistant re-opened it, or the answer never landed — and the
 * row was stuck read-only until a reload (R11, narrow review 2026-09-27). Retiring it lets the
 * principal answer again. Scoped to decisions, where the false 已回答 was observed.
 * @param data - the file just parsed, if any.
 */
export function retireStaleReceipt(data: DeskData | undefined, sessionId?: string): void {
  const slice = deskSlice(sessionId)
  const receipt = slice.lastReceipt
  if (receipt === undefined || data === undefined) return
  const stillOpen = (data.decisions ?? [])
    .some(item => String(item.id ?? item.question) === receipt.rowId)
  if (stillOpen) patchSlice(slice, { lastReceipt: undefined })
}

/**
 * Does this JSON look like a desk file at all?
 *
 * Why (2026-09-27, from the friction report on real sessions): panel messages name the
 * `desk-refresh` skill, the model rewrites the file, but in 5 of 7 real panel actions it never
 * LOADED the skill — it improvised from memory. A file that parses but carries none of the
 * contract's shape then renders as a legitimately empty desk: every section shows its honest
 * "（没有…）" empty text and the principal reads "nothing is happening" while the assistant thinks
 * it just refreshed him. That is the "a stale or invented list is worse than none" case the skill
 * itself warns about, so the panel says what it can actually see.
 * @param parsed - the JSON just parsed.
 * @returns true when the file carries the contract's mandatory `generatedAt` or a known section.
 */
export function looksLikeDesk(parsed: DeskData): boolean {
  if (typeof parsed.generatedAt === 'string' && parsed.generatedAt.trim() !== '') return true
  // The nine the contract owns (`desk-refresh/SKILL.md` §Shape): counts, decisions, actions, gaps,
  // threads, recentActivity, memories, knowledge, skills.
  const sections = [parsed.decisions, parsed.actions, parsed.gaps, parsed.threads, parsed.recentActivity,
    parsed.memories, parsed.knowledge, parsed.skills]
  if (sections.some(section => Array.isArray(section) && section.length > 0)) return true
  return parsed.counts !== undefined && typeof parsed.counts === 'object' && parsed.counts !== null
}

/** A finished load settles the pending action: the file moving past `at` is the completion
 *  signal — on the slice of the session whose file moved (R11: another session's file moving
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
 * Whether the room data file lags the conversation. It is only as fresh as the assistant's last
 * refresh, so when the newest turn is newer than the file the panels say so instead of presenting
 * a stale snapshot as current (a minute of slack absorbs the refresh itself).
 * @param store - The shared desk store.
 * @returns A warning line, or undefined when the file is current.
 */
export function staleWarning(store: DeskStore): string | undefined {
  const generated = store.data?.generatedAt
  const sessionAt = store.sessionUpdatedAt
  if (generated === undefined || sessionAt === undefined) return undefined
  const generatedAt = new Date(generated).getTime()
  if (Number.isNaN(generatedAt)) return undefined
  if (sessionAt - generatedAt <= 60_000) return undefined
  return `对话比这份房间数据新（对话 ${shortTime(new Date(sessionAt).toISOString())}，房间数据 ${shortTime(generated)}）——点「刷新房间数据」让它跟上`
}
