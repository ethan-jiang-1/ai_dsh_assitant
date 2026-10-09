/**
 * The desk processing path and its auto-return judge (desk-operating-entry K3, slice F).
 *
 * One explicit processing path = one bound matter + one processing session + the revision
 * observed at binding time. The judge crosses the durable receipts in the projection with
 * the live session state; a settled turn and an idle session are necessary, never
 * sufficient — only the processing session's own committed receipt, read back at a revision
 * at least as fresh as the observed one and submitted after the binding, returns the desk.
 * The composer is an owner-only chain slot, so the client cannot mint the operation identity
 * into the message; the association rides the receipt's source session instead. The
 * principal leaving the path always wins over a late success: the matter may refresh, the
 * navigation never comes back. Unsycned reminders allow the return but carry an explicit
 * notice, never an overall success.
 *
 * This module is the pure core; navigation, subscriptions, and session wiring live in the
 * panel layer. The path state is in-memory by design: a reload reads the authoritative
 * projection first and never replays a previous path or re-submits. An unknown running state
 * fails closed (treated as running).
 */

/** The narrow receipt view the judge needs from a parsed projection. */
export interface JudgeReceipt {
  readonly operationId: string
  readonly matterId: string
  /** The session that submitted the operation. */
  readonly sessionId: string
  readonly status: string
  readonly revision?: number
  readonly submittedAt: string
}

/** The narrow session state view the judge needs (from the platform session-status hook). */
export interface JudgeSession {
  /** Latest known running state; `undefined` until established — fails closed as running. */
  readonly running: boolean | undefined
  /** Turn settlement; `undefined` until established — fails closed as an open turn. */
  readonly turnSettled: boolean | undefined
  readonly pendingInteraction: boolean
}

/** What the judge is allowed to look at. */
export interface ReturnJudgeInput {
  readonly projection: { readonly receipts: readonly JudgeReceipt[]; readonly matterIds: ReadonlySet<string> }
  readonly session: JudgeSession
  /** Whether the principal is still on this processing path. */
  readonly onPath: boolean
  /** Reminder sync state for this processing path (V4/V5 lane; 'synced' until it exists). */
  readonly reminders: 'synced' | 'pending' | 'failed'
}

/** The outcome: return to the desk (still selecting the bound matter) or stay, with reasons. */
export interface ReturnDecision {
  readonly decision: 'return' | 'stay'
  readonly matterId: string
  /** Why the path stays; on return, notices like 'reminders-unsynced'. */
  readonly reasons: readonly string[]
  readonly remindersUnsynced: boolean
}

/** One explicit processing path: the matter, its processing session, and what was observed. */
export interface ProcessingPath {
  readonly matterId: string
  readonly sessionId: string
  /** Binding instant (ISO); receipts submitted before it never settle this path. */
  readonly boundAt: string
  /** The matter revision observed at binding; read-back must be at least this fresh. */
  readonly observedRevision: number
}

/**
 * Bind one matter to one processing session at its currently observed revision — the explicit
 * routing step; never guessed from the most recent session.
 * @param matterId - The matter being processed.
 * @param sessionId - The processing session handling it.
 * @param observedRevision - The matter's revision as currently read in the projection.
 * @param boundAt - Binding instant (ISO); defaults to now.
 * @returns The bound path.
 */
export function bindProcessPath(matterId: string, sessionId: string, observedRevision: number, boundAt: string = new Date().toISOString()): ProcessingPath {
  return { matterId, sessionId, boundAt, observedRevision }
}

/**
 * Judge whether this path may return to the desk now.
 *
 * Returns only when ALL hold: the principal is still on the path; the session is known to be
 * not running, its turn settled, and no interaction pending; the processing session's own
 * receipt for the bound matter is committed at a revision at least as fresh as the observed
 * one, submitted after the binding; and the matter still exists. Reminder sync does not block
 * the return but is reported as an unsynced notice.
 *
 * @param path - The bound processing path.
 * @param input - The projection receipts, session state, presence, and reminder sync.
 * @returns The decision with machine-readable reasons.
 */
export function judgeReturn(path: ProcessingPath, input: ReturnJudgeInput): ReturnDecision {
  const reasons: string[] = []
  if (!input.onPath) reasons.push('user-left-path')
  if (input.session.running !== false) reasons.push('session-running')
  if (!input.session.turnSettled) reasons.push('turn-open')
  if (input.session.pendingInteraction) reasons.push('pending-interaction')
  const own = input.projection.receipts.filter(receipt => receipt.matterId === path.matterId && receipt.sessionId === path.sessionId)
  if (own.length === 0) {
    reasons.push('receipt-not-read-back')
  } else if (!own.some(receipt => receipt.status === 'committed')) {
    reasons.push(`receipt-${own[0]?.status}`)
  } else if (!own.some(receipt => receipt.status === 'committed' && (receipt.revision ?? 0) >= path.observedRevision)) {
    reasons.push('receipt-stale-revision')
  } else if (!own.some(receipt => receipt.status === 'committed' && (receipt.revision ?? 0) >= path.observedRevision && receipt.submittedAt >= path.boundAt)) {
    reasons.push('receipt-before-binding')
  }
  if (!input.projection.matterIds.has(path.matterId)) reasons.push('matter-vanished')
  const remindersUnsynced = input.reminders !== 'synced'
  if (reasons.length > 0) return { decision: 'stay', matterId: path.matterId, reasons, remindersUnsynced }
  return {
    decision: 'return',
    matterId: path.matterId,
    reasons: remindersUnsynced ? ['reminders-unsynced'] : [],
    remindersUnsynced,
  }
}
