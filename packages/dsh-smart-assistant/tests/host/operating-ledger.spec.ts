/**
 * The authoritative operating ledger service (desk-operating-entry K3, slices A+B; V1/V2 of the
 * settled CEO operating-loop card): the single Host writer over the separate
 * `assistant-operating` data directory.
 *
 * Acceptance points (each `it` is one, red before green):
 * 1. An entrusted matter commits with a revision-1 receipt; the source is retained verbatim.
 * 2. A restarted service on the same directory retrieves the original receipt and matter.
 * 3. Retrying the same operation identity is idempotent; the same key with different content
 *    is rejected without overwriting the original receipt.
 * 4. Two submissions on the same observed revision: one commits, the other conflicts, and the
 *    losing submission's materials are still retained on the matter.
 * 5. A second writer (same process, and a live foreign process) is refused with a clear report;
 *    a dead holder's claim is taken over.
 * 6. Cross-session continuation rides the explicit matter id and survives renames; same-named
 *    different matters stay apart (identity is never title-derived).
 * 7. A fragment with no explicit matter reference is retained unclaimed until an explicit claim
 *    attaches it (original source and time preserved); re-claiming is refused.
 * 8. A refusal that names an absent matter is durable: the receipt says `unknown-matter`, the same
 *    identity replays that receipt, and no matter appears.
 * 9. A proposal the principal already rejected can no longer be confirmed: the late confirm is
 *    refused as `proposal-not-pending` and leaves the confirmed fields untouched.
 * 10. A rejection that cannot resolve anything still records itself and names the caller's matter
 *    id, and re-rejecting a resolved proposal leaves the first resolution in place.
 */

import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { hostname } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import AssistantOperatingLedger from '../../src/host/operating-ledger/index.ts'
import { dirPool, ledgerPool } from '../support/host-harness.ts'

