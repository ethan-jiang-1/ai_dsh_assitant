/** Pure component: honest missing/error/stale content, full collection and real action callbacks. */
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { bindClientRequire } from '../../src/client/runtime'
import { ProjectionPanel } from '../../src/client/projection-panel'
import type { ProjectionDownload } from '../../src/client/projection-reader'
import { createProjectionViewStore } from '../../src/client/projection-view'
import { defineStore } from '../../../../vendor/dsh/packages/client/store/lib/types/index.js'

bindClientRequire(() => ({ createElement }))
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (typeof node === 'string') return node
  if (node !== null && typeof node === 'object' && 'props' in node) return text((node as { props: { children?: unknown } }).props.children)
  return ''
}
const noop = (): void => {}
function render(value: ProjectionDownload): string {
  const view = createProjectionViewStore(defineStore).create()
  return text(ProjectionPanel({ useProjection: select => select(value), useStore: select => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop }))
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
    const props = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(value), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: process, onClaim: noop, onDiscard: noop, onWake: noop }
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
    const props = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(value), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop }
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
    const output = ProjectionPanel({ useProjection: select => select(value), useStore: select => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop })
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
    const props = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(value), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop }
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
    const output = text(ProjectionPanel({ useProjection: select => select(value), useStore: select => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop }))
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
    const props = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(value), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake }
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
    const activeOutput = ProjectionPanel({ ...props, useProjection: <S,>(select: (v: ProjectionDownload) => S): S => select(activeValue) })
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
    const props = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select({ status: 'ready', data: { ...base, matters: [completed] } }), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop }
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
    const base = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(value), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop }
    const entrust = vi.fn()
    // Wired: the entry hands the intake path binder through inject; the button must use it.
    findButton(ProjectionPanel({ ...base, onEntrust: entrust }), '＋ 交代新事项')?.onClick?.()
    expect(entrust).toHaveBeenCalledTimes(1)
    expect(base.onAsk).not.toHaveBeenCalled()
    // Not wired (tests, environments without the desk path store): the button still opens the
    // conversation rather than going dead.
    const fallbackAsk = vi.fn()
    findButton(ProjectionPanel({ ...base, onAsk: fallbackAsk }), '＋ 交代新事项')?.onClick?.()
    expect(fallbackAsk).toHaveBeenCalledTimes(1)
  })

  it('offers a visible add-matter entry routed to the conversation (2026-10-11 principal could not find one)', () => {
    const onAsk = vi.fn()
    const view = createProjectionViewStore(defineStore).create()
    const output = ProjectionPanel({ useProjection: select => select({ status: 'missing' }), useStore: select => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk, onProcess: noop, onClaim: noop, onDiscard: noop, onWake: noop })
    expect(text(output)).toContain('＋ 交代新事项')
    findButton(output, '＋ 交代新事项')?.onClick?.()
    expect(onAsk).toHaveBeenCalledTimes(1)
  })

  it('grays the refresh button while a read is in flight — auto or manual — and recovers after', () => {
    const view = createProjectionViewStore(defineStore).create()
    const props = (status: ProjectionDownload['status']) => ({
      useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select({ status }),
      useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()),
      actions: view.actions,
      refreshProjection: (): void => {},
      onAsk: (): void => {},
      onProcess: noop,
      onClaim: noop, onDiscard: noop,
      onWake: noop,
    })
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
  const claimProps = (view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>, onClaim: (id: string) => void) => ({
    useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(claimFixture()),
    useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()),
    actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim, onDiscard: noop, onWake: noop,
  })

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
    const props = { ...claimProps(view, noop), onDiscard }
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
    const output = text(ProjectionPanel({ useProjection: select => select(value), useStore: select => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop, onClaim, onDiscard: noop, onWake: noop }))
    expect(output).toContain('所选片段不在当前投影中')
  })
})
