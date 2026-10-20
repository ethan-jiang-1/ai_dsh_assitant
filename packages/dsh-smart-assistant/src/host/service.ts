/**
 * The host service's public shape, kept apart from its assembly.
 *
 * Room modules, the digest, and the self-turn installer consume a narrow structural contract:
 * the home paths, the four Room adapters, the digest cache and its budgets. Declaring it here
 * (instead of importing the class from `index.ts`) breaks the type-only cycle between the
 * service entry and its helpers; the entry composes the implementation and satisfies this
 * interface, and callers cannot reach into assembly internals by accident.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { DigestResult } from '../domain/home/digest.ts'
import type { HomePaths, ScaffoldResult } from '../domain/home/layout.ts'
import type { Room, RoomReadFailure } from '../domain/home/room.ts'
import type { KnowledgePage } from '../domain/knowledge/page.ts'
import type { MemoryRecord } from '../domain/memory/record.ts'
import type { ResearchThread } from '../domain/research/thread.ts'
import type { SkillProposal } from '../domain/skills/proposal.ts'

/** A room listing with its unreadable files. */
export interface RoomReadResult<T> {
  /** Parsed entries. */
  readonly entries: readonly T[]
  /** Files that exist but are not usable entries. */
  readonly failures: readonly RoomReadFailure[]
}

/** The working-folder capabilities the host helpers are allowed to rely on. */
export interface HomeHost {
  readonly ctx: Context
  readonly paths: HomePaths
  readonly memory: Room
  readonly research: Room
  readonly knowledge: Room
  readonly proposals: Room
  readonly digestMaxBytes: number
  readonly recallLimit: number
  readonly staleResearchDays: number
  readonly staleSkillDays: number
  readonly retireSkillDays: number
  readonly maintenanceEveryRounds: number
  readonly goalProposalTurns: boolean
  digestCache: DigestResult | undefined
  prewarmPromise: Promise<void> | undefined
  ensureHome(): Promise<ScaffoldResult>
  digest(): Promise<DigestResult>
  listMemories(): Promise<RoomReadResult<MemoryRecord> & { readonly archived: readonly MemoryRecord[] }>
  listThreads(): Promise<RoomReadResult<ResearchThread> & { readonly archived: readonly ResearchThread[] }>
  listKnowledge(): Promise<RoomReadResult<KnowledgePage>>
  listProposals(): Promise<RoomReadResult<SkillProposal>>
}

/** Room helpers name the host they receive; the alias keeps their signatures stable. */
export type AssistantMemory = HomeHost
