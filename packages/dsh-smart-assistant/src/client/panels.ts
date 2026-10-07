/**
 * The three room panels: the desk (the working surface), the knowledge room (review queues)
 * and the memory room (the digital twin's correction surface). The same components render
 * as main-area pages and inside the right-sidebar tab bodies (see room-tabs) — the session
 * scoping rides in as a plain `sessionId` prop.
 *
 * @module dsh-smart-assistant/client/panels
 */

import type { DeskData, DeskDecision } from './desk-core'
import { patchDesk, shortTime, useDesk } from './desk-core'
import {
  answerDecision, approveKnowledgePage, askAboutDecision, askApproveProposal, askRejectProposal,
  closeThread, correctMemory, deprecateKnowledgePage, DESK_REFRESH_STEP, dropAction, fillGap,
  finishAction, flagKnowledgePage, openBeside, parkThread, sendPrompt,
} from './desk-io'
import {
  cell, ClampedText, CorrectableRow, muted, panelAlerts, quickActions, refreshRow,
  sectionTitle,
} from './dom-utils'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'

/** Calendar glyph for the desk panel entry. */
export function DeskIcon({ size }: { size: number }): unknown {
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  },
  createElement('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
  createElement('line', { x1: 3, y1: 9, x2: 21, y2: 9 }),
  createElement('line', { x1: 9, y1: 21, x2: 9, y2: 9 }),
  )
}

/** Book glyph for the knowledge panel entry. */
export function KnowledgeIcon({ size }: { size: number }): unknown {
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  },
  createElement('path', { d: 'M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4Z' }),
  createElement('path', { d: 'M20 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20Z' }),
  )
}

/** Lightbulb glyph for the memory panel entry. */
export function MemoryIcon({ size }: { size: number }): unknown {
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  },
  createElement('path', { d: 'M9 18h6' }),
  createElement('path', { d: 'M10 22h4' }),
  createElement('path', { d: 'M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z' }),
  )
}

