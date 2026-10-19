/**
 * The room data's I/O: fetching the host `assistant-rooms` route (working-folder truth),
 * sending the principal's panel actions into the conversation, and the pollers/retry budgets
 * around both. A1a: the panel no longer reads `.desk/state.json`; the copy and the
 * `desk-refresh` path behind the prompt actions are retired in A1b.
 *
 * Terminology (renamed 2026-10-14): this file serves the ROOM DATA. A1a moved its source from
 * the model-written `.desk/state.json` copy to the host rooms route; the desktop surface itself
 * remains the operating-ledger projection (`projection-panel.ts`). The desktop surface itself is the operating-ledger
 * projection (`projection-panel.ts`); the desk's conversation arms (process/intake/claim/
 * wake) live in `desk-process.ts`.
 *
 * Everything the browser face reaches through a manifested Remote or the client Session
 * store is captured once by the entry's `apply` (bindDeskEnv) and kept here — the store
 * mechanics those reads feed live in room-data-core, and the principal-facing copy of every
 * action lands in the conversation in the product voice.
 *
 * @module dsh-smart-assistant/client/room-data-io
 */

import type { ClientContext, RoomKind } from './contracts'
import {
  carryRowStateTo, deskGeneratedAtMs, deskSlice, expirePending, getDeskStore, looksLikeDesk,
  patchDesk, patchSlice, retireStaleReceipt, settlePending, sliceSeq,
} from './room-data-core'
import type { DeskData, DeskSlice } from './room-data-core'

/** The remote layer captured in apply; DeskPanel reads manifested namespaces through it. */
let deskRemote: Record<string, unknown> | undefined
/** The client Session store; its list snapshot is already synced and needs no Remote call. */
let deskSessions: { list?: { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void } } | undefined
/** The right-sidebar controller, so a page can open a room tab beside the conversation. */
let deskSidebarRight: { openTab: (kind: string, options?: { params?: unknown }) => void } | undefined

/**
 * Capture the browser context the I/O paths drive. Called once per `apply` — the original
 * kept these as factory-closure `let`s assigned at the top of apply.
 */
export function bindDeskEnv(ctx: ClientContext): void {
  deskRemote = (ctx as { remote?: Record<string, unknown> }).remote
  deskSessions = ctx.sessions as typeof deskSessions | undefined
  deskSidebarRight = ctx.sidebarRight
  // A real Cordis context guards undeclared services (the panel does not inject a `web`
  // service); the classic-script test harness passes a plain `web` object. Probe without
  // turning an unavailable service into an apply failure; production reads document/location.
  let injected: RoomDataWeb | undefined
  try {
    injected = (ctx as { web?: RoomDataWeb }).web
  } catch {
    injected = undefined
  }
  deskWeb = injected ?? (typeof document === 'undefined'
    ? undefined
    : { baseURI: document.baseURI, origin: location.origin, fetch: globalThis.fetch.bind(globalThis) })
}

/** The captured remote layer (the entry's apply reads it for the typert mount attempt). */
export function getDeskRemote(): Record<string, unknown> | undefined {
  return deskRemote
}

/** The browser face the host route uses; production injects document/location, tests inject a fake. */
export interface RoomDataWeb {
  readonly baseURI: string
  readonly origin: string
  readonly fetch: typeof globalThis.fetch
}

let deskWeb: RoomDataWeb | undefined

/** One successful rooms read, or the readable reason it failed. */
type RoomsRead = { readonly ok: true, readonly data: DeskData } | { readonly ok: false, readonly reason: string }

/**
 * Read the host rooms route: the authoritative working-folder projection. The route returns all
 * four rooms from `assistantMemory`; this client never reads `.desk/state.json` and never passes a
 * session or a path. A non-2xx response is a readable failure, not a silently empty room.
 */
