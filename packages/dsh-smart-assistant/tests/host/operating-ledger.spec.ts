/**
 * The authoritative operating ledger service (desk-operating-entry K3, slice A; V2 of the
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
 * 5. A second writer (same process, and a live foreign process) is refused with a clear report.
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
    expect(() => new AssistantOperatingLedger(new Context(), { dataDir }))
      .toThrow(/refusing a second writer/)
    await first.stop()

    const reopened = new AssistantOperatingLedger(new Context(), { dataDir })
    services.push(reopened)
    expect(await reopened.listMatters()).toEqual([])
  })

  it('refuses a live foreign-process writer and claims an unclaimed directory across processes', async () => {
    const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const servicePath = join(packageRoot, 'src', 'host', 'operating-ledger', 'index.ts')
    const childProbe = (dataDir: string) => spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
      const { default: Ledger } = await import(${JSON.stringify(servicePath)})
      const { Context } = await import('@deepseek-ai/cordis')
      const service = new Ledger(new Context(), { dataDir: ${JSON.stringify(dataDir)} })
      console.log('CHILD-CLAIMED')
      await service.stop()
    `], { cwd: packageRoot, encoding: 'utf8' })

    // Unclaimed directory: the child really claims (the probe exercises the claim path).
    const free = mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    dirs.push(free)
    expect(childProbe(free).stdout).toContain('CHILD-CLAIMED')

    // Parent holds the claim: the child process is refused, with the holder named.
    const held = mkdtempSync(join(tmpdir(), 'assistant-operating-ledger-'))
    dirs.push(held)
    const holder = new AssistantOperatingLedger(new Context(), { dataDir: held })
    services.push(holder)
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
    expect(await service.listMatters()).toEqual([])
  })
})
