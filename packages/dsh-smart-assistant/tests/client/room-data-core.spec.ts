/**
 * The room-data store mechanics (`src/client/room-data-core.ts`): the staleness rule, pinned
 * against the exported store functions.
 *
 * Acceptance points:
 * - staleWarning speaks only when the conversation is newer than the file, with a minute of
 *   slack for the refresh itself (assertions render through the memory room panel — the rule is
 *   the store's, the panel is only the readout).
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  MemoryPanel: (props?: { sessionId?: string }) => unknown
  deskStore: {
    data?: Record<string, unknown> | undefined
    sessionUpdatedAt?: number | undefined
    lastReceipt?: { rowId: string, action: string, at: number } | undefined
  }
}

const materialize = (): ClientExports =>
  materializeClient(registration, inertReactShim()) as unknown as ClientExports

describe('desk store mechanics', () => {
  it('warns when the room data file lags the conversation, and stays quiet when it does not', () => {
    const exports = materialize()
    exports.deskStore.data = { generatedAt: '2026-09-26T13:00:00+08:00' }

    // Five minutes of conversation after the file was written: the panel must not present a stale
    // snapshot as current.
    exports.deskStore.sessionUpdatedAt = new Date('2026-09-26T13:05:00+08:00').getTime()
    const stale = textsOf(exports.MemoryPanel()).join(' | ')
    expect(stale).toContain('对话比这份房间数据新')
    expect(stale).toContain('助手还没把这次对话学到的东西写进房间')

    // A file written within the same minute as the newest turn is current (the refresh itself
    // takes a moment; a minute of slack keeps the warning honest).
    exports.deskStore.sessionUpdatedAt = new Date('2026-09-26T13:00:30+08:00').getTime()
    const fresh = textsOf(exports.MemoryPanel()).join(' | ')
    expect(fresh).not.toContain('对话比这份房间数据新')
  })

})
