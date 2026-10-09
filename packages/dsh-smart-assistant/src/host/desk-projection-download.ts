/** Fixed read-only JSON download. The physical Connection carrier owns authentication. */
import { open } from 'node:fs/promises'
import { TextDecoder } from 'node:util'
import { join } from 'node:path'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'

function headers(): Record<string, string> {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
}

function failure(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: headers() })
}

/**
 * Read one deployment-owned file, never a caller-selected path.
 * @param dataDir - Independent Host operating directory, not the Agent working folder.
 * @param maxBytes - Complete file limit in bytes; only limit plus one byte is read.
 * @returns The exact GET contribution; registration is owned by the Host plugin fiber.
 */
export function createDeskProjectionRoute(dataDir: string, maxBytes: number = 1024 * 1024): ConnectionFetchRoute {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('projection maxBytes must be a positive safe integer')
  return {
    path: '/api/assistant/desk-projection',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      if (url.search !== '') return failure(400, 'unexpected-query')
      let bytes: Buffer
      try {
        request.signal.throwIfAborted()
        const file = await open(join(dataDir, 'desk-projection.json'), 'r')
        try {
          const buffer = Buffer.alloc(maxBytes + 1)
          let length = 0
          while (length < buffer.length) {
            request.signal.throwIfAborted()
            const result = await file.read(buffer, length, buffer.length - length, null)
            if (result.bytesRead === 0) break
            length += result.bytesRead
          }
          request.signal.throwIfAborted()
          if (length > maxBytes) return failure(413, 'projection-too-large')
          bytes = buffer.subarray(0, length)
        } finally {
          await file.close()
        }
      } catch (error) {
        if (request.signal.aborted) throw error
        return error instanceof Error && 'code' in error && error.code === 'ENOENT'
          ? failure(404, 'projection-missing')
          : failure(500, 'projection-unavailable')
      }
      let text: string
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        JSON.parse(text)
      } catch (error) {
        // Durable bytes must be valid UTF-8 JSON; never publish a replacement-character repair.
        void error
        return failure(422, 'projection-invalid-json')
      }
      return new Response(text, { headers: headers() })
    },
  }
}
