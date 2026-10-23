/**
 * The interface-density store (`src/client/chrome/ui-mode.ts`): localStorage first paint,
 * per-materialization reset, and a subscription that carries the new mode.
 */
import { describe, expect, it, vi } from 'vitest'
import { getUiModeStore, initUiModeStore, isUiMode, setUiMode, UI_MODES } from '../../src/client/chrome/ui-mode'

function storage(initial?: string) {
  const values = new Map<string, string>(initial === undefined ? [] : [['dsha:ui-mode', initial]])
  return {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => { values.set(key, value) },
    values,
  }
}

describe('ui mode store', () => {
  it('defaults to standard and reads a valid stored value', () => {
    initUiModeStore(storage())
    expect(getUiModeStore().getSnapshot()).toBe('standard')
    initUiModeStore(storage('simple'))
    expect(getUiModeStore().getSnapshot()).toBe('simple')
  })

  it('falls back to standard for an unknown stored value', () => {
    initUiModeStore(storage('loud'))
    expect(getUiModeStore().getSnapshot()).toBe('standard')
  })

  it('persists the switch and notifies with the new mode', () => {
    const box = storage()
    const store = initUiModeStore(box)
    const listener = vi.fn()
    store.subscribe(listener)
    setUiMode('expert')
    expect(store.getSnapshot()).toBe('expert')
    expect(box.values.get('dsha:ui-mode')).toBe('expert')
    expect(listener).toHaveBeenCalledWith('expert')
  })

  it('accepts only the three known modes', () => {
    expect(UI_MODES).toEqual(['simple', 'standard', 'expert'])
    expect(isUiMode('simple')).toBe(true)
    expect(isUiMode('loud')).toBe(false)
    const store = initUiModeStore(storage())
    setUiMode('loud' as never)
    expect(store.getSnapshot()).toBe('standard')
  })
})
