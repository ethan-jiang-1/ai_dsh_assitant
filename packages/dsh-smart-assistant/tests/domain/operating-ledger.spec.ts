/**
 * Pure-core fixtures for the operating ledger's reducer and reviver. These are the rules the
 * Host service and the projection both stand on; testing them through the service is slower and
 * hides which invariant broke. The four cases here are the ones every later slice relies on:
 * revision growth, idempotent replay, same-id/different-content refusal, and unknown-matter
 * refusal that still leaves a receipt.
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_LEDGER, applyOperation, reviveLedgerState, type LedgerOperation } from '../../src/domain/operating/ledger.ts'

const source = { sessionId: 'session-a', quote: '原话' }
const at = '2026-10-28T00:00:00.000Z'
const create = (operationId = 'op-create'): LedgerOperation => ({
  kind: 'create', operationId, title: '回款 A', summary: '等财务凭证', source,
})

describe('applyOperation', () => {
  it('opens a matter at revision 1 and grows it on a matching update', () => {
    const first = applyOperation(EMPTY_LEDGER, create(), at)
    expect(first.receipt.outcome).toEqual({ status: 'committed', revision: 1 })
    const second = applyOperation(first.state, {
      kind: 'update', operationId: 'op-update', matterId: first.receipt.matterId,
      observedRevision: 1, summary: '凭证到了', source,
    }, at)
    expect(second.receipt.outcome).toEqual({ status: 'committed', revision: 2 })
  })

  it('replays the same operation without a second application', () => {
    const first = applyOperation(EMPTY_LEDGER, create(), at)
    const replay = applyOperation(first.state, create(), at)
    expect(replay.state).toBe(first.state)
    expect(replay.receipt).toEqual(first.receipt)
  })

  it('rejects the same operation id with different content and keeps the stored receipt', () => {
    const first = applyOperation(EMPTY_LEDGER, create(), at)
    const conflict = applyOperation(first.state, {
      kind: 'create', operationId: 'op-create', title: '另一个标题', source,
    }, at)
    // Same id, different title: the reducer refuses rather than mutating the first receipt.
    expect(conflict.receipt.outcome).toEqual({ status: 'rejected', reason: 'operation-content-mismatch' })
    expect(conflict.state.operations['op-create']?.receipt).toEqual(first.receipt)
  })

  it('rejects an operation against an unknown matter but records the refusal', () => {
    const result = applyOperation(EMPTY_LEDGER, {
      kind: 'update', operationId: 'op-unknown', matterId: 'm-999',
      observedRevision: 1, summary: '无主', source,
    }, at)
    expect(result.receipt.outcome).toEqual({ status: 'rejected', reason: 'unknown-matter' })
    expect(result.state.operations['op-unknown']?.receipt.outcome).toEqual(result.receipt.outcome)
  })
})

describe('reviveLedgerState', () => {
  it('backfills the fields a pre-compaction home did not write', () => {
    const revived = reviveLedgerState({ version: 1, matters: { m: {} }, operations: { a: 1 } })
    expect(revived.operationCount).toBe(1)
    expect(revived.matters.m?.proposals).toEqual([])
    expect(revived.unclaimed).toEqual({})
    expect(revived.nextUnclaimedSeq).toBe(1)
  })

  it('refuses a non-v1 state instead of coercing it', () => {
    expect(() => reviveLedgerState({ version: 2 })).toThrow(/not a v1 operating ledger state/)
  })
})