/** Panel 1 — the desk: what is being tracked, what changed, and the working-folder counts. */
export function DeskPanel(props?: { sessionId?: string }): unknown {
  const session = props?.sessionId
  const store = useDesk(session)
  const data = store.data
  return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
    createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '我的桌面'),
    // The three rooms are three QUESTIONS, not three data containers (user ruling 2026-09-26:
    // keep the familiar entries, make the navigation MEAN something).
    // The rhythm line (real-user walk finding, 2026-10-06): the desk answered "what now"
    // per row but never the standing loop — one line states the working rhythm so the
    // principal knows what coming back here means.
    createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 6px' } },
      '这里是你的起点：来了先看「要你拍的」，拍完就走。'),
    createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '现在要采取什么行动？'),
    refreshRow(store, session),
    // S6 landing: the principal's real first reaction (2026-09-26 trial) was "不知所措——
    // 不知道怎么落脚，不知道要干什么". When no desk file exists yet, say what this surface
    // is and give the three-step way in — before any content can.
    store.data === undefined
      ? createElement('div', {
          style: {
            border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '8px', background: 'var(--dsw-alias-bg-layer-1)',
            padding: '10px 14px', margin: '8px 0', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.8,
          },
        },
        createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-secondary)' } }, '第一次来这里？'),
        // Corrected 2026-10-06 (real-user walk finding): the assistant's opening question
        // fires INSIDE the first conversation, in reply to the principal's first message —
        // it does not exist before anyone speaks. The earlier rewrite claimed "the assistant
        // has already opened" and pointed at an empty conversation; the true Day-0 start is
        // the principal saying anything at all (the assistant then takes over the asking).
        '① 跟它说一句话就行——说什么都行，它会先问你：最近要你拍板、还要跟进的一件事',
        createElement('br'),
        '② 这里是你的仪表盘，不是要你配置的东西',
        createElement('br'),
        '③ 之后这里一直显示：等你拍板的事、在办的事、它缺什么。每一条都能就地处置')
      : null,
    quickActions(session),

    // The principal's first question is "what NOW?" — real-use feedback (2026-09-26) was that a
    // pile of equal-weight rows never says where to start. So the desk answers with ONE lead
    // item (the first decision, enlarged, actions at hand) and the rest wait collapsed behind
    // an explicit toggle: nothing is hidden, but nothing competes with the one thing first.
    // The principal's first question is "what NOW?" — and the answer must be THEIR business, not the
    // assistant's upkeep. Two independent reviews (2026-09-26) found the lead card showing "should I
    // keep building this panel?": with no kind field it took decisions[0], i.e. whatever the model
    // wrote first. Contract: kind = "business" | "upkeep"; business leads, and when none is waiting
    // the desk says so honestly instead of promoting housekeeping.
    //
    // R4 (self-review, 2026-09-27): `kind` alone is not the whole gate. A decision already carrying
    // `options[]` is a concrete choice the assistant prepared FOR the principal — the live desk had
    // "two draft pages: approve, or comment? only you can finalize them" filed as upkeep with two
    // one-click options, while the lead card claimed nothing needed a call. So: business first,
    // then the first options-bearing decision whatever its kind says.
    sectionTitle('从这开始'),
    (() => {
      const { useState } = reactSurface()
      const decisions = data?.decisions ?? []
      const [showRest, setShowRest] = useState(false)
      const [showUpkeep, setShowUpkeep] = useState(false)
      const byRank = (left: DeskDecision, right: DeskDecision): number =>
        Number(left.rank ?? 0) - Number(right.rank ?? 0)
      const business = decisions.filter(item => item.kind === 'business').slice().sort(byRank)
      const rowIdOf = (item: DeskDecision): string => String(item.id ?? item.question)
      const waiting = decisions
        .filter(item => item.kind !== 'business' && (item.options ?? []).length > 0)
        .slice()
        .sort(byRank)
      const draftCount = data?.counts?.knowledgeDraft ?? 0
      const lead = business[0] ?? waiting[0]
      const rest = business.slice(1)
      // Whatever leads leaves the fold: the same row must not appear twice.
      const upkeep = decisions.filter(item =>
        item.kind !== 'business' && (lead === undefined || rowIdOf(item) !== rowIdOf(lead)))
      // Options the assistant presented become one-click answers on the row — the principal
      // picks instead of copying the answer back from the conversation.
      const optionButtons = (item: DeskDecision, rowId: string): ReturnType<typeof createElement> | null =>
        (item.options ?? []).length === 0
          ? null
          : createElement('div', { style: { marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              ...(item.options ?? []).map(option => createElement('button', {
                key: String(option.label),
                title: [option.cost === undefined || option.cost === '' ? undefined : `代价：${option.cost}`,
                  option.irreversible === true ? '不可逆' : undefined]
                  .filter(part => part !== undefined).join(' · ') || undefined,
                onClick: () => { answerDecision(String(item.question ?? ''), String(option.label ?? ''), rowId, session) },
                style: {
                  padding: '4px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px',
                  border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
                },
              }, String(option.label ?? ''))))
      // S7: once THIS row has been ANSWERED it stops looking answerable — a real trial answered
      // one decision three times because the row kept its buttons through the assistant's
      // multi-step rewrite window.
      //
      // R2 (self-review, 2026-09-27): "answered" must mean the 回答 action, not "any action
      // touched this row". The row used to go read-only on ANY receipt — including the one from
      // 看选项, which is a READ: the principal asked to see the options and lost both the options
      // and the ability to answer, with a false "已回答" line on top. Only 回答 closes a row; a
      // receipt from 看选项/修改 leaves it live, and options always render for a live decision.
      const answered = (item: DeskDecision): boolean => {
        const rowId = rowIdOf(item)
        const inFlight = store.pending?.rowId === rowId ? store.pending.action : undefined
        const settled = store.lastReceipt?.rowId === rowId ? store.lastReceipt.action : undefined
        return inFlight === '回答' || (inFlight === undefined && settled === '回答')
      }
      const row = (item: DeskDecision, compact: boolean): ReturnType<typeof createElement> => {
        const rowId = rowIdOf(item)
        return createElement(CorrectableRow, {
          key: rowId,
          rowId,
          readOnly: answered(item),
          primary: createElement('span', null,
            createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.question ?? '')),
            compact || item.context === undefined || item.context === ''
              ? null
              : createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, String(item.context)),
            item.reply === undefined || item.reply === ''
              ? null
              : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '4px' } }, `它说：${item.reply}`),
            // Options hide once answered — the trial's second click came exactly from here.
            answered(item) ? null : optionButtons(item, rowId)),
          actionLabel: '回答',
          placeholder: '你的决定是什么？',
          deskSession: session,
          onSubmit: (text: string) => { answerDecision(String(item.question ?? ''), text, rowId, session) },
          actions: [{ label: '看选项', run: () => { askAboutDecision(String(item.question ?? ''), rowId, session) } }],
        })
      }
      const fold = (label: string, toggle: () => void): ReturnType<typeof createElement> =>
        createElement('button', {
          onClick: toggle,
          style: {
            padding: '5px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
            border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
          },
        }, label)
      return createElement('div', null,
        lead === undefined
          ? muted('目前没有需要你拍板的经营事项')
          : createElement('div', {
              style: {
                border: `2px solid ${MARK_TEAL}`, borderRadius: '8px', background: 'var(--dsha-accent-tint)',
                padding: '12px 14px', margin: '8px 0',
              },
            },
            createElement('div', { style: { fontSize: '11px', fontWeight: 700, color: MARK_TEAL, letterSpacing: '1px' } }, '先办这件'),
            createElement(CorrectableRow, {
              lead: true,
              rowId: rowIdOf(lead),
              readOnly: answered(lead),
              primary: createElement('span', null,
                createElement('span', { style: { fontSize: '16px', fontWeight: 700, color: 'var(--dsw-alias-label-primary)' } }, String(lead.question ?? '')),
                lead.context === undefined || lead.context === ''
                  ? null
                  : createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400, marginTop: '4px' } }, String(lead.context)),
                lead.reply === undefined || lead.reply === ''
                  ? null
                  : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '4px' } }, `它说：${lead.reply}`),
                answered(lead) ? null : optionButtons(lead, rowIdOf(lead))),
              actionLabel: '回答',
              placeholder: '你的决定是什么？',
              deskSession: session,
              onSubmit: (text: string) => { answerDecision(String(lead.question ?? ''), text, rowIdOf(lead), session) },
              actions: [{ label: '看选项', run: () => { askAboutDecision(String(lead.question ?? ''), rowIdOf(lead), session) } }],
            })),
        rest.length === 0
          ? null
          : createElement('div', { style: { marginTop: '8px' } },
              fold(showRest ? `收起其余 ${rest.length} 条` : `等你决定（还有 ${rest.length} 条）`, () => { setShowRest(!showRest) }),
              showRest === false ? null : createElement('div', null, ...rest.map(item => row(item, false)))),
        draftCount === 0
          ? null
          : createElement('div', {
              // S4: the pointer lands on the drafts themselves — openBeside opens only a room
              // tab, so the room reads focusKnowledge and highlights + scrolls to the drafts.
              onClick: () => {
                patchDesk({ focusKnowledge: 'drafts' })
                try { openBeside('knowledgeRoom') } catch { /* right sidebar missing */ }
              },
              style: { fontSize: '13px', color: 'var(--dsha-warn)', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' },
            }, `⚠ ${String(draftCount)} 页知识在等你审批（点这里去审批）`),
        upkeep.length === 0
          ? null
          : createElement('div', { style: { marginTop: '8px' } },
              fold(showUpkeep ? `收起 ${upkeep.length} 条` : `助手自己的事（${upkeep.length}）`, () => { setShowUpkeep(!showUpkeep) }),
              showUpkeep === false ? null : createElement('div', null, ...upkeep.map(item => row(item, true)))))
    })(),

    // Actions split by state: the open ones are the working surface (each row carries its
    // correction and close-out actions); the done ones move to their own dimmed group — a plan
    // tracker that hides finished work hides the assistant's follow-through, which is the trust
    // question "did what you planned actually happen?" Dropped ones get a folded dimmed group of
    // their own (R9, self-review 2026-09-27): the earlier choice was to keep them off the panel
    // because the plan page records them, but the principal who clicked 不办了 had no durable trace
    // ON THE SURFACE HE ACTED ON — the "submitted is not done" rule applies to a close-out too.
    sectionTitle(`在办的事（${(data?.actions ?? []).filter(action => action.status !== 'done' && action.status !== 'dropped').length}）`),
    (data?.actions ?? []).filter(action => action.status !== 'done' && action.status !== 'dropped').length === 0
      ? muted('（没有在办的动作）')
      : createElement('div', null, ...(data?.actions ?? [])
          .filter(action => action.status !== 'done' && action.status !== 'dropped')
          .map(action => createElement(CorrectableRow, {
            key: String(action.id ?? action.what),
            rowId: String(action.id ?? action.what),
            primary: createElement('span', null,
              createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(action.what ?? '')),
              // R9: only `open` belongs here (done/dropped have their own groups), so anything else
              // is a status this surface does not know — say so instead of rendering it as in-flight.
              action.status === 'open' || action.status === undefined
                ? null
                : createElement('span', { style: { fontSize: '11px', color: 'var(--dsha-warn)', marginLeft: '6px' } },
                    `（状态「${String(action.status)}」不在面板认识的集合里）`),
              createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } },
                [action.owner === undefined ? '' : `负责人：${action.owner}`,
                  action.due === undefined ? '' : `时点：${action.due}`].filter(part => part !== '').join(' · ')),
              action.metric === undefined || action.metric === ''
                ? null
                : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, `度量：${action.metric}`),
              action.stop === undefined || action.stop === ''
                ? null
                : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, `停止条件：${action.stop}`),
              action.note === undefined || action.note === ''
                ? null
                // R7's deferred half: the assistant's own reconciliation log runs long (up to 53 px on
                // the live desk) and it stays orange on purpose — it is the trust line where the
                // assistant says what it changed. Clamped, so it cannot push the row off-screen.
                : createElement(ClampedText, {
                    text: `它记：${action.note}`,
                    maxLines: 3,
                    style: { fontSize: '11px', color: 'var(--dsha-warn)', fontWeight: 400, marginTop: '4px' },
                  })),
            actionLabel: '改这条',
            placeholder: '哪里要改？',
            deskSession: session,
            onSubmit: (text: string) => {
              sendPrompt(`行动「${String(action.what ?? '')}」要改：${text}。${DESK_REFRESH_STEP}`, '修改', String(action.id ?? action.what), session)
            },
            actions: [
              // Completing is a positive move: confirming it (R3, self-review 2026-09-27) made
              // the most common action two clicks inside a small window on an 18px button.
              { label: '办完了', run: () => { finishAction(String(action.what ?? ''), String(action.id ?? action.what), session) } },
              { label: '不办了', run: () => { dropAction(String(action.what ?? ''), String(action.id ?? action.what), session) }, destructive: true },
            ],
          }))),
    (data?.actions ?? []).some(action => action.status === 'done')
      ? createElement('div', null,
          sectionTitle(`已办（${(data?.actions ?? []).filter(action => action.status === 'done').length}）`),
          createElement('div', null, ...(data?.actions ?? [])
            .filter(action => action.status === 'done')
            .map(action => createElement('div', {
              key: `done-${String(action.id ?? action.what)}`,
              style: { marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid var(--dsw-alias-border-l2)' },
            },
            createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, `✓ ${String(action.what ?? '')}`),
            [action.owner === undefined ? '' : String(action.owner),
              action.due === undefined ? '' : String(action.due)].filter(part => part !== '').length === 0
              ? null
              : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } },
                  [action.owner === undefined ? '' : `负责人：${action.owner}`,
                    action.due === undefined ? '' : `时点：${action.due}`].filter(part => part !== '').join(' · ')),
            action.note === undefined || action.note === ''
              ? null
              : createElement(ClampedText, {
                  text: `它记：${action.note}`,
                  maxLines: 2,
                  style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' },
                })))))
      : null,

    // R9: dropped actions are a decision the principal made here; they fold away rather than vanish.
    (data?.actions ?? []).some(action => action.status === 'dropped')
      ? createElement('div', null,
          sectionTitle(`已撤（${(data?.actions ?? []).filter(action => action.status === 'dropped').length}）`),
          createElement('div', null, ...(data?.actions ?? [])
            .filter(action => action.status === 'dropped')
            .map(action => createElement('div', {
              key: `dropped-${String(action.id ?? action.what)}`,
              style: { marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid var(--dsw-alias-border-l2)' },
            },
            createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, `✕ ${String(action.what ?? '')}`),
            action.note === undefined || action.note === ''
              ? null
              : createElement(ClampedText, {
                  text: `它记：${action.note}`,
                  maxLines: 2,
                  style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' },
                })))))
      : null,

    sectionTitle('缺什么'),
    // R5 (self-review, 2026-09-27): a gap names the thing that blocks everything and says only the
    // principal can supply it — and then offered no way to supply it ("想补只需回一句" = back to
    // chat). Every judgement on this surface is actionable in place; a gap is a judgement too.
    (data?.gaps ?? []).length === 0
      ? muted('（没有卡住的事）')
      : createElement('div', null, ...(data?.gaps ?? []).map(item => createElement(CorrectableRow, {
          key: String(item.id ?? item.what),
          rowId: String(item.id ?? item.what),
          primary: createElement('span', null,
            createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.what ?? '')),
            item.why === undefined || item.why === ''
              ? null
              : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, String(item.why))),
          actionLabel: '补上',
          placeholder: '它缺的那个读数／台账／参数是什么？',
          deskSession: session,
          onSubmit: (text: string) => {
            fillGap(String(item.what ?? ''), text, String(item.id ?? item.what), session)
          },
        }))),

    sectionTitle('在跟的事'),
    data?.threads === undefined || data.threads.length === 0
      ? muted('（暂时没有在跟的事）')
      : createElement('div', null, ...data.threads.map(thread => createElement(CorrectableRow, {
          key: String(thread.id ?? thread.title),
          rowId: String(thread.id ?? thread.title),
          primary: createElement('span', null,
            createElement('div', { style: { fontSize: '13px', fontWeight: 600, lineHeight: 1.5 } },
              String(thread.title ?? thread.id ?? ''),
              // R9: a parked or closed thread used to return to 在跟的事 looking exactly like a live
              // one, with the same three controls.
              thread.status === undefined || thread.status === 'open'
                ? null
                : createElement('span', { style: { fontSize: '11px', color: 'var(--dsha-warn)', marginLeft: '6px', fontWeight: 400 } },
                    `（状态：${String(thread.status)}）`)),
            // The lean is the field that measured 345 px on the live desk (R7): both free-text
            // lines clamp with an expander instead of pushing the room off-screen.
            createElement(ClampedText, {
              text: `当前倾向：${String(thread.lean ?? '（未定）')}`,
              maxLines: 3,
              style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 },
            }),
            thread.why === undefined || thread.why === ''
              ? null
              : createElement(ClampedText, {
                  text: String(thread.why),
                  maxLines: 2,
                  style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400, lineHeight: 1.5 },
                })),
          actionLabel: '问进展',
          placeholder: '你想问这件事的什么？',
          deskSession: session,
          onSubmit: (text: string) => {
            sendPrompt(`关于在跟的事「${String(thread.title ?? thread.id ?? '')}」：${text}`, '问进展', String(thread.id), session)
          },
          actions: [
            { label: '先放放', run: () => { parkThread(String(thread.title ?? thread.id ?? ''), String(thread.id), session) } },
            { label: '收了', run: () => { closeThread(String(thread.title ?? thread.id ?? ''), String(thread.id), session) }, destructive: true },
          ],
        }))),

    sectionTitle('它最近做了什么'),
    (data?.recentActivity ?? []).length === 0
      ? muted('（还没有可讲的变动）')
      : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.8 } },
          ...(data?.recentActivity ?? []).map((item, index) => createElement('li', { key: `${String(item.at)}-${index}` },
            // Round 3 (2026-09-27): the live desk's longest activity row measured 173px — the
            // clamp-and-expand treatment R7 gave lean/why/它记, extended here after real data
            // showed this section carries long rows too. The timestamp rides inside the clamped
            // line so it stays visible at the head of the first line.
            createElement(ClampedText, {
              text: `${item.at === undefined || item.at === '' ? '' : `${shortTime(item.at)} `}${String(item.what ?? '')}`,
              maxLines: 3,
            })))),
    // R7: the counts carried no date of their own, while the desk's staleness line sits screens
    // above them in the narrow pane. The number and the moment it was counted travel together.
    sectionTitle(`我记住的规模${data?.generatedAt === undefined ? '' : ` · ${shortTime(String(data.generatedAt))}`}`),
    // R9: a count that could not open its panel says so, right under the numbers it belongs to.
    store.jumpError === undefined
      ? null
      : createElement('div', { style: { fontSize: '11px', color: 'var(--dsha-warn)', margin: '0 16px 6px' } }, store.jumpError),
    createElement('div', null,
      cell('记忆', data?.counts?.memories === undefined ? '—' : String(data.counts.memories), 'memoryRoom'),
      cell('知识', data?.counts?.knowledgeStable === undefined ? '—' : String(data.counts.knowledgeStable), 'knowledgeRoom'),
      cell('技能', data?.counts?.skills === undefined ? '—' : String(data.counts.skills), 'knowledgeRoom'),
      cell('在跟的事', data?.counts?.threads === undefined ? '—' : String(data.counts.threads))),
    ...panelAlerts(store),
    createElement('div', null,
      createElement('div', {
        title: `桌面跟随你当前对话的工作区${store.source === undefined || store.source === '' ? '' : `：${store.source}`}——换一个对话，这里显示的就是那一个的桌面。`,
        style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', margin: 0 },
      }, `桌面跟随当前对话的工作区`
        + (store.data?.generatedAt === undefined ? '' : `，更新于 ${shortTime(store.data.generatedAt)}`)
        + '（换一个对话，桌面跟着换）')))
}

