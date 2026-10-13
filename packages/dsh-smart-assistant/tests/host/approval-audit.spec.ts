/**
 * The approval ledger (`<dataDir>/audit/approvals.jsonl`): every governance transition — a draft
 * promoted to stable, a page deprecated, a proposal landed — appends one JSONL line naming what
 * changed, when, and which lane caused it (`assistant_reflect` model turn vs `panel-direct`).
 *
 * BUG-004 (2026-10-07 semantic sweep): the model path used to leave zero audit records — the
 * approvals file only ever received lines from the direct-call remote, so a promote the model
 * initiated was invisible outside the session log, and the human-lane audit file sat empty. The
 * ledger is detection, not prevention: a forged prompt can still cause a flip, but no flip can
 * happen without a durable, human-readable record.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type AssistantMemory from '../../src/index.ts'
import { memoryPool } from '../support/host-harness.ts'

describe('approval audit ledger', () => {
  const boot = memoryPool('assistant-approval-audit-')

  async function ledger(service: AssistantMemory): Promise<Record<string, unknown>[]> {
    const path = service.paths.approvalsLedgerFile
    if (!existsSync(path)) return []
    return readFileSync(path, 'utf8').split('\n').filter(line => line.length > 0).map(line => JSON.parse(line))
  }

  async function draftPage(service: AssistantMemory, title: string): Promise<string> {
    const written = await service.writePage({
      type: 'how-it-works',
      title,
      description: 'a staged draft',
      body: 'Some distilled knowledge.',
      sources: ['research:20261007-audit-fixture'],
    })
    return written.id
  }

  it('records every promote/deprecate/land transition with its lane', async () => {
    const { service } = boot()
    const page = await draftPage(service, 'Audit one')

    await service.promotePage(page)
    const afterPromote = await ledger(service)
    expect(afterPromote).toHaveLength(1)
    const [first] = afterPromote
    expect(first).toMatchObject({ kind: 'promote', id: page, source: 'assistant_reflect' })
    expect(first?.at).toBeTypeOf('string')

    // The panel-direct descriptor lands in the same ledger with its caller-supplied context.
    const pageTwo = await draftPage(service, 'Audit two')
    await service.promotePage(pageTwo, { source: 'panel-direct', sessionId: 'sess-fixture', title: 'Audit two' })
    const afterPanel = await ledger(service)
    expect(afterPanel).toHaveLength(2)
    expect(afterPanel[1]).toMatchObject({
      kind: 'promote', id: pageTwo, source: 'panel-direct', sessionId: 'sess-fixture', title: 'Audit two',
    })

    await service.deprecatePage(page)
    const afterDeprecate = await ledger(service)
    expect(afterDeprecate).toHaveLength(3)
    expect(afterDeprecate[2]).toMatchObject({ kind: 'deprecate', id: page, source: 'assistant_reflect' })
  })

  it('writes no ledger line for idempotent no-op transitions', async () => {
    const { service } = boot()
    const page = await draftPage(service, 'Idempotent')
    await service.promotePage(page)
    await service.promotePage(page) // already stable: no second transition, no second line
    await service.deprecatePage(page)
    await service.deprecatePage(page) // already deprecated
    const lines = await ledger(service)
    expect(lines).toHaveLength(2)
  })

  it('audits landing an approved skill proposal', async () => {
    const { service } = boot()
    await service.proposeSkill({
      name: 'audit-ledger-probe',
      description: 'probing the land audit',
      body: 'Body of the proposed skill.',
    })
    const proposalPath = join(service.paths.root, 'skill-proposals', 'audit-ledger-probe.md')
    writeFileSync(proposalPath, readFileSync(proposalPath, 'utf8').replace('status: proposed', 'status: approved'), 'utf8')

    const landed = await service.landSkill('audit-ledger-probe')

    expect(landed.name).toBe('audit-ledger-probe')
    const lines = await ledger(service)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ kind: 'land', id: 'audit-ledger-probe', source: 'assistant_reflect' })
  })
})
