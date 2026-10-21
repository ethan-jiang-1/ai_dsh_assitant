/**
 * B1 Viki read face: the client walks the two real trees (`user/<space>/memories` and
 * `peers/<peer>/memories/events/YYYY/MM/DD`) and the exact route only reads inside the configured
 * space/peer.
 *
 * Acceptance points:
 * - the list is both trees (not just the two `user` templates); summaries/type/title come from
 *   `fs/attrs.memory`, never the empty `fs/ls.abstract`;
 * - hidden/`.overview` files are skipped; `stats/memories` is cross-checked with the tree;
 * - `?uri` outside the whitelist (including `..` traversal) is 403; a missing server is 503;
 * - `Authorization: Bearer` rides when a key is configured.
 */
import { createServer, type Server } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { VikiClient, VikiUnavailable } from '../../src/host/viki/client.ts'
import { createVikiRoute, type VikiActions, type VikiReader } from '../../src/host/viki/route.ts'
import AssistantMemory from '../../src/index.ts'
import * as VikiRow from '../../src/host/viki/index.ts'
import { readApprovals } from '../../src/host/approval-audit.ts'

const BASE = 'viking://user/default'
const events = `${BASE}/peers/p1/memories/events/2026/10/19`
const p2events = `${BASE}/peers/p2/memories/events/2026/10/19`

const tree: Record<string, { uri: string, size?: number, isDir?: boolean, modTime?: string, abstract?: string }[]> = {
  [`${BASE}/memories`]: [
    { uri: `${BASE}/memories/identity.md`, size: 10, isDir: false, modTime: '2026-10-19T01:00:00.000Z' },
    { uri: `${BASE}/memories/soul.md`, size: 11, isDir: false, modTime: '2026-10-19T01:00:00.000Z' },
    { uri: `${BASE}/memories/events`, isDir: true, modTime: '2026-10-19T01:00:00.000Z' },
  ],
  [`${BASE}/memories/events`]: [{ uri: `${BASE}/memories/events/2026`, isDir: true }],
  [`${BASE}/memories/events/2026`]: [{ uri: `${BASE}/memories/events/2026/10`, isDir: true }],
  [`${BASE}/memories/events/2026/10`]: [{ uri: `${BASE}/memories/events/2026/10/19`, isDir: true }],
  [`${BASE}/memories/events/2026/10/19`]: [
    { uri: `${BASE}/memories/events/2026/10/19/a.md`, size: 100, isDir: false, modTime: '2026-10-19T02:00:00.000Z' },
    { uri: `${BASE}/memories/events/2026/10/19/.overview.md`, size: 10, isDir: false, modTime: '2026-10-19T02:00:00.000Z' },
  ],
  [`${BASE}/peers`]: [
    { uri: `${BASE}/peers/p1`, isDir: true, modTime: '2026-10-19T01:00:00.000Z' },
    { uri: `${BASE}/peers/p2`, isDir: true, modTime: '2026-10-19T01:00:00.000Z' },
  ],
  [`${BASE}/peers/p1/memories`]: [{ uri: events, isDir: true }],
  [events]: [{ uri: `${events}/b.md`, size: 200, isDir: false, modTime: '2026-10-19T03:00:00.000Z' }],
  [`${BASE}/peers/p2/memories`]: [{ uri: p2events, isDir: true }],
  [p2events]: [{ uri: `${p2events}/c.md`, size: 300, isDir: false, modTime: '2026-10-19T04:00:00.000Z' }],
}

const attrs: Record<string, { event_name?: string, summary?: string, memory_type?: string }> = {
  [`${BASE}/memories/identity.md`]: { event_name: 'Identity', summary: 'identity template', memory_type: 'profile' },
  [`${BASE}/memories/soul.md`]: { event_name: 'Soul', memory_type: 'profile' },
  [`${BASE}/memories/events/2026/10/19/a.md`]: { event_name: 'A event', summary: 'summary a', memory_type: 'events' },
  [`${events}/b.md`]: { event_name: 'B event', summary: 'summary b', memory_type: 'events' },
  [`${p2events}/c.md`]: { event_name: 'C event', summary: 'summary c', memory_type: 'events' },
}

