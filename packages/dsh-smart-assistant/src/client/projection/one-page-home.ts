/**
 * The one-page home: the principal's default surface.
 *
 * Why this exists (2026-10-23): the ledger desk opened as a dashboard — 14 controls on an empty
 * home, before any value existed — and the one card that explained "what do I say first" was
 * unreachable. The target shape is a single page: ask one question while there is nothing, show
 * one page while there is something, and keep exactly one way to add another thing. "全部" opens
 * the human brief list; the old board (filters, activity, suggestions) sits behind "完整看板" and
 * is not the home.
 *
 * This component renders only the default surface. It reads the same projection hooks, view store
 * and lane surface as `ProjectionPanel` (the renderer binds hooks at the top level), so the entry
 * can swap the two without a second data path. The three page actions are v0 routes: "改一改"
 * opens the matter conversation, the other two send a page-action line and the assistant lands the
 * ledger write. A direct host action route is a later slice.
 *
 * @module dsh-smart-assistant/client/projection/one-page-home
 */

import { createElement as ce, reactSurface } from '../chrome/runtime'
import { AssistantBrandMark } from '../chrome/brand'
import { deriveCaptureView } from '../../domain/desk/desk-capture-view'
import { humanTime } from '../chrome/format'
import { patchDesk, useDesk } from '../rooms/room-data-core'
import { reloadDesk } from '../rooms/room-data-io'
import type { ProjectionPanelProps } from './projection-panel'
import type { OperatingMatter } from './operating-projection'

/** The three one-tap examples on an empty home; they fill the input, never send it. */
const EXAMPLES = ['下季度销售掉了 20%', '这个报价接不接', '老客户要不要涨价'] as const

const STATUS_LABEL: Record<string, string> = { active: '在办', completed: '已完成', abandoned: '已放弃' }

const STYLES = [
  '.dsha-home{display:flex;flex-direction:column;gap:16px;padding:28px clamp(20px,6vw,72px) 40px;height:100%;overflow-y:auto;box-sizing:border-box;}',
  '.dsha-home-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}',
  '.dsha-home-title{margin:0;font-size:22px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-home-links{margin-left:auto;display:flex;gap:14px;align-items:baseline;}',
  '.dsha-home-link{border:0;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;padding:2px 0;}',
  '.dsha-home-link:hover{color:var(--dsw-alias-label-primary);}',
  '.dsha-home-ask{width:min(720px,100%);margin:7vh auto 0;display:flex;flex-direction:column;gap:14px;}',
  '.dsha-home-q{margin:0;font-size:24px;line-height:1.5;font-weight:500;color:var(--dsw-alias-label-primary);}',
  '.dsha-home-examples{display:flex;gap:8px;flex-wrap:wrap;}',
  '.dsha-home-chip{border:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer;}',
  '.dsha-home-chip:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
  '.dsha-home-input{display:flex;gap:8px;align-items:center;border:1px solid var(--dsha-accent);border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-base);}',
  '.dsha-home-input input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:15px;color:var(--dsw-alias-label-primary);min-width:0;}',
  '.dsha-home-submit{border:0;border-radius:8px;padding:7px 16px;background:var(--dsha-accent);color:var(--dsha-on-accent);font:inherit;font-size:14px;font-weight:600;cursor:pointer;flex:none;}',
  '.dsha-home-submit:disabled{opacity:.45;cursor:default;}',
  '.dsha-home-hint{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-home-page{width:min(780px,100%);margin:0 auto;border:0.5px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:22px 24px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;}',
  '.dsha-home-page-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}',
  '.dsha-home-page-title{margin:0;font-size:20px;line-height:1.45;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-home-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-home-summary{margin:0;font-size:15px;line-height:1.75;color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere;}',
  '.dsha-home-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;}',
  '.dsha-home-act{border:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:8px;padding:7px 14px;font:inherit;font-size:14px;cursor:pointer;}',
  '.dsha-home-act:hover{background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-home-act-primary{background:var(--dsha-accent-tint);color:var(--dsha-accent);border:0;font-weight:600;}',
  '.dsha-home-act-primary:hover{background:var(--dsha-accent-tint);}',
  '.dsha-home-basis-toggle{align-self:flex-start;border:0;background:none;padding:0;font:inherit;font-size:12px;color:var(--dsw-alias-label-tertiary);cursor:pointer;text-decoration:underline;}',
  '.dsha-home-basis{display:flex;flex-direction:column;gap:8px;border-left:2px solid var(--dsw-alias-border-l3);padding:2px 0 2px 12px;}',
  '.dsha-home-basis-title{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-home-basis-line{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-home-working{width:min(780px,100%);margin:0 auto;border:1px dashed var(--dsw-alias-border-l3);border-radius:12px;background:var(--dsw-alias-bg-layer-2);padding:14px 16px;display:flex;flex-direction:column;gap:6px;}',
  '.dsha-home-working-line{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dsw-alias-label-secondary);}',
  '.dsha-home-pulse{width:8px;height:8px;border-radius:50%;background:var(--dsha-accent);flex:none;}',
  '.dsha-home-said{margin:0;font-size:14px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-home-question{width:min(780px,100%);margin:0 auto;border:1px solid var(--dsha-warn);border-radius:12px;background:var(--dsha-warn-tint);padding:14px 16px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;}',
  '.dsha-home-question p{margin:0;font-size:14px;color:var(--dsha-warn);}',
  '.dsha-home-rest{width:min(780px,100%);margin:0 auto;display:flex;align-items:baseline;gap:10px;}',
  '.dsha-home-rest-text{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-home-note{width:min(780px,100%);margin:0 auto;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-home-error{width:min(780px,100%);margin:0 auto;font-size:13px;color:var(--dsha-warn);background:var(--dsha-warn-tint);border-radius:8px;padding:8px 12px;}',
].join('')

