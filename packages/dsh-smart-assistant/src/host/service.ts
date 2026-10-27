/**
 * The host service's full public shape, kept apart from its assembly.
 *
 * Consumers: the room modules, the digest, and the self-turn installer take the structural
 * slice (home paths, four Room adapters, digest cache, budgets); the panel routes (rooms-route,
 * viki) additionally call the room-facing reads and writes the service class implements. The
 * payload vocabulary imported from the memory room (`SaveMemoryInput`) is a deliberate
 * `import type` edge — erased at runtime, so the emitted import graph stays acyclic. Declaring
 * it here (instead of importing the class from `index.ts`) breaks the type-only cycle between
 * the service entry and its helpers; the entry composes the implementation and satisfies this
 * interface, and callers cannot reach into assembly internals by accident.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { DigestResult } from '../domain/home/digest.ts'
import type { HomePaths, ScaffoldResult } from '../domain/home/layout.ts'
import type { Room, RoomReadFailure } from '../domain/home/room.ts'
import type { KnowledgePage, PageStatus } from '../domain/knowledge/page.ts'
import type { MemoryRecord } from '../domain/memory/record.ts'
import type { ResearchThread } from '../domain/research/thread.ts'
import type { SkillProposal } from '../domain/skills/proposal.ts'
import type { SkillUsageRead } from '../domain/skills/usage.ts'
import type { ApprovalAuditOptions } from './approval-audit.ts'
import type { SaveMemoryInput } from './memory-room.ts'

/** A room listing with its unreadable files. */
export interface RoomReadResult<T> {
  /** Parsed entries. */
  readonly entries: readonly T[]
  /** Files that exist but are not usable entries. */
  readonly failures: readonly RoomReadFailure[]
}

/** The working-folder capabilities the host helpers and panel routes rely on. */
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
  digestFingerprint: string | undefined
  prewarmPromise: Promise<void> | undefined
  ensureHome(): Promise<ScaffoldResult>
  digest(): Promise<DigestResult>
  listMemories(): Promise<RoomReadResult<MemoryRecord> & { readonly archived: readonly MemoryRecord[] }>
  listThreads(): Promise<RoomReadResult<ResearchThread> & { readonly archived: readonly ResearchThread[] }>
  listKnowledge(): Promise<RoomReadResult<KnowledgePage>>
  listProposals(): Promise<RoomReadResult<SkillProposal>>
  /** Detail reads and writes the rooms/viki panel routes expose; the room modules implement the bodies. */
  readKnowledgePage(id: string): Promise<{ page: KnowledgePage, backlinks: readonly string[] } | undefined>
  readLearnedSkill(name: string): Promise<{ name: string, body: string, path: string } | undefined>
  skillUsage(): Promise<SkillUsageRead>
  saveMemory(input: SaveMemoryInput): Promise<MemoryRecord>
  forgetMemory(id: string): Promise<boolean>
  promotePage(id: string, audit?: ApprovalAuditOptions): Promise<{ id: string, path: string, status: PageStatus }>
  deprecatePage(id: string, audit?: ApprovalAuditOptions): Promise<{ id: string, path: string, status: PageStatus }>
  retireSkill(name: string, reason?: string): Promise<{ name: string, path: string }>
}

/** Room helpers name the host they receive; the alias keeps their signatures stable. */
export type AssistantMemory = HomeHost
