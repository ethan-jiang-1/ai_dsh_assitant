/**
 * Web-only fixed v1 operating projection reader. Retains last valid projection on failure.
 * Ready means wire validation succeeded, not a durable business operation or verified sources.
 * No persistence or automatic retries.
 */
import { parseOperatingProjection } from './operating-projection'
import type { OperatingProjection } from './operating-projection'
export interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface ProjectionDownload {
  readonly status: 'disconnected' | 'loading' | 'ready' | 'missing' | 'error'
  readonly data?: OperatingProjection
  readonly error?: string
  readonly stale?: boolean
}

interface Publisher extends Observable<ProjectionDownload> {
  set(snapshot: ProjectionDownload): void
}

interface Connection {
  readonly generation: Observable<{ readonly id: number } | undefined>
  readonly state: Observable<'connected' | 'connecting' | 'disconnected' | undefined>
}

interface WebDownload {
  readonly baseURI: string
  readonly origin: string
  readonly fetch: typeof globalThis.fetch
}

/**
 * Read a response we will not use, so its transfer settles.
 *
 * Why this exists: an error response whose body is left unread keeps the request unfinished in
 * the browser's network bookkeeping. That used to surface as a canceled request the moment a
 * later refresh aborted it — and the web-face scenes pin `networkFailures` empty, so a single
 * 404 (a home with no ledger) turned both of them red. `arrayBuffer()` is the shape that
 * settles cleanly; reading the stream by hand (`body.getReader()` → read to done →
 * `releaseLock()`) itself reports `net::ERR_ABORTED`, measured 2026-10-11 in the page (the
 * request finishes with `arrayBuffer()` in the same run). Error bodies on this same-origin
 * route are small by construction, so buffering one to release the connection is the cheaper
 * half of the trade.
 * @param response - Response whose status the caller has already handled.
 */
async function discardBody(response: Response): Promise<void> {
  try { await response.arrayBuffer() } catch { /* a body that cannot be read is not one we can settle */ }
}

/**
 * Read fixed JSON without a Session, query token, redirects or cross-origin credentials.
 * @param connection - Platform generation/state observables; this module never starts Connection.
 * @param snapshot - Platform-owned snapshot publisher shared through inject hooks.
 * @param web - Document address and native Fetch adapter; network substitutions are test-only.
 * @returns Explicit reader lifetime and manual refresh action; apply owns disposal.
 */
export function createProjectionReader(connection: Connection, snapshot: Publisher, web: WebDownload): { refresh(): void; dispose(): void } {
  const url = new URL('api/assistant/desk-projection', web.baseURI)
  if (url.origin !== web.origin) throw new Error('projection download must be same-origin')
  let activeGeneration: number | undefined
  let request: AbortController | undefined
  let requestId = 0
  let lastData: OperatingProjection | undefined
  let disposed = false
  // Whether the current request's response has already arrived; teardown cancels only a read
  // still on the wire.
  let responded = false

  // Superseding a read does not abort it. `current()` below is what keeps a replaced read's
  // result out of the snapshot, and canceling added nothing but a canceled-request entry
  // (`net::ERR_ABORTED`) in the harness's network evidence — which the web-face scenes pin
  // empty. It was also a race: when the renderer is busy booting, a response can sit in the
  // task queue for seconds, so which reads were "still in flight" varied run to run and both
  // scenes flaked. A few KB of superseded download is the cheaper price. Bodies of responses we
  // do not read are settled by `discardBody` instead.
  const refresh = (): void => {
    if (disposed || activeGeneration === undefined) return
    const controller = new AbortController()
    request = controller
    responded = false
    const thisRequest = ++requestId
    const thisGeneration = activeGeneration
    snapshot.set(lastData === undefined ? { status: 'loading' } : { status: 'loading', data: lastData, stale: true })
    const current = (): boolean => !disposed && thisRequest === requestId && thisGeneration === activeGeneration && !controller.signal.aborted
    const publishFailure = (status: 'missing' | 'error', error?: string): void => {
      if (!current()) return
      const failure: ProjectionDownload = { status, ...(error === undefined ? {} : { error }) }
      snapshot.set(lastData === undefined ? failure : { ...failure, data: lastData, stale: true })
    }
    // Snapshot listeners run synchronously and may dispose or replace this request.
    if (!current()) return
    void web.fetch(url, { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal })
      .then(async response => {
        if (thisRequest === requestId) responded = true
        if (!current()) return
        if (!response.ok) {
          // Settle the transfer before publishing — see `discardBody` (fire-and-forget: the
          // failure must reach the panel without waiting on bytes nobody wants).
          void discardBody(response)
          if (response.status === 404) publishFailure('missing')
          else publishFailure('error', response.status === 401 ? 'authentication-required'
            : response.status === 403 ? 'download-forbidden'
            : response.status === 422 ? 'projection-invalid'
            : response.status === 413 ? 'projection-too-large' : 'download-failed')
          return
        }
        let data: OperatingProjection
        try {
          data = parseOperatingProjection(await response.json())
        } catch (error) {
          void error
          publishFailure('error', 'projection-invalid')
          return
        }
        if (!current()) return
        lastData = data
        snapshot.set({ status: 'ready', data })
      }).catch(() => { publishFailure('error', 'download-failed') })
  }
  const changed = (): void => {
    const generation = connection.generation.getSnapshot()
    const connected = generation !== undefined && connection.state.getSnapshot() === 'connected'
    if (!connected) {
      if (activeGeneration !== undefined) {
        activeGeneration = undefined
        ++requestId
        snapshot.set(lastData === undefined ? { status: 'disconnected' } : { status: 'disconnected', data: lastData, stale: true })
      }
      return
    }
    if (activeGeneration !== generation.id) {
      activeGeneration = generation.id
      refresh()
    }
  }
  const offGeneration = connection.generation.subscribe(changed)
  const offState = connection.state.subscribe(changed)
  changed()
  return {
    refresh,
    dispose() {
      disposed = true
      // Teardown is the one place cancellation is still worth it: nothing will consume the read,
      // and the response of a read that already arrived is left to `discardBody`.
      if (!responded) request?.abort()
      offGeneration()
      offState()
    },
  }
}
