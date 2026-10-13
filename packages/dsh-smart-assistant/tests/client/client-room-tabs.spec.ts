/**
 * The room tab bodies (`src/client/room-tabs.ts`): the session binding, the withheld
 * foreign-session data, and the error/empty states. The session desk tab body and the
 * conversation-view body that used to live here are retired (one 桌面 = the ledger's,
 * 2026-10-11), together with the Session-header chip.
 *
 * Acceptance points:
 * - The body renders its OWN session's slice — another session's data is withheld (R11).
 * - A tab not mounted in any session says so; a corrupt read is an error with a retry (A5),
 *   and the empty state starts the conversation instead of refreshing nothing (A6).
 * - The room rides inside its own scroller (the vendor pane body does not scroll).
 *
 * Cross-module note: the tab bodies' session slices are desk-core mechanics and their retry
 * buttons ride desk-io's askRefresh — this file owns the tab-body interface itself.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface DeskStore {
  data?: Record<string, unknown> | undefined
  readError?: string | undefined
  misses: Set<string>
  sourceSession?: string | undefined
}

interface ClientExports {
  KnowledgeTabBody: (props: { sessionId?: string }) => unknown
  MemoryTabBody: (props: { sessionId?: string }) => unknown
  deskStore: DeskStore
}

const materialize = (): ClientExports =>
  materializeClient(registration, inertReactShim()) as unknown as ClientExports

describe('room tab bodies', () => {
  it('binds each tab body to its own session instead of showing another session’s data', () => {
    const exports = materialize()
    exports.deskStore.data = { counts: { memories: 7 } }
    // The store currently holds session s1's data; a tab living in session s2 must not present it.
    exports.deskStore.sourceSession = 's1'
    const foreign = textsOf(exports.KnowledgeTabBody({ sessionId: 's2' })).join(' | ')
    expect(foreign).toContain('正在读这个会话的房间数据…')

    // The matching session renders the full room, exactly like the main page.
    const own = textsOf(exports.KnowledgeTabBody({ sessionId: 's1' })).join(' | ')
    expect(own).toContain('知识室')

    // The room rides inside its own scroller: the vendor pane body is a flex column with
    // overflow hidden and no scroll of its own, so the seat content brings scrolling —
    // without the wrapper the long room was clipped at the fold with no way down
    // (user on the real machine, right-sidebar era, 2026-09-28).
    const root = exports.KnowledgeTabBody({ sessionId: 's1' }) as unknown as
      { props?: { style?: Record<string, unknown> } }
    expect(root.props?.style?.overflowY).toBe('auto')
    expect(root.props?.style?.minHeight).toBe('0')

    // The other room binds the same way.
    const memory = textsOf(exports.MemoryTabBody({ sessionId: 's1' })).join(' | ')
    expect(memory).toContain('记忆室')
  })

  it('says so when a tab is not mounted inside any session', () => {
    const exports = materialize()
    const text = textsOf(exports.KnowledgeTabBody({})).join(' | ')
    expect(text).toContain('没有落在任何会话')
  })

  it('gives the bound tab an error-with-retry and an empty-state start button, not an eternal "reading"', () => {
    const exports = materialize()
    // A5: a corrupt file is an error with a way out.
    exports.deskStore.readError = '房间数据文件损坏（JSON 解析失败）'
    const broken = textsOf(exports.KnowledgeTabBody({ sessionId: 's1' })).join(' | ')
    expect(broken).toContain('读房间数据文件失败')
    expect(broken).toContain('让助手重写一份')
    // A6: the empty state is exactly the state that needs a way in, not a refresh loop.
    // First-open UX card (2026-10-01): no raw file paths on the principal's surface — the
    // state explains what the rooms grow into instead.
    exports.deskStore.readError = undefined
    exports.deskStore.misses.add('s1')
    const empty = textsOf(exports.KnowledgeTabBody({ sessionId: 's1' })).join(' | ')
    expect(empty).toContain('房间数据还空着')
    expect(empty).toContain('开始第一件事')
    // 2026-10-06 (real-user walk): the empty branch's next step is the first conversation,
    // not a refresh — the start button invites it; the refresh button no longer appears here.
    expect(empty).toContain('它会先问你最近要拍板')
    expect(empty).not.toContain('刷新房间数据')
    expect(empty).not.toContain('.desk/state.json')
  })
})
