/**
 * The `assistant-knowledge-approve` Remote service's real approval path.
 *
 * The composition spec only proves the service is mounted; this drives `approvePage` against a
 * real AssistantMemory so the three error branches and the audited draft→stable flip are covered.
 *
 * Acceptance points:
 * - a draft flips to stable and appends a `panel-direct` approval line with the click's session;
 * - a missing page is `knowledge/page-not-found`;
 * - an already-stable page is `knowledge/not-a-draft` (no second flip).
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import KnowledgeApproveRemote from '../../src/host/knowledge-approve-remote/index.ts'
import { readApprovals } from '../../src/host/approval-audit.ts'

const contexts: Context[] = []
const dirs: string[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function harness(): Promise<{ service: AssistantMemory, remote: KnowledgeApproveRemote }> {
  const ctx = new Context()
  contexts.push(ctx)
  const dataDir = mkdtempSync(join(tmpdir(), 'assistant-approve-remote-'))
  dirs.push(dataDir)
  await ctx.plugin(AssistantMemory, { dataDir })
  const remote = new KnowledgeApproveRemote(ctx)
  return { service: ctx.assistantMemory, remote }
}

const signal = new AbortController().signal

describe('KnowledgeApproveRemote.approvePage', () => {
  it('flips one draft and audits the click source and session', async () => {
    const { service, remote } = await harness()
    const page = await service.writePage({
      id: 'approve-me',
      type: 'concept',
      title: '待批准页',
      body: '正文',
      sources: ['memory:spec'],
    })
    const result = await remote.approvePage({ pageId: page.id, sessionId: 'session-click', title: '待批准页' }, signal)
    expect(result).toEqual({ id: 'approve-me', status: 'stable' })
    expect((await service.readKnowledgePage('approve-me'))?.page.status).toBe('stable')
    const lines = await readApprovals(service)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ kind: 'promote', id: 'approve-me', source: 'panel-direct', sessionId: 'session-click' })
  })

  it('refuses a missing page and a non-draft page with stable Remote codes', async () => {
    const { service, remote } = await harness()
    await expect(remote.approvePage({ pageId: 'missing', sessionId: 's' }, signal))
      .rejects.toMatchObject({ code: 'knowledge/page-not-found' })
    const page = await service.writePage({ id: 'stable-page', type: 'concept', title: '已稳定', body: 'x', sources: ['memory:spec'] })
    await service.promotePage(page.id, { source: 'panel-direct', sessionId: 's0' })
    await expect(remote.approvePage({ pageId: page.id, sessionId: 's' }, signal))
      .rejects.toMatchObject({ code: 'knowledge/not-a-draft' })
  })
})
