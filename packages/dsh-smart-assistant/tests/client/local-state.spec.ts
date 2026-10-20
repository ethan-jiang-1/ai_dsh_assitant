/**
 * Browser-local state (`src/client/local-state.ts`): the per-tab watched-run set and the
 * proactive UI store, extracted from the client entry so their parse/heal rules are testable
 * without a DOM.
 *
 * Acceptance points:
 * - missing, malformed, or non-array storage degrades to an empty set/state;
 * - the watched-run set filters non-string entries and round-trips;
 * - the proactive state filters malformed entries and heals duplicate titles/names on read;
 * - a blocked storage never throws out of the read/write helpers.
 */
import { describe, expect, it } from 'vitest'
import {
  PROACTIVE_UI_KEY,
  SEEN_RUNNING_KEY,
  readProactiveUi,
  readSeenRunning,
  writeProactiveUi,
  writeSeenRunning,
  type StringStorage,
} from '../../src/client/local-state'

class FakeStorage implements StringStorage {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('watched-run set', () => {
  it('degrades to empty for missing, malformed, or non-array values', () => {
    const storage = new FakeStorage()
    expect(readSeenRunning(storage)).toEqual(new Set())
    storage.setItem(SEEN_RUNNING_KEY, '{not json')
    expect(readSeenRunning(storage)).toEqual(new Set())
    storage.setItem(SEEN_RUNNING_KEY, '{"a":1}')
    expect(readSeenRunning(storage)).toEqual(new Set())
  })

  it('filters non-string entries and round-trips', () => {
    const storage = new FakeStorage()
    storage.setItem(SEEN_RUNNING_KEY, JSON.stringify(['s1', 2, null, 's2']))
    const seen = readSeenRunning(storage)
    expect(seen).toEqual(new Set(['s1', 's2']))
    writeSeenRunning(seen, storage)
    expect(JSON.parse(storage.getItem(SEEN_RUNNING_KEY) ?? '[]')).toEqual(['s1', 's2'])
  })

  it('never throws when storage is absent or blocked', () => {
    expect(readSeenRunning(undefined)).toEqual(new Set())
    expect(() => writeSeenRunning(new Set(['s1']), undefined)).not.toThrow()
    const blocked: StringStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(readSeenRunning(blocked)).toEqual(new Set())
    expect(() => writeSeenRunning(new Set(['s1']), blocked)).not.toThrow()
  })
})

describe('proactive UI state', () => {
  it('returns the empty state for missing or malformed storage', () => {
    expect(readProactiveUi(new FakeStorage())).toEqual({ ignored: [], accepted: [] })
    const storage = new FakeStorage()
    storage.setItem(PROACTIVE_UI_KEY, '{bad')
    expect(readProactiveUi(storage)).toEqual({ ignored: [], accepted: [] })
  })

  it('filters malformed rows and heals duplicate titles and names', () => {
    const storage = new FakeStorage()
    storage.setItem(PROACTIVE_UI_KEY, JSON.stringify({
      ignored: ['a', 3, null],
      accepted: [
        { id: '1', title: '同一件事', at: '2026-10-20T10:00:00Z' },
        { id: '2', title: '同一件事', at: '2026-10-20T11:00:00Z' },
        { id: '3' },
        null,
      ],
      pendingWatches: [
        { id: 'p1', name: '盯同一件', at: 'a', sessionId: 's1' },
        { id: 'p2', name: '盯同一件', at: 'b', sessionId: 's2' },
        { id: 'p3', name: '缺字段' },
      ],
      collapsed: true,
    }))
    const state = readProactiveUi(storage)
    expect(state.ignored).toEqual(['a'])
    expect(state.accepted).toHaveLength(1)
    expect(state.accepted?.[0]?.id).toBe('2')
    expect(state.pendingWatches).toHaveLength(1)
    expect(state.pendingWatches?.[0]?.id).toBe('p2')
    expect(state.collapsed).toBe(true)
  })

  it('round-trips a normalized state', () => {
    const storage = new FakeStorage()
    const state = {
      ignored: ['x'],
      accepted: [{ id: '1', title: 't', at: '2026-10-20T10:00:00Z' }],
      pendingWatches: [{ id: 'p', name: 'n', at: 'a', sessionId: 's' }],
      collapsed: true,
    }
    writeProactiveUi(state, storage)
    expect(readProactiveUi(storage)).toEqual(state)
  })
})
