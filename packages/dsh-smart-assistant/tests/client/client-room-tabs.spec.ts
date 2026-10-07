/**
 * The room tab bodies and the desk view body (`src/client/room-tabs.ts`): the session
 * binding, the withheld foreign-session data, the error/empty states, and the Session-header
 * chip's open error surface.
 *
 * Acceptance points:
 * - The body renders its OWN session's slice — another session's desk is withheld (R11).
 * - A tab not mounted in any session says so; a corrupt read is an error with a retry (A5),
 *   and the desk-less empty state starts the conversation instead of refreshing nothing (A6).
 * - DeskViewBody delegates to the same wrapper — the view seat renders the room tab's states.
 * - A failed open beside the conversation is visible on the chip where the click happened (R9).
 *
 * Cross-module note: the tab bodies' session slices are desk-core mechanics and their retry
 * buttons ride desk-io's askRefresh — this file owns the tab-body/chip interface itself.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface Element {
  type: unknown
  props: Record<string, unknown> & { children?: unknown }
}

interface DeskStore {
  data?: Record<string, unknown> | undefined
  readError?: string | undefined
  misses: Set<string>
  sourceSession?: string | undefined
}

interface ClientExports {
  DeskTabBody: (props: { sessionId?: string }) => unknown
  KnowledgeTabBody: (props: { sessionId?: string }) => unknown
  MemoryTabBody: (props: { sessionId?: string }) => unknown
  DeskViewBody: (props?: { sessionId?: string }) => { type: unknown, props: Record<string, unknown> }
  AssistantDeskChip: () => Element
  deskStore: DeskStore
}

/** Every string in a rendered element tree, for asserting on copy without a DOM. */
function textsOf(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string') return [node]
  if (typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(textsOf)
  const element = node as { type?: unknown, props?: { children?: unknown } }
  // A custom component is an element whose type is a function: invoke it the way React would.
  if (typeof element.type === 'function') {
    return textsOf((element.type as (props: unknown) => unknown)(element.props))
  }
  return element.props === undefined ? [] : textsOf(element.props.children)
}

const materialize = (): ClientExports =>
  materializeClient(registration, inertReactShim()) as unknown as ClientExports

describe('desk primary view', () => {
  it('renders the room tab\'s loading state, not a second desk implementation', () => {
    const body = materialize().DeskViewBody as
      (props?: { sessionId?: string }) => { type: unknown, props: Record<string, unknown> }
    const tree = JSON.stringify(body({ sessionId: 'session-1' }))
    // The wrapper's loading branch (session known, slice not yet read) must show the same
    // copy the room tab shows — the view body must not invent its own states.
    expect(tree).toContain('正在读这个会话的桌面')
  })

  it('exports DeskViewBody for the view seat', () => {
    const exports = materialize()
    expect(typeof exports.DeskViewBody).toBe('function')
  })
})

describe('room tab bodies', () => {
  it('binds each tab body to its own session instead of showing another session’s desk', () => {
    const exports = materialize()
    exports.deskStore.data = { counts: { memories: 7 } }
    // The store currently holds session s1's desk; a tab living in session s2 must not present it.
    exports.deskStore.sourceSession = 's1'
    const foreign = textsOf(exports.DeskTabBody({ sessionId: 's2' })).join(' | ')
    expect(foreign).toContain('正在读这个会话的桌面…')
    expect(foreign).not.toContain('我的桌面')

    // The matching session renders the full room, exactly like the main page.
    const own = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    expect(own).toContain('我的桌面')
    expect(own).toContain('从这开始')
    expect(own).toContain('目前没有需要你拍板的经营事项')

    // The room rides inside its own scroller: the vendor pane body is a flex column with
    // overflow hidden and no scroll of its own, so the seat content brings scrolling —
    // without the wrapper the long desk was clipped at the fold with no way down
    // (user on the real machine, right-sidebar era, 2026-09-28).
    const root = exports.DeskTabBody({ sessionId: 's1' }) as unknown as
      { props?: { style?: Record<string, unknown> } }
    expect(root.props?.style?.overflowY).toBe('auto')
    expect(root.props?.style?.minHeight).toBe('0')
    // The "在对话旁打开" opener is retired with the left main panels: a room now renders only
    // inside a right-sidebar tab, so that button opened the very tab it sat in — a no-op the
    // principal rightly read as broken (real use, 2026-09-28). The openers that remain live
    // outside the rooms: the "+" guide, the Session-header chip, and the first-mile dock.
    const deskText = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    expect(deskText).not.toContain('在对话旁打开')

    // The other rooms bind the same way.
    const knowledge = textsOf(exports.KnowledgeTabBody({ sessionId: 's1' })).join(' | ')
    expect(knowledge).toContain('知识室')
    const memory = textsOf(exports.MemoryTabBody({ sessionId: 's1' })).join(' | ')
    expect(memory).toContain('记忆室')
  })

  it('says so when a tab is not mounted inside any session', () => {
    const exports = materialize()
    const text = textsOf(exports.DeskTabBody({})).join(' | ')
    expect(text).toContain('没有落在任何会话')
  })

  it('gives the bound tab an error-with-retry and an empty-state refresh button, not an eternal "reading"', () => {
    const exports = materialize()
    // A5: a corrupt file is an error with a way out.
    exports.deskStore.readError = '桌面文件损坏（JSON 解析失败）'
    const broken = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    expect(broken).toContain('读桌面文件失败')
    expect(broken).toContain('让助手重写一份')
    // A6: the empty state is exactly the state that needs a one-click refresh.
    // First-open UX card (2026-10-01): no raw file paths on the principal's surface — the
    // state explains what the desk is and how it grows instead.
    exports.deskStore.readError = undefined
    exports.deskStore.misses.add('s1')
    const empty = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    expect(empty).toContain('桌面还空着')
    expect(empty).toContain('开始第一件事')
    // 2026-10-06 (real-user walk): the empty branch's next step is the first conversation,
    // not a refresh — the start button invites it; the refresh button no longer appears here.
    expect(empty).toContain('它会先问你最近要拍板')
    expect(empty).not.toContain('刷新桌面')
    expect(empty).not.toContain('.desk/state.json')
  })

  it('shows an unopenable desk on the chip the principal actually clicked (R9)', () => {
    const exports = materialize() as unknown as ClientExports & {
      deskStore: { openError?: string | undefined }
    }
    // Before R9 the failure only patched a note, which renders inside a panel body — invisible from
    // the Session header where the click happened.
    expect(textsOf(exports.AssistantDeskChip()).join('')).toBe('桌面')
    exports.deskStore.openError = '开不了'
    expect(textsOf(exports.AssistantDeskChip()).join('')).toBe('桌面（开不了）')
  })
})
