/**
 * The desk processing path and its auto-return judge (desk-operating-entry K3, slice F).
 *
 * The seam is the pure client core: an explicitly bound matter + processing session + the
 * revision observed at binding time. The judge crosses the durable receipts in the projection
 * with the live session state; a settled turn and an idle session are necessary, never
 * sufficient — only the processing session's own committed or proposal-rejection receipt,
 * read back at a revision at least as fresh as the observed one and submitted after binding,
 * with no pending proposal created on this path, returns the desk.
 * The composer is an owner-only chain slot, so the client cannot mint the operation identity
 * into the message; association rides the receipt's source session instead. The negative
 * matrix is the spec card's own list — each `it` is one row, red before green:
 *
 * 1. A selected but B submitted: B's receipt never settles A's path; each binding is its own path.
 * 2. An old receipt (before the binding, or below the observed revision) never settles the path.
 * 3. First reply only asked: turn settled + session idle but no read-back — stay.
 * 4. A model self-report (no receipt at all) never returns.
 * 5. A rejected receipt or a pending interaction stays.
 * 6. The principal left the path: a late success may refresh the matter but never navigates back.
 * 7. Unsycned reminders allow the return but carry the notice, never "overall success".
 * Plus the positive chain: everything holds — return, still selecting the same matter.
 *
 * The intake arm (spec K3's other side: 交代首事 → 明确 Session → 追问补充 → 持久提交 → 读回 →
 * 返回仍选 A) shares those gates; what settles it is a committed receipt for a matter id that was
 * NOT in the projection at binding. Its own negative rows: a first reply that only asks questions
 * (no receipt), a receipt for a matter that already existed (an update, not a creation), a
 * creation that then proposes a change (something waits on the principal), and the same
 * session/presence/readiness gates.
 */

import { describe, expect, it } from 'vitest'
import { bindIntakePath, bindProcessPath, judgeIntakeReturn, judgeReturn, processingContextMessage, type JudgeProposal, type JudgeSession } from '../../src/client/desk-process.ts'

interface Receipt { operationId: string, matterId: string, sessionId: string, status: string, revision?: number, proposalId?: string, submittedAt: string }

const BOUND_AT = '2026-10-10T12:00:00.000Z'
const boundA = (observedRevision = 2) => bindProcessPath('m-A', 'session-1', observedRevision, BOUND_AT)
/** The judge session view; `running: undefined` models the unknown state failing closed. */
const session = (over: { running?: boolean | undefined, turnSettled?: boolean | undefined, pendingInteraction?: boolean } = {}): JudgeSession =>
  ({ running: false, turnSettled: true, pendingInteraction: false, ...over })
const judge = (
  path: ReturnType<typeof boundA>,
  receipts: Receipt[],
  extra: Partial<Parameters<typeof judgeReturn>[1]> = {},
  proposals: readonly JudgeProposal[] = [],
  freshness: { status: string, stale: boolean } = { status: 'ready', stale: false },
) => judgeReturn(path, {
  projection: { receipts, matterIds: new Set(['m-A']), proposals, ...freshness },
  session: session(), onPath: true, reminders: 'synced', ...extra,
})
const freshCommitted = (over: Partial<Receipt> = {}): Receipt => ({
  operationId: 'op-f', matterId: 'm-A', sessionId: 'session-1', status: 'committed', revision: 3,
  submittedAt: '2026-10-10T12:05:00.000Z', ...over,
})

describe('processing path binding', () => {
  it('binds each matter to its own path; B\'s receipt never settles A\'s path', () => {
    const pathA = boundA()
    const pathB = bindProcessPath('m-B', 'session-1', 1, BOUND_AT)
    expect(pathA.matterId).toBe('m-A')
    expect(pathB.matterId).toBe('m-B')
    // B's committed receipt, fresh and after the binding — still not A's read-back.
    const decision = judge(pathA, [freshCommitted({ matterId: 'm-B', operationId: 'op-b' })])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('receipt-not-read-back')
  })
})

