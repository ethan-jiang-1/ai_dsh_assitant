/** Global projection presentation. Renderer supplies the sole live-data hook. */
import { createElement as ce } from './runtime'
import { AssistantBrandMark } from './brand'
import type { ProjectionDownload } from './projection-reader'
import type { ProjectionView } from './projection-view'

/** Structural mirror of the pinned PropsHooks snapshot selector (no component subscriptions). */
export interface ProjectionPanelProps {
  useProjection<S>(select: (value: ProjectionDownload) => S): S
  useStore<S>(select: (view: ProjectionView) => S): S
  actions: { selectMatter(id: string): void; selectFragment(id: string): void; showList(): void; rememberListPosition(position: number): void }
  refreshProjection(): void
  onAsk(): void
  /** The 「＋ 交代新事项」 entry. Falls back to `onAsk` where no intake path is wired (tests,
   *  environments without the desk path store) so the button never goes dead. */
  onEntrust?(): void
  /** Open the explicit processing path for one matter (bound to the entry's processMatter). */
  onProcess(matterId: string): void
  /** Open the explicit claim path for one unclaimed fragment (bound to the entry's claimFragment). */
  onClaim(fragmentId: string): void
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

const STYLES = [
  '.dsha-desk{display:flex;flex-direction:column;gap:16px;padding:20px 24px;overflow-y:auto;min-width:0;container-type:inline-size;height:100%;box-sizing:border-box;}',
  '.dsha-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
  '.dsha-title{margin:0;font-size:19px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-sub{font-size:13px;color:var(--dsw-alias-label-secondary);}',
  '.dsha-actions{margin-left:auto;display:flex;gap:8px;}',
  '.dsha-btn{border:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;}',
  '.dsha-btn:hover{background:var(--dsw-alias-interactive-bg-hover-accent);}',
  '.dsha-btn-primary{background:var(--dsha-accent-tint);color:var(--dsha-accent);border:0;}',
  '.dsha-banner{margin:0;font-size:13px;color:var(--dsha-warn);background:var(--dsha-warn-tint);border:0;border-radius:8px;padding:8px 12px;}',
  '.dsha-note{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:0;border-radius:8px;padding:8px 12px;}',
  '.dsha-matters{display:grid;grid-template-columns:minmax(260px,2fr) minmax(0,3fr);gap:16px;align-items:start;}',
  '.dsha-list{display:flex;flex-direction:column;gap:8px;min-width:0;}',
  '.dsha-list-label{font-size:12px;color:var(--dsw-alias-label-tertiary);margin:4px 0 0;}',
  '.dsha-card{display:block;width:100%;text-align:left;background:var(--dsw-alias-bg-layer-1);border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;cursor:pointer;font:inherit;}',
  '.dsha-card:hover{background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-card[data-selected="true"]{border:1px solid var(--dsha-accent);background:var(--dsha-accent-tint);}',
  '.dsha-card-title{display:flex;align-items:center;gap:8px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-card-meta{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;}',
  '.dsha-card-summary{margin:4px 0 0;font-size:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-chip{display:inline-block;flex:none;font-size:12px;line-height:18px;border-radius:999px;padding:0 8px;}',
  '.dsha-chip-active{background:var(--dsha-accent-tint);color:var(--dsha-accent);}',
  '.dsha-chip-completed{background:var(--dsw-alias-state-success-secondary);color:var(--dsw-alias-state-success-primary);}',
  '.dsha-chip-abandoned{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);}',
  '.dsha-chip-warn{background:var(--dsha-warn-tint);color:var(--dsha-warn);}',
  '.dsha-detail{min-width:0;border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;overflow-wrap:anywhere;}',
  '.dsha-detail h2{display:flex;align-items:center;gap:8px;margin:8px 0 4px;font-size:17px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-detail h2 span{overflow-wrap:anywhere;min-width:0;}',
  '.dsha-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px;}',
  '.dsha-proposal{margin:10px 0;background:var(--dsha-warn-tint);border:0;border-radius:8px;padding:10px 12px;}',
  '.dsha-evidence{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}',
  '.dsha-evidence li{border-left:0.5px solid var(--dsw-alias-border-l3);padding-left:10px;}',
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

/** A full machine timestamp (T separator, seconds, zone offset) reads as noise on the desk.
 * Zone-bearing values (Z or ±HH:MM) render in the viewer's local wall time — the ledger stamps
 * completion in UTC while deadlines/checkpoints carry an explicit offset. Zone-less values
 * (bare dates, naive datetimes) stay verbatim: their wall-clock intent is already local. */
function humanTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const at = new Date(value)
    if (!Number.isNaN(at.getTime())) {
      const pad = (n: number): string => String(n).padStart(2, '0')
      return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
    }
  }
  const naive = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  return naive === null ? value : `${naive[1]} ${naive[2]}`
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
  const selected = selection?.kind === 'matter' ? data?.matters.find(matter => matter.id === selection.id) : undefined
  const selectedFragment = selection?.kind === 'fragment' ? data?.unclaimed.find(fragment => fragment.id === selection.id) : undefined
  const pendingProposals = data?.matters.reduce((count, matter) => count + matter.proposals.filter(proposal => proposal.status === 'pending').length, 0) ?? 0
  const message = download.status === 'disconnected' ? '连接已断开，恢复连接后重新读取。'
    : download.status === 'loading' ? '正在读取桌面…'
    : download.status === 'missing' ? '还没有经营事项资料。'
    : download.status === 'error' ? (errors[download.error ?? 'download-failed'] ?? errors['download-failed']) : undefined
  const matters = data?.matters ?? []
  const unclaimed = data?.unclaimed ?? []
  const counts = data === undefined ? undefined
    : `${matters.filter(matter => matter.status === 'active').length} 件在办`
      + (pendingProposals > 0 ? ` · ${pendingProposals} 条等你确认` : '')
      + (unclaimed.length > 0 ? ` · ${unclaimed.length} 条待认领` : '')
  // ⑧ of the K1/K2 accepted-limitation list (spec-card source verification 2026-10-10): the
  // desk ROOT is the scroll container — the list never scrolls itself — so the record path
  // rides the root's onScroll, and the restore path is this post-render DOM effect on the
  // root ref. The view store survives panel switches (the processing flow's auto-return
  // remounts the whole panel), the DOM does not; the guard keeps re-render invocations off a
  // live scroll position, and a principal who scrolled back to top has already zeroed the
  // store through onScroll.
  const restoreRootScroll = (element: { scrollTop: number } | null): void => {
    if (element !== null && element.scrollTop === 0 && view.listScrollTop > 0) element.scrollTop = view.listScrollTop
  }
  return ce('main', {
    className: 'dsha-desk',
    'data-assistant-operating-desk': true,
    ref: restoreRootScroll,
    onScroll: (event: { currentTarget: { scrollTop: number } }) => props.actions.rememberListPosition(event.currentTarget.scrollTop),
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
    download.status === 'disconnected' ? ce('p', { className: 'dsha-banner', role: 'status' }, message) : null,
    download.stale ? ce('p', { className: 'dsha-banner', role: 'status' }, '以下是上次读到的内容，尚未刷新。') : null,
    download.status === 'error' ? ce('p', { className: 'dsha-banner', role: 'alert' }, message) : null,
    download.status === 'loading' ? ce('p', { className: 'dsha-note', role: 'status' }, message) : null,
    data?.fixture ? ce('p', { className: 'dsha-note' }, '模拟资料，仅供验证界面。') : null,
    download.status === 'missing' ? ce('div', { className: 'dsha-empty' },
      ce(AssistantBrandMark, { size: 44 }),
      ce('p', { className: 'dsha-detail-hint' },
        download.status === 'missing' ? '还没有经营事项资料。交代一件试试——它会被记进权威账本，事事有着落。' : '还没有经营事项。交代一件试试——它会被记进权威账本，事事有着落。'))
      : ce('section', { className: 'dsha-matters', 'data-pane': view.pane },
        ce('div', { className: 'dsha-matter-list dsha-list', onScroll: (event: { currentTarget: { scrollTop: number } }) => props.actions.rememberListPosition(event.currentTarget.scrollTop) },
          matters.map(matter => ce('button', {
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
              ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => props.onClaim(selectedFragment.id) }, '认领这件事')),
            ce('h2', {}, chip('warn', '待认领'), ce('span', {}, selectedFragment.note)),
            ce('p', { className: 'dsha-card-meta' }, `来自 ${selectedFragment.sessionId} · 还没说清是哪件事——认领后原文与来源随附入账`))
          : selected !== undefined ? ce('article', {},
            ce('div', { className: 'dsha-meta' },
              ce('button', { className: 'dsha-btn dsha-back', type: 'button', onClick: props.actions.showList }, '返回事项列表'),
              ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => props.onProcess?.(selected.id) }, '处理这件事')),
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
                ce('small', {}, `${item.sessionId}${item.eventId !== undefined ? ` / ${item.eventId}` : ''}${item.quote !== undefined && item.quote !== item.note ? ` ·「${item.quote}」` : ''}`)))))
          : selection === null ? ce('p', { className: 'dsha-detail-hint' }, '选择一项查看详情。')
          : selection.kind === 'fragment' ? ce('p', { className: 'dsha-detail-hint' }, '所选片段不在当前投影中。')
          : ce('p', { className: 'dsha-detail-hint' }, '所选事项不在当前投影中。'))),
  )
}
