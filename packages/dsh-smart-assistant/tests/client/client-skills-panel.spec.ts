/**
 * C1 Skills tab: the learned-room list (name/usage/provenance), the read-only body drawer and
 * retire through the A2 route. No prompt, no model turn.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  SkillsPanel: (props?: { sessionId?: string }) => unknown
  deskStore: { data?: Record<string, any> }
  bindDeskEnv: (ctx: unknown) => void
}

const materialize = (): ClientExports => materializeClient(registration, inertReactShim()) as unknown as ClientExports

const data = {
  generatedAt: '2026-10-19T00:00:00.000Z',
  counts: { skills: 2 },
  skills: [
    { name: 'repo-to-knowledge', description: 'turn a repo into a knowledge page', kind: 'learned', source: 'session:2026-10-01', count: 4, lastUsedAt: '2026-10-18T00:00:00.000Z' },
    { name: 'no-source-yet', description: 'still being born', kind: 'learned', count: 0 },
  ],
  memories: [], knowledge: [], research: [],
}

describe('Skills tab (C1)', () => {
  it('lists learned skills with usage and provenance; missing source reads 未知', () => {
    const exports = materialize()
    exports.deskStore.data = data
    const text = textsOf(exports.SkillsPanel({ sessionId: 's1' })).join(' | ')
    expect(text).toContain('学来的 2 件')
    expect(text).toContain('repo-to-knowledge')
    expect(text).toContain('用过 4 次')
    expect(text).toContain('session:2026-10-01')
    expect(text).toContain('出处：未知')
    expect(text).toContain('读正文')
    expect(text).toContain('退役')
  })

  it('reads the body through the route and keeps the drawer surface', async () => {
    const calls: string[] = []
    const exports = materialize() as ClientExports & { loadSkillBody: (name: string) => Promise<{ ok: boolean, body?: string, reason?: string }> }
    exports.bindDeskEnv({
      remote: {},
      web: {
        baseURI: 'http://localhost:3080/mount/',
        fetch: async (input: unknown) => {
          const url = new URL(String(input))
          calls.push(`${url.pathname}${url.search}`)
          return new Response(JSON.stringify({ name: 'repo-to-knowledge', body: '# SKILL\n\nDo it.' }), { headers: { 'content-type': 'application/json' } })
        },
      },
    })
    exports.deskStore.data = data
    const result = await exports.loadSkillBody('repo-to-knowledge')
    expect(result.ok).toBe(true)
    expect(result.body).toContain('Do it.')
    expect(calls[0]).toContain('kind=skill')
  })
})
