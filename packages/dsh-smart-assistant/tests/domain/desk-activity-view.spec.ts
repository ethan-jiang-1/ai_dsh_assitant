/**
 * The desk activity view (`src/domain/desk/desk-activity-view.ts`): newest-first order, the page
 * window, local-day grouping, and the pending-proposal count.
 *
 * Acceptance points:
 * - rows sort newest first regardless of input order;
 * - the window shows at least one row and reports whether more remain;
 * - consecutive rows on the same local day share a group; a day boundary starts a new one;
 * - the pending-proposal count only counts pending proposals.
 */
import { describe, expect, it } from 'vitest'
import { countPendingProposals, deriveActivityView } from '../../src/domain/desk/desk-activity-view.ts'

const key = (iso: string): string => iso.slice(0, 10)
const label = (iso: string): string => key(iso)

const row = (submittedAt: string, id: string) => ({ submittedAt, id })

describe('deriveActivityView', () => {
  it('sorts newest first, windows the list, and reports the remainder', () => {
    const view = deriveActivityView([
      row('2026-10-19T09:00:00.000Z', 'old'),
      row('2026-10-21T09:00:00.000Z', 'new'),
      row('2026-10-20T09:00:00.000Z', 'mid'),
    ], 2, key, label)
    expect(view.entries.map(entry => entry.id)).toEqual(['new', 'mid', 'old'])
    expect(view.shown.map(entry => entry.id)).toEqual(['new', 'mid'])
    expect(view.hasMore).toBe(true)
  })

  it('always shows one row even when the limit is zero', () => {
    const view = deriveActivityView([row('2026-10-21T09:00:00.000Z', 'only')], 0, key, label)
    expect(view.shown).toHaveLength(1)
    expect(view.hasMore).toBe(false)
  })

  it('groups consecutive rows by local day and starts a new group at the boundary', () => {
    const view = deriveActivityView([
      row('2026-10-21T09:00:00.000Z', 'a'),
      row('2026-10-21T15:00:00.000Z', 'b'),
      row('2026-10-20T15:00:00.000Z', 'c'),
    ], 10, key, label)
    expect(view.groups.map(group => group.key)).toEqual(['2026-10-21', '2026-10-20'])
    expect(view.groups[0]?.entries.map(entry => entry.id)).toEqual(['b', 'a'])
    expect(view.groups[1]?.entries.map(entry => entry.id)).toEqual(['c'])
  })
})

describe('countPendingProposals', () => {
  it('counts only pending proposals across matters', () => {
    expect(countPendingProposals([
      { proposals: [{ status: 'pending' }, { status: 'confirmed' }] },
      { proposals: [{ status: 'pending' }, { status: 'rejected' }] },
    ])).toBe(2)
    expect(countPendingProposals([])).toBe(0)
  })
})
