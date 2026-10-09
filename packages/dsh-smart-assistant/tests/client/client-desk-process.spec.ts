/**
 * The desk processing path and its auto-return judge (desk-operating-entry K3, slice F).
 *
 * The seam is the pure client core: an explicitly bound matter + processing session + the
 * revision observed at binding time. The judge crosses the durable receipts in the projection
 * with the live session state; a settled turn and an idle session are necessary, never
 * sufficient — only the processing session's own committed receipt, read back at a revision
 * at least as fresh as the observed one and submitted after the binding, returns the desk.
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
 */

import { describe, expect, it } from 'vitest'
import { bindProcessPath, judgeReturn, type JudgeSession } from '../../src/client/desk-process.ts'

interface Receipt { operationId: string, matterId: string, sessionId: string, status: string, revision?: number, submittedAt: string }

const BOUND_AT = '2026-10-10T12:00:00.000Z'
const boundA = (observedRevision = 2) => bindProcessPath('m-A', 'session-1', observedRevision, BOUND_AT)
/** The judge session view; `running: undefined` models the unknown state failing closed. */
const session = (over: { running?: boolean | undefined, turnSettled?: boolean | undefined, pendingInteraction?: boolean } = {}): JudgeSession =>
  ({ running: false, turnSettled: true, pendingInteraction: false, ...over })
const judge = (path: ReturnType<typeof boundA>, receipts: Receipt[], extra: Partial<Parameters<typeof judgeReturn>[1]> = {}) =>
  judgeReturn(path, {
    projection: { receipts, matterIds: new Set(['m-A']) },
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
