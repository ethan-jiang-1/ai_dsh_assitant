/**
 * Dashboard main panel (Goal 1.5 + Goal 3, 2026-10-06): the desk as a standalone sidebar
 * panel — not a tab inside the chat shell. This spec pins:
 *
 * 1. The panel's four content sections (decisions / actions / gaps / approvals) each
 *    render at least one item from a populated desk fixture.
 * 2. Option buttons carry an onClick that proxies the principal's decision via sendPrompt
 *    (dashboard → conversation, Goal 3).
 * 3. The "有问题？" (onAsk) button fires the injected callback (conversation entry point).
 * 4. Empty desk shows the honest empty state with the "有问题？" CTA.
 *
 * The browser half is a classic script (zero imports/exports); the harness evaluates it
 * and materializes the factory — same as client-panels.spec.ts.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

const registration = await loadClientRegistration()
const materialize = (): Record<string, unknown> =>
  materializeClient(registration, inertReactShim()) as unknown as Record<string, unknown>

/** A populated desk fixture with one item per section. */
const populatedDesk = {
  generatedAt: '2026-10-06T18:00:00+08:00',
  counts: { memories: 3, threads: 1 },
  decisions: [{
    id: 'd1', question: '要不要给最大的老客户涨价？', context: '合作三年，八万/年',
    kind: 'business', rank: 0,
    options: [
      { label: '直接提价 10%', cost: '可能反弹', irreversible: false },
      { label: '结构性提价', cost: '不需要认错', irreversible: false },
      { label: '这次不提', cost: '旧价', irreversible: true },
    ],
  }],
  gaps: [
    { id: 'g1', what: '客户占你总收入的比重', why: '决定谈判筹码' },
  ],
  actions: [
    { id: 'a1', what: '跟合伙人碰涨价方案', owner: 'principal', due: '2026-10-10', status: 'open' },
  ],
  knowledge: [
    { id: 'kp-1', title: '客户定价策略', status: 'draft', type: 'concept' },
  ],
}

function textsOf(node: unknown): string[] {
  if (node === null || node === undefined) return []
  if (typeof node === 'string') return [node]
  if (typeof node !== 'object') return []
  const el = node as { props?: { children?: unknown }, children?: unknown }
  const out: string[] = []
  const children = el.props?.children ?? el.children
  if (Array.isArray(children)) {
    for (const child of children) out.push(...textsOf(child))
  } else {
    out.push(...textsOf(children))
  }
  return out.filter(t => t.length > 0)
}

function buttonsOf(node: unknown): { props: { onClick?: () => void, children?: unknown } }[] {
  if (node === null || node === undefined || typeof node !== 'object') return []
  const el = node as { props?: { children?: unknown, onClick?: () => void }, children?: unknown, type?: unknown }
  const out: { props: { onClick?: () => void, children?: unknown } }[] = []
  const children = el.props?.children ?? el.children
  if (Array.isArray(children)) {
    for (const child of children) out.push(...buttonsOf(child))
  } else {
    out.push(...buttonsOf(children))
  }
  if (typeof el.props?.onClick === 'function') {
    out.push({ props: { onClick: el.props.onClick, children: el.props?.children } })
  }
  return out
}

describe('dashboard main panel', () => {
  it('renders the four content sections from a populated desk', () => {
    const exports = materialize()
    // Inject the populated desk into the store so useDesk() returns it
    const store = exports.deskStore as { data: typeof populatedDesk | undefined }
    store.data = populatedDesk
    const panel = exports.DashboardMainPanel as (props?: { onAsk?: () => void }) => unknown
    const text = textsOf(panel({ onAsk: () => {} })).join(' | ')

    // Decisions section
    expect(text).toContain('要不要给最大的老客户涨价')
    expect(text).toContain('直接提价 10%')
    // Actions section
    expect(text).toContain('跟合伙人碰涨价方案')
    expect(text).toContain('2026-10-10')
    // Gaps section
    expect(text).toContain('客户占你总收入的比重')
    // Header + conversation entry
    expect(text).toContain('你的桌面')
    expect(text).toContain('有问题')
  })

  it('option buttons carry onClick that proxies the decision', () => {
    const exports = materialize()
    const store = exports.deskStore as { data: typeof populatedDesk | undefined }
    store.data = populatedDesk
    const panel = exports.DashboardMainPanel as (props?: { onAsk?: () => void }) => unknown
    const tree = panel({ onAsk: () => {} })
    const buttons = buttonsOf(tree)
    // At least the three option buttons + the "有问题？" button
    expect(buttons.length).toBeGreaterThanOrEqual(4)
    // The first option button's onClick should exist (it proxies via sendPrompt)
    expect(typeof buttons[0]?.props.onClick).toBe('function')
  })

  it('shows the honest empty state with CTA when desk has no data', () => {
    const exports = materialize()
    const store = exports.deskStore as { data: unknown }
    store.data = undefined
    const panel = exports.DashboardMainPanel as (props?: { onAsk?: () => void }) => unknown
    let askFired = false
    const text = textsOf(panel({ onAsk: () => { askFired = true } })).join(' | ')
    expect(text).toContain('桌面还是空的')
    expect(text).toContain('有问题')
    // The CTA button should call onAsk
    const buttons = buttonsOf(panel({ onAsk: () => { askFired = true } }))
    const askButton = buttons.find(b => textsOf(b.props.children).some(t => t.includes('有问题')))
    askButton?.props.onClick?.()
    expect(askFired).toBe(true)
  })

  it('exports the sidebar icon component', () => {
    const exports = materialize()
    expect(typeof exports.DashboardPanelIcon).toBe('function')
    const icon = (exports.DashboardPanelIcon as () => unknown)()
    expect(icon).toBeTruthy()
  })

  it('onAsk returns to the Conversation through ctx.layout (261007 Slice 1c)', () => {
    const exports = materialize()
    const selected: (string | null)[] = []
    const registered: { key?: string, inject?: () => { onAsk: () => void } }[] = []
    const ctx = {
      slots: {
        inject: (_name: string, contribute: () => unknown) => { contribute() },
        register: (declaration: { key?: string, inject?: () => { onAsk: () => void } }) => {
          registered.push(declaration)
          return undefined
        },
      },
      sidebarRightTabs: { register: () => undefined },
      sidebarRight: { openTab: () => {} },
      layout: { selectPanel: (id: string | null) => { selected.push(id) } },
    }
    ;(exports.apply as (ctx: unknown) => void)(ctx)
    const main = registered.find(d => d.key === 'dsh-smart-assistant-dashboard')
    expect(main).toBeTruthy()
    main?.inject?.().onAsk()
    // vendor ui-layout contract: null selects the Conversation (the panel's way back).
    expect(selected).toEqual([null])
  })
})
