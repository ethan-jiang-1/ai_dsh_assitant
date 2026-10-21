/**
 * The Viki vocabulary shared across planes: the row the panel lists (`VikiEntry`) and the list
 * projection the host route serves (`VikiList`). The words live here so the browser face reads
 * them from the shared domain layer instead of importing the host plane's read client; the
 * implementation (the OpenViking walk) stays in `src/host/viki/client.ts`.
 *
 * @module dsh-smart-assistant/domain/viki/types
 */

/** One row the panel lists. */
export interface VikiEntry {
  readonly uri: string
  readonly name: string
  readonly source: 'user' | 'peer'
  readonly peer?: string
  readonly size?: number
  readonly modTime?: string
  readonly summary?: string
  readonly memoryType?: string
  readonly eventName?: string
}

/** The list projection. */
export interface VikiList {
  readonly connected: true
  readonly generatedAt?: string
  readonly revision: string
  readonly space: string
  readonly peers: readonly string[]
  readonly entries: readonly VikiEntry[]
  readonly counts: { readonly total: number, readonly user: number, readonly peers: number, readonly events: number }
  readonly stats?: unknown
  readonly problems: readonly string[]
}

/** One recent OpenViking task, as the diagnostics face shows it. */
export interface VikiTask {
  readonly id: string
  readonly type: string
  readonly status: string
  readonly createdAt?: string
  readonly error?: string
}

/** One stateless `find` hit; the score is server-side relevance only. */
export interface VikiSearchHit extends VikiEntry {
  readonly score?: number
}

/** The read-only search projection behind `?q=`. */
export interface VikiSearch {
  readonly query: string
  readonly entries: readonly VikiSearchHit[]
  readonly problems: readonly string[]
}

/** The read-only diagnostics projection behind `?view=diagnostics`. */
export interface VikiDiagnostics {
  readonly connected: boolean
  readonly generatedAt: string
  readonly vikiUrl: string
  readonly health?: { readonly healthy: boolean, readonly version?: string, readonly authMode?: string }
  readonly stats?: { readonly total: number, readonly byCategory: Readonly<Record<string, number>> }
  readonly tasks?: readonly VikiTask[]
  readonly skills?: { readonly total: number, readonly roots: readonly string[] }
  readonly pending?: number
  readonly config?: { readonly path?: string, readonly provider?: string, readonly model?: string, readonly storage?: string }
  readonly problems: readonly string[]
}
