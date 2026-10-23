/**
 * A2 client actions (`src/client/room-data-actions.ts`): the direct writes go to the host POST
 * route and patch the session's projection immediately; failures leave the row unchanged with a
 * readable note and never send a prompt.
 *
 * Acceptance points:
 * - approve/deprecate flip the knowledge row and the counts in the store;
 * - correct replaces the memory row with the returned new id/text; retire removes it;
 * - a 409 leaves the row intact and surfaces the server reason;
 * - every action is one POST to `/api/assistant/rooms` with the action name in the body.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  apply: (ctx: unknown) => void
  deskStore: { data?: Record<string, any>, note?: string, readError?: string }
  approveKnowledgePage: (title: string, rowId: string, sessionId?: string) => void
  deprecateKnowledgePage: (title: string, rowId: string, sessionId?: string) => void
  correctMemory: (correction: string, rowId: string, sessionId?: string) => void
  retireMemory: (id: string, sessionId?: string) => void
  retireSkill: (name: string, sessionId?: string) => void
  KnowledgePanel: (props?: { sessionId?: string }) => unknown
  MemoryPanel: (props?: { sessionId?: string }) => unknown
}

const rooms = {
  schemaVersion: 1,
  generatedAt: '2026-10-19T00:00:00.000Z',
  revision: 'rev-1',
  counts: { memories: 1, threads: 0, skills: 1, knowledgeStable: 1, knowledgeDraft: 1 },
  memories: [{ id: 'm1', kind: 'fact', text: '旧的一句', updated: '2026-10-19T00:00:00.000Z' }],
  research: [],
  skills: [{ name: 's1', description: 'a learned skill', kind: 'learned', count: 1 }],
  knowledge: [
    { id: 'k1', title: '草稿页', status: 'draft', type: 'how-it-works', excerpt: 'draft' },
    { id: 'k2', title: '稳定页', status: 'stable', type: 'policy', excerpt: 'stable' },
  ],
  ledger: [],
  problems: [],
}

const materialize = (): ClientExports =>
  materializeClient(registration, inertReactShim()) as unknown as ClientExports

const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) await new Promise(resolve => { setTimeout(resolve, 0) })
}

interface Call { readonly url: string, readonly method: string, readonly body?: string }

function fakeCtx(calls: Call[], postResponse: () => Response): unknown {
  return {
    remote: {},
    web: {
      baseURI: 'http://localhost:3080/mount/',
      origin: 'http://localhost:3080',
      fetch: async (input: unknown, init?: { method?: string, body?: string }) => {
        const method = init?.method ?? 'GET'
        calls.push({ url: String(input), method, ...(typeof init?.body === 'string' ? { body: init.body } : {}) })
        if (method === 'POST') return postResponse()
        return new Response(JSON.stringify(rooms), { headers: { 'content-type': 'application/json' } })
      },
    },
    sessions: { list: { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => () => {} } },
    effect: (install: () => () => void) => { install() },
    slots: { inject: () => {} },
    sidebarRightTabs: { register: () => {} },
  }
}

const ok = (value: Record<string, unknown>): Response =>
  new Response(JSON.stringify({ ok: true, ...value }), { headers: { 'content-type': 'application/json' } })

describe('A2 direct room actions', () => {
  it('approves a draft through one POST and flips the row + counts immediately', async () => {
    const calls: Call[] = []
    const exports = materialize()
    exports.apply(fakeCtx(calls, () => ok({ action: 'knowledge.approve', id: 'k1', status: 'stable' })))
    await flush()
    expect(exports.deskStore.data?.knowledge?.[0].status).toBe('draft')

    exports.approveKnowledgePage('草稿页', 'k1', 's1')
    await flush()

    const post = calls.find(call => call.method === 'POST')
    expect(post?.url).toContain('/api/assistant/rooms')
    expect(JSON.parse(post?.body ?? '{}')).toMatchObject({ action: 'knowledge.approve', id: 'k1', title: '草稿页', sessionId: 's1' })
    expect(exports.deskStore.data?.knowledge?.[0].status).toBe('stable')
    expect(exports.deskStore.data?.ledger?.at(-1)).toMatchObject({ kind: 'promote', id: 'k1', room: 'knowledge', source: 'panel-direct' })
    expect(exports.deskStore.data?.counts).toMatchObject({ knowledgeDraft: 0, knowledgeStable: 2 })
    expect(textsOf(exports.KnowledgePanel({ sessionId: 's1' })).join(' | ')).toContain('已确认')
  })

  it('corrects a memory by replacing the row with the returned new id and text', async () => {
    const calls: Call[] = []
    const exports = materialize()
    exports.apply(fakeCtx(calls, () => ok({ action: 'memory.correct', id: 'm2', status: 'active' })))
    await flush()

    exports.correctMemory('新的一句', 'm1', 's1')
    await flush()

    expect(JSON.parse(calls.find(call => call.method === 'POST')?.body ?? '{}')).toMatchObject({
      action: 'memory.correct', id: 'm1', text: '新的一句', sessionId: 's1',
    })
    expect(exports.deskStore.data?.memories?.[0]).toMatchObject({ id: 'm2', text: '新的一句' })
    expect(textsOf(exports.MemoryPanel({ sessionId: 's1' })).join(' | ')).toContain('新的一句')
  })

  it('retires memory and skill rows, removes them from the projection and recounts', async () => {
    const calls: Call[] = []
    const exports = materialize()
    exports.apply(fakeCtx(calls, () => ok({ action: 'memory.retire', id: 'm1', status: 'retired' })))
    await flush()

    exports.retireMemory('m1', 's1')
    await flush()
    expect(exports.deskStore.data?.memories).toEqual([])
    expect(exports.deskStore.data?.counts).toMatchObject({ memories: 0 })

    exports.retireSkill('s1', 's1')
    await flush()
    expect(exports.deskStore.data?.skills).toEqual([])
    expect(exports.deskStore.data?.counts).toMatchObject({ skills: 0 })
  })

  it('leaves the row intact and shows the server reason when the host refuses', async () => {
    const calls: Call[] = []
    const exports = materialize()
    exports.apply(fakeCtx(calls, () => new Response(JSON.stringify({ error: 'not-a-draft' }), {
      status: 409, headers: { 'content-type': 'application/json' },
    })))
    await flush()

    exports.approveKnowledgePage('草稿页', 'k1', 's1')
    await flush()

    expect(exports.deskStore.data?.knowledge?.[0].status).toBe('draft')
    expect(exports.deskStore.note).toContain('批准失败：not-a-draft')
  })
})