describe('auto-return judge (the negative matrix)', () => {
  it('stays when the first reply only asked: turn settled and idle, no read-back', () => {
    const decision = judge(boundA(), [])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('receipt-not-read-back')
  })

  it('stays on an old receipt: before the binding, or below the observed revision', () => {
    const before = judge(boundA(), [freshCommitted({ submittedAt: '2026-10-10T11:00:00.000Z' })])
    expect(before.decision).toBe('stay')
    expect(before.reasons).toContain('receipt-before-binding')
    const stale = judge(boundA(), [freshCommitted({ revision: 1 })])
    expect(stale.decision).toBe('stay')
    expect(stale.reasons).toContain('receipt-stale-revision')
  })

  it('stays on a model self-report: no receipt from this session at all', () => {
    const decision = judge(boundA(), [freshCommitted({ sessionId: 'session-other' })])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('receipt-not-read-back')
  })

  it('stays on a rejected receipt, and while an interaction is pending', () => {
    const rejected = judge(boundA(), [freshCommitted({ status: 'rejected' })])
    expect(rejected.decision).toBe('stay')
    expect(rejected.reasons).toContain('receipt-rejected')
    const awaiting = judge(boundA(), [], { session: session({ pendingInteraction: true }) })
    expect(awaiting.decision).toBe('stay')
    expect(awaiting.reasons).toContain('pending-interaction')
  })

  it('never navigates back after the principal left the path, even on a late success', () => {
    const decision = judge(boundA(), [freshCommitted()], { onPath: false })
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('user-left-path')
  })

  it('stays when this processing path leaves a proposal awaiting a decision', () => {
    const proposal: JudgeProposal = {
      id: 'p-1', matterId: 'm-A', sessionId: 'session-1', proposedAt: '2026-10-10T12:02:00.000Z', status: 'pending',
    }
    const decision = judge(boundA(), [freshCommitted()], {}, [proposal])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('pending-proposal')
  })

  it('returns only after this path reads back the explicit confirmation of its proposal', () => {
    const proposal: JudgeProposal = {
      id: 'p-1', matterId: 'm-A', sessionId: 'session-1', proposedAt: '2026-10-10T12:02:00.000Z',
      status: 'confirmed', resolutionOperationId: 'op-confirm',
    }
    const confirmed = freshCommitted({ operationId: 'op-confirm', proposalId: 'p-1' })
    expect(judge(boundA(), [confirmed], {}, [proposal]).decision).toBe('return')

    const unlinked = freshCommitted({ operationId: 'op-confirm', proposalId: 'p-other' })
    const decision = judge(boundA(), [unlinked], {}, [proposal])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('proposal-resolution-not-read-back')
  })

  it('returns only after this path reads back the explicit rejection of its proposal', () => {
    const proposal: JudgeProposal = {
      id: 'p-1', matterId: 'm-A', sessionId: 'session-1', proposedAt: '2026-10-10T12:02:00.000Z',
      status: 'rejected', resolutionOperationId: 'op-reject',
    }
    const rejected: Receipt = {
      operationId: 'op-reject', matterId: 'm-A', sessionId: 'session-1', status: 'proposal-rejected',
      proposalId: 'p-1', revision: 2, submittedAt: '2026-10-10T12:06:00.000Z',
    }
    const decision = judge(boundA(), [freshCommitted({ revision: 2 }), rejected], {}, [proposal])
    expect(decision.decision).toBe('return')

    const unlinked = judge(boundA(), [freshCommitted({ revision: 2 }), { ...rejected, operationId: 'op-other' }], {}, [proposal])
    expect(unlinked.decision).toBe('stay')
    expect(unlinked.reasons).toContain('proposal-resolution-not-read-back')
  })

  it('does not block on a proposal from another processing path', () => {
    const otherPath: JudgeProposal = {
      id: 'p-other', matterId: 'm-A', sessionId: 'session-other', proposedAt: '2026-10-10T12:02:00.000Z', status: 'pending',
    }
    const prior: JudgeProposal = {
      id: 'p-prior', matterId: 'm-A', sessionId: 'session-1', proposedAt: '2026-10-10T11:59:59.999Z', status: 'pending',
    }
    expect(judge(boundA(), [freshCommitted()], {}, [otherPath, prior]).decision).toBe('return')
  })

  it('fails closed when the projection is stale or not ready', () => {
    const stale = judge(boundA(), [freshCommitted()], {}, [], { status: 'ready', stale: true })
    expect(stale.decision).toBe('stay')
    expect(stale.reasons).toContain('projection-stale')
    const loading = judge(boundA(), [freshCommitted()], {}, [], { status: 'loading', stale: false })
    expect(loading.decision).toBe('stay')
    expect(loading.reasons).toContain('projection-not-ready')
  })

  it('returns with an explicit unsynced-reminders notice, never as overall success', () => {
    const decision = judge(boundA(), [freshCommitted()], { reminders: 'pending' })
    expect(decision.decision).toBe('return')
    expect(decision.remindersUnsynced).toBe(true)
    expect(decision.reasons).toContain('reminders-unsynced')
  })

  it('returns when every condition holds, still selecting the same matter', () => {
    const decision = judge(boundA(), [freshCommitted()])
    expect(decision).toEqual({ decision: 'return', matterId: 'm-A', reasons: [], remindersUnsynced: false })
  })

  it('fails closed while the session is running or its state is unknown', () => {
    expect(judge(boundA(), [freshCommitted()], { session: session({ running: true, turnSettled: false }) }).reasons).toContain('session-running')
    expect(judge(boundA(), [freshCommitted()], { session: session({ running: undefined, turnSettled: undefined }) }).reasons).toContain('session-running')
  })
})

