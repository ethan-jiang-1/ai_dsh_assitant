/**
 * The desk as a MAIN-AREA PANEL (Goal 1.5, 2026-10-06): a standalone page occupying the
 * entire main area — not a tab inside the chat shell. The principal sees their dashboard:
 * decisions to make, actions being tracked, missing data, pending approvals — all at a
 * glance, no chat required. Conversation becomes an input channel (the 「有问题？」 button,
 * routed back through ctx.layout by the entry's inject face).
 *
 * @module dsh-smart-assistant/client/dashboard
 */

import type { DeskData } from './desk-core'
import { useDesk } from './desk-core'
import { answerDecision, reloadDesk } from './desk-io'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'

/** Sidebar icon for the desk main panel (Goal 1.5): a simple calendar/checklist glyph. */
export function DashboardPanelIcon(): ReturnType<typeof createElement> {
  return createElement('svg', {
    width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none',
    style: { display: 'block' },
  },
  createElement('rect', { x: 2, y: 3, width: 16, height: 14, rx: 2, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }),
  createElement('line', { x1: 2, y1: 7, x2: 18, y2: 7, stroke: 'currentColor', strokeWidth: 1.5 }),
  createElement('line', { x1: 5, y1: 10, x2: 12, y2: 10, stroke: 'currentColor', strokeWidth: 1.2 }),
  createElement('line', { x1: 5, y1: 13, x2: 10, y2: 13, stroke: 'currentColor', strokeWidth: 1.2 }),
  )
}

/**
 * The desk as a MAIN-AREA PANEL (Goal 1.5): a standalone page occupying the entire main area —
 * not a tab inside the chat shell. The principal sees their dashboard: decisions to make,
 * actions being tracked, missing data, pending approvals — all at a glance, no chat required.
 * The "有问题？" button is the entry point to conversation (the input channel).
 */
