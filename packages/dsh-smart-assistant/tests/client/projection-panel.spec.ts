/** Pure component: honest missing/error/stale content, full collection and real action callbacks. */
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { ProjectionPanel, type ProjectionPanelProps } from '../../src/client/projection/projection-panel'
import type { DeskLanes } from '../../src/client/projection/desk-surface'
import type { ProjectionDownload } from '../../src/client/projection/projection-reader'
import type { OperatingMatter, OperatingProjection, OperatingReceipt } from '../../src/client/projection/operating-projection'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { defineStore } from '@deepseek-ai/dsh-client-store'

bindClientRequire(() => ({ createElement }))
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (typeof node === 'string') return node
  if (node !== null && typeof node === 'object' && 'props' in node) return text((node as { props: { children?: unknown } }).props.children)
  return ''
}
/** The platform status map as a selector hook; fixtures that do not exercise it pass an empty map. */
const noStatuses = <S,>(select: (value: ReadonlyMap<string, { running?: boolean, pendingInteraction?: { kind?: string } | undefined, completionUnread?: boolean }>) => S): S => select(new Map())
const noop = (): void => {}
function render(value: ProjectionDownload): string {
  const view = createProjectionViewStore(defineStore).create()
  return text(ProjectionPanel(panelProps(value, view)))
}
/** Render with the proactive catalog hook (261018 片 1 row 3) and the tasks deep-link. */
type CatalogState = import('../../src/client/proactive/proactive-face-source').ProactiveCatalogState
type UiState = import('../../src/client/proactive/proactive-face').ProactiveUiState
type StatusMap = ReadonlyMap<string, { running?: boolean, pendingInteraction?: { kind?: string } | undefined, completionUnread?: boolean }>

/** A lane surface with inert defaults; tests override only the callback they assert on. */
function surface(lanes: Partial<DeskLanes> = {}): ProjectionPanelProps['surface'] {
  return {
    lanes: {
      refreshProjection: vi.fn(),
      onAsk: vi.fn(),
      onCapture: noop,
      onOpenSession: noop,
      onProcess: noop,
      onClaim: noop,
      onDiscard: noop,
      onWake: noop,
      ...lanes,
    },
  }
}

/** The one fixture builder every render site uses; a new lane or hook no longer edits each test. */
function panelProps(
  value: ProjectionDownload,
  view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>,
  lanes: Partial<DeskLanes> = {},
  options: { statuses?: StatusMap, catalog?: CatalogState, ui?: UiState } = {},
): ProjectionPanelProps {
  const statuses = options.statuses ?? new Map()
  return {
    surface: surface(lanes),
    useProjection: <S,>(select: (candidate: ProjectionDownload) => S): S => select(value),
    useStore: <S,>(select: (candidate: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()),
    useSessionStatus: <S,>(select: (candidate: StatusMap) => S): S => select(statuses),
    actions: view.actions,
    ...(options.catalog === undefined ? {} : {
      useCatalog: <S,>(select: (state: CatalogState) => S): S => select(options.catalog as CatalogState),
    }),
    ...(options.ui === undefined ? {} : {
      useProactiveUi: <S,>(select: (state: UiState) => S): S => select(options.ui as UiState),
    }),
  }
}
function renderWithCatalog(value: ProjectionDownload, catalog: CatalogState, ui: UiState = { ignored: [], accepted: [] }, statuses: StatusMap = new Map()): { tree: string, view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>, openTasks: ReturnType<typeof vi.fn>, openSession: ReturnType<typeof vi.fn>, suggestAction: ReturnType<typeof vi.fn>, suggestDismiss: ReturnType<typeof vi.fn>, suggestCollapse: ReturnType<typeof vi.fn>, watchForget: ReturnType<typeof vi.fn>, node: unknown } {
  const view = createProjectionViewStore(defineStore).create()
  const openTasks = vi.fn()
  const openSession = vi.fn()
  const suggestAction = vi.fn()
  const suggestDismiss = vi.fn()
  const watchForget = vi.fn()
  const suggestCollapse = vi.fn()
  const node = ProjectionPanel(panelProps(value, view, {
    onOpenSession: openSession, onOpenTasks: openTasks, onSuggestAction: suggestAction,
    onSuggestDismiss: suggestDismiss, onWatchForget: watchForget, onSuggestCollapse: suggestCollapse,
  }, { statuses, catalog, ui }))
  return { tree: text(node), view, openTasks, openSession, suggestAction, suggestDismiss, suggestCollapse, watchForget, node }
}
/** Collect every string attribute value matching a key anywhere in the tree (data-* assertions). */
function collectAttr(node: unknown, key: string, into: string[] = []): string[] {
  if (Array.isArray(node)) { for (const child of node) collectAttr(child, key, into); return into }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: Record<string, unknown> }).props
    if (typeof props[key] === 'string') into.push(props[key] as string)
    collectAttr(props['children'], key, into)
  }
  return into
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
/** Locate a node by its class name — for asserting on ATTRIBUTES (placeholders live there). */
function findByClass(node: unknown, className: string): { className?: string, children?: unknown, placeholder?: string, value?: string, disabled?: boolean, onInput?: (event: { target: { value: string } }) => void, onKeyDown?: (event: { key: string, preventDefault: () => void }) => void } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findByClass(child, className)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { className?: string, children?: unknown } }).props
    if (props.className === className) return props
    return findByClass(props.children, className)
  }
  return undefined
}

