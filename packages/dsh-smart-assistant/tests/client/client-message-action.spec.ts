/**
 * C2 "记下来": one assistant-message action, ids only, host resolves the text, no prompt.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  RememberAction: (props: { messageId?: string, sessionId?: string }) => unknown
  bindDeskEnv: (ctx: unknown) => void
}

const materialize = (): ClientExports => materializeClient(registration, inertReactShim()) as unknown as ClientExports

describe('remember assistant message (C2)', () => {
  it('renders 记下来 for a bound message and posts only ids', async () => {
    const exports = materialize()
    const calls: { url: string, body?: string }[] = []
    exports.bindDeskEnv({
      remote: {},
      web: {
        baseURI: 'http://localhost:3080/mount/',
        fetch: async (input: unknown, init?: { body?: string }) => {
          calls.push({ url: String(input), ...(typeof init?.body === 'string' ? { body: init.body } : {}) })
          return new Response(JSON.stringify({ ok: true, action: 'memory.remember', id: 'm-new', status: 'active' }), { headers: { 'content-type': 'application/json' } })
        },
      },
    })
    const text = textsOf(exports.RememberAction({ messageId: 'msg-1', sessionId: 's1' })).join(' | ')
    expect(text).toBe('记下来')
    const element = exports.RememberAction({ messageId: 'msg-1', sessionId: 's1' }) as { props?: { onClick?: () => void } }
    element.props?.onClick?.()
    await new Promise(resolve => { setTimeout(resolve, 0) })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toContain('/api/assistant/rooms')
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({ action: 'memory.remember', sessionId: 's1', messageId: 'msg-1' })
  })

  it('renders nothing without both ids', () => {
    const exports = materialize()
    expect(textsOf(exports.RememberAction({ messageId: 'msg-1' }))).toEqual([])
    expect(textsOf(exports.RememberAction({ sessionId: 's1' }))).toEqual([])
  })
})
