/**
 * The tracked send path (`sendPrompt`): every panel action rides it. The spec pins the four
 * branches a regression would hide: a targeted send sets the pending row and emits one queued
 * panel-marked request; a failed remote clears the pending and surfaces its reason; no target
 * and no remote surface a readable note instead of silently doing nothing.
 *
 * The 10-second read-back poller and its 15-try expiry are exercised by the desk return flow in
 * `desk-arms.spec.ts` / the web-face scenes; this spec stays on the send boundary and uses fake
 * timers so no poller outlives it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDeskStore, initDeskStore, deskSlice } from '../../src/client/rooms/room-data-core'
import { bindDeskEnv } from '../../src/client/rooms/room-data-io'
import { sendPrompt } from '../../src/client/rooms/prompt-bridge'

function bind(remote: Record<string, unknown>, ids: string[] = [], web?: Record<string, unknown>): void {
  bindDeskEnv({
    remote,
    sessions: { list: { getSnapshot: () => ({ ids, byId: {} }), subscribe: () => () => {} } },
    ...(web === undefined ? {} : { web }),
  } as never)
}

beforeEach(() => {
  vi.useFakeTimers()
  initDeskStore()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('sendPrompt', () => {
  it('sends one queued panel-marked request and tracks the pending row', () => {
    const prompts: { requestId: string, sessionId: string, mode: string, content: { text: string }[] }[] = []
    bind({ session: { prompt: (request: never) => { prompts.push(request); return Promise.resolve({ ok: true }) } } })
    sendPrompt('把这件事记下来', '记下来', 'row-1', 'session-1')
    expect(prompts).toHaveLength(1)
    expect(prompts[0]?.sessionId).toBe('session-1')
    expect(prompts[0]?.mode).toBe('queue')
    expect(prompts[0]?.content[0]?.text).toBe('[面板] 把这件事记下来')
    expect(deskSlice('session-1').pending).toMatchObject({ rowId: 'row-1', action: '记下来' })
  })

  it('clears the pending row and surfaces the remote reason when the queue refuses', async () => {
    bind({ session: { prompt: () => Promise.resolve({ ok: false, error: { message: 'queue full' } }) } })
    sendPrompt('试试', '试一下', 'row-2', 'session-1')
    expect(deskSlice('session-1').pending).toBeDefined()
    await Promise.resolve()
    expect(deskSlice('session-1').pending).toBeUndefined()
    expect(getDeskStore().note).toBe('queue full')
  })

  it('expires a send the desk never acknowledges after the 15-poll budget', async () => {
    bind({ session: { prompt: () => Promise.resolve({ ok: true }) } })
    sendPrompt('等不到回写', '试一下', 'row-5', 'session-1')
    expect(deskSlice('session-1').pending).toBeDefined()
    await vi.runAllTimersAsync()
    expect(deskSlice('session-1').pending).toBeUndefined()
    expect(deskSlice('session-1').stalled).toBeDefined()
  })

  it('explains the missing session and the missing remote instead of silently dropping the line', () => {
    bind({}, [])
    sendPrompt('试试', '试一下', 'row-3')
    expect(getDeskStore().note).toContain('还没有会话')

    initDeskStore()
    bind({})
    sendPrompt('试试', '试一下', 'row-4', 'session-2')
    expect(getDeskStore().note).toContain('remote.session did not materialize')
  })
})