/** Card labels are their full text; cards (unlike action buttons) are located by substring. */
function findButtonBySubstring(node: unknown, label: string): { onClick?: () => void } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButtonBySubstring(child, label)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { children?: unknown, onClick?: () => void } }).props
    if (text(node).includes(label) && props.onClick !== undefined) return props
    return findButtonBySubstring(props.children, label)
  }
  return undefined
}
describe('global projection panel', () => {
  it('renders only the selected matter evidence and reports vanished selection without switching target', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.selectMatter('b')
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 1, ledgerId: 'test', revision: 2, receipts: [], unclaimed: [], matters: [
      { id: 'a', title: '事项 A', status: 'active', summary: 'A 摘要', responsible: '', revision: 1, times: {}, proposals: [], evidence: [{ id: 'ea', sessionId: 'sa', eventId: 'xa', quote: 'A 来源', note: 'A 来源' }] },
      { id: 'b', title: '事项 B', status: 'active', summary: 'B 摘要', responsible: '', revision: 1, times: {}, proposals: [], evidence: [{ id: 'eb', sessionId: 'sb', eventId: 'xb', quote: 'B 来源', note: 'B 来源' }] },
    ] } }
    const process = vi.fn()
    const props = panelProps(value, view, { onProcess: process })
    const output = text(ProjectionPanel(props))
    expect(output).toContain('B 来源')
    expect(output).not.toContain('A 来源')
    expect(output).toContain('处理这件事')
    view.actions.selectMatter('gone')
    expect(text(ProjectionPanel(props))).toContain('所选事项不在当前投影中')
    expect(view.getSnapshot().selected).toEqual({ kind: 'matter', id: 'gone' })
  })

  it('filters matters by status chips while the unclaimed inbox stays put (history views ②)', () => {
    const view = createProjectionViewStore(defineStore).create()
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 2, receipts: [], unclaimed: [{ id: 'u-1', note: '有条片段', sessionId: 's9' }], matters: [
      { id: 'a', title: '在办的事A', status: 'active', summary: '', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
      { id: 'b', title: '办结的事B', status: 'completed', summary: '', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
    ] } }
    const props = panelProps(value, view)
    // Default = 全部: today's behavior, nothing hidden.
    expect(text(ProjectionPanel(props))).toContain('办结的事B')
    view.actions.setFilter('active')
    const active = text(ProjectionPanel(props))
    expect(active).toContain('在办的事A')
    expect(active).not.toContain('办结的事B')
    expect(active).toContain('有条片段')
    view.actions.setFilter('settled')
    const settled = text(ProjectionPanel(props))
    expect(settled).toContain('办结的事B')
    expect(settled).not.toContain('在办的事A')
    view.actions.setFilter('all')
    expect(text(ProjectionPanel(props))).toContain('办结的事B')
  })

  it('activity mode renders the operations feed grouped newest-first and an entry click jumps to its matter (history views ③)', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.setMode('activity')
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 3, receipts: [
      { operationId: 'op-1', matterId: 'a', sessionId: 's1', submittedAt: '2026-10-12T01:00:00.000Z', status: 'committed', revision: 1, kind: 'create' },
      { operationId: 'op-2', matterId: 'b', sessionId: 's2', submittedAt: '2026-10-13T05:00:00.000Z', status: 'committed', revision: 1, kind: 'claim', quote: '那条就是它的' },
    ], unclaimed: [], matters: [
      { id: 'a', title: '事项A', status: 'active', summary: '', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
      { id: 'b', title: '事项B', status: 'active', summary: '', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
    ] } }
    const output = ProjectionPanel(panelProps(value, view))
    const flat = text(output)
    // Newest first across matters: the 10-13 claim precedes the 10-12 creation.
    expect(flat.indexOf('认领归户')).toBeLessThan(flat.indexOf('交办立项'))
    expect(flat).toContain('事项B')
    expect(flat).toContain('「那条就是它的」')
    // The entry is a button that jumps: board mode back on, the matter selected in detail.
    const entry = findButtonBySubstring(output, '认领归户')
    expect(entry).toBeDefined()
    entry?.onClick?.()
    expect(view.getSnapshot().mode).toBe('board')
    expect(view.getSnapshot().selected).toEqual({ kind: 'matter', id: 'b' })
  })

  it('progressively reveals older operations inside the activity feed', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.setMode('activity')
    const receipts = Array.from({ length: 60 }, (_, index) => ({
      operationId: `op-${String(index)}`, matterId: 'a', sessionId: 's', submittedAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(), status: 'committed', revision: index + 1, kind: 'update',
    }))
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 60, receipts, unclaimed: [], matters: [
      { id: 'a', title: '事项A', status: 'active', summary: '', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
    ] } }
    const props = panelProps(value, view)
    // The default limit reveals the newest 50; the rest waits behind 「显示更早」.
    expect((text(ProjectionPanel(props)).match(/更新事项/g) ?? []).length).toBe(50)
    const more = findButton(ProjectionPanel(props), '显示更早')
    expect(more).toBeDefined()
    more?.onClick?.()
    expect((text(ProjectionPanel(props)).match(/更新事项/g) ?? []).length).toBe(60)
  })

  it('renders the matter biography: the actions section lists this matter\'s operations newest-first with kind labels, quotes and sessions', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.selectMatter('a')
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 3, receipts: [
      { operationId: 'op-1', matterId: 'a', sessionId: 's1', submittedAt: '2026-10-12T01:00:00.000Z', status: 'committed', revision: 1, kind: 'create' },
      { operationId: 'op-2', matterId: 'a', sessionId: 's2', submittedAt: '2026-10-12T05:00:00.000Z', status: 'committed', revision: 2, kind: 'claim', quote: '那条就是 NB-02 的' },
      { operationId: 'op-9', matterId: 'b', sessionId: 's3', submittedAt: '2026-10-12T06:00:00.000Z', status: 'committed', revision: 1, kind: 'create' },
    ], unclaimed: [], matters: [
      { id: 'a', title: '事项 A', status: 'active', summary: 'A 摘要', responsible: '', revision: 2, times: {}, proposals: [], evidence: [] },
    ] } }
    const output = text(ProjectionPanel(panelProps(value, view)))
    expect(output).toContain('动作')
    expect(output).toContain('认领归户')
    expect(output).toContain('交办立项')
    // Newest first: the 05:00 claim precedes the 01:00 creation.
    expect(output.indexOf('认领归户')).toBeLessThan(output.indexOf('交办立项'))
    expect(output).toContain('「那条就是 NB-02 的」')
    expect(output).toContain('s2')
    // Another matter's operation must not leak into this biography (its session id is the tell).
    expect(output.indexOf('s3')).toBe(-1)
  })

  it('gates the detail action by status: settled matters wake, active matters process (history of the state machine)', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.selectMatter('done')
    const onWake = vi.fn()
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 2, receipts: [], unclaimed: [], matters: [
      { id: 'done', title: '办结的事', status: 'completed', summary: '做完了', responsible: '', revision: 2, times: {}, proposals: [], evidence: [] },
    ] } }
    const props = panelProps(value, view, { onWake })
    const output = ProjectionPanel(props)
    // The wake button leads with a glyph, so it locates by substring (icon+text buttons do).
    const wake = findButtonBySubstring(output, '唤醒这件事')
    expect(wake).toBeDefined()
    expect(findButton(output, '处理这件事')).toBeUndefined()
    wake?.onClick?.()
    expect(onWake).toHaveBeenCalledWith('done')
    // After waking, the same matter is active again and the button reads 处理这件事.
    view.actions.selectMatter('done')
    const activeValue: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 3, receipts: [], unclaimed: [], matters: [
      { id: 'done', title: '办结的事', status: 'active', summary: '做完了', responsible: '', revision: 3, times: {}, proposals: [], evidence: [] },
    ] } }
    const activeOutput = ProjectionPanel(panelProps(activeValue, view, { onWake }))
    expect(findButton(activeOutput, '处理这件事')).toBeDefined()
    expect(findButton(activeOutput, '唤醒这件事')).toBeUndefined()
  })

  it('shows the completion time on a completed matter — the fourth business time', () => {    const view = createProjectionViewStore(defineStore).create()
    const base = { schemaVersion: 2 as const, ledgerId: 'test', revision: 4, receipts: [], unclaimed: [] }
    const completed = {
      id: 'c1', title: '已收尾的事', status: 'completed' as const, summary: '做完', responsible: '', revision: 2,
      times: { promisedDeadline: '2026-10-13', forecastAt: '2026-10-15', nextCheckpoint: '2026-10-13', completedAt: '2026-10-16T04:00:00.000Z' },
      proposals: [], evidence: [{ id: 'e1', sessionId: 's1', eventId: 'x1', quote: '到账回单', note: '到账回单' }],
    }
    view.actions.selectMatter('c1')
    const props = panelProps({ status: 'ready', data: { ...base, matters: [completed] } }, view)
    const output = text(ProjectionPanel(props))
    // 四种时间各占一段：承诺/预测/核对/完成。Zoned stamps render viewer-local, so the
    // expectation is computed through the same Date API instead of a fixed wall clock.
    expect(output).toContain('承诺 2026-10-13')
    expect(output).toContain('预测 2026-10-15')
    expect(output).toContain('核对 2026-10-13')
    const stamp = '2026-10-16T04:00:00.000Z'
    const at = new Date(stamp)
    const pad = (n: number): string => String(n).padStart(2, '0')
    const local = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
    expect(output).toContain(`完成 ${local}`)
    expect(output).not.toContain(stamp)
  })

  it('separates missing from damaged ledger', () => {
    expect(render({ status: 'missing' })).toContain('还没有经营事项资料')
    expect(render({ status: 'error', error: 'projection-invalid' })).toContain('损坏或版本不支持')
    expect(render({ status: 'error' })).not.toContain('还没有经营事项')
  })

  it('routes 「＋ 交代新事项」 to the intake callback when one is wired (and to onAsk without it)', () => {
    const view = createProjectionViewStore(defineStore).create()
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 1, ledgerId: 'test', revision: 2, receipts: [], unclaimed: [], matters: [
      { id: 'a', title: '事项 A', status: 'active', summary: 'A 摘要', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
    ] } }
    const ask = vi.fn()
    const entrust = vi.fn()
    const base = panelProps(value, view, { onAsk: ask, onEntrust: entrust })
    // Wired: the entry hands the intake path binder through inject; the button must use it.
    findButton(ProjectionPanel(base), '＋ 交代新事项')?.onClick?.()
    expect(entrust).toHaveBeenCalledTimes(1)
    expect(ask).not.toHaveBeenCalled()
    // Not wired (tests, environments without the desk path store): the button still opens the
    // conversation rather than going dead.
    const fallbackAsk = vi.fn()
    findButton(ProjectionPanel(panelProps(value, view, { onAsk: fallbackAsk })), '＋ 交代新事项')?.onClick?.()
    expect(fallbackAsk).toHaveBeenCalledTimes(1)
  })

  it('offers a visible add-matter entry routed to the conversation (2026-10-11 principal could not find one)', () => {
    const onAsk = vi.fn()
    const view = createProjectionViewStore(defineStore).create()
    const output = ProjectionPanel(panelProps({ status: 'missing' }, view, { onAsk }))
    expect(text(output)).toContain('＋ 交代新事项')
    findButton(output, '＋ 交代新事项')?.onClick?.()
    expect(onAsk).toHaveBeenCalledTimes(1)
  })

  it('grays the refresh button while a read is in flight — auto or manual — and recovers after', () => {
    const view = createProjectionViewStore(defineStore).create()
    const props = (status: ProjectionDownload['status']) => panelProps({ status }, view)
    expect(findButton(ProjectionPanel(props('loading')), '重新读取')?.disabled).toBe(true)
    expect(findButton(ProjectionPanel(props('ready')), '重新读取')?.disabled).toBe(false)
    expect(findButton(ProjectionPanel(props('ready')), '重新读取')?.onClick).toBeDefined()
  })
  it('shows all eight matters, completed history and stale fixture notice', () => {
    const output = render({ status: 'disconnected', stale: true, data: { schemaVersion: 1, ledgerId: 'simulated', revision: 7, fixture: true, receipts: [], unclaimed: [], matters: Array.from({ length: 8 }, (_, index) => ({ id: `m${String(index)}`, title: `事项${String(index)}`, status: index === 7 ? 'completed' : 'active', summary: '待核对', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] })) } })
    for (let index = 0; index < 8; index++) expect(output).toContain(`事项${String(index)}`)
    expect(output).toContain('已完成')
    expect(output).toContain('尚未刷新')
    expect(output).toContain('模拟资料')
  })
})

