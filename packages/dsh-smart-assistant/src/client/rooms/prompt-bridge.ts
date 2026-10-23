/**
 * The desk→conversation bridge: the request shapes and the send path that put the browser
 * face's lines into the conversation — the panel's action lines (`[面板] `), the desk capture
 * row's own words (`[桌面] `), and the tracked send with its read-back poller. One shape
 * (`panelPromptRequest`) states the remote-channel contract once; each caller keeps only its
 * own send semantics.
 *
 * Split from `room-data-io.ts`: that module keeps the fetch/bind/load I/O over the host routes;
 * this one is the bridge into the Session, not io.
 *
 * @module dsh-smart-assistant/client/prompt-bridge
 */
import {
  deskGeneratedAtMs, deskSlice, expirePending, patchDesk, patchSlice,
} from './room-data-core'
import { getDeskRemote, newestSessionId, reloadDesk } from './room-data-io'

/**
 * The marker every machine-written panel line carries: without it the conversation log —
 * and the usage meter — cannot tell a panel's assertion from the principal's own words, so his
 * history fills with text he never typed and the meter counts the panel as the human.
 */
const PANEL_MARKER = '[面板] '

/**
 * The desk's own intake marker (desk-side capture, 2026-10-18). A line the principal typed into
 * the desk's capture row is not a panel action: the log must keep the two apart, because the
 * model treats them differently (a panel action is the desk acting; this is the principal
 * speaking from the desk).
 */
const DESK_CAPTURE_MARKER = '[桌面] '

/**
 * The one-page home's marker (2026-10-23). A line typed on the home is the principal asking for a
 * page — not a fragment dropped on the desk. The two lanes must stay apart: the desk capture lane
 * is note-first ("retain it, ask before promoting"), which is exactly wrong for the home, where the
 * first answer must be the page (found live 2026-10-23: the home input used the desk lane and the
 * model noted the line and asked a clarifying question instead of producing the page).
 */
export const HOME_PAGE_MARKER = '[首页] '

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
 * The desk-side capture request (2026-10-18): the principal's own words typed on the desk, sent
 * into the intake conversation with the desk marker. One shape, so the arm cannot drift from
 * the marker the model is taught to read.
 * @param sessionId - The conversation the line lands in.
 * @param text - The principal's words, verbatim.
 * @returns The prompt request body `remote.session.prompt` takes.
 */
export function deskCaptureRequest(sessionId: string, text: string): ReturnType<typeof panelPromptRequest> {
  return panelPromptRequest('desk-capture', sessionId, text, DESK_CAPTURE_MARKER)
}

/**
 * The one-page home's free-text request: the principal's words from the page, carrying the home
 * marker that makes the model produce a page instead of retaining a fragment.
 * @param sessionId - The conversation the line lands in.
 * @param text - The principal's words, verbatim.
 * @returns The prompt request body `remote.session.prompt` takes.
 */
export function homePageRequest(sessionId: string, text: string): ReturnType<typeof panelPromptRequest> {
  return panelPromptRequest('home-page', sessionId, text, HOME_PAGE_MARKER)
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
  const prompt = (getDeskRemote()?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
  // A tab bound to session X passes X explicitly: a correction typed beside one conversation
  // that lands in another would read as the assistant ignoring what was just pointed at. The
  // old global `sendSession` slot made the LAST mounted tab steal every send; the target
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
  // only the desk file moving past its `at` may retire it (narrow review, 2026-09-27).
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
      // Progress resets the budget: approval turns used to run 60–90s each
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
