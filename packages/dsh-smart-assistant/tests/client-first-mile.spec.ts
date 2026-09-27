/**
 * The first mile: the blank-session hero mark and the strip above the composer.
 *
 * These two seats are where a first-time principal looks, and the walkthrough (2026-09-26)
 * found nothing of the product there. The test asserts the copy, the one action, and that
 * `apply` actually claims both seats.
 *
 * The browser half is a classic script (zero imports/exports — see its file header), so the
 * test installs the page-global facade, evaluates the script, and materializes the factory
 * with a module-table require stub, the same harness as client-panels.spec.ts.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from './client-harness.ts'

const registration = await loadClientRegistration()

interface Element {
  type: unknown
  props: Record<string, unknown> & { children?: unknown }
}

interface ClientExports {
  apply: (ctx: unknown) => void
  AssistantHeroMark: (props: { size: number, className?: string }) => Element
  FirstMileDock: (props: {
    session?: { blank?: boolean } | undefined
    openRoom?: (kind: string) => void
  }) => Element | null
}

function materialize(): ClientExports {
  // The inert shim (not bare createElement): the tab body and the rows call useState/useEffect.
  return materializeClient(registration, inertReactShim()) as unknown as ClientExports
}

/** Every element of one tag in a tree, depth-first. */
function elementsOf(node: unknown, tag: string): Element[] {
  if (node === null || node === undefined || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(child => elementsOf(child, tag))
  const element = node as Element
  const own = element.type === tag ? [element] : []
  return [...own, ...elementsOf(element.props?.children, tag)]
}

/** Every string in a tree, so copy can be asserted without a DOM. */
function textsOf(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (node === null || node === undefined || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(textsOf)
  return textsOf((node as Element).props?.children)
}

/** A browser context that runs every inject callback, recording slot registrations. */
function recordingContext(): {
  ctx: unknown
  registered: { name: string, declaration: Record<string, unknown> }[]
} {
  const registered: { name: string, declaration: Record<string, unknown> }[] = []
  const ctx = {
    slots: {
      // Slot registrations ride `inject` callbacks; run them so the declarations are visible.
      inject: (_name: string, contribute: () => unknown) => { contribute() },
      register: (declaration: { name: string }) => {
        registered.push({ name: declaration.name, declaration })
        return undefined
      },
    },
    sidebarRightTabs: { register: () => undefined },
    sidebarRight: { openTab: () => {} },
    inject: () => undefined,
  }
  return { ctx, registered }
}

describe('first-mile seats', () => {
  it('renders the deployment mark at the size the hero asks for', () => {
    const mark = materialize().AssistantHeroMark({ size: 34, className: 'hero-mark' })
    expect(mark.type).toBe('svg')
    expect(mark.props.width).toBe(34)
    expect(mark.props.height).toBe(34)
    expect(mark.props.className).toBe('hero-mark')
    expect(mark.props.children).toHaveLength(3)
  })

  it('renders nothing once the session has any content', () => {
    // The owner renders this dock for EVERY session (only the hero chrome is hero-gated),
    // so the blank check is the component's own — a first-open strip above an ongoing
    // conversation would be wrong content in the wrong place. Guarded here because every
    // screenshot in the evidence set is a blank session and cannot catch a regression.
    const exports = materialize()
    expect(exports.FirstMileDock({ session: { blank: false }, openRoom: () => {} })).toBe(null)
    expect(exports.FirstMileDock({ openRoom: () => {} })).toBe(null)
    expect(exports.FirstMileDock({ session: { blank: true }, openRoom: () => {} })).not.toBe(null)
  })

  it('tells a first-time principal what to say and offers the desk', () => {
    const opened: string[] = []
    const dock = materialize().FirstMileDock({ session: { blank: true }, openRoom: kind => { opened.push(kind) } })

    if (dock === null) throw new Error('the strip should render for a blank session')
    const copy = textsOf(dock).join(' ')
    // The two gaps the walkthrough named: what do I say first, and what can this thing do.
    expect(copy).toContain('第一次来')
    expect(copy).toContain('例：')
    expect(copy).toContain('敲 / 看它现在能做什么')

    const buttons = elementsOf(dock, 'button')
    expect(buttons).toHaveLength(1)
    expect(textsOf(buttons[0]).join('')).toBe('打开我的桌面')
    ;(buttons[0]?.props.onClick as () => void)()
    expect(opened).toEqual(['desk'])
  })

  it('turns a failed desk read into a visible error with a retry, not an eternal reading state (R6)', async () => {
    const views: string[] = []
    const ctx = {
      slots: { inject: (_name: string, contribute: () => unknown) => { contribute() }, register: () => undefined },
      sidebarRightTabs: { register: () => undefined },
      sidebarRight: { openTab: () => {} },
      inject: () => undefined,
      remote: { workspaceFiles: { read: () => { throw new Error('boom') } } },
      sessions: {
        list: {
          getSnapshot: () => ({ ids: ['s1'], byId: { s1: { updatedAt: 1, cwd: '/tmp/ws' } } }),
          subscribe: () => () => {},
        },
      },
    }
    const exports = materialize() as unknown as ClientExports & {
      deskStore: { readError?: string | undefined, note?: string | undefined }
      DeskTabBody: (props: { sessionId: string }) => unknown
    }
    exports.apply(ctx)
    // Let apply()'s own walk finish, then clear its verdict: the assertion must depend on the TAB
    // path alone (the main panels render notes, so their failure was never invisible).
    await new Promise(resolve => { setTimeout(resolve, 0) })
    exports.deskStore.readError = undefined
    exports.deskStore.note = undefined
    // Drive the tab path directly: this is the one whose failure used to be invisible, because the
    // tab returns before any Panel renders notes.
    ;(exports as unknown as { loadDeskFor: (sessionId: string) => void }).loadDeskFor('s1')
    await new Promise(resolve => { setTimeout(resolve, 0) })

    expect(exports.deskStore.readError).toContain('读桌面文件失败')
    const tab = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    // Before R6 a throwing read only patched a note, which this tab never renders: the pane sat on
    // "正在读这个会话的桌面…" forever, with no retry anywhere.
    expect(tab).toContain('读桌面文件失败')
    expect(tab).not.toContain('正在读')
    void views
  })

  it('claims the hero mark and the blank-session dock when applied', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)

    const names = registered.map(entry => entry.name)
    expect(names).toContain('conversation.hero.brand.mark')
    expect(names).toContain('conversation.input.dock')
    const dock = registered.find(entry => entry.name === 'conversation.input.dock')
    expect(dock?.declaration.id).toBe('assistant-first-mile')
    // The dock's action must reach the opener through the inject face, not a closure over ctx.
    expect(typeof (dock?.declaration.inject as () => unknown)()).toBe('object')
  })
})
