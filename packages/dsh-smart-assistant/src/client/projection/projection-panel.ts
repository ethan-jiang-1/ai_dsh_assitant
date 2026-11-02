/** Global projection presentation. Renderer supplies the sole live-data hook. */
import { createElement as ce, reactSurface } from '../chrome/runtime'
import { AssistantBrandMark } from '../chrome/brand'
import type { CaptureStatus } from '../../domain/desk/desk-process'
import { useUiMode } from '../chrome/ui-mode'
import { deriveCaptureView } from '../../domain/desk/desk-capture-view'
import { countPendingProposals, deriveActivityView } from '../../domain/desk/desk-activity-view'
import { localDateKey, localDateLabel } from '../chrome/format'
import { ProactiveRows, SuggestionStrip, PROACTIVE_STYLES } from './proactive-strip'
import { SimpleFace } from './simple-face'
import { ActivityFace } from './activity-face'
import { MatterBoard, chip, glyphFor } from './matter-board'
import { PANEL_STYLES } from './panel-styles'
import { RETURN_VIEW_KEY, type OperatingReceiptPage } from './panel-shared'
import type { ProactiveUiState } from '../proactive/proactive-face'
import type { ProactiveCatalogState } from '../proactive/proactive-face-source'
import type { ProjectionDownload } from './projection-reader'
import type { DeskSurface } from './desk-surface'
import type { ProjectionView, ProjectionViewBoundActions } from './projection-view'
import type { DeskTranslate } from '../chrome/locales'



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

/** Inline stroke glyphs for the desk's switches — self-contained (no vendor icon components in
 *  this standalone bundle), currentColor keeps them on the theme. Builders, not values: `ce`
 *  resolves its underlying createElement lazily, so glyphs must be built at render time. */
function restoreViewportScroll(element: HTMLElement | null): void {
  if (element === null) return
  const target = Number(element.dataset.restoreScrollTop ?? 0)
  if (Number.isFinite(target) && element.scrollTop !== target) element.scrollTop = target
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
    ce('style', {}, PANEL_STYLES + PROACTIVE_STYLES),
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