export function DashboardMainPanel(props: { onAsk?: () => void }): ReturnType<typeof createElement> {
  const { useEffect, useState } = reactSurface()
  const store = useDesk()
  useEffect(() => { reloadDesk(undefined) }, [])
  // The decision the principal just clicked, keyed by decision row (261007 Slice 2): the card
  // freezes at 「已拍」 the instant the click lands — the desk refresh (sendPrompt's poller)
  // then retires the row, and with it the card. Component-private state: no other surface
  // reads it, and it resets with the panel.
  const [answered, setAnswered] = useState<Record<string, string>>({})
  const walk = store
  const data: DeskData | undefined = walk.data
  const { createElement: ce } = { createElement }
  const sectionTitle = (text: string): ReturnType<typeof createElement> =>
    ce('h2', { style: { margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, text)
  const muted = (text: string): ReturnType<typeof createElement> =>
    ce('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, text)
  const card = (...children: (string | ReturnType<typeof createElement>)[]): ReturnType<typeof createElement> =>
    ce('div', {
      style: {
        padding: '16px 20px', marginBottom: '12px',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '10px',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
    }, ...children)

  // Empty desk
  if (data === undefined) {
    return ce('div', { style: { padding: '32px', maxWidth: '680px', margin: '0 auto' } },
      ce('h1', { style: { margin: '0 0 8px', fontSize: '22px' } }, '你的桌面'),
      muted('桌面还是空的——跟助手说一件事，这里就会开始长出你的经营状态。'),
      ce('button', {
        onClick: props.onAsk,
        style: { marginTop: '12px', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, background: MARK_TEAL, color: 'var(--dsw-alias-text-primary, #fff)' },
      }, '有问题？跟助手说'),
    )
  }

  const decisions = (data.decisions ?? []).filter(item => item.kind === 'business' || ((item.options ?? []).length > 0))
  const actions = (data.actions ?? []).filter(item => item.status !== 'done')
  const gaps = data.gaps ?? []
  const drafts = (data.knowledge ?? []).filter(item => item.status === 'draft')

  return ce('div', { style: { padding: '24px 32px', maxWidth: '840px', margin: '0 auto', overflowY: 'auto' } },
    // Header
    ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
      ce('h1', { style: { margin: 0, fontSize: '22px' } }, '你的桌面'),
      ce('button', {
        onClick: props.onAsk,
        style: { padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: MARK_TEAL, color: 'var(--dsw-alias-text-primary, #fff)' },
      }, '有问题？'),
    ),
    // Rhythm line
    muted('这里是你的起点：来了先看「要你拍的」，拍完就走。每周一早它带对账来，一刻钟批完一周。'),

    // Decisions
    ce('div', { style: { marginTop: '20px' } },
      sectionTitle(`要你拍的（${decisions.length}）`),
      decisions.length === 0
        ? muted('没有等你拍板的事。')
        : ce('div', null, ...decisions.slice(0, 3).map(item => {
            const rowId = String(item.id ?? item.question ?? '')
            const chosen = answered[rowId]
            return card(
              ce('div', { style: { fontSize: '15px', fontWeight: 600, marginBottom: '6px' }, key: 'q' }, String(item.question ?? '')),
              ce('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', marginBottom: '10px' }, key: 'ctx' }, String(item.context ?? '')),
              chosen !== undefined
                ? ce('div', {
                    key: 'answered',
                    style: { fontSize: '13px', fontWeight: 600, color: MARK_TEAL, padding: '6px 0' },
                  }, `已拍：${chosen}——记账中，拍完这条会从「要你拍的」退场`)
                : ce('div', { key: 'opts' }, (item.options ?? []).map((opt, j) =>
                    ce('button', {
                      key: 'opt-' + j,
                      onClick: () => {
                        // (261007 Slice 2) The option click IS the decision — over the SAME
                        // principal-voice lane the desk panels use (answerDecision), never
                        // English machine prose in the principal's history. The card freezes
                        // at 「已拍」 immediately; the desk refresh retires the row.
                        setAnswered(prev => ({ ...prev, [rowId]: String(opt.label ?? '') }))
                        answerDecision(String(item.question ?? ''), String(opt.label ?? ''), rowId, undefined)
                      },
                      style: {
                        marginRight: '8px', marginBottom: '6px', padding: '6px 14px',
                        borderRadius: '6px', border: '1px solid var(--dsw-alias-border-l3)',
                        background: 'var(--dsw-alias-bg-base)', cursor: 'pointer',
                        fontSize: '13px', color: MARK_TEAL,
                      },
                    }, String(opt.label ?? '') + (opt.irreversible ? ' ⚠' : '')),
                  )),
            )
          })),
    ),

    // Actions
    ce('div', { style: { marginTop: '16px' } },
      sectionTitle(`在跟的（${actions.length}）`),
      actions.length === 0
        ? muted('没有在跟的事。')
        : ce('div', null, ...actions.map(item =>
            ce('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
              ce('span', { style: { fontSize: '14px' } }, String(item.what ?? '')),
              ce('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, `${String(item.due ?? '')} · ${String(item.status ?? '')}`),
            ))),
    ),

    // Gaps
    ce('div', { style: { marginTop: '16px' } },
      sectionTitle(`缺的数（${gaps.length}）`),
      gaps.length === 0
        ? muted('没有卡住的事。')
        : ce('div', null, ...gaps.map(g =>
            ce('div', { style: { padding: '6px 0' } },
              ce('span', { style: { fontSize: '14px', fontWeight: 500 } }, String(g.what ?? '')),
              ce('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', marginLeft: '8px' } }, String(g.why ?? '')),
            ))),
    ),

    // Approvals
    ce('div', { style: { marginTop: '16px' } },
      sectionTitle(`待你审批（${drafts.length}）`),
      drafts.length === 0
        ? muted('没有待审的知识草稿。')
        : muted(`${drafts.length} 页知识草稿在等你审批——批准后才会成为它的判断依据。`),
    ),
  )
}
