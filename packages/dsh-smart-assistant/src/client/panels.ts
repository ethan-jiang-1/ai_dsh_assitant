/**
 * The two room panels: the knowledge room (review queues) and the memory room (the digital
 * twin's correction surface). They render inside the right-sidebar tab bodies (see room-tabs);
 * the session scoping rides in as a plain `sessionId` prop. The session desk panel that used
 * to live here is retired — the ledger's global desk is the one 桌面 (2026-10-11).
 *
 * @module dsh-smart-assistant/client/panels
 */

import type { DeskData } from './room-data-core'
import { patchDesk, useDesk } from './room-data-core'
import { shortTime } from './format'
import {
  approveKnowledgePage, askApproveProposal, askRejectProposal, correctMemory, deprecateKnowledgePage,
  flagKnowledgePage,
} from './room-data-actions'
import { cell, CorrectableRow, muted, panelAlerts, refreshRow, sectionTitle } from './dom-utils'
import { loadKnowledgeBody } from './room-data-io'
import { ContentDrawer } from './content-drawer'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'

/** Book glyph for the knowledge panel entry. */
export function KnowledgeIcon({ size }: { size: number }): unknown {
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  },
  createElement('path', { d: 'M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4Z' }),
  createElement('path', { d: 'M20 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20Z' }),
  )
}

/** Lightbulb glyph for the memory panel entry. */
export function MemoryIcon({ size }: { size: number }): unknown {
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  },
  createElement('path', { d: 'M9 18h6' }),
  createElement('path', { d: 'M10 22h4' }),
  createElement('path', { d: 'M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z' }),
  )
}

/** Panel 2 — the knowledge room: what the assistant knows, and what is waiting for review. */
export function KnowledgePanel(props?: { sessionId?: string }): unknown {
  const session = props?.sessionId
  const store = useDesk(session)
  const { useEffect, useRef, useState } = reactSurface()
  const [drawer, setDrawer] = useState<{ title: string, body: string } | undefined>(undefined)
  const draftsAnchor = useRef<{ current?: { scrollIntoView?: (options?: unknown) => void } | null } | null>(null)
  useEffect(() => {
    if (store.focusKnowledge !== 'drafts') return
    try {
      const node = draftsAnchor.current as { scrollIntoView?: (options?: unknown) => void } | null | undefined
      node?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    } catch {
      // No DOM (tests) or scroll refused: the highlight still marks the block.
    }
    const timer = setTimeout(() => { patchDesk({ focusKnowledge: undefined }) }, 4000)
    return () => { clearTimeout(timer) }
  }, [store.focusKnowledge])
  const pages = store.data?.knowledge ?? []
  const drafts = pages.filter(page => page.status === 'draft')
  const stable = pages.filter(page => page.status === 'stable')
  // Deprecated pages are their own group: they stay in place so links resolve, and they are not
  // "confirmed" — lumping them in with stable pages would overstate what the assistant knows.
  const deprecated = pages.filter(page => page.status === 'deprecated')
  // The list carries excerpts; the full body is one authenticated route read. Failures surface as
  // a note instead of an empty drawer (the old 200-char-excerpt-only surface).
  const openBody = (page: typeof pages[number]): void => {
    void loadKnowledgeBody(String(page.id)).then(outcome => {
      if (outcome.ok) setDrawer({ title: outcome.page.title, body: outcome.page.body })
      else patchDesk({ note: outcome.reason })
    })
  }
  const row = (page: typeof pages[number], mark: string): ReturnType<typeof createElement> =>
    createElement(CorrectableRow, {
      key: String(page.id),
      rowId: String(page.id ?? page.title),
      primary: createElement('span', null, mark, String(page.title ?? page.id ?? '')),
      // The excerpt rides only on draft rows: that is where the approve decision happens, and
      // the excerpt is what turns a blind approval into an informed one (CEO friction #2).
      meta: [page.type === undefined ? '' : String(page.type), shortTime(page.updated)].filter(part => part !== '').join(' · '),
      excerpt: page.status === 'draft' ? page.excerpt : undefined,
      actionLabel: '有问题',
      placeholder: '哪里不对？',
      deskSession: session,
      source: (page.sources ?? []).join(' · '),
      onSubmit: (text: string) => { flagKnowledgePage(String(page.title ?? page.id ?? ''), text, String(page.id ?? page.title), session) },
      actions: [
        { label: '读全文', run: () => { openBody(page) } },
        ...(page.status === 'draft'
          ? [{ label: '批准', run: () => { approveKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title), session) } }]
          : page.status === 'stable'
            ? [{ label: '过时了', run: () => { deprecateKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title), session) }, destructive: true }]
            : []),
      ],
    })
  return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
    createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '知识室'),
    createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '你凭什么这样判断？——依据、来源、待确认的草稿'),
    refreshRow(store, session),
    pages.length === 0
      ? muted('（还没有知识页，或房间数据尚未读到）')
      : createElement('div', null,
          sectionTitle(`待你审批（${drafts.length}）`),
          drafts.length === 0
            ? muted('（没有草稿在等）')
            : createElement('div', {
                ref: store.focusKnowledge === 'drafts' ? draftsAnchor : undefined,
                style: store.focusKnowledge === 'drafts'
                  ? { background: 'var(--dsha-warn-tint)', borderRadius: '6px', padding: '6px 8px', margin: '0 -8px' }
                  : undefined,
              },
              store.focusKnowledge === 'drafts'
                // Surface-neutral on purpose: the pointer now has two senders (the desk's
                // draft line and the composer's approval banner), so the text must not
                // claim the principal came from the desk.
                ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsha-warn)', marginBottom: '4px' } }, '↑ 你刚点过来的那批')
                : null,
              createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsha-warn)' } },
                ...drafts.map(page => row(page, '⚠ ')))),
          // Inline skill proposals (B2, 2026-10-06): the review inbox rides the same panel as
          // the knowledge drafts — one-click approve/reject in place, no separate chore. The
          // proposals come from the desk file's `knowledge` section (drafts the assistant
          // proposes as skills, not pages); each row carries CorrectableRow for the reject
          // reason and one-click approve, same shape as the knowledge draft rows above.
          (store.data?.knowledge ?? []).some(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed')
            ? createElement('div', null,
                sectionTitle(`技能提案（${(store.data?.knowledge ?? []).filter(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed').length}）`),
                ...(store.data?.knowledge ?? [])
                  .filter(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed')
                  .map(item => createElement(CorrectableRow, {
                    key: String(item.id ?? item.title),
                    rowId: `proposal-${String(item.id ?? item.title)}`,
                    primary: createElement('span', null,
                      createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.title ?? item.id ?? '')),
                      (item as { description?: string }).description !== undefined
                        ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, String((item as { description?: string }).description))
                        : null),
                    actionLabel: '批准',
                    placeholder: '不批准的理由（可选，会记进提案文件）',
                    deskSession: session,
                    onSubmit: (text: string) => {
                      if (text.trim() === '') {
                        askApproveProposal(String(item.title ?? item.id ?? ''), session)
                      } else {
                        askRejectProposal(String(item.title ?? item.id ?? ''), text, session)
                      }
                    },
                    actions: [{ label: '批准', run: () => { askApproveProposal(String(item.title ?? item.id ?? ''), session) } }],
                  })))
            : null,
          sectionTitle(`已确认（${stable.length}）`),
          stable.length === 0
            ? muted('（还没有已确认的知识页）')
            : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)' } },
                ...stable.map(page => row(page, '✓ '))),
          deprecated.length === 0
            ? null
            : createElement('div', null,
                sectionTitle(`已退役（${deprecated.length}）`),
                createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)' } },
                  ...deprecated.map(page => row(page, '— '))))),
    sectionTitle('技能'),
    (store.data?.skills ?? []).length === 0
      ? muted('（还没有技能）')
      // A count, not a list: the principal cannot judge `repo-to-knowledge`, and the descriptions
      // are model-facing English (repository rule), so a 71-line English list is noise on their
      // surface — content eligibility before layout (2026-09-26 reviews).
      : muted(`学来的 ${String((store.data?.skills ?? []).filter(skill => skill.kind === 'learned').length)} 件——C1 会给出逐件列表；哪一件不想要了，在对话里说一声即可下掉`),
    drawer === undefined
      ? null
      : createElement(ContentDrawer, { title: drawer.title, body: drawer.body, onClose: () => { setDrawer(undefined) } }),
    ...panelAlerts(store))
}