/** Panel 2 — the knowledge room: what the assistant knows, and what is waiting for review. */
export function KnowledgePanel(props?: { sessionId?: string }): unknown {
  const session = props?.sessionId
  const store = useDesk(session)
  const { useEffect, useRef } = reactSurface()
  const draftsAnchor = useRef<{ current?: { scrollIntoView?: (options?: unknown) => void } | null } | null>(null)
  useEffect(() => {
    if (store.focusKnowledge !== 'drafts') return
    try {
      const node = draftsAnchor.current as { scrollIntoView?: (options?: unknown) => void } | null | undefined
      node?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    } catch {
      // No DOM (tests) or scroll refused: the highlight still marks the block.
    }
    const timer = setTimeout(() => { patchDesk({ focusKnowledge: undefined }) }, 4000)
    return () => { clearTimeout(timer) }
  }, [store.focusKnowledge])
  const pages = store.data?.knowledge ?? []
  const drafts = pages.filter(page => page.status === 'draft')
  const stable = pages.filter(page => page.status === 'stable')
  // Deprecated pages are their own group: they stay in place so links resolve, and they are not
  // "confirmed" — lumping them in with stable pages would overstate what the assistant knows.
  const deprecated = pages.filter(page => page.status === 'deprecated')
  const row = (page: typeof pages[number], mark: string): ReturnType<typeof createElement> =>
    createElement(CorrectableRow, {
      key: String(page.id),
      rowId: String(page.id ?? page.title),
      primary: createElement('span', null, mark, String(page.title ?? page.id ?? '')),
      // The excerpt rides only on draft rows: that is where the approve decision happens, and
      // the excerpt is what turns a blind approval into an informed one (CEO friction #2).
      meta: [page.type === undefined ? '' : String(page.type), shortTime(page.updated)].filter(part => part !== '').join(' · '),
      excerpt: page.status === 'draft' ? page.excerpt : undefined,
      actionLabel: '有问题',
      placeholder: '哪里不对？',
      deskSession: session,
      source: (page.sources ?? []).join(' · '),
      onSubmit: (text: string) => { flagKnowledgePage(String(page.title ?? page.id ?? ''), text, String(page.id ?? page.title), session) },
      actions: page.status === 'draft'
        ? [{ label: '批准', run: () => { approveKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title), session) } }]
        : page.status === 'stable'
          ? [{ label: '过时了', run: () => { deprecateKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title), session) }, destructive: true }]
          : undefined,
    })
  return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
    createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '知识室'),
    createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '你凭什么这样判断？——依据、来源、待确认的草稿'),
    refreshRow(store),
    pages.length === 0
      ? muted('（还没有知识页，或桌面文件尚未刷新）')
      : createElement('div', null,
          sectionTitle(`待你审批（${drafts.length}）`),
          drafts.length === 0
            ? muted('（没有草稿在等）')
            : createElement('div', {
                ref: store.focusKnowledge === 'drafts' ? draftsAnchor : undefined,
                style: store.focusKnowledge === 'drafts'
                  ? { background: 'var(--dsha-warn-tint)', borderRadius: '6px', padding: '6px 8px', margin: '0 -8px' }
                  : undefined,
              },
              store.focusKnowledge === 'drafts'
                // Surface-neutral on purpose: the pointer now has two senders (the desk's
                // draft line and the composer's approval banner), so the text must not
                // claim the principal came from the desk.
                ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsha-warn)', marginBottom: '4px' } }, '↑ 你刚点过来的那批')
                : null,
              createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsha-warn)' } },
                ...drafts.map(page => row(page, '⚠ ')))),
          // Inline skill proposals (B2, 2026-10-06): the review inbox rides the same panel as
          // the knowledge drafts — one-click approve/reject in place, no separate chore. The
          // proposals come from the desk file's `knowledge` section (drafts the assistant
          // proposes as skills, not pages); each row carries CorrectableRow for the reject
          // reason and one-click approve, same shape as the knowledge draft rows above.
          (store.data?.knowledge ?? []).some(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed')
            ? createElement('div', null,
                sectionTitle(`技能提案（${(store.data?.knowledge ?? []).filter(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed').length}）`),
                ...(store.data?.knowledge ?? [])
                  .filter(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed')
                  .map(item => createElement(CorrectableRow, {
                    key: String(item.id ?? item.title),
                    rowId: `proposal-${String(item.id ?? item.title)}`,
                    primary: createElement('span', null,
                      createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.title ?? item.id ?? '')),
                      (item as { description?: string }).description !== undefined
                        ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, String((item as { description?: string }).description))
                        : null),
                    actionLabel: '批准',
                    placeholder: '不批准的理由（可选，会记进提案文件）',
                    deskSession: session,
                    onSubmit: (text: string) => {
                      if (text.trim() === '') {
                        askApproveProposal(String(item.title ?? item.id ?? ''), session)
                      } else {
                        askRejectProposal(String(item.title ?? item.id ?? ''), text, session)
                      }
                    },
                    actions: [{ label: '批准', run: () => { askApproveProposal(String(item.title ?? item.id ?? ''), session) } }],
                  })))
            : null,
          sectionTitle(`已确认（${stable.length}）`),
          stable.length === 0
            ? muted('（还没有已确认的知识页）')
            : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)' } },
                ...stable.map(page => row(page, '✓ '))),
          deprecated.length === 0
            ? null
            : createElement('div', null,
                sectionTitle(`已退役（${deprecated.length}）`),
                createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)' } },
                  ...deprecated.map(page => row(page, '— '))))),
    sectionTitle('技能'),
    (store.data?.skills ?? []).length === 0
      ? muted('（还没有技能）')
      // A count, not a list: the principal cannot judge `repo-to-knowledge`, and the descriptions
      // are model-facing English (repository rule), so a 71-line English list is noise on their
      // surface — content eligibility before layout (2026-09-26 reviews).
      : muted(`共 ${String((store.data?.skills ?? []).length)} 件（随包 ${String((store.data?.skills ?? []).filter(skill => skill.kind !== 'learned').length)} · 学来的 ${String((store.data?.skills ?? []).filter(skill => skill.kind === 'learned').length)}）——哪一件不想要了，在对话里说一声即可下掉`),
    ...panelAlerts(store))
}

