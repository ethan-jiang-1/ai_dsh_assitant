/**
 * The desk processing path and its auto-return judge (desk-operating-entry K3, slice F).
 *
 * TWO ARMS, one rule set. The spec's K3 row asks for both: "本人交代首事**或**选择回款 A →
 * 明确 Session → 追问补充 → Host 持久提交 → 读回同操作 → 返回仍选 A".
 * - the **matter arm**: one bound matter + one processing session + the revision observed at
 *   binding; settled by a fresh committed receipt for that matter in that session;
 * - the **intake arm**: a conversation the principal opened from the desk to tell it about a
 *   matter that does not exist yet; settled by a committed receipt for a matter id that was not
 *   in the projection at binding — the same reconstructible association, one step earlier.
 * Both arms share the gates below (session settled and idle, no pending interaction, projection
 * ready and fresh, the principal still on the path) and both refuse to return while anything
 * waits on the principal (a pending proposal from this session, an open interaction). The judge crosses the durable receipts in the projection with
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
  /** The matter to select on return: the bound one (matter arm) or the newly created one
   *  (intake arm). Absent while an intake path stays — there is nothing to select yet. */
  readonly matterId?: string
  /** Why the path stays; on return, notices like 'reminders-unsynced'. */
  readonly reasons: readonly string[]
  readonly remindersUnsynced: boolean
}

/** One explicit processing path: the matter, its processing session, and what was observed. */
export interface ProcessingPath {
  readonly kind: 'matter'
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
  return { kind: 'matter', matterId, sessionId, boundAt, observedRevision }
}

/**
 * The intake arm: the principal opened a conversation from the desk to tell it about a matter
 * that does not exist yet. There is no matter and no revision to observe; what settles the path
 * is the first committed receipt in that session for a matter id that was not in the projection
 * when the path was bound — a creation, established from the projection instead of guessed from
 * the model's words.
 */
export interface IntakePath {
  readonly kind: 'intake'
  readonly sessionId: string
  /** Binding instant (ISO); receipts submitted before it never settle this path. */
  readonly boundAt: string
  /** Matter ids present in the projection at binding; anything outside is this path's creation. */
  readonly observedMatterIds: ReadonlySet<string>
}

/** Every arm of the desk→conversation path. */
export type DeskPath = ProcessingPath | IntakePath | ClaimPath | DiscardPath | WakePath

/** Whether a matter may open a processing path: only an active one. A settled matter's sole
 *  legal action is waking it (the state machine never offers 「再处理」 on finished work). */
export function canProcess(status: string): boolean {
  return status === 'active'
}

/**
 * The wake arm (principal direction, 2026-10-12: state decides the legal action set). A settled
 * matter binds to one conversation in which the principal states what changed; the model reopens
 * it explicitly, the cause lands as a material, and the matter returns to active — only then does
 * it own the 处理 action again.
 */
export interface WakePath {
  readonly kind: 'wake'
  readonly matterId: string
  readonly sessionId: string
  readonly boundAt: string
  /** The status observed at binding (completed or abandoned) — the settle is it leaving this state. */
  readonly observedStatus: 'completed' | 'abandoned'
}

/**
 * Bind the wake arm.
 * @param matterId - The settled matter being woken.
 * @param sessionId - The conversation in which the principal states the cause.
 * @param observedStatus - The matter's status at binding (completed or abandoned).
 * @param boundAt - Binding instant (ISO); defaults to now.
 * @returns The bound wake path.
 */
export function bindWakePath(matterId: string, sessionId: string, observedStatus: 'completed' | 'abandoned', boundAt: string = new Date().toISOString()): WakePath {
  return { kind: 'wake', matterId, sessionId, boundAt, observedStatus }
}

/**
 * The claim arm (principal direction, 2026-10-12: every desk item selects into a contextual
 * action): an unclaimed fragment bound to one conversation in which the principal decides its
 * home. There is no revision to observe — what settles the path is the fragment leaving the
 * unclaimed lane together with this session's own committed receipt after binding.
 */
export interface ClaimPath {
  readonly kind: 'claim'
  readonly fragmentId: string
  readonly sessionId: string
  /** Binding instant (ISO); receipts submitted before it never settle this path. */
  readonly boundAt: string
}

