/**
 * The proactive face and the "让它替你盯" suggestion strip, as reusable components.
 *
 * Why they moved out of `projection-panel` (2026-10-25): the 2026-10-24 three-surface reframe
 * decided these actions belong on the **home**, not on the deep board ("完整看板是深看，不是第二个
 * intake；这些动作归 home"). The board started hiding them behind `deep ? null`, but the home was
 * never given them — the face the 261018 cards delivered became unreachable. One renderer, three
 * surfaces: the board mounts them only when it is the legacy non-deep dashboard, and the one-page
 * home mounts them between the page and the input.
 *
 * Both derive from read-only sources (zero model calls); an all-empty state renders nothing at all.
 *
 * @module dsh-smart-assistant/client/projection/proactive-strip
 */
import { createElement as ce } from '../chrome/runtime'
import { humanTime } from '../chrome/format'
import { deriveProactiveFace, PROACTIVE_SUGGESTIONS, type ProactiveUiState } from '../proactive/proactive-face'
import type { ProactiveCatalogState } from '../proactive/proactive-face-source'
import type { OperatingProjection } from './operating-projection'
import type { ProjectionViewBoundActions } from './projection-view'
import type { DeskLanes } from './desk-surface'

/** The strip's CSS; the host surface concatenates it after its own styles. */
export const PROACTIVE_STYLES = [
  '.dsha-proactive{display:flex;flex-direction:column;gap:4px;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;padding:8px 12px;background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-proactive-row{display:flex;align-items:baseline;gap:8px;font-size:13px;color:var(--dsw-alias-label-secondary);}',
  '.dsha-proactive-row > span{min-width:0;overflow-wrap:anywhere;}',
  '.dsha-proactive-due{border-left:2px solid var(--dsha-warn);padding-left:8px;}',
  '.dsha-proactive-row > .dsha-btn{margin-left:auto;flex:none;font-size:12px;padding:2px 8px;}',
  '.dsha-proactive-actions{display:flex;gap:4px;flex:none;margin-left:auto;}',
  '.dsha-proactive-actions > .dsha-btn{font-size:12px;padding:2px 8px;}',
  '.dsha-suggest{display:flex;flex-direction:column;gap:6px;border:1px dashed var(--dsw-alias-border-l3);border-radius:10px;padding:8px 12px;background:var(--dsw-alias-bg-base);}',
  '.dsha-suggest-title{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-suggest-head{display:flex;align-items:center;gap:8px;}',
  '.dsha-suggest-toggle{margin-left:auto;font-size:12px;padding:2px 8px;}',
  '.dsha-suggest-item{display:flex;align-items:baseline;gap:8px;}',
  '.dsha-suggest-body{display:flex;flex-direction:column;min-width:0;flex:1;gap:2px;}',
  '.dsha-suggest-name{color:var(--dsw-alias-label-primary);font-size:13px;}',
  '.dsha-suggest-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;}',
  '.dsha-suggest-actions{display:flex;gap:4px;flex:none;}',
  '.dsha-suggest-actions .dsha-btn{font-size:12px;padding:2px 8px;}',
  '.dsha-suggest-x{padding:2px 6px;}',
].join('')

/** Everything both strips read from the surface contract. */
export interface ProactiveStripProps {
  data?: OperatingProjection
  openQuestions: number
  pendingQuestionSessions: readonly string[]
  lanes: DeskLanes
  actions: ProjectionViewBoundActions
  capturePending: boolean
  /** Density: simple mode keeps the board but hides the proactive face and suggestions. */
  simpleMode?: boolean
  /** On the home these rows must switch the main surface to the board before selecting. */
  onOpenBoard?: () => void
  useCatalog?: <S>(select: (state: ProactiveCatalogState) => S) => S
  useProactiveUi?: <S>(select: (state: ProactiveUiState) => S) => S
}

/**
 *「它替你看过」: three honest rows from read-only sources (due-without-result, waiting-for-you,
 * next-look). `next-look-unavailable` only marks the attribute; it never renders a guess.
 * @param props - projection data, waiting counts and the lane actions.
 * @returns The rows, or null when there is nothing honest to say.
 */
