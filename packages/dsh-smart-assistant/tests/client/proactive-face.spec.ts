/** Proactive face pure core (261018 片1): three honest rows from read-only sources, zero model calls. */
import { describe, expect, it } from 'vitest'
import { deriveOverdueMatters, deriveProactiveFace, forgetAcceptedWatch, forgetPendingWatch, rememberAcceptedWatch, rememberPendingWatch, type ProactiveCatalogEntry, type ProactiveProjectionView } from '../../src/client/proactive/proactive-face'

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
  describe('per-matter overdue attention', () => {
    it('keeps each overdue matter addressable and overlaps its pending proposal signal', () => {
      const rows = deriveOverdueMatters(projection({ matters: [
        matter({ proposals: [{ id: 'p-1', status: 'pending' }] }),
        matter({ id: 'm-2', title: '另一个回款', times: { promisedDeadline: '2026-10-14T00:00:00.000Z' } }),
        matter({ id: 'done', status: 'completed' }),
      ] }), NOW)
      expect(rows).toEqual([
        { matterId: 'm-1', title: '合同 NB-02 二期款核对', dueAt: '2026-10-13T01:00:00.000Z', daysOverdue: 5, pendingProposals: 1 },
        { matterId: 'm-2', title: '另一个回款', dueAt: '2026-10-14T00:00:00.000Z', daysOverdue: 4, pendingProposals: 0 },
      ])
    })

    it('does not clear the attention row for a non-result receipt', () => {
      const rows = deriveOverdueMatters(projection({ matters: [matter()], receipts: [receipt({ kind: 'update', status: 'committed' })] }), NOW)
      expect(rows.map(row => row.matterId)).toEqual(['m-1'])
    })
  })

  describe('row 1: due without a result', () => {
    it('row 1: an active matter past its checkpoint with no receipt after it appears with days overdue', () => {
      const rows = deriveProactiveFace({ projection: projection({ matters: [matter()] }), catalog: [], now: NOW })
      const due = rows.find(row => row.kind === 'due-no-result')
      expect(due).toMatchObject({ matterId: 'm-1', title: '合同 NB-02 二期款核对', daysOverdue: 5 })
    })

    it('row 1: only a RESULT-bearing receipt after the passed moment clears the row', () => {
      // The 2026-10-19 live ledger shape: updates/claims after the due, none of them a result.
      // The row's copy says "账上没有结果", so a claim or a status update must not hide it.
      const update = deriveProactiveFace({
        projection: projection({ matters: [matter()], receipts: [receipt({ kind: 'update', status: 'committed' })] }),
        catalog: [],
        now: NOW,
      })
      expect(update.some(row => row.kind === 'due-no-result')).toBe(true)
      const claim = deriveProactiveFace({
        projection: projection({ matters: [matter()], receipts: [receipt({ kind: 'claim', status: 'committed' })] }),
        catalog: [],
        now: NOW,
      })
      expect(claim.some(row => row.kind === 'due-no-result')).toBe(true)
      const complete = deriveProactiveFace({
        projection: projection({ matters: [matter()], receipts: [receipt({ kind: 'complete', status: 'committed' })] }),
        catalog: [],
        now: NOW,
      })
      expect(complete.some(row => row.kind === 'due-no-result')).toBe(false)
      // A complete that did NOT commit (rejected/conflict) is not a result either.
      const rejected = deriveProactiveFace({
        projection: projection({ matters: [matter()], receipts: [receipt({ kind: 'complete', status: 'rejected' })] }),
        catalog: [],
        now: NOW,
      })
      expect(rejected.some(row => row.kind === 'due-no-result')).toBe(true)
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
  })

  describe('row 2: waiting for you', () => {
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
  })

  describe('row 3: the next scheduled look', () => {
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

    it('row 3: a scheduled instant already in the past is stated as overdue, not as a future look (BUG-023)', () => {
      const rows = deriveProactiveFace({
        projection: projection(),
        catalog: [catalogEntry({ scheduledAt: '2026-10-13T01:00:00.000Z' })],
        now: NOW,
      })
      const row = rows.find(row => row.kind === 'next-look')
      expect(row).toMatchObject({ nextAt: '2026-10-13T01:00:00.000Z' })
      expect(row).toHaveProperty('overdueByMs')
      expect((row as { overdueByMs?: number }).overdueByMs).toBeGreaterThan(0)
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
  })

  describe('Q5: accepted watches', () => {
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
  })

  describe('Q5: pending watches', () => {
    it('Q5 pending: a watch accepted inside the grace judges nothing — the turn may still be running', () => {
      const rows = deriveProactiveFace({
        projection: projection(),
        catalog: [catalogEntry()],
        pendingWatches: [{ id: 'weekly-recon', name: '每周一替我对一次账', at: new Date(NOW.getTime() - 60_000).toISOString(), sessionId: 'session-delivered' }],
        now: NOW,
      })
      expect(rows.some(row => row.kind === 'watch-mismatch')).toBe(false)
    })

    it('Q5 pending: after the grace, no schedule in the delivery session says "没盯上" with the human name', () => {
      const rows = deriveProactiveFace({
        projection: projection(),
        catalog: [catalogEntry()],
        pendingWatches: [{ id: 'weekly-recon', name: '每周一替我对一次账', at: new Date(NOW.getTime() - 3 * 60_000).toISOString(), sessionId: 'session-delivered' }],
        now: NOW,
      })
      expect(rows).toContainEqual({ kind: 'watch-mismatch', title: '每周一替我对一次账' })
    })

    it('Q5 pending: a schedule created in the delivery session satisfies the acceptance (no title guessing)', () => {
      const rows = deriveProactiveFace({
        projection: projection(),
        catalog: [catalogEntry({ sessionId: 'session-delivered' })],
        pendingWatches: [{ id: 'weekly-recon', name: '每周一替我对一次账', at: new Date(NOW.getTime() - 3 * 60_000).toISOString(), sessionId: 'session-delivered' }],
        now: NOW,
      })
      expect(rows.some(row => row.kind === 'watch-mismatch')).toBe(false)
    })

    it('Q5 pending: a catalog that carries no session ids judges nothing (no false alarm)', () => {
      const rows = deriveProactiveFace({
        projection: projection(),
        catalog: [catalogEntry({ sessionId: undefined })],
        pendingWatches: [{ id: 'weekly-recon', name: '每周一替我对一次账', at: new Date(NOW.getTime() - 3 * 60_000).toISOString(), sessionId: 'session-delivered' }],
        now: NOW,
      })
      expect(rows.some(row => row.kind === 'watch-mismatch')).toBe(false)
    })

    it('Q5 pending: a pending watch and a retry acceptance of the same name make ONE row', () => {
      const rows = deriveProactiveFace({
        projection: projection(),
        catalog: [catalogEntry()],
        acceptedWatches: [{ id: 'retry:每周一替我对一次账', title: '每周一替我对一次账', at: NOW.toISOString() }],
        pendingWatches: [{ id: 'weekly-recon', name: '每周一替我对一次账', at: new Date(NOW.getTime() - 3 * 60_000).toISOString(), sessionId: 'session-delivered' }],
        now: NOW,
      })
      expect(rows.filter(row => row.kind === 'watch-mismatch')).toHaveLength(1)
    })

    it('remembers one pending watch per name and forgets it on request, preserving the rest of the state', () => {
      const empty = { ignored: ['daily-look'], accepted: [] }
      const once = rememberPendingWatch(empty, { id: 'weekly-recon', name: 'X', at: NOW.toISOString(), sessionId: 's-1' })
      expect(once.pendingWatches).toHaveLength(1)
      expect(once.ignored).toEqual(['daily-look'])
      const twice = rememberPendingWatch(once, { id: 'weekly-recon', name: 'X', at: new Date(NOW.getTime() + 1000).toISOString(), sessionId: 's-2' })
      expect(twice.pendingWatches).toHaveLength(1)
      expect(twice.pendingWatches?.[0]?.sessionId).toBe('s-2')
      expect(forgetPendingWatch(twice, 'X').pendingWatches).toEqual([])
      expect(forgetPendingWatch(twice, 'X').ignored).toEqual(['daily-look'])
    })
  })

  describe('empty state', () => {
    it('empty state: no projection data means no rows at all', () => {
      const rows = deriveProactiveFace({ catalog: [], now: NOW })
      expect(rows).toEqual([])
    })
  })
})
