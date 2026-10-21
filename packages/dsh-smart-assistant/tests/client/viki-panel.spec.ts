/**
 * B1 Viki tab: list -> read body, with the server-absent state and no prompt.
 *
 * Acceptance points:
 * - the list renders the both-tree counts and rows (summary/type/peer);
 * - "读全文" fetches the body through the route (the drawer's open state is component-local
 *   React state, unexercised by the inert shim; live probes cover the rendered drawer);
 * - a 503 renders "未连接" with a retry, not a crash;
 * - every interaction is a same-origin GET to `/api/assistant/viki`; no `remote.session.prompt`.
 */
import { describe, expect, it, vi } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  VikiPanel: () => unknown
  bindVikiEnv: (ctx: unknown) => void
  loadViki: () => Promise<unknown>
  loadVikiBody: (uri: string) => Promise<{ ok: true, body: string } | { ok: false, reason: string }>
  loadVikiDiagnostics: () => Promise<{ ok: true, diagnostics: any } | { ok: false, reason: string }>
  loadVikiSearch: (query: string) => Promise<{ ok: true, search: any } | { ok: false, reason: string }>
  roomTabs: readonly { kind: string, title: string, tabTitle?: string, description: string }[]
  resetVikiView: () => void
}

const list = {
  connected: true,
  generatedAt: '2026-10-19T04:00:00.000Z',
  revision: 'r-1',
  space: 'default',
  peers: ['p1'],
  counts: { total: 2, user: 1, peers: 1, events: 2 },
  entries: [
    { uri: 'viking://user/default/memories/events/2026/10/19/a.md', name: 'a.md', source: 'user', summary: '用户记忆 A', memoryType: 'events', eventName: 'A 事件' },
    { uri: 'viking://user/default/peers/p1/memories/events/2026/10/19/b.md', name: 'b.md', source: 'peer', peer: 'p1', summary: 'peer 记忆 B', memoryType: 'events' },
  ],
  problems: [],
}

const materialize = (): ClientExports => materializeClient(registration, inertReactShim()) as unknown as ClientExports

