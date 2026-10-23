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
 * 5. A fragment leaves the unclaimed lane only as a reasoned terminal discard — a blank
 *    reason is refused at the tool boundary, so "tidy up" cannot become a silent delete.
 */

import { describe, expect, it } from 'vitest'
import { validateJsonSchemaValue } from '@deepseek-ai/dsh-tools'
import { operatingTool, render, type OperatingOutput } from '../../src/agent/tool-operating/index.ts'
import { ledgerPool } from '../support/host-harness.ts'

describe('assistant_operating (tool adapter over the authoritative ledger)', () => {
  const bootLedger = ledgerPool('assistant-operating-tool-')

  function boot(): ReturnType<typeof operatingTool> {
    const { ctx } = bootLedger()
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

  /**
   * 261016 card: a brief built from ONE `desk` read must be able to list every pending proposal —
   * a pending proposal blocks the matter's return and is the only ledger item that needs the
   * principal's decision. The wording is the risk: it must never read as an effective change.
   */
  it('desk carries every pending proposal tagged with its matter, and never reads as effective', async () => {
    const tool = boot()
    const entrusted = await tool.execute({ action: 'entrust', operation_id: 'op-desk-pending', title: '合同 XR-09 尾款收回', note: '盯 XR-09 尾款', quote: '盯 XR-09 尾款' }, exec) as OperatingOutput
    const matterId = entrusted.receipt!.matterId
    const proposed = await tool.execute({
      action: 'propose', operation_id: 'op-desk-pending-propose', matter_id: matterId, change_kind: 'reschedule', change_deadline: '2026-10-24',
      quote: '客户改口说可能要推迟到下周一付',
    }, exec) as OperatingOutput
    const proposalId = proposed.receipt!.outcome.proposalId

    const desk = await tool.execute({ action: 'desk' }, exec) as OperatingOutput
    expect(desk.proposals).toEqual([expect.objectContaining({
      id: proposalId, kind: 'reschedule', status: 'pending', matter_id: matterId,
    })])
    expect(desk.proposals?.[0]?.change).toEqual(expect.objectContaining({ promisedDeadline: '2026-10-24' }))

    const text = render({ action: 'desk' }, desk).map(block => block.text).join('\n')
    expect(text).toContain(`- proposal ${String(proposalId)} for ${matterId} reschedule [pending — NOT in effect until the principal confirms]`)
    expect(text).not.toContain('[pending]')

    // Resolved proposals stay on `read`: the board lists what needs deciding, not the history.
    const confirmed = await tool.execute({ action: 'confirm', operation_id: 'op-desk-pending-confirm', matter_id: matterId, proposal_id: proposalId, quote: '确认改到 10-24' }, exec) as OperatingOutput
    expect(confirmed.receipt?.outcome.status).toBe('committed')
    const after = await tool.execute({ action: 'desk' }, exec) as OperatingOutput
    expect(after.proposals).toEqual([])
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
    // This test drives both faces of the same boot: the tool adapter and the ledger
    // service behind it (yesterday's services[] peek, now the pool's own return).
    const { service, ctx } = bootLedger()
    const tool = operatingTool(ctx)
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
    // The platform validates every successful result against this schema at dispatch
    // (vendor tools/src/index.ts createSuccessResult); calling execute() directly bypassed that
    // gate, so assert the contract here. Without the materials.eventId declaration the value
    // fails additionalProperties before the presenter ever runs.
    expect(validateJsonSchemaValue(tool.output.schema, JSON.parse(JSON.stringify(read)), 'value')).toEqual([])
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
  it('discards a noise fragment only with a reason, and the lane drops it', async () => {
    const tool = boot()
    const noted = await tool.execute({
      action: 'note',
      operation_id: 'op-tool-discard-note',
      note: '同一段转述的第二条副本',
      quote: '已经付了',
    }, exec) as OperatingOutput
    const fragmentId = noted.receipt?.outcome.status === 'retained' ? noted.receipt.outcome.unclaimedId : ''
    expect(fragmentId).not.toBe('')

    // No reason, no removal: the tool boundary refuses before the ledger is touched.
    await expect(tool.execute({
      action: 'discard', operation_id: 'op-tool-discard-blank', unclaimed_id: fragmentId, quote: '这条是噪音',
    }, exec)).rejects.toThrow(/reason/)

    const discarded = await tool.execute({
      action: 'discard',
      operation_id: 'op-tool-discard-1',
      unclaimed_id: fragmentId,
      reason: '本人判为噪音：同一条消息的重复转述',
      quote: '这条是噪音',
    }, exec) as OperatingOutput
    expect(discarded.receipt?.outcome).toMatchObject({ status: 'committed' })

    const desk = await tool.execute({ action: 'desk' }, exec) as OperatingOutput
    expect(desk.unclaimed ?? []).toEqual([])
  })
})
