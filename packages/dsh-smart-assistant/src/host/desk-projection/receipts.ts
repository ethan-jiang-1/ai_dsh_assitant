/**
 * Read-only older-receipt page for the desk's activity feed. The fixed projection deliberately
 * carries only the recent window; this route pages the rest of the ledger and archive by
 * `submittedAt` without a second view of business state.
 *
 * @module dsh-smart-assistant/desk-projection/receipts
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { reviveLedgerState, type OperationReceipt, type OperationRecord } from '../../domain/operating/ledger.ts'
import { OPERATIONS_ARCHIVE_FILE, parseOperationsArchive } from '../../domain/operating/archive.ts'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function response(status: number, body: unknown): Response {
  return new Response(`${JSON.stringify(body)}\n`, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * Contribute `GET /api/assistant/operating-receipts?before=<ISO>&limit=<n>`.
 * @param dataDir - Independent operating directory.
 * @returns The route contribution; absent ledger/archive yields an empty page.
 */
export function createOperatingReceiptsRoute(dataDir: string): ConnectionFetchRoute {
  return {
    path: '/api/assistant/operating-receipts',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      const limitText = url.searchParams.get('limit') ?? String(DEFAULT_LIMIT)
      const limit = Number(limitText)
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) return response(400, { error: 'invalid-limit' })
      const beforeText = url.searchParams.get('before')
      const before = beforeText === null ? undefined : Date.parse(beforeText)
      if (before !== undefined && Number.isNaN(before)) return response(400, { error: 'invalid-before' })

      const records = new Map<string, OperationRecord>()
      const ledgerPath = join(dataDir, 'ledger.json')
      if (existsSync(ledgerPath)) {
        const parsed: unknown = JSON.parse(await readFile(ledgerPath, 'utf8'))
        const state = reviveLedgerState(parsed)
        for (const record of Object.values(state.operations)) records.set(record.operation.operationId, record)
      }
      const archivePath = join(dataDir, OPERATIONS_ARCHIVE_FILE)
      if (existsSync(archivePath)) {
        for (const record of parseOperationsArchive(await readFile(archivePath, 'utf8')).records) {
          if (!records.has(record.operation.operationId)) records.set(record.operation.operationId, record)
        }
      }
      const receipts: OperationReceipt[] = [...records.values()]
        .map(record => record.receipt)
        .filter(receipt => before === undefined || Date.parse(receipt.submittedAt) < before)
        .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
      const page = receipts.slice(0, limit)
      return response(200, { receipts: page, nextBefore: page.length === limit ? page.at(-1)?.submittedAt ?? null : null })
    },
  }
}
