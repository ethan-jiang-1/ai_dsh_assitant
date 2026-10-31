/**
 * The authenticated product route: one GET for the client gate, one POST to change the binding.
 *
 * The route never accepts an arbitrary path beyond `workspaceDir`; the state machine owns path
 * policy, registration and persistence. Error codes are stable strings the client can branch on;
 * the human-readable reason stays in the host log/state.
 *
 * @module dsh-smart-assistant/host/product/route
 */

import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { WorkspacePathError, type WorkspacePathErrorCode } from '../../domain/product/workspace-path.ts'
import type { ProductSnapshot, ProductState } from './state.ts'

/** Request/response byte cap; a workspace binding is one path. */
const MAX_BYTES = 4096

const headers = (): Record<string, string> => ({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
})

const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), { status, headers: headers() })

const failure = (status: number, error: string, detail?: string): Response => json({
  error,
  ...(detail === undefined ? {} : { detail }),
}, status)

/** Codes a client can fix by choosing another directory. */
const USER_FIXABLE: ReadonlySet<WorkspacePathErrorCode> = new Set([
  'workspace-not-absolute',
  'workspace-missing',
  'workspace-not-directory',
  'workspace-not-writable',
  'workspace-forbidden',
])

/** Map a state failure to an HTTP response without leaking a stack or host path. */
function failureResponse(error: unknown): Response {
  if (error instanceof WorkspacePathError) {
    return failure(USER_FIXABLE.has(error.code) ? 422 : 500, error.code)
  }
  return failure(500, 'product-unavailable')
}

/**
 * Build the route contribution.
 * @param state - The product state machine.
 * @param maxBytes - Request/response cap; injectable for tests.
 * @returns the exact GET/POST contribution.
 */
export function createProductRoute(state: ProductState, maxBytes: number = MAX_BYTES): ConnectionFetchRoute {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error('product route maxBytes must be a positive safe integer')
  }
  return {
    path: '/api/assistant/product',
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url)
      if (url.search !== '') return failure(400, 'unexpected-query')
      if (request.method === 'GET') {
        try {
          return json(await state.ready())
        } catch {
          return failure(500, 'product-unavailable')
        }
      }
      if (request.method !== 'POST') return failure(405, 'method-not-allowed')
      const length = request.headers.get('content-length')
      if (length !== null && Number(length) > maxBytes) return failure(413, 'product-payload-too-large')
      let text: string
      try {
        text = await request.text()
      } catch {
        return failure(400, 'invalid-body')
      }
      if (Buffer.byteLength(text, 'utf8') > maxBytes) return failure(413, 'product-payload-too-large')
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        return failure(400, 'invalid-json')
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return failure(400, 'invalid-body')
      }
      const workspaceDir = (parsed as { workspaceDir?: unknown }).workspaceDir
      if (typeof workspaceDir !== 'string' || workspaceDir.trim() === '') {
        return failure(400, 'invalid-workspace')
      }
      try {
        return json(await state.setWorkspace(workspaceDir))
      } catch (error) {
        return failureResponse(error)
      }
    },
  }
}

/** Re-export for tests that assert the snapshot shape. */
export type { ProductSnapshot }
