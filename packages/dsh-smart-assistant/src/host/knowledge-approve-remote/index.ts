/**
 * Knowledge approval Remote — the direct-call lane for the knowledge-room approve button.
 *
 * Why this exists (first-open-UX friction #1, 2026-10-04): approving a draft used to be a
 * conversation round trip — the panel sent a prompt, the model ran 60-90s (promote +
 * the old room-data rewrite), and the principal waited on what is mechanically a status flip. The approval
 * itself IS the human decision; the flip needs no model intelligence. This service exposes the
 * flip over the Typert Remote so the client can call it directly.
 *
 * Current reachability (approve-direct-call card, 2026-10-04): the client-side mount fails
 * under the upstream strict codec (a classic-script bundle's module table cannot satisfy it),
 * so in practice the panel falls back to the legacy prompt path until the upstream seam moves.
 * The service stays mounted and tested so the lane is ready when it does.
 *
 * Audit design (revised off the session log, 2026-10-04): a runtime `session.append` of an
 * unknown event type cannot carry the `ignorable` marker, so the persistence read path would
 * refuse to reconstruct the session — a poisoned log. Every approval instead appends a line to
 * the shared approval ledger (`<dataDir>/audit/approvals.jsonl`) through `promotePage` itself
 * (BUG-004, 2026-10-07: the same ledger now also receives the model path's transitions, with
 * `source: 'panel-direct'` distinguishing a click from a model turn).
 *
 * Shape per the vendor precedent `api/session-controller` `SessionSkillCatalog`: a
 * `TypertRemoteService` with `@Remote` methods, mounted as its own host row beside the service
 * it bridges to.
 */
import type { Context } from '@deepseek-ai/cordis'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

/** Approval request: the draft page and the session the click happened in. */
export interface KnowledgeApproveRequest {
  /** The draft page id (knowledge file name without suffix). */
  readonly pageId: string
  /** The session the approve click happened in — recorded on the ledger line. */
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
    /** The assistantMemory service is not mounted in this composition. */
    'knowledge/memory-unavailable': Record<string, never>
  }
}

export class KnowledgeApproveRemote extends TypertRemoteService {
  static inject = ['assistantMemory', 'typert'] as const

  constructor(ctx: Context) {
    super(ctx, 'knowledgeApproveRemote', { namespace: 'assistantKnowledge' })
  }

  /**
   * Flip one draft knowledge page to stable on the principal's click. The model is not
   * involved: the click IS the approval. The ledger line is written inside `promotePage`
   * with `source: 'panel-direct'`, so both lanes share one approval ledger.
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
    const promoted = await memory.promotePage(request.pageId, {
      source: 'panel-direct',
      sessionId: request.sessionId,
      ...(request.title !== undefined ? { title: request.title } : {}),
    })
    return { id: promoted.id, status: 'stable' }
  }
}

export default KnowledgeApproveRemote
