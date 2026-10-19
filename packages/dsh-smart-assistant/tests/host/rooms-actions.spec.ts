/**
 * A2 controlled writes on the rooms route (`POST /api/assistant/rooms`): one whitelisted action
 * per request, direct host service call, `source: panel-direct` ledger line with before/after,
 * honest 400/404/409 errors. The route is a pure function over the reader/actions interfaces.
 *
 * Acceptance points:
 * - knowledge.approve/deprecate flip through promotePage/deprecatePage with the audit context;
 * - memory.correct supersedes the old record (no in-place body edit) and audits before/after;
 * - memory.retire archives (does not delete) and audits; skill.retire archives and audits;
 * - unknown actions, bad ids/names/text and wrong states are refused, not passed through.
 */
import { describe, expect, it, vi } from 'vitest'
import { createRoomsRoute, type RoomsActions, type RoomsReader } from '../../src/host/rooms-route.ts'
import type { KnowledgePage } from '../../src/domain/knowledge/page.ts'
import type { MemoryRecord } from '../../src/domain/memory/record.ts'
import type { ResearchThread } from '../../src/domain/research/thread.ts'

const draft: KnowledgePage = {
  id: 'k1', status: 'draft', type: 'how-it-works', title: '草稿页', body: 'draft body', links: [], sources: [], tags: [],
}
const stable: KnowledgePage = {
  id: 'k2', status: 'stable', type: 'policy', title: '稳定页', body: 'stable body', links: [], sources: [], tags: [],
}
const memory: MemoryRecord = {
  id: 'm1', kind: 'fact', status: 'active', created: '2026-10-19T00:00:00.000Z',
  updated: '2026-10-19T00:00:00.000Z', tags: ['work'], importance: 4, text: '旧的一句',
}
const thread: ResearchThread = {
  id: 't1', status: 'open', question: 'q', why: 'w', evidence: [], created: '2026-10-19T00:00:00.000Z',
  updated: '2026-10-19T00:00:00.000Z',
}

function reader(): RoomsReader {
  return {
    listMemories: async () => ({ entries: [memory], failures: [] }),
    listThreads: async () => ({ entries: [thread], failures: [] }),
    listKnowledge: async () => ({ entries: [draft, stable], failures: [] }),
    readKnowledgePage: async (id: string) => id === draft.id ? { page: draft, backlinks: [] } : id === stable.id ? { page: stable, backlinks: [] } : undefined,
    learnedSkills: async () => ({ entries: [], failures: [] }),
    ledger: async () => [],
    skillUsage: async () => ({ usage: {} }),
  }
}

function actions(): RoomsActions & {
  readonly promotePage: ReturnType<typeof vi.fn>
  readonly deprecatePage: ReturnType<typeof vi.fn>
  readonly saveMemory: ReturnType<typeof vi.fn>
  readonly forgetMemory: ReturnType<typeof vi.fn>
  readonly retireSkill: ReturnType<typeof vi.fn>
  readonly recordApproval: ReturnType<typeof vi.fn>
} {
  return {
    promotePage: vi.fn(async (id: string) => ({ id, path: '', status: 'stable' })),
    deprecatePage: vi.fn(async (id: string) => ({ id, path: '', status: 'deprecated' })),
    saveMemory: vi.fn(async (input: { text: string }) => ({
      ...memory, id: 'm2', text: input.text, status: 'active' as const, supersedes: memory.id,
    })),
    forgetMemory: vi.fn(async () => true),
  remember: vi.fn(async () => ({ ...memory, id: 'm3', text: '记住这句' })),
    retireSkill: vi.fn(async (name: string) => ({ name, path: `skills/archive/${name}` })),
    recordApproval: vi.fn(async () => undefined),
  }
}

