/** The detail's plain-text meta line: responsible plus the four business times, in the list
 * card's meta shape — pills are reserved for status, not for every fact in the header. */
function metaLine(responsible: string, times: Parameters<typeof timeParts>[0], t: DeskTranslate) {
  const parts = (responsible.length > 0 ? [`${t('desk.times.responsible')} ${responsible}`] : []).concat(timeParts(times, t))
  return parts.length === 0 ? null : ce('p', { className: 'dsha-card-meta' }, parts.join(' · '))
}

function timeParts(times: { readonly promisedDeadline?: string; readonly forecastAt?: string; readonly nextCheckpoint?: string; readonly completedAt?: string }, t: DeskTranslate): string[] {
  const parts: string[] = []
  if (times.promisedDeadline !== undefined) parts.push(`${t('desk.times.promised')} ${humanTime(times.promisedDeadline)}`)
  if (times.forecastAt !== undefined) parts.push(`${t('desk.times.forecast')} ${humanTime(times.forecastAt)}`)
  if (times.nextCheckpoint !== undefined) parts.push(`${t('desk.times.checkpoint')} ${humanTime(times.nextCheckpoint)}`)
  if (times.completedAt !== undefined) parts.push(`${t('desk.times.completed')} ${humanTime(times.completedAt)}`)
  return parts
}

/**
 * The board and its detail pane: the filtered matter list, the unclaimed inbox, and the selected
 * matter/fragment biography. The presentation helpers live here because only this face uses
 * them; `ActivityFace` imports the two operation labels.
 *
 * @module dsh-smart-assistant/client/matter-board
 */
import { createElement as ce } from '../chrome/runtime'
import { humanTime } from '../chrome/format'
import { canProcess } from '../../domain/desk/desk-process'
import { deriveOverdueMatters, type OverdueMatterAttention } from '../proactive/proactive-face'
import type { DeskTranslate } from '../chrome/locales'
import type { DeskSurface } from './desk-surface'
import type { ProjectionView, ProjectionViewBoundActions } from './projection-view'
import type { OperatingMatter, OperatingReceipt } from './operating-projection'
import { RETURN_VIEW_KEY, STATUS_LABEL, type DeskData, type OperatingReceiptPage } from './panel-shared'

type MatterAttention = OverdueMatterAttention

type MatterTimelineItem =
  | { readonly id: string, readonly at: string | undefined, readonly kind: 'evidence', readonly sessionId: string, readonly eventId?: string, readonly quote?: string, readonly note: string }
  | { readonly id: string, readonly at: string, readonly kind: 'proposal', readonly proposal: DeskData['matters'][number]['proposals'][number] }
  | { readonly id: string, readonly at: string, readonly kind: 'receipt', readonly receipt: OperatingReceipt }

function attentionItems(data: Pick<DeskData, 'matters' | 'receipts'> | undefined, now: Date): readonly MatterAttention[] {
  if (data === undefined) return []
  return deriveOverdueMatters(data, now)
}

interface AttentionMatter {
  readonly matter: OperatingMatter
  readonly due?: MatterAttention
  readonly pendingProposals: number
}

function deriveAttentionMatters(data: Pick<DeskData, 'matters' | 'receipts'> | undefined, now: Date): readonly AttentionMatter[] {
  if (data === undefined) return []
  const due = new Map(attentionItems(data, now).map(item => [item.matterId, item]))
  return data.matters.flatMap(matter => {
    if (matter.status !== 'active') return []
    const pendingProposals = matter.proposals.filter(proposal => proposal.status === 'pending').length
    const overdue = due.get(matter.id)
    return overdue === undefined && pendingProposals === 0
      ? []
      : [{ matter, ...(overdue === undefined ? {} : { due: overdue }), pendingProposals }]
  }).sort((left, right) => {
    if (left.due === undefined) return right.due === undefined ? 0 : 1
    if (right.due === undefined) return -1
    return Date.parse(left.due.dueAt) - Date.parse(right.due.dueAt)
  })
}

