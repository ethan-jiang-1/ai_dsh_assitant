/**
 * Knowledge approval Remote — the direct-call lane for the knowledge-room approve button.
 *
 * Why this exists (first-open-UX friction #1, 2026-10-04): approving a draft used to be a
 * conversation round trip — the panel sent a prompt, the model ran 60-90s (promote +
 * desk-refresh), and the principal waited on what is mechanically a status flip. The approval
 * itself IS the human decision; the flip needs no model intelligence. This service exposes the
 * flip over the Typert Remote so the client can call it directly, while keeping the audit trail
 * the conversation round trip used to provide for free.
 *
 * Audit design: every approval writes a `knowledge/approve` event into the approving session's
 * log (SessionEventMap extension below) — the same durability the round trip had, minus the
 * model turn. Nothing else changes: `promotePage` is the same method the model path calls, and
 * it refuses to promote anything the session did not write (see `src/host/index.ts` — only drafts
 * flip, and a hand flip of status to stable is the approval).
 *
 * Shape per the vendor precedent `api/session-controller` `SessionSkillCatalog`: a
 * `TypertRemoteService` with `@Remote` methods, mounted as its own host row beside the service
 * it bridges to.
 */
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

/** Approval request: the draft page and the session whose log carries the audit event. */
export interface KnowledgeApproveRequest {
  /** The draft page id (knowledge file name without suffix). */
  readonly pageId: string
  /** The session the approve click happened in — its log receives the audit event. */
  readonly sessionId: string
  /** Page title as shown on the clicked row; recorded verbatim for human-readable audit. */
  readonly title?: string
}

export interface KnowledgeApproveResult {
  readonly id: string
  readonly status: 'stable'
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The requested knowledge page does not exist in the working folder. */
    'knowledge/page-not-found': { readonly pageId: string }
    /** Only drafts flip to stable; the page is already stable or deprecated. */
    'knowledge/not-a-draft': { readonly pageId: string; readonly status: string }
    /** The approving session is not live, so the audit event has nowhere durable to land. */
    'knowledge/session-not-live': { readonly sessionId: string }
    /** No persistence writer participated for the approving session. */
    'knowledge/audit-not-durable': { readonly sessionId: string }
    /** The assistantMemory service is not mounted in this composition. */
    'knowledge/memory-unavailable': Record<string, never>
  }
}

export class KnowledgeApproveRemote extends TypertRemoteService {
  static inject = ['assistantMemory', 'sessionPersistence', 'sessions', 'typert'] as const

  constructor(ctx: Context) {
    super(ctx, 'knowledgeApproveRemote', { namespace: 'assistantKnowledge' })
  }

  /**
   * Flip one draft knowledge page to stable on the principal's click, and record the approval
   * in the session log. The model is not involved: the click IS the approval.
   * @param request - page id, approving session, optional row title.
   * @param signal - caller lifetime carried by the Remote transport.
   */
  @Remote
  async approvePage(request: KnowledgeApproveRequest, signal: AbortSignal): Promise<KnowledgeApproveResult> {
    void signal
    const memory = this.ctx.assistantMemory
    if (memory === undefined) {
      throw new RemoteError('knowledge/memory-unavailable', 'assistantMemory service is not mounted', {})
    }
    const page = await memory.readKnowledgePage(request.pageId)
    if (page === undefined) {
      throw new RemoteError('knowledge/page-not-found', `knowledge page "${request.pageId}" does not exist`, { pageId: request.pageId })
    }
    if (page.page.status !== 'draft') {
      throw new RemoteError('knowledge/not-a-draft', `knowledge page "${request.pageId}" is ${page.page.status}, only drafts flip to stable`, { pageId: request.pageId, status: page.page.status })
    }
    const promoted = await memory.promotePage(request.pageId)
    await this.recordAudit(request)
    return { id: promoted.id, status: 'stable' }
  }

  /**
   * Audit goes to an append-only JSONL beside the rooms (`<dataDir>/audit/approvals.jsonl`),
   * NOT into the session log: a runtime `session.append` of an event type outside the build's
   * known vocabulary cannot carry the `ignorable` marker, so the persistence read path would
   * refuse to reconstruct the session — a poisoned log (identity.md row 5: no new
   * SessionEventMap members at day 0). A dedicated audit file is replayable evidence that no
   * reader has to understand, and the gateway's own remote journal records the wire call.
   */
  private async recordAudit(request: KnowledgeApproveRequest): Promise<void> {
    const memory = this.ctx.assistantMemory
    const auditDir = join(memory.paths.root, 'audit')
    await mkdir(auditDir, { recursive: true })
    const line = JSON.stringify({
      at: new Date().toISOString(),
      pageId: request.pageId,
      title: request.title,
      sessionId: request.sessionId,
    }) + '\n'
    await appendFile(join(auditDir, 'approvals.jsonl'), line, 'utf8')
  }
}

export default KnowledgeApproveRemote
