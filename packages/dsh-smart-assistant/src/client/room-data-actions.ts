/**
 * The panel's room actions: the A2 direct writes (approve/deprecate/correct/retire) go through
 * the host `POST /api/assistant/rooms` route and patch the session's projection immediately;
 * the remaining conversation lanes (first start, knowledge flag, skill proposals) still send a
 * prompt. The direct paths never fall back to a prompt.
 *
 * @module dsh-smart-assistant/client/room-data-actions
 */

import { patchDesk } from './room-data-core'
import type { DeskData } from './room-data-core'
import type { ApprovalLine } from '../domain/maintenance/receipt.ts'
import { patchRoomRows, postRoomsAction, sendPrompt } from './room-data-io'

/**
 * Day-0's true start (real-user walk finding, 2026-10-06): on a desk-less folder the refresh
 * button produced an honest zero-report loop with no meaning. The empty desk's next step is the
 * first conversation, not a refresh.
 */
export function askStart(sessionId?: string): void {
  sendPrompt('开始第一件事：从最近要我拍板、还要跟进的一件事说起。', '开始第一件事', 'desk', sessionId)
}

/**
 * Inline skill-proposal approval (B2, 2026-10-06): the click IS the approval. The prompt asks
 * the assistant to edit the proposal file's status to approved and land_skill it in the same
 * turn. This lane stays on the conversation until C1 exposes the skills surface.
 */
export function askApproveProposal(name: string, sessionId?: string): void {
  sendPrompt(
    `面板代本人批准技能提案「${name}」：请把提案文件的 status 改为 approved，然后立刻 land_skill 落地。`,
    '批准提案', name, sessionId,
  )
}

/** The rejection twin: the proposal is rejected with the principal's one-line reason. */
export function askRejectProposal(name: string, reason: string, sessionId?: string): void {
  sendPrompt(
    `面板代本人拒绝技能提案「${name}」：请把提案文件的 status 改为 rejected（理由：${reason}）。`,
    '拒绝提案', name, sessionId,
  )
}

/** Append one direct-write ledger line to the projection so the A3 receipt sees it immediately. */
function withLedger(data: DeskData, line: ApprovalLine): DeskData {
  return { ...data, ledger: [...(data.ledger ?? []), line].slice(-200) }
}

/** Recompute the panel's counts from the rows after a direct write (one home for the arithmetic). */
function recount(data: DeskData): DeskData {
  return {
    ...data,
    counts: {
      ...data.counts,
      memories: (data.memories ?? []).length,
      skills: (data.skills ?? []).length,
      knowledgeDraft: (data.knowledge ?? []).filter(page => page.status === 'draft').length,
      knowledgeStable: (data.knowledge ?? []).filter(page => page.status === 'stable').length,
    },
  }
}

/**
 * Approve one draft knowledge page through the host action route; patch the row immediately.
 * The failure is a readable note, never a prompt fallback (A2).
 * @param title - row title for the note/audit.
 * @param rowId - knowledge page id.
 * @param sessionId - the tab-bound session (audit context).
 */
export function approveKnowledgePage(title: string, rowId: string, sessionId?: string): void {
  void postRoomsAction('knowledge.approve', { id: rowId, title, ...(sessionId !== undefined ? { sessionId } : {}) }).then(outcome => {
    if (!outcome.ok) {
      patchDesk({ note: `批准失败：${outcome.reason}` })
      return
    }
    patchRoomRows(sessionId, data => withLedger(recount({
      ...data,
      knowledge: (data.knowledge ?? []).map(page =>
        String(page.id ?? page.title) === rowId ? { ...page, status: 'stable' } : page),
    }), {
      at: new Date().toISOString(), kind: 'promote', id: rowId, title,
      room: 'knowledge', source: 'panel-direct', before: { status: 'draft' }, after: { status: 'stable' },
    }))
    patchDesk({ note: `已批准：「${title}」入 stable` })
  })
}

/**
 * Mark one stable knowledge page deprecated through the host route; patch the row immediately.
 * @param title - row title for the note.
 * @param rowId - knowledge page id.
 * @param sessionId - the tab-bound session (audit context).
 */
