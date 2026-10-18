/**
 * The room data's I/O: reading `.desk/state.json` out of the workspaces, sending the
 * principal's panel actions into the conversation, and the pollers/retry budgets around both.
 *
 * Terminology (renamed 2026-10-14): this file serves the ROOM DATA file (`.desk/state.json`)
 * — per the manual, "It is not the desk". The desktop surface itself is the operating-ledger
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
}

/** The captured remote layer (the entry's apply reads it for the typert mount attempt). */
export function getDeskRemote(): Record<string, unknown> | undefined {
  return deskRemote
}

/** One workspace-file read: the manifested `remote.workspaceFiles.read` signature. */
type WorkspaceFileRead = (sessionId: string, path: string, options: unknown) => Promise<unknown>

/**
 * Resolve the workspace-file reader, reporting the absent remote on the desk.
 * @returns The reader, or undefined after the missing-remote note has been raised.
 */
function deskReadFn(): WorkspaceFileRead | undefined {
  const read = (deskRemote?.['workspaceFiles'] as { read?: WorkspaceFileRead } | undefined)?.read
  if (read === undefined) patchDesk({ note: 'remote.workspaceFiles did not materialize' })
  return read
}

/**
 * One read of a session's desk file. R6 (self-review, 2026-09-27): "the read threw" and "the file
 * is absent" are different facts, so the throw is reported separately instead of collapsing into
 * an absent text the caller would then misread.
 */
type DeskReadResult =
  | { readonly ok: true; readonly text: string | undefined }
  | { readonly ok: false }

/**
 * Read `.desk/state.json` through the given reader and unwrap the manifest envelope.
 * @param read - The workspace-file reader.
 * @param sessionId - The session whose workspace is read.
 * @returns The unwrapped text, or the fact that the read threw.
 */
async function readDeskText(read: WorkspaceFileRead, sessionId: string): Promise<DeskReadResult> {
  try {
    const result = await read(sessionId, '.desk/state.json', {})
    const wrapped = result as { ok?: boolean, value?: { text?: string } }
    return { ok: true, text: wrapped?.ok === false ? undefined : wrapped?.value?.text }
  } catch {
    return { ok: false }
  }
}

/**
 * The one message for a file that parses but carries none of the contract's shape. It would
 * otherwise render as a legitimately empty desk — every section honest "（没有…）" while the
 * assistant believes it just refreshed the principal.
 */
const NOT_A_DESK_MESSAGE = '这份房间数据文件不像 desk-refresh 写的（没有 generatedAt、也没有任何分区）——点「刷新房间数据」让助手按契约重写'

/**
 * Adopt one accepted desk file: settle the pending action it answers and retire a receipt it has
 * moved past. Both read paths end here, so "the file moved" means the same thing to both.
 * @param parsed - The validated desk file.
 * @param sessionId - The session the file belongs to.
 */
function settleLoadedDesk(parsed: DeskData, sessionId: string): void {
  settlePending(parsed.generatedAt, sessionId)
  retireStaleReceipt(parsed, sessionId)
}

/**
 * Read `.desk/state.json` for the newest Session that has one. The file is per-workspace, so
 * walk the recent Sessions and say which workspace answered — a silent miss reads as breakage.
 */
