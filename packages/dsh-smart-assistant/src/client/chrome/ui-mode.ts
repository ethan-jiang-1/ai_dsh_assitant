/**
 * The interface-density mode: one client-local choice (`simple | standard | expert`) that
 * decides which room surfaces the shell reveals.
 *
 * The mode is presentation only: host routes, data, model tools and approvals never read it.
 * It lives in `localStorage` for the first paint and (from M1) reconciles with the host settings
 * document; the store is re-created per materialization like the desk store, so one page's
 * mode cannot leak into another materialization's tests.
 *
 * @module dsh-smart-assistant/client/ui-mode
 */
import { reactSurface } from './runtime'

/** The three interface densities, from the least to the most surface. */
export const UI_MODES = ['simple', 'standard', 'expert'] as const

/** One interface density. */
export type UiMode = (typeof UI_MODES)[number]

/** The localStorage key; the settings document is the durable truth from M1 on. */
const STORAGE_KEY = 'dsha:ui-mode'

/** The narrow storage face a test can stand in for `localStorage`. */
export interface ModeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** The mode store the entry, the settings row and the panel read. */
export interface UiModeStore {
  getSnapshot(): UiMode
  subscribe(listener: (mode: UiMode) => void): () => void
  set(mode: UiMode): void
}

let store: UiModeStore = createStore()
let storage: ModeStorage | undefined

function defaultStorage(): ModeStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** Whether a value is one of the three modes. */
export function isUiMode(value: unknown): value is UiMode {
  return typeof value === 'string' && (UI_MODES as readonly string[]).includes(value)
}

function readStored(): UiMode {
  try {
    const raw = (storage ?? defaultStorage())?.getItem(STORAGE_KEY)
    return isUiMode(raw) ? raw : 'standard'
  } catch {
    return 'standard'
  }
}

function writeStored(mode: UiMode): void {
  try {
    ;(storage ?? defaultStorage())?.setItem(STORAGE_KEY, mode)
  } catch {
    // A denied storage (private mode, quota) must not break the switch.
  }
}

function createStore(): UiModeStore {
  let mode = readStored()
  const listeners = new Set<(mode: UiMode) => void>()
  return {
    getSnapshot: () => mode,
    subscribe: (listener: (mode: UiMode) => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: (next: UiMode) => {
      if (!isUiMode(next) || next === mode) return
      mode = next
      writeStored(next)
      for (const listener of [...listeners]) listener(mode)
    },
  }
}

/**
 * Re-create the store for one materialization. The optional storage is the test seam; the
 * entry calls it with none.
 * @param next - storage override, or undefined for the page's localStorage.
 * @returns the fresh store.
 */
export function initUiModeStore(next?: ModeStorage): UiModeStore {
  storage = next
  store = createStore()
  return store
}

/** @returns the store of the current materialization. */
export function getUiModeStore(): UiModeStore {
  return store
}

/** Switch the current materialization's mode and persist the choice locally. */
export function setUiMode(mode: UiMode): void {
  store.set(mode)
}

/** Selector hook over the current mode store. */
export function useUiMode(): UiMode {
  const { useEffect, useState } = reactSurface()
  const [mode, setMode] = useState(store.getSnapshot())
  useEffect(() => {
    const update = (): void => setMode(store.getSnapshot())
    const off = store.subscribe(update)
    update()
    return off
  }, [])
  return mode
}
