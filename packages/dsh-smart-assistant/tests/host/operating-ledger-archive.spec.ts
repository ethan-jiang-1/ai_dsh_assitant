/**
 * The ledger's bounded state: recent operations stay in `ledger.json`, older ones move to the
 * append-only archive, and every reader (receipt, matter snapshot, projection revision) still
 * sees a coherent history. Also pins the idempotent retry of an archived operation: compaction
 * must not turn a replay into a second application.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { AssistantOperatingLedger } from '../../src/host/operating-ledger/index.ts'
import { OPERATIONS_ARCHIVE_FILE } from '../../src/host/operating-ledger/archive.ts'
import { reviveLedgerState } from '../../src/domain/operating/ledger.ts'
import { renderLedgerProjection } from '../../src/domain/operating/projection.ts'
import { dirPool } from '../support/host-harness.ts'

const mkDir = dirPool('assistant-ledger-archive-')

function note(i: number): { kind: 'note', operationId: string, note: string, source: { sessionId: string } } {
  return { kind: 'note', operationId: `op-${String(i)}`, note: `fragment ${String(i)}`, source: { sessionId: 'session-1' } }
}

describe('operating ledger archive', () => {
  it('bounds ledger.json, keeps archived receipts readable, and preserves idempotent retries', async () => {
    const dataDir = mkDir()
    const service = new AssistantOperatingLedger(new Context(), { dataDir, keepOperations: 2 })
    try {
      for (let i = 0; i < 6; i += 1) await service.submitOperation(note(i))

      const state = reviveLedgerState(JSON.parse(readFileSync(join(dataDir, 'ledger.json'), 'utf8')))
      expect(state.operationCount).toBe(6)
      expect(Object.keys(state.operations).length).toBeLessThanOrEqual(4)
      expect(readFileSync(join(dataDir, OPERATIONS_ARCHIVE_FILE), 'utf8').trim().split('\n').length).toBeGreaterThan(0)

      // The oldest operation moved out of the state file; the receipt is still readable.
      const oldest = await service.readOperation('op-0')
      expect(oldest?.outcome).toEqual({ status: 'retained', unclaimedId: expect.any(String) })
      expect(await service.readOperationRecord('op-0')).toBeDefined()

      // A retry of the archived identity returns the stored receipt and does not apply again.
      const before = await service.readUnclaimed()
      const retried = await service.submitOperation(note(0))
      expect(retried).toEqual(oldest)
      expect(await service.readUnclaimed()).toHaveLength(before.length)

      // Same id, different body is the durable content-mismatch refusal, not a second fragment.
      const mismatch = await service.submitOperation({ ...note(0), note: 'different fragment' })
      expect(mismatch.outcome).toEqual({ status: 'rejected', reason: 'operation-content-mismatch' })
      expect(await service.readUnclaimed()).toHaveLength(before.length)

      // The projection revision counts every applied operation; receipts are the bounded window.
      const projection = renderLedgerProjection(state, 'archive-test', '2026-10-27T00:00:00.000Z')
      expect(projection.revision).toBe(6)
      expect(projection.receipts.length).toBe(Object.keys(state.operations).length)
    } finally {
      await service.stop()
    }
  })

  it('merges archived operations into a matter snapshot', async () => {
    const dataDir = mkDir()
    const service = new AssistantOperatingLedger(new Context(), { dataDir, keepOperations: 2 })
    try {
      await service.submitOperation({
        kind: 'create',
        operationId: 'op-create',
        title: 'Archive matter',
        summary: 'A matter whose history outlives the state window.',
        source: { sessionId: 'session-1', quote: 'Track this.' },
      })
      for (let i = 0; i < 6; i += 1) {
        await service.submitOperation({
          kind: 'update',
          operationId: `op-update-${String(i)}`,
          matterId: 'm-1',
          observedRevision: 1,
          materials: [{ note: `progress ${String(i)}`, source: { sessionId: 'session-1' } }],
          source: { sessionId: 'session-1' },
        })
      }

      const snapshot = await service.readMatterSnapshot('m-1')
      expect(snapshot?.operations.map(record => record.receipt.operationId)).toContain('op-create')
      expect(snapshot?.operations).toHaveLength(7)
    } finally {
      await service.stop()
    }
  })
})
