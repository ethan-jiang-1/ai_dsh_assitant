/**
 * Memory room of the home: durable records the agent keeps across sessions
 * (`memory/`, archived as `memory/archive/`). Functions here implement {@link AssistantMemory}'s
 * memory methods; `listMemories` accepts only the room-listing operations it reads. Cordis may pass
 * its forwarding shadow as the host, and the public class methods remain one-line delegates.
 *
 * @module
 */
import type { AssistantMemory, RoomReadResult } from './service.ts'
import { touchDigest } from './curate-digest.ts'
import type { Room } from '../domain/home/room.ts'
import {
  DEFAULT_IMPORTANCE,
  IMPORTANCE_RANGE,
  memoryFromEntry,
  memoryToDocument,
  newMemoryId,
  type MemoryKind,
  type MemoryRecord,
} from '../domain/memory/record.ts'
import { recallMemories, type RecallHit, type RecallQuery } from '../domain/memory/recall.ts'

/** Read the memory room's active and archived entries. */
interface MemoryRoomReader {
  readonly memory: Pick<Room, 'list' | 'listArchived'>
}

/** The memory listing plus the configured default recall limit. */
interface MemoryRecallReader extends MemoryRoomReader {
  readonly recallLimit: number
}

/** Input for memory save. */
export interface SaveMemoryInput {
  /** The claim: one sentence or two, phrased so it can be falsified later. */
  readonly text: string
  /** What the claim asserts; defaults to `fact`. */
  readonly kind?: MemoryKind
  /** Retrieval tags. */
  readonly tags?: readonly string[]
  /** 1–5; defaults to 3. */
  readonly importance?: number
  /** Where the claim came from. */
  readonly source?: string
  /** Id of the record this one replaces; that record is archived as `superseded`. */
  readonly supersedes?: string
  /** Explicit file-name slug; defaults to a slug of `text`. */
  readonly slug?: string
}

/**
 * List memory records, active and archived.
 * @param host - The home service's active and archived memory listings.
 * @returns Active and archived records with the files that failed to parse.
 */
export async function listMemories(host: MemoryRoomReader): Promise<RoomReadResult<MemoryRecord> & { readonly archived: readonly MemoryRecord[] }> {
  const active = await host.memory.list()
  const archived = await host.memory.listArchived()
  return {
    entries: active.entries.map(memoryFromEntry).filter((record): record is MemoryRecord => record !== undefined),
    archived: archived.entries.map(memoryFromEntry).filter((record): record is MemoryRecord => record !== undefined),
    failures: [...active.failures, ...archived.failures],
  }
}

/**
 * Write a memory record, optionally superseding an existing one.
 *
 * Budget enforcement (tri-line proposal slice 1h; keying fixed 2026-10-02): a pure addition is
 * refused when the digest is already dropping **memory lines** off the desktop
 * (`omittedMemories > 0`) — the budget stops being advisory for the section that is actually
 * under pressure. The original `truncated` keying misfired once the fourth room landed: the
 * knowledge signpost tree truncating (a state no memory write can remediate) closed the memory
 * gate, so distilled facts stopped landing (G2 batch evidence: multiple sessions self-reported
 * "cannot save"). Superseding and retiring writes stay open because they replace or remove.
 * @param host - The home service whose memory room is written.
 * @param input - The claim and its metadata.
 * @returns The written record.
 * @throws when `text` is empty, `supersedes` names a missing record, `importance` is out of
 * range, or memory lines are being squeezed off the desktop and this write would only add.
 */
export async function saveMemory(host: AssistantMemory, input: SaveMemoryInput): Promise<MemoryRecord> {
  const text = input.text.trim()
  if (text.length === 0) throw new Error('assistant_memory save requires non-empty text')
  const importance = input.importance ?? DEFAULT_IMPORTANCE
  if (!Number.isInteger(importance) || importance < IMPORTANCE_RANGE.min || importance > IMPORTANCE_RANGE.max) {
    throw new Error(`importance must be an integer in ${IMPORTANCE_RANGE.min}–${IMPORTANCE_RANGE.max}`)
  }
  await host.ensureHome()
  if (input.supersedes === undefined) {
    const digest = await host.digest()
    if (digest.omittedMemories > 0) {
      throw new Error(
        `the digest is already dropping ${String(digest.omittedMemories)} active memory record(s) off the desktop — `
        + 'retire a record (forget) or supersede an existing one instead of adding; '
        + 'assistant_memory action=curate reports the pressure',
      )
    }
  }
  const now = new Date()
  const stamp = now.toISOString()
  const id = newMemoryId(now, text, undefined, input.slug)
  const record: MemoryRecord = {
    id,
    kind: input.kind ?? 'fact',
    status: 'active',
    created: stamp,
    updated: stamp,
    ...(input.source !== undefined ? { source: input.source } : {}),
    tags: [...(input.tags ?? [])],
    importance,
    ...(input.supersedes !== undefined ? { supersedes: input.supersedes } : {}),
    text,
  }
  if (input.supersedes !== undefined) {
    const existing = await host.memory.read(input.supersedes)
    if (existing === undefined) {
      throw new Error(`supersedes names "${input.supersedes}", which is not an active memory record`)
    }
  }
  const document = memoryToDocument(record)
  await host.memory.write(record.id, document.data, document.body)
  // Archive only after the replacement exists: a failed archive leaves two readable records,
  // which the digest shows and curation reports, instead of losing the old claim.
  if (input.supersedes !== undefined) await host.memory.archive(input.supersedes, { status: 'superseded' })
  touchDigest(host)
  return record
}

/**
 * Move a memory record out of the active set.
 * @param host - The home service whose memory room is written.
 * @param id - Record id.
 * @returns Whether an active record was archived.
 */
export async function forgetMemory(host: AssistantMemory, id: string): Promise<boolean> {
  const archived = await host.memory.archive(id, { status: 'retired' })
  if (archived) touchDigest(host)
  return archived
}

/**
 * Rank active memory records.
 * @param host - The home service whose memory room is ranked.
 * @param query - What to look for; `limit` defaults to the configured recall limit.
 * @returns Ranked hits with match reasons.
 */
export async function recall(host: MemoryRecallReader, query: Omit<RecallQuery, 'limit'> & { readonly limit?: number }): Promise<readonly RecallHit[]> {
  const listing = await listMemories(host)
  const now = new Date()
  return recallMemories(listing.entries, { ...query, limit: query.limit ?? host.recallLimit }, now)
}
