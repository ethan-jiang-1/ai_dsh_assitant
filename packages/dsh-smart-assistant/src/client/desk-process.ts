/**
 * The desk processing path and its auto-return judge (desk-operating-entry K3, slice F).
 *
 * One explicit processing path = one bound matter + one processing session + the revision
 * observed at binding time. The judge crosses the durable receipts in the projection with
 * the live session state; a settled turn and an idle session are necessary, never
 * sufficient — a fresh committed receipt or matched proposal-rejection receipt from the
 * processing session, read back at a revision at least as fresh as the observed one and
 * submitted after binding, returns the desk only when this path has no pending proposal.
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
  readonly proposalId?: string
  readonly submittedAt: string
}

/** Proposal attribution and resolution fields carried by the operating projection. */
export interface JudgeProposal {
  readonly id: string
  readonly matterId: string
  /** Source session and creation time establish whether the proposal belongs to this path. */
  readonly sessionId?: string
  readonly proposedAt?: string
  readonly status: string
  readonly resolutionOperationId?: string
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
  readonly projection: {
    readonly status: string
    readonly stale?: boolean
    readonly receipts: readonly JudgeReceipt[]
    readonly matterIds: ReadonlySet<string>
    readonly proposals: readonly JudgeProposal[]
  }
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
  /** Visual-only matter details shown in the bound session; never submitted to the model. */
  readonly displayContext?: { readonly title: string; readonly summary: string }
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
 * not running, its turn settled, and no interaction pending; the projection is ready and fresh;
 * the processing session has a committed receipt or a proposal-rejection receipt linked to the
 * resolved proposal, at a revision at least as fresh as the observed one and submitted after
 * binding; no proposal created on this path remains pending; and the matter still exists.
 * Reminder sync does not block the return but is reported as an unsynced notice.
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
  if (input.projection.status !== 'ready') reasons.push('projection-not-ready')
  if (input.projection.stale === true) reasons.push('projection-stale')

  const own = input.projection.receipts.filter(receipt => receipt.matterId === path.matterId && receipt.sessionId === path.sessionId)
  const pathProposals = input.projection.proposals.filter(proposal =>
    proposal.matterId === path.matterId && proposal.sessionId === path.sessionId
      && proposal.proposedAt !== undefined && proposal.proposedAt >= path.boundAt)
  const fresh = (receipt: JudgeReceipt): boolean =>
    (receipt.revision ?? 0) >= path.observedRevision && receipt.submittedAt >= path.boundAt
  const resolutionReadBack = (proposal: JudgeProposal): boolean => {
    if (proposal.resolutionOperationId === undefined) return false
    return own.some(receipt => receipt.operationId === proposal.resolutionOperationId
      && receipt.proposalId === proposal.id
      && fresh(receipt)
      && ((proposal.status === 'confirmed' && receipt.status === 'committed')
        || (proposal.status === 'rejected' && receipt.status === 'proposal-rejected')))
  }
  const pending = pathProposals.some(proposal => proposal.status === 'pending')
  if (pending) reasons.push('pending-proposal')
  if (pathProposals.some(proposal => proposal.status !== 'pending' && !resolutionReadBack(proposal))) {
    reasons.push('proposal-resolution-not-read-back')
  }

  const eligibleReceipts = own.filter(receipt => receipt.status === 'committed'
    || (receipt.status === 'proposal-rejected' && pathProposals.some(proposal =>
      proposal.id === receipt.proposalId && proposal.status === 'rejected' && proposal.resolutionOperationId === receipt.operationId)))
  if (own.length === 0) {
    reasons.push('receipt-not-read-back')
  } else if (eligibleReceipts.length === 0) {
    reasons.push(`receipt-${own[0]?.status}`)
  } else if (!eligibleReceipts.some(receipt => (receipt.revision ?? 0) >= path.observedRevision)) {
    reasons.push('receipt-stale-revision')
  } else if (!eligibleReceipts.some(receipt => fresh(receipt))) {
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
