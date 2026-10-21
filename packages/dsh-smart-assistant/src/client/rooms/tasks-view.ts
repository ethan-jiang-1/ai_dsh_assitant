/**
 * Workbench tab body for the automation-task catalog. The platform owns the
 * task storage and its detail tab; this view is a thin read-only list that
 * opens the native `scheduleTask` right-sidebar tab on click, so the right rail
 * remains the one place task details live.
 *
 * @module dsh-smart-assistant/client/tasks-view
 */
import { createElement, reactSurface } from '../chrome/runtime'
import type { ProactiveCatalogEntry } from '../proactive/proactive-face'
import type { ProactiveCatalogObservable } from '../proactive/proactive-face-source'

export interface TasksViewEnv {
  readonly source: ProactiveCatalogObservable
  openTask(sessionId: string, id: string): void
}

let env: TasksViewEnv | undefined

/** Bind the catalog and the native task-tab opener from the client apply world. */
export function bindTasksEnv(next: TasksViewEnv): void {
  env = next
}

const MUTED = 'var(--dsw-alias-label-secondary, #a8a8a8)'
const TEXT = 'var(--dsw-alias-label-primary, #f2f2f2)'

function formatWhen(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  return at.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Render the task list; clicking a row opens its detail in the native right rail. */
export function TasksView(props: { sessionId?: string } = {}): ReturnType<typeof createElement> {
  const { useEffect, useState } = reactSurface()
  const [state, setState] = useState(() => env?.source.getSnapshot() ?? { status: 'unavailable' as const })

  useEffect(() => {
    const source = env?.source
    if (source === undefined) return
    setState(source.getSnapshot())
    return source.subscribe(() => setState(source.getSnapshot()))
  }, [])

  const rows = state.status === 'entries'
    ? state.entries.filter((entry: ProactiveCatalogEntry) => entry.status === 'active')
    : []

  return createElement('div', { style: { padding: '24px 28px', maxWidth: '760px', margin: '0 auto' } },
    createElement('h1', { style: { margin: '0 0 4px', fontSize: '22px', color: TEXT } }, '自动化任务'),
    createElement('div', { style: { fontSize: '13px', color: MUTED, marginBottom: '18px' } },
      '任务由平台调度；点一条在右侧栏看规则与运行记录。'),
    state.status === 'fetching' ? createElement('div', { style: { color: MUTED, fontSize: '13px' } }, '正在读取任务…') : null,
    state.status === 'unavailable' ? createElement('div', { style: { color: MUTED, fontSize: '13px' } }, '这个组合里读不到任务目录。') : null,
    state.status === 'entries' && rows.length === 0
      ? createElement('div', { style: { color: MUTED, fontSize: '13px' } }, '还没有开启中的自动化任务。')
      : null,
    rows.map(entry => createElement('button', {
      key: entry.id,
      type: 'button',
      onClick: () => {
        const sessionId = entry.sessionId ?? props.sessionId
        if (sessionId !== undefined && env !== undefined) env.openTask(sessionId, entry.id)
      },
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px',
        width: '100%', padding: '11px 12px', marginBottom: '4px',
        border: '1px solid var(--dsw-alias-separator, #3a3a3a)', borderRadius: '8px',
        background: 'transparent', color: TEXT, cursor: 'pointer', textAlign: 'left',
      },
    },
    createElement('span', { style: { fontSize: '14px' } }, entry.title),
    createElement('span', { style: { fontSize: '12px', color: MUTED } },
      `${entry.kind} · ${formatWhen(entry.scheduledAt)}`))),
  )
}
