/** Read-only JSON download: the authoritative ledger rendered live, with a fixed fixture fallback. The physical Connection carrier owns authentication. */
import { open } from 'node:fs/promises'
import { basename } from 'node:path'
import { TextDecoder } from 'node:util'
import { join } from 'node:path'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { reviveLedgerState } from '../../domain/operating/ledger.ts'
import { renderLedgerProjection } from '../../domain/operating/projection.ts'

function headers(): Record<string, string> {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
}

function failure(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: headers() })
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: headers() })
}

/** Capped read outcome: the bytes, or why they are unavailable. */
type CappedRead = { readonly bytes: Buffer } | 'missing' | 'oversized'

/**
 * Read one deployment-owned file up to the byte limit, never a caller-selected path.
 * @param path - Absolute file path.
 * @param maxBytes - Complete file limit in bytes; only limit plus one byte is read.
 * @param signal - Request cancellation.
 * @returns The bytes, `missing`, or `oversized`.
 */
async function readCapped(path: string, maxBytes: number, signal: AbortSignal | undefined): Promise<CappedRead> {
  const file = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(maxBytes + 1)
    let length = 0
    while (length < buffer.length) {
      signal?.throwIfAborted()
      const result = await file.read(buffer, length, buffer.length - length, null)
      if (result.bytesRead === 0) break
      length += result.bytesRead
    }
    signal?.throwIfAborted()
    if (length > maxBytes) return 'oversized'
    return { bytes: buffer.subarray(0, length) }
  } finally {
    await file.close()
  }
}

/**
 * Contribute the exact GET route: the authoritative operating ledger rendered as the v2
 * projection when `ledger.json` exists (a fixture file never wins over it), the fixed
 * `desk-projection.json` simulation input otherwise, and honest missing/corrupt/oversized
 * states throughout.
 * @param dataDir - Independent Host operating directory, not the Agent working folder.
 * @param maxBytes - Complete file limit in bytes; only limit plus one byte is read.
 * @returns The exact GET contribution; registration is owned by the Host plugin fiber.
 */
export function createDeskProjectionRoute(dataDir: string, maxBytes: number = 8 * 1024 * 1024): ConnectionFetchRoute {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('projection maxBytes must be a positive safe integer')
  return {
    path: '/api/assistant/desk-projection',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      if (url.search !== '') return failure(400, 'unexpected-query')
      try {
        // The authoritative ledger first: render the projection live, never a second truth.
        const ledger = await readCapped(join(dataDir, 'ledger.json'), maxBytes, request.signal).catch(error => {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 'missing' as const
          throw error
        })
        if (ledger !== 'missing') {
          if (ledger === 'oversized') return failure(413, 'projection-too-large')
          let parsed: unknown
          try {
            parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(ledger.bytes))
          } catch (error) {
            void error
            return failure(422, 'projection-invalid-json')
          }
          try {
            return json(renderLedgerProjection(reviveLedgerState(parsed), basename(dataDir) || 'assistant-operating', new Date().toISOString()))
          } catch {
            // A structurally wrong (non-v1) ledger is a version problem, never a silent fallback.
            return failure(422, 'projection-invalid')
          }
        }
        // No ledger yet: the fixed simulation input keeps the fixed-fixture projection scenes running.
        const fixed = await readCapped(join(dataDir, 'desk-projection.json'), maxBytes, request.signal).catch(error => {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 'missing' as const
          throw error
        })
        if (fixed === 'missing') return failure(404, 'projection-missing')
        if (fixed === 'oversized') return failure(413, 'projection-too-large')
        try {
          JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fixed.bytes))
        } catch (error) {
          // Durable bytes must be valid UTF-8 JSON; never publish a replacement-character repair.
          void error
          return failure(422, 'projection-invalid-json')
        }
        return new Response(new TextDecoder('utf-8').decode(fixed.bytes), { headers: headers() })
      } catch (error) {
        if (request.signal.aborted) throw error
        return failure(500, 'projection-unavailable')
      }
    },
  }
}
