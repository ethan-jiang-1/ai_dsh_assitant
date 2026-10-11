/**
 * The first mile: the blank-session dock and its sibling composer banners
 * (`src/client/first-mile.ts`).
 *
 * These seats are where a first-time principal looks, and the walkthrough (2026-09-26)
 * found nothing of the product there. The test asserts the copy, the one action, and that
 * `apply` actually claims both seats.
 *
 * The browser half is multi-module source (relative imports, tsdown-inlined — see the
 * entry's file header), so the test installs the page-global facade, evaluates the script,
 * and materializes the factory with a module-table require stub, the same harness as
 * client-panels.spec.ts.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

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
    processingMatter?: { matterId: string, title: string, summary: string }
    t?: (key: string) => string | undefined
  }) => Element | null
  ApprovalDockBanner: (props: {
    openRoom?: (kind: string) => void
  }) => Element | null
  deskStore: {
    data?: {
      counts?: { knowledgeDraft?: number }
      knowledge?: { status?: string }[]
    } | undefined
    focusKnowledge?: 'drafts' | undefined
  }
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

  it('shows visual-only matter context instead of first-time intake for a processing session', () => {
    const dock = materialize().FirstMileDock({
      session: { blank: true },
      processingMatter: { matterId: 'm-A', title: 'NB-02：客户验收节点', summary: '客户可能推迟到 10/20。' },
      t: key => ({
        'processing.title': '正在处理这件事',
        'processing.label': '当前对话对应桌面事项：',
        'processing.visualOnly': '事项信息只显示在界面上；需要助手参考时，请在对话里明确告诉它。',
      }[key]),
    })
    if (dock === null) throw new Error('processing context should render for a blank session')
    const copy = textsOf(dock).join(' ')
    expect(copy).toContain('NB-02：客户验收节点')
    expect(copy).toContain('客户可能推迟到 10/20。')
    expect(copy).toContain('只显示在界面上')
    expect(copy).not.toContain('第一次来')
    expect(copy).not.toContain('例：')
    expect(elementsOf(dock, 'button')).toHaveLength(0)
  })

  it('tells a first-time principal what to say and offers the desk', () => {
    const opened: string[] = []
    const dock = materialize().FirstMileDock({ session: { blank: true }, openRoom: kind => { opened.push(kind) } })

    if (dock === null) throw new Error('the strip should render for a blank session')
    const copy = textsOf(dock).join(' ')
    // The two gaps the walkthrough named: what do I say first, and what can this thing do.
    expect(copy).toContain('第一次来')
    expect(copy).toContain('例：')
    // R10: the strip no longer advertises the `/` menu (it leads with shell commands and
    // English developer-flavoured skill rows); it points at our own doors instead.
    // First-open UX card (2026-10-01): "三室" was governance vocabulary on the principal's
    // surface — the copy now names what they get, not our room taxonomy.
    // A1 rich landing (2026-10-06): the copy now tells the full arc, not just how to start.
    expect(copy).toContain('决策简报')
    expect(copy).toContain('带代价的选项')
    expect(copy).toContain('复查日期')
    expect(copy).toContain('先看桌面')
    expect(copy).not.toContain('三室')
    expect(copy).not.toContain('敲 /')

    const buttons = elementsOf(dock, 'button')
    expect(buttons).toHaveLength(2) // 开始第一件事 + 发送（A1 内嵌 composer 的发送按钮）
    // 2026-10-06 (real-user walk): the desk button is demoted to a labelled preview of the
    // empty desk — the primary start is the first word in the composer, and the copy above
    // now says what happens after it (the assistant asks first).
    expect(textsOf(buttons[0]).join('')).toBe('开始第一件事')
  })

  it('a returning principal opens on the brief, not a greeting (261007 Slice 1b)', () => {
    const exports = materialize()
    // Seeded walk view: the desk already holds one item per section (a Day-2 folder).
    const store = exports.deskStore as { data: unknown }
    store.data = {
      generatedAt: '2026-10-07T09:00:00+08:00',
      counts: { memories: 2, threads: 1 },
      decisions: [{ id: 'd1', question: '老客户续约要不要涨价？', kind: 'business', options: [{ label: '涨 5%' }] }],
      actions: [{ id: 'a1', what: '出续约方案草案', due: '2026-10-09', status: 'open' }],
      gaps: [{ id: 'g1', what: '三家客户的毛利数', why: '没它算不出涨价后的账' }],
    }
    const dock = exports.FirstMileDock({ session: { blank: true }, openRoom: () => {} })
    if (dock === null) throw new Error('the brief should render for a blank session with a desk')
    const copy = textsOf(dock).join(' ')
    // The brief speaks the desk's state (the design's "opening = there is content waiting for you"),
    // composed deterministically from the walk view — the model is not consulted for the opener.
    expect(copy).toContain('一把手桌面')
    expect(copy).toContain('要你拍的')
    expect(copy).toContain('老客户续约要不要涨价')
    expect(copy).toContain('在跟的')
    expect(copy).toContain('出续约方案草案')
    expect(copy).toContain('还缺一个数')
    // Each brief row is a button — clicking opens the matching action conversation.
    const rows = elementsOf(dock, 'button').filter(b => textsOf(b.props.children).join('').includes('点这里'))
    expect(rows.length).toBe(3)
    expect(typeof rows[0]?.props.onClick).toBe('function')
  })

  it('claims the hero mark and the blank-session dock when applied', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)

    const names = registered.map(entry => entry.name)
    expect(names).toContain('conversation.hero.brand.mark')
    expect(names).toContain('conversation.input.dock')
    const dock = registered.find(entry => entry.declaration.id === 'assistant-first-mile')
    expect(dock?.declaration.name).toBe('conversation.input.dock')
    expect(dock?.declaration.locale).toBe('assistantFirstMile')
    // The dock's action must reach the opener through the inject face, not a closure over ctx.
    expect(typeof (dock?.declaration.inject as () => unknown)()).toBe('object')
  })
})

describe('approval dock banner', () => {
  /** A desk view with the given draft rows and (optionally) a stale model-asserted count. */
  function deskWith(rows: { status?: string }[], knowledgeDraft?: number): {
    counts?: { knowledgeDraft?: number }
    knowledge?: { status?: string }[]
  } {
    const desk: { counts?: { knowledgeDraft?: number }, knowledge?: { status?: string }[] } = {}
    if (knowledgeDraft !== undefined) desk.counts = { knowledgeDraft }
    if (rows.length > 0 || knowledgeDraft === undefined) desk.knowledge = rows
    return desk
  }

  it('stays hidden while nothing waits for approval — no desk, empty desk, all approved', () => {
    const exports = materialize()
    exports.deskStore.data = undefined
    expect(exports.ApprovalDockBanner({ openRoom: () => {} })).toBe(null)
    exports.deskStore.data = deskWith([])
    expect(exports.ApprovalDockBanner({ openRoom: () => {} })).toBe(null)
    exports.deskStore.data = deskWith([{ status: 'stable' }, { status: 'deprecated' }])
    expect(exports.ApprovalDockBanner({ openRoom: () => {} })).toBe(null)
  })

  it('surfaces the drafts in any session state — the dock seat renders for blank and ongoing alike', () => {
    // The claim is "wherever the principal already is", so the complementary states both get
    // evidence: the dock slot itself is session-scoped but NOT hero-gated, and this banner
    // must not inherit the first-mile strip's blank-only rule.
    const exports = materialize()
    exports.deskStore.data = deskWith([{ status: 'draft' }, { status: 'stable' }])
    expect(exports.ApprovalDockBanner({ openRoom: () => {} })).not.toBe(null)
  })

  it('counts the rows the click-through will show, not the model-asserted tally', () => {
    // The knowledge room's 待你审批 section counts rows with status draft; a banner number the
    // room cannot reproduce would break the promise the click makes. The model's counts field
    // is only a fallback for desk files that carry no rows at all.
    const exports = materialize()
    exports.deskStore.data = deskWith(
      [{ status: 'draft' }, { status: 'draft' }, { status: 'stable' }], 99)
    const banner = exports.ApprovalDockBanner({ openRoom: () => {} })
    if (banner === null) throw new Error('the banner should render for draft rows')
    const copy = textsOf(banner).join(' ')
    expect(copy).toContain('2 页知识草稿在等你审批')
    expect(copy).not.toContain('99')
    expect(copy).toContain('批准后才会成为它的判断依据')

    exports.deskStore.data = deskWith([], 4)
    const fallback = exports.ApprovalDockBanner({ openRoom: () => {} })
    expect(textsOf(fallback as Element).join(' ')).toContain('4 页知识草稿在等你审批')
  })

  it('routes the click to the knowledge room with the drafts highlighted (same routing as the desk pointer)', () => {
    const exports = materialize()
    const opened: string[] = []
    exports.deskStore.data = deskWith([{ status: 'draft' }])
    const banner = exports.ApprovalDockBanner({ openRoom: kind => { opened.push(kind) } })
    if (banner === null) throw new Error('the banner should render for draft rows')
    const buttons = elementsOf(banner, 'button')
    expect(buttons).toHaveLength(1) // 开始第一件事（发送按钮在 composer 内，不在 dock 测试范围内）
    expect(textsOf(buttons[0]).join('')).toBe('点这里去审批')
    exports.deskStore.focusKnowledge = undefined
    ;(buttons[0]?.props.onClick as () => void)()
    expect(opened).toEqual(['knowledgeRoom'])
    // S4's contract: the room reads focusKnowledge and highlights + scrolls to the drafts.
    expect(exports.deskStore.focusKnowledge).toBe('drafts')
  })

  it('claims the second dock seat with its own id when applied', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)
    const banners = registered.filter(entry => entry.declaration.id === 'assistant-approval-banner')
    expect(banners).toHaveLength(1)
    expect(banners[0]?.declaration.name).toBe('conversation.input.dock')
    expect(typeof (banners[0]?.declaration.inject as () => unknown)()).toBe('object')
  })
})
