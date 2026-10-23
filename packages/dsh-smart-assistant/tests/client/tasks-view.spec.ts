/**
 * The workbench tasks tab (`src/client/rooms/tasks-view.ts`): the read-only schedule catalog
 * list and its one interaction — opening the task's native detail tab.
 *
 * Acceptance points:
 * - a row click opens the task's OWN session, falling back to the tab's session only when the
 *   task carries none (commit b66f3a0's precedence);
 * - inactive tasks are filtered out;
 * - the time is the viewer's local `zh-CN` rendering, not the raw ISO instant;
 * - fetching and unavailable states say what they are.
 */
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { bindTasksEnv, TasksView } from '../../src/client/rooms/tasks-view'
import { textsOf } from '../support/client-harness.ts'
import type { ProactiveCatalogEntry } from '../../src/client/proactive/proactive-face'
import type { ProactiveCatalogObservable, ProactiveCatalogState } from '../../src/client/proactive/proactive-face-source'

const react = {
  createElement,
  useState: <T,>(initial: T | (() => T)): [T, (next: T) => void] => [typeof initial === 'function' ? (initial as () => T)() : initial, () => {}],
  useEffect: () => {},
  useRef: <T,>(value: T): { current: T } => ({ current: value }),
}
bindClientRequire(() => react)

const entry = (overrides: Partial<ProactiveCatalogEntry>): ProactiveCatalogEntry => ({
  id: 'task-1',
  title: '每天的经营日报',
  kind: 'schedule',
  scheduledAt: '2026-10-21T10:30:00+08:00',
  status: 'active',
  ...overrides,
})

function source(state: ProactiveCatalogState): ProactiveCatalogObservable {
  return { getSnapshot: () => state, subscribe: () => () => {} }
}

function buttons(node: unknown, found: { props: { onClick: () => void } }[] = []): { props: { onClick: () => void } }[] {
  if (Array.isArray(node)) {
    for (const child of node) buttons(child, found)
    return found
  }
  if (node === null || typeof node !== 'object') return found
  const element = node as { type?: unknown, props?: { children?: unknown, onClick?: unknown } }
  if (element.type === 'button' && typeof element.props?.onClick === 'function') {
    found.push(element as { props: { onClick: () => void } })
  }
  return buttons(element.props?.children, found)
}

describe('TasksView', () => {
  it('opens the task in its own session, not the tab session', () => {
    const openTask = vi.fn()
    bindTasksEnv({ source: source({ status: 'entries', entries: [entry({ sessionId: 'task-session' })] }), openTask })
    const [button] = buttons(TasksView({ sessionId: 'tab-session' }))
    button?.props.onClick()
    expect(openTask).toHaveBeenCalledWith('task-session', 'task-1')
  })

  it('falls back to the tab session only when the task carries none', () => {
    const openTask = vi.fn()
    bindTasksEnv({ source: source({ status: 'entries', entries: [entry({})] }), openTask })
    const [button] = buttons(TasksView({ sessionId: 'tab-session' }))
    button?.props.onClick()
    expect(openTask).toHaveBeenCalledWith('tab-session', 'task-1')
  })

  it('renders the local date and minute, not the raw ISO instant', () => {
    bindTasksEnv({ source: source({ status: 'entries', entries: [entry({})] }), openTask: () => {} })
    const text = textsOf(TasksView()).join(' | ')
    const expected = new Date('2026-10-21T10:30:00+08:00')
      .toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    expect(text).toContain(expected)
    expect(text).not.toContain('2026-10-21T10:30:00+08:00')
  })

  it('filters inactive tasks and names the fetching/unavailable states', () => {
    bindTasksEnv({ source: source({ status: 'entries', entries: [entry({ status: 'inactive' })] }), openTask: () => {} })
    expect(textsOf(TasksView()).join(' | ')).toContain('还没有开启中的自动化任务')
    bindTasksEnv({ source: source({ status: 'fetching' }), openTask: () => {} })
    expect(textsOf(TasksView()).join(' | ')).toContain('正在读取任务')
    bindTasksEnv({ source: source({ status: 'unavailable' }), openTask: () => {} })
    expect(textsOf(TasksView()).join(' | ')).toContain('读不到任务目录')
  })
})
