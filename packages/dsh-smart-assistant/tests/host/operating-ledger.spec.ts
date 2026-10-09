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
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { hostname } from 'node:os'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantOperatingLedger from '../../src/host/operating-ledger/index.ts'

describe('AssistantOperatingLedger (authoritative single writer)', () => {
  const dirs: string[] = []
  const services: AssistantOperatingLedger[] = []

  afterEach(async () => {
    for (const service of services) await service.stop()
    services.length = 0
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function boot(dir?: string): AssistantOperatingLedger {
    const dataDir = dir ?? mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    if (!dirs.includes(dataDir)) dirs.push(dataDir)
    const service = new AssistantOperatingLedger(new Context(), { dataDir })
    services.push(service)
    return service
  }

  it('commits an entrusted matter with a revision-1 receipt and retains the source verbatim', async () => {
    const service = boot()
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

  it('retrieves the original receipt and matter after a restart on the same directory', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    dirs.push(dataDir)
    const first = new AssistantOperatingLedger(new Context(), { dataDir })
    const receipt = await first.submitOperation({
      kind: 'create',
      operationId: 'op-entrust-2',
      title: 'NX-01 首期回款',
      summary: '合同 NX-01 首期款',
      source: { sessionId: 'session-B', quote: 'NX-01 首期款帮我记一下' },
    })
    await first.stop()

    const second = new AssistantOperatingLedger(new Context(), { dataDir })
    services.push(second)
    const readBack = await second.readOperation('op-entrust-2')
    expect(readBack).toEqual(receipt)

    const matter = await second.readMatter(receipt.matterId)
    expect(matter?.title).toBe('NX-01 首期回款')
    expect(matter?.materials[0]?.source.sessionId).toBe('session-B')
    expect(matter?.revision).toBe(1)
  })

  it('retries the same operation identity idempotently and rejects the same key with different content', async () => {
    const service = boot()
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

  it('commits one same-revision update, conflicts the other, and retains the losing materials', async () => {
    const service = boot()
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

  it('refuses a second writer in the same process and reopens after release', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    dirs.push(dataDir)
    const first = new AssistantOperatingLedger(new Context(), { dataDir })
    services.push(first)
    // The writer claim is taken at the first mutating operation, so two services can boot side
    // by side (a web profile and a one-shot task on the same home) until one of them writes.
    const committed = await first.submitOperation({
      kind: 'create',
      operationId: 'op-w-1',
      title: 'NB-02 第二期回款',
      source: { sessionId: 'session-A' },
    })
    expect(committed.outcome).toEqual({ status: 'committed', revision: 1 })

    const second = new AssistantOperatingLedger(new Context(), { dataDir })
    services.push(second)
    await expect(second.submitOperation({
      kind: 'create',
      operationId: 'op-w-2',
      title: 'NX-01 首期回款',
      source: { sessionId: 'session-B' },
    })).rejects.toThrow(/refusing a second writer/)

    await first.stop()
    const reopened = new AssistantOperatingLedger(new Context(), { dataDir })
    services.push(reopened)
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
    const free = mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    dirs.push(free)
    expect(childProbe(free).stdout).toContain('CHILD-CLAIMED')

    // Parent holds the claim: the child process is refused at its write, with the holder named.
    const held = mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    dirs.push(held)
    const holder = new AssistantOperatingLedger(new Context(), { dataDir: held })
    services.push(holder)
    await holder.submitOperation({ kind: 'create', operationId: 'op-held', title: '持有写权', source: { sessionId: 'session-A' } })
    const refused = childProbe(held)
    expect(`${refused.stdout}${refused.stderr}`).toContain('refusing a second writer')
    expect(`${refused.stdout}${refused.stderr}`).toContain(`pid ${process.pid}`)
  })

  it('takes over the writer claim left by a dead process on the same host', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    dirs.push(dataDir)
    const dead = spawnSync(process.execPath, ['-e', ''])
    expect(typeof dead.pid).toBe('number')
    writeFileSync(join(dataDir, 'writer.lock'), `${JSON.stringify({
      hostname: hostname(),
      pid: dead.pid,
      acquiredAt: '2026-10-10T00:00:00.000Z',
    })}\n`)

    const service = boot(dataDir)
    const committed = await service.submitOperation({
      kind: 'create',
      operationId: 'op-takeover',
      title: 'NB-02 第二期回款',
      source: { sessionId: 'session-A' },
    })
    expect(committed.outcome).toEqual({ status: 'committed', revision: 1 })
  })

  it('continues the same matter across sessions by explicit reference and survives renames', async () => {
    const service = boot()
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
    const service = boot()
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

  it('keeps an ambiguous fragment unclaimed until an explicit claim attaches it', async () => {
    const service = boot()
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

  it('records a forecast change alone without moving the commitment or checkpoint', async () => {
    const service = boot()
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
    const service = boot()
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

  it('completes only with evidence and corrects a mis-associated completion by reopening', async () => {
    const service = boot()
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
  })

  it('holds model-inferred major changes as pending proposals until an explicit confirm', async () => {
    const service = boot()
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
    expect(confirmed.outcome).toEqual({ status: 'committed', revision: 2 })
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

  it('applies a confirmed abandonment proposal as its own status', async () => {
    const service = boot()
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
    expect(confirmed.outcome).toEqual({ status: 'committed', revision: 2 })
    const matter = await service.readMatter(created.matterId)
    expect(matter?.status).toBe('abandoned')
  })
})
