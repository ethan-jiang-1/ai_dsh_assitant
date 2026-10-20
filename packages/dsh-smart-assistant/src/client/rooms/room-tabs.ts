/**
 * The rooms as right-sidebar tabs: the two-stage registration's tab definitions (ids, kinds,
 * titles, guide copy, glyphs) and body side — the registration loop is wired in the entry's
 * apply. The session desk that used to render here is retired — the ledger's global desk is the
 * one 桌面 (2026-10-11).
 *
 * Each body is bound to the session whose sidebar holds it (the session-standard `sessionId`
 * prop), renders its OWN slice — never the shared walk view — and carries the loading, error
 * and empty states once for every room.
 *
 * @module dsh-smart-assistant/client/room-tabs
 */

import { deskSlice, getDeskStore, useDesk } from './room-data-core'
import { askStart } from './room-data-actions'
import { loadDeskFor } from './room-data-io'
import { muted } from '../chrome/dom-utils'
import { createElement, reactSurface } from '../chrome/runtime'
import { MARK_TEAL } from '../chrome/theme'
import { KnowledgeIcon, KnowledgePanel, MemoryIcon, MemoryPanel } from './panels'
import { VikiIcon, VikiPanel } from './viki-panel'
import { SkillsIcon, SkillsPanel } from './skills-panel'

/** Props a right-sidebar tab body receives (structural mirror of the session-scoped seat). */
export interface TabBodyProps {
  /** The Session whose sidebar holds this tab — session-scope slots get it as a standard prop. */
  sessionId?: string
  /** The tab record; a kind-opened tab's opener may also have bound a session in its params. */
  useTabInfo?: () => { tab?: { navigation?: { params?: { sessionId?: string } } } }
}

/**
 * The room's tab-strip title: the room's own glyph before its title text (user steer,
 * 2026-09-28 — each tab should carry its own icon). Shapes after the vendor's guide title:
 * reads the live tab title through the seat's `useTabInfo` prop, falls back to the room's
 * constant when the hook is absent (tests, or a seat that passes no hook).
 * @param Icon - the room's glyph component.
 * @param fallbackTitle - the room's constant title.
 * @returns the title component for that room's tab.
 */
export function roomTabTitle(Icon: (props: { size: number }) => unknown, fallbackTitle: string) {
  return function RoomTabTitle(props: { useTabInfo?: () => { tab?: { title?: string } } }): ReturnType<typeof createElement> {
    const title = props.useTabInfo?.()?.tab?.title ?? fallbackTitle
    return createElement('span', {
      style: { display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: '0' },
    },
    createElement(Icon as unknown as import('react').FunctionComponent<{ size: number }>, { size: 14 }),
    title)
  }
}

/**
 * One room rendered as a right-sidebar tab, bound to the session the tab lives in. The store is
 * shared with the main pages, so when its data came from another session's workspace the tab
 * withholds it and reloads its own — presenting another session's desk as yours would be worse
 * than a one-line wait.
 */
