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

/**
 * Read `.desk/state.json` for the newest Session that has one. The file is per-workspace, so
 * walk the recent Sessions and say which workspace answered — a silent miss reads as breakage.
 */
export function loadDesk(): void {
  const read = (deskRemote?.['workspaceFiles'] as {
    read?: (sessionId: string, path: string, options: unknown) => Promise<unknown>
  } | undefined)?.read
  const store = deskSessions?.list
  if (read === undefined) {
    patchDesk({ note: 'remote.workspaceFiles did not materialize' })
    return
  }
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
    let text: string | undefined
    try {
      const result = await read(sessionId, '.desk/state.json', {})
      if (seq !== seqOf.current()) return
      const wrapped = result as { ok?: boolean, value?: { text?: string } }
      text = wrapped?.ok === false ? undefined : wrapped?.value?.text
    } catch {
      if (seq === seqOf.current()) {
        readFailures += 1
        await attempt(index + 1)
      }
      return
    }
    if (typeof text !== 'string' || text.trim() === '') {
      if (seq === seqOf.current()) await attempt(index + 1)
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
      // A file that parses but carries none of the contract's shape would render as a legitimately
      // empty desk: every section shows its honest "（没有…）" and the principal reads "nothing is
      // happening" while the assistant believes it just refreshed him.
      carryRowStateTo(getDeskStore().sourceSession ?? sessionId, sessionId)
      patchDesk({
        data: undefined,
        readError: '这份房间数据文件不像 desk-refresh 写的（没有 generatedAt、也没有任何分区）——点「刷新房间数据」让助手按契约重写',
        source: byId[sessionId]?.cwd ?? '', sourceSession: sessionId, jumpError: undefined,
      })
      return
    }
    // Re-homing the walk view: the flat fields become this session's, and the previous owner's
    // row state rides into its own slice (R11).
    carryRowStateTo(getDeskStore().sourceSession ?? sessionId, sessionId)
    patchDesk({ data: parsed, note: undefined, source: byId[sessionId]?.cwd ?? '', sourceSession: sessionId, readError: undefined, jumpError: undefined })
    getDeskStore().misses.delete(sessionId)
    settlePending(parsed.generatedAt, sessionId)
    retireStaleReceipt(parsed, sessionId)
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
  const read = (deskRemote?.['workspaceFiles'] as {
    read?: (sessionId: string, path: string, options: unknown) => Promise<unknown>
  } | undefined)?.read
  if (read === undefined) {
    patchDesk({ note: 'remote.workspaceFiles did not materialize' })
    return
  }
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
    let text: string | undefined
    try {
      const result = await read(sessionId, '.desk/state.json', {})
      if (seq !== seqOf.current()) return
      const wrapped = result as { ok?: boolean, value?: { text?: string } }
      text = wrapped?.ok === false ? undefined : wrapped?.value?.text
    } catch {
      // R6 (self-review, 2026-09-27): a throw used to land only in `note`, and the right-pane tab
      // returns before any Panel renders notes — so a failed read showed "正在读这个会话的房间数据…"
      // forever, with no retry anywhere. `readError` is the field the tab and the panels both
      // render an error-and-retry from, so a failure reaches the principal wherever he is.
      if (seq === seqOf.current()) {
        patchSlice(slice, { readError: `读房间数据文件失败（${cwd === '' ? '本会话工作区' : cwd}）` })
      }
      return
    }
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
        readError: '这份房间数据文件不像 desk-refresh 写的（没有 generatedAt、也没有任何分区）——点「刷新房间数据」让助手按契约重写',
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
    settlePending(parsed.generatedAt, sessionId)
    retireStaleReceipt(parsed, sessionId)
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
  // A10: panel messages carry a marker so the conversation log (and the usage meter) can tell
  // machine-written prompts from the principal's own words — otherwise the principal's history
  // fills with assertions they never typed, and the meter counts the panel as the human.
  const marked = `[面板] ${text}`
  void prompt({
    requestId: `desk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: target,
    mode: 'queue',
    content: [{ type: 'text', text: marked }],
  }).then((result: unknown) => {
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

/**
 * Every desk action ends the same way: the desk-refresh skill owns the rewrite. Naming the
 * skill in the message makes the model's path explicit instead of hoping skill discovery fires
 * on a small model (measured 2026-09-26: cold discovery skipped the skill on 2 of 3 live runs).
 * The panel and the skill ship together; the pairing is recorded on the campaign card §四·十九.
 */
const DESK_REFRESH_STEP = '完成后加载 desk-refresh 技能，把房间数据文件重写一遍。'
export { DESK_REFRESH_STEP }

/** Ask the assistant to refresh the room data file; the poller re-reads until it actually moves. */
export function askRefresh(sessionId?: string): void {
  sendPrompt('刷新房间数据：加载 desk-refresh 技能，严格按它把房间数据文件（.desk/state.json）重写一遍。', '刷新房间数据', 'desk', sessionId)
}

/**
 * Day-0's true start (real-user walk finding, 2026-10-06): on a desk-less folder the
 * refresh button produced an honest zero-report loop with no meaning — the principal
 * clicked it three times "not knowing what I'm doing". The empty desk's next step is the
 * first conversation, not a refresh; this invites that conversation in this session (on a
 * fresh folder the first-conversation skill takes it from here).
 */
export function askStart(sessionId?: string): void {
  sendPrompt('开始第一件事：从最近要我拍板、还要跟进的一件事说起。', '开始第一件事', 'desk', sessionId)
}

/**
 * Inline skill-proposal approval (B2, 2026-10-06): the click IS the approval — the prompt
 * asks the assistant to edit the proposal file's status to approved and then land_skill it
 * in the same turn. Same one-click shape as the knowledge draft's 批准 button, so every
 * review queue on the principal's surface is in-place, not a separate chore.
 */
export function askApproveProposal(name: string, sessionId?: string): void {
  sendPrompt(
    `面板代本人批准技能提案「${name}」：请把提案文件的 status 改为 approved，然后立刻 land_skill 落地。${DESK_REFRESH_STEP}`,
    '批准提案', name, sessionId,
  )
}

/** The rejection twin: the proposal is rejected with the principal's one-line reason. */
export function askRejectProposal(name: string, reason: string, sessionId?: string): void {
  sendPrompt(
    `面板代本人拒绝技能提案「${name}」：请把提案文件的 status 改为 rejected（理由：${reason}）。${DESK_REFRESH_STEP}`,
    '拒绝提案', name, sessionId,
  )
}

/**
 * Correct one memory record. This is the cultivation loop: the principal says which line is
 * wrong and what is right, and the assistant rewrites the record and refreshes the desk.
 */
export function correctMemory(text: string, correction: string, rowId: string, sessionId?: string): void {
  sendPrompt(
    `请更正这条记忆。原记录：「${text}」。正确的是：${correction}。${DESK_REFRESH_STEP}`,
    '更正', rowId, sessionId,
  )
}

/**
 * Approve one draft knowledge page. The counterpart of a correction: the principal says the page
 * is right, and the assistant promotes it so it starts counting in retrieval and the digest.
 *
 * Direct-call lane (approve-direct-call): the click IS the approval, so the flip goes straight
 * to the host service — seconds, not a model round trip — and the service writes the ledger
 * line (audit/approvals.jsonl, source: panel-direct). Without a session id, or before the
 * remote namespace mounts (first boot after install), it falls back to the legacy prompt path,
 * which is honest degradation rather than a silently lost approval. The desk file itself still
 * lists the row as a draft until the next desk-refresh turn rewrites it — a panel-side re-read
 * of the room state is the direct-call card's open item, so the success branch reports the
 * flip instead of pretending the desk already reflects it.
 */
export function approveKnowledgePage(title: string, rowId: string, sessionId?: string): void {
  const namespace = deskRemote?.assistantKnowledge as { approvePage?: (request: unknown) => Promise<unknown> } | undefined
  if (typeof namespace?.approvePage === 'function' && sessionId !== undefined) {
    void namespace.approvePage({ pageId: rowId, sessionId, title }).then((result: unknown) => {
      const outcome = result as { ok?: boolean, error?: { message?: string } }
      if (outcome?.ok === false) {
        patchDesk({ note: outcome.error?.message ?? '批准未生效' })
        return
      }
      patchDesk({ note: `已批准：「${title}」入 stable（下次房间数据刷新移出待审）` })
    }).catch((reason: unknown) => {
      const text = String(reason)
      if (text.includes('only drafts flip')) {
        // Already stable — nothing to approve; the fallback prompt would ask the model to
        // re-promote a promoted page (idempotent but misleading).
        patchDesk({ note: '该页已是 stable，无需再批' })
        return
      }
      patchDesk({ note: `直调批准失败，回退指令通道：${text}` })
      sendPrompt(
        `面板代本人批准——知识页「${title}」已获批准：请把它从 draft 翻成 stable。${DESK_REFRESH_STEP}`,
        '批准', rowId, sessionId,
      )
    })
    return
  }
  sendPrompt(
    `面板代本人批准——知识页「${title}」已获批准：请把它从 draft 翻成 stable。${DESK_REFRESH_STEP}`,
    '批准', rowId, sessionId,
  )
}

/**
 * Mark one stable knowledge page past its use-by date. The page stays in place (links resolve)
 * but stops counting as current — the third lifecycle step beside approval and correction.
 */
export function deprecateKnowledgePage(title: string, rowId: string, sessionId?: string): void {
  sendPrompt(
    `知识页「${title}」过时了，请把它标记为 deprecated（保留在原处以便链接解析）。${DESK_REFRESH_STEP}`,
    '过时了', rowId, sessionId,
  )
}

/** Tell the assistant what is wrong with one knowledge page. */
export function flagKnowledgePage(title: string, problem: string, rowId: string, sessionId?: string): void {
  sendPrompt(
    `知识页「${title}」有问题：${problem}。请核对并更正这一页。${DESK_REFRESH_STEP}`,
    '提意见', rowId, sessionId,
  )
}
