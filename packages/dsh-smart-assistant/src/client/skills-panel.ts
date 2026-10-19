/**
 * The Skills tab (C1): every learned skill the room actually enumerates — name, usage count,
 * last use, provenance (`metadata.source`), a read-only SKILL.md drawer, and one-click retire
 * through the A2 route (archive, not delete). No cost column in v1: the only honest always-on
 * bytes are name+description, and presenting full-SKILL.md bytes as resident cost would mislead.
 *
 * @module dsh-smart-assistant/client/skills-panel
 */
import { useDesk } from './room-data-core'
import { loadSkillBody } from './room-data-io'
import { retireSkill } from './room-data-actions'
import { ContentDrawer } from './content-drawer'
import { muted } from './dom-utils'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'

const WARN = 'var(--dsha-warn)'

function button(label: string, onClick: () => void, tone: 'normal' | 'warn' = 'normal'): ReturnType<typeof createElement> {
  return createElement('button', {
    onClick,
    style: {
      padding: '2px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '5px',
      border: `1px solid ${tone === 'warn' ? WARN : MARK_TEAL}`,
      background: 'var(--dsw-alias-bg-base)', color: tone === 'warn' ? WARN : MARK_TEAL,
    },
  }, label)
}

function daysSince(iso: string | undefined): string {
  if (iso === undefined) return '从未'
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return '未知'
  const days = Math.max(0, Math.floor((Date.now() - at) / 86_400_000))
  return days === 0 ? '今天' : `${String(days)} 天前`
}

/** The tab glyph. */
export function SkillsIcon(props: { size?: number }): ReturnType<typeof createElement> {
  const size = props.size ?? 16
  return createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    createElement('path', { d: 'M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.2l5.4-.8L12 3.5z', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' }))
}

/** Render the Skills tab. */
export function SkillsPanel(props?: { sessionId?: string }): ReturnType<typeof createElement> {
  const { useState } = reactSurface()
  const store = useDesk(props?.sessionId)
  const [drawer, setDrawer] = useState<{ title: string, body: string } | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<string | undefined>(undefined)
  const skills = (store.data?.skills ?? []).filter(skill => typeof skill.name === 'string' && skill.name.length > 0)
  const root = (...children: (string | ReturnType<typeof createElement> | null)[]): ReturnType<typeof createElement> =>
    createElement('div', { style: { flex: '1', minHeight: '0', overflowY: 'auto', padding: '2px' } }, ...children)
  if (store.readError !== undefined) return root(muted(`读技能失败：${store.readError}`))
  if (store.data === undefined) return root(muted('正在读这个会话的技能…'))
  if (skills.length === 0) return root(muted('还没有学到的技能。助手在对话里学到的procedure会出现在这里。'))
  const read = (name: string): void => {
    void loadSkillBody(name).then(result => {
      if (result.ok) setDrawer({ title: name, body: result.body })
      else setNote(`读正文失败：${result.reason}`)
    })
  }
  const confirmRetire = (name: string): void => {
    setPending(undefined)
    retireSkill(name, props?.sessionId)
    setNote(`已退役「${name}」（archive 里可找回）`)
  }
  return root(
    createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', marginBottom: '8px' } },
      `学来的 ${String(skills.length)} 件（常驻成本只算名字+描述；正文按需加载）`),
    createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
      ...skills.map(skill => {
        const name = skill.name ?? ''
        return createElement('div', {
          key: name,
          style: { padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-layer-2)' },
        },
        createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, name),
        createElement('div', { style: { fontSize: '11px', lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary)' } },
          `${skill.description ?? '（没有描述）'} · 用过 ${String(skill.count ?? 0)} 次 · 最近 ${daysSince(skill.lastUsedAt)}`),
        createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, `出处：${skill.source ?? '未知'}`),
        createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '4px' } },
          button('读正文', () => { read(name) }),
          button('退役', () => { setPending(name) }, 'warn')))
      })),
    pending === undefined ? null : createElement('div', {
      style: { marginTop: '8px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${WARN}`, background: 'var(--dsw-alias-bg-layer-2)' },
    },
    createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-primary)' } }, `退役「${pending}」？移出模型目录、进 skills/archive/，可恢复。`),
    createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
      button('确认退役', () => { confirmRetire(pending) }, 'warn'),
      button('取消', () => { setPending(undefined) }))),
    note === undefined ? null : muted(note),
    drawer === undefined ? null : createElement(ContentDrawer, { title: drawer.title, body: drawer.body, onClose: () => { setDrawer(undefined) } }))
}