describe('AssistantOperatingLedger (authoritative single writer)', () => {
  // dirPool declared before ledgerPool on purpose: afterEach runs LIFO, so every tracked
  // ledger is stopped before any pool removes a directory — the order this suite had
  // when it was one hook doing "stop all, then remove all".
  const mkDir = dirPool('assistant-operating-ledger-')
  const boot = ledgerPool('assistant-operating-ledger-')

  describe('entrusting and reading matters', () => {
    it('commits an entrusted matter with a revision-1 receipt and retains the source verbatim', async () => {
      const { service } = boot()
      const receipt = await service.submitOperation({
        kind: 'create',
        operationId: 'op-entrust-1',
        title: 'NB-02 第二期回款',
        summary: '合同 NB-02 第二期款，约定 10/13，当日与本人核对',
        responsible: '财务',
        times: { promisedDeadline: '2026-10-13' },
        source: { sessionId: 'session-A', eventId: 'event-1', quote: 'NB-02 第二期 10/13 到期，帮我盯着' },
      })

      expect(receipt.outcome).toEqual({ status: 'committed', revision: 1 })
      expect(receipt.operationId).toBe('op-entrust-1')
      expect(receipt.matterId).toMatch(/^m-\d+$/)

      const matter = await service.readMatter(receipt.matterId)
      expect(matter?.title).toBe('NB-02 第二期回款')
      expect(matter?.status).toBe('active')
      expect(matter?.responsible).toBe('财务')
      expect(matter?.times.promisedDeadline).toBe('2026-10-13')
      expect(matter?.materials).toHaveLength(1)
      expect(matter?.materials[0]?.source).toEqual({
        sessionId: 'session-A',
        eventId: 'event-1',
        quote: 'NB-02 第二期 10/13 到期，帮我盯着',
      })
    })

    it('reads a matter and its ordered operation history from one scoped snapshot', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create', operationId: 'op-snapshot-create', title: 'Snapshot target',
        source: { sessionId: 'session-A', quote: '委托原话' },
      })
      await service.submitOperation({
        kind: 'update', operationId: 'op-snapshot-update', matterId: created.matterId,
        observedRevision: 1, materials: [{ note: '进展材料', source: { sessionId: 'session-B', quote: '进展原话' } }],
        source: { sessionId: 'session-B', quote: '进展原话' },
      })
      const unrelated = await service.submitOperation({
        kind: 'create', operationId: 'op-snapshot-other', title: 'Same title is not identity',
        source: { sessionId: 'session-C' },
      })

      const snapshot = await service.readMatterSnapshot(created.matterId)
      expect(snapshot?.matter.id).toBe(created.matterId)
      expect(snapshot?.matter.revision).toBe(1)
      expect(snapshot?.operations.map(record => record.receipt.operationId)).toEqual([
        'op-snapshot-create', 'op-snapshot-update',
      ])
      expect(snapshot?.operations.some(record => record.receipt.matterId === unrelated.matterId)).toBe(false)
    })
  })

  describe('durability across restarts and retries', () => {
    it('retrieves the original receipt and matter after a restart on the same directory', async () => {
      const dataDir = mkDir()
      const first = new AssistantOperatingLedger(new Context(), { dataDir })
      const receipt = await first.submitOperation({
        kind: 'create',
        operationId: 'op-entrust-2',
        title: 'NX-01 首期回款',
        summary: '合同 NX-01 首期款',
        source: { sessionId: 'session-B', quote: 'NX-01 首期款帮我记一下' },
      })
      await first.stop()

      const second = boot(dataDir).service
      const readBack = await second.readOperation('op-entrust-2')
      expect(readBack).toEqual(receipt)

      const matter = await second.readMatter(receipt.matterId)
      expect(matter?.title).toBe('NX-01 首期回款')
      expect(matter?.materials[0]?.source.sessionId).toBe('session-B')
      expect(matter?.revision).toBe(1)
    })

    it('retries the same operation identity idempotently and rejects the same key with different content', async () => {
      const { service } = boot()
      const operation = {
        kind: 'create',
        operationId: 'op-entrust-3',
        title: 'NB-02 第二期回款',
        summary: '合同 NB-02 第二期款',
        source: { sessionId: 'session-A', quote: '帮我盯着' },
      } as const
      const first = await service.submitOperation(operation)
      const retry = await service.submitOperation({ ...operation, source: { quote: '帮我盯着', sessionId: 'session-A' } })
      expect(retry.outcome).toEqual(first.outcome)
      expect(retry.matterId).toBe(first.matterId)
      let matters = await service.listMatters()
      expect(matters).toHaveLength(1)
      expect(matters[0]?.revision).toBe(1)
      expect(matters[0]?.materials).toHaveLength(1)

      const mismatch = await service.submitOperation({ ...operation, summary: '改过的内容' })
      expect(mismatch.outcome).toEqual({ status: 'rejected', reason: 'operation-content-mismatch' })

      expect(await service.readOperation('op-entrust-3')).toEqual(first)
      matters = await service.listMatters()
      expect(matters).toHaveLength(1)
      expect(matters[0]?.revision).toBe(1)
    })
  })

  describe('refusals and same-revision conflicts', () => {
    it('refuses an operation naming an absent matter and keeps that refusal replayable', async () => {
      const { service } = boot()
      const receipt = await service.submitOperation({
        kind: 'update',
        operationId: 'op-absent-matter',
        matterId: 'm-404',
        observedRevision: 1,
        summary: '不该落地的改动',
        source: { sessionId: 'session-A', quote: '改一下' },
      })

      expect(receipt.outcome).toEqual({ status: 'rejected', reason: 'unknown-matter' })
      expect(receipt.matterId).toBe('m-404')
      // The refusal is recorded like any other outcome: retrying the identity replays it, and the
      // refused content never becomes a matter.
      expect(await service.readOperation('op-absent-matter')).toEqual(receipt)
      expect(await service.listMatters()).toEqual([])
    })

    it('commits one same-revision update, conflicts the other, and retains the losing materials', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-4-create',
        title: 'NB-02 第二期回款',
        summary: '合同 NB-02 第二期款',
        source: { sessionId: 'session-A', quote: '帮我盯着' },
      })

      // Session B observed revision 1 and submits first: commits, matter moves to revision 2.
      const winner = await service.submitOperation({
        kind: 'update',
        operationId: 'op-4-b',
        matterId: created.matterId,
        observedRevision: 1,
        summary: '合同 NB-02 第二期款；财务已收到发票',
        materials: [{ note: '财务已收到发票', source: { sessionId: 'session-B', eventId: 'e-b1', quote: '发票到了' } }],
        source: { sessionId: 'session-B' },
      })
      expect(winner.outcome).toEqual({ status: 'committed', revision: 2 })

      // Session C also observed revision 1: conflicts, but its material is still retained.
      const loser = await service.submitOperation({
        kind: 'update',
        operationId: 'op-4-c',
        matterId: created.matterId,
        observedRevision: 1,
        title: 'NB-02 二期货款',
        materials: [{ note: '另一付款方称款项已付', source: { sessionId: 'session-C', quote: '已经付过了' } }],
        source: { sessionId: 'session-C' },
      })
      expect(loser.outcome).toEqual({ status: 'conflict', observedRevision: 1, currentRevision: 2 })

      const matter = await service.readMatter(created.matterId)
      expect(matter?.revision).toBe(2)
      expect(matter?.title).toBe('NB-02 第二期回款')
      expect(matter?.summary).toBe('合同 NB-02 第二期款；财务已收到发票')
      expect(matter?.materials.map(material => material.note)).toEqual([
        '合同 NB-02 第二期款',
        '财务已收到发票',
        '另一付款方称款项已付',
      ])
    })
  })

  describe('the single-writer claim', () => {
    it('refuses a second writer in the same process and reopens after release', async () => {
      const dataDir = mkDir()
      const first = boot(dataDir).service
      // The writer claim is taken at the first mutating operation, so two services can boot side
      // by side (a web profile and a one-shot task on the same home) until one of them writes.
      const committed = await first.submitOperation({
        kind: 'create',
        operationId: 'op-w-1',
        title: 'NB-02 第二期回款',
        source: { sessionId: 'session-A' },
      })
      expect(committed.outcome).toEqual({ status: 'committed', revision: 1 })

      const second = boot(dataDir).service
      await expect(second.submitOperation({
        kind: 'create',
        operationId: 'op-w-2',
        title: 'NX-01 首期回款',
        source: { sessionId: 'session-B' },
      })).rejects.toThrow(/refusing a second writer/)

      await first.stop()
      const reopened = boot(dataDir).service
      const again = await reopened.submitOperation({
        kind: 'create',
        operationId: 'op-w-3',
        title: 'NX-01 首期回款',
        source: { sessionId: 'session-B' },
      })
      expect(again.outcome).toEqual({ status: 'committed', revision: 1 })
    })

    it('refuses a live foreign-process writer and claims an unclaimed directory across processes', async () => {
      const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
      const servicePath = join(packageRoot, 'src', 'host', 'operating-ledger', 'index.ts')
      const childProbe = (dataDir: string) => spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
        const { default: Ledger } = await import(${JSON.stringify(servicePath)})
        const { Context } = await import('@deepseek-ai/cordis')
        const service = new Ledger(new Context(), { dataDir: ${JSON.stringify(dataDir)} })
        await service.submitOperation({ kind: 'create', operationId: 'child-op', title: 'child probe', source: { sessionId: 'child' } })
        console.log('CHILD-CLAIMED')
        await service.stop()
      `], { cwd: packageRoot, encoding: 'utf8' })

      // Unclaimed directory: the child really claims by writing (the probe exercises the claim path).
      const free = mkDir()
      expect(childProbe(free).stdout).toContain('CHILD-CLAIMED')

      // Parent holds the claim: the child process is refused at its write, with the holder named.
      const held = mkDir()
      const holder = boot(held).service
      await holder.submitOperation({ kind: 'create', operationId: 'op-held', title: '持有写权', source: { sessionId: 'session-A' } })
      const refused = childProbe(held)
      expect(`${refused.stdout}${refused.stderr}`).toContain('refusing a second writer')
      expect(`${refused.stdout}${refused.stderr}`).toContain(`pid ${process.pid}`)
    })

    it('takes over the writer claim left by a dead process on the same host', async () => {
      const dataDir = mkDir()
      const dead = spawnSync(process.execPath, ['-e', ''])
      expect(typeof dead.pid).toBe('number')
      writeFileSync(join(dataDir, 'writer.lock'), `${JSON.stringify({
        hostname: hostname(),
        pid: dead.pid,
        acquiredAt: '2026-10-10T00:00:00.000Z',
      })}\n`)

      const service = boot(dataDir).service
      const committed = await service.submitOperation({
        kind: 'create',
        operationId: 'op-takeover',
        title: 'NB-02 第二期回款',
        source: { sessionId: 'session-A' },
      })
      expect(committed.outcome).toEqual({ status: 'committed', revision: 1 })
    })
  })

  describe('matter identity across sessions and renames', () => {
    it('continues the same matter across sessions by explicit reference and survives renames', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-v1-create',
        title: 'NB-02 第二期回款',
        source: { sessionId: 'session-A', quote: '帮我盯着' },
      })
      const renamed = await service.submitOperation({
        kind: 'update',
        operationId: 'op-v1-rename',
        matterId: created.matterId,
        observedRevision: 1,
        title: 'NB-02 二期货款（客户改名）',
        source: { sessionId: 'session-B', quote: '他们现在叫这个' },
      })
      expect(renamed.outcome).toEqual({ status: 'committed', revision: 2 })

      const matter = await service.readMatter(created.matterId)
      expect(matter?.title).toBe('NB-02 二期货款（客户改名）')
      expect(await service.listMatters()).toHaveLength(1)
    })

    it('keeps same-named different matters apart (no title merge)', async () => {
      const { service } = boot()
      const first = await service.submitOperation({
        kind: 'create',
        operationId: 'op-v1-a',
        title: 'NX-01 回款',
        source: { sessionId: 'session-A' },
      })
      const second = await service.submitOperation({
        kind: 'create',
        operationId: 'op-v1-b',
        title: 'NX-01 回款',
        source: { sessionId: 'session-B' },
      })
      expect(first.matterId).not.toBe(second.matterId)
      expect(await service.listMatters()).toHaveLength(2)
    })
  })

  describe('unclaimed fragments: note, claim, discard', () => {
    it('keeps an ambiguous fragment unclaimed until an explicit claim attaches it', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-v1-create-2',
        title: 'NB-02 第二期回款',
        source: { sessionId: 'session-A' },
      })

      // A fragment with no explicit matter reference: retained, never title-matched.
      const noted = await service.submitOperation({
        kind: 'note',
        operationId: 'op-v1-note',
        note: '有人说第二期款已经付了，但没说是哪笔合同',
        source: { sessionId: 'session-C', quote: '款已经付了' },
      })
      expect(noted.outcome).toEqual({ status: 'retained', unclaimedId: 'u-1' })
      let unclaimed = await service.readUnclaimed()
      expect(unclaimed).toHaveLength(1)
      expect((await service.readMatter(created.matterId))?.materials).toHaveLength(1)

      // The explicit claim attaches it to the matter with its original source and time.
      const claim = await service.submitOperation({
        kind: 'claim',
        operationId: 'op-v1-claim',
        unclaimedId: 'u-1',
        matterId: created.matterId,
        source: { sessionId: 'session-C', quote: '是 NB-02 的' },
      })
      expect(claim.outcome).toEqual({ status: 'committed', revision: 1 })
      expect(await service.readUnclaimed()).toEqual([])
      const matter = await service.readMatter(created.matterId)
      expect(matter?.materials).toHaveLength(2)
      expect(matter?.materials[1]?.note).toContain('没说是哪笔合同')
      expect(matter?.materials[1]?.source.sessionId).toBe('session-C')
      expect(matter?.materials[1]?.receivedAt).toBe(noted.submittedAt)

      // A second claim of the same material under a new operation id is refused.
      const reClaim = await service.submitOperation({
        kind: 'claim',
        operationId: 'op-v1-claim-2',
        unclaimedId: 'u-1',
        matterId: created.matterId,
        source: { sessionId: 'session-C' },
      })
      expect(reClaim.outcome).toEqual({ status: 'rejected', reason: 'unknown-material' })

      // Retrying the original claim operation id replays its receipt.
      const replay = await service.submitOperation({
        kind: 'claim',
        operationId: 'op-v1-claim',
        unclaimedId: 'u-1',
        matterId: created.matterId,
        source: { sessionId: 'session-C', quote: '是 NB-02 的' },
      })
      expect(replay).toEqual(claim)
    })

    it('lets the principal drop a noise fragment with a reason, keeping its words in history', async () => {
      const { service } = boot()
      const noted = await service.submitOperation({
        kind: 'note',
        operationId: 'op-d-note',
        note: '同一段转述的第二条副本',
        source: { sessionId: 'session-A', quote: '已经付了' },
      })
      const fragmentId = noted.outcome.status === 'retained' ? noted.outcome.unclaimedId : ''
      expect(fragmentId).not.toBe('')

      // No reason, no removal: a blank reason is refused at the ledger boundary.
      const unreasoned = await service.submitOperation({
        kind: 'discard',
        operationId: 'op-d-blank',
        unclaimedId: fragmentId,
        reason: '   ',
        source: { sessionId: 'session-A' },
      })
      expect(unreasoned.outcome).toEqual({ status: 'rejected', reason: 'operation-content-mismatch' })
      expect(await service.readUnclaimed()).toHaveLength(1)

      const discarded = await service.submitOperation({
        kind: 'discard',
        operationId: 'op-d-1',
        unclaimedId: fragmentId,
        reason: '本人判为噪音：同一条消息的重复转述',
        source: { sessionId: 'session-A', quote: '这条是噪音' },
      })
      expect(discarded.outcome).toMatchObject({ status: 'committed' })
      expect(await service.readUnclaimed()).toEqual([])

      // The decision is durable and the fragment's own words survive: discard is a terminal state,
      // not a delete (the same shape `abandon` gives a matter).
      expect(await service.readOperation('op-d-1')).toMatchObject({
        operationId: 'op-d-1', matterId: '', outcome: { status: 'committed' },
      })
      expect(await service.readOperation('op-d-note')).toMatchObject({
        operationId: 'op-d-note', outcome: { status: 'retained', unclaimedId: fragmentId },
      })
    })
  })

  describe('commitment times: forecast, re-commitment, checkpoint', () => {
    it('records a forecast change alone without moving the commitment or checkpoint', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-v3-create',
        title: 'NB-02 第二期回款',
        times: { promisedDeadline: '2026-10-13', nextCheckpoint: '2026-10-13' },
        source: { sessionId: 'session-A', quote: '约定 10/13，当日核对' },
      })

      // 财务给了一个更晚的预测，但没有重约承诺：预测单独记录，承诺与核对点不被顺延。
      const forecast = await service.submitOperation({
        kind: 'update',
        operationId: 'op-v3-forecast',
        matterId: created.matterId,
        observedRevision: 1,
        forecast: { at: '2026-10-15', source: { sessionId: 'session-B', quote: '财务预测可能 10/15' } },
        source: { sessionId: 'session-B', quote: '财务预测可能 10/15' },
      })
      expect(forecast.outcome).toEqual({ status: 'committed', revision: 1 })

      const matter = await service.readMatter(created.matterId)
      expect(matter?.times.promisedDeadline).toBe('2026-10-13')
      expect(matter?.times.nextCheckpoint).toBe('2026-10-13')
      expect(matter?.times.forecastAt).toBe('2026-10-15')
      expect(matter?.times.forecastSource?.sessionId).toBe('session-B')
    })

    it('applies an explicit re-commitment and an explicit checkpoint change separately', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-v3-create-2',
        title: 'NB-02 第二期回款',
        times: { promisedDeadline: '2026-10-13', nextCheckpoint: '2026-10-13' },
        source: { sessionId: 'session-A' },
      })

      // Explicit re-commitment: the promise moves, the checkpoint does not ride along.
      const recommit = await service.submitOperation({
        kind: 'update',
        operationId: 'op-v3-recommit',
        matterId: created.matterId,
        observedRevision: 1,
        times: { promisedDeadline: '2026-10-20' },
        source: { sessionId: 'session-A', quote: '客户明确重约到 10/20' },
      })
      expect(recommit.outcome).toEqual({ status: 'committed', revision: 2 })
      let matter = await service.readMatter(created.matterId)
      expect(matter?.times.promisedDeadline).toBe('2026-10-20')
      expect(matter?.times.nextCheckpoint).toBe('2026-10-13')

      // Explicit checkpoint change: the checkpoint moves, the promise does not.
      const checkpoint = await service.submitOperation({
        kind: 'update',
        operationId: 'op-v3-checkpoint',
        matterId: created.matterId,
        observedRevision: 2,
        times: { nextCheckpoint: '2026-10-16' },
        source: { sessionId: 'session-A', quote: '核对点改到 10/16' },
      })
      expect(checkpoint.outcome).toEqual({ status: 'committed', revision: 3 })
      matter = await service.readMatter(created.matterId)
      expect(matter?.times.promisedDeadline).toBe('2026-10-20')
      expect(matter?.times.nextCheckpoint).toBe('2026-10-16')
    })
  })

  describe('completion and reopening', () => {
    it('completes only with evidence and corrects a mis-associated completion by reopening', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-v3-create-3',
        title: 'NB-02 第二期回款',
        source: { sessionId: 'session-A' },
      })

      const completed = await service.submitOperation({
        kind: 'complete',
        operationId: 'op-v3-complete',
        matterId: created.matterId,
        observedRevision: 1,
        evidence: { note: '到账回单', source: { sessionId: 'session-B', eventId: 'e-paid', quote: '银行回单：NB-02 第二期已到账' } },
        source: { sessionId: 'session-B', quote: '已到账，见回单' },
      })
      expect(completed.outcome).toEqual({ status: 'committed', revision: 2 })
      let matter = await service.readMatter(created.matterId)
      expect(matter?.status).toBe('completed')
      expect(matter?.materials.at(-1)?.note).toBe('到账回单')
      // 第四种业务时间：完成时刻由完成这一刻盖下，不靠模型自报（规格「四种时间」的第四种）。
      expect(matter?.times.completedAt).toBeDefined()
      const completedAt = matter?.times.completedAt

      // The evidence turned out to belong to another contract: reopen corrects the association.
      const reopened = await service.submitOperation({
        kind: 'reopen',
        operationId: 'op-v3-reopen',
        matterId: created.matterId,
        observedRevision: 2,
        reason: '回单属于 NX-01，误关联',
        source: { sessionId: 'session-A', quote: '刚才那张回单不是这笔' },
      })
      expect(reopened.outcome).toEqual({ status: 'committed', revision: 3 })
      matter = await service.readMatter(created.matterId)
      expect(matter?.status).toBe('active')
      expect(matter?.materials.at(-1)?.note).toBe('回单属于 NX-01，误关联')
      // reopen 是同一次纠正：完成时刻随状态一起撤销，详情不会同时说「在做」和「完成于 …」。
      expect(matter?.times.completedAt).toBeUndefined()
      expect(completedAt).toBeDefined()
    })
  })

  describe('proposals: propose, confirm, reject, abandon', () => {
    it('holds model-inferred major changes as pending proposals until an explicit confirm', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-c2-create',
        title: 'NB-02 第二期回款',
        times: { promisedDeadline: '2026-10-13' },
        source: { sessionId: 'session-A' },
      })

      // The model infers a re-commitment from a verbal hint: proposal only, confirmed fields stand.
      const proposed = await service.submitOperation({
        kind: 'propose',
        operationId: 'op-c2-propose',
        matterId: created.matterId,
        change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
        source: { sessionId: 'session-B', quote: '客户口头说可能推迟到 10/20' },
      })
      expect(proposed.outcome).toEqual({ status: 'proposed', proposalId: 'p-1' })
      let matter = await service.readMatter(created.matterId)
      expect(matter?.times.promisedDeadline).toBe('2026-10-13')
      expect(matter?.revision).toBe(1)
      expect(matter?.proposals[0]?.status).toBe('pending')

      // The principal's explicit confirm applies it; the proposal is kept for audit.
      const confirmed = await service.submitOperation({
        kind: 'confirm',
        operationId: 'op-c2-confirm',
        matterId: created.matterId,
        proposalId: 'p-1',
        source: { sessionId: 'session-A', quote: '确认重约到 10/20' },
      })
      expect(confirmed.outcome).toEqual({ status: 'committed', revision: 2, proposalId: 'p-1' })
      matter = await service.readMatter(created.matterId)
      expect(matter?.times.promisedDeadline).toBe('2026-10-20')
      expect(matter?.proposals[0]?.status).toBe('confirmed')

      // Confirming an unknown proposal is refused.
      const unknown = await service.submitOperation({
        kind: 'confirm',
        operationId: 'op-c2-confirm-2',
        matterId: created.matterId,
        proposalId: 'p-404',
        source: { sessionId: 'session-A' },
      })
      expect(unknown.outcome).toEqual({ status: 'rejected', reason: 'unknown-proposal' })
    })

    it('rejects a pending proposal with durable source and receipt without changing confirmed times', async () => {
      const dataDir = mkDir()
      const first = boot(dataDir).service
      const created = await first.submitOperation({
        kind: 'create', operationId: 'op-reject-create', title: 'NB-02 第二期回款',
        times: { promisedDeadline: '2026-10-13', nextCheckpoint: '2026-10-13' },
        source: { sessionId: 'session-A' },
      })
      await first.submitOperation({
        kind: 'propose', operationId: 'op-reject-propose', matterId: created.matterId,
        change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
        source: { sessionId: 'session-B', quote: '客户口头说可能推迟到 10/20' },
      })

      const rejected = await first.submitOperation({
        kind: 'reject', operationId: 'op-reject-proposal', matterId: created.matterId, proposalId: 'p-1',
        source: { sessionId: 'session-A', quote: '不接受重约；按 10/13 约定核对' },
      })
      expect(rejected.outcome).toEqual({ status: 'proposal-rejected', proposalId: 'p-1', revision: 1 })
      const matter = await first.readMatter(created.matterId)
      expect(matter?.times).toEqual({ promisedDeadline: '2026-10-13', nextCheckpoint: '2026-10-13' })
      expect(matter?.revision).toBe(1)
      expect(matter?.proposals[0]).toMatchObject({ status: 'rejected', resolutionOperationId: 'op-reject-proposal' })

      await first.stop()
      const restarted = boot(dataDir).service
      const readBack = await restarted.readOperationRecord('op-reject-proposal')
      expect(readBack).toEqual({
        operation: {
          kind: 'reject', operationId: 'op-reject-proposal', matterId: created.matterId, proposalId: 'p-1',
          source: { sessionId: 'session-A', quote: '不接受重约；按 10/13 约定核对' },
        },
        receipt: rejected,
      })
      expect((await restarted.readMatter(created.matterId))?.proposals[0]?.status).toBe('rejected')
    })

    it('refuses to confirm a proposal the principal already rejected, leaving confirmed fields untouched', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create', operationId: 'op-late-confirm-create', title: 'NB-02 第二期回款',
        times: { promisedDeadline: '2026-10-13' },
        source: { sessionId: 'session-A' },
      })
      await service.submitOperation({
        kind: 'propose', operationId: 'op-late-confirm-propose', matterId: created.matterId,
        change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
        source: { sessionId: 'session-B' },
      })
      const rejected = await service.submitOperation({
        kind: 'reject', operationId: 'op-late-confirm-reject', matterId: created.matterId, proposalId: 'p-1',
        source: { sessionId: 'session-A' },
      })
      expect(rejected.outcome).toEqual({ status: 'proposal-rejected', proposalId: 'p-1', revision: 1 })

      // The rejection is the principal's last word on this proposal: a later confirm cannot revive it.
      const late = await service.submitOperation({
        kind: 'confirm', operationId: 'op-late-confirm-confirm', matterId: created.matterId, proposalId: 'p-1',
        source: { sessionId: 'session-A' },
      })
      expect(late.outcome).toEqual({ status: 'rejected', reason: 'proposal-not-pending' })
      const matter = await service.readMatter(created.matterId)
      expect(matter?.times.promisedDeadline).toBe('2026-10-13')
      expect(matter?.revision).toBe(1)
      expect(matter?.proposals[0]).toMatchObject({ status: 'rejected', resolutionOperationId: 'op-late-confirm-reject' })
    })

    it('records a rejection that resolves nothing, and never overwrites an earlier resolution', async () => {
      const { service } = boot()
      // Nothing to resolve and no matter to name: the refusal is still recorded, and the receipt
      // echoes the caller's own matter id rather than inventing one.
      const absent = await service.submitOperation({
        kind: 'reject', operationId: 'op-reject-absent', matterId: 'm-404', proposalId: 'p-1',
        source: { sessionId: 'session-A' },
      })
      expect(absent.outcome).toEqual({ status: 'rejected', reason: 'unknown-matter' })
      expect(absent.matterId).toBe('m-404')
      expect(await service.readOperation('op-reject-absent')).toEqual(absent)

      const created = await service.submitOperation({
        kind: 'create', operationId: 'op-reject-twice-create', title: 'NB-02 第二期回款',
        source: { sessionId: 'session-A' },
      })
      await service.submitOperation({
        kind: 'propose', operationId: 'op-reject-twice-propose', matterId: created.matterId,
        change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
        source: { sessionId: 'session-B' },
      })
      const first = await service.submitOperation({
        kind: 'reject', operationId: 'op-reject-twice-1', matterId: created.matterId, proposalId: 'p-1',
        source: { sessionId: 'session-A' },
      })
      expect(first.outcome.status).toBe('proposal-rejected')

      // The second rejection changes nothing: the proposal is already resolved, and the resolution
      // still points at the operation that actually resolved it.
      const second = await service.submitOperation({
        kind: 'reject', operationId: 'op-reject-twice-2', matterId: created.matterId, proposalId: 'p-1',
        source: { sessionId: 'session-A' },
      })
      expect(second.outcome).toEqual({ status: 'rejected', reason: 'proposal-not-pending' })
      expect((await service.readMatter(created.matterId))?.proposals[0])
        .toMatchObject({ status: 'rejected', resolutionOperationId: 'op-reject-twice-1' })
    })

    it('applies a confirmed abandonment proposal as its own status', async () => {
      const { service } = boot()
      const created = await service.submitOperation({
        kind: 'create',
        operationId: 'op-c2-create-2',
        title: 'NB-02 第二期回款',
        source: { sessionId: 'session-A' },
      })
      await service.submitOperation({
        kind: 'propose',
        operationId: 'op-c2-propose-abandon',
        matterId: created.matterId,
        change: { kind: 'abandon' },
        source: { sessionId: 'session-B', quote: '客户说这期不付了，走法务' },
      })
      const confirmed = await service.submitOperation({
        kind: 'confirm',
        operationId: 'op-c2-confirm-abandon',
        matterId: created.matterId,
        proposalId: 'p-1',
        source: { sessionId: 'session-A', quote: '同意放弃这期，走法务' },
      })
      expect(confirmed.outcome).toEqual({ status: 'committed', revision: 2, proposalId: 'p-1' })
      const matter = await service.readMatter(created.matterId)
      expect(matter?.status).toBe('abandoned')
    })
  })
})
