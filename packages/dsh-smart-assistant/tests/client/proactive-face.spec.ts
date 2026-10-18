/** Proactive face pure core (261018 片1): three honest rows from read-only sources, zero model calls. */
import { describe, expect, it } from 'vitest'
import { deriveProactiveFace, forgetAcceptedWatch, rememberAcceptedWatch, type ProactiveCatalogEntry, type ProactiveProjectionView } from '../../src/client/proactive-face'

const NOW = new Date('2026-10-18T04:00:00.000Z')

function projection(overrides: Partial<ProactiveProjectionView> = {}): ProactiveProjectionView {
  return {
    matters: [],
    receipts: [],
    unclaimed: [],
    ...overrides,
  }
}

type MatterFixture = ProactiveProjectionView['matters'][number]
function matter(overrides: Record<string, unknown> = {}): MatterFixture {
  return {
    id: 'm-1',
    title: '合同 NB-02 二期款核对',
    status: 'active',
    times: { nextCheckpoint: '2026-10-13T01:00:00.000Z' },
    proposals: [],
    ...overrides,
  } as MatterFixture
}

type ReceiptFixture = ProactiveProjectionView['receipts'][number]
function receipt(overrides: Record<string, unknown> = {}): ReceiptFixture {
  return { matterId: 'm-1', submittedAt: '2026-10-14T00:00:00.000Z', ...overrides } as ReceiptFixture
}

function catalogEntry(overrides: Record<string, unknown> = {}): ProactiveCatalogEntry {
  return {
    id: 's-1',
    kind: 'weekly',
    title: '每周对账',
    prompt: '[weekly review]',
    scheduledAt: '2026-10-19T01:00:00.000Z',
    time: '09:00',
    timeZone: 'Asia/Shanghai',
    weekdays: [1],
    sessionId: 'session-a',
    status: 'active',
    ...overrides,
  } as ProactiveCatalogEntry
}

