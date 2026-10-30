/** Global projection presentation. Renderer supplies the sole live-data hook. */
import { createElement as ce, reactSurface } from '../chrome/runtime'
import { AssistantBrandMark } from '../chrome/brand'
import { canProcess, type CaptureStatus } from '../../domain/desk/desk-process'
import { setUiMode, useUiMode } from '../chrome/ui-mode'
import { deriveCaptureView } from '../../domain/desk/desk-capture-view'
import { deriveOverdueMatters, type OverdueMatterAttention } from '../proactive/proactive-face'
import { countPendingProposals, deriveActivityView, type ActivityView } from '../../domain/desk/desk-activity-view'
import { humanTime, localDateKey, localDateLabel, localTimeLabel } from '../chrome/format'
import { ProactiveRows, SuggestionStrip, PROACTIVE_STYLES } from './proactive-strip'
import type { ProactiveUiState } from '../proactive/proactive-face'
import type { ProactiveCatalogState } from '../proactive/proactive-face-source'
import type { ProjectionDownload } from './projection-reader'
import type { DeskSurface } from './desk-surface'
import type { ProjectionView, ProjectionViewBoundActions } from './projection-view'
import type { OperatingMatter, OperatingReceipt } from './operating-projection'
import type { DeskTranslate } from '../chrome/locales'

/** The non-empty projection data the faces consume. */
type DeskData = NonNullable<ProjectionDownload['data']>
type MatterAttention = OverdueMatterAttention
type OperatingReceiptPage = { readonly receipts: readonly OperatingReceipt[], readonly nextBefore: string | null }

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
/** The framework-bound hooks, the view store, and the entry-owned lane surface. */
export interface ProjectionPanelProps {
  readonly t: DeskTranslate
  useProjection<S>(select: (value: ProjectionDownload) => S): S
  useStore<S>(select: (view: ProjectionView) => S): S
  /** The platform's per-session status map (desk-side capture, 2026-10-18), as a selector hook like the projection. */
  useSessionStatus<S>(select: (value: ReadonlyMap<string, CaptureStatus>) => S): S
  /** The platform schedule catalog (proactive face, 2026-10-18) for「它替你看过」row 3; absent = degrade. */
  useCatalog?<S>(select: (state: ProactiveCatalogState) => S): S
  /** Client-local proactive UI state: dismissed suggestions + remembered acceptances. */
  useProactiveUi?<S>(select: (state: ProactiveUiState) => S): S
  /** The view store's bound actions (the renderer supplies them from the declared store). */
  actions: ProjectionViewBoundActions
  /** Every callback the entry wires; one factory owns them so a new lane does not touch fixtures. */
  surface: DeskSurface
  /** Page older receipts from the ledger archive; absent on direct mounts without a host route. */
  loadOlderReceipts?: (before: string | undefined, scope?: { readonly matterId?: string }) => Promise<OperatingReceiptPage>
  /** The home wrapper's way back from the full board to the one-page home (absent on direct mounts). */
  onBackHome?: () => void
}
const errors: Record<string, string> = {
  'authentication-required': '登录已失效，请重新登录后再读取。',
  'download-forbidden': '当前连接无法读取看板。',
  'projection-invalid': '看板资料损坏或版本不支持。',
  'projection-too-large': '看板资料超过读取限额。',
  'download-failed': '看板读取失败，请重试。',
}
const STATUS_LABEL: Record<string, string> = { active: '在办', completed: '已完成', abandoned: '已放弃' }
const FILTER_LABEL: Record<'all' | 'active' | 'settled', string> = { all: '全部', active: '在办', settled: '已了结' }
const RETURN_VIEW_KEY: Record<ProjectionView['mode'], 'desk.view.attention' | 'desk.view.matters' | 'desk.view.activity'> = {
  attention: 'desk.view.attention', board: 'desk.view.matters', activity: 'desk.view.activity',
}

/** Inline stroke glyphs for the desk's switches — self-contained (no vendor icon components in
 *  this standalone bundle), currentColor keeps them on the theme. Builders, not values: `ce`
 *  resolves its underlying createElement lazily, so glyphs must be built at render time. */
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
function glyphFor(name: string): ReturnType<typeof ce> {
  return glyph((GLYPHS[name] ?? (() => []))())
}

function restoreViewportScroll(element: HTMLElement | null): void {
  if (element === null) return
  const target = Number(element.dataset.restoreScrollTop ?? 0)
  if (Number.isFinite(target) && element.scrollTop !== target) element.scrollTop = target
}