function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status
}

/** The page's review line: the next checkpoint first, then the promise; completed shows the date. */
function pageTime(matter: OperatingMatter): string {
  const times = matter.times
  if (times.nextCheckpoint !== undefined) return `复查 ${humanTime(times.nextCheckpoint)}`
  if (times.promisedDeadline !== undefined) return `承诺 ${humanTime(times.promisedDeadline)}`
  return ''
}

/**
 * The home: empty ask, working receipt, pending question, one page, and one input.
 * @param props - The same hook/actions/surface contract the projection panel receives.
 * @returns The home element.
 */
export function OnePageHome(props: ProjectionPanelProps & { onOpenAll: () => void, onOpenRecords?: () => void, onOpenDebug?: () => void }): ReturnType<typeof ce> {
  const { useEffect, useState } = reactSurface()
  const openRecords = (): void => {
    if (props.onOpenRecords !== undefined) props.onOpenRecords()
    else props.surface.lanes.onOpenRecords?.()
  }
  const [showBasis, setShowBasis] = useState(false)
  const [actionError, setActionError] = useState<string | undefined>(undefined)
  const download = props.useProjection(value => value)
  const data = download.data
  const view = props.useStore(value => value)
  const sessionStatuses = props.useSessionStatus(value => value)
  const walk = useDesk()
  const draftCount = (walk.data?.knowledge ?? []).filter(page => page.status === 'draft').length
  const approvalCard = draftCount > 0
    ? ce('div', { className: 'dsha-home-question', role: 'status' },
      ce('p', {}, `${String(draftCount)} 页知识草稿等你审批——批准后才会成为它的判断依据。`),
      ce('button', {
        className: 'dsha-home-act', type: 'button',
        onClick: () => {
          patchDesk({ focusKnowledge: 'drafts' })
          openRecords()
        },
      }, '去审批'))
    : null
  const receipt = view.captureReceipt
  const captureView = deriveCaptureView({
    receipt,
    revision: data?.revision ?? 0,
    statuses: sessionStatuses,
  })
  const capturePending = captureView.pending
  const questionSession = captureView.questionSessions[0]
  // While a capture/action is in flight, the ledger can already hold the page long before the
  // model's turn ends (observed 2026-10-23: the matter landed in ~1 minute, the turn stayed busy).
  // Poll the projection so the page appears as soon as it is real; the interval stops when the
  // receipt resolves or the panel unmounts.
  useEffect(() => {
    if (receipt === null || captureView.phase === 'resolved') return
    const timer = setInterval(() => { props.surface.lanes.refreshProjection() }, 4000)
    return () => { clearInterval(timer) }
  }, [receipt?.requestId, captureView.phase])
  // The approval card reads the rooms route, not the projection. A page action can promote a
  // memo after the projection revision has already moved, so the projection poll's end is not a
  // safe stopping point: keep reloading the rooms for the turn's realistic tail (observed
  // 2026-10-23: the memo was promoted, but the card still said "1 draft" after 160s).
  useEffect(() => {
    if (receipt === null) return
    const startedAt = Date.now()
    const timer = setInterval(() => {
      reloadDesk()
      if (Date.now() - startedAt > 180_000) clearInterval(timer)
    }, 4000)
    reloadDesk()
    return () => { clearInterval(timer) }
  }, [receipt?.requestId])
  const matters = data?.matters ?? []
  const unclaimed = data?.unclaimed ?? []
  const selectedMatter = view.selected?.kind === 'matter'
    ? matters.find(matter => matter.id === view.selected?.id)
    : undefined
  const current = selectedMatter
    ?? matters.find(matter => matter.status === 'active')
    ?? matters[0]
  const hasWork = matters.length > 0 || unclaimed.length > 0
  // A home with history but no open work is the steady empty state, not "still loading" and not
  // the fresh-ask. Receipts are work history; room rows cover a folder whose ledger is empty.
  const roomRows = (rows: readonly unknown[] | undefined, count: number | undefined): number =>
    (rows?.length ?? 0) + (count ?? 0)
  const hasHistory = (data?.receipts ?? []).length > 0 || (walk.data !== undefined && (
    roomRows(walk.data.memories, walk.data.counts?.memories)
    + roomRows(walk.data.knowledge, (walk.data.counts?.knowledgeStable ?? 0) + (walk.data.counts?.knowledgeDraft ?? 0))
    + roomRows(walk.data.skills, walk.data.counts?.skills)
    + roomRows(walk.data.research, walk.data.counts?.threads)
  ) > 0)
  const empty = download.status === 'missing' || (data !== undefined && !hasWork)
  const fresh = !hasHistory
  const working = receipt !== null && captureView.phase !== 'resolved'
  const deliver = (text: string, source: 'home' | 'page-action'): void => {
    setActionError(undefined)
    const result = props.surface.lanes.onCapture(text, { source })
    if (result !== undefined) {
      void result.then(sessionId => {
        if (sessionId === undefined) setActionError('这次没送出去，再试一次。')
      }).catch(() => { setActionError('这次没送出去，再试一次。') })
    }
  }
  const submit = (): void => {
    const text = view.captureDraft.trim()
    if (text === '' || capturePending) return
    props.actions.setCaptureDraft('')
    deliver(text, 'home')
  }
  const act = (instruction: string): void => {
    if (current === undefined || capturePending) return
    deliver(`关于「${current.title}」：${instruction}`, 'page-action')
  }
  const inputRow = (placeholder: string): ReturnType<typeof ce> => ce('div', { className: 'dsha-home-input' },
    ce('input', {
      type: 'text',
      value: view.captureDraft,
      placeholder,
      'aria-label': '跟助手说一件事',
      disabled: capturePending,
      onInput: (event: { target: { value: string } }) => props.actions.setCaptureDraft(event.target.value),
      onKeyDown: (event: { key: string, preventDefault: () => void }) => {
        if (event.key === 'Enter') { event.preventDefault(); submit() }
      },
    }),
    ce('button', {
      className: 'dsha-home-submit',
      type: 'button',
      disabled: capturePending || view.captureDraft.trim() === '',
      onClick: submit,
    }, capturePending ? '交给它了' : '交给它'))
  const workingCard = working && receipt !== null
    ? ce('div', { className: 'dsha-home-working', role: 'status' },
      ce('div', { className: 'dsha-home-working-line' },
        ce('span', { className: 'dsha-home-pulse' }),
        ce('span', {}, captureView.phase === 'suspended' ? '它在会话里等你处理' : '我在办这件事，大约一分钟')),
      ce('p', { className: 'dsha-home-said' }, receipt.label ?? `「${receipt.text}」`),
      captureView.phase === 'suspended'
        ? ce('button', {
          className: 'dsha-home-act', type: 'button',
          onClick: () => props.surface.lanes.onOpenSession(receipt.sessionId),
        }, '去会话回答')
        : null)
    : null
  const questionCard = questionSession !== undefined
    ? ce('div', { className: 'dsha-home-question' },
      ce('p', {}, '它在等你处理——答完或批完才会继续往下办。'),
      ce('button', {
        className: 'dsha-home-act', type: 'button',
        onClick: () => props.surface.lanes.onOpenSession(questionSession),
      }, '去会话处理'))
    : null
  const basisLines = (matter: OperatingMatter): ReturnType<typeof ce>[] =>
    matter.evidence.length === 0
      ? [ce('p', { className: 'dsha-home-basis-line' }, '还没有可核对的依据——这一页的判断来自你给的话。')]
      : matter.evidence.slice(0, 5).map(item => ce('p', { key: item.id, className: 'dsha-home-basis-line' },
        `${item.note}${item.quote !== undefined && item.quote !== item.note ? ` ·「${item.quote}」` : ''} · ${item.sessionId}${item.eventId !== undefined ? ` / ${item.eventId}` : ''}`))
  const page = current !== undefined
    ? ce('article', { className: 'dsha-home-page', 'data-one-page': '' },
      ce('div', { className: 'dsha-home-page-head' },
        ce('h2', { className: 'dsha-home-page-title' }, current.title),
        ce('span', { className: 'dsha-home-meta' },
          `${statusLabel(current.status)}${pageTime(current) === '' ? '' : ` · ${pageTime(current)}`}`)),
      current.summary.trim() === ''
        ? ce('p', { className: 'dsha-home-summary' }, '这一页还没有内容——跟助手说一句，它来补。')
        : ce('p', { className: 'dsha-home-summary' }, current.summary),
      ce('div', { className: 'dsha-home-actions' },
        ce('button', { className: 'dsha-home-act dsha-home-act-primary', type: 'button', disabled: capturePending, onClick: () => act('就按这页的建议办：把这页的决策备忘批准为 stable（本人已明确同意），记下结果，并按页上的复查日设好核对点。') }, '就这么办'),
        ce('button', { className: 'dsha-home-act', type: 'button', disabled: capturePending, onClick: () => props.surface.lanes.onProcess(current.id) }, '改一改'),
        ce('button', { className: 'dsha-home-act', type: 'button', disabled: capturePending, onClick: () => act('先放着，设一个一周后的复查日。') }, '先放着')),
      ce('button', {
        className: 'dsha-home-basis-toggle', type: 'button',
        'aria-expanded': String(showBasis),
        onClick: () => setShowBasis(!showBasis),
      }, showBasis ? '收起依据' : '看依据'),
      showBasis
        ? ce('section', { className: 'dsha-home-basis', 'data-one-page-basis': '' },
          ce('p', { className: 'dsha-home-basis-title' }, '依据'),
          ...basisLines(current),
          ce('button', {
            className: 'dsha-home-basis-toggle', type: 'button',
            onClick: () => openRecords(),
          }, '打开它记下的 →'))
        : null)
    : null
  const fragment = current === undefined ? unclaimed[0] : undefined
  const fragmentCard = fragment !== undefined
    ? ce('article', { className: 'dsha-home-page', 'data-one-page-fragment': '' },
      ce('div', { className: 'dsha-home-page-head' },
        ce('h2', { className: 'dsha-home-page-title' }, '有一条还没归户的事'),
        ce('span', { className: 'dsha-home-meta' }, `来自 ${fragment.sessionId}`)),
      ce('p', { className: 'dsha-home-summary' }, fragment.note),
      ce('div', { className: 'dsha-home-actions' },
        ce('button', {
          className: 'dsha-home-act dsha-home-act-primary', type: 'button', disabled: capturePending,
          onClick: () => props.surface.lanes.onClaim(fragment.id),
        }, '看看它是什么事')))
    : null
  const steady = ce('section', { className: 'dsha-home-ask' },
    ce('p', { className: 'dsha-home-q' }, '今天没有要你拍板的。'),
    ce('p', { className: 'dsha-home-hint' }, '有新的事，直接说一句；它会先给你一版。'))
  const rest = matters.length > 1
    ? ce('div', { className: 'dsha-home-rest' },
      ce('span', { className: 'dsha-home-rest-text' }, `还有 ${String(matters.length - 1)} 件在账上`),
      ce('button', { className: 'dsha-home-link', type: 'button', onClick: () => props.onOpenAll() }, '看全部 →'))
    : null
  return ce('main', { className: 'dsha-home', 'data-assistant-one-page-home': true },
    ce('style', {}, STYLES),
    ce('header', { className: 'dsha-home-head' },
      ce('h1', { className: 'dsha-home-title' }, '今天'),
      ce('div', { className: 'dsha-home-links' },
        matters.length === 0
          ? null
          : ce('button', { className: 'dsha-home-link', type: 'button', onClick: () => props.onOpenAll() }, `全部（${String(matters.length)}）`),
        ce('button', { className: 'dsha-home-link', type: 'button', onClick: () => openRecords() }, '它记下的'),
        props.onOpenDebug === undefined ? null : ce('button', { className: 'dsha-home-link', type: 'button', onClick: () => { props.onOpenDebug?.() } }, '开发调试'))),
    download.status === 'error' ? ce('p', { className: 'dsha-home-error', role: 'alert' }, '桌面读取失败，重试或直接跟助手说。') : null,
    download.stale ? ce('p', { className: 'dsha-home-note' }, '以下是上次读到的内容，尚未刷新。') : null,
    data?.fixture ? ce('p', { className: 'dsha-home-note' }, '模拟资料，仅供验证界面。') : null,
    workingCard,
    approvalCard,
    questionCard,
    actionError !== undefined ? ce('p', { className: 'dsha-home-error', role: 'alert' }, actionError) : null,
    working && empty
      ? null
      : empty
        ? fresh
          ? ce('section', { className: 'dsha-home-ask' },
            ce(AssistantBrandMark, { size: 40 }),
            ce('p', { className: 'dsha-home-q' }, '最近哪件事让你拿不准？'),
            ce('div', { className: 'dsha-home-examples' },
              ...EXAMPLES.map(example => ce('button', {
                key: example, className: 'dsha-home-chip', type: 'button',
                onClick: () => props.actions.setCaptureDraft(example),
              }, example))),
            inputRow('说一句就行…'),
            ce('p', { className: 'dsha-home-hint' }, '说一句就行，它先给你一版，再跟你把它改对。'))
          : steady
        : current !== undefined
          ? page
          : fragmentCard ?? ce('p', { className: 'dsha-home-note' }, '正在读取桌面…'),
    empty && fresh ? null : inputRow('还有别的事？说一句…'),
    rest)
}