describe('unclaimed fragments are first-class selectable items (principal direction 2026-10-12)', () => {
  const fragment = { id: 'u-1', note: '2026-10-11 19:20 收到口头转述：「有一笔二期款已经付了」…', sessionId: 'session-src' }
  const claimFixture = (): ProjectionDownload => ({ status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 3, receipts: [], unclaimed: [fragment], matters: [
    { id: 'a', title: '事项 A', status: 'active', summary: 'A 摘要', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
  ] } })
  const claimProps = (view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>, onClaim: (id: string) => void) =>
    panelProps(claimFixture(), view, { onClaim })

  it('renders the fragment card as a selectable button whose detail carries note, source and the claim action', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onClaim = vi.fn()
    const output = ProjectionPanel(claimProps(view, onClaim))
    const card = findButtonBySubstring(output, '二期款已经付了')
    expect(card).toBeDefined()
    card?.onClick?.()
    const detail = ProjectionPanel(claimProps(view, onClaim))
    expect(text(detail)).toContain('二期款已经付了')
    expect(text(detail)).toContain('来自 session-src')
    const claimButton = findButton(detail, '认领这件事')
    expect(claimButton).toBeDefined()
    claimButton?.onClick?.()
    expect(onClaim).toHaveBeenCalledWith('u-1')
  })

  it('offers the fragment\'s other terminal — 「是噪音，不归户」 hands the same id back', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onDiscard = vi.fn()
    const props = panelProps(claimFixture(), view, { onDiscard })
    // Select first, then render: the detail carries the proportionate actions for the fragment.
    ProjectionPanel(props)
    view.actions.selectFragment('u-1')
    const detail = ProjectionPanel(props)
    expect(text(detail)).toContain('还没说清是哪件事——认领后原文与来源随附入账')
    const discardButton = findButton(detail, '是噪音，不归户')
    expect(discardButton).toBeDefined()
    discardButton?.onClick?.()
    expect(onDiscard).toHaveBeenCalledWith('u-1')
  })

  it('selecting a matter again clears the fragment selection (one selection, not two)', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onClaim = vi.fn()
    ProjectionPanel(claimProps(view, onClaim))
    view.actions.selectFragment('u-1')
    expect(view.getSnapshot().selected).toEqual({ kind: 'fragment', id: 'u-1' })
    view.actions.selectMatter('a')
    expect(view.getSnapshot().selected).toEqual({ kind: 'matter', id: 'a' })
    expect(text(ProjectionPanel(claimProps(view, onClaim)))).toContain('事项 A')
  })

  it('reports a vanished fragment selection instead of silently falling back', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onClaim = vi.fn()
    view.actions.selectFragment('gone')
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 1, receipts: [], unclaimed: [], matters: [] } }
    const output = text(ProjectionPanel(panelProps(value, view, { onClaim })))
    expect(output).toContain('所选片段不在当前投影中')
  })
})

