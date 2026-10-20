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
