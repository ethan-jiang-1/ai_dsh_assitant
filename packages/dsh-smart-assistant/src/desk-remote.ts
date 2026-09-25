/**
 * A thin Remote face over the assistantMemory service: the browser's My Desk panel
 * calls `snapshot()` through the Remote layer to get live counts and thread summaries.
 *
 * Pattern from `@deepseek-ai/dsh-api-workspace-files` (WorkspaceFiles extends TypertRemoteService):
 * the constructor registers the wire name; `@Remote()` marks a method as browser-callable.
 *
 * @module dsh-smart-assistant/desk-remote
 */
import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type { AssistantMemory } from './index.ts'

/** What the My Desk panel renders. */
export interface DeskSnapshot {
  readonly counts: {
    readonly memories: number
    readonly knowledgeStable: number
    readonly knowledgeDraft: number
    readonly skills: number
    readonly threads: number
  }
  readonly threads: readonly { readonly id: string, readonly question: string, readonly status: string }[]
  readonly recentMemories: readonly { readonly id: string, readonly text: string, readonly kind: string }[]
}

/** Wire name the browser discovers this service under. */
export const DESK_REMOTE_NAME = 'assistantDesk'

/**
 * Expose a read-only snapshot of the assistant's working folder to the browser.
 * No mutations — the panel is a trust surface, not a work surface.
 */
export class AssistantDeskRemote extends TypertRemoteService {
  static inject = ['assistantMemory']

  constructor(ctx: Context) {
    super(ctx, DESK_REMOTE_NAME)
  }

  /** The host service this Remote face reads. */
  private get memory(): AssistantMemory {
    return this.ctx.get('assistantMemory') as AssistantMemory
  }

  /**
   * One call the desk panel needs: counts, open threads, recent memories.
   * @returns a snapshot of the working folder's live state.
   */
  @Remote()
  async snapshot(): Promise<DeskSnapshot> {
    const digest = await this.memory.digest()
    const curate = await this.memory.curate()
    const counts = curate.counts
    const threads = await this.memory.listThreads()
    const memories = await this.memory.listMemories()
    const recent = memories.entries
      .filter(record => record.status === 'active')
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, 5)
      .map(record => ({ id: record.id, text: record.text.slice(0, 120), kind: record.kind }))
    return {
      counts: {
        memories: counts.activeMemories ?? 0,
        knowledgeStable: counts.knowledgePages ?? 0,
        knowledgeDraft: 0,
        skills: counts.learnedSkills ?? 0,
        threads: counts.openThreads ?? 0,
      },
      threads: threads.entries
        .filter(thread => thread.status === 'open')
        .slice(0, 10)
        .map(thread => ({ id: thread.id, question: thread.question.slice(0, 100), status: thread.status })),
      recentMemories: recent,
    }
  }
}

/** Plugin wrapper: the composition row loads this, which creates the Remote service. */
export const name = 'assistant-desk-remote'
export const inject = ['assistantMemory']
export function apply(ctx: Context): void {
  new AssistantDeskRemote(ctx)
}
