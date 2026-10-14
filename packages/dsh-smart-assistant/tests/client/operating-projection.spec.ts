/** Wire JSON validation: fixed envelope, identities, and traceable evidence; cross-layer Host renderer → Client parser contract. */
import { describe, expect, it } from 'vitest'
import { parseOperatingProjection, type OperatingProjection } from '../../src/client/operating-projection'
import { applyOperation, EMPTY_LEDGER } from '../../src/domain/operating/ledger.ts'
import { renderLedgerProjection } from '../../src/domain/operating/projection.ts'

const empty = { schemaVersion: 1, ledgerId: 'ledger-a', revision: 7, matters: [] }
const matter = { id: 'payment-a', title: '回款 A', status: 'active', summary: '等待核对', evidence: [{ id: 'source-a', sessionId: 'session-a', eventId: 'event-a', quote: '下周核对' }] }

describe('operating projection wire parser', () => {
  it('accepts the Host renderer envelope through the shared Client wire contract', () => {
    const wire: OperatingProjection = renderLedgerProjection(EMPTY_LEDGER, 'ledger-a', '2026-10-10T11:00:00.000Z')
    expect(parseOperatingProjection(wire)).toEqual({
      schemaVersion: 2, ledgerId: 'ledger-a', revision: 0, matters: [], receipts: [], unclaimed: [],
    })
  })

  it('accepts and preserves Host-rendered matter evidence, proposal provenance, and receipt biography', () => {
    const created = applyOperation(EMPTY_LEDGER, {
      kind: 'create', operationId: 'op-create', title: '回款 A', summary: '首笔材料',
      source: { sessionId: 'session-a', quote: '下周核对' },
    }, '2026-10-10T08:00:00.000Z')
    const proposed = applyOperation(created.state, {
      kind: 'propose', operationId: 'op-propose', matterId: created.receipt.matterId,
      change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
      source: { sessionId: 'session-b', quote: '客户推迟到 10/20' },
    }, '2026-10-10T09:00:00.000Z')
    const wire: OperatingProjection = renderLedgerProjection(proposed.state, 'ledger-a', '2026-10-10T11:00:00.000Z')
    const parsed = parseOperatingProjection(wire)

    expect(parsed.matters[0]?.evidence[0]).toEqual({
      id: 'mat-m-1-1', sessionId: 'session-a', quote: '下周核对', note: '首笔材料', receivedAt: '2026-10-10T08:00:00.000Z',
    })
    expect(parsed.matters[0]?.proposals[0]).toEqual({
      id: 'p-1', kind: 'reschedule', status: 'pending', proposedAt: '2026-10-10T09:00:00.000Z',
      source: { sessionId: 'session-b', quote: '客户推迟到 10/20' },
    })
    expect(parsed.receipts).toEqual([
      { operationId: 'op-create', matterId: 'm-1', sessionId: 'session-a', submittedAt: '2026-10-10T08:00:00.000Z', status: 'committed', revision: 1, kind: 'create', quote: '下周核对' },
      { operationId: 'op-propose', matterId: 'm-1', sessionId: 'session-b', submittedAt: '2026-10-10T09:00:00.000Z', status: 'proposed', proposalId: 'p-1', kind: 'propose', quote: '客户推迟到 10/20' },
    ])
  })

  it('owns an immutable projection independent of mutable wire objects', () => {
    const input = { ...empty, matters: [{ ...matter, evidence: matter.evidence.map(item => ({ ...item })) }] }
    const parsed = parseOperatingProjection(input)
    input.matters[0]?.evidence.splice(0)
    input.matters.splice(0)
    expect(parsed.matters).toHaveLength(1)
    expect(parsed.matters[0]?.evidence).toHaveLength(1)
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.matters)).toBe(true)
    expect(Object.isFrozen(parsed.matters[0]?.evidence)).toBe(true)
  })

  it('accepts empty and complete projections without a selected Session', () => {
    const parsedEmpty = { schemaVersion: 1 as const, ledgerId: 'ledger-a', revision: 7, matters: [], receipts: [], unclaimed: [] }
    expect(parseOperatingProjection(empty)).toEqual(parsedEmpty)
    const parsedMatter = {
      id: 'payment-a', title: '回款 A', status: 'active' as const, summary: '等待核对', responsible: '', revision: 1,
      times: {}, proposals: [],
      evidence: [{ id: 'source-a', sessionId: 'session-a', eventId: 'event-a', quote: '下周核对', note: '下周核对' }],
    }
    expect(parseOperatingProjection({ ...empty, matters: [matter], fixture: true }))
      .toEqual({ ...parsedEmpty, matters: [parsedMatter], fixture: true })
  })
  it.each([
    null, [], {}, { ...empty, schemaVersion: 2 }, { ...empty, revision: -1 },
    { ...empty, revision: 1.5 }, { ...empty, ledgerId: '' },
    { ...empty, matters: [matter, matter] },
    { ...empty, matters: [{ ...matter, status: 'probably-done' }] },
    { ...empty, matters: [{ ...matter, evidence: [{ id: 'x', quote: 'source invented' }] }] },
  ])('rejects malformed/ambiguous identity instead of treating it as an empty ledger', input => {
    expect(() => parseOperatingProjection(input)).toThrow('invalid operating projection')
  })
})