describe('proactive face derivation', () => {
  it('row 1: an active matter past its checkpoint with no receipt after it appears with days overdue', () => {
    const rows = deriveProactiveFace({ projection: projection({ matters: [matter()] }), catalog: [], now: NOW })
    const due = rows.find(row => row.kind === 'due-no-result')
    expect(due).toMatchObject({ matterId: 'm-1', title: '合同 NB-02 二期款核对', daysOverdue: 5 })
  })

  it('row 1: a receipt submitted after the passed moment clears the row (回执之后 semantics)', () => {
    const rows = deriveProactiveFace({
      projection: projection({
        matters: [matter()],
        receipts: [receipt()],
      }),
      catalog: [],
      now: NOW,
    })
    expect(rows.some(row => row.kind === 'due-no-result')).toBe(false)
  })

  it('row 1: a receipt submitted BEFORE the passed moment does not clear the row', () => {
    const rows = deriveProactiveFace({
      projection: projection({
        matters: [matter()],
        receipts: [receipt({ submittedAt: "2026-10-12T00:00:00.000Z" })],
      }),
      catalog: [],
      now: NOW,
    })
    expect(rows.some(row => row.kind === 'due-no-result')).toBe(true)
  })

  it('row 1: settled matters (completed / abandoned) never appear, however overdue', () => {
    const rows = deriveProactiveFace({
      projection: projection({ matters: [matter({ status: 'completed' }), matter({ id: 'm-2', status: 'abandoned' })] }),
      catalog: [],
      now: NOW,
    })
    expect(rows.some(row => row.kind === 'due-no-result')).toBe(false)
  })

  it('row 1: promisedDeadline and nextCheckpoint each count; the earliest passed one wins', () => {
    const rows = deriveProactiveFace({
      projection: projection({ matters: [matter({ times: { promisedDeadline: '2026-10-10T00:00:00.000Z', nextCheckpoint: '2026-10-16T00:00:00.000Z' } })] }),
      catalog: [],
      now: NOW,
    })
    const due = rows.find(row => row.kind === 'due-no-result')
    expect(due).toMatchObject({ dueAt: '2026-10-10T00:00:00.000Z' })
  })

  it('row 1: several overdue matters collapse to the most overdue plus an extraCount', () => {
    const rows = deriveProactiveFace({
      projection: projection({ matters: [matter(), matter({ id: 'm-2', title: '回款提醒', times: { nextCheckpoint: '2026-10-15T00:00:00.000Z' } })] }),
      catalog: [],
      now: NOW,
    })
    const due = rows.find(row => row.kind === 'due-no-result')
    expect(due).toMatchObject({ matterId: 'm-1', extraCount: 1 })
  })

  it('row 1: now boundary — a checkpoint exactly at now counts as passed', () => {
    const rows = deriveProactiveFace({
      projection: projection({ matters: [matter({ times: { nextCheckpoint: NOW.toISOString() } })] }),
      catalog: [],
      now: NOW,
    })
    expect(rows.some(row => row.kind === 'due-no-result')).toBe(true)
  })

  it('row 1: timezone offsets compare as instants, not lexically', () => {
    // 2026-10-13T09:00+08:00 is the SAME instant as 2026-10-13T01:00Z — lexically it sorts after the Z form.
    const rows = deriveProactiveFace({
      projection: projection({ matters: [matter({ times: { nextCheckpoint: '2026-10-13T09:00:00.000+08:00' } })] }),
      catalog: [],
      now: NOW,
    })
    expect(rows.some(row => row.kind === 'due-no-result')).toBe(true)
  })

  it('row 2: pending proposals and unclaimed fragments aggregate into one waiting row', () => {
    const rows = deriveProactiveFace({
      projection: projection({
        matters: [matter({ proposals: [{ id: 'p-1', kind: 'complete', status: 'pending', proposedAt: NOW.toISOString(), source: { kind: 'desk', sessionId: 's' } }, { id: 'p-2', kind: 'revise', status: 'pending', proposedAt: NOW.toISOString(), source: { kind: 'desk', sessionId: 's' } }] })],
        unclaimed: [{ id: 'u-1', note: 'n', sessionId: 's' }],
      }),
      catalog: [],
      now: NOW,
    })
    expect(rows.find(row => row.kind === 'waiting-for-you')).toMatchObject({ pendingProposals: 2, unclaimed: 1, openQuestions: 0 })
  })

  it('row 2: zero pending and zero unclaimed means no row', () => {
    const rows = deriveProactiveFace({ projection: projection(), catalog: [], now: NOW })
    expect(rows.some(row => row.kind === 'waiting-for-you')).toBe(false)
  })

  it('row 3: the earliest active schedule wins; inactive entries are ignored', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [
        catalogEntry(),
        catalogEntry({ id: 's-later', title: '每天看一遍', scheduledAt: '2026-10-20T01:00:00.000Z' }),
        catalogEntry({ id: 's-off', title: '已停的旧排程', status: 'inactive', scheduledAt: '2026-10-18T06:00:00.000Z' }),
      ],
      now: NOW,
    })
    expect(rows.find(row => row.kind === 'next-look')).toMatchObject({ title: '每周对账', nextAt: '2026-10-19T01:00:00.000Z' })
  })

  it('row 3: a delivery later than its target by more than LATE_DELIVERY_MS gets a late note stating the fact only', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [catalogEntry({ lastDelivery: { scheduledAt: '2026-10-13T01:00:00.000Z', deliveredAt: '2026-10-13T08:24:48.000Z', messageId: 'x' } })],
      now: NOW,
    })
    expect(rows.find(row => row.kind === 'next-look')).toMatchObject({ lateByMs: 7 * 3600_000 + 24 * 60_000 + 48_000 })
  })

  it('row 3: a small delivery delay within the threshold gets no late note', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [catalogEntry({ lastDelivery: { scheduledAt: '2026-10-13T01:00:00.000Z', deliveredAt: '2026-10-13T01:00:30.000Z', messageId: 'x' } })],
      now: NOW,
    })
    expect(rows.find(row => row.kind === 'next-look')).not.toHaveProperty('lateByMs')
  })

  it('row 3: different titles carrying ONE identical prompt at the same instant are still duplicates (10-13 incident shape)', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [
        catalogEntry({ id: 's-a', title: '每周对账（周一 09:00）', prompt: '[weekly review] present the weekly reconciliation' }),
        catalogEntry({ id: 's-b', title: '每周复盘（到期承诺与本周期决策）', prompt: '[weekly review] present the weekly reconciliation' }),
      ],
      now: NOW,
    })
    expect(rows.find(row => row.kind === 'next-look')).toMatchObject({ duplicates: 2 })
  })

  it('row 3: same title plus same next instant appearing twice is flagged as duplicates', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [
        catalogEntry({ id: 's-a', sessionId: 'session-a' }),
        catalogEntry({ id: 's-b', sessionId: 'session-b' }),
        catalogEntry({ id: 's-c', title: '不同的事', prompt: '[different business]', scheduledAt: '2026-10-19T01:00:00.000Z' }),
      ],
      now: NOW,
    })
    expect(rows.find(row => row.kind === 'next-look')).toMatchObject({ duplicates: 2 })
  })

  it('row 3: an undefined catalog degrades to an explicit unavailable marker, never a guess', () => {
    const rows = deriveProactiveFace({ projection: projection(), now: NOW })
    expect(rows).toContainEqual(expect.objectContaining({ kind: 'next-look-unavailable' }))
  })

  it('Q5: an accepted watch whose title never appears in the catalog says so honestly', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [catalogEntry()],
      acceptedWatches: [{ id: 'w-1', title: '每天看一遍桌面', at: NOW.toISOString() }],
      now: NOW,
    })
    expect(rows).toContainEqual({ kind: 'watch-mismatch', title: '每天看一遍桌面' })
  })

  it('Q5: an accepted watch whose title IS in the catalog raises no row', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [catalogEntry()],
      acceptedWatches: [{ id: 'w-1', title: '每周对账', at: NOW.toISOString() }],
      now: NOW,
    })
    expect(rows.some(row => row.kind === 'watch-mismatch')).toBe(false)
  })

  it('Q5: an undefined catalog judges nothing (no guess, no false alarm)', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      acceptedWatches: [{ id: 'w-1', title: '每天看一遍桌面', at: NOW.toISOString() }],
      now: NOW,
    })
    expect(rows.some(row => row.kind === 'watch-mismatch')).toBe(false)
  })

  it('Q5: repeated acceptances of one title make ONE row, not a growing stack', () => {
    const rows = deriveProactiveFace({
      projection: projection(),
      catalog: [catalogEntry()],
      acceptedWatches: [
        { id: 'retry:每天看一遍桌面', title: '每天看一遍桌面', at: NOW.toISOString() },
        { id: 'retry:每天看一遍桌面', title: '每天看一遍桌面', at: new Date(NOW.getTime() + 1000).toISOString() },
      ],
      now: NOW,
    })
    expect(rows.filter(row => row.kind === 'watch-mismatch')).toHaveLength(1)
  })

  it('remembers one acceptance per title, and forgets it on request', () => {
    const empty = { ignored: [], accepted: [] }
    const once = rememberAcceptedWatch(empty, { id: 'retry:X', title: 'X', at: NOW.toISOString() })
    expect(once.accepted).toHaveLength(1)
    const twice = rememberAcceptedWatch(once, { id: 'retry:X', title: 'X', at: new Date(NOW.getTime() + 1000).toISOString() })
    expect(twice.accepted).toHaveLength(1)
    expect(twice.accepted[0]?.at).not.toBe(once.accepted[0]?.at)
    expect(forgetAcceptedWatch(twice, 'X').accepted).toEqual([])
    // Distinct titles are independent; forgetting one keeps the other.
    const two = rememberAcceptedWatch(once, { id: 'retry:Y', title: 'Y', at: NOW.toISOString() })
    expect(two.accepted).toHaveLength(2)
    expect(forgetAcceptedWatch(two, 'X').accepted.map(watch => watch.title)).toEqual(['Y'])
  })

  it('empty state: no projection data means no rows at all', () => {
    const rows = deriveProactiveFace({ catalog: [], now: NOW })
    expect(rows).toEqual([])
  })
})
