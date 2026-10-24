/**
 * The first mile and the composer's docks: the blank-session strip above the composer and the
 * pending-approval banner. The session desk summary bar that used
 * to ride here is retired with the session desk itself (one 桌面 = the ledger's, 2026-10-11).
 * These are the surfaces a first-time principal (and every session's composer) sees; the
 * hero MARK itself lives in brand.ts.
 *
 * @module dsh-smart-assistant/client/first-mile
 */

import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { RoomKind } from './contracts'
import { patchDesk, useDesk } from '../rooms/room-data-core'
import { createElement } from './runtime'
import { MARK_TEAL } from './theme'
import type {} from './locales'

/**
 * The first-open strip above the composer, for a session that has no content yet: it
 * answers the two questions the walkthrough found unanswered — what do I say first, and
 * what can this thing do — and offers the one surface worth visiting before there is any
 * content (the desk, whose own empty state explains what it becomes).
 *
 * The blank check is OURS, not the owner's: the vendor renders this dock for every
 * session (`zone` is defined whenever session+input exist; only the hero chrome is
 * hero-gated — ConversationContent.tsx), so without this line a first-open strip would
 * sit above the composer of every ongoing conversation. A blank session is the owner
 * data's own `session.blank`.
 * @param props - the dock's owner data and injected opener.
 * @returns the strip element, or null once the session has any content.
 */
/**
 * The rich desk landing for the blank (pre-first-message) phase (2026-10-06,
 * [desk-primary-view](../../../../../notes/archived/2026-10-06-desk-primary-view.md)). This replaces the old thin first-mile strip with a substantial card that fills
 * the gap between the vendor hero and the composer — the plugin boundary's best shot at making
 * the first screen carry real content.
 *
 * Two modes:
 * - fresh folder (no desk file, no memories): the Day-0 landing — what the arc is, what you'll
 *   have after three answers, and one start button (the assistant asks first, not you).
 * - folder with a desk: the compact desk summary — what needs your call, what's due, what's
 *   blocking — with one-click actions, so the first screen IS the working surface.
 *
 * Vendor seam facts this rides: `conversation.input.dock` is a list slot with no height limit,
 * rendered between HeroShell and the composer bar in the blank phase (ConversationContent.tsx:165-168).
 */
interface ProcessingMatterContext {
  readonly matterId: string
  readonly title: string
  readonly summary: string
}

interface FirstMileInjected {
  /** Bring the ledger desk to the main area — the one 桌面 (the session desk room is retired). */
  readonly openDesk?: () => void
  readonly processingMatter?: ProcessingMatterContext
}

type FirstMileDockProps = PropsRuntime<'conversation.input.dock'> & FirstMileInjected & PropsLocale<'assistantFirstMile'>

export function FirstMileDock({ session, openDesk, processingMatter, t }: FirstMileDockProps): ReturnType<typeof createElement> | null {
  // The card is a pointer, not a second first-open composer: the one place to type a first
  // sentence is the home page. Keeping the old embedded textarea here made two first-open
  // surfaces with two different lanes (home `[首页]` vs conversation chat).
  // { display:none }" — is RETIRED, not fixed. The live probe (2026-10-07) showed WHY it could
  // never work: this dock renders INSIDE that fallback wrapper (vendor ConversationContent.tsx:
  // composerStack = hero + input.dock + inputBar), so hiding the vendor composer hid this card
  // too — the blank-phase takeover hid itself, and an unmount leak left ongoing sessions with
  // no input box at all. The blank phase now shows the honest stack: vendor hero + this card +
  // the vendor composer (the input channel the card's copy points at).
  // (2026-10-11) The view preference pre-write is retired with the session desk view itself:
  // the main-panel ledger desk is the one "桌面", and sessions open on Chat.
  // (2026-10-07) The timed auto-send — an 800ms '你好' — is retired. It read
  // deskSlice(sid), which is ALWAYS empty on a brand-new session, so every page load
  // re-fired it: six ghost sessions in ten minutes on the 2026-10-07 probe, each a real
  // model round that re-opened with "初次见面" on a desk that already held content. The
  // opening content is the deterministic brief below — zero tokens, idempotent across
  // reloads, composed from the walk view the client already holds.
  // The walk view is SUBSCRIBED (useDesk), not a one-shot deskSlice read: the walk read
  // lands asynchronously after mount, and the old one-shot never re-rendered — the brief
  // never appeared on a live reload (caught in the 2026-10-07 real-machine probe).
  const walk = useDesk()

  // The walk view's desk data — on a blank session there is no session slice yet, so the
  // brief reads the shared walk view (subscribed above).
  //
  // BUG-025: `Object.keys(walk.data).length > 0` was always true after a successful rooms read
  // (the payload carries schemaVersion/generatedAt/... even when every room is empty), so the
  // Day-0 branch never rendered on a genuinely fresh home. Freshness is the room CONTENT, not the
  // payload's shape; counts cover the legacy payloads that carry no row arrays.
  const roomRows = (rows: readonly unknown[] | undefined, count: number | undefined): number =>
    (rows?.length ?? 0) + (count ?? 0)
  const hasDesk = walk.data !== undefined && (
    roomRows(walk.data.memories, walk.data.counts?.memories)
    + roomRows(walk.data.knowledge, (walk.data.counts?.knowledgeStable ?? 0) + (walk.data.counts?.knowledgeDraft ?? 0))
    + roomRows(walk.data.skills, walk.data.counts?.skills)
    + roomRows(walk.data.research, walk.data.counts?.threads)
  ) > 0
  const shell = (children: (string | ReturnType<typeof createElement> | undefined)[]): ReturnType<typeof createElement> =>
    createElement('div', {
      style: {
        display: 'flex', flexDirection: 'column', gap: '8px',
        width: 'min(var(--dsh-composer-card-max-width, 952px), 100%)',
        margin: '0 auto 8px', padding: '16px 20px',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '10px',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
    }, ...children)
  const heading = (text: string): ReturnType<typeof createElement> =>
    createElement('div', { style: { fontSize: '14px', fontWeight: 600 } }, text)
  const body = (text: string): ReturnType<typeof createElement> =>
    createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.7 } }, text)
  const startButton = (label: string, run: () => void): ReturnType<typeof createElement> =>
    createElement('button', {
      onClick: run,
      style: {
        border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', cursor: 'pointer',
        fontSize: '13px', color: MARK_TEAL, padding: '6px 16px', borderRadius: '6px', alignSelf: 'flex-start',
      },
    }, label)

  if (processingMatter !== undefined) {
    return shell([
      heading(t('processing.title')),
      body(t('processing.label')),
      heading(processingMatter.title),
      ...(processingMatter.summary.trim() === '' ? [] : [body(processingMatter.summary)]),
      body(t('processing.visualOnly')),
    ])
  }
  if (session?.blank !== true) return null

  if (!hasDesk) {
    return shell([
      heading('第一次来？回到今天，说一句就行。'),
      body('今天这一页会先问你最近要拍板的一件事，再给你一版带选项、代价和复查日的页。'),
      startButton('回到今天', () => { openDesk?.() }),
    ])
  }

  // Has data on disk: a short pointer at the desk itself. The brief that used to speak the
  // retired file's decisions/actions/gaps (retired 2026-10-07) is gone with those sections — the
  // one desk is the ledger projection in the main area, and the client's room-data file no
  // longer carries anything to brief from.
  return shell([
    heading('今天的事都在「今天」这一页。'),
    body('在办、等你确认、快到期的，回今天看。'),
    createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      startButton('回到今天', () => { openDesk?.() }),
      createElement('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
        '· 有新的事，也可以在下面说'),
    ),
  ])
}

