/**
 * The memory record vocabulary: what a durable fact, preference, or decision looks like on disk.
 *
 * One claim per record is the rule the whole room depends on — a record holding three claims can
 * only be superseded as a unit, so the room rots faster than it grows. Validation is separate from
 * parsing so the curation check can report *why* a file is unusable instead of silently skipping it.
 *
 * @module dsh-smart-assistant/memory/record
 */

import type { RoomEntry } from '../home/room.ts'

/** What a record asserts. */
export const MEMORY_KINDS = ['fact', 'preference', 'decision'] as const

/** A record's kind. */
export type MemoryKind = (typeof MEMORY_KINDS)[number]

/** Where a record sits in its lifecycle. Only `active` records reach the digest. */
export const MEMORY_STATUSES = ['active', 'superseded', 'retired'] as const

/** A record's lifecycle status. */
export type MemoryStatus = (typeof MEMORY_STATUSES)[number]

/** Importance used when a caller does not supply one. */
export const DEFAULT_IMPORTANCE = 3

/** Lowest and highest accepted importance. */
export const IMPORTANCE_RANGE = { min: 1, max: 5 } as const

/** One durable memory record. */
export interface MemoryRecord {
  /** Entry id, equal to the file name without its suffix. */
  readonly id: string
  /** What the record asserts. */
  readonly kind: MemoryKind
  /** Lifecycle status. */
  readonly status: MemoryStatus
  /** ISO-8601 creation timestamp. */
  readonly created: string
  /** ISO-8601 timestamp of the last write. */
  readonly updated: string
  /** Where the claim came from: a session id, `user`, or `reflection`. */
  readonly source?: string
  /** Retrieval tags. */
  readonly tags: readonly string[]
  /** 1–5, used by digest selection and recall scoring. */
  readonly importance: number
  /** Id of the record this one replaces, when it replaces one. */
  readonly supersedes?: string
  /** The claim itself, one sentence or two. */
  readonly text: string
}

/**
 * Build a file-name-safe slug from arbitrary text.
 * @param text - Source text; non-ASCII text yields `note`, so callers that need a meaningful name pass one.
 * @param maxWords - Maximum words kept from the source.
 * @returns A slug matching the entry-id grammar.
 */
export function slugify(text: string, maxWords = 6): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .split(/[\s-]+/)
    .filter(word => word.length > 0)
    .slice(0, maxWords)
  const slug = words.join('-').slice(0, 48).replace(/-+$/g, '')
  return slug.length > 0 ? slug : 'note'
}

/**
 * Mint an entry id: sortable by date, readable by a person, unique by suffix.
 * @param now - Timestamp used for the date prefix.
 * @param text - Text to slug when no explicit slug is given.
 * @param suffix - Uniqueness suffix; tests pass a fixed value.
 * @param slug - Explicit slug overriding the one derived from `text`.
 * @returns An id matching the entry-id grammar.
 */
export function newMemoryId(now: Date, text: string, suffix?: string, slug?: string): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const unique = suffix ?? Math.random().toString(36).slice(2, 6).padEnd(4, '0')
  return `${date}-${slug ?? slugify(text)}-${unique}`
}

/**
 * Report every reason a frontmatter mapping is not a valid record.
 * @param data - Parsed frontmatter fields.
 * @returns Problem descriptions; empty means valid.
 */
export function validateMemoryData(data: Readonly<Record<string, unknown>>): string[] {
  const problems: string[] = []
  if (typeof data.id !== 'string' || data.id.length === 0) problems.push('missing id')
  if (!MEMORY_KINDS.includes(data.kind as MemoryKind)) {
    problems.push(`kind must be one of ${MEMORY_KINDS.join(', ')}`)
  }
  if (!MEMORY_STATUSES.includes(data.status as MemoryStatus)) {
    problems.push(`status must be one of ${MEMORY_STATUSES.join(', ')}`)
  }
  if (typeof data.created !== 'string' || data.created.length === 0) problems.push('missing created')
  if (typeof data.updated !== 'string' || data.updated.length === 0) problems.push('missing updated')
  if (typeof data.importance !== 'number'
    || !Number.isInteger(data.importance)
    || data.importance < IMPORTANCE_RANGE.min
    || data.importance > IMPORTANCE_RANGE.max) {
    problems.push(`importance must be an integer in ${IMPORTANCE_RANGE.min}–${IMPORTANCE_RANGE.max}`)
  }
  if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string')) {
    problems.push('tags must be a list of strings')
  }
  if (data.supersedes !== undefined && typeof data.supersedes !== 'string') {
    problems.push('supersedes must be an id string')
  }
  if (data.source !== undefined && typeof data.source !== 'string') {
    problems.push('source must be a string')
  }
  return problems
}

/**
 * Read a record from a room entry.
 * @param entry - Parsed room entry.
 * @returns The record, or `undefined` when the entry is not a valid record.
 */
export function memoryFromEntry(entry: RoomEntry): MemoryRecord | undefined {
  if (validateMemoryData(entry.data).length > 0) return undefined
  if (entry.body.length === 0) return undefined
  const data = entry.data
  return {
    id: entry.id,
    kind: data.kind as MemoryKind,
    status: data.status as MemoryStatus,
    created: data.created as string,
    updated: data.updated as string,
    ...(typeof data.source === 'string' ? { source: data.source } : {}),
    tags: (data.tags as string[]).slice(),
    importance: data.importance as number,
    ...(typeof data.supersedes === 'string' ? { supersedes: data.supersedes } : {}),
    text: entry.body,
  }
}

/**
 * Render a record's frontmatter fields in reading order, dropping absent optionals.
 * @param record - Record to serialize.
 * @returns Frontmatter fields and the body to write.
 */
export function memoryToDocument(record: MemoryRecord): { data: Record<string, unknown>, body: string } {
  return {
    data: {
      id: record.id,
      kind: record.kind,
      status: record.status,
      created: record.created,
      updated: record.updated,
      ...(record.source !== undefined ? { source: record.source } : {}),
      tags: record.tags,
      importance: record.importance,
      ...(record.supersedes !== undefined ? { supersedes: record.supersedes } : {}),
    },
    body: record.text,
  }
}
