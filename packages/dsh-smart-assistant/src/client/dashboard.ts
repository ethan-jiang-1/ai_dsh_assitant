/**
 * The desk's FALLBACK main-area panel: rendered only when the client store module is absent, so
 * the ledger projection (the desk's real data source, `projection-panel.ts`) cannot be read.
 * It therefore shows what the client CAN read — the room data file's knowledge-draft queue —
 * and says plainly that the projection is missing instead of dressing the room data up as desk
 * state. Conversation is the input channel (the 「有问题？」 button, routed back through
 * ctx.layout by the entry's inject face).
 *
 * The retired session-desk sections (decisions / actions / gaps) are gone from here with the
 * file contract: they live in the ledger now, and the ledger renders through the projection.
 *
 * @module dsh-smart-assistant/client/dashboard
 */

import type { DeskData } from './desk-core'
import { useDesk } from './desk-core'
import { reloadDesk } from './desk-io'
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
 * The desk's fallback page: the 「有问题？」 button is the entry point to conversation (the
 * input channel), and the knowledge drafts below are the room data this client can read.
 */
export function DashboardMainPanel(props: { onAsk?: () => void }): ReturnType<typeof createElement> {
  const { useEffect } = reactSurface()
  const store = useDesk()
  useEffect(() => { reloadDesk(undefined) }, [])
  const data: DeskData | undefined = store.data
  const { createElement: ce } = { createElement }
  const sectionTitle = (text: string): ReturnType<typeof createElement> =>
    ce('h2', { style: { margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, text)
  const muted = (text: string): ReturnType<typeof createElement> =>
    ce('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, text)

  // No projection and no room data: say what is actually missing.
  if (data === undefined) {
    return ce('div', { style: { padding: '32px', maxWidth: '680px', margin: '0 auto' } },
      ce('h1', { style: { margin: '0 0 8px', fontSize: '22px' } }, '你的桌面'),
      muted('这个环境读不到账本投影（桌面数据），本机也还没有房间数据——跟助手说一件事，它会记进账本。'),
      ce('button', {
        onClick: props.onAsk,
        style: { marginTop: '12px', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, background: MARK_TEAL, color: 'var(--dsw-alias-text-primary, #fff)' },
      }, '有问题？跟助手说'),
    )
  }

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
    muted('这个环境读不到账本投影——桌面全貌请在能读到投影的页面上看，或直接问助手。'),

    // Approvals: knowledge drafts are room data, readable here.
    ce('div', { style: { marginTop: '20px' } },
      sectionTitle(`待你审批（${drafts.length}）`),
      drafts.length === 0
        ? muted('没有待审的知识草稿。')
        : muted(`${drafts.length} 页知识草稿在等你审批——批准后才会成为它的判断依据。`),
    ),
  )
}