let server: Server
let baseUrl = ''
let lastAuth = ''

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    lastAuth = req.headers.authorization ?? ''
    const reply = (result: unknown): void => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', result }))
    }
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', healthy: true, version: '0.5.1.1', auth_mode: 'dev' }))
      return
    }
    if (url.pathname === '/api/v1/fs/ls') return reply(tree[url.searchParams.get('uri') ?? ''] ?? [])
    if (url.pathname === '/api/v1/fs/attrs') {
      const uri = url.searchParams.get('uri') ?? ''
      return reply({ uri, attrs: { memory: attrs[uri] ?? {} } })
    }
    if (url.pathname === '/api/v1/content/read') return reply(`body of ${url.searchParams.get('uri') ?? ''}`)
    if (url.pathname === '/api/v1/snapshot/commit' && req.method === 'POST') return reply({ commit_id: 'commit-1' })
    if (url.pathname === '/api/v1/fs' && req.method === 'DELETE') return reply(true)
    if (url.pathname === '/api/v1/snapshot/restore' && req.method === 'POST') return reply(true)
    if (url.pathname === '/api/v1/stats/memories') return reply({ total_memories: 3, memories: { events: 2 }, by_category: { events: 3 } })
    if (url.pathname === '/api/v1/tasks') return reply([{ task_id: 't1', task_type: 'session_commit', status: 'failed', created_at_iso: '2026-10-21T00:00:00Z', error: 'Connection error' }])
    if (url.pathname === '/api/v1/skills') return reply({ root_uris: ['viking://user/default/skills'], skills: [], total: 0 })
    if (url.pathname === '/api/v1/search/find' && req.method === 'POST') return reply({
      memories: [
        { uri: `${events}/b.md`, abstract: 'summary b from search', score: 0.9 },
        { uri: 'viking://user/default/resources/outside.md', abstract: 'must be filtered', score: 0.8 },
      ],
    })
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'error', error: 'not found' }))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${String(typeof address === 'object' && address !== null ? address.port : 0)}`
})

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()))
})

describe('VikiClient', () => {
  it('walks user + both peers, uses attrs for summary/title/type and skips hidden files', async () => {
    const client = new VikiClient({ baseUrl, space: 'default' })
    const list = await client.list()
    expect(list.entries.map(entry => entry.uri)).toHaveLength(5)
    expect(list.entries.map(entry => entry.name)).not.toContain('.overview.md')
    const a = list.entries.find(entry => entry.name === 'a.md')
    expect(a).toMatchObject({ summary: 'summary a', eventName: 'A event', memoryType: 'events', source: 'user' })
    const b = list.entries.find(entry => entry.name === 'b.md')
    expect(b).toMatchObject({ summary: 'summary b', source: 'peer', peer: 'p1' })
    // attrs has no summary for soul.md: the body's first line is the honest fallback.
    const soul = list.entries.find(entry => entry.name === 'soul.md')
    expect(soul?.summary).toContain('body of')
    expect(list.counts).toEqual({ total: 5, user: 3, peers: 2, events: 3 })
    expect(list.peers).toEqual(['p1', 'p2'])
    // The mock reports 2 stats events against 3 enumerated events: the mismatch must be surfaced.
    expect(list.problems.join(' ')).toContain('stats/memories reports 2 events but the tree enumerates 3')
    expect(list.generatedAt).toBe('2026-10-19T04:00:00.000Z')
    expect(list.revision).toMatch(/^[0-9a-f]{64}$/)
  })

  it('restricts the peer to one when configured and reads one allowed body', async () => {
    const client = new VikiClient({ baseUrl, space: 'default', peer: 'p1', apiKey: 'secret' })
    const list = await client.list()
    expect(list.entries.map(entry => entry.name)).toEqual(['a.md', 'identity.md', 'soul.md', 'b.md'])
    const body = await client.read(`${events}/b.md`)
    expect(body).toContain('body of')
    expect(lastAuth).toBe('Bearer secret')
    await expect(client.read(`${p2events}/c.md`)).rejects.toBeInstanceOf(VikiUnavailable)
  })

  it('refuses an out-of-tree URI and a missing server', async () => {
    const client = new VikiClient({ baseUrl, space: 'default', peer: 'p1' })
    await expect(client.read('viking://user/default/memories/../../other.md')).rejects.toBeInstanceOf(VikiUnavailable)
    const empty = new VikiClient({ baseUrl: '', space: 'default' })
    await expect(empty.list()).rejects.toBeInstanceOf(VikiUnavailable)
  })
})

describe('Viki route', () => {
  const listReader = (client: VikiClient): VikiReader => ({ list: () => client.list(), read: uri => client.read(uri) })

  it('serves the list and one body inside the configured whitelist', async () => {
    const client = new VikiClient({ baseUrl, space: 'default', peer: 'p1' })
    const route = createVikiRoute(listReader(client), { allowedSpaces: ['default'], allowedPeers: ['p1'] })
    expect(route.methods).toEqual(['GET'])
    const list = await route.fetch(new Request('http://localhost/api/assistant/viki'))
    expect(list.status).toBe(200)
    const body = await list.json() as { counts: { total: number } }
    expect(body.counts.total).toBe(4)
    const read = await route.fetch(new Request(`http://localhost/api/assistant/viki?uri=${encodeURIComponent(`${events}/b.md`)}`))
    expect(read.status).toBe(200)
    expect(await read.json()).toMatchObject({ uri: `${events}/b.md` })
  })

  it('refuses other spaces, other peers and arbitrary URIs', async () => {
    const client = new VikiClient({ baseUrl, space: 'default', peer: 'p1' })
    const route = createVikiRoute(listReader(client), { allowedSpaces: ['default'], allowedPeers: ['p1'] })
    expect((await route.fetch(new Request('http://localhost/api/assistant/viki?space=other'))).status).toBe(403)
    expect((await route.fetch(new Request('http://localhost/api/assistant/viki?peer=p2'))).status).toBe(403)
    const p2 = await route.fetch(new Request(`http://localhost/api/assistant/viki?uri=${encodeURIComponent(`${p2events}/c.md`)}`))
    expect(p2.status).toBe(403)
    expect(await p2.json()).toEqual({ error: 'uri-not-allowed' })
  })

  it('returns 503 for an unconfigured server, not a boot failure', async () => {
    const empty = new VikiClient({ baseUrl: '', space: 'default' })
    const route = createVikiRoute(listReader(empty), { allowedSpaces: ['default'], allowedPeers: [] })
    const response = await route.fetch(new Request('http://localhost/api/assistant/viki'))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: 'viki-unavailable' })
  })
})


