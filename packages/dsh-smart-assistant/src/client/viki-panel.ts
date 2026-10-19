/**
 * The Viki tab: what the memory layer extracted, one row per file, full body on demand.
 * Read-only in B1 (B2 adds deletion on the same route); no prompt, no model turn.
 *
 * @module dsh-smart-assistant/client/viki-panel
 */
import type { VikiEntry } from '../host/viki/client.ts'
import { ContentDrawer } from './content-drawer'
import { muted } from './dom-utils'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'
import { getVikiView, loadViki, loadVikiBody, resetVikiView, useVikiView } from './viki-data-io'

const TYPE_LABEL: Readonly<Record<string, string>> = {
  events: '事件', profile: '画像', preferences: '偏好', entities: '实体', cases: '案例', patterns: '模式', tools: '工具', skills: '技能',
}

function entryLine(entry: VikiEntry): string {
  const type = entry.memoryType === undefined ? '记忆' : TYPE_LABEL[entry.memoryType] ?? entry.memoryType
  return `${type} · ${entry.summary ?? entry.eventName ?? entry.name}`
}

/** The Viki tab glyph (same 14px seat as the room icons). */
export function VikiIcon(props: { size?: number }): ReturnType<typeof createElement> {
  const size = props.size ?? 16
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true,
  },
  createElement('circle', { cx: 12, cy: 12, r: 8.5, stroke: 'currentColor', strokeWidth: 1.6 }),
  createElement('path', { d: 'M12 7.5v9M7.5 12h9', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }))
}

/** Render the Viki tab. */
export function VikiPanel(): ReturnType<typeof createElement> {
  const { useEffect, useState } = reactSurface()
  const view = useVikiView()
  const [drawer, setDrawer] = useState<{ title: string, body: string } | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (getVikiView().status === 'loading') void loadViki()
  }, [])
  const reload = (): void => {
    setNote(undefined)
    resetVikiView()
    void loadViki()
  }
  const open = (entry: VikiEntry): void => {
    void loadVikiBody(entry.uri).then(result => {
      if (result.ok) setDrawer({ title: entry.eventName ?? entry.name, body: result.body })
      else setNote(`读正文失败：${result.reason}`)
    })
  }
  const retry = createElement('button', {
    onClick: reload,
    style: {
      marginTop: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
      border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
    },
  }, '重试')
  const root = (...children: (string | ReturnType<typeof createElement> | null)[]): ReturnType<typeof createElement> =>
    createElement('div', { style: { flex: '1', minHeight: '0', overflowY: 'auto', padding: '2px' } }, ...children)
  if (view.status === 'loading') return root(muted('正在读 Viki 的记忆…'))
  if (view.status === 'unavailable') return root(muted('Viki 未连接——OpenViking server 不在线或未配置。这不会影响其他房间。'), retry)
  if (view.status === 'error') return root(muted(`读 Viki 失败：${view.reason ?? '未知原因'}`), retry)
  const list = view.list
  if (list === undefined) return root(muted('Viki 还没有返回数据。'), retry)
  const rows = list.entries.length === 0
    ? muted('Viki 里还没有记忆。对话抽取后会出现在这里。')
    : createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
      ...list.entries.map(entry => createElement('div', {
        key: entry.uri,
        style: {
          padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l3)',
          background: 'var(--dsw-alias-bg-layer-2)',
        },
      },
      createElement('div', { style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)' } }, entryLine(entry)),
      createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } },
        createElement('span', { style: { flex: '1' } }, entry.source === 'peer' ? `来自 ${entry.peer ?? 'peer'}` : 'user 记忆'),
        createElement('button', {
          onClick: () => { open(entry) },
          style: {
            padding: '2px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '5px',
            border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
          },
        }, '读全文')))))
  const counts = `共 ${String(list.counts.total)} 条（user ${String(list.counts.user)} · peers ${String(list.counts.peers)} · events ${String(list.counts.events)}）`
  return root(
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
      createElement('span', { style: { flex: '1', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, counts),
      createElement('button', {
        onClick: reload,
        style: {
          padding: '3px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '5px',
          border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
        },
      }, '重读')),
    rows,
    note === undefined ? null : muted(note),
    drawer === undefined ? null : createElement(ContentDrawer, { title: drawer.title, body: drawer.body, onClose: () => { setDrawer(undefined) } }))
}