const POST = (body: unknown): Request => new Request('http://localhost/api/assistant/rooms', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

describe('rooms route controlled writes (A2)', () => {
  it('advertises GET and POST and keeps GET readable', async () => {
    const route = createRoomsRoute(reader(), 1024 * 1024, actions())
    expect(route.methods).toEqual(['GET', 'POST'])
    const get = await route.fetch(new Request('http://localhost/api/assistant/rooms'))
    expect(get.status).toBe(200)
    const body = await get.json() as Record<string, any>
    expect(body.knowledge[0].id).toBe('k1')
  })

  it('promotes a draft with panel-direct before/after; refuses non-drafts', async () => {
    const a = actions()
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const ok = await route.fetch(POST({ action: 'knowledge.approve', id: 'k1', sessionId: 's1' }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ ok: true, action: 'knowledge.approve', id: 'k1', status: 'stable' })
    expect(a.promotePage).toHaveBeenCalledWith('k1', expect.objectContaining({
      source: 'panel-direct', sessionId: 's1', room: 'knowledge', before: { status: 'draft' }, after: { status: 'stable' },
    }))
    const bad = await route.fetch(POST({ action: 'knowledge.approve', id: 'k2' }))
    expect(bad.status).toBe(409)
    expect(await bad.json()).toEqual({ error: 'not-a-draft' })
  })

  it('deprecates a stable page and refuses a draft', async () => {
    const a = actions()
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const ok = await route.fetch(POST({ action: 'knowledge.deprecate', id: 'k2' }))
    expect(ok.status).toBe(200)
    expect(a.deprecatePage).toHaveBeenCalledWith('k2', expect.objectContaining({
      source: 'panel-direct', room: 'knowledge', before: { status: 'stable' }, after: { status: 'deprecated' },
    }))
    const bad = await route.fetch(POST({ action: 'knowledge.deprecate', id: 'k1' }))
    expect(bad.status).toBe(409)
    expect(await bad.json()).toEqual({ error: 'not-stable' })
  })

  it('corrects a memory by superseding the old record, never editing it in place', async () => {
    const a = actions()
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const ok = await route.fetch(POST({ action: 'memory.correct', id: 'm1', text: '新的一句', sessionId: 's1' }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ ok: true, action: 'memory.correct', id: 'm2' })
    expect(a.saveMemory).toHaveBeenCalledWith(expect.objectContaining({
      text: '新的一句', kind: 'fact', tags: ['work'], importance: 4, supersedes: 'm1', source: 'panel-direct',
    }))
    expect(a.recordApproval).toHaveBeenCalledWith('correct', 'm2', expect.objectContaining({
      source: 'panel-direct', sessionId: 's1', room: 'memory',
      before: { id: 'm1', text: '旧的一句' }, after: { id: 'm2', text: '新的一句' },
    }))
    const missingText = await route.fetch(POST({ action: 'memory.correct', id: 'm1' }))
    expect(missingText.status).toBe(400)
    expect(await missingText.json()).toEqual({ error: 'missing-text' })
  })

  it('retires a memory into the archive and audits the transition', async () => {
    const a = actions()
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const ok = await route.fetch(POST({ action: 'memory.retire', id: 'm1' }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ ok: true, action: 'memory.retire', id: 'm1', status: 'retired' })
    expect(a.forgetMemory).toHaveBeenCalledWith('m1')
    expect(a.recordApproval).toHaveBeenCalledWith('retire', 'm1', expect.objectContaining({
      room: 'memory', before: { status: 'active' }, after: { status: 'retired' },
    }))
  })

  it('retires a learned skill and audits the archive path', async () => {
    const a = actions()
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const ok = await route.fetch(POST({ action: 'skill.retire', name: 'repo-to-knowledge', reason: '不再用' }))
    expect(ok.status).toBe(200)
    expect(a.retireSkill).toHaveBeenCalledWith('repo-to-knowledge', '不再用')
    expect(a.recordApproval).toHaveBeenCalledWith('retire', 'repo-to-knowledge', expect.objectContaining({
      room: 'skills', after: { status: 'archived', reason: '不再用' },
    }))
    const bad = await route.fetch(POST({ action: 'skill.retire', name: 'Not Kebab' }))
    expect(bad.status).toBe(400)
    expect(await bad.json()).toEqual({ error: 'invalid-name' })
  })

  it('refuses unknown actions, bad bodies and missing targets without touching the service', async () => {
    const a = actions()
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const unknown = await route.fetch(POST({ action: 'memory.create' }))
    expect(unknown.status).toBe(400)
    expect(await unknown.json()).toEqual({ error: 'unknown-action' })
    const invalid = await route.fetch(POST({}))
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toEqual({ error: 'missing-action' })
    const missing = await route.fetch(POST({ action: 'memory.retire', id: 'nope' }))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'memory-not-found' })
    const notJson = await route.fetch(new Request('http://localhost/api/assistant/rooms', { method: 'POST', body: 'not json' }))
    expect(notJson.status).toBe(400)
    expect(await notJson.json()).toEqual({ error: 'invalid-json' })
    expect(a.forgetMemory).not.toHaveBeenCalled()
  })
})


describe('memory.remember (C2)', () => {
  it('remembers one durable message through the host action', async () => {
    const a = actions()
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const ok = await route.fetch(POST({ action: 'memory.remember', sessionId: 's1', messageId: 'msg-1' }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ ok: true, action: 'memory.remember', id: 'm3' })
    expect(a.remember).toHaveBeenCalledWith('s1', 'msg-1')
    const missing = await route.fetch(POST({ action: 'memory.remember', sessionId: 's1' }))
    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: 'missing-message' })
  })

  it('surfaces the budget refusal as an action failure', async () => {
    const a = actions()
    a.remember.mockRejectedValueOnce(new Error('memory digest budget is exhausted; retire something first'))
    const route = createRoomsRoute(reader(), 1024 * 1024, a)
    const response = await route.fetch(POST({ action: 'memory.remember', sessionId: 's1', messageId: 'msg-1' }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'action-failed' })
  })
})