/**
 * The memory room, grouped by what the record is about — the split a digital twin lives on:
 * how the principal works (preferences and their decisions) versus the world it learned (facts).
 * One flat list hides that; a kind label per row is not enough to scan by.
 * @param memories - Every active record the desk file carries.
 * @returns Section headings and rows, as an element array to spread.
 */
export function memoryGroups(memories: NonNullable<DeskData['memories']>, session?: string): ReturnType<typeof createElement>[] {
  const groups: { key: string, label: string }[] = [
    { key: 'preference', label: '你的偏好' },
    { key: 'decision', label: '你的决定' },
    { key: 'fact', label: '事实' },
  ]
  const known = new Set(groups.map(group => group.key))
  const rest = memories.filter(memory => !known.has(String(memory.kind ?? '')))
  const out: ReturnType<typeof createElement>[] = []
  for (const group of [...groups, { key: '__rest', label: '其它' }]) {
    const items = group.key === '__rest'
      ? rest
      : memories.filter(memory => String(memory.kind ?? '') === group.key)
    if (items.length === 0) continue
    out.push(sectionTitle(`${group.label}（${items.length}）`))
    out.push(createElement('ul', { key: group.key, style: { margin: 0, padding: 0 } },
      ...items.map(memory => createElement(CorrectableRow, {
        key: String(memory.id),
        rowId: String(memory.id),
        primary: String(memory.text ?? ''),
        meta: shortTime(memory.updated),
        actionLabel: '这条记错了',
        placeholder: '正确的是什么？',
        deskSession: session,
        source: memory.source,
        onSubmit: (text: string) => { correctMemory(String(memory.text ?? ''), text, String(memory.id), session) },
      }))))
  }
  return out
}

/** Panel 3 — the memory room: what the assistant has written down about the principal. */
export function MemoryPanel(props?: { sessionId?: string }): unknown {
  const session = props?.sessionId
  const store = useDesk(session)
  const memories = store.data?.memories ?? []
  return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
    createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '记忆室'),
    createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '你把我理解成什么？——偏好、决定、事实，每条可纠错'),
    refreshRow(store, session),
    memories.length === 0
      ? muted('（还没有记忆，或房间数据尚未读到）')
      : createElement('div', null, ...memoryGroups(memories, session)),
    sectionTitle('规模'),
    createElement('div', null,
      cell('记忆', store.data?.counts?.memories === undefined ? '—' : String(store.data.counts.memories)),
      // `counts.threads` went with the retired desk sections (the room-data file carries
      // memories / knowledge / skills now); the skill count is the memory room's other half.
      cell('技能', store.data?.counts?.skills === undefined ? '—' : String(store.data.counts.skills))),
    ...panelAlerts(store))
}
