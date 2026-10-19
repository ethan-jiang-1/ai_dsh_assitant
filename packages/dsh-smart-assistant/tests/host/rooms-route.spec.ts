/**
 * The host rooms route: authoritative working-folder data for the panel, no session/path input.
 *
 * Acceptance points:
 * - list returns the four rooms from the reader, with a stable revision and data-derived generatedAt;
 * - knowledge detail returns the full body and backlinks; invalid/missing ids are honest 400/404;
 * - only `?kind=knowledge&id=` is accepted; `?path=`/session/workspace input is refused;
 * - oversized payloads, reader failures and already-aborted requests are honest errors.
 */
import { describe, expect, it } from 'vitest'
import { createRoomsRoute, type RoomsReader } from '../../src/host/rooms-route.ts'
import type { KnowledgePage } from '../../src/domain/knowledge/page.ts'
import type { MemoryRecord } from '../../src/domain/memory/record.ts'
import type { ResearchThread } from '../../src/domain/research/thread.ts'

const page: KnowledgePage = {
  id: 'k1',
  status: 'draft',
  type: 'how-it-works',
  title: '合同条款',
  body: 'x'.repeat(3000),
  links: [],
  sources: [{ resource: 'file:basis.md' }],
  tags: [],
  generated: { by: 'agent:test', at: '2026-10-19T01:00:00.000Z' },
}

const memory: MemoryRecord = {
  id: 'm1',
  kind: 'fact',
  status: 'active',
  created: '2026-10-19T00:00:00.000Z',
  updated: '2026-10-19T00:00:00.000Z',
  tags: [],
  importance: 3,
  text: '记住合同二期款',
}

const thread: ResearchThread = {
  id: 't1',
  status: 'open',
  question: '二期款到底到没到？',
  why: '账本与转述不一致',
  evidence: [],
  created: '2026-10-19T00:00:00.000Z',
  updated: '2026-10-19T00:30:00.000Z',
}

function reader(overrides: Partial<RoomsReader> = {}): RoomsReader {
  return {
    listMemories: async () => ({ entries: [memory], archived: [], failures: [] }),
    listThreads: async () => ({ entries: [thread], archived: [], failures: [] }),
    listKnowledge: async () => ({ entries: [page], failures: [] }),
    readKnowledgePage: async (id: string) => id === page.id ? { page, backlinks: [] } : undefined,
    learnedSkills: async () => ({ entries: [{ name: 'repo-to-knowledge', description: 'turn a repo into pages', origin: 'learned', learnedAt: '2026-10-19T02:00:00.000Z' }], failures: [] }),
    ledger: async () => [],
    skillUsage: async () => ({ usage: { 'repo-to-knowledge': { count: 2, lastUsedAt: '2026-10-19T03:00:00.000Z' } }, since: '2026-10-01T00:00:00.000Z' }),
    ...overrides,
  }
}

const GET = (search = ''): Request => new Request(`http://localhost/api/assistant/rooms${search}`)

describe('host rooms route', () => {
  it('serves the four rooms with data-derived timestamp and a revision, no session/path input', async () => {
    const route = createRoomsRoute(reader())
    expect(route.path).toBe('/api/assistant/rooms')
    expect(route.methods).toEqual(['GET'])
    const response = await route.fetch(GET())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json() as Record<string, any>
    expect(body.schemaVersion).toBe(1)
    expect(body.memories[0]).toMatchObject({ id: 'm1', text: '记住合同二期款' })
    expect(body.research[0]).toMatchObject({ id: 't1', title: '二期款到底到没到？', status: 'open' })
    expect(body.knowledge[0]).toMatchObject({ id: 'k1', title: '合同条款', status: 'draft', type: 'how-it-works' })
    expect(body.knowledge[0].excerpt.length).toBeLessThanOrEqual(200)
    expect(body.knowledge[0].body).toBeUndefined()
    expect(body.skills[0]).toMatchObject({ name: 'repo-to-knowledge', kind: 'learned', count: 2, lastUsedAt: '2026-10-19T03:00:00.000Z' })
    expect(body.counts).toMatchObject({ memories: 1, knowledgeDraft: 1, knowledgeStable: 0, skills: 1, threads: 1 })
    expect(body.generatedAt).toBe('2026-10-19T03:00:00.000Z')
    expect(typeof body.revision).toBe('string')
    expect(body.revision.length).toBeGreaterThan(0)
  })

  it('includes the newest ledger lines and lets generatedAt/revision follow them (A3)', async () => {
    const line = { at: '2026-10-19T04:00:00.000Z', kind: 'promote', id: 'k1', title: '合同条款', room: 'knowledge' as const, source: 'panel-direct' }
    const withLedger = createRoomsRoute(reader({ ledger: async () => [line] }))
    const body = await (await withLedger.fetch(GET())).json() as Record<string, any>
    expect(body.ledger).toEqual([line])
    expect(body.generatedAt).toBe('2026-10-19T04:00:00.000Z')
    const baseline = await (await createRoomsRoute(reader()).fetch(GET())).json() as Record<string, any>
    expect(body.revision).not.toBe(baseline.revision)
  })

  it('serves one knowledge page body and backlinks; missing or malformed ids are honest', async () => {
    const route = createRoomsRoute(reader())
    const ok = await route.fetch(GET('?kind=knowledge&id=k1'))
    expect(ok.status).toBe(200)
    const detail = await ok.json() as Record<string, any>
    expect(detail.body).toBe('x'.repeat(3000))
    expect(detail.backlinks).toEqual([])
    const missing = await route.fetch(GET('?kind=knowledge&id=nope'))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'page-not-found' })
    const bad = await route.fetch(GET('?kind=knowledge&id=../etc'))
    expect(bad.status).toBe(400)
    expect(await bad.json()).toEqual({ error: 'invalid-query' })
    const kind = await route.fetch(GET('?kind=memory&id=m1'))
    expect(kind.status).toBe(400)
    expect(await kind.json()).toEqual({ error: 'invalid-query' })
  })

  it('refuses arbitrary paths/query and never accepts a session or workspace', async () => {
    const route = createRoomsRoute(reader())
    const path = await route.fetch(GET('?path=/etc/passwd'))
    expect(path.status).toBe(400)
    expect(await path.json()).toEqual({ error: 'unexpected-query' })
    const session = await route.fetch(GET('?sessionId=s1'))
    expect(session.status).toBe(400)
    expect(await session.json()).toEqual({ error: 'unexpected-query' })
  })

  it('reports oversized payloads, reader failure and cancellation honestly', async () => {
    const oversized = await createRoomsRoute(reader(), 10).fetch(GET())
    expect(oversized.status).toBe(413)
    expect(await oversized.json()).toEqual({ error: 'projection-too-large' })
    const broken = await createRoomsRoute(reader({ listKnowledge: async () => { throw new Error('boom') } })).fetch(GET())
    expect(broken.status).toBe(500)
    expect(await broken.json()).toEqual({ error: 'rooms-unavailable' })
    const controller = new AbortController()
    controller.abort()
    await expect(createRoomsRoute(reader()).fetch(new Request('http://localhost/api/assistant/rooms', { signal: controller.signal })))
      .rejects.toMatchObject({ name: 'AbortError' })
  })
})
