/** Wire JSON validation: fixed envelope, explicit identities, unique matters and traceable evidence. */
import { describe, expect, it } from 'vitest'
import { parseOperatingProjection } from '../../src/client/operating-projection'

const empty = { schemaVersion: 1, ledgerId: 'ledger-a', revision: 7, matters: [] }
const matter = { id: 'payment-a', title: '回款 A', status: 'active', summary: '等待核对', evidence: [{ id: 'source-a', sessionId: 'session-a', eventId: 'event-a', quote: '下周核对' }] }

describe('operating projection wire parser', () => {
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
    expect(parseOperatingProjection(empty)).toEqual(empty)
    expect(parseOperatingProjection({ ...empty, matters: [matter], fixture: true })).toEqual({ ...empty, matters: [matter], fixture: true })
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
