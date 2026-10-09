/**
 * Web-only fixed JSON download object. Schema validation belongs to its consumer.
 * Preserves last successful JSON across disconnect/failure; ready means downloaded JSON,
 * not a validated ledger or successful business operation. No persistence or automatic retries.
 */
export interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface ProjectionDownload {
  readonly status: 'disconnected' | 'loading' | 'ready' | 'missing' | 'error'
  readonly data?: unknown
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
  let lastData: unknown
  let disposed = false

  const refresh = (): void => {
    if (disposed || activeGeneration === undefined) return
    request?.abort()
    const controller = new AbortController()
    request = controller
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
        if (!current()) return
        if (!response.ok) {
          if (response.status === 404) publishFailure('missing')
          else publishFailure('error', response.status === 401 ? 'authentication-required'
            : response.status === 403 ? 'download-forbidden'
            : response.status === 422 ? 'projection-invalid'
            : response.status === 413 ? 'projection-too-large' : 'download-failed')
          return
        }
        let data: unknown
        try {
          data = await response.json()
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
        request?.abort()
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
    dispose() { disposed = true; request?.abort(); offGeneration(); offState() },
  }
}