const STYLES = [
  '.dsha-desk{display:flex;flex-direction:column;gap:16px;padding:20px 24px;overflow:hidden;min-width:0;container-type:inline-size;height:100%;box-sizing:border-box;}',
  '.dsha-viewport{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;}',
  '.dsha-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
  /* The capture row: accent-bordered because it is the desk's own input, not a control. */
  '.dsha-capture{display:flex;flex-direction:column;gap:6px;border:1px solid var(--dsha-accent);border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-base);}',
  '.dsha-capture-input{flex:1;border:0;outline:0;font:inherit;font-size:14px;background:transparent;color:var(--dsw-alias-label-primary);min-width:0;}',
  '.dsha-capture-hint{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-capture > .dsha-btn{align-self:flex-end;}',
  /* The in-flight row: dashed and grey ON PURPOSE — it must not read as a matter or a fragment. */
  '.dsha-inflight{border:1px dashed var(--dsw-alias-border-l3);border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:4px;}',
  '.dsha-inflight-line{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dsw-alias-label-secondary);}',
  '.dsha-inflight-close{margin-left:auto;font-size:12px;padding:2px 8px;}',
  '.dsha-inflight > .dsha-btn{align-self:flex-start;}',
  '.dsha-chip-wait{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);}',
  '.dsha-inflight-said{margin:0;font-size:13px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-tabs{display:flex;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l2);}',
  '.dsha-tab{display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:7px 14px;font-size:13px;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;}',
  '.dsha-tab:hover{color:var(--dsw-alias-label-primary);}',
  '.dsha-tab[data-on="true"]{color:var(--dsha-accent);border-bottom-color:var(--dsha-accent);}',
  '.dsha-tab .dsha-glyph{width:15px;height:15px;}',
  '.dsha-title{margin:0;font-size:19px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-sub{font-size:13px;color:var(--dsw-alias-label-secondary);}',
  '.dsha-actions{margin-left:auto;display:flex;gap:8px;}',
  '.dsha-btn{border:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;}',
  '.dsha-btn:hover{background:var(--dsw-alias-interactive-bg-hover-accent);}',
  '.dsha-btn-primary{background:var(--dsha-accent-tint);color:var(--dsha-accent);border:0;}',
  '.dsha-btn-wake{background:var(--dsha-warn-tint);color:var(--dsha-warn);border:0;}',
  '.dsha-btn-wake .dsha-glyph{width:14px;height:14px;}',
  '.dsha-banner{margin:0;font-size:13px;color:var(--dsha-warn);background:var(--dsha-warn-tint);border:0;border-radius:8px;padding:8px 12px;}',
  '.dsha-note{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:0;border-radius:8px;padding:8px 12px;}',
  '.dsha-matters{display:grid;grid-template-columns:minmax(260px,2fr) minmax(0,3fr);gap:16px;align-items:start;}',
  '.dsha-list{display:flex;flex-direction:column;gap:8px;min-width:0;}',
  '.dsha-filter{display:flex;gap:6px;flex-wrap:wrap;}',
  '.dsha-filter-chip{display:inline-flex;align-items:center;gap:4px;border:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer;font:inherit;}',
  '.dsha-filter-chip[data-on="true"]{background:var(--dsha-accent-tint);color:var(--dsha-accent);border-color:var(--dsha-accent-tint);}',
  '.dsha-glyph{width:13px;height:13px;flex:none;}',
  '.dsha-chip-count{color:var(--dsw-alias-label-tertiary);}',
  '.dsha-filter-chip[data-on="true"] .dsha-chip-count{color:var(--dsha-accent);}',
  '.dsha-list-label{font-size:12px;color:var(--dsw-alias-label-tertiary);margin:4px 0 0;}',
  '.dsha-card{display:block;width:100%;text-align:left;background:var(--dsw-alias-bg-layer-1);border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;cursor:pointer;font:inherit;}',
  '.dsha-card:hover{background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-card[data-selected="true"]{border:1px solid var(--dsha-accent);background:var(--dsha-accent-tint);}',
  '.dsha-card-title{display:flex;align-items:center;gap:8px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-card-meta{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;}',
  '.dsha-card-summary{margin:4px 0 0;font-size:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-attention{display:flex;flex-direction:column;gap:12px;}',
  '.dsha-attention-title{margin:0;font-size:17px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-attention-list{display:flex;flex-direction:column;gap:8px;}',
  '.dsha-attention-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:6px 10px;}',
  '.dsha-attention-card .dsha-card-title,.dsha-attention-card .dsha-card-meta,.dsha-attention-card .dsha-card-summary{grid-column:1/-1;}',
  '.dsha-attention-open{grid-column:2;font-size:12px;color:var(--dsha-accent);}',
  '.dsha-attention-empty{display:flex;flex-direction:column;gap:6px;border-left:2px solid var(--dsha-accent);padding:8px 12px;background:var(--dsw-alias-bg-layer-1);}',
  '.dsha-attention-empty p,.dsha-timeline-note{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);}',
  '.dsha-timeline{display:flex;flex-direction:column;gap:8px;margin-top:16px;}',
  '.dsha-timeline-list{list-style:none;margin:0;padding:0 0 0 14px;display:flex;flex-direction:column;gap:10px;border-left:1px solid var(--dsw-alias-border-l3);}',
  '.dsha-timeline-item{position:relative;padding:0 0 0 10px;min-width:0;}',
  '.dsha-timeline-item:before{content:"";position:absolute;width:8px;height:8px;border-radius:50%;background:var(--dsha-accent);left:-19px;top:5px;}',
  '.dsha-timeline-line,.dsha-timeline-body{margin:0;font-size:13px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-timeline-body{color:var(--dsw-alias-label-secondary);}',
  '.dsha-timeline-current{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-simple{display:flex;flex-direction:column;gap:10px;margin-top:12px;}',

  '.dsha-simple-card{background:var(--dsw-alias-bg-layer-1);border:0.5px solid var(--dsw-alias-border-l2);border-radius:12px;padding:16px;}',
  '.dsha-simple-kicker{margin:0 0 4px;font-size:11px;letter-spacing:0.04em;color:var(--dsha-warn);}',
  '.dsha-simple-title{margin:0;font-size:18px;line-height:1.4;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-simple-summary{margin:8px 0 0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-simple-meta{margin:8px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-simple-actions{display:flex;gap:8px;margin-top:12px;}',
  '.dsha-simple-more{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}',
  '.dsha-chip{display:inline-block;flex:none;font-size:12px;line-height:18px;border-radius:999px;padding:0 8px;}',
  '.dsha-chip-active{background:var(--dsha-accent-tint);color:var(--dsha-accent);}',
  '.dsha-chip-completed{background:var(--dsha-success-tint);color:var(--dsha-success);}',
  '.dsha-chip-abandoned{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);}',
  '.dsha-chip-warn{background:var(--dsha-warn-tint);color:var(--dsha-warn);}',
  '.dsha-detail{min-width:0;border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;overflow-wrap:anywhere;}',
  '.dsha-detail h2{display:flex;align-items:center;gap:8px;margin:8px 0 4px;font-size:17px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-detail h2 span{overflow-wrap:anywhere;min-width:0;}',
  '.dsha-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px;}',
  '.dsha-proposal{margin:10px 0;background:var(--dsha-warn-tint);border:0;border-radius:8px;padding:10px 12px;}',
  '.dsha-evidence{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}',
  '.dsha-evidence li{border-left:0.5px solid var(--dsw-alias-border-l3);padding-left:10px;}',
  '.dsha-activity{display:flex;flex-direction:column;gap:12px;min-width:0;}',
  '.dsha-activity-day{display:flex;flex-direction:column;gap:6px;}',
  '.dsha-activity-date{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-activity-entry{display:block;width:100%;text-align:left;background:var(--dsw-alias-bg-layer-1);border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;cursor:pointer;font:inherit;}',
  'button.dsha-activity-entry:hover{background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-activity-line{margin:0;font-size:13px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-activity-more{align-self:flex-start;}',
  '.dsha-ops{margin:12px 0 0;display:flex;flex-direction:column;gap:6px;}',
  '.dsha-ops-title{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-op{border-left:0.5px solid var(--dsw-alias-border-l3);padding-left:10px;}',
  '.dsha-op-line{margin:0;font-size:13px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-op-quote{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-op-src{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-evidence p{margin:0;font-size:13px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-evidence small{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px 0;color:var(--dsw-alias-label-secondary);}',
  '.dsha-back{display:none;margin:0;}',
  '.dsha-detail-hint{margin:0;color:var(--dsw-alias-label-tertiary);}',
  '@container (max-width: 680px){',
  '  .dsha-matters{display:block;}',
  '  .dsha-matters[data-pane="list"] .dsha-matter-detail{display:none;}',
  '  .dsha-matters[data-pane="detail"] .dsha-matter-list{display:none;}',
  '  .dsha-back{display:inline-block;}',
  '}',
].join('')