/**
 * The memory room, grouped by what the record is about — the split a digital twin lives on:
 * how the principal works (preferences and their decisions) versus the world it learned (facts).
 * One flat list hides that; a kind label per row is not enough to scan by.
 * @param memories - Every active record the desk file carries.
 * @returns Section headings and rows, as an element array to spread.
 */
export function memoryGroups(memories: NonNullable<DeskData['memories']>, session?: string): ReturnType<typeof createElement>[] {
  const groups: { key: string, label: string }[] = [
    { key: 'preference', label: '你的偏好' },
    { key: 'decision', label: '你的决定' },
    { key: 'fact', label: '事实' },
  ]
  const known = new Set(groups.map(group => group.key))
  const rest = memories.filter(memory => !known.has(String(memory.kind ?? '')))
  const out: ReturnType<typeof createElement>[] = []
  for (const group of [...groups, { key: '__rest', label: '其它' }]) {
    const items = group.key === '__rest'
      ? rest
      : memories.filter(memory => String(memory.kind ?? '') === group.key)
    if (items.length === 0) continue
    out.push(sectionTitle(`${group.label}（${items.length}）`))
    out.push(createElement('ul', { key: group.key, style: { margin: 0, padding: 0 } },
      ...items.map(memory => createElement(CorrectableRow, {
        key: String(memory.id),
        rowId: String(memory.id),
        primary: String(memory.text ?? ''),
        meta: shortTime(memory.updated),
        actionLabel: '这条记错了',
        placeholder: '正确的是什么？',
        deskSession: session,
        source: memory.source,
        onSubmit: (text: string) => { correctMemory(String(memory.text ?? ''), text, String(memory.id), session) },
      }))))
  }
  return out
}

/** Panel 3 — the memory room: what the assistant has written down about the principal. */
export function MemoryPanel(props?: { sessionId?: string }): unknown {
  const session = props?.sessionId
  const store = useDesk(session)
  const memories = store.data?.memories ?? []
  return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
    createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '记忆室'),
    createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '你把我理解成什么？——偏好、决定、事实，每条可纠错'),
    refreshRow(store, session),
    memories.length === 0
      ? muted('（还没有记忆，或桌面文件尚未刷新）')
      : createElement('div', null, ...memoryGroups(memories, session)),
    sectionTitle('规模'),
    createElement('div', null,
      cell('记忆', store.data?.counts?.memories === undefined ? '—' : String(store.data.counts.memories)),
      cell('在跟的事', store.data?.counts?.threads === undefined ? '—' : String(store.data.counts.threads))),
    ...panelAlerts(store))
}