function fakeCtx(calls: string[], respond: (url: URL) => Response): unknown {
  return {
    remote: {},
    web: {
      baseURI: 'http://localhost:3080/mount/',
      fetch: async (input: unknown) => {
        const url = new URL(String(input))
        calls.push(`${url.pathname}${url.search}`)
        return respond(url)
      },
    },
  }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('Viki tab', () => {
  it('labels Viki as an advanced debug surface, not a default room', () => {
    const viki = materialize().roomTabs.find(room => room.kind === 'vikiRoom')
    expect(viki?.title).toBe('Viki(调试)')
    expect(viki?.tabTitle).toBe('Viki(调试)')
    expect(viki?.description).toContain('Viki(调试)')
    expect(viki?.description).toContain('研发/高级用户')
    expect(viki?.description).toContain('普通用户不需要')
  })

  it('renders both-tree counts and rows, and reads a body via the route', async () => {
    const calls: string[] = []
    const exports = materialize()
    exports.bindVikiEnv(fakeCtx(calls, url => url.searchParams.get('uri') === null
      ? json(list)
      : json({ uri: url.searchParams.get('uri'), content: '# A\nfull body text' })))
    exports.resetVikiView()
    const loading = textsOf(exports.VikiPanel()).join(' | ')
    expect(loading).toContain('正在读 Viki 的记忆')
    await exports.loadViki()
    const rendered = textsOf(exports.VikiPanel()).join(' | ')
    expect(rendered).toContain('共 2 条')
    expect(rendered).toContain('用户记忆 A')
    expect(rendered).toContain('peer 记忆 B')
    expect(rendered).toContain('读全文')
    const body = await exports.loadVikiBody(list.entries[0]!.uri)
    expect(body).toEqual({ ok: true, body: '# A\nfull body text' })
    expect(calls.some(call => call.includes('/api/assistant/viki?uri='))).toBe(true)
    expect(calls.every(call => call.includes('/api/assistant/viki'))).toBe(true)
  })

  it('shows the honest not-connected state on 503', async () => {
    const exports = materialize()
    exports.bindVikiEnv(fakeCtx([], () => json({ error: 'viki-unavailable', message: 'OpenViking is not configured' }, 503)))
    await exports.loadViki()
    const rendered = textsOf(exports.VikiPanel()).join(' | ')
    expect(rendered).toContain('Viki 未连接')
    expect(rendered).toContain('重试')
  })

  it('loads diagnostics lazily through ?view=diagnostics', async () => {
    const calls: string[] = []
    const exports = materialize()
    exports.bindVikiEnv(fakeCtx(calls, url => url.searchParams.get('view') === 'diagnostics'
      ? json({
          connected: true,
          generatedAt: '2026-10-21T00:00:00.000Z',
          vikiUrl: 'http://127.0.0.1:1933',
          health: { healthy: true, version: '0.5.1.1', authMode: 'dev' },
          stats: { total: 2, byCategory: { events: 2 } },
          tasks: [{ id: 't1', type: 'session_commit', status: 'failed', error: 'Connection error' }],
          skills: { total: 0, roots: [] },
          pending: 0,
          config: { path: '~/.openviking/ov.conf', provider: 'openai', model: 'test', storage: '~/.openviking/workspace' },
          problems: [],
        })
      : json(list)))
    const result = await exports.loadVikiDiagnostics()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.diagnostics.health.version).toBe('0.5.1.1')
      expect(result.diagnostics.tasks?.[0]?.status).toBe('failed')
    }
    expect(calls.some(call => call.includes('?view=diagnostics'))).toBe(true)
  })

  it('loads stateless search through ?q=', async () => {
    const calls: string[] = []
    const exports = materialize()
    const search = {
      query: '合同',
      entries: [{ uri: list.entries[0]!.uri, name: 'a.md', source: 'user', summary: '搜索结果', score: 0.9 }],
      problems: [],
    }
    exports.bindVikiEnv(fakeCtx(calls, url => url.searchParams.get('q') === '合同' ? json(search) : json(list)))
    const result = await exports.loadVikiSearch('合同')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.search.entries[0]?.summary).toBe('搜索结果')
    expect(calls.some(call => call.includes('?q='))).toBe(true)
  })

  it('falls back to the document web face when production injects no web service', async () => {
    const calls: string[] = []
    vi.stubGlobal('document', { baseURI: 'http://localhost:3080/mount/' })
    vi.stubGlobal('fetch', async (input: unknown) => {
      calls.push(String(input))
      return json(list)
    })
    try {
      const exports = materialize()
      exports.bindVikiEnv({})
      await exports.loadViki()
      expect(calls[0]).toContain('/mount/api/assistant/viki')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('Viki delete / restore / compare (B2/B3)', () => {
  const target = list.entries[0]!.uri
  const fake = (calls: string[], confirmRequired = true): unknown => ({
    remote: {},
    web: {
      baseURI: 'http://localhost:3080/mount/',
      fetch: async (input: unknown, init?: { body?: unknown }) => {
        const url = new URL(String(input))
        calls.push(`${url.pathname}${url.search}`)
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) as { action?: string, confirm?: boolean } : {}
        if (body.action === 'references') return json({ uri: target, references: { knowledge: ['k1'], siblings: [] } })
        if (body.action === 'delete') {
          if (confirmRequired && body.confirm !== true) return json({ error: 'references-require-confirm', references: { knowledge: ['k1'], siblings: [] } }, 409)
          return json({ ok: true, uri: target, commitId: 'c1', at: '2026-10-19T00:00:00.000Z', references: { knowledge: [], siblings: [] } })
        }
        if (body.action === 'restore') return json({ ok: true, commit: 'c1' })
        if (url.searchParams.get('uri') !== null) return json({ uri: url.searchParams.get('uri'), content: 'body' })
        return json(list)
      },
    },
  })

  it('references → blocked delete → confirm → receipt → restore', async () => {
    const calls: string[] = []
    const exports = materialize() as unknown as ClientExports & {
      referencesViki: (uri: string) => Promise<{ knowledge: string[], siblings: string[] }>
      deleteViki: (uri: string, confirm: boolean) => Promise<{ ok: boolean, reason?: string, receipt?: { commitId: string } }>
      restoreViki: (commit: string) => Promise<{ ok: boolean }>
    }
    exports.bindVikiEnv(fake(calls))
    expect(await exports.referencesViki(target)).toMatchObject({ knowledge: ['k1'] })
    const blocked = await exports.deleteViki(target, false)
    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toBe('references-require-confirm')
    const deleted = await exports.deleteViki(target, true)
    expect(deleted.ok).toBe(true)
    expect(deleted.receipt?.commitId).toBe('c1')
    expect(await exports.restoreViki('c1')).toEqual({ ok: true })
  })

  it('renders the delete and compare controls from a ready list', async () => {
    const exports = materialize()
    exports.bindVikiEnv(fake([]))
    await exports.loadViki()
    const text = textsOf(exports.VikiPanel()).join(' | ')
    expect(text).toContain('删')
    expect(text).toContain('并排比较')
    expect(text).toContain('选择')
  })
})
