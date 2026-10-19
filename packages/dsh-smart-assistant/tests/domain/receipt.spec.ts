/**
 * A3 receipt pure core: the ledger + the rooms' content stamps, grouped per room.
 *
 * Acceptance points:
 * - a `since` marker filters ledger lines and room updates; undefined means first look (empty);
 * - skills' `lastUsedAt` never counts as a change;
 * - a ledger line and the room row it produced deduplicate to one change (ledger first);
 * - missing `room` on old lines falls back by kind + the skills roster;
 * - promote/deprecate/correct/retire/land map to the right room and human kind.
 */
import { describe, expect, it } from 'vitest'
import { buildReceipt, type ApprovalLine, type ReceiptSnapshot } from '../../src/domain/maintenance/receipt.ts'

const since = '2026-10-19T00:00:00.000Z'

const snapshot: ReceiptSnapshot = {
  generatedAt: '2026-10-19T04:00:00.000Z',
  memories: [
    { id: 'm2', text: '新记忆', updated: '2026-10-19T02:00:00.000Z' },
    { id: 'm3', text: '模型直接写的', updated: '2026-10-19T02:30:00.000Z' },
    { id: 'm-old', text: '旧的', updated: '2026-10-18T00:00:00.000Z' },
  ],
  knowledge: [
    { id: 'k1', title: '草稿页', status: 'stable', updated: '2026-10-18T00:00:00.000Z' },
    { id: 'k2', title: '模型写的草稿', status: 'draft', updated: '2026-10-19T01:30:00.000Z' },
  ],
  research: [],
  skills: [
    { name: 's1', learnedAt: '2026-10-18T00:00:00.000Z', lastUsedAt: '2026-10-19T03:30:00.000Z' },
    { name: 's2', learnedAt: '2026-10-19T01:15:00.000Z' },
  ],
}

const ledger: ApprovalLine[] = [
  { at: '2026-10-19T01:00:00.000Z', kind: 'promote', id: 'k1', title: '草稿页', room: 'knowledge', source: 'panel-direct' },
  { at: '2026-10-19T02:00:00.000Z', kind: 'correct', id: 'm2', title: '新记忆', room: 'memory', source: 'panel-direct' },
  { at: '2026-10-19T03:00:00.000Z', kind: 'retire', id: 's1', room: 'skills', source: 'panel-direct' },
  { at: '2026-10-18T23:00:00.000Z', kind: 'land', id: 'old-skill', source: 'assistant_reflect' },
]

describe('maintenance receipt pure core', () => {
  it('returns an empty first-look receipt when no since marker exists', () => {
    const receipt = buildReceipt(snapshot, ledger, undefined)
    expect(receipt.total).toBe(0)
    expect(receipt.changes).toEqual([])
    expect(receipt.counts).toEqual({ memory: 0, knowledge: 0, research: 0, skills: 0 })
  })

  it('groups ledger + room updates after since, ignoring lastUsedAt and pre-since rows', () => {
    const receipt = buildReceipt(snapshot, ledger, since)
    expect(receipt.total).toBe(6)
    expect(receipt.counts).toEqual({ memory: 2, knowledge: 2, research: 0, skills: 2 })
    expect(receipt.changes.map(change => `${change.room}:${change.id}:${change.kind}`)).toEqual(expect.arrayContaining([
      'knowledge:k1:approved',
      'memory:m2:corrected',
      'skills:s1:retired',
      'memory:m3:updated',
      'knowledge:k2:updated',
      'skills:s2:updated',
    ]))
    // The skill was only loaded (lastUsedAt 03:30), not changed; the old skill landed before since.
    expect(receipt.changes.some(change => change.id === 's1' && change.kind === 'updated')).toBe(false)
    expect(receipt.changes.some(change => change.id === 'old-skill')).toBe(false)
    expect(receipt.changes.some(change => change.id === 'm-old')).toBe(false)
  })

  it('deduplicates the ledger line against the room row it produced (ledger wins)', () => {
    const receipt = buildReceipt({
      ...snapshot,
      memories: [{ id: 'm2', text: '新记忆', updated: '2026-10-19T02:00:00.000Z' }],
      knowledge: [],
      skills: [],
    }, [{ at: '2026-10-19T02:00:00.000Z', kind: 'correct', id: 'm2', room: 'memory' }], since)
    expect(receipt.changes).toHaveLength(1)
    expect(receipt.changes[0]).toMatchObject({ room: 'memory', kind: 'corrected', id: 'm2' })
  })

  it('falls back by kind and the skills roster when an old line carries no room', () => {
    const receipt = buildReceipt(snapshot, [
      { at: '2026-10-19T01:00:00.000Z', kind: 'promote', id: 'k9' },
      { at: '2026-10-19T01:05:00.000Z', kind: 'correct', id: 'm9' },
      { at: '2026-10-19T01:10:00.000Z', kind: 'land', id: 'new-skill' },
      { at: '2026-10-19T01:15:00.000Z', kind: 'retire', id: 's2' },
      { at: '2026-10-19T01:20:00.000Z', kind: 'retire', id: 'm-only' },
    ], since)
    expect(receipt.counts).toMatchObject({ memory: 4, knowledge: 2, skills: 2 })
    expect(receipt.changes.some(change => change.room === 'skills' && change.id === 's2')).toBe(true)
    expect(receipt.changes.some(change => change.room === 'memory' && change.id === 'm-only')).toBe(true)
  })
})
