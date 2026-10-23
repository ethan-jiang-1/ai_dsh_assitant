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
import { UI_MODES, isUiMode, type UiMode } from '../../domain/home/ui-mode'

export { UI_MODES, isUiMode }
export type { UiMode }

/** The localStorage key; the settings document is the durable truth from M1 on. */
const STORAGE_KEY = 'dsha:ui-mode'

/** The narrow storage face a test can stand in for `localStorage`. */
export interface ModeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** The settings form slice the mode store binds to; the vendor ConfigForm satisfies it. */
export interface ModeFormSnapshot {
  readonly status: 'loading' | 'ready' | 'unavailable'
  readonly value?: { readonly uiMode?: unknown }
  readonly writable: boolean
}

/** One Host settings namespace form, structurally narrowed to the field this store owns. */
export interface ModeForm {
  getSnapshot(): ModeFormSnapshot
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<boolean>
}

/** The mode store the entry, the settings row and the panel read. */
export interface UiModeStore {
  getSnapshot(): UiMode
  subscribe(listener: (mode: UiMode) => void): () => void
  /** Adopt a value that came from settings (no write back to the form). */
  adopt(mode: UiMode): void
  set(mode: UiMode): void
}

let store: UiModeStore = createStore()
let storage: ModeStorage | undefined
let form: ModeForm | undefined
let offForm: (() => void) | undefined

function defaultStorage(): ModeStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
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
  const adopt = (next: UiMode): void => {
    if (!isUiMode(next) || next === mode) return
    mode = next
    writeStored(next)
    for (const listener of [...listeners]) listener(mode)
  }
  return {
    getSnapshot: () => mode,
    subscribe: (listener: (mode: UiMode) => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    adopt,
    set: (next: UiMode) => {
      if (!isUiMode(next) || next === mode) return
      adopt(next)
      const current = form
      if (current?.getSnapshot().writable === true) void current.set('uiMode', next)
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
  offForm?.()
  offForm = undefined
  form = undefined
  storage = next
  store = createStore()
  return store
}

/**
 * Bind the Host settings form: its ready value is the durable truth, and later external writes
 * (another tab, the settings page) update this store without writing back. A form refusal on a
 * local switch leaves the local choice standing; the next form read reconciles it.
 * @param next - The `assistant-memory` settings form.
 * @returns The disposer that drops the binding.
 */
export function bindUiModeForm(next: ModeForm): () => void {
  offForm?.()
  form = next
  const sync = (): void => {
    const snapshot = next.getSnapshot()
    if (snapshot.status !== 'ready') return
    const value = snapshot.value?.uiMode
    if (isUiMode(value)) store.adopt(value)
  }
  offForm = next.subscribe(sync)
  sync()
  return () => {
    offForm?.()
    offForm = undefined
    form = undefined
  }
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
