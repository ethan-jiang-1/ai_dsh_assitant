/**
 * The `assistant-rooms` row's real wiring: the route built over a real AssistantMemory and a
 * real sessionQuery stub, not the hand-built reader/actions used by `rooms-route.spec.ts`.
 *
 * The gap this closes is the wrapper's own mapping: `remember` reads one session event and
 * saves its verbatim text with panel provenance; the reader/actions must be the service
 * methods, not a stand-in. The route core's status/limit rules stay owned by `rooms-route.spec.ts`.
 *
 * Acceptance points:
 * - GET serves the four rooms from the real service;
 * - POST memory.remember reads the named event and writes a memory with that source;
 * - a missing event is an honest failure, not a silent empty save.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import * as Rooms from '../../src/host/rooms-route/index.ts'

const contexts: Context[] = []
const dirs: string[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function harness(readEvent: (sessionId: string, eventId: string) => Promise<unknown>): Promise<{ ctx: Context, route: ConnectionFetchRoute, service: AssistantMemory }> {
  const ctx = new Context()
  contexts.push(ctx)
  let route: ConnectionFetchRoute | undefined
  ctx.provide('connection', {
    fetch: {
      register: (candidate: ConnectionFetchRoute) => {
        route = candidate
        return () => {}
      },
    },
  })
  ctx.provide('sessionQuery', { readEvent })
  const dataDir = mkdtempSync(join(tmpdir(), 'assistant-rooms-row-'))
  dirs.push(dataDir)
  await ctx.plugin(AssistantMemory, { dataDir })
  await ctx.plugin(Rooms)
  if (route === undefined) throw new Error('assistant-rooms did not register a route')
  return { ctx, route, service: ctx.assistantMemory }
}

const GET = (): Request => new Request('http://localhost/api/assistant/rooms')
const POST = (body: unknown): Request => new Request('http://localhost/api/assistant/rooms', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

describe('assistant-rooms row over the real service', () => {
  it('serves the four rooms from the real working folder', async () => {
    const { route } = await harness(async () => undefined)
    const response = await route.fetch(GET())
    expect(response.status).toBe(200)
    const body = await response.json() as Record<string, any>
    expect(body.schemaVersion).toBe(1)
    expect(body).toHaveProperty('memories')
    expect(body).toHaveProperty('research')
    expect(body).toHaveProperty('knowledge')
    expect(body).toHaveProperty('skills')
  })

  it('remembers one session message verbatim with panel provenance', async () => {
    const { route, service } = await harness(async (sessionId, eventId) => {
      expect([sessionId, eventId]).toEqual(['session-1', 'message-1'])
      return { data: { content: [{ type: 'text', text: '记住：客户把付款推迟到 10/20。' }] } }
    })
    const response = await route.fetch(POST({ action: 'memory.remember', sessionId: 'session-1', messageId: 'message-1' }))
    expect(response.status).toBe(200)
    const memories = await service.listMemories()
    const saved = memories.entries.find(entry => entry.text.includes('客户把付款推迟到 10/20'))
    expect(saved).toBeDefined()
    expect(saved?.source).toBe('panel:message:session-1/message-1')
  })

  it('fails honestly when the named event does not exist', async () => {
    const { route, service } = await harness(async () => undefined)
    const response = await route.fetch(POST({ action: 'memory.remember', sessionId: 'session-missing', messageId: 'message-missing' }))
    expect(response.status).toBeGreaterThanOrEqual(400)
    const memories = await service.listMemories()
    expect(memories.entries).toHaveLength(0)
  })
})
