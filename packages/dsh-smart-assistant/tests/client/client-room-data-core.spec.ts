/**
 * The room-data store mechanics (`src/client/room-data-core.ts`): the staleness rule and the stale
 * receipt retirement, pinned against the exported store functions.
 *
 * Acceptance points:
 * - staleWarning speaks only when the conversation is newer than the file, with a minute of
 *   slack for the refresh itself (assertions render through the memory room panel — the rule is
 *   the store's, the panel is only the readout).
 * - retireStaleReceipt lets a decision be answered again when the file still carries it, and
 *   keeps the receipt when the file no longer lists the row ("recorded" stands).
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  MemoryPanel: (props?: { sessionId?: string }) => unknown
  /** Retire a receipt whose decision is still open in the file (R11). */
  retireStaleReceipt: (data: Record<string, unknown> | undefined, sessionId?: string) => void
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

  it('lets a decision be answered again when the file still carries it (R11)', () => {
    const exports = materialize()
    const data = { generatedAt: '2026-09-27T12:00:00+08:00', decisions: [{ id: 'd1', question: '季末破价例外？' }] }
    exports.deskStore.data = data
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '回答', at: new Date('2026-09-27T11:00:00+08:00').getTime() }
    // The assistant re-opened the row (or the answer never landed): the file still lists it, so the
    // receipt's "已回答" claim is stale and the row must be answerable again.
    exports.retireStaleReceipt(data)
    expect(exports.deskStore.lastReceipt).toBeUndefined()
    // But a receipt for a row the file no longer carries stands: that is what "recorded" looks like.
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '回答', at: Date.now() }
    exports.retireStaleReceipt({ generatedAt: '2026-09-27T12:05:00+08:00', decisions: [] })
    expect(exports.deskStore.lastReceipt).toBeDefined()
  })
})
