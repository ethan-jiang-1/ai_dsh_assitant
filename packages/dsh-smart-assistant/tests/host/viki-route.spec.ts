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
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { VikiClient, VikiUnavailable } from '../../src/host/viki/client.ts'
import { createVikiRoute, type VikiReader } from '../../src/host/viki-route.ts'

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
    if (url.pathname === '/api/v1/fs/ls') return reply(tree[url.searchParams.get('uri') ?? ''] ?? [])
    if (url.pathname === '/api/v1/fs/attrs') {
      const uri = url.searchParams.get('uri') ?? ''
      return reply({ uri, attrs: { memory: attrs[uri] ?? {} } })
    }
    if (url.pathname === '/api/v1/content/read') return reply(`body of ${url.searchParams.get('uri') ?? ''}`)
    if (url.pathname === '/api/v1/stats/memories') return reply({ total_memories: 3, memories: { events: 2 }, by_category: { events: 3 } })
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
