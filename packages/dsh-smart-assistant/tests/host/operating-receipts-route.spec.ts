import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { createOperatingReceiptsRoute } from '../../src/host/desk-projection/receipts.ts'
import { AssistantOperatingLedger } from '../../src/host/operating-ledger/index.ts'
import { dirPool } from '../support/host-harness.ts'

const mkDir = dirPool('assistant-receipts-route-')

describe('operating receipts route', () => {
  it('pages older receipts from state and archive, newest first', async () => {
    const dataDir = mkDir()
    const service = new AssistantOperatingLedger(new Context(), { dataDir, keepOperations: 1 })
    try {
      for (let i = 0; i < 4; i += 1) {
        await service.submitOperation({
          kind: 'note',
          operationId: `op-${String(i)}`,
          note: `note ${String(i)}`,
          source: { sessionId: 'session-A' },
        })
      }
    } finally {
      await service.stop()
    }
    const route = createOperatingReceiptsRoute(dataDir)
    const first = await route.fetch(new Request('http://localhost/api/assistant/operating-receipts?limit=2'))
    expect(first.status).toBe(200)
    const page = await first.json() as { receipts: { operationId: string }[], nextBefore: string | null }
    expect(page.receipts).toHaveLength(2)
    expect(page.nextBefore).not.toBeNull()
    const older = await route.fetch(new Request(`http://localhost/api/assistant/operating-receipts?limit=2&before=${encodeURIComponent(String(page.nextBefore))}`))
    expect(older.status).toBe(200)
    const olderPage = await older.json() as { receipts: { operationId: string }[] }
    expect(olderPage.receipts.length).toBeGreaterThan(0)
    expect(new Set([...page.receipts, ...olderPage.receipts].map(receipt => receipt.operationId)).size)
      .toBe(page.receipts.length + olderPage.receipts.length)
  })

  it('rejects invalid limits and before values', async () => {
    const route = createOperatingReceiptsRoute(mkDir())
    expect((await route.fetch(new Request('http://localhost/api/assistant/operating-receipts?limit=999'))).status).toBe(400)
    expect((await route.fetch(new Request('http://localhost/api/assistant/operating-receipts?before=nope'))).status).toBe(400)
  })
})
