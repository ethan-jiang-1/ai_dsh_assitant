/**
 * The desk's room-data action wrappers: one function per principal-facing panel action, each
 * composing the wording the conversation receives. They are pure text + dispatch over
 * `sendPrompt` — the send, the poller and the desk-file reads live in `./room-data-io`, the
 * direct-call lane's remote accessor comes back from there too.
 *
 * @module dsh-smart-assistant/client/room-data-actions
 */

import { patchDesk } from './room-data-core'
import { getDeskRemote, sendPrompt } from './room-data-io'

/**
 * Every desk action ends the same way: the desk-refresh skill owns the rewrite. Naming the
 * skill in the message makes the model's path explicit instead of hoping skill discovery fires
 * on a small model (measured 2026-09-26: cold discovery skipped the skill on 2 of 3 live runs).
 * The panel and the skill ship together; the pairing is recorded on the campaign card §四·十九.
 */
const DESK_REFRESH_STEP = '完成后加载 desk-refresh 技能，把房间数据文件重写一遍。'
export { DESK_REFRESH_STEP }

/** Ask the assistant to refresh the room data file; the poller re-reads until it actually moves. */
export function askRefresh(sessionId?: string): void {
  sendPrompt('刷新房间数据：加载 desk-refresh 技能，严格按它把房间数据文件（.desk/state.json）重写一遍。', '刷新房间数据', 'desk', sessionId)
}

/**
 * Day-0's true start (real-user walk finding, 2026-10-06): on a desk-less folder the
 * refresh button produced an honest zero-report loop with no meaning — the principal
 * clicked it three times "not knowing what I'm doing". The empty desk's next step is the
 * first conversation, not a refresh; this invites that conversation in this session (on a
 * fresh folder the first-conversation skill takes it from here).
 */
export function askStart(sessionId?: string): void {
  sendPrompt('开始第一件事：从最近要我拍板、还要跟进的一件事说起。', '开始第一件事', 'desk', sessionId)
}

/**
 * Inline skill-proposal approval (B2, 2026-10-06): the click IS the approval — the prompt
 * asks the assistant to edit the proposal file's status to approved and then land_skill it
 * in the same turn. Same one-click shape as the knowledge draft's 批准 button, so every
 * review queue on the principal's surface is in-place, not a separate chore.
 */
export function askApproveProposal(name: string, sessionId?: string): void {
  sendPrompt(
    `面板代本人批准技能提案「${name}」：请把提案文件的 status 改为 approved，然后立刻 land_skill 落地。${DESK_REFRESH_STEP}`,
    '批准提案', name, sessionId,
  )
}

/** The rejection twin: the proposal is rejected with the principal's one-line reason. */
export function askRejectProposal(name: string, reason: string, sessionId?: string): void {
  sendPrompt(
    `面板代本人拒绝技能提案「${name}」：请把提案文件的 status 改为 rejected（理由：${reason}）。${DESK_REFRESH_STEP}`,
    '拒绝提案', name, sessionId,
  )
}

/**
 * Correct one memory record. This is the cultivation loop: the principal says which line is
 * wrong and what is right, and the assistant rewrites the record and refreshes the desk.
 */
export function correctMemory(text: string, correction: string, rowId: string, sessionId?: string): void {
  sendPrompt(
    `请更正这条记忆。原记录：「${text}」。正确的是：${correction}。${DESK_REFRESH_STEP}`,
    '更正', rowId, sessionId,
  )
}

/**
 * Approve one draft knowledge page. The counterpart of a correction: the principal says the page
 * is right, and the assistant promotes it so it starts counting in retrieval and the digest.
 *
 * Direct-call lane (approve-direct-call): the click IS the approval, so the flip goes straight
 * to the host service — seconds, not a model round trip — and the service writes the ledger
 * line (audit/approvals.jsonl, source: panel-direct). Without a session id, or before the
 * remote namespace mounts (first boot after install), it falls back to the legacy prompt path,
 * which is honest degradation rather than a silently lost approval. The desk file itself still
 * lists the row as a draft until the next desk-refresh turn rewrites it — a panel-side re-read
 * of the room state is the direct-call card's open item, so the success branch reports the
 * flip instead of pretending the desk already reflects it.
 */
export function approveKnowledgePage(title: string, rowId: string, sessionId?: string): void {
  const namespace = getDeskRemote()?.assistantKnowledge as { approvePage?: (request: unknown) => Promise<unknown> } | undefined
  if (typeof namespace?.approvePage === 'function' && sessionId !== undefined) {
    void namespace.approvePage({ pageId: rowId, sessionId, title }).then((result: unknown) => {
      const outcome = result as { ok?: boolean, error?: { message?: string } }
      if (outcome?.ok === false) {
        patchDesk({ note: outcome.error?.message ?? '批准未生效' })
        return
      }
      patchDesk({ note: `已批准：「${title}」入 stable（下次房间数据刷新移出待审）` })
    }).catch((reason: unknown) => {
      const text = String(reason)
      if (text.includes('only drafts flip')) {
        // Already stable — nothing to approve; the fallback prompt would ask the model to
        // re-promote a promoted page (idempotent but misleading).
        patchDesk({ note: '该页已是 stable，无需再批' })
        return
      }
      patchDesk({ note: `直调批准失败，回退指令通道：${text}` })
      sendPrompt(
        `面板代本人批准——知识页「${title}」已获批准：请把它从 draft 翻成 stable。${DESK_REFRESH_STEP}`,
        '批准', rowId, sessionId,
      )
    })
    return
  }
  sendPrompt(
    `面板代本人批准——知识页「${title}」已获批准：请把它从 draft 翻成 stable。${DESK_REFRESH_STEP}`,
    '批准', rowId, sessionId,
  )
}

/**
 * Mark one stable knowledge page past its use-by date. The page stays in place (links resolve)
 * but stops counting as current — the third lifecycle step beside approval and correction.
 */
export function deprecateKnowledgePage(title: string, rowId: string, sessionId?: string): void {
  sendPrompt(
    `知识页「${title}」过时了，请把它标记为 deprecated（保留在原处以便链接解析）。${DESK_REFRESH_STEP}`,
    '过时了', rowId, sessionId,
  )
}

/** Tell the assistant what is wrong with one knowledge page. */
export function flagKnowledgePage(title: string, problem: string, rowId: string, sessionId?: string): void {
  sendPrompt(
    `知识页「${title}」有问题：${problem}。请核对并更正这一页。${DESK_REFRESH_STEP}`,
    '提意见', rowId, sessionId,
  )
}