function chip(kind: string, label: string) {
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

function operationStatusLabel(status: string, t: DeskTranslate): string {
  switch (status) {
    case 'retained': return ` · ${t('desk.operationStatus.retained')}`
    case 'conflict': return ` · ${t('desk.operationStatus.conflict')}`
    case 'rejected':
    case 'proposal-rejected': return ` · ${t('desk.operationStatus.rejected')}`
    case 'proposed': return ` · ${t('desk.operationStatus.proposed')}`
    default: return ''
  }
}

function operationKindLabel(kind: string | undefined, t: DeskTranslate): string {
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
 * The simple density face: one next thing, one action, one way out. Extracted from the panel
 * so its urgent/pending/matter/fragment precedence reads as one component rather than a local
 * branch inside the orchestration function.
 */
function SimpleFace(props: {
  data: DeskData
  simpleMatter: DeskData['matters'][number] | undefined
  simpleFragment: DeskData['unclaimed'][number] | undefined
  simpleQuestion: string | undefined
  lanes: DeskSurface['lanes']
}): ReturnType<typeof ce> {
  const { data, simpleMatter, simpleFragment, simpleQuestion, lanes } = props
  const matters = data.matters
  const unclaimed = data.unclaimed ?? []
  return ce('section', { className: 'dsha-simple', 'data-ui-simple': true },
    ce('div', { className: 'dsha-simple-card' },
      simpleQuestion !== undefined ? ce('p', { className: 'dsha-simple-kicker' }, '它在等你') : null,
      ce('h2', { className: 'dsha-simple-title' },
        simpleQuestion !== undefined ? '它在等你回答'
          : simpleMatter !== undefined ? simpleMatter.title
            : simpleFragment !== undefined ? '有一条还没归户的事'
              : '看板上没有在办的事'),
      simpleMatter !== undefined && simpleMatter.summary !== '' ? ce('p', { className: 'dsha-simple-summary' }, simpleMatter.summary) : null,
      simpleMatter === undefined && simpleFragment !== undefined ? ce('p', { className: 'dsha-simple-summary' }, simpleFragment.note) : null,
      simpleMatter !== undefined ? ce('p', { className: 'dsha-simple-meta' },
        `${STATUS_LABEL[simpleMatter.status] ?? simpleMatter.status}${simpleMatter.times.nextCheckpoint !== undefined ? ` · 核对点 ${simpleMatter.times.nextCheckpoint}` : ''}`) : null,
      ce('div', { className: 'dsha-simple-actions' },
        simpleQuestion !== undefined
          ? ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => { lanes.onOpenSession(simpleQuestion) } }, '去会话回答')
          : simpleMatter !== undefined
            ? ce('button', {
              className: 'dsha-btn dsha-btn-primary', type: 'button',
              onClick: () => { if (simpleMatter.status === 'active') lanes.onProcess(simpleMatter.id); else lanes.onWake(simpleMatter.id) },
            }, simpleMatter.status === 'active' ? '处理这件事' : '唤醒这件事')
            : simpleFragment !== undefined
              ? ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => { lanes.onClaim(simpleFragment.id) } }, '认领这件事')
              : null)),
    ce('div', { className: 'dsha-simple-more' },
      ce('span', { className: 'dsha-note' }, [
        matters.length > 1 ? `还有 ${String(matters.length - 1)} 件在账上` : '',
        unclaimed.length > 0 && simpleMatter !== undefined ? `${String(unclaimed.length)} 条待认领` : '',
      ].filter(Boolean).join(' · ')),
      ce('button', { className: 'dsha-btn', type: 'button', onClick: () => { setUiMode('standard') } }, '显示更多 · 切到标准')))
}

