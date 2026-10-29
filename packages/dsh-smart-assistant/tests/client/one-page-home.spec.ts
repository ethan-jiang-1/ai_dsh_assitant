/**
 * The one-page home (L0): the empty ask, the one page, the three actions, and the wrapper's
 * switch to the full board. These are the 2026-10-23 contract's render-level floors; the real
 * "30-second read" and the async feel stay a human walkthrough.
 */
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { HomeSurface } from '../../src/client/projection/home-surface'
import { OnePageHome } from '../../src/client/projection/one-page-home'
import type { ProjectionPanelProps } from '../../src/client/projection/projection-panel'
import type { DeskLanes } from '../../src/client/projection/desk-surface'
import type { ProjectionDownload } from '../../src/client/projection/projection-reader'
import type { OperatingMatter, OperatingProjection, OperatingReceipt } from '../../src/client/projection/operating-projection'
import type { ProactiveCatalogState } from '../../src/client/proactive/proactive-face-source'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import { deskEn } from '../../src/client/chrome/locales'

const stateSlots: unknown[] = []
let stateIndex = 0
const react = {
  createElement,
  useState: <T,>(initial: T | (() => T)): [T, (next: T) => void] => {
    const index = stateIndex++
    if (!(index in stateSlots)) stateSlots[index] = typeof initial === 'function' ? (initial as () => T)() : initial
    return [stateSlots[index] as T, (next: T) => { stateSlots[index] = next }]
  },
  useEffect: () => {},
  useRef: <T,>(value: T): { current: T } => ({ current: value }),
  useCallback: <T extends (...args: never[]) => unknown>(callback: T): T => callback,
}
bindClientRequire(() => react)

type StatusMap = ReadonlyMap<string, { running?: boolean, pendingInteraction?: { kind?: string } | undefined, completionUnread?: boolean }>
const noop = (): void => {}

function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (typeof node === 'string') return node
  if (node !== null && typeof node === 'object' && 'props' in node) return text((node as { props: { children?: unknown } }).props.children)
  return ''
}

function findButton(node: unknown, label: string): { onClick?: () => void, disabled?: boolean } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButton(child, label)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { children?: unknown, onClick?: () => void, disabled?: boolean } }).props
    if (text(node) === label && props.onClick !== undefined) return props
    return findButton(props.children, label)
  }
  return undefined
}


/** Same walker, substring match: list rows carry their meta and first summary line too. */
function findInput(node: unknown, label: string): { props?: { onInput?: (event: { target: { value: string } }) => void } } | undefined {
  if (node === null || typeof node !== 'object') return undefined
  const element = node as { type?: unknown, props?: { children?: unknown, 'aria-label'?: string, onInput?: (event: { target: { value: string } }) => void } }
  if (element.type === 'input' && element.props?.['aria-label'] === label) {
    return element as { props?: { onInput?: (event: { target: { value: string } }) => void } }
  }
  const children = element.props?.children
  const list = Array.isArray(children) ? children : children === undefined ? [] : [children]
  for (const child of list) { const found = findInput(child, label); if (found !== undefined) return found }
  return undefined
}

function findButtonContaining(node: unknown, label: string): { onClick?: () => void, disabled?: boolean } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButtonContaining(child, label)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { children?: unknown, onClick?: () => void, disabled?: boolean } }).props
    if (text(node).includes(label) && props.onClick !== undefined) return props
    return findButtonContaining(props.children, label)
  }
  return undefined
}

/** Invoke function components the way React would, so a wrapper's child contributes its text. */
function expand(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(expand)
  if (node !== null && typeof node === 'object' && 'type' in node) {
    const element = node as { type: unknown, props: Record<string, unknown> }
    if (typeof element.type === 'function') {
      return expand((element.type as (props: Record<string, unknown>) => unknown)(element.props))
    }
    return { ...element, props: { ...element.props, children: expand(element.props['children']) } }
  }
  return node
}

function matter(overrides: Partial<OperatingMatter> = {}): OperatingMatter {
  return {
    id: 'm1',
    title: 'Q3 销售掉了 20%',
    status: 'active',
    summary: '我的判断：不是市场淡，是 1–2 个集中点。\n\n三条路：A 拆客户 / B 降价 / C 冻招聘。\n\n我建议 A。还缺：前 20 客户两季收入。复查：10/26。',
    responsible: '',
    revision: 1,
    times: { nextCheckpoint: '2026-10-26' },
    evidence: [{ id: 'e1', sessionId: 's1', note: '你 10/23 的原话' }],
    proposals: [],
    ...overrides,
  }
}