/**
 * The pending-approval banner above the composer. The desk already points at the drafts,
 * but that pointer sits one room deep — the second naive-CEO reading (first-open UX card,
 * 2026-10-04) named the depth itself as the friction: pages wait for an approval only the
 * principal can give, and nothing on the first screen says so (before-evidence 2026-10-05:
 * 3 drafts on the desk, zero approval words in the first-open DOM). This banner is the
 * shallow twin of the desk pointer: it shows wherever the principal already is — blank
 * session or not — and disappears once the drafts are approved.
 *
 * Data rides the walk view (the primary slice), not the dock session's own slice: on the
 * first screen the session is brand new and has no desk yet, while the drafts live in the
 * workspace the last room-data rewrite served. In the shipped composition every session shares
 * the one default workspace, so the click-through's own read finds the same file; a session
 * on a different workspace lands on the knowledge room's honest empty state instead of a
 * foreign desk (tabBody withholds other sessions' data by design — this banner does not
 * override that, it only points).
 * @param props - the injected opener.
 * @returns the banner element, or null when nothing is waiting for approval.
 */
export function ApprovalDockBanner({ openRoom }: {
  openRoom?: (kind: RoomKind) => void
}): ReturnType<typeof createElement> | null {
  const store = useDesk()
  const pages = store.data?.knowledge
  // Count what the click-through will show: the knowledge room's 待你审批 section counts ROWS
  // with status draft. Desk files that carry no rows fall back to the model's own count — a
  // banner number the room cannot reproduce would break the promise the click makes.
  const draftCount = pages !== undefined
    ? pages.filter(page => page.status === 'draft').length
    : (store.data?.counts?.knowledgeDraft ?? 0)
  if (draftCount === 0) return null
  return createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start',
      // Same card width rule as the first-mile strip: follow the composer's card, not a
      // fixed pixel cap that drifts at every breakpoint.
      width: 'min(var(--dsh-composer-card-max-width, 952px), 100%)',
      margin: '0 auto 8px', padding: '10px 16px',
      border: '1px solid var(--dsha-warn)', borderRadius: '10px', background: 'var(--dsha-warn-tint)',
    },
  },
  createElement('div', { style: { fontSize: '13px', color: 'var(--dsha-warn)' } },
    `⚠ ${String(draftCount)} 页知识草稿等你审批——批准后才会成为它的判断依据`),
  createElement('button', {
    onClick: () => {
      // Same routing as the desk pointer: the room opens with the drafts highlighted
      // and scrolled into view. openBeside is total — it reports its own failure — so no
      // guard here; the banner never swallows a click silently.
      patchDesk({ focusKnowledge: 'drafts' })
      openRoom?.('knowledgeRoom')
    },
    style: {
      border: '1px solid var(--dsha-warn)', background: 'transparent', cursor: 'pointer',
      fontSize: '12px', color: 'var(--dsha-warn)', padding: '3px 10px', borderRadius: '6px',
    },
  }, '去审批'),
  )
}