export function tabBody(props: TabBodyProps, Panel: (props?: { sessionId?: string }) => unknown): ReturnType<typeof createElement> {
  const { useEffect } = reactSurface()
  const sessionId = props.sessionId ?? props.useTabInfo?.()?.tab?.navigation?.params?.sessionId
  // R11: this tab renders its OWN session's slice, never the shared walk view.
  const store = useDesk(sessionId)
  const slice = deskSlice(sessionId)
  const unloaded = sessionId === undefined
    || (slice.data === undefined && slice.readError === undefined && !getDeskStore().misses.has(sessionId))
  useEffect(() => {
    if (sessionId === undefined) return
    // Register the bound session — the follow-the-conversation reload refreshes each of these;
    // the old single global `sendSession` slot made the last-mounted tab steal every send.
    getDeskStore().boundSessions.add(sessionId)
    if (deskSlice(sessionId).data === undefined && deskSlice(sessionId).readError === undefined && !getDeskStore().misses.has(sessionId)) {
      loadDeskFor(sessionId)
    }
    return () => { getDeskStore().boundSessions.delete(sessionId) }
    // `unloaded` re-fires the load when the walk re-homes the primary away from this session and
    // its slice empties — without it a tab could sit on "reading…" forever.
  }, [sessionId, unloaded])
  if (sessionId === undefined) return roomScroller(muted('这个 tab 没有落在任何会话里，读不到它的工作区'))
  const retryButton = (label: string): ReturnType<typeof createElement> => createElement('button', {
    onClick: () => { loadDeskFor(sessionId) },
    style: {
      marginTop: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
      border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
    },
  }, label)
  // A5: a corrupt file is an error with a way out, not an eternal "reading…".
  if (store.readError !== undefined) return roomScroller(
    muted(`读房间数据失败：${store.readError}。`), retryButton('重读一次'))
  // A6 inverted by the real-user walk (2026-10-06): with no data file yet the refresh button
  // produced an honest zero-report loop with no meaning — the one-click refresh this branch
  // once prided itself on was the trap. The next step is the first conversation; the copy says
  // what these rooms grow into once there is data, and the button starts that conversation
  // instead of refreshing nothing. (2026-10-01: the raw room-data copy path stays off the
  // principal's surface.)
  if (getDeskStore().misses.has(sessionId)) return roomScroller(
    muted('房间数据还空着——先在对话里说一句话（说什么都行，它会先问你最近要拍板、还要跟进的一件事），这里才开始长：它记住的事、你确认过的知识。'),
    createElement('button', {
      onClick: () => { askStart(sessionId) },
      style: {
        marginTop: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
        border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
      },
    }, '开始第一件事'))
  if (slice.data === undefined) return roomScroller(muted('正在读这个会话的房间数据…'))
  // The panel reads and acts on this session's slice: the session rides in as a plain prop.
  return roomScroller(createElement(Panel as unknown as import('react').FunctionComponent<{ sessionId?: string }>, { sessionId }))
}

/**
 * The room tab's scroll container. The vendor's pane body is a flex column with
 * `overflow: hidden` and no scroll of its own — the seat's content brings scrolling.
 * Without this wrapper the long desk was clipped at the fold with no way down
 * (user on the real machine, right-sidebar era, 2026-09-28).
 * @param children - the room content, or an error/empty state.
 * @returns the scrollable wrapper element.
 */
export function roomScroller(...children: (string | ReturnType<typeof createElement>)[]): ReturnType<typeof createElement> {
  return createElement('div', {
    style: { flex: '1', minHeight: '0', minWidth: '0', overflowY: 'auto', overflowX: 'hidden' },
  }, ...children)
}

export function KnowledgeTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
  return tabBody(props, KnowledgePanel)
}
export function MemoryTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
  return tabBody(props, MemoryPanel)
}
export function SkillsTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
  return tabBody(props, SkillsPanel)
}
export function VikiTabBody(_props: TabBodyProps): ReturnType<typeof createElement> {
  return roomScroller(createElement(VikiPanel as unknown as import('react').FunctionComponent<Record<string, never>>, {}))
}

/**
 * The rooms as right-sidebar tab definitions: id, kind, title, guide copy and glyph for the
 * two-stage registration (the registration loop is wired in the entry's apply).
 */
export const roomTabs = [
  {
    id: 'dsh-smart-assistant-knowledge', kind: 'knowledgeRoom', title: '知识室', body: KnowledgeTabBody,
    description: '它凭什么这样判断：知识页、出处与待你审批的草稿',
    icon: KnowledgeIcon, order: 11,
  },
  {
    id: 'dsh-smart-assistant-memory', kind: 'memoryRoom', title: '记忆室', body: MemoryTabBody,
    description: '它把你理解成什么：偏好、决定与事实，每条可纠错',
    icon: MemoryIcon, order: 12,
  },
  {
    id: 'dsh-smart-assistant-viki', kind: 'vikiRoom', title: 'Viki', body: VikiTabBody,
    description: 'Viki 记忆：对话抽取了什么，逐条可读',
    icon: VikiIcon, order: 13,
  },
  {
    id: 'dsh-smart-assistant-skills', kind: 'skillsRoom', title: '技能', body: SkillsTabBody,
    description: '它学会的手艺：逐件、用量、出处、可退役',
    icon: SkillsIcon, order: 14,
  },
] as const