export function ProactiveRows(props: ProactiveStripProps): ReturnType<typeof ce> | null {
  const catalogState: ProactiveCatalogState = props.useCatalog !== undefined
    ? props.useCatalog(value => value)
    : { status: 'unavailable' }
  const proactiveUi: ProactiveUiState = props.useProactiveUi !== undefined
    ? props.useProactiveUi(value => value)
    : { ignored: [], accepted: [] }
  const rows = deriveProactiveFace({
    ...(props.data !== undefined ? { projection: props.data } : {}),
    ...(catalogState.status === 'entries' ? { catalog: catalogState.entries } : {}),
    ...(proactiveUi.accepted.length > 0 ? { acceptedWatches: proactiveUi.accepted } : {}),
    ...(proactiveUi.pendingWatches !== undefined && proactiveUi.pendingWatches.length > 0 ? { pendingWatches: proactiveUi.pendingWatches } : {}),
    ...(props.openQuestions > 0 ? { openQuestions: props.openQuestions } : {}),
    now: new Date(),
  })
  const catalogNote = rows.some(row => row.kind === 'next-look-unavailable')
  const visible = rows.filter(row => row.kind !== 'next-look-unavailable')
  if (props.simpleMode === true || visible.length === 0) return null
  const lateNote = (lateByMs: number): string => {
    const hours = lateByMs / 3_600_000
    return hours >= 1 ? `${Math.round(hours)} 小时` : `${Math.max(1, Math.round(lateByMs / 60_000))} 分钟`
  }
  return ce('div', {
    className: 'dsha-proactive',
    'data-proactive-catalog': catalogNote ? 'unavailable' : 'ok',
    role: 'status',
  },
    ...visible.map(row => {
      if (row.kind === 'due-no-result') {
        const dueLabel = row.daysOverdue === 0 ? '今天到期' : `到期 ${row.daysOverdue} 天`
        return ce('div', { key: 'due', className: 'dsha-proactive-row dsha-proactive-due' },
          ce('span', {}, `${row.title} · ${dueLabel}，账上没有结果${row.extraCount !== undefined ? `（另有 ${row.extraCount} 件同样到期）` : ''}`),
          ce('button', { className: 'dsha-btn', type: 'button', onClick: () => { props.onOpenBoard?.(); props.actions.setMode('board'); props.actions.selectMatter(row.matterId) } }, '看这件事'))
      }
      if (row.kind === 'waiting-for-you') {
        const waiting: string[] = []
        if (row.pendingProposals > 0) waiting.push(`${row.pendingProposals} 条要确认`)
        if (row.unclaimed > 0) waiting.push(`${row.unclaimed} 条待认领`)
        if (row.openQuestions > 0) waiting.push(`${row.openQuestions} 句等你答`)
        // 261019 (BUG-019): "去处理" must actually take the principal to the waiting thing. It
        // used to set pane='list' only — a no-op on a board that already shows the list while
        // the unclaimed inbox sat below the fold. Land on the board with the first waiting item
        // selected (fragment first, then a pending proposal); the row still carries one action.
        const goWaiting = (): void => {
          // A blocked question is the most urgent thing in this row: the assistant cannot move
          // until the principal answers, so the single action goes there first.
          if (props.openQuestions > 0 && props.pendingQuestionSessions[0] !== undefined) {
            props.lanes.onOpenSession(props.pendingQuestionSessions[0])
            return
          }
          props.onOpenBoard?.()
          props.actions.setMode('board')
          const firstUnclaimed = props.data?.unclaimed[0]
          if (firstUnclaimed !== undefined) { props.actions.selectFragment(firstUnclaimed.id); return }
          const firstPending = props.data?.matters.find(matter => matter.proposals.some(proposal => proposal.status === 'pending'))
          if (firstPending !== undefined) props.actions.selectMatter(firstPending.id)
        }
        return ce('div', { key: 'waiting', className: 'dsha-proactive-row' },
          ce('span', {}, `它在等你：${waiting.join(' · ')}`),
          ce('button', { className: 'dsha-btn', type: 'button', onClick: goWaiting }, props.openQuestions > 0 ? '去答问题' : '去处理'))
      }
      if (row.kind === 'watch-mismatch') {
        // Q5: state the fact (no attribution) and offer the two honest ways out: retry the lane,
        // or forget this failed acceptance. Retrying without a forget made the row permanent
        // (261019) — a failed watch could only be re-failed, never acknowledged.
        return ce('div', { key: `mismatch-${row.title}`, className: 'dsha-proactive-row dsha-proactive-due' },
          ce('span', {}, `说了替你盯但没盯上：${row.title}`),
          ce('div', { className: 'dsha-proactive-actions' },
            props.lanes.onSuggestAction !== undefined
              ? ce('button', { className: 'dsha-btn', type: 'button', disabled: props.capturePending, onClick: () => { props.lanes.onSuggestAction?.('watch', `retry:${row.title}`) } }, '再试一次')
              : null,
            props.lanes.onWatchForget !== undefined
              ? ce('button', { className: 'dsha-btn', type: 'button', 'aria-label': `忽略：${row.title}`, onClick: () => { props.lanes.onWatchForget?.(row.title) } }, '忽略')
              : null))
      }
      return ce('div', { key: 'next', className: 'dsha-proactive-row' },
        ce('span', {}, row.overdueByMs !== undefined
          ? `它该在 ${humanTime(row.nextAt)} 看「${row.title}」，还没看到它动${row.lateByMs !== undefined ? `（上次迟了 ${lateNote(row.lateByMs)}）` : ''}${row.duplicates !== undefined ? ` — 发现 ${row.duplicates} 条重复盯守` : ''}`
          : `它下次替你看：${row.title} · ${humanTime(row.nextAt)}${row.lateByMs !== undefined ? `（上次迟了 ${lateNote(row.lateByMs)}）` : ''}${row.duplicates !== undefined ? ` — 发现 ${row.duplicates} 条重复盯守` : ''}`),
        row.duplicates !== undefined && props.lanes.onOpenTasks !== undefined
          ? ce('button', { className: 'dsha-btn', type: 'button', onClick: props.lanes.onOpenTasks }, '去任务页')
          : null)
    }))
}

