/**
 * The interface-density store (`src/client/chrome/ui-mode.ts`): localStorage first paint,
 * per-materialization reset, and a subscription that carries the new mode.
 */
import { describe, expect, it, vi } from 'vitest'
import { bindUiModeRemote, getUiModeStore, initUiModeStore, isUiMode, setUiMode, UI_MODES, type ModeRemote, type UiMode } from '../../src/client/chrome/ui-mode'

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

function remote(initial: UiMode | undefined = 'standard') {
  const saved: UiMode[] = []
  const load = vi.fn(async (): Promise<UiMode | undefined> => initial)
  const save = vi.fn(async (mode: UiMode): Promise<boolean> => { saved.push(mode); return true })
  const value: ModeRemote = { load, save }
  return { remote: value, load, save, saved }
}

describe('ui mode remote binding', () => {
  it('adopts the durable value after the async read', async () => {
    initUiModeStore(storage())
    const r = remote('expert')
    const off = bindUiModeRemote(r.remote)
    await new Promise(resolve => { setTimeout(resolve, 0) })
    expect(getUiModeStore().getSnapshot()).toBe('expert')
    off()
  })

  it('writes a local switch to the remote', () => {
    initUiModeStore(storage())
    const r = remote()
    bindUiModeRemote(r.remote)
    setUiMode('simple')
    expect(r.save).toHaveBeenCalledWith('simple')
    expect(getUiModeStore().getSnapshot()).toBe('simple')
  })

  it('keeps the local choice when the remote write fails', () => {
    initUiModeStore(storage())
    const r = remote()
    r.save.mockResolvedValue(false)
    bindUiModeRemote(r.remote)
    setUiMode('expert')
    expect(getUiModeStore().getSnapshot()).toBe('expert')
  })
})