describe('v2 ledger-render envelope (K3 slice E)', () => {
  const v2 = {
    schemaVersion: 2, ledgerId: 'assistant-operating', revision: 3, generatedAt: '2026-10-10T11:00:00.000Z',
    matters: [{
      id: 'm-1', title: '回款 A', status: 'abandoned', summary: '等待核对', responsible: '财务', revision: 2,
      times: { promisedDeadline: '2026-10-13', forecastAt: '2026-10-15', completedAt: '2026-10-16T04:00:00.000Z' },
      evidence: [{ id: 'mat-m-1-1', sessionId: 'session-a', note: '到账回单', quote: '银行回单：已到账' }],
      proposals: [{
         id: 'p-1', kind: 'reschedule', status: 'pending', proposedAt: '2026-10-10T09:00:00.000Z',
         source: { sessionId: 'session-b', quote: '客户可能推迟到 10/20' },
       }],
    }],
    receipts: [{ operationId: 'op-1', matterId: 'm-1', sessionId: 'session-a', submittedAt: '2026-10-10T08:00:00.000Z', status: 'committed', revision: 2 }],
    unclaimed: [{ id: 'u-1', note: '有人说款已付', sessionId: 'session-c' }],
    reminders: [],
  }

  it('parses revisioned matters with times, proposals, receipts, and unclaimed fragments', () => {
    const parsed = parseOperatingProjection(JSON.parse(JSON.stringify(v2)))
    expect(parsed.schemaVersion).toBe(2)
    expect(parsed.matters[0]?.status).toBe('abandoned')
    expect(parsed.matters[0]?.revision).toBe(2)
    expect(parsed.matters[0]?.times.promisedDeadline).toBe('2026-10-13')
    expect(parsed.matters[0]?.times.completedAt).toBe('2026-10-16T04:00:00.000Z')
    expect(parsed.matters[0]?.responsible).toBe('财务')
    expect(parsed.matters[0]?.evidence[0]?.note).toBe('到账回单')
    expect(parsed.matters[0]?.evidence[0]?.eventId).toBeUndefined()
    expect(parsed.matters[0]?.proposals).toEqual([{
      id: 'p-1', kind: 'reschedule', status: 'pending', proposedAt: '2026-10-10T09:00:00.000Z',
      source: { sessionId: 'session-b', quote: '客户可能推迟到 10/20' },
    }])
    expect(parsed.receipts[0]).toEqual({ operationId: 'op-1', matterId: 'm-1', sessionId: 'session-a', submittedAt: '2026-10-10T08:00:00.000Z', status: 'committed', revision: 2 })
    expect(parsed.unclaimed).toEqual([{ id: 'u-1', note: '有人说款已付', sessionId: 'session-c' }])
  })

  it('keeps additive receipt semantics optional for earlier v2 envelopes', () => {
    const receiptWithoutAdditions = {
      operationId: 'op-1', matterId: 'm-1', sessionId: 'session-a', submittedAt: '2026-10-10T08:00:00.000Z', status: 'committed', revision: 2,
    }
    const typedLegacyReceipt: OperatingProjection['receipts'][number] = receiptWithoutAdditions
    void typedLegacyReceipt

    const parsed = parseOperatingProjection({ ...v2, receipts: [receiptWithoutAdditions] })
    expect(parsed.receipts[0]).toEqual(receiptWithoutAdditions)

    const receiptWithAdditions = { ...receiptWithoutAdditions, kind: 'create', quote: '本人委托' }
    const typedCurrentReceipt: OperatingProjection['receipts'][number] = receiptWithAdditions
    void typedCurrentReceipt
    const parsedWithAdditions = parseOperatingProjection({ ...v2, receipts: [receiptWithAdditions] })
    expect(parsedWithAdditions.receipts[0]).toEqual(receiptWithAdditions)
  })

  it('rejects note-less evidence, unknown statuses, and a non-empty reminders lane', () => {
    const matter = v2.matters[0]!
    const proposal = matter.proposals[0]!
    expect(() => parseOperatingProjection({ ...v2, matters: [{ ...matter, evidence: [{ id: 'e1', sessionId: 's', quote: 'q' }] }] })).toThrow()
    expect(() => parseOperatingProjection({ ...v2, matters: [{ ...matter, status: 'paused' }] })).toThrow()
    expect(() => parseOperatingProjection({ ...v2, reminders: [{ anything: true }] })).toThrow()
    expect(() => parseOperatingProjection({ ...v2, matters: [{ ...matter, proposals: [{ ...proposal, status: 'dismissed' }] }] })).toThrow()
    expect(() => parseOperatingProjection({ ...v2, matters: [{ ...matter, proposals: [{ ...proposal, source: { sessionId: '' } }] }] })).toThrow()
  })

  it('rejects duplicate receipt identities and a missing revision on a v2 matter', () => {
    expect(() => parseOperatingProjection({ ...v2, receipts: [...v2.receipts, { ...v2.receipts[0] }] })).toThrow()
    expect(() => parseOperatingProjection({ ...v2, matters: [{ ...v2.matters[0], revision: undefined }] })).toThrow()
  })
})