const target = `${events}/b.md`

function fakeActions(overrides: Partial<VikiActions> = {}): VikiActions {
  return {
    commit: vi.fn(async () => 'commit-1'),
    remove: vi.fn(async () => undefined),
    restore: vi.fn(async () => undefined),
    references: vi.fn(async () => ({ knowledge: [], siblings: [] })),
    audit: vi.fn(async () => undefined),
    ...overrides,
  }
}

const POST = (body: unknown): Request => new Request('http://localhost/api/assistant/viki', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

describe('Viki delete / restore (B2)', () => {
  const client = (): VikiClient => new VikiClient({ baseUrl, space: 'default', peer: 'p1' })
  const route = (actions: VikiActions): ReturnType<typeof createVikiRoute> => createVikiRoute(
    { list: () => client().list(), read: uri => client().read(uri) },
    { allowedSpaces: ['default'], allowedPeers: ['p1'] },
    actions,
  )

  it('requires a snapshot commit before deleting and returns the receipt', async () => {
    const actions = fakeActions()
    const response = await route(actions).fetch(POST({ action: 'delete', uri: target }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, uri: target, commitId: 'commit-1' })
    expect(actions.commit).toHaveBeenCalledWith([target])
    expect(actions.remove).toHaveBeenCalledWith(target)
    expect(actions.audit).toHaveBeenCalledWith(target, 'commit-1', undefined)
  })

  it('blocks a referenced delete until confirm:true and returns the references', async () => {
    const actions = fakeActions({ references: vi.fn(async () => ({ knowledge: ['k1'], siblings: [target] })) })
    const blocked = await route(actions).fetch(POST({ action: 'delete', uri: target }))
    expect(blocked.status).toBe(409)
    expect(await blocked.json()).toMatchObject({ error: 'references-require-confirm', references: { knowledge: ['k1'] } })
    expect(actions.commit).not.toHaveBeenCalled()
    const confirmed = await route(actions).fetch(POST({ action: 'delete', uri: target, confirm: true }))
    expect(confirmed.status).toBe(200)
    expect(actions.commit).toHaveBeenCalledWith([target])
  })

  it('refuses when snapshot/commit fails and never removes the file', async () => {
    const actions = fakeActions({ commit: vi.fn(async () => { throw new Error('no snapshot') }) })
    const response = await route(actions).fetch(POST({ action: 'delete', uri: target }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: 'snapshot-required' })
    expect(actions.remove).not.toHaveBeenCalled()
  })

  it('refuses directories, unknown URIs and out-of-tree URIs', async () => {
    const actions = fakeActions()
    const directory = await route(actions).fetch(POST({ action: 'delete', uri: `${events}/` }))
    expect(directory.status).toBe(409)
    const missing = await route(actions).fetch(POST({ action: 'delete', uri: `${events}/nope.md` }))
    expect(missing.status).toBe(404)
    const outside = await route(actions).fetch(POST({ action: 'delete', uri: 'viking://user/default/memories/../../x.md' }))
    expect(outside.status).toBe(403)
  })

  it('serves references and restore', async () => {
    const actions = fakeActions({ references: vi.fn(async () => ({ knowledge: [], siblings: ['s1'] })) })
    const refs = await route(actions).fetch(POST({ action: 'references', uri: target }))
    expect(await refs.json()).toMatchObject({ uri: target, references: { siblings: ['s1'] } })
    const restored = await route(actions).fetch(POST({ action: 'restore', commit: 'commit-1' }))
    expect(restored.status).toBe(200)
    expect(actions.restore).toHaveBeenCalledWith('commit-1')
  })

  it('client commits, deletes and restores against the server', async () => {
    const c = client()
    await expect(c.commit([target])).resolves.toBe('commit-1')
    await expect(c.remove(target)).resolves.toBeUndefined()
    await expect(c.restore('commit-1')).resolves.toBeUndefined()
  })
})


describe('assistant-viki row wiring', () => {
  const contexts: Context[] = []
  const dirs: string[] = []
  afterEach(async () => {
    for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  async function harness(): Promise<{ route: any, service: AssistantMemory }> {
    const ctx = new Context()
    contexts.push(ctx)
    let route: any
    ctx.provide('connection', { fetch: { register: (candidate: any) => { route = candidate; return () => {} } } })
    ctx.provide('sessions', { get: (id: string) => id === 'session-1' ? { id } : undefined })
    ctx.provide('tokenMeter', { measure: () => ({ totalTokens: 1234, logRevision: 7, baseline: { kind: 'usage' } }) })
    const dataDir = mkdtempSync(join(tmpdir(), 'assistant-viki-row-'))
    dirs.push(dataDir)
    await ctx.plugin(AssistantMemory, { dataDir })
    await ctx.plugin(VikiRow, { baseUrl, space: 'default' })
    if (route === undefined) throw new Error('assistant-viki did not register a route')
    return { route, service: ctx.assistantMemory }
  }

  const post = (body: unknown): Request => new Request('http://localhost/api/assistant/viki', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })

  it('computes references and audits a delete from the real row', async () => {
    const { route, service } = await harness()
    const target = `${BASE}/memories/identity.md`
    const referenced = await route.fetch(post({ action: 'references', uri: target }))
    expect(referenced.status).toBe(200)
    expect((await referenced.json() as any).references).toEqual({ knowledge: [], siblings: [] })

    const deleted = await route.fetch(post({ action: 'delete', uri: target, confirm: true, title: 'Identity' }))
    expect(deleted.status).toBe(200)
    expect((await deleted.json() as any)).toMatchObject({ ok: true, uri: target, commitId: 'commit-1' })

    const lines = await readApprovals(service)
    expect(lines[0]).toMatchObject({ kind: 'retire', id: target, source: 'panel-direct', room: 'viki', title: 'Identity' })
    expect(lines[0]?.after).toMatchObject({ status: 'deleted', commitId: 'commit-1' })
  })

  it('restores a commit through the same row', async () => {
    const { route } = await harness()
    const restored = await route.fetch(post({ action: 'restore', commit: 'commit-1' }))
    expect(restored.status).toBe(200)
    expect(await restored.json()).toEqual({ ok: true, commit: 'commit-1' })
  })

  it('includes the current-session token measurement when host services are present', async () => {
    const { route } = await harness()
    const response = await route.fetch(new Request('http://localhost/api/assistant/viki?view=diagnostics&session=session-1'))
    expect(response.status).toBe(200)
    const body = await response.json() as any
    expect(body.tokens).toEqual({ total: 1234, basis: 'usage', logRevision: 7 })
  })

  it('serves stateless search and filters hits through the URI whitelist', async () => {
    const { route } = await harness()
    const response = await route.fetch(new Request('http://localhost/api/assistant/viki?q=%E5%90%88%E5%90%8C'))
    expect(response.status).toBe(200)
    const body = await response.json() as any
    expect(body.query).toBe('合同')
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0]).toMatchObject({
      uri: `${events}/b.md`,
      source: 'peer',
      peer: 'p1',
      summary: 'summary b from search',
      score: 0.9,
    })
    expect(body.entries.some((hit: any) => String(hit.uri).includes('/resources/'))).toBe(false)
  })

  it('serves the diagnostics view as a read-only projection', async () => {
    const { route } = await harness()
    const response = await route.fetch(new Request('http://localhost/api/assistant/viki?view=diagnostics'))
    expect(response.status).toBe(200)
    const body = await response.json() as any
    expect(body.connected).toBe(true)
    expect(body.health).toMatchObject({ healthy: true, version: '0.5.1.1', authMode: 'dev' })
    expect(body.stats).toMatchObject({ total: 3, byCategory: { events: 3 } })
    expect(body.tasks?.[0]).toMatchObject({ type: 'session_commit', status: 'failed', error: 'Connection error' })
    expect(body.skills).toMatchObject({ total: 0 })
    expect(body.vikiUrl).toBe(baseUrl)
    expect(JSON.stringify(body)).not.toContain('sk-')
  })

  it('falls back to local 127.0.0.1:1933 when neither config nor env sets a URL', async () => {
    const previous = process.env.OPENVIKING_URL
    delete process.env.OPENVIKING_URL
    const calls: string[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response(JSON.stringify({ status: 'error' }), { status: 503, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    try {
      const ctx = new Context()
      contexts.push(ctx)
      let route: any
      ctx.provide('connection', { fetch: { register: (candidate: any) => { route = candidate; return () => {} } } })
      const dataDir = mkdtempSync(join(tmpdir(), 'assistant-viki-default-'))
      dirs.push(dataDir)
      await ctx.plugin(AssistantMemory, { dataDir })
      await ctx.plugin(VikiRow, { space: 'default' })
      if (route === undefined) throw new Error('assistant-viki did not register a route')
      const response = await route.fetch(new Request('http://localhost/api/assistant/viki'))
      expect(response.status).toBe(503)
      expect(calls[0]).toContain('http://127.0.0.1:1933')
    } finally {
      globalThis.fetch = originalFetch
      if (previous === undefined) delete process.env.OPENVIKING_URL
      else process.env.OPENVIKING_URL = previous
    }
  })
})
