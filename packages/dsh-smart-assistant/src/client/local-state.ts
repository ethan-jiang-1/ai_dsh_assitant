/**
 * Browser-local state: the two small persistence surfaces the client entry used to hold inline.
 *
 * Both are per-TAB convenience state, never business truth: the seen-running set lets a receipt
 * settle after a reload, and the proactive UI state remembers dismissed suggestions and accepted
 * watches. Keeping the parse/serialize rules here makes them testable with a fake storage and
 * keeps the entry about wiring. Malformed or unavailable storage is memory-only by design.
 */

import type { AcceptedWatch, PendingWatch, ProactiveUiState } from './proactive/proactive-face'

/** Session-storage key: sessions this tab has watched run at least once. */
export const SEEN_RUNNING_KEY = 'dsha-capture-seen-running-v1'
/** Local-storage key: dismissed suggestions, accepted watches, collapsed block. */
export const PROACTIVE_UI_KEY = 'dsha-proactive-ui-v1'

/** The narrow storage surface these helpers need (the platform's Storage is wider). */
export interface StringStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function storageOf(kind: 'session' | 'local'): StringStorage | undefined {
  try {
    return kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage
  } catch {
    return undefined
  }
}

/**
 * Read the per-tab watched-run set. Missing storage, malformed JSON, and non-string entries all
 * degrade to an empty set; the caller must never fail a page load because of a stale value.
 * @param storage - storage override for tests; defaults to this tab's sessionStorage.
 * @returns the set of session ids seen running.
 */
export function readSeenRunning(storage: StringStorage | undefined = storageOf('session')): Set<string> {
  try {
    const raw = storage?.getItem(SEEN_RUNNING_KEY)
    const ids = raw === null || raw === undefined ? [] : JSON.parse(raw) as unknown
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

/**
 * Persist the watched-run set.
 * @param ids - session ids to remember.
 * @param storage - storage override for tests; defaults to this tab's sessionStorage.
 */
export function writeSeenRunning(ids: ReadonlySet<string>, storage: StringStorage | undefined = storageOf('session')): void {
  try {
    storage?.setItem(SEEN_RUNNING_KEY, JSON.stringify([...ids]))
  } catch {
    // Memory-only: a full or blocked storage must not break the page.
  }
}

function isAcceptedWatch(value: unknown): value is AcceptedWatch {
  return typeof value === 'object' && value !== null
    && typeof (value as AcceptedWatch).id === 'string'
    && typeof (value as AcceptedWatch).title === 'string'
}

function isPendingWatch(value: unknown): value is PendingWatch {
  return typeof value === 'object' && value !== null
    && typeof (value as PendingWatch).id === 'string'
    && typeof (value as PendingWatch).name === 'string'
    && typeof (value as PendingWatch).at === 'string'
    && typeof (value as PendingWatch).sessionId === 'string'
}

/**
 * Read the proactive UI state, healing the two older-shape duplications on read: one acceptance
 * per title and one pending watch per name. A malformed store degrades to the empty state.
 * @param storage - storage override for tests; defaults to this tab's localStorage.
 * @returns the normalized UI state.
 */
export function readProactiveUi(storage: StringStorage | undefined = storageOf('local')): ProactiveUiState {
  try {
    const raw = storage?.getItem(PROACTIVE_UI_KEY) ?? null
    if (raw === null) return { ignored: [], accepted: [] }
    const parsed = JSON.parse(raw) as { ignored?: unknown, accepted?: unknown, pendingWatches?: unknown, collapsed?: unknown }
    const accepted = Array.isArray(parsed.accepted) ? parsed.accepted.filter(isAcceptedWatch) : []
    const pending = Array.isArray(parsed.pendingWatches) ? parsed.pendingWatches.filter(isPendingWatch) : []
    return {
      ignored: Array.isArray(parsed.ignored) ? parsed.ignored.filter((id): id is string => typeof id === 'string') : [],
      accepted: [...new Map(accepted.map(item => [item.title, item])).values()],
      pendingWatches: [...new Map(pending.map(item => [item.name, item])).values()],
      collapsed: parsed.collapsed === true,
    }
  } catch {
    return { ignored: [], accepted: [] }
  }
}

/**
 * Persist the proactive UI state.
 * @param state - the normalized state to store.
 * @param storage - storage override for tests; defaults to this tab's localStorage.
 */
export function writeProactiveUi(state: ProactiveUiState, storage: StringStorage | undefined = storageOf('local')): void {
  try {
    storage?.setItem(PROACTIVE_UI_KEY, JSON.stringify(state))
  } catch {
    // Memory-only: a full or blocked storage must not break the page.
  }
}