async function readRooms(): Promise<RoomsRead> {
  const web = deskWeb
  if (web === undefined) return { ok: false, reason: 'the web face is not available' }
  try {
    const url = new URL('api/assistant/rooms', web.baseURI)
    if (url.origin !== web.origin) return { ok: false, reason: '房间数据路由必须同源' }
    const response = await web.fetch(url, { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error' })
    if (!response.ok) {
      void response.arrayBuffer().catch(() => {})
      return { ok: false, reason: `房间数据路由返回 ${String(response.status)}` }
    }
    const parsed = await response.json() as DeskData
    if (!looksLikeDesk(parsed)) return { ok: false, reason: '房间数据不是 route 的形状' }
    return { ok: true, data: parsed }
  } catch (reason) {
    return { ok: false, reason: String(reason) }
  }
}

/** Read one knowledge page's full body through the same route. */
export interface KnowledgeBody {
  readonly title: string
  readonly body: string
}

/**
 * Read one knowledge page body and backlinks by id.
 * @param id - Knowledge page id.
 * @returns The body, or the readable reason it failed.
 */
export async function loadKnowledgeBody(id: string): Promise<{ readonly ok: true, readonly page: KnowledgeBody } | { readonly ok: false, readonly reason: string }> {
  const web = deskWeb
  if (web === undefined) return { ok: false, reason: 'the web face is not available' }
  try {
    const url = new URL('api/assistant/rooms', web.baseURI)
    url.searchParams.set('kind', 'knowledge')
    url.searchParams.set('id', id)
    const response = await web.fetch(url, { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error' })
    if (!response.ok) {
      void response.arrayBuffer().catch(() => {})
      return { ok: false, reason: `读正文失败（${String(response.status)}）` }
    }
    const parsed = await response.json() as { title?: unknown, body?: unknown }
    if (typeof parsed.body !== 'string') return { ok: false, reason: '读正文失败（响应没有 body）' }
    return { ok: true, page: { title: typeof parsed.title === 'string' ? parsed.title : id, body: parsed.body } }
  } catch (reason) {
    return { ok: false, reason: String(reason) }
  }
}

/** One accepted rooms projection settles the pending row and retires a moved-past receipt. */
function settleLoadedDesk(parsed: DeskData, sessionId: string): void {
  settlePending(parsed.generatedAt, sessionId)
  retireStaleReceipt(parsed, sessionId)
}

/** One controlled write's outcome: the route's success payload or a readable failure. */
export type RoomsActionResult = { readonly ok: true, readonly value: Record<string, unknown> } | { readonly ok: false, readonly reason: string }

/**
 * Call one controlled write on the same host route. The response is the result; failures are
 * readable and never turned into a prompt (A2: no prompt fallback).
 * @param action - Whitelisted action name (`knowledge.approve`, `memory.correct`, ...).
 * @param payload - Action fields (id/name/text/sessionId/title/reason).
 * @returns The route payload, or the readable reason it failed.
 */
export async function postRoomsAction(action: string, payload: Readonly<Record<string, unknown>>): Promise<RoomsActionResult> {
  const web = deskWeb
  if (web === undefined) return { ok: false, reason: 'the web face is not available' }
  try {
    const url = new URL('api/assistant/rooms', web.baseURI)
    const response = await web.fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const parsed = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) {
      const message = typeof parsed.message === 'string' ? parsed.message : typeof parsed.error === 'string' ? parsed.error : `HTTP ${String(response.status)}`
      return { ok: false, reason: message }
    }
    return { ok: true, value: parsed }
  } catch (reason) {
    return { ok: false, reason: String(reason) }
  }
}

/** Patch one session's room projection in place (A2 immediate row update after a write). */
export function patchRoomRows(sessionId: string | undefined, change: (data: DeskData) => DeskData): void {
  const slice = deskSlice(sessionId)
  if (slice.data === undefined) return
  patchSlice(slice, { data: change(slice.data) })
}

/** Whether every room is empty, so the tab can offer the first-conversation entry instead of a hollow panel. */
function isEmptyRooms(data: DeskData): boolean {
  return (data.memories ?? []).length === 0
    && (data.knowledge ?? []).length === 0
    && (data.skills ?? []).length === 0
}

/** Read all rooms for the walk view (the flat slice); the newest session owns its row state. */
export function loadDesk(): void {
  const seqOf = sliceSeq(getDeskStore())
  const seq = seqOf.next()
  void readRooms().then(outcome => {
    if (seq !== seqOf.current()) return
    if (!outcome.ok) {
      patchDesk({ readError: `读房间数据失败（${outcome.reason}）`, note: undefined })
      return
    }
    const state = deskSessions?.list?.getSnapshot() as {
      ids?: string[]
      byId?: Record<string, { updatedAt?: number }>
    } | undefined
    const owner = newestSessionId()
    const previous = getDeskStore().sourceSession
    if (owner !== undefined && previous !== undefined && previous !== owner) carryRowStateTo(previous, owner)
    const sessionUpdatedAt = owner === undefined ? undefined : state?.byId?.[owner]?.updatedAt
    patchDesk({
      data: outcome.data,
      source: 'working folder',
      sourceSession: owner,
      readError: undefined,
      note: undefined,
      jumpError: undefined,
      ...(sessionUpdatedAt === undefined ? {} : { sessionUpdatedAt: Number(sessionUpdatedAt) }),
    })
    if (owner !== undefined) {
      if (isEmptyRooms(outcome.data)) getDeskStore().misses.add(owner)
      else getDeskStore().misses.delete(owner)
      settleLoadedDesk(outcome.data, owner)
    }
  })
}

/** Read all rooms for one tab-bound session; the data is global, the row state stays per session. */
export function loadDeskFor(sessionId: string): void {
  const slice = deskSlice(sessionId)
  const seqOf = sliceSeq(slice)
  const seq = seqOf.next()
  void (async (): Promise<void> => {
    const state = deskSessions?.list?.getSnapshot() as { byId?: Record<string, { updatedAt?: number }> } | undefined
    const updatedAt = state?.byId?.[sessionId]?.updatedAt
    if (seq !== seqOf.current()) return
    if (updatedAt !== undefined) patchSlice(slice, { sessionUpdatedAt: Number(updatedAt) })
    const outcome = await readRooms()
    if (seq !== seqOf.current()) return
    if (!outcome.ok) {
      patchSlice(slice, { readError: `读房间数据失败（${outcome.reason}）`, data: undefined })
      return
    }
    patchSlice(slice, { data: outcome.data, source: 'working folder', readError: undefined })
    patchDesk({ note: undefined, jumpError: undefined })
    if (slice === (getDeskStore() as DeskSlice) && getDeskStore().sourceSession === undefined) patchDesk({ sourceSession: sessionId })
    if (isEmptyRooms(outcome.data)) getDeskStore().misses.add(sessionId)
    else getDeskStore().misses.delete(sessionId)
    settleLoadedDesk(outcome.data, sessionId)
  })()
}

/** The newest Session, which every panel action drives. */
export function newestSessionId(): string | undefined {
  const state = deskSessions?.list?.getSnapshot() as { ids?: string[], byId?: Record<string, { updatedAt?: number }> } | undefined
  const ids = state?.ids ?? []
  const byId = state?.byId ?? {}
  return ids.slice().sort((left, right) => Number(byId[right]?.updatedAt ?? 0) - Number(byId[left]?.updatedAt ?? 0))[0]
}

/**
 * The marker every machine-written panel line carries (A10): without it the conversation log —
 * and the usage meter — cannot tell a panel's assertion from the principal's own words, so his
 * history fills with text he never typed and the meter counts the panel as the human.
 */
const PANEL_MARKER = '[面板] '

/**
 * The desk's own intake marker (261018 片 1). A line the principal typed into the desk's capture
 * row is not a panel action: the log must keep the two apart, because the model treats them
 * differently (a panel action is the desk acting; this is the principal speaking from the desk).
 */
const DESK_CAPTURE_MARKER = '[桌面] '

/**
 * Build one panel prompt request. The principal's panel actions (this module) and the desk arms'
 * seed notes (the entry, later its own module) ride the same remote channel with the same marker
 * and the same queue mode — so that shape is stated once, and each caller keeps only its own send
 * semantics (fire-and-forget for a seed, tracked-and-polled for an action).
 * @param prefix - The requestId prefix naming the sender ('desk' for panel actions, an arm's kind for a seed).
 * @param sessionId - The conversation the line lands in.
 * @param text - The line, without the marker.
 * @param marker - Which provenance marker the line carries; defaults to the panel marker.
 * @returns The prompt request body `remote.session.prompt` takes.
 */
export function panelPromptRequest(prefix: string, sessionId: string, text: string, marker: string = PANEL_MARKER): {
  readonly requestId: string
  readonly sessionId: string
  readonly mode: 'queue'
  readonly content: readonly { readonly type: 'text', readonly text: string }[]
} {
  return {
    requestId: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text: `${marker}${text}` }],
  }
}

/**
 * The desk-side capture request (261018 片 1): the principal's own words typed on the desk, sent
 * into the intake conversation with the desk marker. One shape, so the arm cannot drift from the
 * marker the model is taught to read.
 * @param sessionId - The conversation the line lands in.
 * @param text - The principal's words, verbatim.
 * @returns The prompt request body `remote.session.prompt` takes.
 */
export function deskCaptureRequest(sessionId: string, text: string): ReturnType<typeof panelPromptRequest> {
  return panelPromptRequest('desk-capture', sessionId, text, DESK_CAPTURE_MARKER)
}

/**
 * Put one line to the assistant in the newest Session. Every panel action rides this — the
 * panel is a control surface for the same conversation the principal is having.
 *
 * The action is tracked as `pending` on its row and stays frozen behind the DATA GATE until the
 * desk file is rewritten past the send: acceptance by the queue is not completion (the assistant
 * then works for tens of seconds), and this poller keeps re-reading until the file actually
 * moves — a single fixed delay reliably re-reads a stale file, mis-advises "click refresh", and
 * left an action with seven contradictory orders (2026-09-26).
 * @param text - the line to send.
 * @param action - the action name shown on the receipt line.
 * @param rowId - the row this action belongs to (receipts and freezing are row-scoped).
 */
export function sendPrompt(text: string, action: string, rowId: string, sessionId?: string): void {
  const prompt = (deskRemote?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
  // A tab bound to session X passes X explicitly: a correction typed beside one conversation
  // that lands in another would read as the assistant ignoring what was just pointed at. The
  // old global `sendSession` slot made the LAST mounted tab steal every send (R11); the target
  // is now a per-surface argument with the newest session as the walk-view fallback.
  const target = sessionId ?? newestSessionId()
  if (target === undefined) {
    patchDesk({ note: '还没有会话——先和助手说句话' })
    return
  }
  if (prompt === undefined) {
    patchDesk({ note: 'remote.session did not materialize' })
    return
  }
  const slice = deskSlice(target)
  // `stalled` is deliberately NOT cleared here: it is an earlier action's unconfirmed trace, and
  // only the desk file moving past its `at` may retire it (R11, narrow review 2026-09-27).
  patchSlice(slice, { pending: { rowId, at: Date.now(), action }, lastReceipt: undefined })
  void prompt(panelPromptRequest('desk', target, text)).then((result: unknown) => {
    const wrapped = result as { ok?: boolean, error?: { message?: string } }
    if (wrapped?.ok === false) {
      patchSlice(slice, { pending: undefined })
      patchDesk({ note: wrapped.error?.message ?? 'prompt failed' })
    }
  }).catch((reason: unknown) => {
    patchSlice(slice, { pending: undefined })
    patchDesk({ note: String(reason) })
  })
  let tries = 0
  let lastGenerated: number | undefined
  const tick = (): void => {
    if (deskSlice(target).pending === undefined) return
    const generated = deskGeneratedAtMs(deskSlice(target).data)
    if (generated !== undefined && generated !== lastGenerated) {
      // The desk moved since the last look — the assistant is visibly working the queue.
      // Progress resets the budget: approval turns (promote + desk-refresh) run 60–90s each
      // and queue behind each other, so the fixed 150s budget expired mid-queue and pushed
      // manual refreshes onto the principal (CEO first-reading friction #1, 2026-10-04).
      tries = 0
    }
    lastGenerated = generated
    if (tries >= 15) {
      // Giving up releases the gate (see expirePending): a frozen surface whose escape hatch is
      // disabled by the same flag has no way out at all.
      expirePending(target)
      return
    }
    tries += 1
    reloadDesk(target)
    setTimeout(tick, 10_000)
  }
  setTimeout(tick, 10_000)
}

/** Re-read the desk for one target session; `undefined` walks the newest five (the primary view). */
export function reloadDesk(sessionId?: string): void {
  if (sessionId === undefined) loadDesk()
  else loadDeskFor(sessionId)
}

/** Open one room as a right-sidebar tab beside the conversation (the approved form). */
export function openBeside(kind: RoomKind): void {
  const controller = deskSidebarRight
  if (controller === undefined || controller.openTab === undefined) {
    // R9: the note rendered inside a panel body — invisible from the Session header, where the
    // click happened. The chip shows it instead.
    patchDesk({ note: 'sidebarRight 服务没有物化，开不了对话旁的 tab', openError: '开不了' })
    return
  }
  patchDesk({ openError: undefined })
  // Call THROUGH the controller, never through a detached reference: the vendor's openTab starts
  // with `this.require()`, so a bare function call loses the receiver and throws. Runtime-proven
  // 2026-09-26 (独立体验反馈): "Cannot read properties of undefined (reading 'require')" — the
  // approved right-tab form never opened for a real click.
  try {
    controller.openTab(kind)
  } catch (reason: unknown) {
    // R11 (narrow review, 2026-09-27): clearing openError BEFORE the call and leaving the call
    // uncaught meant a throwing openTab showed nothing at all — the exact failure this marker was
    // added for.
    patchDesk({ openError: '开不了', note: `打开面板失败：${String(reason)}` })
  }
}