/**
 * 261018 片 1: the desk's own capture row. The intent to add something arises while looking at
 * the desk, so the desk takes it — and while the line is delivered but not yet in the ledger, the
 * row says exactly that and nothing more (a delivery receipt, never a claim of content).
 */
describe('the desk\'s capture row: takes the words here, and never overstates what it holds', () => {
  const value = (revision: number): ProjectionDownload => ({
    status: 'ready',
    data: { schemaVersion: 2 as const, ledgerId: 'test', revision, receipts: [], unclaimed: [], matters: [] },
  })
  const props = (
    view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>,
    revision: number,
    onCapture: (text: string) => void,
    lanes: Partial<DeskLanes> = {},
    statuses?: StatusMap,
  ) => panelProps(value(revision), view, { onCapture, ...lanes }, { statuses: statuses ?? new Map() })

  it('names both doors and their weight on the surface', () => {
    const view = createProjectionViewStore(defineStore).create()
    const rendered = ProjectionPanel(props(view, 1, noop))
    // The invitation is the input's placeholder (an attribute), and the two doors' weights are
    // the hint under it; both must be on the surface, not in a tooltip.
    expect(findByClass(rendered, 'dsha-capture-input')?.placeholder).toBe('有新的事，直接说…')
    expect(text(rendered)).toContain('轻的走这里')
    expect(text(rendered)).toContain('要正式立项用「＋ 交代新事项」当面谈')
  })

  it('submits the typed words through onCapture and clears the draft', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onCapture = vi.fn()
    view.actions.setCaptureDraft('记得问一下小王那个报价到底批了没')
    const output = ProjectionPanel(props(view, 1, onCapture))
    const send = findButton(output, '交给助手')
    expect(send).toBeDefined()
    send?.onClick?.()
    expect(onCapture).toHaveBeenCalledWith('记得问一下小王那个报价到底批了没')
    expect(view.getSnapshot().captureDraft).toBe('')
  })

  it('shows the delivered line as in flight, and stops once the ledger revision moves past it', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.setCaptureReceipt({ requestId: 'desk-capture-1', sessionId: 's-1', text: '记得问一下小王那个报价到底批了没', observedRevision: 3 })

    const during = text(ProjectionPanel(props(view, 3, noop)))
    // 片 1b: with no platform status this reads "已交给助手 · 还没进账" — the durable half is that
    // the substance is NOT in the ledger; the turn half comes from SessionStatus (next test).
    expect(during).toContain('已交给助手')
    expect(during).toContain('还没进账')
    expect(during).toContain('「记得问一下小王那个报价到底批了没」')
    expect(during).toContain('来自：桌面直接交代')
    // The row must not borrow a matter's or a fragment's shape, and the desk must not claim the
    // ledger holds it.
    expect(during).not.toContain('已记下')
    expect(findButton(ProjectionPanel(props(view, 3, noop)), '交给助手')?.disabled).toBe(true)

    const after = text(ProjectionPanel(props(view, 4, noop)))
    expect(after).not.toContain('还没进账')
    expect(findButton(ProjectionPanel(props(view, 4, noop)), '交给助手')?.disabled).toBe(true)
  })
  it('names whose turn it is from the platform status, and points at the conversation when it is mine', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onOpenSession = vi.fn()
    view.actions.setCaptureReceipt({ requestId: 'desk-capture-2', sessionId: 's-1', text: '记得问一下小王', observedRevision: 3 })
    const withStatus = (status: { running?: boolean, pendingInteraction?: { kind?: string } | undefined, completionUnread?: boolean }) =>
      props(view, 3, noop, { onOpenSession }, new Map([['s-1', status]]))

    const mine = ProjectionPanel(withStatus({ running: true, pendingInteraction: { kind: 'question' } }))
    expect(text(mine)).toContain('轮到我')
    expect(text(mine)).toContain('助手在会话里问了话')
    const go = findButton(mine, '去会话')
    expect(go).toBeDefined()
    go?.onClick?.()
    expect(onOpenSession).toHaveBeenCalledWith('s-1')

    expect(text(ProjectionPanel(withStatus({ running: true })))).toContain('等助手')
    const unread = ProjectionPanel(withStatus({ running: false, completionUnread: true }))
    expect(text(unread)).toContain('它说完了')
    expect(findButton(unread, '去会话')).toBeDefined()
    const idle = ProjectionPanel(withStatus({ running: false }))
    expect(text(idle)).toContain('已交给助手')
    expect(findButton(idle, '去会话')).toBeUndefined()
    // The ledger claim never weakens with the status: whatever the turn state, the row still says
    // the substance is not in the ledger yet.
    expect(text(idle)).toContain('还没进账')
  })

  it('an action lane settles when the turn ends without a ledger write — input back on, honest terminal line', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onOpenSession = vi.fn()
    // The watch/trial lanes deliver a canned instruction, not the principal's words: the row
    // must echo the human LABEL, never the prompt engineering behind it.
    view.actions.setCaptureReceipt({
      requestId: 'desk-capture-3', sessionId: 's-1', lane: 'action', label: '先试跑「到期日到了替我核一遍账」',
      text: '先试跑一次「到期日到了替我核一遍账」：真读真判断、不建排程、不写账本', observedRevision: 3,
    })
    const settled = props(view, 3, noop, { onOpenSession }, new Map([['s-1', { running: false, completionUnread: true }]]))
    const output = ProjectionPanel(settled)
    expect(text(output)).toContain('它说完了')
    expect(text(output)).toContain('结果在会话里')
    // The ledger did not move by design — claiming "还没进账" would be a permanent lie.
    expect(text(output)).not.toContain('还没进账')
    expect(text(output)).toContain('先试跑「到期日到了替我核一遍账」')
    expect(text(output)).not.toContain('真读真判断')
    // The turn is over: the desk's own input is usable again (this is the P0 the fix targets).
    expect(findByClass(output, 'dsha-capture-input')?.disabled).toBe(false)
    expect(findButton(output, '去会话')).toBeDefined()

    const close = findButton(output, '关闭')
    expect(close).toBeDefined()
    close?.onClick?.()
    expect(view.getSnapshot().captureReceipt).toBe(null)
  })

  it('a capture that ends with no ledger write says so, and still offers the way out', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.setCaptureReceipt({ requestId: 'desk-capture-4', sessionId: 's-1', text: '记得问一下小王那个报价', observedRevision: 3 })
    const settled = props(view, 3, noop, {}, new Map([['s-1', { running: false, completionUnread: true }]]))
    const output = ProjectionPanel(settled)
    expect(text(output)).toContain('它说完了')
    expect(text(output)).toContain('账本没有新东西')
    expect(text(output)).toContain('「记得问一下小王那个报价」')
    expect(findByClass(output, 'dsha-capture-input')?.disabled).toBe(false)
    expect(findButton(output, '关闭')).toBeDefined()
  })

  it('suggestion actions are shut while a delivery is in flight (BUG-018)', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.setCaptureReceipt({ requestId: 'desk-capture-9', sessionId: 's-1', text: '记得问一下小王', observedRevision: 3 })
    const running = props(view, 3, noop, {}, new Map([['s-1', { running: true }]]))
    const busy = ProjectionPanel(running)
    expect(findButton(busy, '替我盯上')?.disabled).toBe(true)
    expect(findButton(busy, '先试跑一次')?.disabled).toBe(true)

    const clearView = createProjectionViewStore(defineStore).create()
    const idle = ProjectionPanel({ ...props(clearView, 3, noop), useSessionStatus: noStatuses })
    expect(findButton(idle, '替我盯上')?.disabled).toBe(false)
  })

  it('the capture session\'s own question stays with the in-flight row (no double count, BUG-016)', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.setCaptureReceipt({ requestId: 'desk-capture-q', sessionId: 's-1', text: '记得问一下小王', observedRevision: 3 })
    const statuses: ReadonlyMap<string, { running?: boolean, pendingInteraction?: { kind?: string } | undefined }> = new Map([['s-1', { running: true, pendingInteraction: { kind: 'question' } }]])
    const output = ProjectionPanel(props(view, 3, noop, {}, statuses))
    expect(text(output)).toContain('轮到我')
    expect(text(output)).not.toContain('句等你答')
  })
})

