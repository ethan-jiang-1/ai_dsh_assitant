/**
 * The desk processing path and its auto-return judge (desk-operating-entry K3, slice F).
 *
 * One explicit processing path = one bound matter + one processing session + the submission
 * identity the UI saves. The judge crosses the durable receipts in the projection with the
 * live session state; a settled turn and an idle session are necessary, never sufficient —
 * only the operation's own committed receipt, read back at a fresh revision for the bound
 * matter, returns the desk. The principal leaving the path always wins over a late success:
 * the matter may refresh, the navigation never comes back. Unsycned reminders allow the
 * return but carry an explicit notice, never an overall success.
 *
 * This module is the pure core; navigation, subscriptions, and session wiring live in the
 * panel layer. The path state is in-memory by design: a reload reads the authoritative
 * projection first and never replays a previous path or re-submits.
 */

/** The narrow receipt view the judge needs from a parsed projection. */
export interface JudgeReceipt {
  readonly operationId: string
  readonly matterId: string
  /** The session that submitted the operation; the wiring layer matches paths by it. */
  readonly sessionId?: string
  readonly status: string
  readonly revision?: number
}

/** The narrow session state view the judge needs (from the platform session hook). */
export interface JudgeSession {
  readonly running: boolean
  readonly turnSettled: boolean
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

/** One recorded submission intent: identity, observed revision, and content fingerprint. */
export interface ProcessingSubmission {
  readonly operationId: string
  readonly matterId: string
  readonly observedRevision: number
  readonly content: string
}

/** One explicit processing path. */
export interface ProcessingPath {
  readonly matterId: string
  readonly sessionId: string
  readonly submission: ProcessingSubmission | undefined
}

/**
 * Bind one matter to one processing session — the explicit routing step; never guessed from
 * the most recent session.
 * @param matterId - The matter being processed.
 * @param sessionId - The processing session handling it.
 * @returns The empty path.
 */
export function bindProcessPath(matterId: string, sessionId: string): ProcessingPath {
  return { matterId, sessionId, submission: undefined }
}

/**
 * Record one submission intent on the path. The same identity with the same content replays
 * (a double click or a lost response must not send twice); the same identity with different
 * content is refused — that is a new judgment and needs a new identity.
 * @param path - The path to record on.
 * @param submission - The submission intent; its matter must be the bound matter.
 * @returns The path with the submission recorded.
 * @throws When the submission targets another matter or reuses an identity with new content.
 */
export function recordSubmission(path: ProcessingPath, submission: ProcessingSubmission): ProcessingPath {
  if (submission.matterId !== path.matterId) {
    throw new Error(`processing path is bound to ${path.matterId}; refusing a submission for ${submission.matterId}`)
  }
  if (path.submission !== undefined && path.submission.operationId === submission.operationId
    && path.submission.content !== submission.content) {
    throw new Error('same operation identity with different content; use a new identity for a new judgment')
  }
  return { ...path, submission }
}

/**
 * Judge whether this path may return to the desk now.
 *
 * Returns only when ALL hold: the principal is still on the path; a submission identity
 * exists; the session is not running, its turn is settled, and no interaction is pending; the
 * submission's own receipt is committed for the bound matter at a revision at least as fresh
 * as the observed one; and the matter still exists. Reminder sync does not block the return
 * but is reported as an unsynced notice.
 *
 * @param path - The processing path with its saved submission identity.
 * @param input - The projection receipts, session state, presence, and reminder sync.
 * @returns The decision with machine-readable reasons.
 */
export function judgeReturn(path: ProcessingPath, input: ReturnJudgeInput): ReturnDecision {
  const reasons: string[] = []
  if (!input.onPath) reasons.push('user-left-path')
  if (path.submission === undefined) {
    reasons.push('no-submission')
  } else {
    const submission = path.submission
    if (input.session.running) reasons.push('session-running')
    if (!input.session.turnSettled) reasons.push('turn-open')
    if (input.session.pendingInteraction) reasons.push('pending-interaction')
    const receipt = input.projection.receipts.find(receipt => receipt.operationId === submission.operationId)
    if (receipt === undefined) {
      reasons.push('receipt-not-read-back')
    } else {
      if (receipt.matterId !== path.matterId) reasons.push('receipt-matter-mismatch')
      if (receipt.status !== 'committed') reasons.push(`receipt-${receipt.status}`)
      if (receipt.revision === undefined || receipt.revision < submission.observedRevision) reasons.push('receipt-stale-revision')
    }
    if (!input.projection.matterIds.has(path.matterId)) reasons.push('matter-vanished')
  }
  const remindersUnsynced = input.reminders !== 'synced'
  if (reasons.length > 0) return { decision: 'stay', matterId: path.matterId, reasons, remindersUnsynced }
  return {
    decision: 'return',
    matterId: path.matterId,
    reasons: remindersUnsynced ? ['reminders-unsynced'] : [],
    remindersUnsynced,
  }
}