function projection(matters: OperatingMatter[], receipts: OperatingReceipt[] = [], unclaimed: { id: string, note: string, sessionId: string }[] = []): OperatingProjection {
  return {
    schemaVersion: 2,
    ledgerId: 'test',
    revision: 3,
    matters,
    receipts,
    unclaimed,
  }
}

function panelProps(
  value: ProjectionDownload,
  lanes: Partial<DeskLanes> = {},
  statuses: StatusMap = new Map(),
): { props: ProjectionPanelProps & { onOpenAll: () => void }, view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>, capture: ReturnType<typeof vi.fn>, process: ReturnType<typeof vi.fn>, openAll: ReturnType<typeof vi.fn> } {
  const view = createProjectionViewStore(defineStore).create()
  const capture = vi.fn()
  const process = vi.fn()
  const openAll = vi.fn()
  const surface = {
    lanes: {
      refreshProjection: noop,
      onAsk: noop,
      onCapture: capture,
      onOpenSession: noop,
      onProcess: process,
      onClaim: noop,
      onDiscard: noop,
      onWake: noop,
      ...lanes,
    },
  }
  return {
    view,
    capture,
    process,
    openAll,
    props: {
      t: (key, params) => Object.entries(params ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), deskEn[key]),
      surface,
      useProjection: <S,>(select: (candidate: ProjectionDownload) => S): S => select(value),
      useStore: <S,>(select: (candidate: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()),
      useSessionStatus: <S,>(select: (candidate: StatusMap) => S): S => select(statuses),
      actions: view.actions,
      onOpenAll: openAll,
    },
  }
}

function renderHome(props: ProjectionPanelProps & { onOpenAll: () => void, onOpenBoard?: () => void }): unknown {
  stateIndex = 0
  return expand(OnePageHome(props))
}

beforeEach(() => {
  stateSlots.length = 0
  stateIndex = 0
})

