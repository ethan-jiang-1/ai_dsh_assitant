/**
 * The rooms wire contract: one payload shape shared by the host route that builds it and the
 * client that reads it, plus the pure projection that produces it.
 *
 * Why (2026-10-23 review): the route assembled the payload inline, the client re-declared an
 * all-optional copy, a one-field guard accepted anything with `generatedAt`, and the client
 * re-computed the counts after every direct write. The dead `skill-proposal` branch in the
 * knowledge panel was the proof that neither side could see the other's type.
 *
 * This module is pure and dependency-free at runtime (type-only imports are erased), so the
 * client classic script can inline `parseRooms` and `countsOf` without a bare import.
 *
 * @module dsh-smart-assistant/domain/rooms/projection
 */

import type { LearnedSkillInfo } from '../home/health.ts'
import type { RoomReadFailure } from '../home/room.ts'
import type { KnowledgePage } from '../knowledge/page.ts'
import type { ApprovalLine } from '../maintenance/receipt.ts'
import type { MemoryRecord } from '../memory/record.ts'
import type { ResearchThread } from '../research/thread.ts'
import type { SkillUsageRead } from '../skills/usage.ts'

/** One memory row as the panel reads it. */
export interface RoomsMemoryRow {
  readonly id: string
  readonly kind: string
  readonly text: string
  readonly updated: string
  readonly source?: string
}

/** One research thread row. */
export interface RoomsResearchRow {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly why: string
  readonly lean?: string
  readonly updated: string
}

/** One learned-skill row, joined with its usage ledger entry. */
export interface RoomsSkillRow {
  readonly name: string
  readonly description: string
  readonly kind: string
  readonly origin?: string
  readonly source?: string
  readonly learnedAt?: string
  readonly count: number
  readonly lastUsedAt?: string
}

/** One knowledge-page row; the body is an excerpt, the full text is the detail query. */
export interface RoomsKnowledgeRow {
  readonly id: string
  readonly title?: string
  readonly status: string
  readonly type: string
  readonly description?: string
  readonly updated?: string
  readonly sources: readonly string[]
  readonly excerpt: string
}

/** One unreadable room entry, named by file (never by deployment path). */
export interface RoomsProblem {
  readonly room: 'memory' | 'research' | 'skills' | 'knowledge'
  readonly file: string
  readonly reason: string
}

/** The headline counts the panel shows. */
export interface RoomsCounts {
  readonly memories: number
  readonly threads: number
  readonly skills: number
  readonly knowledgeStable: number
  readonly knowledgeDraft: number
}

/** The wire payload the host route emits and the client parses. */
export interface RoomsPayload {
  readonly schemaVersion: 1
  readonly generatedAt: string
  readonly revision: string
  readonly counts: RoomsCounts
  readonly memories: readonly RoomsMemoryRow[]
  readonly research: readonly RoomsResearchRow[]
  readonly skills: readonly RoomsSkillRow[]
  readonly knowledge: readonly RoomsKnowledgeRow[]
  readonly ledger: readonly ApprovalLine[]
  readonly problems: readonly RoomsProblem[]
}

/** Everything the projection reads; the host passes its already-listed rooms through unchanged. */
export interface RoomsProjectionInput {
  readonly memories: { readonly entries: readonly MemoryRecord[], readonly failures: readonly RoomReadFailure[] }
  readonly threads: { readonly entries: readonly ResearchThread[], readonly failures: readonly RoomReadFailure[] }
  readonly knowledge: { readonly entries: readonly KnowledgePage[], readonly failures: readonly RoomReadFailure[] }
  readonly skills: { readonly entries: readonly LearnedSkillInfo[], readonly failures: readonly RoomReadFailure[] }
  readonly usage: SkillUsageRead
  readonly ledger: readonly ApprovalLine[]
  /** Optional override for tests; absent means "latest stamp across the rooms and the ledger". */
  readonly generatedAt?: string
}

/** The panel's preview is bounded; the full text is served by the knowledge detail query. */
function excerpt(body: string): string {
  return body.length > 200 ? body.slice(0, 200) : body
}

/** A failure path's file name without importing `node:path` into the client bundle. */
function fileName(path: string): string {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return cut < 0 ? path : path.slice(cut + 1)
}

/** Latest ISO stamp across the rooms and the usage ledger; absent data falls back to the epoch. */
function latestStamp(values: readonly (string | undefined)[]): string {
  const stamps = values
    .flatMap(value => typeof value === 'string' && value.length > 0 ? [Date.parse(value)] : [])
    .filter(stamp => Number.isFinite(stamp))
  return stamps.length === 0 ? new Date(0).toISOString() : new Date(Math.max(...stamps)).toISOString()
}

function problem(room: RoomsProblem['room'], failures: readonly RoomReadFailure[]): RoomsProblem[] {
  return failures.map(failure => ({ room, file: fileName(failure.path), reason: failure.reason }))
}