function matterTimelineItems(matter: OperatingMatter, receipts: readonly OperatingReceipt[]): readonly MatterTimelineItem[] {
  const evidence: MatterTimelineItem[] = matter.evidence.map(item => ({
    id: `evidence:${item.id}`,
    at: item.receivedAt,
    kind: 'evidence',
    sessionId: item.sessionId,
    ...(item.eventId === undefined ? {} : { eventId: item.eventId }),
    ...(item.quote === undefined ? {} : { quote: item.quote }),
    note: item.note,
  }))
  const proposals: MatterTimelineItem[] = matter.proposals.map(proposal => ({
    id: `proposal:${proposal.id}`,
    at: proposal.proposedAt ?? '',
    kind: 'proposal',
    proposal,
  }))
  const operations: MatterTimelineItem[] = receipts
    .filter(receipt => receipt.matterId === matter.id)
    .map(receipt => ({ id: `receipt:${receipt.operationId}`, at: receipt.submittedAt, kind: 'receipt', receipt }))
  return [...evidence, ...proposals, ...operations].sort((left, right) => {
    const leftAt = left.at ?? ''
    const rightAt = right.at ?? ''
    if (leftAt === '') return rightAt === '' ? left.id.localeCompare(right.id) : 1
    if (rightAt === '') return -1
    return Date.parse(leftAt) - Date.parse(rightAt) || left.id.localeCompare(right.id)
  })
}
const FILTER_LABEL: Record<'all' | 'active' | 'settled', string> = { all: '全部', active: '在办', settled: '已了结' }
function glyph(children: ReturnType<typeof ce>[]): ReturnType<typeof ce> {
  return ce('svg', { className: 'dsha-glyph', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true }, ...children)
}
const GLYPHS: Record<string, () => ReturnType<typeof ce>[]> = {
  board: () => [ce('path', { d: 'M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z' })],
  activity: () => [ce('path', { d: 'M3 12a9 9 0 1 0 2.6-6.4' }), ce('path', { d: 'M3 4v4h4' }), ce('path', { d: 'M12 7v5l3 2' })],
  attention: () => [ce('path', { d: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l-1.42 1.42' }), ce('circle', { cx: 12, cy: 12, r: 4 })],
  all: () => [ce('path', { d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' })],
  active: () => [ce('circle', { cx: 12, cy: 12, r: 4, fill: 'currentColor' })],
  settled: () => [ce('circle', { cx: 12, cy: 12, r: 9 }), ce('path', { d: 'M8 12l3 3 5-6' })],
  wake: () => [ce('path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9' }), ce('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })],
}
export function glyphFor(name: string): ReturnType<typeof ce> {
  return glyph((GLYPHS[name] ?? (() => []))())
}
export function chip(kind: string, label: string) {
  return ce('span', { className: `dsha-chip dsha-chip-${kind}` }, label)
}

function statusChip(status: string) {
  return chip(status === 'active' ? 'active' : status === 'completed' ? 'completed' : 'abandoned', STATUS_LABEL[status] ?? status)
}

function proposalKindLabel(kind: string, t: DeskTranslate): string {
  switch (kind) {
    case 'reschedule': return t('desk.proposal.reschedule')
    case 'checkpoint': return t('desk.proposal.checkpoint')
    case 'complete': return t('desk.proposal.complete')
    case 'abandon': return t('desk.proposal.abandon')
    default: return kind
  }
}

export function operationStatusLabel(status: string, t: DeskTranslate): string {
  switch (status) {
    case 'retained': return ` · ${t('desk.operationStatus.retained')}`
    case 'conflict': return ` · ${t('desk.operationStatus.conflict')}`
    case 'rejected':
    case 'proposal-rejected': return ` · ${t('desk.operationStatus.rejected')}`
    case 'proposed': return ` · ${t('desk.operationStatus.proposed')}`
    default: return ''
  }
}

export function operationKindLabel(kind: string | undefined, t: DeskTranslate): string {
  switch (kind) {
    case 'create': return t('desk.operation.create')
    case 'update': return t('desk.operation.update')
    case 'note': return t('desk.operation.note')
    case 'claim': return t('desk.operation.claim')
    case 'discard': return t('desk.operation.discard')
    case 'complete': return t('desk.operation.complete')
    case 'reopen': return t('desk.operation.reopen')
    case 'propose': return t('desk.operation.propose')
    case 'confirm': return t('desk.operation.confirm')
    case 'reject': return t('desk.operation.reject')
    default: return t('desk.operation.unknown')
  }
}
/**
 * The board and its detail pane: filtered matter list, unclaimed inbox, and the selected
 * matter/fragment biography. Extracted from the panel orchestration so the board's state rules
 * (filter, selection, legal action) stay in one named component.
 */
export function MatterBoard(props: {
  data: DeskData | undefined
  matters: DeskData['matters']
  visibleMatters: DeskData['matters']
  unclaimed: DeskData['unclaimed']
  unclaimedCards: ReturnType<typeof ce>[]
  selection: ProjectionView['selected']
  selected: DeskData['matters'][number] | undefined
  selectedFragment: DeskData['unclaimed'][number] | undefined
  receipts: readonly OperatingReceipt[]
  now: Date
  view: ProjectionView
  deep: boolean
  t: DeskTranslate
  loadOlderReceipts?: (before: string | undefined, scope?: { readonly matterId?: string }) => Promise<OperatingReceiptPage>
  archiveState: ProjectionView['archiveLoads'][string] | undefined
  onLoadOlder: (key: string, before: string | undefined) => void
  selectMatter: (id: string) => void
  onShowList: () => void
  actions: ProjectionViewBoundActions
  lanes: DeskSurface['lanes']
}): ReturnType<typeof ce> {
  const { data, matters, visibleMatters, unclaimed, unclaimedCards, selection, selected, selectedFragment, receipts, view, deep, t, loadOlderReceipts, archiveState, onLoadOlder, selectMatter, onShowList, actions, lanes } = props
  const attentionMatters = deriveAttentionMatters(data, props.now)
  const matterReceipts = selection?.kind === 'matter' ? receipts.filter(receipt => receipt.matterId === selection.id) : []
  const matterReceiptCursor = matterReceipts.reduce<string | undefined>((oldest, receipt) => oldest === undefined || receipt.submittedAt < oldest ? receipt.submittedAt : oldest, undefined)
    ?? receipts.reduce<string | undefined>((oldest, receipt) => oldest === undefined || receipt.submittedAt < oldest ? receipt.submittedAt : oldest, undefined)
  const selectedTimeline = selected === undefined ? [] : matterTimelineItems(selected, receipts)
  return ce('section', { className: 'dsha-matters', 'data-pane': view.pane, 'data-mode': view.mode },
        ce('div', { className: 'dsha-matter-list dsha-list' },
          view.mode === 'attention'
            ? ce('section', { className: 'dsha-attention', 'aria-label': t('desk.attention.title') },
              ce('h2', { className: 'dsha-attention-title' }, t('desk.attention.title')),
              attentionMatters.length === 0
                ? ce('div', { className: 'dsha-attention-empty' },
                  ce('p', {}, t('desk.attention.empty')),
                  ce('p', {}, t('desk.attention.empty.note')))
                : ce('div', { className: 'dsha-attention-list' }, ...attentionMatters.map(item => ce('button', {
                  key: item.matter.id,
                  type: 'button',
                  className: 'dsha-card dsha-attention-card',
                  'data-selected': String(selection?.kind === 'matter' && selection.id === item.matter.id),
                  onClick: () => selectMatter(item.matter.id),
                },
                ce('span', { className: 'dsha-card-title' }, statusChip(item.matter.status), ce('span', {}, item.matter.title)),
                item.due === undefined ? null : ce('span', { className: 'dsha-chip dsha-chip-warn' }, item.due.daysOverdue === 0
                  ? t('desk.attention.due.today')
                  : t('desk.attention.due', { days: item.due.daysOverdue })),
                item.pendingProposals === 0 ? null : ce('span', { className: 'dsha-chip dsha-chip-warn' }, t('desk.attention.pending', { count: item.pendingProposals })),
                item.matter.responsible === '' ? null : ce('p', { className: 'dsha-card-meta' }, item.matter.responsible),
                item.matter.times.promisedDeadline === undefined && item.matter.times.nextCheckpoint === undefined ? null
                  : ce('p', { className: 'dsha-card-meta' }, timeParts({
                    ...(item.matter.times.promisedDeadline === undefined ? {} : { promisedDeadline: item.matter.times.promisedDeadline }),
                    ...(item.matter.times.nextCheckpoint === undefined ? {} : { nextCheckpoint: item.matter.times.nextCheckpoint }),
                  }, t).join(' · ')),
                item.matter.summary.length === 0 ? null : ce('p', { className: 'dsha-card-summary' }, item.matter.summary),
                ce('span', { className: 'dsha-attention-open' }, t('desk.attention.open'))))))
            : null,
          view.mode === 'board' ? ce('div', {},
          matters.length > 0 ? ce('div', { className: 'dsha-filter' },
            (['all', 'active', 'settled'] as const).map(filter => ce('button', {
              key: filter,
              type: 'button',
              className: 'dsha-filter-chip',
              'data-on': String(view.filter === filter),
              onClick: () => actions.setFilter(filter),
            }, glyphFor(filter), ce('span', {}, FILTER_LABEL[filter]), ce('span', { className: 'dsha-chip-count' }, String(filter === 'active'
              ? matters.filter(matter => matter.status === 'active').length
              : filter === 'settled' ? matters.filter(matter => matter.status !== 'active').length : matters.length))))) : null,
          visibleMatters.length === 0 && view.filter === 'settled' ? ce('p', { className: 'dsha-card-meta' }, '还没有办结的事项——了结要在对话里说清楚「办完了」加上依据，它才会落到这里；关掉会话窗口不算。')
            : visibleMatters.length === 0 && view.filter === 'active' ? ce('p', { className: 'dsha-card-meta' }, '没有在办事项。') : null,
          ...visibleMatters.map(matter => ce('button', {
            key: matter.id, type: 'button', className: 'dsha-card',
            'data-selected': String(selection?.kind === 'matter' && selection.id === matter.id),
            onClick: () => selectMatter(matter.id),
          },
          ce('span', { className: 'dsha-card-title' }, statusChip(matter.status), ce('span', {}, matter.title)),
          matter.times.promisedDeadline === undefined && matter.times.nextCheckpoint === undefined ? null
            : ce('p', { className: 'dsha-card-meta' }, timeParts({
              ...(matter.times.promisedDeadline === undefined ? {} : { promisedDeadline: matter.times.promisedDeadline }),
              ...(matter.times.nextCheckpoint === undefined ? {} : { nextCheckpoint: matter.times.nextCheckpoint }),
            }, t).join(' · ')),
          matter.summary.length === 0 ? null : ce('p', { className: 'dsha-card-summary' }, matter.summary),
          matter.proposals.some(proposal => proposal.status === 'pending') ? ce('p', { className: 'dsha-card-meta' }, chip('warn', '等你确认')) : null)),
          deep
            ? (unclaimed.length === 0 ? null : ce('details', { className: 'dsha-background' }, ce('summary', {}, `后台：${String(unclaimed.length)} 条待归户——还没说清是哪件事，不猜`), ...unclaimedCards))
            : ce('div', {}, unclaimed.length > 0 ? ce('p', { className: 'dsha-list-label' }, '待认领——还没说清是哪件事，不猜') : null, ...unclaimedCards)) : null),
        ce('div', { className: 'dsha-matter-detail dsha-detail' },
          selectedFragment !== undefined ? ce('article', {},
            ce('div', { className: 'dsha-meta' },
              ce('button', { className: 'dsha-btn dsha-back', type: 'button', onClick: onShowList }, t('desk.timeline.return', { view: t(RETURN_VIEW_KEY[view.mode]) })),
              ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => lanes.onClaim(selectedFragment.id) }, '认领这件事'),
              // The fragment's other terminal (desk-side capture, 2026-10-18): every item selects into a
              // proportionate action, and "this is noise" is the one that used to have no door.
              ce('button', { className: 'dsha-btn', type: 'button', onClick: () => lanes.onDiscard(selectedFragment.id) }, '是噪音，不归户')),
            ce('h2', {}, chip('warn', '待认领'), ce('span', {}, selectedFragment.note)),
            ce('p', { className: 'dsha-card-meta' }, `来自 ${selectedFragment.sessionId} · 还没说清是哪件事——认领后原文与来源随附入账`))
          : selected !== undefined ? ce('article', {},
            ce('div', { className: 'dsha-meta' },
              ce('button', { className: 'dsha-btn dsha-back', type: 'button', onClick: onShowList }, t('desk.timeline.return', { view: t(RETURN_VIEW_KEY[view.mode]) })),
              // State decides the legal action (principal direction, 2026-10-12): an active
              // matter processes; a settled matter's only legal action is waking it — the
              // state machine never offers 「再处理」 on finished work.
              canProcess(selected.status)
                ? ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => lanes.onProcess?.(selected.id) }, '处理这件事')
                : ce('button', { className: 'dsha-btn dsha-btn-wake', type: 'button', onClick: () => lanes.onWake(selected.id) }, glyphFor('wake'), '唤醒这件事')),
            // Status rides the title line (same shape as the list card) so it stops reading as a
            // second action button beside 「处理这件事」; facts render as the plain meta line below.
            ce('h2', {}, statusChip(selected.status), ce('span', {}, selected.title)),
            metaLine(selected.responsible, selected.times, t),
            selected.summary.length > 0 ? ce('p', { className: 'dsha-card-summary' }, selected.summary) : null,
            ce('section', { className: 'dsha-timeline', 'aria-label': t('desk.timeline.title') },
              ce('h3', { className: 'dsha-ops-title' }, t('desk.timeline.title')),
              ce('p', { className: 'dsha-timeline-note' }, t('desk.timeline.recordOrder')),
              selectedTimeline.length === 0
                ? ce('p', { className: 'dsha-card-summary' }, t('desk.timeline.noRecords'))
                : ce('ol', { className: 'dsha-timeline-list' }, ...selectedTimeline.map(item => {
                  const when = item.at === undefined || item.at === '' ? t('desk.timeline.unknownDate') : humanTime(item.at)
                  if (item.kind === 'evidence') return ce('li', { key: item.id, className: 'dsha-timeline-item' },
                    ce('p', { className: 'dsha-timeline-line' }, t('desk.timeline.source')),
                    ce('p', { className: 'dsha-timeline-body' }, item.note),
                    ce('small', { className: 'dsha-op-src' }, `${when} · ${item.sessionId}${item.eventId === undefined ? '' : ` / ${item.eventId}`}${item.quote === undefined || item.quote === item.note ? '' : ` ·「${item.quote}」`}`))
                  if (item.kind === 'proposal') return ce('li', { key: item.id, className: 'dsha-timeline-item' },
                    ce('p', { className: 'dsha-timeline-line' }, `${t('desk.timeline.proposal')} · ${proposalKindLabel(item.proposal.kind, t)}`),
                    ce('p', { className: 'dsha-timeline-body' }, item.proposal.status === 'pending' ? t('desk.timeline.pending') : item.proposal.status === 'confirmed' ? t('desk.timeline.confirmed') : t('desk.timeline.rejected')),
                    item.proposal.source?.quote === undefined ? null : ce('p', { className: 'dsha-op-quote' }, `「${item.proposal.source.quote}」`),
                    ce('small', { className: 'dsha-op-src' }, `${when} · ${item.proposal.source?.sessionId ?? t('desk.provenance.unknown')}${item.proposal.source?.eventId === undefined ? '' : ` / ${item.proposal.source.eventId}`}`))
                  const op = item.receipt
                  return ce('li', { key: item.id, className: 'dsha-timeline-item' },
                    ce('p', { className: 'dsha-timeline-line' }, `${operationKindLabel(op.kind, t)} · ${when}${operationStatusLabel(op.status, t)}`),
                    op.quote === undefined ? null : ce('p', { className: 'dsha-op-quote' }, `「${op.quote}」`),
                    ce('small', { className: 'dsha-op-src' }, op.sessionId))
                })),
              loadOlderReceipts !== undefined && archiveState?.status !== 'exhausted' ? ce('div', { className: 'dsha-archive-control' },
                archiveState?.status === 'error' ? ce('p', { className: 'dsha-banner', role: 'alert' }, t('desk.archive.error')) : null,
                ce('button', { className: 'dsha-btn', type: 'button', disabled: archiveState?.status === 'loading', onClick: () => onLoadOlder(`matter:${selected.id}`, matterReceiptCursor) },
                  archiveState?.status === 'loading' ? t('desk.archive.loading') : archiveState?.status === 'error' ? t('desk.archive.retry') : t('desk.timeline.more'))) : null))
          : selection === null ? ce('p', { className: 'dsha-detail-hint' }, '选择一项查看详情。')
          : selection.kind === 'fragment' ? ce('p', { className: 'dsha-detail-hint' }, '所选片段不在当前投影中。')
          : ce('p', { className: 'dsha-detail-hint' }, '所选事项不在当前投影中。')))
}
