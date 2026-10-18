/** Global projection presentation. Renderer supplies the sole live-data hook. */
import { createElement as ce } from './runtime'
import { AssistantBrandMark } from './brand'
import { canProcess, capturePhase, type CaptureStatus } from './desk-process'
import { humanTime, localDateKey, localDateLabel, localTimeLabel } from './format'
import { deriveProactiveFace, PROACTIVE_SUGGESTIONS, type ProactiveUiState } from './proactive-face'
import type { ProactiveCatalogState } from './proactive-face-source'
import type { ProjectionDownload } from './projection-reader'
import type { DeskCaptureReceipt, ProjectionView } from './projection-view'

/** Structural mirror of the pinned PropsHooks snapshot selector (no component subscriptions). */
export interface ProjectionPanelProps {
  useProjection<S>(select: (value: ProjectionDownload) => S): S
  useStore<S>(select: (view: ProjectionView) => S): S
  /** The platform's per-session status map (261018 片 1b), as a selector hook like the projection. */
  useSessionStatus<S>(select: (value: ReadonlyMap<string, CaptureStatus>) => S): S
  /** The platform schedule catalog (261018 proactive 片 1) for「它替你看过」row 3; absent = degrade. */
  useCatalog?<S>(select: (state: ProactiveCatalogState) => S): S
  /** Client-local proactive UI state (片 2): dismissed suggestions + remembered acceptances. */
  useProactiveUi?<S>(select: (state: ProactiveUiState) => S): S
  /** Hand one suggestion action to the desk's delivery lane (「先试跑一次」/「替我盯上」, 片 2). */
  onSuggestAction?(kind: 'trial' | 'watch', id: string): void
  /** Dismiss one suggestion for good (片 2's 忽略封口). */
  onSuggestDismiss?(id: string): void
  /** Forget a failed acceptance whose watch never materialized (the Q5 row's 忽略, 261019). */
  onWatchForget?(title: string): void
  actions: { selectMatter(id: string): void; selectFragment(id: string): void; showList(): void; rememberListPosition(position: number): void; setFilter(filter: ProjectionView['filter']): void; setMode(mode: ProjectionView['mode']): void; revealMoreActivity(): void; setCaptureDraft(text: string): void; setCaptureReceipt(receipt: DeskCaptureReceipt | null): void }
  refreshProjection(): void
  onAsk(): void
  /** The 「＋ 交代新事项」 entry. Falls back to `onAsk` where no intake path is wired (tests,
   *  environments without the desk path store) so the button never goes dead. */
  onEntrust?(): void
  /** Deliver the principal's own words from the desk's capture row (261018 片 1), staying here. */
  onCapture(text: string): void
  /** Go to one conversation — the capture row's pointer when the assistant is waiting on the principal. */
  onOpenSession(sessionId: string): void
  /** Open the platform's automation task page (row 3's duplicate deep link — never deletes here). */
  onOpenTasks?(): void
  /** Open the explicit processing path for one matter (bound to the entry's processMatter). */
  onProcess(matterId: string): void
  /** Open the explicit claim path for one unclaimed fragment (bound to the entry's claimFragment). */
  onClaim(fragmentId: string): void
  /** Record that one unclaimed fragment is noise (bound to the entry's discardFragment). */
  onDiscard(fragmentId: string): void
  /** Open the explicit wake path for one settled matter (bound to the entry's wakeMatter). */
  onWake(matterId: string): void
}
const errors: Record<string, string> = {
  'authentication-required': '登录已失效，请重新登录后再读取。',
  'download-forbidden': '当前连接无法读取桌面。',
  'projection-invalid': '桌面资料损坏或版本不支持。',
  'projection-too-large': '桌面资料超过读取限额。',
  'download-failed': '桌面读取失败，请重试。',
}
const STATUS_LABEL: Record<string, string> = { active: '在办', completed: '已完成', abandoned: '已放弃' }
const CHANGE_LABEL: Record<string, string> = { reschedule: '重约承诺', checkpoint: '改核对点', complete: '办结', abandon: '放弃' }
/** Operation kinds as the biography's human labels (ledger domain kinds; the tool's report and
 *  revise both submit `update`, so the label stays neutral). */