/**
 * The activity face: the operation feed grouped by local day, with both the local reveal and
 * the archive page. Extracted from the panel for the same reason as SimpleFace.
 */
function ActivityFace(props: {
  data: DeskData
  activityView: ActivityView<OperatingReceipt>
  oldestReceipt: string | undefined
  actions: ProjectionViewBoundActions
  t: DeskTranslate
  archiveState: ProjectionView['archiveLoads'][string] | undefined
  loadOlderReceipts?: (before: string | undefined, scope?: { readonly matterId?: string }) => Promise<OperatingReceiptPage>
  onLoadOlder: (key: string, before: string | undefined) => void
  onSelectMatter: (id: string, mode: ProjectionView['mode']) => void
}): ReturnType<typeof ce> {
  const { data, activityView, oldestReceipt, actions, t, archiveState, loadOlderReceipts, onLoadOlder, onSelectMatter } = props
  const activityEntries = activityView.entries
  const activityGroups = activityView.groups
  const titleOfMatter = (matterId: string): string => data.matters.find(matter => matter.id === matterId)?.title ?? matterId
  return ce('section', { className: 'dsha-activity' },
        activityEntries.length === 0 ? ce('p', { className: 'dsha-detail-hint' }, t('desk.activity.empty')) : null,
        ...activityGroups.map(group => ce('div', { key: group.key, className: 'dsha-activity-day' },
          ce('p', { className: 'dsha-activity-date' }, group.label),
          ...group.entries.map(receipt => {
            const known = receipt.matterId !== '' && data.matters.some(matter => matter.id === receipt.matterId)
            const entryLine = ce('span', { className: 'dsha-activity-line' },
              `${localTimeLabel(receipt.submittedAt)} ${operationKindLabel(receipt.kind, t)}${operationStatusLabel(receipt.status, t)}${known ? ` · ${titleOfMatter(receipt.matterId)}` : ''}`)
            const quote = receipt.quote !== undefined ? ce('p', { className: 'dsha-op-quote' }, `「${receipt.quote}」`) : null
            return known
              ? ce('button', { key: receipt.operationId, type: 'button', className: 'dsha-activity-entry',
                  onClick: () => onSelectMatter(receipt.matterId, 'board') }, entryLine, quote)
              : ce('div', { key: receipt.operationId, className: 'dsha-activity-entry' }, entryLine, quote)
          }))),
        activityView.hasMore
          ? ce('button', { type: 'button', className: 'dsha-btn dsha-activity-more', onClick: () => actions.revealMoreActivity() }, t('desk.activity.showMore'))
          : loadOlderReceipts !== undefined && archiveState?.status !== 'exhausted'
            ? ce('div', { className: 'dsha-archive-control' },
              archiveState?.status === 'error' ? ce('p', { className: 'dsha-banner', role: 'alert' }, t('desk.archive.error')) : null,
              ce('button', {
                type: 'button',
                className: 'dsha-btn dsha-activity-more',
                disabled: archiveState?.status === 'loading',
                onClick: () => onLoadOlder('activity', oldestReceipt),
              }, archiveState?.status === 'loading' ? t('desk.archive.loading') : archiveState?.status === 'error' ? t('desk.archive.retry') : t('desk.archive.more')))
            : null)
}