describe('OnePageHome', () => {
  it('empty home asks one question and shows three examples, with no board machinery', () => {
    const { props } = panelProps({ status: 'missing' })
    const tree = renderHome(props)
    const copy = text(tree)
    expect(copy).toContain('最近哪件事让你拿不准？')
    expect(copy).toContain('下季度销售掉了 20%')
    expect(copy).toContain('这个报价接不接')
    expect(copy).toContain('老客户要不要涨价')
    expect(copy).toContain('先给你一版')
    expect(copy).not.toContain('先记下来')
    expect(copy).not.toContain('看板')
    expect(copy).not.toContain('流水')
    expect(findButton(tree, '看板')).toBeUndefined()
  })

  it('the working state replaces the fresh ask instead of stacking above it', () => {
    const { props, view } = panelProps({ status: 'missing' }, {}, new Map([['s1', { running: true }]]))
    view.actions.setCaptureReceipt({ requestId: 'r1', sessionId: 's1', text: '下季度销售掉了20%', observedRevision: 0 })
    const tree = renderHome(props)
    expect(text(tree)).toContain('我在办这件事')
    expect(text(tree)).not.toContain('最近哪件事让你拿不准')
  })

  it('a home with history but no open work shows the steady empty state', () => {
    const receipts: OperatingReceipt[] = [{ operationId: 'r1', matterId: '', sessionId: 's1', submittedAt: '2026-10-23T10:00:00+08:00', status: 'committed' }]
    const { props } = panelProps({ status: 'ready', data: projection([], receipts) })
    const tree = renderHome(props)
    expect(text(tree)).toContain('今天没有要你拍板的')
    expect(text(tree)).not.toContain('最近哪件事让你拿不准')
    expect(text(tree)).toContain('交给它')
  })

  it('a failed page action surfaces a visible error', async () => {
    const capture = vi.fn(() => Promise.resolve(undefined))
    const { props } = panelProps({ status: 'ready', data: projection([matter()]) }, { onCapture: capture })
    const tree = renderHome(props)
    findButton(tree, '就这么办')?.onClick?.()
    await Promise.resolve()
    stateIndex = 0
    const after = renderHome(props)
    expect(text(after)).toContain('这次没送出去')
  })

  it('a page shows the title, the summary and the three actions', () => {
    const { props, view, capture, process } = panelProps({ status: 'ready', data: projection([matter()]) })
    const tree = renderHome(props)
    const copy = text(tree)
    expect(copy).toContain('Q3 销售掉了 20%')
    expect(copy).toContain('我建议 A')
    expect(copy).toContain('复查 2026-10-26')

    findButton(tree, '就这么办')?.onClick?.()
    expect(capture).toHaveBeenCalledTimes(1)
    expect(String(capture.mock.calls[0]?.[0])).toContain('Q3 销售掉了 20%')

    findButton(tree, '改一改')?.onClick?.()
    expect(process).toHaveBeenCalledWith('m1')
    expect(view.getSnapshot().captureDraft).toBe('')
  })

  it('the examples fill the input rather than sending it', () => {
    const { props, view, capture } = panelProps({ status: 'missing' })
    const tree = renderHome(props)
    findButton(tree, '下季度销售掉了 20%')?.onClick?.()
    expect(view.getSnapshot().captureDraft).toBe('下季度销售掉了 20%')
    expect(capture).not.toHaveBeenCalled()
  })

  it('看依据 expands to the evidence, then collapses', () => {
    const { props } = panelProps({ status: 'ready', data: projection([matter()]) })
    const first = renderHome(props)
    expect(text(first)).not.toContain('你 10/23 的原话')
    findButton(first, '看依据')?.onClick?.()
    const open = renderHome(props)
    expect(text(open)).toContain('你 10/23 的原话')
    findButton(open, '收起依据')?.onClick?.()
    expect(text(renderHome(props))).not.toContain('你 10/23 的原话')
  })

  it('the list searches matters by title and summary', () => {
    const { props } = panelProps({ status: 'ready', data: projection([matter()]) })
    const home = expand(HomeSurface(props))
    findButton(home, '全部（1）')?.onClick?.()
    stateIndex = 0
    let list = expand(HomeSurface(props))
    const input = findInput(list, '搜事项')
    input?.props?.onInput?.({ target: { value: '不存在的客户' } })
    stateIndex = 0
    list = expand(HomeSurface(props))
    expect(text(list)).toContain('没有匹配的事项')
    const again = findInput(list, '搜事项')
    again?.props?.onInput?.({ target: { value: 'Q3' } })
    stateIndex = 0
    list = expand(HomeSurface(props))
    expect(text(list)).toContain('Q3 销售掉了 20%')
  })

  it('a debug boot opens the read-only debug panel from the home and returns', () => {
    const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
    Object.defineProperty(globalThis, 'location', { value: { search: '', hash: '#debug=1' }, configurable: true })
    try {
      const { props } = panelProps({ status: 'missing' })
      const home = expand(HomeSurface(props))
      expect(text(home)).toContain('开发调试')
      findButton(home, '开发调试')?.onClick?.()
      stateIndex = 0
      const debug = expand(HomeSurface(props))
      expect(text(debug)).toContain('开发调试')
      expect(text(debug)).toContain('projection.status')
      findButton(debug, '回到今天')?.onClick?.()
      stateIndex = 0
      expect(text(expand(HomeSurface(props)))).toContain('最近哪件事让你拿不准')
    } finally {
      if (originalLocation === undefined) delete (globalThis as { location?: unknown }).location
      else Object.defineProperty(globalThis, 'location', originalLocation)
    }
  })

  it('HomeSurface opens the records page from 它记下的 and returns home', () => {
    const { props } = panelProps({ status: 'missing' })
    const home = expand(HomeSurface(props))
    findButton(home, '它记下的')?.onClick?.()
    stateIndex = 0
    const records = expand(HomeSurface(props))
    expect(text(records)).toContain('它记下的')
    expect(text(records)).toContain('回到今天')
    findButton(records, '回到今天')?.onClick?.()
    stateIndex = 0
    const back = expand(HomeSurface(props))
    expect(text(back)).toContain('最近哪件事让你拿不准')
  })

  it('the list hides unclaimed fragments and shows what it is watching', () => {
    const data = projection([matter()], [], [{ id: 'u1', note: '内部原文：主键/归户/claim', sessionId: 's1' }])
    const { props } = panelProps({ status: 'ready', data })
    const withCatalog = {
      ...props,
      useCatalog: <S,>(select: (state: ProactiveCatalogState) => S): S => select({
        status: 'entries',
        entries: [{ id: 't1', title: '每周对账', kind: 'weekly', scheduledAt: '2099-01-01T09:00:00+08:00', status: 'active' }],
      }),
    }
    const home = expand(HomeSurface(withCatalog))
    findButton(home, '全部（1）')?.onClick?.()
    stateIndex = 0
    const list = expand(HomeSurface(withCatalog))
    expect(text(list)).toContain('它在盯什么')
    expect(text(list)).toContain('每周对账')
    expect(text(list)).toContain('还有 1 条待归户')
    expect(text(list)).not.toContain('内部原文')
    findButton(list, '完整看板')?.onClick?.()
    stateIndex = 0
    const board = expand(HomeSurface(withCatalog))
    expect(text(board)).toContain('后台：1 条待归户')
  })

  it('the home carries the proactive rows and suggestions the deep board hides', () => {
    const data = projection([matter()], [], [{ id: 'u1', note: '待归户片段', sessionId: 's1' }])
    const { props } = panelProps({ status: 'ready', data })
    const withCatalog = {
      ...props,
      useCatalog: <S,>(select: (state: ProactiveCatalogState) => S): S => select({
        status: 'entries',
        entries: [{ id: 't1', title: '每周对账', kind: 'weekly', scheduledAt: '2099-01-01T09:00:00+08:00', status: 'active' }],
      }),
    }
    stateSlots.length = 0
    stateIndex = 0
    const openBoard = vi.fn()
    const home = renderHome({ ...withCatalog, onOpenAll: () => {}, onOpenBoard: openBoard })
    expect(text(home)).toContain('它在等你：1 条待认领')
    expect(text(home)).toContain('它下次替你看：每周对账')
    expect(text(home)).toContain('让它替你盯')
    // A row action must leave the home for the board; selecting here alone would be a dead click.
    findButton(home, '去处理')?.onClick?.()
    expect(openBoard).toHaveBeenCalled()
    stateIndex = 0
    const surfaceHome = expand(HomeSurface(withCatalog))
    findButton(surfaceHome, '全部（1）')?.onClick?.()
    stateIndex = 0
    const list = expand(HomeSurface(withCatalog))
    findButton(list, '完整看板')?.onClick?.()
    stateIndex = 0
    const board = expand(HomeSurface(withCatalog))
    expect(text(board)).not.toContain('它在等你：')
    expect(text(board)).not.toContain('让它替你盯')
  })

  it('HomeSurface goes home -> list -> board and back', () => {
    const { props } = panelProps({ status: 'ready', data: projection([matter()]) })
    const { onOpenAll: _unused, ...panel } = props
    stateSlots.length = 0
    stateIndex = 0
    const home = expand(HomeSurface(panel))
    expect(text(home)).toContain('今天')
    findButton(home, '全部（1）')?.onClick?.()
    stateIndex = 0
    const list = expand(HomeSurface(panel))
    expect(text(list)).toContain('全部')
    expect(text(list)).toContain('Q3 销售掉了 20%')
    expect(findButton(list, '回到今天')).toBeDefined()
    findButton(list, '完整看板')?.onClick?.()
    stateIndex = 0
    const board = expand(HomeSurface(panel))
    expect(text(board)).toContain('完整看板')
    expect(text(board)).not.toContain('交代新事项')
    expect(text(board)).not.toContain('重新读取')
    expect(text(board)).not.toContain('有问题')
    expect(text(board)).not.toContain('让它替你盯')
    expect(findButton(board, '回到今天')).toBeDefined()
    findButton(board, '回到今天')?.onClick?.()
    stateIndex = 0
    const back = expand(HomeSurface(panel))
    expect(text(back)).toContain('今天')
    expect(text(back)).toContain('Q3 销售掉了 20%')
  })

  it('a list row selects that matter and returns to the page', () => {
    const first = matter()
    const second = matter({ id: 'm2', title: '报价 480 万接不接', summary: '不接，或改范围。' })
    const { props, view } = panelProps({ status: 'ready', data: projection([first, second]) })
    const { onOpenAll: _unused, ...panel } = props
    stateSlots.length = 0
    stateIndex = 0
    const home = expand(HomeSurface(panel))
    findButton(home, '全部（2）')?.onClick?.()
    stateIndex = 0
    const list = expand(HomeSurface(panel))
    findButtonContaining(list, '报价 480 万接不接')?.onClick?.()
    expect(view.getSnapshot().selected?.id).toBe('m2')
    stateIndex = 0
    expect(text(expand(HomeSurface(panel)))).toContain('报价 480 万接不接')
  })
})