describe('processing-session context seed (principal decision 2026-10-11: the matter IS the context)', () => {
  it('carries the matter identity, confirmed times and the ledger-verification instruction', () => {
    const message = processingContextMessage({ id: 'm-1', title: '合同 NB-02 第二期款到账核对', summary: '第二期款约 2026-10-13 到账。', times: { promisedDeadline: '2026-10-13', nextCheckpoint: '2026-10-13' } })
    expect(message).toContain('正在处理事项「合同 NB-02 第二期款到账核对」（m-1）')
    expect(message).toContain('承诺 2026-10-13、核对 2026-10-13')
    expect(message).toContain('assistant_operating read m-1')
  })

  it('omits the times clause when the matter has none', () => {
    const bare = processingContextMessage({ id: 'm-2', title: 'T', summary: 'S', times: {} })
    expect(bare).not.toContain('承诺')
    expect(bare).toContain('正在处理事项「T」（m-2）')
  })
})

describe('intake path (交代首事 arm)', () => {
  const observed = new Set(['m-A', 'm-B'])
  const intake = (boundAt = BOUND_AT) => bindIntakePath('session-1', observed, boundAt)
  const judgeIntake = (
    path: ReturnType<typeof intake>,
    receipts: Receipt[],
    extra: Partial<Parameters<typeof judgeIntakeReturn>[1]> = {},
    proposals: readonly JudgeProposal[] = [],
    freshness: { status: string, stale: boolean } = { status: 'ready', stale: false },
  ) => judgeIntakeReturn(path, {
    projection: { receipts, matterIds: new Set(['m-A', 'm-B', 'm-C']), proposals, ...freshness },
    session: session(), onPath: true, reminders: 'synced', ...extra,
  })
  const createdReceipt = (over: Partial<Receipt> = {}): Receipt => ({
    operationId: 'op-new', matterId: 'm-C', sessionId: 'session-1', status: 'committed', revision: 1,
    submittedAt: '2026-10-10T12:05:00.000Z', ...over,
  })

  it('returns to the desk selecting the matter this conversation created', () => {
    const decision = judgeIntake(intake(), [createdReceipt()])
    expect(decision.decision).toBe('return')
    expect(decision.matterId).toBe('m-C')
  })

  it('stays while the first reply only asked questions (settled turn, no receipt)', () => {
    const decision = judgeIntake(intake(), [])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('matter-not-entrusted')
  })

  it('never settles on an update to a matter that already existed', () => {
    // A committed receipt — but for m-A, which was in the projection when the path was bound:
    // that is progress on an existing matter, not the intake this path is waiting for.
    const decision = judgeIntake(intake(), [createdReceipt({ matterId: 'm-A', operationId: 'op-update' })])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('matter-not-entrusted')
  })

  it('stays when the new matter still has a pending proposal from this session', () => {
    const proposal: JudgeProposal = { id: 'p-9', matterId: 'm-C', sessionId: 'session-1', status: 'pending', proposedAt: '2026-10-10T12:05:30.000Z' }
    const decision = judgeIntake(intake(), [createdReceipt()], {}, [proposal])
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('pending-proposal')
  })

  it('keeps the same gates: a running session, an open turn, the principal leaving, a stale or unready projection', () => {
    expect(judgeIntake(intake(), [createdReceipt()], { session: session({ running: true }) }).decision).toBe('stay')
    expect(judgeIntake(intake(), [createdReceipt()], { session: session({ running: undefined }) }).reasons).toContain('session-running')
    expect(judgeIntake(intake(), [createdReceipt()], { session: session({ turnSettled: false }) }).reasons).toContain('turn-open')
    expect(judgeIntake(intake(), [createdReceipt()], { session: session({ pendingInteraction: true }) }).reasons).toContain('pending-interaction')
    expect(judgeIntake(intake(), [createdReceipt()], { onPath: false }).reasons).toContain('user-left-path')
    expect(judgeIntake(intake(), [createdReceipt()], {}, [], { status: 'ready', stale: true }).reasons).toContain('projection-stale')
    expect(judgeIntake(intake(), [createdReceipt()], {}, [], { status: 'loading', stale: false }).reasons).toContain('projection-not-ready')
  })

  it('ignores receipts submitted before the binding, and reports a creation that vanished', () => {
    const early = judgeIntake(intake(), [createdReceipt({ submittedAt: '2026-10-10T11:59:00.000Z' })])
    expect(early.decision).toBe('stay')
    expect(early.reasons).toContain('matter-not-entrusted')

    const vanished = judgeIntakeReturn(intake(), {
      projection: { receipts: [createdReceipt()], matterIds: new Set(['m-A', 'm-B']), proposals: [] },
      session: session(), onPath: true, reminders: 'synced',
    })
    expect(vanished.decision).toBe('stay')
    expect(vanished.reasons).toContain('matter-vanished')
  })
})
