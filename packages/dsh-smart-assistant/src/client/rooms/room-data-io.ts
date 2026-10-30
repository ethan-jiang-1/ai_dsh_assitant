/**
 * The room data's I/O: env binding, the fetches against the host `assistant-rooms` route
 * (working-folder truth), the pollers/retry budgets around them, and the sidebar navigation.
 * The panel reads the host route; the old per-session copy and the old rewrite path behind the
 * prompt actions are retired. The lines that go INTO the conversation (panel actions, the desk
 * capture row) live in `prompt-bridge.ts`.
 *
 * Terminology (renamed 2026-10-14): this file serves the ROOM DATA — its source is the host
 * rooms route, the panel's single read authority since 2026-10-19
 * ([maintenance-read-authority](../../../../../notes/implemented/2026-10-19-maintenance-read-authority.md)), not any per-session copy. The
 * desktop surface itself is the operating-ledger projection (`projection-panel.ts`); the desk's
 * conversation arms (process/intake/claim/wake) live in the domain module
 * `domain/desk/desk-process.ts`.
 *
 * Everything the browser face reaches through a manifested Remote or the client Session
 * store is captured once by the entry's `apply` (bindDeskEnv) and kept here — the store
 * mechanics those reads feed live in room-data-core, and the principal-facing copy of every
 * action lands in the conversation in the product voice.
 *
 * @module dsh-smart-assistant/client/room-data-io
 */

import type { ClientContext, RoomKind } from '../chrome/contracts'
import {
  carryRowStateTo, deskSlice, getDeskStore,
  patchDesk, patchSlice, settlePending, sliceSeq,
} from './room-data-core'
import type { DeskData, DeskSlice } from './room-data-core'
import { parseRooms } from '../../domain/rooms/projection.ts'

/** The remote layer captured in apply; the room readers read manifested namespaces through it. */
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
 * four rooms from `assistantMemory`; this client never reads a per-session copy and never passes a
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
    const parsed: unknown = await response.json()
    const data = parseRooms(parsed)
    if (data === undefined) return { ok: false, reason: '房间数据不是 route 的形状' }
    return { ok: true, data }
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

/** One accepted rooms projection settles the pending prompt action. */
function settleLoadedDesk(parsed: DeskData, sessionId: string): void {
  settlePending(parsed.generatedAt, sessionId)
}

/** One controlled write's outcome: the route's success payload or a readable failure. */
export type RoomsActionResult = { readonly ok: true, readonly value: Record<string, unknown> } | { readonly ok: false, readonly reason: string }

/**
 * Call one controlled write on the same host route. The response is the result; failures are
 * readable and never turned into a prompt (the direct-write contract: no prompt fallback;
 * [maintenance-direct-write](../../../../../notes/implemented/2026-10-19-maintenance-direct-write.md)).
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

/** Read one learned skill's SKILL.md body (the Skills tab's drawer). */
export async function loadSkillBody(name: string): Promise<{ ok: true, body: string } | { ok: false, reason: string }> {
  const web = deskWeb
  if (web === undefined) return { ok: false, reason: 'the web face is not available' }
  try {
    const url = new URL('api/assistant/rooms', web.baseURI)
    url.searchParams.set('kind', 'skill')
    url.searchParams.set('id', name)
    const response = await web.fetch(url, { credentials: 'same-origin', cache: 'no-store', redirect: 'error' })
    const body = await response.json().catch(() => ({})) as { body?: unknown, error?: unknown, message?: unknown }
    if (!response.ok) return { ok: false, reason: typeof body.message === 'string' ? body.message : String(body.error ?? `HTTP ${String(response.status)}`) }
    return { ok: true, body: typeof body.body === 'string' ? body.body : '' }
  } catch (error) {
    return { ok: false, reason: String(error) }
  }
}

/** Patch one session's room projection in place (the immediate row update after a direct write). */
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

/** Re-read the desk for one target session; `undefined` walks the newest five (the primary view). */
export function reloadDesk(sessionId?: string): void {
  if (sessionId === undefined) loadDesk()
  else loadDeskFor(sessionId)
}

/** Open one room as a right-sidebar tab beside the conversation (the approved form). */
export function openBeside(kind: RoomKind): void {
  const controller = deskSidebarRight
  if (controller === undefined || controller.openTab === undefined) {
    // The note used to render inside a panel body — invisible from the Session header, where the
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
    // Clearing openError BEFORE the call and leaving the call uncaught (narrow review,
    // 2026-09-27) meant a throwing openTab showed nothing at all — the exact failure this marker was
    // added for.
    patchDesk({ openError: '开不了', note: `打开面板失败：${String(reason)}` })
  }
}
