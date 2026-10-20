/** Host-only read route for the maintenance panel; the rooms live in the assistant home. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type { AssistantMemory } from '../index.ts'
import { scanLearnedSkills } from '../../domain/skills/scan.ts'
import { createRoomsRoute, type RoomsActions, type RoomsReader } from './route.ts'
import { readApprovals, recordApproval } from '../approval-audit.ts'
import type { MemoryRecord } from '../../domain/memory/record.ts'

export const name = 'assistant-rooms'
export const inject = ['connection', 'assistantMemory', 'sessionQuery'] as const

/** Deployment knobs; the reader never accepts a caller-selected path. */
export interface Config {
  /** Complete JSON byte limit for one response; default 1 MiB. */
  readonly maxProjectionBytes?: number
}

export const Config: Schema<Config> = z.object({
  maxProjectionBytes: z.natural().min(1).default(1024 * 1024),
})

/**
 * Contribute the fixed GET route through the authenticated shared Connection carrier.
 * @param ctx - Host fiber owning the registration and its disposer.
 * @param config - Deployment byte limit.
 */
function messageTextOf(event: unknown): string | undefined {
  if (event === null || typeof event !== 'object') return undefined
  const data = (event as { data?: unknown }).data
  if (data === null || typeof data !== 'object') return undefined
  const content = (data as { content?: unknown, message?: { content?: unknown } }).content
    ?? (data as { message?: { content?: unknown } }).message?.content
  if (!Array.isArray(content)) return undefined
  const texts = content
    .filter((part): part is { type: 'text', text: string } => part !== null && typeof part === 'object' && (part as { type?: unknown }).type === 'text' && typeof (part as { text?: unknown }).text === 'string')
    .map(part => part.text)
  return texts.length === 0 ? undefined : texts.join('\n')
}

export function apply(ctx: Context, config: Config = {}): void {
  const memory: AssistantMemory = ctx.assistantMemory
  const reader: RoomsReader = {
    listMemories: () => memory.listMemories(),
    listThreads: () => memory.listThreads(),
    listKnowledge: () => memory.listKnowledge(),
    readKnowledgePage: id => memory.readKnowledgePage(id),
    readLearnedSkill: name => memory.readLearnedSkill(name),
    learnedSkills: async () => {
      const scan = await scanLearnedSkills(memory.paths.skillsDir)
      return { entries: scan.skills, failures: scan.failures }
    },
    skillUsage: () => memory.skillUsage(),
    ledger: () => readApprovals(memory),
  }
  const query = (ctx as unknown as { sessionQuery: { readEvent(sessionId: string, eventId: string): Promise<unknown> } }).sessionQuery
  const remember = async (sessionId: string, messageId: string): Promise<MemoryRecord> => {
    const event = await query.readEvent(sessionId, messageId)
    const text = messageTextOf(event)
    if (text === undefined) throw new Error(`assistant message "${messageId}" not found in session "${sessionId}"`)
    return memory.saveMemory({
      text,
      kind: 'fact',
      source: `panel:message:${sessionId}/${messageId}`,
    })
  }
  const actions: RoomsActions = {
    promotePage: (id, audit) => memory.promotePage(id, audit),
    deprecatePage: (id, audit) => memory.deprecatePage(id, audit),
    saveMemory: input => memory.saveMemory(input),
    forgetMemory: id => memory.forgetMemory(id),
    retireSkill: (name, reason) => memory.retireSkill(name, reason),
    remember,
    recordApproval: (kind, id, options) => recordApproval(memory, kind, id, options),
  }
  ctx.effect(() => ctx.connection.fetch.register(createRoomsRoute(reader, config.maxProjectionBytes ?? 1024 * 1024, actions)))
}
