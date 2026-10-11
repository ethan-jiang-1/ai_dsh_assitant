/**
 * The ledger → projection renderer (desk-operating-entry K3, slice E): the read-only Web view
 * derived on demand from the authoritative ledger state — never a second persisted truth.
 *
 * Acceptance points (each `it` is one, red before green):
 * 1. Matters carry identity, per-matter revision, the three ledger times, evidence with
 *    optional event positioning, and pending/confirmed proposals.
 * 2. Every persisted operation receipt is present flat (the read-back unit for slice F).
 * 3. The envelope revision counts operations (monotonic), and unclaimed fragments list.
 */

import { describe, expect, it } from 'vitest'
import { applyOperation, EMPTY_LEDGER } from '../../src/domain/operating/ledger.ts'
import { renderLedgerProjection } from '../../src/domain/operating/projection.ts'

describe('renderLedgerProjection (v2 read-only view of the ledger)', () => {
  it('carries matter identity, revision, times, evidence, and proposals', () => {
    let state = EMPTY_LEDGER
    const created = applyOperation(state, {
      kind: 'create',
      operationId: 'op-e-1',
      title: 'NB-02 第二期回款',
      summary: '合同 NB-02 第二期款',
      responsible: '财务',
      times: { promisedDeadline: '2026-10-13', nextCheckpoint: '2026-10-13' },
      source: { sessionId: 'session-A', quote: '约定 10/13，帮我盯着' },
    }, '2026-10-10T08:00:00.000Z')
    state = created.state
    state = applyOperation(state, {
      kind: 'update',
      operationId: 'op-e-2',
      matterId: created.receipt.matterId,
      observedRevision: 1,
      forecast: { at: '2026-10-15', source: { sessionId: 'session-B', quote: '财务预测 10/15' } },
      materials: [{ note: '财务已收到发票', source: { sessionId: 'session-B', quote: '发票到了' } }],
      source: { sessionId: 'session-B' },
    }, '2026-10-10T09:00:00.000Z').state
    state = applyOperation(state, {
      kind: 'propose',
      operationId: 'op-e-3',
      matterId: created.receipt.matterId,
      change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
      source: { sessionId: 'session-B', quote: '客户口头说推迟' },
    }, '2026-10-10T10:00:00.000Z').state

    const projection = renderLedgerProjection(state, 'assistant-operating', '2026-10-10T11:00:00.000Z')
    expect(projection.schemaVersion).toBe(2)
    expect(projection.ledgerId).toBe('assistant-operating')
    expect(projection.revision).toBe(3)
    expect(projection.generatedAt).toBe('2026-10-10T11:00:00.000Z')
    expect(projection.matters).toHaveLength(1)
    const matter = projection.matters[0]!
    expect(matter.id).toBe(created.receipt.matterId)
    expect(matter.status).toBe('active')
    expect(matter.revision).toBe(1)
    expect(matter.times).toEqual({ promisedDeadline: '2026-10-13', forecastAt: '2026-10-15', nextCheckpoint: '2026-10-13' })
    expect(matter.evidence.map(item => item.note)).toEqual(['合同 NB-02 第二期款', '财务已收到发票'])
    expect(matter.evidence[0]?.eventId).toBeUndefined()
    expect(matter.evidence[0]?.quote).toBe('约定 10/13，帮我盯着')
    expect(matter.proposals).toEqual([{
      id: 'p-1', kind: 'reschedule', status: 'pending', proposedAt: '2026-10-10T10:00:00.000Z',
      source: { sessionId: 'session-B', quote: '客户口头说推迟' },
    }])
    expect(projection.unclaimed).toEqual([])
    expect(projection.reminders).toEqual([])
  })

  it('carries proposal provenance, resolution links, and proposal-rejection receipt details', () => {
    let state = EMPTY_LEDGER
    const created = applyOperation(state, {
      kind: 'create', operationId: 'op-projection-reject-create', title: 'NB-02 第二期回款',
      times: { promisedDeadline: '2026-10-13', nextCheckpoint: '2026-10-13' }, source: { sessionId: 'session-A' },
    }, '2026-10-10T08:00:00.000Z')
    state = created.state
    state = applyOperation(state, {
      kind: 'propose', operationId: 'op-projection-reject-propose', matterId: created.receipt.matterId,
      change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
      source: { sessionId: 'session-B', quote: '客户可能推迟到 10/20' },
    }, '2026-10-10T09:00:00.000Z').state
    state = applyOperation(state, {
      kind: 'reject', operationId: 'op-projection-reject', matterId: created.receipt.matterId, proposalId: 'p-1',
      source: { sessionId: 'session-B', quote: '明确拒绝改期' },
    }, '2026-10-10T10:00:00.000Z').state

    const projection = renderLedgerProjection(state, 'assistant-operating', '2026-10-10T11:00:00.000Z')
    expect(projection.matters[0]?.proposals[0]).toEqual({
      id: 'p-1', kind: 'reschedule', status: 'rejected', proposedAt: '2026-10-10T09:00:00.000Z',
      source: { sessionId: 'session-B', quote: '客户可能推迟到 10/20' }, resolutionOperationId: 'op-projection-reject',
    })
    expect(projection.receipts.find(receipt => receipt.operationId === 'op-projection-reject')).toEqual({
      operationId: 'op-projection-reject', matterId: created.receipt.matterId, sessionId: 'session-B',
      submittedAt: '2026-10-10T10:00:00.000Z', status: 'proposal-rejected', proposalId: 'p-1', revision: 1,
    })
  })

  it('preserves the proposal id on a confirmation receipt', () => {
    let state = EMPTY_LEDGER
    const created = applyOperation(state, {
      kind: 'create', operationId: 'op-projection-confirm-create', title: 'NB-02 第二期回款',
      times: { promisedDeadline: '2026-10-13' }, source: { sessionId: 'session-A' },
    }, '2026-10-10T08:00:00.000Z')
    state = created.state
    state = applyOperation(state, {
      kind: 'propose', operationId: 'op-projection-confirm-propose', matterId: created.receipt.matterId,
      change: { kind: 'reschedule', promisedDeadline: '2026-10-20' }, source: { sessionId: 'session-B' },
    }, '2026-10-10T09:00:00.000Z').state
    state = applyOperation(state, {
      kind: 'confirm', operationId: 'op-projection-confirm', matterId: created.receipt.matterId, proposalId: 'p-1',
      source: { sessionId: 'session-B' },
    }, '2026-10-10T10:00:00.000Z').state

    const projection = renderLedgerProjection(state, 'assistant-operating', '2026-10-10T11:00:00.000Z')
    expect(projection.matters[0]?.proposals[0]).toMatchObject({
      id: 'p-1', status: 'confirmed', resolutionOperationId: 'op-projection-confirm',
    })
    expect(projection.receipts.find(receipt => receipt.operationId === 'op-projection-confirm')).toEqual({
      operationId: 'op-projection-confirm', matterId: created.receipt.matterId, sessionId: 'session-B',
      submittedAt: '2026-10-10T10:00:00.000Z', status: 'committed', revision: 2, proposalId: 'p-1',
    })
  })

  it('flattens every persisted receipt for read-back and lists unclaimed fragments', () => {
    let state = EMPTY_LEDGER
    const created = applyOperation(state, {
      kind: 'create', operationId: 'op-e-10', title: 'NB-02 第二期回款',
      source: { sessionId: 'session-A' },
    }, '2026-10-10T08:00:00.000Z')
    state = created.state
    state = applyOperation(state, {
      kind: 'update', operationId: 'op-e-11', matterId: created.receipt.matterId, observedRevision: 1,
      title: 'NB-02 二期货款', source: { sessionId: 'session-B' },
    }, '2026-10-10T09:00:00.000Z').state
    state = applyOperation(state, {
      kind: 'update', operationId: 'op-e-12', matterId: created.receipt.matterId, observedRevision: 1,
      title: '抢修订', source: { sessionId: 'session-C' },
    }, '2026-10-10T09:30:00.000Z').state
    state = applyOperation(state, {
      kind: 'note', operationId: 'op-e-13', note: '有人说款已付，没说哪笔合同',
      source: { sessionId: 'session-C', quote: '已经付了' },
    }, '2026-10-10T10:00:00.000Z').state

    const projection = renderLedgerProjection(state, 'assistant-operating', '2026-10-10T11:00:00.000Z')
    expect(projection.revision).toBe(4)
    expect(projection.receipts.map(receipt => receipt.operationId)).toEqual(['op-e-10', 'op-e-11', 'op-e-12', 'op-e-13'])
    expect(projection.receipts[1]).toEqual({
      operationId: 'op-e-11', matterId: created.receipt.matterId, sessionId: 'session-B', submittedAt: '2026-10-10T09:00:00.000Z',
      status: 'committed', revision: 2,
    })
    expect(projection.receipts[2]).toEqual({
      operationId: 'op-e-12', matterId: created.receipt.matterId, sessionId: 'session-C', submittedAt: '2026-10-10T09:30:00.000Z',
      status: 'conflict', observedRevision: 1, currentRevision: 2,
    })
    expect(projection.receipts[3]).toEqual({
      operationId: 'op-e-13', matterId: '', sessionId: 'session-C', submittedAt: '2026-10-10T10:00:00.000Z',
      status: 'retained', unclaimedId: 'u-1',
    })
    expect(projection.unclaimed).toEqual([{ id: 'u-1', note: '有人说款已付，没说哪笔合同', sessionId: 'session-C' }])
  })
})