/**
 * Bind the claim arm.
 * @param fragmentId - The unclaimed fragment being resolved.
 * @param sessionId - The conversation in which the principal decides its home.
 * @param boundAt - Binding instant (ISO); defaults to now.
 * @returns The bound claim path.
 */
export function bindClaimPath(fragmentId: string, sessionId: string, boundAt: string = new Date().toISOString()): ClaimPath {
  return { kind: 'claim', fragmentId, sessionId, boundAt }
}

/**
 * The discard arm (261018 片 0: the fragment's terminal state needs a door): an unclaimed fragment
 * bound to one conversation in which the principal judges it noise. There is no matter to land in,
 * so the settle is the fragment leaving the unclaimed lane **plus** this session's own matterless
 * committed receipt after binding — that receipt is what proves the removal was this discard and
 * not another session's claim.
 */
export interface DiscardPath {
  readonly kind: 'discard'
  readonly fragmentId: string
  readonly sessionId: string
  /** Binding instant (ISO); receipts submitted before it never settle this path. */
  readonly boundAt: string
}

/**
 * Bind the discard arm.
 * @param fragmentId - The unclaimed fragment judged to be noise.
 * @param sessionId - The conversation in which the principal says so.
 * @param boundAt - Binding instant (ISO); defaults to now.
 * @returns The bound discard path.
 */
export function bindDiscardPath(fragmentId: string, sessionId: string, boundAt: string = new Date().toISOString()): DiscardPath {
  return { kind: 'discard', fragmentId, sessionId, boundAt }
}

/**
 * Bind the intake arm.
 * @param sessionId - The conversation the principal will tell the matter to.
 * @param observedMatterIds - The matter ids the projection held at binding (ready, not stale).
 * @param boundAt - Binding instant (ISO); defaults to now.
 * @returns The bound intake path.
 */
export function bindIntakePath(sessionId: string, observedMatterIds: ReadonlySet<string>, boundAt: string = new Date().toISOString()): IntakePath {
  return { kind: 'intake', sessionId, boundAt, observedMatterIds }
}

/**
 * The gates all four arms share: the principal is still on the path; the bound session is known
 * to be not running, its turn settled, and no interaction pending; the projection is ready and
 * fresh. Each arm appends its own settle conditions to these reasons — keeping the shared six in
 * one place is what makes "same gates as the other arms" enforced rather than promised in prose.
 * @param input - The projection, session state, presence, and reminder sync of one bound path.
 * @returns The shared refusal reasons, in the order every judge reports them.
 */