export function deprecateKnowledgePage(title: string, rowId: string, sessionId?: string): void {
  void postRoomsAction('knowledge.deprecate', { id: rowId, ...(sessionId !== undefined ? { sessionId } : {}) }).then(outcome => {
    if (!outcome.ok) {
      patchDesk({ note: `标记过时失败：${outcome.reason}` })
      return
    }
    patchRoomRows(sessionId, data => withLedger(recount({
      ...data,
      knowledge: (data.knowledge ?? []).map(page =>
        String(page.id ?? page.title) === rowId ? { ...page, status: 'deprecated' } : page),
    }), {
      at: new Date().toISOString(), kind: 'deprecate', id: rowId, title,
      room: 'knowledge', source: 'panel-direct', before: { status: 'stable' }, after: { status: 'deprecated' },
    }))
    patchDesk({ note: `已标记过时：「${title}」` })
  })
}

/**
 * Correct one memory via a superseding record: the old file is archived by the host service,
 * the new row replaces it in place. No prompt, no in-place body edit.
 * @param correction - the corrected sentence.
 * @param rowId - the active memory record id.
 * @param sessionId - the tab-bound session (audit context).
 */
export function correctMemory(correction: string, rowId: string, sessionId?: string): void {
  void postRoomsAction('memory.correct', { id: rowId, text: correction, ...(sessionId !== undefined ? { sessionId } : {}) }).then(outcome => {
    if (!outcome.ok) {
      patchDesk({ note: `更正失败：${outcome.reason}` })
      return
    }
    const newId = typeof outcome.value.id === 'string' ? outcome.value.id : rowId
    patchRoomRows(sessionId, data => withLedger(recount({
      ...data,
      memories: (data.memories ?? []).map(memory =>
        String(memory.id) === rowId
          ? { ...memory, id: newId, text: correction, updated: new Date().toISOString(), source: 'panel-direct' }
          : memory),
    }), {
      at: new Date().toISOString(), kind: 'correct', id: newId, title: correction,
      room: 'memory', source: 'panel-direct', before: { id: rowId }, after: { id: newId, text: correction },
    }))
    patchDesk({ note: '已更正这条记忆（旧记录进 archive）' })
  })
}

/**
 * Retire one memory record out of the active set (the host archives it; nothing is deleted).
 * @param id - memory record id.
 * @param sessionId - the tab-bound session (audit context).
 */
export function retireMemory(id: string, sessionId?: string): void {
  void postRoomsAction('memory.retire', { id, ...(sessionId !== undefined ? { sessionId } : {}) }).then(outcome => {
    if (!outcome.ok) {
      patchDesk({ note: `退役失败：${outcome.reason}` })
      return
    }
    patchRoomRows(sessionId, data => withLedger(recount({
      ...data,
      memories: (data.memories ?? []).filter(memory => String(memory.id) !== id),
    }), {
      at: new Date().toISOString(), kind: 'retire', id,
      room: 'memory', source: 'panel-direct', before: { status: 'active' }, after: { status: 'retired' },
    }))
    patchDesk({ note: '已退役这条记忆（archive 里可找回）' })
  })
}

/**
 * Retire one learned skill (the host moves the bundle to `skills/archive/`; nothing is deleted).
 * The per-skill list UI lands in C1; the action is already available to it.
 * @param name - skill name.
 * @param sessionId - the tab-bound session (audit context).
 */
export function retireSkill(name: string, sessionId?: string): void {
  void postRoomsAction('skill.retire', { name, ...(sessionId !== undefined ? { sessionId } : {}) }).then(outcome => {
    if (!outcome.ok) {
      patchDesk({ note: `技能退役失败：${outcome.reason}` })
      return
    }
    patchRoomRows(sessionId, data => withLedger(recount({
      ...data,
      skills: (data.skills ?? []).filter(skill => skill.name !== name),
    }), {
      at: new Date().toISOString(), kind: 'retire', id: name,
      room: 'skills', source: 'panel-direct', before: { status: 'active' }, after: { status: 'archived' },
    }))
    patchDesk({ note: `已退役技能「${name}」（archive 里可找回）` })
  })
}

/** Tell the assistant what is wrong with one knowledge page (conversation lane; kept for A2). */
export function flagKnowledgePage(title: string, problem: string, rowId: string, sessionId?: string): void {
  sendPrompt(
    `知识页「${title}」有问题：${problem}。请核对并更正这一页。`,
    '提意见', rowId, sessionId,
  )
}
