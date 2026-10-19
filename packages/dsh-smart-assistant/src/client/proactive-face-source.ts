/**
 * Proactive catalog source (261018 片1): the read-only bridge between the platform
 * schedule storage and the desk's「它替你看过」row 3.
 *
 * Wiring verdict (261018 stage-0, three binary-search rounds; final in `index.ts`): the
 * `'remote.schedule'` inject works ONLY together with the `"@deepseek-ai/dsh-schedule"` peer
 * declaration — either piece alone kills the whole client entry at runtime with zero type-level
 * warning. This source still reads the namespace off the injected `remote` object with optional
 * chaining (following the room-data-io precedent), so a composition that omits the peer/inject
 * pair degrades to `unavailable` instead of crashing this module.
 */
import type { ProactiveCatalogEntry } from './proactive-face'

/** Snapshot states: fetching → entries | unavailable. `unavailable` is explicit, never a guess. */
export type ProactiveCatalogState =
  | { readonly status: 'fetching' }
  | { readonly status: 'entries', readonly entries: readonly ProactiveCatalogEntry[] }
  | { readonly status: 'unavailable' }

export interface ProactiveCatalogObservable {
  getSnapshot(): ProactiveCatalogState
  subscribe(listener: () => void): () => void
}

interface RemoteScheduleFace {
  catalog?: () => Promise<{ ok: boolean, value?: unknown, error?: string }>
}

export interface ProactiveRemoteLike {
  readonly schedule?: RemoteScheduleFace
  $on?: (event: 'schedule/changed', listener: () => void) => () => void
}

interface SourceDeps {
  readonly effect: (install: () => () => void) => unknown
  readonly remote: ProactiveRemoteLike | undefined
}
function isCatalogEntry(value: unknown): value is ProactiveCatalogEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return typeof entry['id'] === 'string'
    && typeof entry['title'] === 'string'
    && typeof entry['scheduledAt'] === 'string'
    && (entry['status'] === 'active' || entry['status'] === 'inactive')
}

/**
 * Create the catalog source: initial read, re-read on `schedule/changed` and on
 * connection reset. Zero writes back — the platform storage stays the single home.
 * @param deps - effect owner and the (possibly subface-less) remote object.
 * @returns An observable the desk panel reads row 3 from.
 */
export function createProactiveCatalogSource(deps: SourceDeps): ProactiveCatalogObservable {
  let snapshot: ProactiveCatalogState = { status: 'fetching' }
  const listeners = new Set<() => void>()
  const publish = (next: ProactiveCatalogState): void => {
    snapshot = next
    for (const listener of listeners) listener()
  }
  const read = (): void => {
    const catalog = deps.remote?.schedule?.catalog
    if (typeof catalog !== 'function') {
      publish({ status: 'unavailable' })
      return
    }
    void catalog().then(result => {
      if (!result.ok || !Array.isArray(result.value)) {
        publish({ status: 'unavailable' })
        return
      }
      publish({ status: 'entries', entries: result.value.filter(isCatalogEntry) })
    }, () => {
      publish({ status: 'unavailable' })
    })
  }
  deps.effect(() => {
    const disposes: Array<(() => void) | undefined> = [
      deps.remote?.$on?.('schedule/changed', read),
    ]
    read()
    return () => { for (const dispose of disposes) dispose?.() }
  })
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
