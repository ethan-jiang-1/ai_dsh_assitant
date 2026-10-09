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
    expect(confirmed.receipt?.outcome).toEqual({ status: 'committed', revision: 2 })
  })
})