/**
 *「让它替你盯」: three named suggestions in the adjudicated ②③① order, each with two actions
 * through the desk's own delivery lane and an × that seals that suggestion for good (local only).
 * @param props - proactive UI state and the suggestion lanes.
 * @returns The strip, or null when everything is dismissed.
 */
export function SuggestionStrip(props: ProactiveStripProps): ReturnType<typeof ce> | null {
  const proactiveUi: ProactiveUiState = props.useProactiveUi !== undefined
    ? props.useProactiveUi(value => value)
    : { ignored: [], accepted: [] }
  const open = PROACTIVE_SUGGESTIONS.filter(suggestion => !proactiveUi.ignored.includes(suggestion.id))
  if (props.simpleMode === true || open.length === 0) return null
  const collapsed = proactiveUi.collapsed === true
  return ce('div', { className: 'dsha-suggest', role: 'region', 'aria-label': '让它替你盯' },
    ce('div', { className: 'dsha-suggest-head' },
      ce('span', { className: 'dsha-suggest-title' }, `让它替你盯 · ${open.length} 条`),
      ce('button', {
        className: 'dsha-btn dsha-suggest-toggle', type: 'button', 'aria-expanded': String(!collapsed),
        onClick: () => props.lanes.onSuggestCollapse?.(!collapsed),
      }, collapsed ? '展开' : '收起')),
    ...(collapsed ? [] : open.map(suggestion => ce('div', { key: suggestion.id, className: 'dsha-suggest-item' },
      ce('div', { className: 'dsha-suggest-body' },
        ce('span', { className: 'dsha-suggest-name' }, suggestion.name),
        ce('span', { className: 'dsha-suggest-hint' }, suggestion.hint)),
      ce('div', { className: 'dsha-suggest-actions' },
        ce('button', { className: 'dsha-btn', type: 'button', disabled: props.capturePending, onClick: () => { props.lanes.onSuggestAction?.('trial', suggestion.id) } }, '先试跑一次'),
        ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', disabled: props.capturePending, onClick: () => { props.lanes.onSuggestAction?.('watch', suggestion.id) } }, '替我盯上'),
        ce('button', { className: 'dsha-btn dsha-suggest-x', type: 'button', title: '不再提这条', 'aria-label': `忽略：${suggestion.name}`, onClick: () => { props.lanes.onSuggestDismiss?.(suggestion.id) } }, '×'))))))
}
