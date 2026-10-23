/**
 * The interface-density store (`src/client/chrome/ui-mode.ts`): localStorage first paint,
 * per-materialization reset, and a subscription that carries the new mode.
 */
import { describe, expect, it, vi } from 'vitest'
import { bindUiModeForm, getUiModeStore, initUiModeStore, isUiMode, setUiMode, UI_MODES, type ModeForm } from '../../src/client/chrome/ui-mode'

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

function settingsForm(initial: unknown = 'standard', writable = true) {
  let value = initial
  const listeners = new Set<() => void>()
  const set = vi.fn(async (_field: string, next: unknown) => {
    value = next
    for (const listener of listeners) listener()
    return writable
  })
  const form: ModeForm = {
    getSnapshot: () => ({ status: 'ready', value: { uiMode: value }, writable }),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set,
  }
  return {
    form,
    set,
    external: (next: unknown): void => {
      value = next
      for (const listener of listeners) listener()
    },
  }
}

describe('ui mode settings binding', () => {
  it('adopts the settings value and follows external writes', () => {
    initUiModeStore(storage())
    const settings = settingsForm('expert')
    const off = bindUiModeForm(settings.form)
    expect(getUiModeStore().getSnapshot()).toBe('expert')
    settings.external('simple')
    expect(getUiModeStore().getSnapshot()).toBe('simple')
    off()
  })

  it('writes a local switch to the settings form when writable', () => {
    initUiModeStore(storage())
    const settings = settingsForm()
    bindUiModeForm(settings.form)
    setUiMode('simple')
    expect(settings.set).toHaveBeenCalledWith('uiMode', 'simple')
    expect(getUiModeStore().getSnapshot()).toBe('simple')
  })

  it('keeps the local choice when the form is not writable', () => {
    initUiModeStore(storage())
    const settings = settingsForm('standard', false)
    bindUiModeForm(settings.form)
    setUiMode('expert')
    expect(getUiModeStore().getSnapshot()).toBe('expert')
    expect(settings.set).not.toHaveBeenCalled()
  })
})