function sharedGateReasons(input: ReturnJudgeInput): string[] {
  const reasons: string[] = []
  if (!input.onPath) reasons.push('user-left-path')
  if (input.session.running !== false) reasons.push('session-running')
  if (!input.session.turnSettled) reasons.push('turn-open')
  if (input.session.pendingInteraction) reasons.push('pending-interaction')
  if (input.projection.status !== 'ready') reasons.push('projection-not-ready')
  if (input.projection.stale === true) reasons.push('projection-stale')
  return reasons
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
  const reasons = sharedGateReasons(input)

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

/**
 * Judge whether the intake arm may return to the desk, and to which matter.
 *
 * Same gates as the matter arm (principal still on the path; session known idle with its turn
 * settled and nothing waiting on the principal; projection ready and fresh), and the same refusal
 * to return while this session still has a pending proposal — a first reply that only asks
 * questions, or that entrusts and then proposes a change, leaves the principal in the
 * conversation. The settle is the first committed receipt in this session for a matter id outside
 * the ids observed at binding, and that matter must still be in the projection: the desk then
 * reopens **selecting the new matter**, which is what "返回仍选 A" means on this arm.
 *
 * @param path - The bound intake path.
 * @param input - The projection receipts/matters, session state, presence, and reminder sync.
 * @returns The decision with machine-readable reasons; `matterId` is set on return.
 */
export function judgeIntakeReturn(path: IntakePath, input: ReturnJudgeInput): ReturnDecision {
  const reasons = sharedGateReasons(input)

  const created = input.projection.receipts
    .filter(receipt => receipt.sessionId === path.sessionId
      && receipt.status === 'committed'
      && receipt.submittedAt >= path.boundAt
      && !path.observedMatterIds.has(receipt.matterId))
    .slice()
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
  const target = created.at(-1)
  // A pending proposal this session raised against the new matter is something to decide, so the
  // desk must not pull the principal out of the conversation (same rule as the matter arm).
  const pendingOnTarget = target !== undefined && input.projection.proposals.some(proposal =>
    proposal.matterId === target.matterId && proposal.sessionId === path.sessionId
      && proposal.status === 'pending' && proposal.proposedAt !== undefined && proposal.proposedAt >= path.boundAt)
  if (pendingOnTarget) reasons.push('pending-proposal')

  const remindersUnsynced = input.reminders !== 'synced'
  // Nothing was entrusted yet (a first reply that only asks questions lands here): stay.
  if (target === undefined) return { decision: 'stay', reasons: [...reasons, 'matter-not-entrusted'], remindersUnsynced }
  if (!input.projection.matterIds.has(target.matterId)) reasons.push('matter-vanished')
  if (reasons.length > 0) return { decision: 'stay', reasons, remindersUnsynced }
  return {
    decision: 'return',
    matterId: target.matterId,
    reasons: remindersUnsynced ? ['reminders-unsynced'] : [],
    remindersUnsynced,
  }
}

/** What the claim judge needs beyond the shared input: the unclaimed ids as currently projected. */
export interface ClaimJudgeInput extends ReturnJudgeInput {
  /** Fragment ids still unresolved in the projection; the bound fragment leaving this set is
   *  the consumption signal (a committed claim's flattened receipt does not carry the id). */
  readonly unclaimedIds: ReadonlySet<string>
}

/**
 * Judge whether the claim arm may return to the desk, and to which matter.
 *
 * Same shared gates as the other arms (principal still on the path; session known idle with its
 * turn settled and nothing waiting on the principal; projection ready and fresh), and the same
 * refusal while this session leaves a pending proposal on the target. The settle is the bound
 * fragment leaving the unclaimed lane **plus** this session's own committed receipt submitted
 * after binding — a claim consumes the fragment without carrying its id in the flattened
 * receipt, so consumption is read from the lane and the association from the source session,
 * the same reconstructible pattern as the intake arm. The return target is the latest such
 * receipt's matter: claim-to-existing selects that matter, claim-by-creating selects the new
 * one. The desk then reopens **selecting that matter**, which is where the fragment landed.
 *
 * @param path - The bound claim path.
 * @param input - The shared judge input plus the currently projected unclaimed ids.
 * @returns The decision with machine-readable reasons; `matterId` is set on return.
 */
export function judgeClaimReturn(path: ClaimPath, input: ClaimJudgeInput): ReturnDecision {
  const reasons = sharedGateReasons(input)

  const own = input.projection.receipts
    .filter(receipt => receipt.sessionId === path.sessionId && receipt.status === 'committed' && receipt.submittedAt >= path.boundAt)
    .slice()
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
  const target = own.at(-1)
  if (input.unclaimedIds.has(path.fragmentId)) reasons.push('fragment-not-claimed')
  if (target === undefined) reasons.push('claim-receipt-not-read-back')
  // A pending proposal this session raised against the target is something to decide, so the
  // desk must not pull the principal out of the conversation (same rule as the other arms).
  const pendingOnTarget = target !== undefined && input.projection.proposals.some(proposal =>
    proposal.matterId === target.matterId && proposal.sessionId === path.sessionId
      && proposal.status === 'pending' && proposal.proposedAt !== undefined && proposal.proposedAt >= path.boundAt)
  if (pendingOnTarget) reasons.push('pending-proposal')
  if (target !== undefined && !input.projection.matterIds.has(target.matterId)) reasons.push('matter-vanished')

  const remindersUnsynced = input.reminders !== 'synced'
  if (reasons.length > 0 || target === undefined) return { decision: 'stay', reasons, remindersUnsynced }
  return {
    decision: 'return',
    matterId: target.matterId,
    reasons: remindersUnsynced ? ['reminders-unsynced'] : [],
    remindersUnsynced,
  }
}

/**
 * Judge whether the discard arm may return to the desk.
 *
 * Same shared gates as the other arms (principal still on the path; session known idle with its
 * turn settled and nothing waiting on the principal; projection ready and fresh). The settle is
 * the bound fragment leaving the unclaimed lane **plus** this session's own matterless committed
 * receipt submitted after binding: a discard leaves no matter behind, so its receipt carries
 * `matterId: ''` (the same matterless shape `note` uses) and that is what distinguishes this
 * removal from another session's claim. There is no matter to select on return — the fragment is
 * gone, and the desk's existing vanished-selection recovery takes over.
 *
 * A discard conversation has nothing to propose; if this session raised a pending proposal anyway,
 * the principal has something to decide, so the desk must not pull them out (the same rule the
 * other arms apply to their targets).
 *
 * @param path - The bound discard path.
 * @param input - The shared judge input plus the currently projected unclaimed ids.
 * @returns The decision with machine-readable reasons; no `matterId` — there is nothing to select.
 */
export function judgeDiscardReturn(path: DiscardPath, input: ClaimJudgeInput): ReturnDecision {
  const reasons = sharedGateReasons(input)

  const own = input.projection.receipts.filter(receipt =>
    receipt.sessionId === path.sessionId && receipt.status === 'committed' && receipt.matterId === ''
      && receipt.submittedAt >= path.boundAt)
  if (input.unclaimedIds.has(path.fragmentId)) reasons.push('fragment-not-discarded')
  if (own.length === 0) reasons.push('discard-receipt-not-read-back')
  const pendingProposal = input.projection.proposals.some(proposal =>
    proposal.sessionId === path.sessionId && proposal.status === 'pending'
      && proposal.proposedAt !== undefined && proposal.proposedAt >= path.boundAt)
  if (pendingProposal) reasons.push('pending-proposal')

  const remindersUnsynced = input.reminders !== 'synced'
  if (reasons.length > 0) return { decision: 'stay', reasons, remindersUnsynced }
  return { decision: 'return', reasons: remindersUnsynced ? ['reminders-unsynced'] : [], remindersUnsynced }
}

/** What the wake judge needs beyond the shared input: each matter's current projected status. */
export interface WakeJudgeInput extends ReturnJudgeInput {
  /** Matter id → status as currently projected; the settle is the bound matter reading back active. */
  readonly matterStatuses: ReadonlyMap<string, string>
}

/**
 * Judge whether the wake arm may return to the desk.
 *
 * Same shared gates as the other arms (principal still on the path; session known idle with its
 * turn settled and nothing waiting on the principal; projection ready and fresh), and the same
 * refusal while this session leaves a pending proposal on the matter. The settle is BOTH halves
 * of "woken": this session's own committed receipt submitted after binding (the explicit reopen)
 * AND the matter's projected status back to active — a reopen receipt alone does not return if
 * the matter still reads settled, and an active reading alone does not return without this
 * session's receipt (the wake may have happened elsewhere).
 *
 * @param path - The bound wake path.
 * @param input - The shared judge input plus the currently projected matter statuses.
 * @returns The decision with machine-readable reasons; `matterId` is set on return.
 */
export function judgeWakeReturn(path: WakePath, input: WakeJudgeInput): ReturnDecision {
  const reasons = sharedGateReasons(input)

  const own = input.projection.receipts
    .filter(receipt => receipt.sessionId === path.sessionId && receipt.status === 'committed' && receipt.submittedAt >= path.boundAt)
  const activeAgain = input.matterStatuses.get(path.matterId) === 'active'
  if (!activeAgain) reasons.push('wake-not-effective')
  if (own.length === 0) reasons.push('wake-receipt-not-read-back')
  // A pending proposal this session raised against the matter is something to decide, so the
  // desk must not pull the principal out of the conversation (same rule as the other arms).
  const pendingOnMatter = input.projection.proposals.some(proposal =>
    proposal.matterId === path.matterId && proposal.sessionId === path.sessionId
      && proposal.status === 'pending' && proposal.proposedAt !== undefined && proposal.proposedAt >= path.boundAt)
  if (pendingOnMatter) reasons.push('pending-proposal')
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
