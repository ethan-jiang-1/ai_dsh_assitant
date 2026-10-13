/**
 * The `assistant_operating` tool adapter contract (desk-operating-entry K3, slice D).
 *
 * The seam is the adapter itself: `operatingTool(ctx)` driven directly, with the real ledger
 * service on a real temp directory. The tool's contract with the agent runtime is exactly
 * `exec.agent.session.id`; standing that narrow object in keeps this suite about the adapter,
 * while the real registration and dispatch are proven by the composition suite.
 *
 * Acceptance points (each `it` is one):
 * 1. Provenance is stamped by the tool (the real session id and verbatim quote), not by the model.
 * 2. Completion without verbatim arrival evidence is refused at the tool boundary.
 * 3. Ordinary progress reports retain material and forecast without consuming a revision.
 * 4. Inferred major changes only propose; an explicit confirm applies them.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantOperatingLedger from '../../src/host/operating-ledger/index.ts'
import { operatingTool, type OperatingOutput } from '../../src/agent/tool-operating/index.ts'

describe('assistant_operating (tool adapter over the authoritative ledger)', () => {
  const dirs: string[] = []
  const services: AssistantOperatingLedger[] = []

  afterEach(async () => {
    for (const service of services.splice(0)) await service.stop()
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function boot(): ReturnType<typeof operatingTool> {
    const dataDir = mkdtempSync(join(tmpdir(), 'assistant-operating-tool-'))
    dirs.push(dataDir)
    const ctx = new Context()
    const service = new AssistantOperatingLedger(ctx, { dataDir })
    services.push(service)
    return operatingTool(ctx)
  }

  type Exec = Parameters<ReturnType<typeof operatingTool>['execute']>[1]
  const exec = { agent: { session: { id: 'spec-session' } } } as Exec

  it('stamps provenance with the real session id, not model-supplied words', async () => {
    const tool = boot()
    const entrusted = await tool.execute({
      action: 'entrust',
      operation_id: 'op-tool-1',
      title: 'NB-02 第二期回款',
      quote: '帮我盯着这笔',
    }, exec) as OperatingOutput
    expect(entrusted.receipt?.outcome).toEqual({ status: 'committed', revision: 1 })

    const read = await tool.execute({ action: 'read', matter_id: entrusted.receipt!.matterId }, exec) as OperatingOutput
    expect(read.materials?.[0]?.sessionId).toBe('spec-session')
    expect(read.materials?.[0]?.quote).toBe('帮我盯着这笔')
  })

  it('refuses completion without verbatim arrival evidence', async () => {
    const tool = boot()
    const entrusted = await tool.execute({
      action: 'entrust',
      operation_id: 'op-tool-2',
      title: 'NB-02 第二期回款',
      quote: '帮我盯着',
    }, exec) as OperatingOutput
    await expect(tool.execute({
      action: 'complete',
      operation_id: 'op-tool-2-complete',
      matter_id: entrusted.receipt!.matterId,
      observed_revision: 1,
      quote: '应该已经付了',
    }, exec)).rejects.toThrow(/evidence_quote/)
  })

  it('keeps the confirmed revision standing for ordinary progress reports', async () => {
    const tool = boot()
    const entrusted = await tool.execute({
      action: 'entrust',
      operation_id: 'op-tool-3',
      title: 'NB-02 第二期回款',
      promised_deadline: '2026-10-13',
      quote: '约定 10/13',
    }, exec) as OperatingOutput
    const reported = await tool.execute({
      action: 'report',
      operation_id: 'op-tool-3-report',
      matter_id: entrusted.receipt!.matterId,
      note: '财务已收到发票',
      forecast_at: '2026-10-15',
      quote: '发票到了，财务说可能 10/15',
    }, exec) as OperatingOutput
    expect(reported.receipt?.outcome).toEqual({ status: 'committed', revision: 1 })

    const desk = await tool.execute({ action: 'desk' }, exec) as OperatingOutput
    expect(desk.matters?.[0]?.forecast_at).toBe('2026-10-15')
    expect(desk.matters?.[0]?.promised_deadline).toBe('2026-10-13')
  })

  it('rejects a pending proposal and reads back its source with the durable receipt', async () => {
    const tool = boot()
    const entrusted = await tool.execute({
      action: 'entrust', operation_id: 'op-tool-reject-create', title: 'NB-02 第二期回款',
      promised_deadline: '2026-10-13', quote: '帮我盯着 NB-02，约定 10/13 到账',
    }, exec) as OperatingOutput
    const matterId = entrusted.receipt!.matterId
    await tool.execute({
      action: 'propose', operation_id: 'op-tool-reject-propose', matter_id: matterId,
      change_kind: 'reschedule', change_deadline: '2026-10-20', quote: '客户可能推迟，但尚未重新约定',
    }, exec)

    const rejected = await tool.execute({
      action: 'reject', operation_id: 'op-tool-reject', matter_id: matterId, proposal_id: 'p-1',
      quote: '不接受改期，仍按 10/13 核对',
    }, exec) as OperatingOutput
    expect(rejected.receipt?.outcome).toEqual({ status: 'proposal-rejected', proposalId: 'p-1', revision: 1 })
    expect(rejected.source).toEqual({ sessionId: 'spec-session', quote: '不接受改期，仍按 10/13 核对' })

    const readBack = await tool.execute({ action: 'read', operation_id: 'op-tool-reject' }, exec) as OperatingOutput
    expect(readBack.receipt).toEqual(rejected.receipt)
    expect(readBack.source).toEqual(rejected.source)
    const matter = await tool.execute({ action: 'read', matter_id: matterId }, exec) as OperatingOutput
    expect(matter.matters?.[0]?.promised_deadline).toBe('2026-10-13')
    expect(matter.proposals?.[0]?.status).toBe('rejected')
    expect(matter.proposals?.[0]?.resolution_operation_id).toBe('op-tool-reject')
  })

  it('reads back current matter ownership, times, entrust source and proposal change', async () => {
    const tool = boot()
    const entrusted = await tool.execute({
      action: 'entrust', operation_id: 'op-readback-create', title: 'NB-02 二期回款',
      summary: '跟进第二期付款。', responsible: '财务陈琳',
      promised_deadline: '2026-10-13', next_checkpoint: '2026-10-12',
      quote: '帮我盯 NB-02，13 号应到账，12 号跟陈琳核对。',
    }, exec) as OperatingOutput
    const matterId = entrusted.receipt!.matterId
    await tool.execute({ action: 'report', operation_id: 'op-readback-report', matter_id: matterId,
      note: '客户预测 10/15 到账，未重新约定。', forecast_at: '2026-10-15',
      quote: '客户说预计 10/15，但还没重约。' }, exec)
    await tool.execute({ action: 'propose', operation_id: 'op-readback-propose', matter_id: matterId,
      change_kind: 'reschedule', change_deadline: '2026-10-20', quote: '可能改到 10/20，等确认。' }, exec)

    const read = await tool.execute({ action: 'read', matter_id: matterId }, exec) as OperatingOutput
    expect(read.matters?.[0]).toMatchObject({
      id: matterId, title: 'NB-02 二期回款', status: 'active', summary: '跟进第二期付款。',
      responsible: '财务陈琳', revision: 1, promised_deadline: '2026-10-13',
      forecast_at: '2026-10-15', next_checkpoint: '2026-10-12',
    })
    expect(read.entrust).toEqual({
      operation_id: 'op-readback-create', sessionId: 'spec-session',
      quote: '帮我盯 NB-02，13 号应到账，12 号跟陈琳核对。',
    })
    expect(read.proposals?.[0]).toMatchObject({
      id: 'p-1', kind: 'reschedule', status: 'pending',
      change: { kind: 'reschedule', promisedDeadline: '2026-10-20' },
      source: { sessionId: 'spec-session', quote: '可能改到 10/20，等确认。' },
    })
    expect(read.operations?.map(operation => operation.operationId)).toEqual([
      'op-readback-create', 'op-readback-report', 'op-readback-propose',
    ])
    expect(read.operations?.map(operation => operation.outcome.status)).toEqual(['committed', 'committed', 'proposed'])
    expect(read.operations?.every(operation => operation.source.sessionId === 'spec-session')).toBe(true)
    const rendered = tool.output.render({ action: 'read' }, JSON.parse(JSON.stringify(read)))
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n')
    expect(rendered).toContain('帮我盯 NB-02，13 号应到账，12 号跟陈琳核对。')
    expect(rendered).toContain('客户说预计 10/15，但还没重约。')
    expect(rendered).toContain('"promisedDeadline":"2026-10-20"')
  })

  it('carries the event-level locator on materials, like the sibling projection does', async () => {
    const tool = boot()
    const service = services[services.length - 1]!
    const entrusted = await tool.execute({
      action: 'entrust', operation_id: 'op-event-create', title: 'NB-02 二期回款', quote: '帮我盯 NB-02',
    }, exec) as OperatingOutput
    const matterId = entrusted.receipt!.matterId
    await service.submitOperation({
      kind: 'update', operationId: 'op-event-report', matterId, observedRevision: 1,
      materials: [{ note: '客户致电', source: { sessionId: 'spec-session', eventId: 'ev-42', quote: '客户说预计 10/15。' } }],
      source: { sessionId: 'spec-session', eventId: 'ev-42' },
    })

    const read = await tool.execute({ action: 'read', matter_id: matterId }, exec) as OperatingOutput
    expect(read.materials?.find(material => material.note === '客户致电')?.eventId).toBe('ev-42')
    const rendered = tool.output.render({ action: 'read' }, JSON.parse(JSON.stringify(read)))
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n')
    expect(rendered).toContain('(spec-session/ev-42)')
    // No proposal exists in this fixture (entrust + one update only), so the outcome that must
    // render is the update's committed receipt. The '"status":"proposed"' line this test was
    // born with was a copy-over from the neighbour test and could never bind here (born-red;
    // found red on a clean HEAD by the continuity slice 2026-10-13 and fixed with the missing
    // eventId mapping in the same slice).
    expect(rendered).toContain('"status":"committed"')
  })

  it('only proposes inferred major changes; the explicit confirm applies them', async () => {
    const tool = boot()
    const entrusted = await tool.execute({
      action: 'entrust',
      operation_id: 'op-tool-4',
      title: 'NB-02 第二期回款',
      quote: '帮我盯着',
    }, exec) as OperatingOutput
    const matterId = entrusted.receipt!.matterId

    const proposed = await tool.execute({
      action: 'propose',
      operation_id: 'op-tool-4-propose',
      matter_id: matterId,
      change_kind: 'reschedule',
      change_deadline: '2026-10-20',
      quote: '客户口头说可能推迟',
    }, exec) as OperatingOutput
    expect(proposed.receipt?.outcome).toEqual({ status: 'proposed', proposalId: 'p-1' })
    const before = await tool.execute({ action: 'read', matter_id: matterId }, exec) as OperatingOutput
    expect(before.matters?.[0]?.revision).toBe(1)

    const confirmed = await tool.execute({
      action: 'confirm',
      operation_id: 'op-tool-4-confirm',
      matter_id: matterId,
      proposal_id: 'p-1',
      quote: '本人确认重约到 10/20',
    }, exec) as OperatingOutput
    expect(confirmed.receipt?.outcome).toEqual({ status: 'committed', revision: 2, proposalId: 'p-1' })
  })
})
