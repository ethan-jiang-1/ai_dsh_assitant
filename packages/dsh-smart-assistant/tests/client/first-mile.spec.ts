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
 * panels.spec.ts.
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
    openDesk?: () => void
    processingMatter?: { matterId: string, title: string, summary: string }
    t?: (key: string) => string | undefined
  }) => Element | null
  ApprovalDockBanner: (props: {
    openRoom?: (kind: string) => void
  }) => Element | null
  deskStore: {
    data?: {
      counts?: { knowledgeDraft?: number, memories?: number, skills?: number, knowledgeStable?: number, threads?: number }
      knowledge?: { status?: string }[]
      memories?: unknown[]
      skills?: unknown[]
      research?: unknown[]
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

/** Every string in a tree, so copy can be asserted without a DOM.
 * Local on purpose: no custom-component invocation (unlike support/client-harness's textsOf) —
 * the first-mile tree is rendered host components only, and unifying the walkers would
 * silently change what this spec asserts on. */
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
    expect(exports.FirstMileDock({ session: { blank: false }, openDesk: () => {} })).toBe(null)
    expect(exports.FirstMileDock({ openDesk: () => {} })).toBe(null)
    expect(exports.FirstMileDock({ session: { blank: true }, openDesk: () => {} })).not.toBe(null)
  })

  it('shows visual-only matter context instead of first-time intake for a processing session', () => {
    const dock = materialize().FirstMileDock({
      session: { blank: true },
      processingMatter: { matterId: 'm-A', title: 'NB-02：客户验收节点', summary: '客户可能推迟到 10/20。' },
      t: key => ({
        'processing.title': '正在处理这件事',
        'processing.label': '桌面事项',
        'processing.visualOnly': '助手能从台账读到这件事的详情；直接说要做什么就行，它会先核对台账再动手。',
      }[key]),
    })
    if (dock === null) throw new Error('processing context should render for a blank session')
    const copy = textsOf(dock).join(' ')
    expect(copy).toContain('NB-02：客户验收节点')
    expect(copy).toContain('客户可能推迟到 10/20。')
    expect(copy).toContain('台账')
    expect(copy).not.toContain('第一次来')
    expect(copy).not.toContain('例：')
    expect(elementsOf(dock, 'button')).toHaveLength(0)
  })

  it('a genuinely empty room projection still shows Day-0 (BUG-025)', () => {
    const exports = materialize()
    // The rooms route always returns an object with keys; freshness is the room CONTENT. This is
    // the regression: the old Object.keys check made Day-0 unreachable on a fresh home.
    exports.deskStore.data = {
      memories: [], knowledge: [], skills: [], research: [],
      counts: { memories: 0, knowledgeStable: 0, knowledgeDraft: 0, skills: 0, threads: 0 },
    }
    const dock = exports.FirstMileDock({ session: { blank: true }, openDesk: () => {} })
    if (dock === null) throw new Error('the strip should render for a blank session')
    const copy = textsOf(dock).join(' ')
    expect(copy).toContain('第一次来')
    expect(copy).toContain('回到今天')
    expect(copy).not.toContain('一把手桌面')
  })

  it('a first-time principal gets a one-line pointer to the home', () => {
    const dock = materialize().FirstMileDock({ session: { blank: true }, openDesk: () => {} })

    if (dock === null) throw new Error('the strip should render for a blank session')
    const copy = textsOf(dock).join(' ')
    // One first-open surface: the home page. This card only points there; it no longer hosts
    // a second composer, an arc, or the internal 桌面/账本 vocabulary.
    expect(copy).toContain('第一次来')
    expect(copy).toContain('回到今天')
    expect(copy).toContain('说一句')
    expect(copy).not.toContain('决策简报')
    expect(copy).not.toContain('例：')
    expect(copy).not.toContain('三室')
    expect(copy).not.toContain('敲 /')

    const buttons = elementsOf(dock, 'button')
    expect(buttons).toHaveLength(1)
    expect(textsOf(buttons[0]).join('')).toBe('回到今天')
  })

  it('a returning principal gets the desk door, not a brief rebuilt from the retired file', () => {
    const exports = materialize()
    // Seeded walk view: the legacy file still carries the retired sections (a Day-2 folder that
    // predates the one-desk decision). They must NOT come back as an opening brief.
    const store = exports.deskStore as { data: unknown }
    store.data = {
      generatedAt: '2026-10-07T09:00:00+08:00',
      counts: { memories: 2, threads: 1 },
      decisions: [{ id: 'd1', question: '老客户续约要不要涨价？', kind: 'business', options: [{ label: '涨 5%' }] }],
      actions: [{ id: 'a1', what: '出续约方案草案', due: '2026-10-09', status: 'open' }],
      gaps: [{ id: 'g1', what: '三家客户的毛利数', why: '没它算不出涨价后的账' }],
    }
    const opened: string[] = []
    const dock = exports.FirstMileDock({ session: { blank: true }, openDesk: () => { opened.push('desk') } })
    if (dock === null) throw new Error('the strip should render for a blank session with room data')
    const copy = textsOf(dock).join(' ')
    // The one desk is the ledger projection in the main area: the strip names it and hands over
    // the door instead of speaking retired sections the room-data file no longer carries.
    expect(copy).toContain('今天')
    expect(copy).toContain('回到今天')
    expect(copy).not.toContain('一把手桌面')
    expect(copy).not.toContain('桌面全景')
    expect(copy).not.toContain('账本的投影')
    expect(copy).not.toContain('老客户续约要不要涨价')
    expect(copy).not.toContain('出续约方案草案')
    expect(copy).not.toContain('三家客户的毛利数')

    const buttons = elementsOf(dock, 'button')
    expect(textsOf(buttons[0]).join('')).toBe('回到今天')
    ;(buttons[0]?.props.onClick as (() => void) | undefined)?.()
    expect(opened).toEqual(['desk'])
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
    expect(copy).toContain('2 页知识草稿等你审批')
    expect(copy).not.toContain('99')
    expect(copy).toContain('批准后才会成为它的判断依据')

    exports.deskStore.data = deskWith([], 4)
    const fallback = exports.ApprovalDockBanner({ openRoom: () => {} })
    expect(textsOf(fallback as Element).join(' ')).toContain('4 页知识草稿等你审批')
  })

  it('routes the click to the knowledge room with the drafts highlighted (same routing as the desk pointer)', () => {
    const exports = materialize()
    const opened: string[] = []
    exports.deskStore.data = deskWith([{ status: 'draft' }])
    const banner = exports.ApprovalDockBanner({ openRoom: kind => { opened.push(kind) } })
    if (banner === null) throw new Error('the banner should render for draft rows')
    const buttons = elementsOf(banner, 'button')
    expect(buttons).toHaveLength(1) // 开始第一件事（发送按钮在 composer 内，不在 dock 测试范围内）
    expect(textsOf(buttons[0]).join('')).toBe('去审批')
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
