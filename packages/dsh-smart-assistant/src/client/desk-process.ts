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
export type DeskPath = ProcessingPath | IntakePath | ClaimPath | WakePath

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
  const reasons: string[] = []
  if (!input.onPath) reasons.push('user-left-path')
  if (input.session.running !== false) reasons.push('session-running')
  if (!input.session.turnSettled) reasons.push('turn-open')
  if (input.session.pendingInteraction) reasons.push('pending-interaction')
  if (input.projection.status !== 'ready') reasons.push('projection-not-ready')
  if (input.projection.stale === true) reasons.push('projection-stale')

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
  const reasons: string[] = []
  if (!input.onPath) reasons.push('user-left-path')
  if (input.session.running !== false) reasons.push('session-running')
  if (!input.session.turnSettled) reasons.push('turn-open')
  if (input.session.pendingInteraction) reasons.push('pending-interaction')
  if (input.projection.status !== 'ready') reasons.push('projection-not-ready')
  if (input.projection.stale === true) reasons.push('projection-stale')

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
  const reasons: string[] = []
  if (!input.onPath) reasons.push('user-left-path')
  if (input.session.running !== false) reasons.push('session-running')
  if (!input.session.turnSettled) reasons.push('turn-open')
  if (input.session.pendingInteraction) reasons.push('pending-interaction')
  if (input.projection.status !== 'ready') reasons.push('projection-not-ready')
  if (input.projection.stale === true) reasons.push('projection-stale')

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

/** The matter fields the processing-session seed needs (structural view of a projection matter). */
export interface ProcessingContextMatter {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly times: { readonly promisedDeadline?: string; readonly nextCheckpoint?: string }
}

/**
 * The visible context note seeded into a fresh processing session (principal decision,
 * 2026-10-11: the matter IS the session's context). The sender prefixes the `[面板]` marker
 * so the log keeps machine-written prompts apart from the principal's own words.
 * @param matter - the bound matter from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function processingContextMessage(matter: ProcessingContextMatter): string {
  const times = [
    matter.times.promisedDeadline !== undefined ? `承诺 ${matter.times.promisedDeadline}` : undefined,
    matter.times.nextCheckpoint !== undefined ? `核对 ${matter.times.nextCheckpoint}` : undefined,
  ].filter(part => part !== undefined).join('、')
  const head = `正在处理事项「${matter.title}」（${matter.id}）`
  return `${head}${times === '' ? '' : `：${times}`}。${matter.summary} 首次回应前先成功读取绑定事项：assistant_operating read ${matter.id}。读回失败时明确说明无法核实，不能写入或假装完整。成功后按六类交接：目的与委托原话、进展事实、已定决定及其依据、承诺/预测/核对/完成四种时间、业务未知或待裁决、已有下一步；无记录就说未知，建议须与已定下一步分开。材料里的预测不改变承诺，待确认提案不能说成已决定。随后等我具体指令；普通进展仍按既有规则留存，明确变更与推断提案遵循各自权限。`
}

/** The unclaimed-fragment fields the claim-session seed needs (structural projection view). */
export interface ClaimContextFragment {
  readonly id: string
  readonly note: string
  readonly sessionId: string
}

/**
 * The visible context note seeded into a claim session (principal direction, 2026-10-12: the
 * fragment IS the session's context). The decision the desk cannot make — which matter this is,
 * or that it is a new one — is the conversation's whole point; the seed names the fragment,
 * states the no-guess rule, and points at the tool path. Like the matter seed, the sender
 * prefixes the `[面板]` marker so the log keeps machine-written prompts apart from the
 * principal's own words.
 * @param fragment - the bound fragment from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function claimContextMessage(fragment: ClaimContextFragment): string {
  return `正在处理待认领片段（unclaimed ${fragment.id}，来自 ${fragment.sessionId}）：「${fragment.note}」。这条信息还没归户——请先与我确认它属于哪件在办事项、还是应当立为新事项；等我明确答复后，再用 assistant_operating claim（带 unclaimed_id ${fragment.id}）或 entrust 落账，并保留原文与来源。未经我确认不要自行归户。`
}

/** The settled-matter fields the wake-session seed needs (structural projection view). */
export interface WakeContextMatter {
  readonly id: string
  readonly title: string
  readonly status: 'completed' | 'abandoned'
  readonly summary: string
}

/**
 * The visible context note seeded into a wake session (principal direction, 2026-10-12: waking
 * always has a cause — something changed). The seed names the settled matter, states the
 * cause-first rule (the reason becomes a ledger material), and points at the reopen tool path.
 * Like the other seeds, the sender prefixes the `[面板]` marker so the log keeps machine-written
 * prompts apart from the principal's own words.
 * @param matter - the bound matter from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function wakeContextMessage(matter: WakeContextMatter): string {
  const stateLabel = matter.status === 'completed' ? '已完成' : '已放弃'
  return `正在唤醒一件${stateLabel}的事项「${matter.title}」（${matter.id}）。重新打开它需要一个理由——请先与我确认是什么变化需要唤醒它（比如出现了新的情况、之前的了结有误）；等我明确答复后，先用 assistant_operating read ${matter.id} 核对台账，再用 assistant_operating reopen（带上变化原因）落账，原因会作为材料入账。未经我确认不要自行 reopen。`
}
