/**
 * The per-home interface-density preference, stored as one small JSON file beside the ledger.
 *
 * The stock bundle's `assistant-memory` row is nested under the bundle, so the settings service
 * never lists it as a namespace; this route is the durable face the client can actually reach.
 * The value is presentation only and the route never touches the ledger or the working folder.
 *
 * @module dsh-smart-assistant/host/ui-mode/route
 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { isUiMode, type UiMode } from '../../domain/home/ui-mode.ts'

const FILE_NAME = 'ui-mode.json'
const MAX_BYTES = 1024

function headers(): Record<string, string> {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: headers() })
}

function failure(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: headers() })
}

/** The value read back from disk: a mode, missing, or an unreadable file. */
type Stored = { readonly mode: UiMode } | 'missing' | 'invalid'

/** The stored envelope version; an absent version is the pre-version `{ mode }` shape. */
export const UI_MODE_FILE_VERSION = 1

/**
 * Read and validate one stored mode, capped before reading.
 * @param path - The fixed `ui-mode.json` path.
 * @param signal - Request cancellation.
 * @returns The mode, `missing`, or `invalid`.
 */
async function readStored(path: string, signal: AbortSignal | undefined): Promise<Stored> {
  const info = await stat(path).catch(error => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  })
  if (info === undefined) return 'missing'
  if (info.size > MAX_BYTES) return 'invalid'
  signal?.throwIfAborted()
  const text = await readFile(path, 'utf8')
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return 'invalid'
    const version = (parsed as { version?: unknown }).version
    if (version !== undefined && version !== UI_MODE_FILE_VERSION) return 'invalid'
    const mode = (parsed as { mode?: unknown }).mode
    return isUiMode(mode) ? { mode } : 'invalid'
  } catch {
    return 'invalid'
  }
}

/**
 * The exact GET/POST contribution: GET reads the stored mode (standard when the file is
 * absent), POST validates and atomically replaces it.
 * @param dataDir - The assistant home root (the same directory the ledger lives in).
 * @param maxBytes - Complete request/response byte cap; default 1 KiB.
 * @returns The route contribution.
 */
export function createUiModeRoute(dataDir: string, maxBytes: number = MAX_BYTES): ConnectionFetchRoute {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('ui-mode maxBytes must be a positive safe integer')
  const path = join(dataDir, FILE_NAME)
  return {
    path: '/api/assistant/ui-mode',
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      if (url.search !== '') return failure(400, 'unexpected-query')
      if (request.method === 'GET') {
        try {
          const stored = await readStored(path, request.signal)
          if (stored === 'missing') return json({ mode: 'standard' })
          if (stored === 'invalid') return failure(422, 'ui-mode-invalid')
          return json(stored)
        } catch (error) {
          if (request.signal.aborted) throw error
          return failure(500, 'ui-mode-unavailable')
        }
      }
      const length = request.headers.get('content-length')
      if (length !== null && Number(length) > maxBytes) return failure(413, 'ui-mode-too-large')
      let text: string
      try {
        text = await request.text()
      } catch {
        return failure(400, 'invalid-body')
      }
      if (Buffer.byteLength(text, 'utf8') > maxBytes) return failure(413, 'ui-mode-too-large')
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        return failure(400, 'invalid-json')
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return failure(400, 'invalid-body')
      const mode = (parsed as { mode?: unknown }).mode
      if (!isUiMode(mode)) return failure(400, 'invalid-mode')
      const temp = `${path}.${randomUUID()}.tmp`
      try {
        await mkdir(dataDir, { recursive: true, mode: 0o700 })
        await writeFile(temp, `${JSON.stringify({ version: UI_MODE_FILE_VERSION, mode })}\n`, { encoding: 'utf8', mode: 0o600 })
        await rename(temp, path)
        return json({ mode })
      } catch (error) {
        await rm(temp, { force: true }).catch(() => undefined)
        if (request.signal.aborted) throw error
        return failure(500, 'ui-mode-write-failed')
      }
    },
  }
}
