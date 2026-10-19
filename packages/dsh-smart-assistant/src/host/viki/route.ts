/**
 * The Viki route (B1 read + B2 delete/restore): an exact, owner-only `GET/POST
 * /api/assistant/viki` over the OpenViking memory trees. It is deliberately not an A-card route
 * and not a Typert Remote: the read surface is `user/<space>/memories` +
 * `peers/<peer>/memories/**`, and the only accepted URI is one inside those trees for the
 * configured space/peer.
 *
 * Delete is never a bare `fs DELETE`: `snapshot/commit([uri])` must succeed first (no snapshot →
 * 409 `snapshot-required`), reference hits require an explicit `confirm:true`, and the response
 * carries the commit id plus the restore action. Restore is forward-commit — the receipt says so.
 *
 * @module
 */
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { VikiUnavailable, type VikiList } from './client.ts'

/** The read surface the plugin binds to the real OpenViking client. */
export interface VikiReader {
  list(): Promise<VikiList>
  read(uri: string): Promise<string>
}

/** Knowledge pages / near-duplicates that point at a URI. */
export interface VikiReferences {
  readonly knowledge: readonly string[]
  readonly siblings: readonly string[]
}

/** The write surface B2 exposes; the plugin binds it to the client + memory service. */
export interface VikiActions {
  commit(paths: readonly string[]): Promise<string>
  remove(uri: string): Promise<void>
  restore(commit: string): Promise<void>
  references(uri: string): Promise<VikiReferences>
  audit(uri: string, commitId: string, title?: string): Promise<void>
}

export interface VikiRouteOptions {
  /** Spaces the route may project; normally exactly the configured space. */
  readonly allowedSpaces: readonly string[]
  /** Peers the route may project; empty means any peer under the allowed space. */
  readonly allowedPeers: readonly string[]
  readonly maxBytes?: number
}

function headers(): Record<string, string> {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
}

function failure(status: number, error: string, message?: string): Response {
  return new Response(JSON.stringify(message === undefined ? { error } : { error, message }), { status, headers: headers() })
}

function respond(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), { status, headers: headers() })
}

function allowedUri(uri: string, options: VikiRouteOptions): boolean {
  if (uri.split('/').includes('..')) return false
  for (const space of options.allowedSpaces) {
    if (uri.startsWith(`viking://user/${space}/memories/`)) return true
    const prefix = `viking://user/${space}/peers/`
    if (!uri.startsWith(prefix)) continue
    const rest = uri.slice(prefix.length)
    const peer = rest.split('/')[0] ?? ''
    if (peer === '' || !rest.includes('/memories/')) return false
    if (options.allowedPeers.length === 0 || options.allowedPeers.includes(peer)) return true
  }
  return false
}

/**
 * Build the exact GET/POST route.
 * Bare `GET` lists both trees; `?uri=<file>` reads one body. POST actions:
 * `references`, `delete` (commit → delete → audit), `restore`.
 * @param reader - The Viki read surface.
 * @param options - Space/peer whitelist and response byte cap.
 * @param actions - The B2 write surface; absent means read-only.
 * @returns The exact contribution; registration is owned by the Host plugin fiber.
 */
export function createVikiRoute(reader: VikiReader, options: VikiRouteOptions, actions?: VikiActions): ConnectionFetchRoute {
  const maxBytes = options.maxBytes ?? 1024 * 1024
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('viki maxBytes must be a positive safe integer')
  const emit = (value: unknown): Response => {
    const body = JSON.stringify(value)
    if (Buffer.byteLength(body, 'utf8') > maxBytes) return failure(413, 'projection-too-large')
    return new Response(body, { headers: headers() })
  }
  const handleAction = async (request: Request): Promise<Response> => {
    if (actions === undefined) return failure(405, 'method-not-allowed')
    let body: unknown
    try { body = await request.json() } catch { return failure(400, 'invalid-json') }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return failure(400, 'invalid-body')
    const input = body as Record<string, unknown>
    const action = typeof input.action === 'string' ? input.action : undefined
    if (action === undefined) return failure(400, 'missing-action')
    const uri = typeof input.uri === 'string' ? input.uri : undefined
    if (action === 'references') {
      if (uri === undefined) return failure(400, 'missing-uri')
      if (!allowedUri(uri, options)) return failure(403, 'uri-not-allowed')
      return emit({ uri, references: await actions.references(uri) })
    }
    if (action === 'delete') {
      if (uri === undefined) return failure(400, 'missing-uri')
      if (!allowedUri(uri, options)) return failure(403, 'uri-not-allowed')
      if (uri.endsWith('/')) return failure(409, 'directory-not-allowed')
      const list = await reader.list()
      if (!list.entries.some(entry => entry.uri === uri)) return failure(404, 'uri-not-found')
      const references = await actions.references(uri)
      const cited = references.knowledge.length + references.siblings.length
      if (cited > 0 && input.confirm !== true) return respond(409, { error: 'references-require-confirm', references })
      let commitId: string
      try {
        commitId = await actions.commit([uri])
      } catch (error) {
        return failure(409, 'snapshot-required', String(error))
      }
      try {
        await actions.remove(uri)
      } catch (error) {
        return failure(502, 'delete-failed', String(error))
      }
      await actions.audit(uri, commitId, typeof input.title === 'string' ? input.title : undefined)
      return emit({ ok: true, uri, commitId, at: new Date().toISOString(), references })
    }
    if (action === 'restore') {
      const commit = typeof input.commit === 'string' && input.commit.length > 0 ? input.commit : undefined
      if (commit === undefined) return failure(400, 'missing-commit')
      try {
        await actions.restore(commit)
      } catch (error) {
        return failure(502, 'restore-failed', String(error))
      }
      return emit({ ok: true, commit })
    }
    return failure(400, 'unknown-action')
  }
  return {
    path: '/api/assistant/viki',
    methods: actions === undefined ? ['GET'] : ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request) {
      request.signal.throwIfAborted()
      try {
        if (request.method === 'POST') return await handleAction(request)
        const url = new URL(request.url)
        const space = url.searchParams.get('space')
        if (space !== null && !options.allowedSpaces.includes(space)) return failure(403, 'space-not-allowed')
        const peer = url.searchParams.get('peer')
        if (peer !== null && options.allowedPeers.length > 0 && !options.allowedPeers.includes(peer)) {
          return failure(403, 'peer-not-allowed')
        }
        const uri = url.searchParams.get('uri')
        if (uri !== null) {
          if (!allowedUri(uri, options)) return failure(403, 'uri-not-allowed')
          try {
            return emit({ uri, content: await reader.read(uri) })
          } catch (error) {
            if (error instanceof VikiUnavailable) return failure(503, 'viki-unavailable', error.message)
            return failure(502, 'read-failed', String(error))
          }
        }
        return emit(await reader.list())
      } catch (error) {
        if (request.signal.aborted) throw error
        if (error instanceof VikiUnavailable) return failure(503, 'viki-unavailable', error.message)
        return failure(500, 'viki-failed', String(error))
      }
    },
  }
}
