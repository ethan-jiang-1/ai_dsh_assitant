/**
 * The local browser store primitives. They replace the package-library `@deepseek-ai/dsh-client-store`
 * because the web shell's module table does not carry it; these tests pin the small surface the
 * client actually uses (snapshot get/subscribe/set and draft-mutating actions).
 */
import { describe, expect, it, vi } from 'vitest'
import { createSnapshotStore, defineStore } from '../../src/client/chrome/store.ts'

describe('local client store', () => {
  it('publishes reference changes and unsubscribes', () => {
    const store = createSnapshotStore({ value: 1 })
    const listener = vi.fn()
    const stop = store.subscribe(listener)
    const next = { value: 2 }
    store.set(next)
    store.set(next)
    stop()
    store.set({ value: 3 })
    expect(store.getSnapshot()).toEqual({ value: 3 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('binds draft-mutating actions and keeps instances independent', () => {
    const definition = defineStore({
      init: () => ({ count: 0 }),
      actions: {
        add(draft: { count: number }, amount: number): void {
          draft.count += amount
        },
      },
    })
    const first = definition.create()
    const second = definition.create()
    const listener = vi.fn()
    first.subscribe(listener)

    first.actions.add(2)
    first.actions.add(3)
    expect(first.getSnapshot().count).toBe(5)
    expect(second.getSnapshot().count).toBe(0)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
