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
    const olderPage = await older.json() as { receipts: { operationId: string, matterId: string, sessionId: string, submittedAt: string, kind: string, status: string }[] }
    expect(olderPage.receipts.length).toBeGreaterThan(0)
    expect(new Set([...page.receipts, ...olderPage.receipts].map(receipt => receipt.operationId)).size)
      .toBe(page.receipts.length + olderPage.receipts.length)
    // The client renders `sessionId`, `kind` and `status` from this payload. Serving the bare
    // stored receipt (operationId/matterId/submittedAt/outcome) left older timeline rows with
    // no source and the generic 「操作」 label — the 2026-10-30 walkthrough bug. Assert the shape,
    // not just the ids: this page's records come from the archive (keepOperations: 1).
    for (const receipt of olderPage.receipts) {
      expect(receipt.sessionId).toBe('session-A')
      expect(receipt.kind).toBe('note')
      // A note with no matter is retained as unclaimed material — the status must still ride along.
      expect(receipt.status).toBe('retained')
      expect(receipt.submittedAt).toEqual(expect.any(String))
      expect(receipt.matterId).toEqual(expect.any(String))
    }
  })

  it('scopes the page to one matter when asked, so the detail button always progresses', async () => {
    const dataDir = mkDir()
    const service = new AssistantOperatingLedger(new Context(), { dataDir, keepOperations: 0 })
    let matterA = ''
    let matterB = ''
    try {
      const createdA = await service.submitOperation({ kind: 'create', operationId: 'op-a-0', title: 'matter A', source: { sessionId: 'session-A' } })
      matterA = createdA.matterId
      const createdB = await service.submitOperation({ kind: 'create', operationId: 'op-b-0', title: 'matter B', source: { sessionId: 'session-B' } })
      matterB = createdB.matterId
      for (let i = 1; i < 6; i += 1) {
        await service.submitOperation({ kind: 'update', operationId: `op-a-${String(i)}`, matterId: matterA, observedRevision: i, source: { sessionId: 'session-A' } })
      }
      for (let i = 1; i < 6; i += 1) {
        await service.submitOperation({ kind: 'update', operationId: `op-b-${String(i)}`, matterId: matterB, observedRevision: i, source: { sessionId: 'session-B' } })
      }
    } finally {
      await service.stop()
    }
    const route = createOperatingReceiptsRoute(dataDir)
    const all = await route.fetch(new Request('http://localhost/api/assistant/operating-receipts?limit=200'))
    const allPage = await all.json() as { receipts: { matterId: string }[] }
    expect(allPage.receipts.length).toBeGreaterThan(4)
    const scoped = await route.fetch(new Request(`http://localhost/api/assistant/operating-receipts?limit=200&matterId=${encodeURIComponent(matterA)}`))
    const matterPage = await scoped.json() as { receipts: { matterId: string }[] }
    expect(matterPage.receipts.length).toBeGreaterThan(0)
    expect(matterPage.receipts.every(receipt => receipt.matterId === matterA)).toBe(true)
    expect(matterPage.receipts.length).toBeLessThan(allPage.receipts.length)
    expect((await route.fetch(new Request('http://localhost/api/assistant/operating-receipts?matterId='))).status).toBe(400)
  })

  it('rejects invalid limits and before values', async () => {
    const route = createOperatingReceiptsRoute(mkDir())
    expect((await route.fetch(new Request('http://localhost/api/assistant/operating-receipts?limit=999'))).status).toBe(400)
    expect((await route.fetch(new Request('http://localhost/api/assistant/operating-receipts?before=nope'))).status).toBe(400)
  })
})