export function loadDesk(): void {
  const read = deskReadFn()
  if (read === undefined) return
  const store = deskSessions?.list
  if (store === undefined) {
    patchDesk({ note: 'the client Session store is not available' })
    return
  }
  const state = store.getSnapshot() as {
    ids?: string[]
    byId?: Record<string, { updatedAt?: number, cwd?: string }>
  }
  const ids = state?.ids ?? []
  const byId = state?.byId ?? {}
  const ordered = ids
    .slice()
    .sort((left, right) => Number(byId[right]?.updatedAt ?? 0) - Number(byId[left]?.updatedAt ?? 0))
    .slice(0, 5)
  if (ordered.length === 0) {
    patchDesk({ note: '还没有会话——先和助手说句话，再点刷新房间数据' })
    return
  }
  const newest = ids.reduce((max, id) => Math.max(max, Number(byId[id]?.updatedAt ?? 0)), 0)
  patchDesk({ sessionUpdatedAt: newest === 0 ? undefined : newest })
  const seqOf = sliceSeq(getDeskStore())
  const seq = seqOf.next()
  // R6 (self-review, 2026-09-27): "the read threw" and "the file is absent" are different facts.
  // The walk deliberately falls through on a failed read (A4: an older session's desk must never
  // be presented as the present one), but when EVERY attempt threw, claiming the file does not
  // exist is a lie the principal cannot see through.
  let readFailures = 0
  const attempt = async (index: number): Promise<void> => {
    if (seq !== seqOf.current()) return
    if (index >= ordered.length) {
      if (readFailures > 0) {
        patchDesk({ readError: `读房间数据文件失败（${readFailures} 个工作区都读不到）——点「刷新房间数据」重试`, note: undefined })
        return
      }
      patchDesk({ note: '最近 5 个会话的工作区里都没有 .desk/state.json——点「刷新房间数据」让助手写一份' })
      return
    }
    const sessionId = ordered[index] as string
    // Only the READ may fall through to the next session (the file is simply absent). A file
    // that is PRESENT but corrupt must stop and say so: silently rendering an older session's
    // desk as the present is exactly how a CEO gets lied to (A4).
    const outcome = await readDeskText(read, sessionId)
    if (seq !== seqOf.current()) return
    if (!outcome.ok) {
      readFailures += 1
      await attempt(index + 1)
      return
    }
    const text = outcome.text
    if (typeof text !== 'string' || text.trim() === '') {
      await attempt(index + 1)
      return
    }
    let parsed: DeskData
    try {
      parsed = JSON.parse(text) as DeskData
    } catch {
      if (seq === seqOf.current()) {
        patchDesk({ note: `房间数据文件损坏（${byId[sessionId]?.cwd ?? sessionId}）——点「刷新房间数据」让助手重写一份` })
      }
      return
    }
    if (!looksLikeDesk(parsed)) {
      carryRowStateTo(getDeskStore().sourceSession ?? sessionId, sessionId)
      patchDesk({
        data: undefined,
        readError: NOT_A_DESK_MESSAGE,
        source: byId[sessionId]?.cwd ?? '', sourceSession: sessionId, jumpError: undefined,
      })
      return
    }
    // Re-homing the walk view: the flat fields become this session's, and the previous owner's
    // row state rides into its own slice (R11).
    carryRowStateTo(getDeskStore().sourceSession ?? sessionId, sessionId)
    patchDesk({ data: parsed, note: undefined, source: byId[sessionId]?.cwd ?? '', sourceSession: sessionId, readError: undefined, jumpError: undefined })
    getDeskStore().misses.delete(sessionId)
    settleLoadedDesk(parsed, sessionId)
  }
  void attempt(0)
}

/**
 * Read one Session's desk file — the bound form a right-sidebar tab uses. The tab lives in a
 * specific Session's sidebar, so it reads that Session's workspace directly instead of walking
 * the five newest; a silent miss is remembered so the tab can say "this session has none yet"
 * rather than spinning on a reload that will never answer.
 */
export function loadDeskFor(sessionId: string): void {
  const read = deskReadFn()
  if (read === undefined) return
  // R11: the target session's own slice and load sequence — a load for one session no longer
  // cancels an in-flight read for another.
  const slice = deskSlice(sessionId)
  const seqOf = sliceSeq(slice)
  const seq = seqOf.next()
  void (async (): Promise<void> => {
    const state = deskSessions?.list?.getSnapshot() as { byId?: Record<string, { cwd?: string, updatedAt?: number }> } | undefined
    const cwd = state?.byId?.[sessionId]?.cwd ?? ''
    // A2: the bound form's staleness line must track ITS session's conversation — without this
    // the warning was computed once at startup and then frozen wrong forever.
    const updatedAt = state?.byId?.[sessionId]?.updatedAt
    if (seq !== seqOf.current()) return
    if (updatedAt !== undefined) patchSlice(slice, { sessionUpdatedAt: Number(updatedAt) })
    const outcome = await readDeskText(read, sessionId)
    if (seq !== seqOf.current()) return
    if (!outcome.ok) {
      // R6 (self-review, 2026-09-27): a throw used to land only in `note`, and the right-pane tab
      // returns before any Panel renders notes — so a failed read showed "正在读这个会话的房间数据…"
      // forever, with no retry anywhere. `readError` is the field the tab and the panels both
      // render an error-and-retry from, so a failure reaches the principal wherever he is.
      patchSlice(slice, { readError: `读房间数据文件失败（${cwd === '' ? '本会话工作区' : cwd}）` })
      return
    }
    const text = outcome.text
    if (typeof text !== 'string' || text.trim() === '') {
      getDeskStore().misses.add(sessionId)
      return
    }
    // A5: a corrupt file is an ERROR with a retry, not "reading…" forever — and it must not
    // leave another session's data in place behind the guard.
    let parsed: DeskData
    try {
      parsed = JSON.parse(text) as DeskData
    } catch {
      getDeskStore().misses.delete(sessionId)
      patchSlice(slice, { readError: '房间数据文件损坏（JSON 解析失败）', data: undefined, pending: undefined })
      return
    }
    getDeskStore().misses.delete(sessionId)
    if (!looksLikeDesk(parsed)) {
      patchSlice(slice, {
        data: undefined,
        readError: NOT_A_DESK_MESSAGE,
        source: cwd,
      })
      return
    }
    patchSlice(slice, { data: parsed, source: cwd, readError: undefined })
    patchDesk({ note: undefined, jumpError: undefined })
    // A first targeted load may be the flat slice's first owner (the walk never answered): claim
    // it so later walks carry row state instead of re-attributing it (R11).
    if (slice === (getDeskStore() as DeskSlice) && getDeskStore().sourceSession === undefined) {
      patchDesk({ sourceSession: sessionId })
    }
    settleLoadedDesk(parsed, sessionId)
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
