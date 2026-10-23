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
import type { OperatingMatter, OperatingProjection } from '../../src/client/projection/operating-projection'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { defineStore } from '@deepseek-ai/dsh-client-store'

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

function projection(matters: OperatingMatter[]): OperatingProjection {
  return {
    schemaVersion: 2,
    ledgerId: 'test',
    revision: 3,
    matters,
    receipts: [],
    unclaimed: [],
  }
}

function panelProps(
  value: ProjectionDownload,
  lanes: Partial<DeskLanes> = {},
): { props: ProjectionPanelProps & { onOpenAll: () => void }, view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>, capture: ReturnType<typeof vi.fn>, process: ReturnType<typeof vi.fn>, openAll: ReturnType<typeof vi.fn> } {
  const view = createProjectionViewStore(defineStore).create()
  const capture = vi.fn()
  const process = vi.fn()
  const openAll = vi.fn()
  const statuses: StatusMap = new Map()
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
      surface,
      useProjection: <S,>(select: (candidate: ProjectionDownload) => S): S => select(value),
      useStore: <S,>(select: (candidate: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()),
      useSessionStatus: <S,>(select: (candidate: StatusMap) => S): S => select(statuses),
      actions: view.actions,
      onOpenAll: openAll,
    },
  }
}

function renderHome(props: ProjectionPanelProps & { onOpenAll: () => void }): unknown {
  stateIndex = 0
  return OnePageHome(props)
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
    expect(copy).not.toContain('看板')
    expect(copy).not.toContain('流水')
    expect(findButton(tree, '看板')).toBeUndefined()
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

  it('HomeSurface switches to the full board and back', () => {
    const { props } = panelProps({ status: 'ready', data: projection([matter()]) })
    const { onOpenAll: _unused, ...panel } = props
    stateSlots.length = 0
    stateIndex = 0
    const home = expand(HomeSurface(panel))
    expect(text(home)).toContain('今天')
    findButton(home, '全部（1）')?.onClick?.()
    stateIndex = 0
    const board = expand(HomeSurface(panel))
    expect(text(board)).toContain('看板')
    expect(findButton(board, '回到今天')).toBeDefined()
    findButton(board, '回到今天')?.onClick?.()
    stateIndex = 0
    const back = expand(HomeSurface(panel))
    expect(text(back)).toContain('今天')
    expect(text(back)).toContain('Q3 销售掉了 20%')
  })
})
