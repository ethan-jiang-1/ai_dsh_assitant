/**
 * The first mile and the composer's docks: the blank-session landing (hero + the rich card
 * above the composer) and the pending-approval banner. The session desk summary bar that used
 * to ride here is retired with the session desk itself (one 桌面 = the ledger's, 2026-10-11).
 * These are the surfaces a first-time principal (and every session's composer) sees; the
 * hero MARK itself lives in brand.ts.
 *
 * @module dsh-smart-assistant/client/first-mile
 */

import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { RoomKind } from './contracts'
import { deskSlice, patchDesk, useDesk } from './desk-core'
import { askAboutDecision, askAboutGap, askCheckIn, askStart, sendPrompt } from './desk-io'
import { createElement, reactSurface } from './runtime'
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
 * The rich desk landing for the blank (pre-first-message) phase (A1, 2026-10-06 stepwise form
 * migration). This replaces the old thin first-mile strip with a substantial card that fills
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
/**
 * DeskLandingOverride: the FULL blank-phase takeover (2026-10-06 form migration).
 * Registered on `conversation.composer` (chain, overlay:true) — when elected, the vendor's
 * HeroShell + workspace chip + input bar get hidden and this component owns the entire area.
 *
 * The vendor's CSS module (.composerStack { display:flex }) overrides the chain's display:none,
 * so this component injects a <style> tag targeting the data-chain-overlay-fallback attribute
 * to enforce the hide. This is the vendor's own extensibility mechanism (the data attribute
 * exists specifically for consumers to target the fallback).
 *
 * For non-blank sessions, returns null so the vendor's normal rendering continues.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void DeskLandingOverride; // retained for future chain-slot authorization


function DeskLandingOverride(props: Record<string, unknown>): ReturnType<typeof createElement> | null {
  const session = props.session as { blank?: boolean } | undefined
  if (session?.blank !== true) return null
  const { useState, useEffect } = reactSurface()
  const [draft, setDraft] = useState('')
  // Force-hide the vendor's fallback using the data attribute the chain system provides
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = "[data-chain-overlay-fallback='conversation.composer'] { display: none !important; }"
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [])
  const send = () => {
    const text = draft.trim()
    const sid = props.sessionId as string | undefined
    if (text === '' || !sid) return
    sendPrompt(text, 'desktop-landing', 'desk', sid)
    setDraft('')
  }
  const walk = deskSlice(undefined)
  const hasDesk = walk.data !== undefined && Object.keys(walk.data).length > 0
  const card = (children: (ReturnType<typeof createElement> | undefined)[]): ReturnType<typeof createElement> =>
    createElement('div', {
      style: {
        display: 'flex', flexDirection: 'column', gap: '10px',
        width: 'min(var(--dsh-composer-card-max-width, 952px), 100%)',
        margin: '0 auto', padding: '24px 28px',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '12px',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
    }, ...children)
  const inputArea = createElement('textarea', {
    value: draft,
    onChange: (e: { target: { value: string } }) => { setDraft(e.target.value) },
    onKeyDown: (e: { key: string, shiftKey: boolean, preventDefault: () => void }) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } },
    placeholder: '说说你现在要处理的事…',
    rows: 2,
    style: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-base)', color: 'inherit', fontSize: '14px', resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const },
  })
  const sendBtn = createElement('button', {
    onClick: send,
    style: { alignSelf: 'flex-end', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontSize: '14px', fontWeight: 600, background: MARK_TEAL, color: 'var(--dsw-alias-text-primary, #fff)' },
  }, '发送')
  if (!hasDesk) {
    return card([
      createElement('div', { style: { fontSize: '20px', fontWeight: 700 } }, '你的桌面'),
      createElement('div', { style: { fontSize: '14px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.7 } }, '说一句话，我开始问你——答完你就有第一份决策简报。'),
      createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, '例：「我在想要不要给老客户涨价」'),
      inputArea, sendBtn,
    ])
  }
  const data = walk.data
  const decisions = (data?.decisions ?? []).filter(item => item.kind === 'business' || ((item.options ?? []).length > 0))
  const actions = (data?.actions ?? []).filter(item => item.status !== 'done')
  return card([
    createElement('div', { style: { fontSize: '20px', fontWeight: 700 } }, '你的桌面'),
    decisions.length > 0
      ? createElement('div', { style: { padding: '12px 16px', border: '1px solid ' + MARK_TEAL, borderRadius: '8px' } },
          createElement('div', { style: { fontSize: '13px', fontWeight: 600 } }, String(decisions[0]?.question ?? '')))
      : createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, '没有等你拍板的事。'),
    ...(actions.length > 0 ? [createElement('div', { style: { fontSize: '13px' } }, '在跟的 ' + actions.length + ' 件')] : []),
    inputArea, sendBtn,
  ])
}

interface ProcessingMatterContext {
  readonly matterId: string
  readonly title: string
  readonly summary: string
}

interface FirstMileInjected {
  readonly openRoom?: (kind: RoomKind) => void
  readonly processingMatter?: ProcessingMatterContext
}

type FirstMileDockProps = PropsRuntime<'conversation.input.dock'> & FirstMileInjected & PropsLocale<'assistantFirstMile'>

export function FirstMileDock({ session, openRoom, processingMatter, t }: FirstMileDockProps): ReturnType<typeof createElement> | null {
  // Hooks stay UNCONDITIONAL (React rules): the 2026-10-07 live probe caught the early
  // return below them leaking the composer-hiding style past unmount — an ongoing session
  // was left with no input box at all while the model waited for an answer.
  const { useState } = reactSurface()
  const [draft, setDraft] = useState('')
  const sid = session?.sessionId  // (261007 Slice 1a) The A1-era hiding CSS — "[data-chain-overlay-fallback='conversation.composer']
  // { display:none }" — is RETIRED, not fixed. The live probe (2026-10-07) showed WHY it could
  // never work: this dock renders INSIDE that fallback wrapper (vendor ConversationContent.tsx:
  // composerStack = hero + input.dock + inputBar), so hiding the vendor composer hid this card
  // too — the blank-phase takeover hid itself, and an unmount leak left ongoing sessions with
  // no input box at all. The blank phase now shows the honest stack: vendor hero + this card +
  // the vendor composer (the input channel the card's copy points at).
  // (2026-10-11) The view preference pre-write is retired with the session desk view itself:
  // the main-panel ledger desk is the one "桌面", and sessions open on Chat.
  // (261007 Slice 1b) The Goal-1 auto-send — an 800ms timed '你好' — is retired. It read
  // deskSlice(sid), which is ALWAYS empty on a brand-new session, so every page load
  // re-fired it: six ghost sessions in ten minutes on the 2026-10-07 probe, each a real
  // model round that re-opened with "初次见面" on a desk that already held content. The
  // opening content is the deterministic brief below — zero tokens, idempotent across
  // reloads, composed from the walk view the client already holds.
  // The walk view is SUBSCRIBED (useDesk), not a one-shot deskSlice read: the walk read
  // lands asynchronously after mount, and the old one-shot never re-rendered — the brief
  // never appeared on a live reload (caught in the Slice 1 real-machine probe).
  const walk = useDesk()
  const send = () => {
    const text = draft.trim()
    const sid = session?.sessionId
    if (text === '' || !sid) return
    sendPrompt(text, 'desktop-landing', 'desk', sid)
    setDraft('')
  }

  // The walk view's desk data — on a blank session there is no session slice yet, so the
  // brief reads the shared walk view (subscribed above).
  const hasDesk = walk.data !== undefined && Object.keys(walk.data).length > 0
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
    // Day-0: the arc, the promise, and the start.
    return shell([
      heading('第一次来？说一句话，它先问你。'),
      body('你开了口，它会先问你最近要拍板、还要跟进的一件事——然后三个短问（什么逼出了决定、当时知道什么、哪里没底）。'),
      body('答完，你的桌面就有了第一份决策简报：带代价的选项、还缺的数、一个复查日期。之后每次来，先看桌面——要你拍的、在跟的、缺的，一目了然。'),
      createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
        '例：「这个月签单为什么慢」「我在想要不要给老客户涨价」'),
      startButton('开始第一件事', () => {
        if (sid !== undefined) { askStart(sid) }
      }),
      createElement('textarea', {
        value: draft,
        onChange: (e: { target: { value: string } }) => { setDraft(e.target.value) },
        onKeyDown: (e: { key: string, shiftKey: boolean, preventDefault: () => void }) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } },
        placeholder: '说说你现在要处理的事…',
        rows: 2,
        style: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-base)', color: 'inherit', fontSize: '14px', resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const },
      }),
      createElement('button', {
        onClick: send,
        style: { alignSelf: 'flex-end', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontSize: '14px', fontWeight: 600, background: MARK_TEAL, color: 'var(--dsw-alias-text-primary, #fff)' },
      }, '发送'),
    ])
  }

  // Has a desk: the OPENING BRIEF (261007 Slice 1b) — spoken lines over the desk's state,
  // each clickable into the matching action conversation (会话=桌面上的动作). Deterministic
  // from the walk view: the product opens with what it already holds, not with a greeting
  // that makes the principal start.
  const data = walk.data
  const decisions = (data?.decisions ?? []).filter(item => item.kind === 'business' || ((item.options ?? []).length > 0))
  const gaps = data?.gaps ?? []
  const actions = (data?.actions ?? []).filter(item => item.status !== 'done')
  const briefRow = (label: string, run: () => void): ReturnType<typeof createElement> =>
    createElement('button', {
      key: label,
      onClick: run,
      style: {
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '8px',
        background: 'var(--dsw-alias-bg-base)', cursor: 'pointer', textAlign: 'left' as const,
        fontSize: '13px', color: 'inherit', padding: '10px 14px', lineHeight: 1.6,
      },
    }, label)
  return shell([
    heading('这是你的一把手桌面——三句话，说完就办'),
    decisions.length > 0
      ? briefRow(
          `要你拍的：「${String(decisions[0]?.question ?? '').slice(0, 40)}」——点这里，把选项和代价摆出来`,
          () => { askAboutDecision(String(decisions[0]?.question ?? ''), String(decisions[0]?.id ?? decisions[0]?.question ?? ''), sid) },
        )
      : body('没有等你拍板的事。'),
    actions.length > 0
      ? briefRow(
          `在跟的：「${String(actions[0]?.what ?? '').slice(0, 30)}」（${String(actions[0]?.due ?? '')} 到期）——点这里，问一句进展`,
          () => { askCheckIn(String(actions[0]?.what ?? ''), String(actions[0]?.due ?? ''), String(actions[0]?.id ?? actions[0]?.what ?? ''), sid) },
        )
      : undefined,
    gaps.length > 0
      ? briefRow(
          `还缺一个数：「${String(gaps[0]?.what ?? '').slice(0, 30)}」——点这里，一起把它补上`,
          () => { askAboutGap(String(gaps[0]?.what ?? ''), String(gaps[0]?.why ?? ''), String(gaps[0]?.id ?? gaps[0]?.what ?? ''), sid) },
        )
      : undefined,
    createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      startButton('打开桌面全景', () => { openRoom?.('desk') }),
      createElement('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
        '· 有新的事，直接在下面说'),
    ),
  ])
}

/**
 * The pending-approval banner above the composer. The desk already points at the drafts (S4),
 * but that pointer sits one room deep — the second naive-CEO reading (first-open UX card,
 * 2026-10-04) named the depth itself as the friction: pages wait for an approval only the
 * principal can give, and nothing on the first screen says so (before-evidence 2026-10-05:
 * 3 drafts on the desk, zero approval words in the first-open DOM). This banner is the
 * shallow twin of the desk pointer: it shows wherever the principal already is — blank
 * session or not — and disappears once the drafts are approved.
 *
 * Data rides the walk view (the primary slice), not the dock session's own slice: on the
 * first screen the session is brand new and has no desk yet, while the drafts live in the
 * workspace the last desk-refresh served. In the shipped composition every session shares
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
    `⚠ ${String(draftCount)} 页知识草稿在等你审批——批准后才会成为它的判断依据`),
  createElement('button', {
    onClick: () => {
      // Same routing as the desk pointer (S4): the room opens with the drafts highlighted
      // and scrolled into view. openBeside is total — it reports its own failure — so no
      // guard here; the banner never swallows a click silently.
      patchDesk({ focusKnowledge: 'drafts' })
      openRoom?.('knowledgeRoom')
    },
    style: {
      border: '1px solid var(--dsha-warn)', background: 'transparent', cursor: 'pointer',
      fontSize: '12px', color: 'var(--dsha-warn)', padding: '3px 10px', borderRadius: '6px',
    },
  }, '点这里去审批'),
  )
}
