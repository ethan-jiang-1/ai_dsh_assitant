/**
 * The Viki read route (B1): an exact, owner-only `GET /api/assistant/viki` over the OpenViking
 * memory trees. It is deliberately not an A-card route and not a Typert Remote: the read surface
 * is `user/<space>/memories` + `peers/<peer>/memories/**`, and the only accepted URI is one inside
 * those trees for the configured space/peer.
 *
 * No server configured/unreachable is a normal 503 (`viki-unavailable`), never a startup failure.
 * The panel shows "not connected"; B2 adds POST deletion on the same row.
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
 * Build the exact GET route.
 * Bare `GET` lists both trees; `?uri=<file>` reads one body. `?space`/`?peer` are validated
 * against the configured whitelist and otherwise ignored (the reader is already bound to them).
 * @param reader - The Viki read surface.
 * @param options - Space/peer whitelist and response byte cap.
 * @returns The exact GET contribution; registration is owned by the Host plugin fiber.
 */
export function createVikiRoute(reader: VikiReader, options: VikiRouteOptions): ConnectionFetchRoute {
  const maxBytes = options.maxBytes ?? 1024 * 1024
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('viki maxBytes must be a positive safe integer')
  const emit = (value: unknown): Response => {
    const body = JSON.stringify(value)
    if (Buffer.byteLength(body, 'utf8') > maxBytes) return failure(413, 'projection-too-large')
    return new Response(body, { headers: headers() })
  }
  return {
    path: '/api/assistant/viki',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      request.signal.throwIfAborted()
      const url = new URL(request.url)
      try {
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