describe('proactive face rows (261018 片 1)', () => {
  const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000 - 3_600_000).toISOString()
  const daysAhead = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString()
  function download(matters: readonly OperatingMatter[], receipts: readonly OperatingReceipt[] = [], unclaimed: OperatingProjection['unclaimed'] = []): ProjectionDownload {
    return { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 1, matters, receipts, unclaimed } }
  }
  const overdueMatter: OperatingMatter = { id: 'm-1', title: '合同 NB-02 二期款核对', status: 'active', summary: '', responsible: '', revision: 1, times: { nextCheckpoint: daysAgo(5) }, proposals: [], evidence: [] }
  const catalog = (entries: unknown[]): import('../../src/client/proactive/proactive-face-source').ProactiveCatalogState => ({ status: 'entries', entries: entries as never })

  it('row 1 renders the overdue fact with one action, settled lives excluded', () => {
    const { tree, node } = renderWithCatalog(download([{ ...overdueMatter }, { ...overdueMatter, id: 'm-2', title: '已了结的旧事项', status: 'completed' }]), catalog([]))
    expect(tree).toContain('到期 5 天，账上没有结果')
    expect(tree).toContain('合同 NB-02 二期款核对')
    expect(tree).not.toContain('已了结的旧事项 · 到期')
    expect(findButton(node, '看这件事')).toBeDefined()
  })

  it('row 1 a matter due minutes ago says 今天到期, never 到期 0 天 (BUG-023)', () => {
    const justDue: OperatingMatter = { ...overdueMatter, id: 'm-0', times: { nextCheckpoint: new Date(Date.now() - 30 * 60_000).toISOString() } }
    const { tree } = renderWithCatalog(download([justDue]), catalog([]))
    expect(tree).toContain('今天到期')
    expect(tree).not.toContain('到期 0 天')
  })

  it('row 1 action from the activity tab returns to the board and selects the matter (BUG-019)', () => {
    const { view, node } = renderWithCatalog(download([overdueMatter]), catalog([]))
    view.actions.setMode('activity')
    findButton(node, '看这件事')?.onClick?.()
    expect(view.getSnapshot().mode).toBe('board')
    expect(view.getSnapshot().selected).toEqual({ kind: 'matter', id: 'm-1' })
  })

  it('row 2 去处理 goes to the first waiting thing, and returns to the board (BUG-019)', () => {
    const { view, node } = renderWithCatalog(download([], [], [{ id: 'u-7', note: '待认领片段', sessionId: 's1' }]), catalog([]))
    view.actions.setMode('activity')
    findButton(node, '去处理')?.onClick?.()
    expect(view.getSnapshot().mode).toBe('board')
    expect(view.getSnapshot().selected).toEqual({ kind: 'fragment', id: 'u-7' })
  })

  it('row 3 a past scheduled instant is stated as late, not as a future look (BUG-023)', () => {
    const entry = { id: 's-past', kind: 'weekly', title: '每周对账', prompt: 'x', scheduledAt: daysAgo(2), sessionId: 'sa', status: 'active' as const }
    const { tree } = renderWithCatalog(download([]), catalog([entry]))
    expect(tree).toContain('它该在')
    expect(tree).toContain('还没看到它动')
    expect(tree).not.toContain('它下次替你看：每周对账')
  })

  it('all-empty state renders no proactive block at all', () => {
    const { tree, node } = renderWithCatalog(download([]), catalog([]))
    expect(tree).not.toContain('它替你看')
    expect(tree).not.toContain('它在等你')
    expect(collectAttr(node, 'data-proactive-catalog')).toEqual([])
  })

  it('row 2 aggregates waiting items into one row with one action', () => {
    const pending: OperatingMatter = { ...overdueMatter, id: 'm-9', title: '待确认事项', times: {}, proposals: [{ id: 'p-1', kind: 'complete' as const, status: 'pending' as const, proposedAt: daysAgo(1), source: { sessionId: 's1' } }] }
    const { tree, node } = renderWithCatalog(download([pending], [], [{ id: 'u-1', note: '片段', sessionId: 's1' }]), catalog([]))
    expect(tree).toContain('它在等你：1 条要确认 · 1 条待认领')
    expect(findButton(node, '去处理')).toBeDefined()
    expect(findButton(node, '看这件事')).toBeUndefined()
  })

  it('row 2 counts a pending question from another session and opens it (BUG-016)', () => {
    const statuses: StatusMap = new Map([['session-q', { running: false, pendingInteraction: { kind: 'question' } }]])
    const { tree, node, openSession } = renderWithCatalog(download([]), catalog([]), { ignored: [], accepted: [] }, statuses)
    expect(tree).toContain('它在等你：1 句等你答')
    const go = findButton(node, '去答问题')
    expect(go).toBeDefined()
    go?.onClick?.()
    expect(openSession).toHaveBeenCalledWith('session-q')
  })

  it('row 3 states the next look, the late delivery as fact, duplicates with the deep link', () => {
    const scheduled = daysAgo(5)
    const entry = { id: 's-a', kind: 'weekly', title: '每周对账', prompt: 'x', scheduledAt: daysAhead(1), sessionId: 'sa', status: 'active' as const, lastDelivery: { scheduledAt: scheduled, deliveredAt: new Date(Date.parse(scheduled) + 7 * 3_600_000 + 24 * 60_000).toISOString(), messageId: 'm' } }
    const { tree, node, openTasks } = renderWithCatalog(download([]), catalog([entry, { ...entry, id: 's-b', sessionId: 'sb' }]))
    expect(tree).toContain('它下次替你看：每周对账')
    expect(tree).toContain('上次迟了 7 小时')
    expect(tree).toContain('2 条重复盯守')
    const go = findButton(node, '去任务页')
    expect(go).toBeDefined()
    go?.onClick?.()
    expect(openTasks).toHaveBeenCalled()
  })

  it('suggests three named watches in the adjudiced ②③① order, each with two actions and a dismiss', () => {
    const { tree, node, suggestAction } = renderWithCatalog(download([]), catalog([]))
    expect(tree).toContain('让它替你盯')
    expect(tree.indexOf('到期日到了替我核一遍账')).toBeLessThan(tree.indexOf('每周一替我对一次账'))
    expect(tree.indexOf('每周一替我对一次账')).toBeLessThan(tree.indexOf('每个早上替我看一遍桌面'))
    expect(tree).toContain('比「每周一坐」密')
    const trial = findButton(node, '先试跑一次')
    expect(trial).toBeDefined()
    trial?.onClick?.()
    expect(suggestAction).toHaveBeenCalledWith('trial', 'due-check')
    const watch = findButton(node, '替我盯上')
    expect(watch).toBeDefined()
    watch?.onClick?.()
    expect(suggestAction).toHaveBeenCalledWith('watch', 'due-check')
  })

  it('the suggestion block sits below the capture row — the input comes first (261019)', () => {
    const { tree } = renderWithCatalog(download([]), catalog([]))
    expect(tree.indexOf('交给助手')).toBeLessThan(tree.indexOf('让它替你盯'))
    expect(tree.indexOf('让它替你盯')).toBeLessThan(tree.indexOf('看板'))
  })

  it('the suggestion block collapses to one line and expands again (261019)', () => {
    const expanded = renderWithCatalog(download([]), catalog([]))
    expect(expanded.tree).toContain('让它替你盯 · 3 条')
    expect(findButton(expanded.node, '先试跑一次')).toBeDefined()
    const collapse = findButton(expanded.node, '收起')
    expect(collapse).toBeDefined()
    collapse?.onClick?.()
    expect(expanded.suggestCollapse).toHaveBeenCalledWith(true)

    const collapsed = renderWithCatalog(download([]), catalog([]), { ignored: [], accepted: [], collapsed: true })
    expect(collapsed.tree).toContain('让它替你盯 · 3 条')
    expect(findButton(collapsed.node, '先试跑一次')).toBeUndefined()
    const expand = findButton(collapsed.node, '展开')
    expect(expand).toBeDefined()
    expand?.onClick?.()
    expect(collapsed.suggestCollapse).toHaveBeenCalledWith(false)
  })

  it('a dismissed suggestion disappears; all dismissed hides the whole suggest block', () => {
    const one = renderWithCatalog(download([]), catalog([]), { ignored: ['due-check'], accepted: [] })
    expect(one.tree).toContain('每周一替我对一次账')
    expect(one.tree).not.toContain('到期日到了替我核一遍账')
    const all = renderWithCatalog(download([]), catalog([]), { ignored: ['due-check', 'weekly-recon', 'daily-look'], accepted: [] })
    expect(all.tree).not.toContain('让它替你盯')
  })

  it('the dismiss × seals via the callback', () => {
    const { node, suggestDismiss } = renderWithCatalog(download([]), catalog([]))
    const dismiss = findButton(node, '×')
    expect(dismiss).toBeDefined()
    dismiss?.onClick?.()
    expect(suggestDismiss).toHaveBeenCalledWith('due-check')
  })

  it('Q5 mismatch row states the fact and retries through the watch lane', () => {
    const { tree, node, suggestAction } = renderWithCatalog(
      download([]),
      catalog([]),
      { ignored: [], accepted: [{ id: 'daily-look', title: '每个早上替我看一遍桌面', at: new Date().toISOString() }] })
    expect(tree).toContain('说了替你盯但没盯上：每个早上替我看一遍桌面')
    const retry = findButton(node, '再试一次')
    expect(retry).toBeDefined()
    retry?.onClick?.()
    expect(suggestAction).toHaveBeenCalledWith('watch', 'retry:每个早上替我看一遍桌面')
  })

  it('Q5 repeated acceptances render ONE row, and 忽略 forgets it', () => {
    const now = new Date().toISOString()
    const { tree, node, watchForget } = renderWithCatalog(
      download([]),
      catalog([]),
      {
        ignored: [],
        accepted: [
          { id: 'retry:X', title: 'X', at: now },
          { id: 'retry:X', title: 'X', at: new Date(Date.parse(now) + 1000).toISOString() },
        ],
      })
    const occurrences = tree.split('说了替你盯但没盯上：X').length - 1
    expect(occurrences).toBe(1)
    const forget = findButton(node, '忽略')
    expect(forget).toBeDefined()
    forget?.onClick?.()
    expect(watchForget).toHaveBeenCalledWith('X')
  })

  it('an unavailable catalog degrades row 3 to the explicit marker, never a guess', () => {
    const { tree, node } = renderWithCatalog(download([overdueMatter]), { status: 'unavailable' })
    expect(tree).toContain('到期 5 天')
    expect(tree).not.toContain('它下次替你看')
    expect(collectAttr(node, 'data-proactive-catalog')).toContain('unavailable')
  })
})