/**
 * The board and its detail pane: filtered matter list, unclaimed inbox, and the selected
 * matter/fragment biography. Extracted from the panel orchestration so the board's state rules
 * (filter, selection, legal action) stay in one named component.
 */
function MatterBoard(props: {
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

/**
 * The desk page: header with counts, card list (matters then unclaimed), and the detail pane.
 * Read-only complete collection with distinct loading/missing/error/stale states; all colors
 * ride semantic aliases and the theme contract block.
 * @param props - Framework-bound projection hook and plain action callbacks.
 * @returns The desk page element.
 */
export function ProjectionPanel(props: ProjectionPanelProps): ReturnType<typeof ce> {
  const lanes = props.surface.lanes
  const { useCallback, useRef } = reactSurface()
  const simpleMode = useUiMode() === 'simple'
  const download = props.useProjection(value => value)
  const data = download.data
  const view = props.useStore(value => value)
  const effectiveMode = simpleMode ? 'board' : view.mode
  const archiveRequests = useRef(new Set<string>())
  const viewportElement = useRef<HTMLElement | null>(null)
  const attachViewport = useCallback((element: HTMLElement | null): void => {
    viewportElement.current = element
    restoreViewportScroll(element)
  }, [])
  const rememberListOffset = (): void => {
    const viewport = viewportElement.current
    if (view.pane === 'list' && viewport !== null) props.actions.rememberModePosition(effectiveMode, viewport.scrollTop)
  }
  const selectMode = (mode: ProjectionView['mode']): void => { rememberListOffset(); props.actions.selectMode(mode) }
  const openMatterInMode = (id: string, mode: ProjectionView['mode']): void => { rememberListOffset(); props.actions.selectMatter(id, mode) }
  const selectMatter = (id: string): void => { openMatterInMode(id, effectiveMode) }
  const selectFragment = (id: string): void => { rememberListOffset(); props.actions.selectFragment(id) }
  const onShowList = (): void => { props.actions.showList() }
  const loadOlder = (key: string, before: string | undefined): void => {
    const current = view.archiveLoads[key]
    if (props.loadOlderReceipts === undefined || current?.status === 'loading' || current?.status === 'exhausted' || archiveRequests.current.has(key)) return
    archiveRequests.current.add(key)
    const cursor = current?.status === 'error' || current?.status === 'ready' ? current.before : before
    props.actions.beginArchiveLoad(key, cursor)
    const matterId = key.startsWith('matter:') ? key.slice('matter:'.length) : undefined
    void props.loadOlderReceipts(cursor, matterId === undefined ? undefined : { matterId })
      .then(page => props.actions.completeArchiveLoad(key, page.receipts, page.nextBefore))
      .catch(() => props.actions.failArchiveLoad(key))
      .finally(() => { archiveRequests.current.delete(key) })
  }
  const selection = view.selected
  // The capture row's in-flight state. The receipt is a DELIVERY fact, so it stops being
  // shown the moment the projection's revision moves past the submission — the ledger has
  // spoken, and whatever it says (a new fragment, a new matter) takes over the desk. While it is
  // shown, the row is deliberately NOT shaped like a matter or a fragment: the desk must never
  // claim content it cannot back.
  const receipt = view.captureReceipt
  // Whose turn it is comes from the platform's SessionStatus, not from anything the desk
  // remembers. Phase, pending, ownership, and the other waiting sessions are derived by the
  // domain module so the rules are testable without rendering.
  const sessionStatuses = props.useSessionStatus(value => value)
  const captureView = deriveCaptureView({ receipt, revision: data?.revision ?? 0, statuses: sessionStatuses })
  // The board mounted from HomeSurface is the deep view: it must not repeat the home's intake or
  // the setup/diagnostic chrome. A direct mount (tests / legacy) keeps the full dashboard.
  const deep = props.onBackHome !== undefined
  const phase = captureView.phase
  const capturePending = captureView.pending
  const isActionLane = captureView.isActionLane
  const pendingQuestionSessions = captureView.questionSessions
  const openQuestions = captureView.openQuestions
  const PHASE_LABEL: Record<string, string> = {
    running: '等助手', queued: '已交给助手', suspended: '轮到我', settled: '它说完了',
  }
  const PHASE_DETAIL: Record<string, string> = {
    running: '它正在处理你这句话。',
    queued: '排着队，等它接手。',
    suspended: '助手在会话里问了话（等你回答）——点「去会话」接着答，看板这边不会替你答。',
    settled: isActionLane
      ? '它跑完了，结论在会话里——看板这边不会替你收下。'
      : '它说完了，但账本没有新东西——点「去会话」看它说了什么。',
  }
  const submitCapture = (): void => {
    const text = view.captureDraft.trim()
    if (text === '' || capturePending) return
    props.actions.setCaptureDraft('')
    lanes.onCapture(text)
  }
  const selected = selection?.kind === 'matter' ? data?.matters.find(matter => matter.id === selection.id) : undefined
  const selectedFragment = selection?.kind === 'fragment' ? data?.unclaimed.find(fragment => fragment.id === selection.id) : undefined
  // The activity feed (history views ③): every operation newest first, grouped by the viewer's
  // local day. The recent window reveals locally; older receipts arrive from the ledger archive.
  const now = new Date()
  const allReceipts = (() => {
    const seen = new Set<string>()
    return [...(data?.receipts ?? []), ...(view.olderReceipts ?? [])].filter(receipt => {
      if (seen.has(receipt.operationId)) return false
      seen.add(receipt.operationId)
      return true
    })
  })()
  const oldestReceipt = allReceipts.reduce<string | undefined>((oldest, receipt) => oldest === undefined || receipt.submittedAt < oldest ? receipt.submittedAt : oldest, undefined)
  const activityView = deriveActivityView(allReceipts, view.activityLimit, localDateKey, localDateLabel)
  const pendingProposals = countPendingProposals(data?.matters ?? [])
  const proactiveStripProps = {
    ...(data !== undefined ? { data } : {}),
    openQuestions,
    pendingQuestionSessions,
    lanes,
    actions: props.actions,
    capturePending,
    simpleMode,
    ...(props.useCatalog !== undefined ? { useCatalog: props.useCatalog } : {}),
    ...(props.useProactiveUi !== undefined ? { useProactiveUi: props.useProactiveUi } : {}),
  }
  const message = download.status === 'disconnected' ? '连接已断开，恢复连接后重新读取。'
    : download.status === 'loading' ? '正在读取看板…'
    : download.status === 'missing' ? '还没有经营事项资料。'
    : download.status === 'error' ? (errors[download.error ?? 'download-failed'] ?? errors['download-failed']) : undefined
  const matters = data?.matters ?? []
  const unclaimed = data?.unclaimed ?? []
  // The board's status filter (history views ②): 全部 preserves today's list; 在办/已了结 narrow
  // it. The unclaimed inbox is not matter state and ignores the filter.
  const visibleMatters = view.filter === 'active' ? matters.filter(matter => matter.status === 'active')
    : view.filter === 'settled' ? matters.filter(matter => matter.status !== 'active')
    : matters
  const counts = data === undefined ? undefined
    : `${matters.filter(matter => matter.status === 'active').length} 件在办`
      + (pendingProposals > 0 ? ` · ${pendingProposals} 条等你确认` : '')
      + (deep || unclaimed.length === 0 ? '' : ` · ${unclaimed.length} 条待认领`)
  // Simple mode: one card and the input, nothing else. The card picks the next thing by
  // urgency (a pending question first), then the first active/completed matter, then the
  // first unclaimed fragment. "显示更多" is the only way out and switches to standard.
  const simpleMatter = matters.find(matter => matter.status === 'active') ?? matters[0]
  const simpleFragment = unclaimed[0]
  const simpleQuestion = pendingQuestionSessions[0]
  const simpleFace = data === undefined ? null : SimpleFace({ data, simpleMatter, simpleFragment, simpleQuestion, lanes })
  // Each keyed viewport owns one mode/pane scroll lifetime; the shared view store keeps its
  // corresponding list offset across viewport replacements.ns off a
  // live scroll position, and a principal who scrolled back to top has already zeroed the
  // store through onScroll. Activity mode always presents itself from the top.
  const unclaimedCards = unclaimed.map(fragment => ce('button', {
    key: fragment.id,
    type: 'button',
    className: 'dsha-card',
    'data-selected': String(selection?.kind === 'fragment' && selection.id === fragment.id),
    onClick: () => selectFragment(fragment.id),
  },
  ce('span', { className: 'dsha-card-title' }, chip('warn', '待认领'), ce('span', {}, fragment.note)),
  ce('p', { className: 'dsha-card-meta' }, `来自 ${fragment.sessionId}`)))
  return ce('main', {
    className: 'dsha-desk',
    'data-assistant-operating-desk': true,
  },
    ce('style', {}, STYLES + PROACTIVE_STYLES),
    ce('header', { className: 'dsha-head' },
      ce('div', {},
        ce('h1', { className: 'dsha-title' }, '完整看板'),
        counts === undefined ? null : ce('div', { className: 'dsha-sub' }, counts)),
      ce('div', { className: 'dsha-actions' },
        props.onBackHome !== undefined
          ? ce('button', { className: 'dsha-btn', type: 'button', onClick: props.onBackHome }, '回到今天')
          : null,
        ...(deep ? [] : [
          ce('button', { className: 'dsha-btn', onClick: lanes.refreshProjection, disabled: download.status === 'loading', title: download.status === 'loading' ? '正在读取看板…' : '重新读取看板' }, '重新读取'),
          ce('button', { className: 'dsha-btn', onClick: lanes.onAsk }, '有问题？跟助手说'),
          ce('button', { className: 'dsha-btn dsha-btn-primary', onClick: lanes.onEntrust ?? lanes.onAsk }, '＋ 交代新事项'),
        ]))),
    ce('div', {
      key: `${effectiveMode}:${view.pane}`,
      className: 'dsha-viewport',
      'data-pane': view.pane,
      'data-mode': effectiveMode,
      'data-restore-scroll-top': view.pane === 'detail' || effectiveMode === 'activity' ? 0
        : effectiveMode === 'attention' ? view.attentionScrollTop : view.listScrollTop,
      ref: attachViewport,
      onScroll: (event: { currentTarget: HTMLElement }) => {
        if (view.pane === 'list') props.actions.rememberModePosition(effectiveMode, event.currentTarget.scrollTop)
      },
    },
      ce('div', { className: 'dsha-viewport-content' },
    // Proactive face (2026-10-18):「它替你看过」sits BETWEEN the header and the capture row —
    // structural anchor, not line numbers (the two 261018 cards invalidate each other's anchors).
    // All-empty state renders nothing; each row carries at most one action (the noise cap).
    deep ? null : ce(ProactiveRows, { ...proactiveStripProps }),
    // The desk's own capture row (desk-side capture, 2026-10-18). The principal's intent to add something arises
    // WHILE looking at the desk, so the desk has to be able to take it — before this, the only
    // door was 「＋ 交代新事项」, which opens a conversation and takes the reminder surface away.
    // Two doors, and the copy says which weight each one carries.
    deep ? null : ce('div', { className: 'dsha-capture' },
      ce('input', {
        className: 'dsha-capture-input',
        type: 'text',
        value: view.captureDraft,
        placeholder: '有新的事，直接说…',
        'aria-label': '在看板直接交代一件新事',
        disabled: capturePending,
        onInput: (event: { target: { value: string } }) => props.actions.setCaptureDraft(event.target.value),
        onKeyDown: (event: { key: string, preventDefault: () => void }) => {
          if (event.key === 'Enter') { event.preventDefault(); submitCapture() }
        },
      }),
      ce('button', {
        className: 'dsha-btn dsha-btn-primary',
        type: 'button',
        disabled: capturePending || view.captureDraft.trim() === '',
        onClick: submitCapture,
      }, '交给助手'),
      ce('p', { className: 'dsha-capture-hint' },
        capturePending
          ? '已交给助手，还没进账——账本真出现这一条，它才会以事项或待认领的样子回来。'
          : '轻的走这里（记一下：助手会先记成一笔、再问要不要立项）；要正式立项用「＋ 交代新事项」当面谈。')),
    phase !== undefined && phase !== 'resolved' && receipt !== null ? ce('div', { className: 'dsha-inflight', role: 'status' },
      ce('div', { className: 'dsha-inflight-line' },
        ce('span', { className: `dsha-chip ${phase === 'suspended' ? 'dsha-chip-me' : 'dsha-chip-wait'}` }, PHASE_LABEL[phase] ?? '已交给助手'),
        ce('span', {}, phase === 'settled'
          ? (isActionLane ? '结果在会话里' : '账本没有新东西')
          : '还没进账'),
        // 261019: always an explicit way out. A receipt that can only end on a ledger move is a
        // trap for the action lanes, whose whole point is not to write one.
        ce('button', {
          className: 'dsha-btn dsha-inflight-close', type: 'button', 'aria-label': '关闭这条提示',
          onClick: () => props.actions.setCaptureReceipt(null),
        }, '关闭')),
      ce('p', { className: 'dsha-inflight-said' }, receipt.label ?? `「${receipt.text}」`),
      ce('p', { className: 'dsha-capture-hint' }, PHASE_DETAIL[phase] ?? ''),
      phase === 'suspended' || phase === 'settled'
        ? ce('button', { className: 'dsha-btn', type: 'button', onClick: () => lanes.onOpenSession(receipt.sessionId) }, '去会话')
        : null,
      ce('p', { className: 'dsha-capture-hint' }, isActionLane
        ? '来自：看板按钮 · 话已进会话日志'
        : '来自：看板直接交代 · 话已进会话日志')) : null,
    // 261019: the offer sits BELOW the input and its in-flight row — the principal's own words
    // come first; the three named watches are an offer, not the desk's primary surface.
    deep ? null : ce(SuggestionStrip, { ...proactiveStripProps }),
    // The desk's two top-level views as real tabs (principal UX direction, 2026-10-12): the
    // divider line makes the split legible, the active underline sits ON the line, and the
    // glyphs carry the memory — this is not another row of filter pills.
    data !== undefined && !simpleMode ? ce('div', { className: 'dsha-tabs', role: 'tablist' },
      (['attention', 'board', 'activity'] as const).map(mode => ce('button', {
        key: mode,
        type: 'button',
        role: 'tab',
        className: 'dsha-tab',
        'aria-selected': String(effectiveMode === mode),
        'data-on': String(effectiveMode === mode),
        onClick: () => { selectMode(mode) },
      }, glyphFor(mode), ce('span', {}, props.t(RETURN_VIEW_KEY[mode]))))) : null,
    download.status === 'disconnected' ? ce('p', { className: 'dsha-banner', role: 'status' }, message) : null,
    download.stale ? ce('p', { className: 'dsha-banner', role: 'status' }, '以下是上次读到的内容，尚未刷新。') : null,
    download.status === 'error' ? ce('p', { className: 'dsha-banner', role: 'alert' }, message) : null,
    download.status === 'loading' ? ce('p', { className: 'dsha-note', role: 'status' }, message) : null,
    data?.fixture ? ce('p', { className: 'dsha-note' }, '模拟资料，仅供验证界面。') : null,
    download.status === 'missing' ? ce('div', { className: 'dsha-empty' },
      ce(AssistantBrandMark, { size: 44 }),
      ce('p', { className: 'dsha-detail-hint' },
        download.status === 'missing' ? '还没有经营事项资料。交代一件试试——它会被记进权威账本，事事有着落。' : '还没有经营事项。交代一件试试——它会被记进权威账本，事事有着落。'))
      : simpleMode && data !== undefined ? simpleFace
      : effectiveMode === 'activity' && data !== undefined ? ActivityFace({ data, activityView, oldestReceipt, actions: props.actions, t: props.t, archiveState: view.archiveLoads.activity, ...(props.loadOlderReceipts === undefined ? {} : { loadOlderReceipts: props.loadOlderReceipts }), onLoadOlder: loadOlder, onSelectMatter: openMatterInMode })
      : MatterBoard({ data, matters, visibleMatters, unclaimed, unclaimedCards, selection, selected, selectedFragment, receipts: allReceipts, now, view, deep, t: props.t, archiveState: selection?.kind === 'matter' ? view.archiveLoads[`matter:${selection.id}`] : undefined, ...(props.loadOlderReceipts === undefined ? {} : { loadOlderReceipts: props.loadOlderReceipts }), onLoadOlder: loadOlder, selectMatter, onShowList, actions: props.actions, lanes }),
      ),
    ),
  )
}