const OP_LABEL: Record<string, string> = {
  create: '交办立项', update: '更新事项', note: '记一笔', claim: '认领归户', discard: '判为噪音', complete: '办结',
  reopen: '重开', propose: '提出请示', confirm: '确认', reject: '拒绝',
}
/** Outcome annotations for receipts whose status says more than the kind does. */
const OP_STATUS_NOTE: Record<string, string> = {
  retained: '存入待认领', conflict: '冲突未生效', rejected: '未生效',
}
const FILTER_LABEL: Record<'all' | 'active' | 'settled', string> = { all: '全部', active: '在办', settled: '已了结' }

/** Inline stroke glyphs for the desk's switches — self-contained (no vendor icon components in
 *  this standalone bundle), currentColor keeps them on the theme. Builders, not values: `ce`
 *  resolves its underlying createElement lazily, so glyphs must be built at render time. */
function glyph(children: ReturnType<typeof ce>[]): ReturnType<typeof ce> {
  return ce('svg', { className: 'dsha-glyph', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true }, ...children)
}
const GLYPHS: Record<string, () => ReturnType<typeof ce>[]> = {
  board: () => [ce('path', { d: 'M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z' })],
  activity: () => [ce('path', { d: 'M3 12a9 9 0 1 0 2.6-6.4' }), ce('path', { d: 'M3 4v4h4' }), ce('path', { d: 'M12 7v5l3 2' })],
  all: () => [ce('path', { d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' })],
  active: () => [ce('circle', { cx: 12, cy: 12, r: 4, fill: 'currentColor' })],
  settled: () => [ce('circle', { cx: 12, cy: 12, r: 9 }), ce('path', { d: 'M8 12l3 3 5-6' })],
  wake: () => [ce('path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9' }), ce('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })],
}
function glyphFor(name: string): ReturnType<typeof ce> {
  return glyph((GLYPHS[name] ?? (() => []))())
}

const STYLES = [
  '.dsha-desk{display:flex;flex-direction:column;gap:16px;padding:20px 24px;overflow-y:auto;min-width:0;container-type:inline-size;height:100%;box-sizing:border-box;}',
  '.dsha-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
  /* 片 1: the capture row. Accent-bordered because it is the desk's own input, not a control. */
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
  '.dsha-proactive{display:flex;flex-direction:column;gap:4px;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;padding:8px 12px;background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-proactive-row{display:flex;align-items:baseline;gap:8px;font-size:13px;color:var(--dsw-alias-label-secondary);}',
  '.dsha-proactive-row > span{min-width:0;overflow-wrap:anywhere;}',
  '.dsha-proactive-due{border-left:2px solid var(--dsha-warn);padding-left:8px;}',
  '.dsha-proactive-row > .dsha-btn{margin-left:auto;flex:none;font-size:12px;padding:2px 8px;}',
  '.dsha-proactive-actions{display:flex;gap:4px;flex:none;margin-left:auto;}',
  '.dsha-proactive-actions > .dsha-btn{font-size:12px;padding:2px 8px;}',
  '.dsha-suggest{display:flex;flex-direction:column;gap:6px;border:1px dashed var(--dsw-alias-border-l3);border-radius:10px;padding:8px 12px;background:var(--dsw-alias-bg-base);}',
  '.dsha-suggest-title{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-suggest-item{display:flex;align-items:baseline;gap:8px;}',
  '.dsha-suggest-body{display:flex;flex-direction:column;min-width:0;flex:1;gap:2px;}',
  '.dsha-suggest-name{color:var(--dsw-alias-label-primary);font-size:13px;}',
  '.dsha-suggest-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;}',
  '.dsha-suggest-actions{display:flex;gap:4px;flex:none;}',
  '.dsha-suggest-actions .dsha-btn{font-size:12px;padding:2px 8px;}',
  '.dsha-suggest-x{padding:2px 6px;}',
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

/** The detail's plain-text meta line: responsible plus the four business times, in the list
 * card's meta shape — pills are reserved for status, not for every fact in the header. */
function metaLine(responsible: string, times: Parameters<typeof timeParts>[0]) {
  const parts = (responsible.length > 0 ? [`责任 ${responsible}`] : []).concat(timeParts(times))
  return parts.length === 0 ? null : ce('p', { className: 'dsha-card-meta' }, parts.join(' · '))
}

function timeParts(times: { readonly promisedDeadline?: string; readonly forecastAt?: string; readonly nextCheckpoint?: string; readonly completedAt?: string }): string[] {
  const parts: string[] = []
  if (times.promisedDeadline !== undefined) parts.push(`承诺 ${humanTime(times.promisedDeadline)}`)
  if (times.forecastAt !== undefined) parts.push(`预测 ${humanTime(times.forecastAt)}`)
  if (times.nextCheckpoint !== undefined) parts.push(`核对 ${humanTime(times.nextCheckpoint)}`)
  if (times.completedAt !== undefined) parts.push(`完成 ${humanTime(times.completedAt)}`)
  return parts
}

/**
 * The desk page: header with counts, card list (matters then unclaimed), and the detail pane.
 * Read-only complete collection with distinct loading/missing/error/stale states; all colors
 * ride semantic aliases and the theme contract block.
 * @param props - Framework-bound projection hook and plain action callbacks.
 * @returns The desk page element.
 */
export function ProjectionPanel(props: ProjectionPanelProps): ReturnType<typeof ce> {
  const download = props.useProjection(value => value)
  const data = download.data
  const view = props.useStore(value => value)
  const selection = view.selected
  // 片 1: the capture row's in-flight state. The receipt is a DELIVERY fact, so it stops being
  // shown the moment the projection's revision moves past the submission — the ledger has
  // spoken, and whatever it says (a new fragment, a new matter) takes over the desk. While it is
  // shown, the row is deliberately NOT shaped like a matter or a fragment: the desk must never
  // claim content it cannot back.
  const receipt = view.captureReceipt
  // 片 1b: whose turn it is comes from the platform's SessionStatus, not from anything the desk
  // remembers — so a reload keeps it. The receipt answers "not in the ledger yet"; this answers
  // "who is being waited on".
  const sessionStatuses = props.useSessionStatus(value => value)
  const receiptStatus = receipt === null ? undefined : sessionStatuses.get(receipt.sessionId)
  // 261019: the send row now has a terminal state that is not the ledger. The action lanes
  // (先试跑/替我盯上) write no ledger entry by design, so waiting for a revision would leave the
  // row — and the desk's own input — shut forever. A watched turn that has ended settles it;
  // a session never seen running stays queued rather than being invented as finished.
  const phase = receipt === null
    ? undefined
    : capturePhase(receipt.observedRevision, data?.revision ?? 0, receiptStatus)
  const capturePending = phase === 'running' || phase === 'queued'
  const isActionLane = receipt?.lane === 'action'
  const PHASE_LABEL: Record<string, string> = {
    running: '等助手', queued: '已交给助手', suspended: '轮到我', settled: '它说完了',
  }
  const PHASE_DETAIL: Record<string, string> = {
    running: '它正在处理你这句话。',
    queued: '排着队，等它接手。',
    suspended: '助手在会话里问了话（等你回答）——点「去会话」接着答，桌面这边不会替你答。',
    settled: isActionLane
      ? '它跑完了，结论在会话里——桌面这边不会替你收下。'
      : '它说完了，但账本没有新东西——点「去会话」看它说了什么。',
  }
  const submitCapture = (): void => {
    const text = view.captureDraft.trim()
    if (text === '' || capturePending) return
    props.actions.setCaptureDraft('')
    props.onCapture(text)
  }
  const selected = selection?.kind === 'matter' ? data?.matters.find(matter => matter.id === selection.id) : undefined
  const selectedFragment = selection?.kind === 'fragment' ? data?.unclaimed.find(fragment => fragment.id === selection.id) : undefined
  // The biography's decision half: only the selected matter's own operations, newest first.
  const matterOps = selection?.kind === 'matter'
    ? (data?.receipts ?? []).filter(receipt => receipt.matterId === selection.id)
      .slice().sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    : []
  // The activity feed (history views ③): every operation newest first, grouped by the viewer's
  // local day, revealed progressively — the whole ledger is already downloaded, so revealing is
  // pure rendering. Entries whose matter is gone (or that touch none, matterId '') render inert.
  const activityEntries = (data?.receipts ?? []).slice().sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  const shownActivity = activityEntries.slice(0, Math.max(1, view.activityLimit))
  const titleOfMatter = (matterId: string): string => data?.matters.find(matter => matter.id === matterId)?.title ?? matterId
  const activityGroups: { key: string; label: string; entries: typeof shownActivity }[] = []
  for (const receipt of shownActivity) {
    const key = localDateKey(receipt.submittedAt)
    const group = activityGroups.at(-1)
    if (group !== undefined && group.key === key) group.entries.push(receipt)
    else activityGroups.push({ key, label: localDateLabel(receipt.submittedAt), entries: [receipt] })
  }
  const pendingProposals = data?.matters.reduce((count, matter) => count + matter.proposals.filter(proposal => proposal.status === 'pending').length, 0) ?? 0
  // 片 1 (261018 proactive):「它替你看过」— three honest rows from read-only sources, zero model
  // calls. The catalog namespace may not materialize (stage-0 finding: the subface inject kills
  // the client entry), so its absence degrades row 3 to an attribute marker, never a guess.
  // All-empty state renders nothing at all — the desk keeps today's silhouette.
  const catalogState: ProactiveCatalogState = props.useCatalog !== undefined
    ? props.useCatalog(value => value)
    : { status: 'unavailable' }
  const proactiveUi: ProactiveUiState = props.useProactiveUi !== undefined
    ? props.useProactiveUi(value => value)
    : { ignored: [], accepted: [] }
  const proactiveRows = deriveProactiveFace({
    ...(data !== undefined ? { projection: data } : {}),
    ...(catalogState.status === 'entries' ? { catalog: catalogState.entries } : {}),
    ...(proactiveUi.accepted.length > 0 ? { acceptedWatches: proactiveUi.accepted } : {}),
    now: new Date(),
  })
  const openSuggestions = PROACTIVE_SUGGESTIONS.filter(suggestion => !proactiveUi.ignored.includes(suggestion.id))
  const proactiveCatalogNote = proactiveRows.some(row => row.kind === 'next-look-unavailable')
  const proactiveVisible = proactiveRows.filter(row => row.kind !== 'next-look-unavailable')
  const lateNote = (lateByMs: number): string => {
    const hours = lateByMs / 3_600_000
    return hours >= 1 ? `${Math.round(hours)} 小时` : `${Math.max(1, Math.round(lateByMs / 60_000))} 分钟`
  }
  const proactiveFace = proactiveVisible.length === 0 ? null : ce('div', {
    className: 'dsha-proactive',
    'data-proactive-catalog': proactiveCatalogNote ? 'unavailable' : 'ok',
    role: 'status',
  },
    ...proactiveVisible.map(row => {
      if (row.kind === 'due-no-result') {
        return ce('div', { key: 'due', className: 'dsha-proactive-row dsha-proactive-due' },
          ce('span', {}, `${row.title} · 到期 ${row.daysOverdue} 天，账上没有结果${row.extraCount !== undefined ? `（另有 ${row.extraCount} 件同样到期）` : ''}`),
          ce('button', { className: 'dsha-btn', type: 'button', onClick: () => { props.actions.selectMatter(row.matterId) } }, '看这件事'))
      }
      if (row.kind === 'waiting-for-you') {
        const waiting: string[] = []
        if (row.pendingProposals > 0) waiting.push(`${row.pendingProposals} 条要确认`)
        if (row.unclaimed > 0) waiting.push(`${row.unclaimed} 条待认领`)
        if (row.openQuestions > 0) waiting.push(`${row.openQuestions} 句等你答`)
        return ce('div', { key: 'waiting', className: 'dsha-proactive-row' },
          ce('span', {}, `它在等你：${waiting.join(' · ')}`),
          ce('button', { className: 'dsha-btn', type: 'button', onClick: () => { props.actions.showList() } }, '去处理'))
      }
      if (row.kind === 'watch-mismatch') {
        // Q5: state the fact (no attribution) and offer the two honest ways out: retry the lane,
        // or forget this failed acceptance. Retrying without a forget made the row permanent
        // (261019) — a failed watch could only be re-failed, never acknowledged.
        return ce('div', { key: `mismatch-${row.title}`, className: 'dsha-proactive-row dsha-proactive-due' },
          ce('span', {}, `说了替你盯但没盯上：${row.title}`),
          ce('div', { className: 'dsha-proactive-actions' },
            props.onSuggestAction !== undefined
              ? ce('button', { className: 'dsha-btn', type: 'button', onClick: () => { props.onSuggestAction?.('watch', `retry:${row.title}`) } }, '再试一次')
              : null,
            props.onWatchForget !== undefined
              ? ce('button', { className: 'dsha-btn', type: 'button', 'aria-label': `忽略：${row.title}`, onClick: () => { props.onWatchForget?.(row.title) } }, '忽略')
              : null))
      }
      return ce('div', { key: 'next', className: 'dsha-proactive-row' },
        ce('span', {}, `它下次替你看：${row.title} · ${humanTime(row.nextAt)}${row.lateByMs !== undefined ? `（上次迟了 ${lateNote(row.lateByMs)}）` : ''}${row.duplicates !== undefined ? ` — 发现 ${row.duplicates} 条重复盯守` : ''}`),
        row.duplicates !== undefined && props.onOpenTasks !== undefined
          ? ce('button', { className: 'dsha-btn', type: 'button', onClick: props.onOpenTasks }, '去任务页')
          : null)
    }))
  // 片 2 (261018 proactive):「让它替你盯」— three named suggestions in the adjudicated ②③①
  // order, each with two actions through the desk's own delivery lane (a model round the
  // principal explicitly clicked), and an × that seals that suggestion for good (local only).
  // All dismissed → the whole block disappears; the desk keeps today's silhouette.
  const suggestFace = openSuggestions.length === 0 ? null : ce('div', { className: 'dsha-suggest', role: 'region', 'aria-label': '让它替你盯' },
    ce('div', { className: 'dsha-suggest-title' }, '让它替你盯'),
    ...openSuggestions.map(suggestion => ce('div', { key: suggestion.id, className: 'dsha-suggest-item' },
      ce('div', { className: 'dsha-suggest-body' },
        ce('span', { className: 'dsha-suggest-name' }, suggestion.name),
        ce('span', { className: 'dsha-suggest-hint' }, suggestion.hint)),
      ce('div', { className: 'dsha-suggest-actions' },
        ce('button', { className: 'dsha-btn', type: 'button', onClick: () => { props.onSuggestAction?.('trial', suggestion.id) } }, '先试跑一次'),
        ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => { props.onSuggestAction?.('watch', suggestion.id) } }, '替我盯上'),
        ce('button', { className: 'dsha-btn dsha-suggest-x', type: 'button', title: '不再提这条', 'aria-label': `忽略：${suggestion.name}`, onClick: () => { props.onSuggestDismiss?.(suggestion.id) } }, '×')))))
  const message = download.status === 'disconnected' ? '连接已断开，恢复连接后重新读取。'
    : download.status === 'loading' ? '正在读取桌面…'
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
      + (unclaimed.length > 0 ? ` · ${unclaimed.length} 条待认领` : '')
  // ⑧ of the K1/K2 accepted-limitation list (spec-card source verification 2026-10-10): the
  // desk ROOT is the scroll container — the list never scrolls itself — so the record path
  // rides the root's onScroll (board mode only: scrolling the activity feed must not corrupt
  // the board's saved position), and the restore path is this post-render DOM effect on the
  // root ref. The view store survives panel switches (the processing flow's auto-return
  // remounts the whole panel), the DOM does not; the guard keeps re-render invocations off a
  // live scroll position, and a principal who scrolled back to top has already zeroed the
  // store through onScroll. Activity mode always presents itself from the top.
  const restoreRootScroll = (element: { scrollTop: number } | null): void => {
    if (element === null) return
    if (view.mode === 'activity') {
      if (element.scrollTop !== 0) element.scrollTop = 0
      return
    }
    if (element.scrollTop === 0 && view.listScrollTop > 0) element.scrollTop = view.listScrollTop
  }
  return ce('main', {
    className: 'dsha-desk',
    'data-assistant-operating-desk': true,
    ref: restoreRootScroll,
    onScroll: (event: { currentTarget: { scrollTop: number } }) => {
      if (view.mode === 'board') props.actions.rememberListPosition(event.currentTarget.scrollTop)
    },
  },
    ce('style', {}, STYLES),
    ce('header', { className: 'dsha-head' },
      ce('div', {},
        ce('h1', { className: 'dsha-title' }, '你的桌面'),
        counts === undefined ? null : ce('div', { className: 'dsha-sub' }, counts)),
      ce('div', { className: 'dsha-actions' },
        ce('button', { className: 'dsha-btn', onClick: props.refreshProjection, disabled: download.status === 'loading', title: download.status === 'loading' ? '正在读取桌面…' : '重新读取桌面' }, '重新读取'),
        ce('button', { className: 'dsha-btn', onClick: props.onAsk }, '有问题？跟助手说'),
        ce('button', { className: 'dsha-btn dsha-btn-primary', onClick: props.onEntrust ?? props.onAsk }, '＋ 交代新事项'))),
    // 片 1 (261018 proactive):「它替你看过」sits BETWEEN the header and the capture row —
    // structural anchor, not line numbers (the two 261018 cards invalidate each other's anchors).
    // All-empty state renders nothing; each row carries at most one action (noise cap R2).
    proactiveFace,
    suggestFace,
    // 片 1 (261018): the desk's own capture row. The principal's intent to add something arises
    // WHILE looking at the desk, so the desk has to be able to take it — before this, the only
    // door was 「＋ 交代新事项」, which opens a conversation and takes the reminder surface away.
    // Two doors, and the copy says which weight each one carries.
    ce('div', { className: 'dsha-capture' },
      ce('input', {
        className: 'dsha-capture-input',
        type: 'text',
        value: view.captureDraft,
        placeholder: '有新的事，直接说…',
        'aria-label': '在桌面直接交代一件新事',
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
        ? ce('button', { className: 'dsha-btn', type: 'button', onClick: () => props.onOpenSession(receipt.sessionId) }, '去会话')
        : null,
      ce('p', { className: 'dsha-capture-hint' }, isActionLane
        ? '来自：桌面按钮 · 话已进会话日志'
        : '来自：桌面直接交代 · 话已进会话日志')) : null,
    // The desk's two top-level views as real tabs (principal UX direction, 2026-10-12): the
    // divider line makes the split legible, the active underline sits ON the line, and the
    // glyphs carry the memory — this is not another row of filter pills.
    data !== undefined ? ce('div', { className: 'dsha-tabs', role: 'tablist' },
      (['board', 'activity'] as const).map(mode => ce('button', {
        key: mode,
        type: 'button',
        role: 'tab',
        className: 'dsha-tab',
        'aria-selected': String(view.mode === mode),
        'data-on': String(view.mode === mode),
        onClick: () => props.actions.setMode(mode),
      }, glyphFor(mode), ce('span', {}, mode === 'board' ? '看板' : '流水')))) : null,
    download.status === 'disconnected' ? ce('p', { className: 'dsha-banner', role: 'status' }, message) : null,
    download.stale ? ce('p', { className: 'dsha-banner', role: 'status' }, '以下是上次读到的内容，尚未刷新。') : null,
    download.status === 'error' ? ce('p', { className: 'dsha-banner', role: 'alert' }, message) : null,
    download.status === 'loading' ? ce('p', { className: 'dsha-note', role: 'status' }, message) : null,
    data?.fixture ? ce('p', { className: 'dsha-note' }, '模拟资料，仅供验证界面。') : null,
    download.status === 'missing' ? ce('div', { className: 'dsha-empty' },
      ce(AssistantBrandMark, { size: 44 }),
      ce('p', { className: 'dsha-detail-hint' },
        download.status === 'missing' ? '还没有经营事项资料。交代一件试试——它会被记进权威账本，事事有着落。' : '还没有经营事项。交代一件试试——它会被记进权威账本，事事有着落。'))
      : view.mode === 'activity' && data !== undefined ? ce('section', { className: 'dsha-activity' },
        activityEntries.length === 0 ? ce('p', { className: 'dsha-detail-hint' }, '还没有做过任何动作——交代第一件事试试。') : null,
        ...activityGroups.map(group => ce('div', { key: group.key, className: 'dsha-activity-day' },
          ce('p', { className: 'dsha-activity-date' }, group.label),
          ...group.entries.map(receipt => {
            const known = receipt.matterId !== '' && data.matters.some(matter => matter.id === receipt.matterId)
            const entryLine = ce('span', { className: 'dsha-activity-line' },
              `${localTimeLabel(receipt.submittedAt)} ${OP_LABEL[receipt.kind ?? ''] ?? '操作'}${OP_STATUS_NOTE[receipt.status] !== undefined ? `（${OP_STATUS_NOTE[receipt.status]}）` : ''}${known ? ` · ${titleOfMatter(receipt.matterId)}` : ''}`)
            const quote = receipt.quote !== undefined ? ce('p', { className: 'dsha-op-quote' }, `「${receipt.quote}」`) : null
            return known
              ? ce('button', { key: receipt.operationId, type: 'button', className: 'dsha-activity-entry',
                  onClick: () => { props.actions.setMode('board'); props.actions.selectMatter(receipt.matterId) } }, entryLine, quote)
              : ce('div', { key: receipt.operationId, className: 'dsha-activity-entry' }, entryLine, quote)
          }))),
        activityEntries.length > shownActivity.length ? ce('button', { type: 'button', className: 'dsha-btn dsha-activity-more', onClick: () => props.actions.revealMoreActivity() }, '显示更早') : null)
      : ce('section', { className: 'dsha-matters', 'data-pane': view.pane },
        ce('div', { className: 'dsha-matter-list dsha-list', onScroll: (event: { currentTarget: { scrollTop: number } }) => props.actions.rememberListPosition(event.currentTarget.scrollTop) },
          matters.length > 0 ? ce('div', { className: 'dsha-filter' },
            (['all', 'active', 'settled'] as const).map(filter => ce('button', {
              key: filter,
              type: 'button',
              className: 'dsha-filter-chip',
              'data-on': String(view.filter === filter),
              onClick: () => props.actions.setFilter(filter),
            },
            glyphFor(filter),
            ce('span', {}, FILTER_LABEL[filter]),
            ce('span', { className: 'dsha-chip-count' }, String(filter === 'active'
              ? matters.filter(matter => matter.status === 'active').length
              : filter === 'settled' ? matters.filter(matter => matter.status !== 'active').length : matters.length))))) : null,
          visibleMatters.length === 0 && view.filter === 'settled' ? ce('p', { className: 'dsha-card-meta' },
            '还没有办结的事项——了结要在对话里说清楚「办完了」加上依据，它才会落到这里；关掉会话窗口不算。')
            : visibleMatters.length === 0 && view.filter === 'active' ? ce('p', { className: 'dsha-card-meta' }, '没有在办事项。') : null,
          visibleMatters.map(matter => ce('button', {
            key: matter.id,
            type: 'button',
            className: 'dsha-card',
            'data-selected': String(selection?.kind === 'matter' && selection.id === matter.id),
            onClick: () => props.actions.selectMatter(matter.id),
          },
          ce('span', { className: 'dsha-card-title' },
            statusChip(matter.status),
            ce('span', {}, matter.title)),
          matter.times.promisedDeadline !== undefined || matter.times.nextCheckpoint !== undefined
            ? ce('p', { className: 'dsha-card-meta' }, timeParts({
                ...(matter.times.promisedDeadline !== undefined ? { promisedDeadline: matter.times.promisedDeadline } : {}),
                ...(matter.times.nextCheckpoint !== undefined ? { nextCheckpoint: matter.times.nextCheckpoint } : {}),
              }).join(' · '))
            : null,
          matter.summary.length > 0 ? ce('p', { className: 'dsha-card-summary' }, matter.summary) : null,
          matter.proposals.some(proposal => proposal.status === 'pending') ? ce('p', { className: 'dsha-card-meta' }, chip('warn', '等你确认')) : null)),
          unclaimed.length > 0 ? ce('p', { className: 'dsha-list-label' }, '待认领——还没说清是哪件事，不猜') : null,
          unclaimed.map(fragment => ce('button', {
            key: fragment.id,
            type: 'button',
            className: 'dsha-card',
            'data-selected': String(selection?.kind === 'fragment' && selection.id === fragment.id),
            onClick: () => props.actions.selectFragment(fragment.id),
          },
          ce('span', { className: 'dsha-card-title' }, chip('warn', '待认领'), ce('span', {}, fragment.note)),
          ce('p', { className: 'dsha-card-meta' }, `来自 ${fragment.sessionId}`)))),
        ce('div', { className: 'dsha-matter-detail dsha-detail' },
          selectedFragment !== undefined ? ce('article', {},
            ce('div', { className: 'dsha-meta' },
              ce('button', { className: 'dsha-btn dsha-back', type: 'button', onClick: props.actions.showList }, '返回事项列表'),
              ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => props.onClaim(selectedFragment.id) }, '认领这件事'),
              // The fragment's other terminal (261018 片 0): every item selects into a
              // proportionate action, and "this is noise" is the one that used to have no door.
              ce('button', { className: 'dsha-btn', type: 'button', onClick: () => props.onDiscard(selectedFragment.id) }, '是噪音，不归户')),
            ce('h2', {}, chip('warn', '待认领'), ce('span', {}, selectedFragment.note)),
            ce('p', { className: 'dsha-card-meta' }, `来自 ${selectedFragment.sessionId} · 还没说清是哪件事——认领后原文与来源随附入账`))
          : selected !== undefined ? ce('article', {},
            ce('div', { className: 'dsha-meta' },
              ce('button', { className: 'dsha-btn dsha-back', type: 'button', onClick: props.actions.showList }, '返回事项列表'),
              // State decides the legal action (principal direction, 2026-10-12): an active
              // matter processes; a settled matter's only legal action is waking it — the
              // state machine never offers 「再处理」 on finished work.
              canProcess(selected.status)
                ? ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => props.onProcess?.(selected.id) }, '处理这件事')
                : ce('button', { className: 'dsha-btn dsha-btn-wake', type: 'button', onClick: () => props.onWake(selected.id) }, glyphFor('wake'), '唤醒这件事')),
            // Status rides the title line (same shape as the list card) so it stops reading as a
            // second action button beside 「处理这件事」; facts render as the plain meta line below.
            ce('h2', {}, statusChip(selected.status), ce('span', {}, selected.title)),
            metaLine(selected.responsible, selected.times),
            selected.summary.length > 0 ? ce('p', { className: 'dsha-card-summary' }, selected.summary) : null,
            selected.proposals.filter(proposal => proposal.status === 'pending').map(proposal => ce('div', { key: proposal.id, className: 'dsha-proposal' },
              chip('warn', `等你确认 · ${CHANGE_LABEL[proposal.kind] ?? proposal.kind}`))),
            selected.evidence.length === 0 ? ce('p', { className: 'dsha-card-summary' }, '暂无可核对依据。')
              : ce('ul', { className: 'dsha-evidence' }, ...selected.evidence.map(item => ce('li', { key: item.id },
                ce('p', {}, item.note),
                ce('small', {}, `${item.sessionId}${item.eventId !== undefined ? ` / ${item.eventId}` : ''}${item.quote !== undefined && item.quote !== item.note ? ` ·「${item.quote}」` : ''}`)))),
            // The biography's decision half: this matter's own operations, newest first — labels,
            // the submitter's words and the source session (desk history views, card 261012).
            matterOps.length > 0 ? ce('section', { className: 'dsha-ops' },
              ce('p', { className: 'dsha-ops-title' }, '动作'),
              ...matterOps.map(op => ce('div', { key: op.operationId, className: 'dsha-op' },
                ce('p', { className: 'dsha-op-line' },
                  `${OP_LABEL[op.kind ?? ''] ?? '操作'}${OP_STATUS_NOTE[op.status] !== undefined ? `（${OP_STATUS_NOTE[op.status]}）` : ''} · ${humanTime(op.submittedAt)}`),
                op.quote !== undefined ? ce('p', { className: 'dsha-op-quote' }, `「${op.quote}」`) : null,
                ce('small', { className: 'dsha-op-src' }, op.sessionId)))) : null)
          : selection === null ? ce('p', { className: 'dsha-detail-hint' }, '选择一项查看详情。')
          : selection.kind === 'fragment' ? ce('p', { className: 'dsha-detail-hint' }, '所选片段不在当前投影中。')
          : ce('p', { className: 'dsha-detail-hint' }, '所选事项不在当前投影中。'))),
  )
}
