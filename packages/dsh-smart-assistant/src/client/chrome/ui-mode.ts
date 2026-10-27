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

/** The versioned localStorage key; the old unversioned key is read once for migration. */
const STORAGE_KEY = 'dsha:ui-mode:v1'
const LEGACY_STORAGE_KEY = 'dsha:ui-mode'

/** The narrow storage face a test can stand in for `localStorage`. */
export interface ModeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** The per-home durable face: the Host route reads once on bind and is written on each switch. */
export interface ModeRemote {
  load(): Promise<UiMode | undefined>
  save(mode: UiMode): Promise<boolean>
}

/** The mode store the entry, the settings row and the panel read. */
export interface UiModeStore {
  getSnapshot(): UiMode
  subscribe(listener: (mode: UiMode) => void): () => void
  /** Adopt a value that came from the durable face (no write back). */
  adopt(mode: UiMode): void
  set(mode: UiMode): void
}

let store: UiModeStore = createStore()
let storage: ModeStorage | undefined
let remote: ModeRemote | undefined
let remoteGeneration = 0

function defaultStorage(): ModeStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function readStored(): UiMode {
  try {
    const box = storage ?? defaultStorage()
    const raw = box?.getItem(STORAGE_KEY) ?? box?.getItem(LEGACY_STORAGE_KEY)
    if (!isUiMode(raw)) return 'standard'
    // Migrate on first read: the old key is no longer written, the new key carries the version.
    if (box?.getItem(STORAGE_KEY) === null) writeStored(raw)
    return raw
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
      void remote?.save(next).catch(() => false)
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
  remoteGeneration += 1
  remote = undefined
  storage = next
  store = createStore()
  return store
}

/**
 * Bind the per-home Host route: its stored value wins over the local first paint, and a switch
 * writes it back. A failed read keeps the localStorage choice; a failed write leaves the local
 * choice standing (the next successful switch retries the durable value).
 * @param next - The HTTP-backed remote.
 * @returns The disposer that drops the binding.
 */
export function bindUiModeRemote(next: ModeRemote): () => void {
  const generation = ++remoteGeneration
  remote = next
  void next.load().then(mode => {
    if (generation === remoteGeneration && mode !== undefined) store.adopt(mode)
  }).catch(() => undefined)
  return () => {
    if (generation !== remoteGeneration) return
    remoteGeneration += 1
    remote = undefined
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
