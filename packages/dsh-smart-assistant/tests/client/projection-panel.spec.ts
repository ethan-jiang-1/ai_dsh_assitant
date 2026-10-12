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
  return text(ProjectionPanel({ useProjection: select => select(value), useStore: select => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop }))
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
describe('global projection panel', () => {
  it('renders only the selected matter evidence and reports vanished selection without switching target', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.selectMatter('b')
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 1, ledgerId: 'test', revision: 2, receipts: [], unclaimed: [], matters: [
      { id: 'a', title: '事项 A', status: 'active', summary: 'A 摘要', responsible: '', revision: 1, times: {}, proposals: [], evidence: [{ id: 'ea', sessionId: 'sa', eventId: 'xa', quote: 'A 来源', note: 'A 来源' }] },
      { id: 'b', title: '事项 B', status: 'active', summary: 'B 摘要', responsible: '', revision: 1, times: {}, proposals: [], evidence: [{ id: 'eb', sessionId: 'sb', eventId: 'xb', quote: 'B 来源', note: 'B 来源' }] },
    ] } }
    const process = vi.fn()
    const props = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(value), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: process }
    const output = text(ProjectionPanel(props))
    expect(output).toContain('B 来源')
    expect(output).not.toContain('A 来源')
    expect(output).toContain('处理这件事')
    view.actions.selectMatter('gone')
    expect(text(ProjectionPanel(props))).toContain('所选事项不在当前投影中')
    expect(view.getSnapshot().selectedId).toBe('gone')
  })

  it('shows the completion time on a completed matter — the fourth business time', () => {
    const view = createProjectionViewStore(defineStore).create()
    const base = { schemaVersion: 2 as const, ledgerId: 'test', revision: 4, receipts: [], unclaimed: [] }
    const completed = {
      id: 'c1', title: '已收尾的事', status: 'completed' as const, summary: '做完', responsible: '', revision: 2,
      times: { promisedDeadline: '2026-10-13', forecastAt: '2026-10-15', nextCheckpoint: '2026-10-13', completedAt: '2026-10-16T04:00:00.000Z' },
      proposals: [], evidence: [{ id: 'e1', sessionId: 's1', eventId: 'x1', quote: '到账回单', note: '到账回单' }],
    }
    view.actions.selectMatter('c1')
    const props = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select({ status: 'ready', data: { ...base, matters: [completed] } }), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop }
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
    const base = { useProjection: <S,>(select: (value: ProjectionDownload) => S): S => select(value), useStore: <S,>(select: (value: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk: vi.fn(), onProcess: noop }
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
    const output = ProjectionPanel({ useProjection: select => select({ status: 'missing' }), useStore: select => select(view.getSnapshot()), actions: view.actions, refreshProjection: vi.fn(), onAsk, onProcess: noop })
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