/**
 * The counts arithmetic, shared by the host projection and the client's optimistic recount.
 * Every room is optional so the client can pass a settling partial payload.
 * @param rooms - The room rows, any of which may be absent.
 * @returns The five headline counts.
 */
export function countsOf(rooms: {
  readonly memories?: readonly unknown[]
  readonly threads?: readonly unknown[]
  readonly skills?: readonly unknown[]
  readonly knowledge?: readonly { readonly status?: string }[]
}): RoomsCounts {
  const knowledge = rooms.knowledge ?? []
  return {
    memories: rooms.memories?.length ?? 0,
    threads: rooms.threads?.length ?? 0,
    skills: rooms.skills?.length ?? 0,
    knowledgeStable: knowledge.filter(page => page.status === 'stable').length,
    knowledgeDraft: knowledge.filter(page => page.status === 'draft').length,
  }
}

/**
 * Build the rooms payload from the host's room listings.
 *
 * `revision` is left empty on purpose: it is a hash of the payload, and the host route owns that
 * byte-level concern. The caller fills it before emitting.
 * @param input - The room listings, usage ledger, approval ledger, and optional generated stamp.
 * @returns The payload, with an empty revision for the caller to fill.
 */
export function projectRooms(input: RoomsProjectionInput): RoomsPayload {
  const generatedAt = input.generatedAt ?? latestStamp([
    ...input.memories.entries.map(record => record.updated),
    ...input.threads.entries.map(thread => thread.updated),
    ...input.knowledge.entries.map(page => page.generated?.at),
    ...input.skills.entries.map(skill => skill.learnedAt),
    ...Object.values(input.usage.usage).map(entry => entry.lastUsedAt),
    ...input.ledger.map(line => line.at),
  ])
  return {
    schemaVersion: 1,
    generatedAt,
    revision: '',
    counts: countsOf({
      memories: input.memories.entries,
      threads: input.threads.entries,
      skills: input.skills.entries,
      knowledge: input.knowledge.entries,
    }),
    memories: input.memories.entries.map(record => ({
      id: record.id,
      kind: record.kind,
      text: record.text,
      updated: record.updated,
      ...(record.source !== undefined ? { source: record.source } : {}),
    })),
    research: input.threads.entries.map(thread => ({
      id: thread.id,
      title: thread.question,
      status: thread.status,
      why: thread.why,
      ...(thread.lean !== undefined ? { lean: thread.lean } : {}),
      updated: thread.updated,
    })),
    skills: input.skills.entries.map(skill => {
      const name = skill.name ?? ''
      const entry = input.usage.usage[name]
      return {
        name,
        description: skill.description ?? '',
        kind: 'learned',
        ...(skill.origin !== undefined ? { origin: skill.origin } : {}),
        ...(skill.source !== undefined ? { source: skill.source } : {}),
        ...(skill.learnedAt !== undefined ? { learnedAt: skill.learnedAt } : {}),
        count: entry?.count ?? 0,
        ...(entry?.lastUsedAt !== undefined ? { lastUsedAt: entry.lastUsedAt } : {}),
      }
    }),
    knowledge: input.knowledge.entries.map(page => ({
      id: page.id,
      ...(page.title !== undefined ? { title: page.title } : {}),
      status: page.status,
      type: page.type,
      ...(page.description !== undefined ? { description: page.description } : {}),
      ...(page.generated?.at !== undefined ? { updated: page.generated.at } : {}),
      sources: page.sources.map(source => source.resource),
      excerpt: excerpt(page.body),
    })),
    ledger: input.ledger,
    problems: [
      ...problem('memory', input.memories.failures),
      ...problem('research', input.threads.failures),
      ...problem('knowledge', input.knowledge.failures),
      ...problem('skills', input.skills.failures),
    ],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Accept one route response as the rooms payload. The guard checks the top-level contract the
 * client depends on (stamp, revision, counts, every row list) rather than one field, so an error
 * body or a shape from another route cannot be presented as the rooms.
 * @param value - Parsed JSON from `GET /api/assistant/rooms`.
 * @returns The payload, or undefined when the value is not the route's shape.
 */
export function parseRooms(value: unknown): RoomsPayload | undefined {
  if (!isRecord(value)) return undefined
  if (value.schemaVersion !== 1) return undefined
  if (typeof value.generatedAt !== 'string' || value.generatedAt.trim() === '') return undefined
  if (typeof value.revision !== 'string') return undefined
  if (!isRecord(value.counts)) return undefined
  for (const key of ['memories', 'threads', 'skills', 'knowledgeStable', 'knowledgeDraft']) {
    if (typeof value.counts[key] !== 'number') return undefined
  }
  for (const key of ['memories', 'research', 'skills', 'knowledge', 'ledger', 'problems']) {
    if (!Array.isArray(value[key])) return undefined
  }
  return value as unknown as RoomsPayload
}
