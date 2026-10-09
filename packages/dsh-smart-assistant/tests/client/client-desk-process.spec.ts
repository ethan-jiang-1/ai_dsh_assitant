/**
 * The desk processing path and its auto-return judge (desk-operating-entry K3, slice F).
 *
 * The seam is the pure client core: an explicitly bound matter + processing session, the
 * submission identity saved by the UI, and the judge that crosses the durable receipts in the
 * projection with the live session state. Navigation and subscriptions belong to the wiring;
 * every rule here is driven directly. The negative matrix is the spec card's own "必须会失败
 * 的行为" list — each `it` is one row, red before green:
 *
 * 1. A selected but B submitted: the binding refuses the mismatched matter.
 * 2. Double submission: same operation identity replays, same key with different content is refused.
 * 3. First reply only asks: turn settled + session idle but no read-back — stay.
 * 4. B's or an old receipt cannot settle A's path; a stale revision cannot either.
 * 5. Model self-report without a receipt never returns.
 * 6. A rejected/conflicted receipt or a pending interaction stays.
 * 7. The principal left the path: a late success may refresh the matter but never navigates back.
 * 8. Unsycned reminders allow the return but must carry the notice, never "overall success".
 * Plus the positive chain: everything holds — return, still selecting the same matter.
 */

import { describe, expect, it } from 'vitest'
import { bindProcessPath, judgeReturn, recordSubmission } from '../../src/client/desk-process.ts'

const receipts = (list: readonly { operationId: string, matterId: string, status: string, revision?: number, observedRevision?: number, reason?: string }[]) => list
const committedA = { operationId: 'op-f-1', matterId: 'm-A', status: 'committed', revision: 3 }
const sessionDone = { running: false, turnSettled: true, pendingInteraction: false }

describe('processing path binding', () => {
  it('refuses a submission whose matter is not the bound matter (A selected, B submitted)', () => {
    const path = bindProcessPath('m-A', 'session-1')
    expect(() => recordSubmission(path, { operationId: 'op-x', matterId: 'm-B', observedRevision: 2, content: '更新 B' }))
      .toThrow(/bound to m-A/)
  })

  it('replays a double submission of the same identity and refuses the same key with new content', () => {
    const path = bindProcessPath('m-A', 'session-1')
    const once = recordSubmission(path, { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '补充发票已到' })
    const again = recordSubmission(once, { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '补充发票已到' })
    expect(again.submission).toEqual(once.submission)
    expect(() => recordSubmission(once, { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '改口的内容' }))
      .toThrow(/same operation identity with different content/)
  })
})

describe('auto-return judge (the negative matrix)', () => {
  it('stays when the first reply only asked: turn settled and idle, no read-back', () => {
    const path = recordSubmission(bindProcessPath('m-A', 'session-1'), { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '补充' })
    const decision = judgeReturn(path, {
      projection: { receipts: [], matterIds: new Set(['m-A']) },
      session: sessionDone, onPath: true, reminders: 'synced',
    })
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('receipt-not-read-back')
  })

  it('stays when another matter\'s receipt or an old operation tries to settle this path', () => {
    const path = recordSubmission(bindProcessPath('m-A', 'session-1'), { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 5, content: '补充' })
    // B's receipt under a different identity, and an older A receipt under a different identity.
    const foreign = judgeReturn(path, {
      projection: { receipts: receipts([{ operationId: 'op-f-9', matterId: 'm-B', status: 'committed', revision: 9 }, { operationId: 'op-old', matterId: 'm-A', status: 'committed', revision: 2 }]), matterIds: new Set(['m-A', 'm-B']) },
      session: sessionDone, onPath: true, reminders: 'synced',
    })
    expect(foreign.decision).toBe('stay')
    expect(foreign.reasons).toContain('receipt-not-read-back')
    // The right identity but a stale revision (a receipt from before the observed state).
    const stale = judgeReturn(path, {
      projection: { receipts: receipts([{ operationId: 'op-f-1', matterId: 'm-A', status: 'committed', revision: 4 }]), matterIds: new Set(['m-A']) },
      session: sessionDone, onPath: true, reminders: 'synced',
    })
    expect(stale.decision).toBe('stay')
    expect(stale.reasons).toContain('receipt-stale-revision')
  })

  it('stays on a model self-report: no submission identity means nothing to settle', () => {
    const path = bindProcessPath('m-A', 'session-1')
    const decision = judgeReturn(path, {
      projection: { receipts: receipts([{ ...committedA, operationId: 'op-someone-else' }]), matterIds: new Set(['m-A']) },
      session: sessionDone, onPath: true, reminders: 'synced',
    })
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('no-submission')
  })

  it('stays on a rejected or conflicted receipt, and while an interaction is pending', () => {
    const path = recordSubmission(bindProcessPath('m-A', 'session-1'), { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '补充' })
    const rejected = judgeReturn(path, {
      projection: { receipts: receipts([{ operationId: 'op-f-1', matterId: 'm-A', status: 'rejected', reason: 'operation-content-mismatch' }]), matterIds: new Set(['m-A']) },
      session: sessionDone, onPath: true, reminders: 'synced',
    })
    expect(rejected.decision).toBe('stay')
    expect(rejected.reasons).toContain('receipt-rejected')
    const awaitingApproval = judgeReturn(path, {
      projection: { receipts: [], matterIds: new Set(['m-A']) },
      session: { running: false, turnSettled: true, pendingInteraction: true }, onPath: true, reminders: 'synced',
    })
    expect(awaitingApproval.decision).toBe('stay')
    expect(awaitingApproval.reasons).toContain('pending-interaction')
  })

  it('never navigates back after the principal left the path, even on a late success', () => {
    const path = recordSubmission(bindProcessPath('m-A', 'session-1'), { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '补充' })
    const decision = judgeReturn(path, {
      projection: { receipts: receipts([committedA]), matterIds: new Set(['m-A']) },
      session: sessionDone, onPath: false, reminders: 'synced',
    })
    expect(decision.decision).toBe('stay')
    expect(decision.reasons).toContain('user-left-path')
  })

  it('returns with an explicit unsynced-reminders notice, never as overall success', () => {
    const path = recordSubmission(bindProcessPath('m-A', 'session-1'), { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '补充' })
    const decision = judgeReturn(path, {
      projection: { receipts: receipts([committedA]), matterIds: new Set(['m-A']) },
      session: sessionDone, onPath: true, reminders: 'pending',
    })
    expect(decision.decision).toBe('return')
    expect(decision.remindersUnsynced).toBe(true)
    expect(decision.reasons).toContain('reminders-unsynced')
  })

  it('returns when every condition holds, still selecting the same matter', () => {
    const path = recordSubmission(bindProcessPath('m-A', 'session-1'), { operationId: 'op-f-1', matterId: 'm-A', observedRevision: 2, content: '补充发票已到' })
    const decision = judgeReturn(path, {
      projection: { receipts: receipts([committedA]), matterIds: new Set(['m-A']) },
      session: sessionDone, onPath: true, reminders: 'synced',
    })
    expect(decision).toEqual({ decision: 'return', matterId: 'm-A', reasons: [], remindersUnsynced: false })
  })
})
