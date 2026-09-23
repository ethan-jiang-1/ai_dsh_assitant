/**
 * The research thread vocabulary: what an unresolved line of inquiry looks like on disk, and the
 * three exits that close it.
 *
 * A thread is a question with a lean, not a task. Its value is the `lean` — the current best answer
 * and its weakness — because that is what lets a later session continue instead of restarting. The
 * required `reason` on a drop is enforced here rather than trusted to convention: a thread dropped
 * without a reason is a thread a future session will reopen.
 *
 * @module dsh-smart-assistant/research/thread
 */

import type { RoomEntry } from '../home/room.ts'
import { slugify } from '../memory/record.ts'

/** Where a thread sits in its lifecycle. */
export const THREAD_STATUSES = ['open', 'parked', 'promoted', 'dropped'] as const

/** A thread's lifecycle status. */
export type ThreadStatus = (typeof THREAD_STATUSES)[number]

/** Statuses that still live in the active set. */
export const ACTIVE_THREAD_STATUSES: readonly ThreadStatus[] = ['open', 'parked']

/** Statuses that have been closed and archived. */
export const CLOSED_THREAD_STATUSES: readonly ThreadStatus[] = ['promoted', 'dropped']

/** One unresolved line of inquiry. */
export interface ResearchThread {
  /** Entry id, equal to the file name without its suffix. */
  readonly id: string
  /** Lifecycle status. */
  readonly status: ThreadStatus
  /** What is not known yet, phrased so a later session can tell whether it got answered. */
  readonly question: string
  /** Why the question deserves attention. */
  readonly why: string
  /** Current best answer and its weakness, when there is one. */
  readonly lean?: string
  /** What has been learned so far, appended over the thread's life. */
  readonly evidence: readonly string[]
  /** ISO-8601 creation timestamp. */
  readonly created: string
  /** ISO-8601 timestamp of the last write. */
  readonly updated: string
  /** Where the thread came from: a session id, `user`, or `reflection`. */
  readonly source?: string
  /** For a promoted thread, the memory record or skill that carries the answer. */
  readonly promotedTo?: string
  /** For a dropped thread, why it was dropped. Required. */
  readonly reason?: string
}

/**
 * Mint a thread id.
 * @param now - Timestamp used for the date prefix.
 * @param question - Question text to slug when no explicit slug is given.
 * @param suffix - Uniqueness suffix; tests pass a fixed value.
 * @param slug - Explicit slug overriding the one derived from `question`.
 * @returns An id matching the entry-id grammar.
 */
export function newThreadId(now: Date, question: string, suffix?: string, slug?: string): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const unique = suffix ?? Math.random().toString(36).slice(2, 6).padEnd(4, '0')
  return `${date}-${slug ?? slugify(question)}-${unique}`
}

/**
 * Report every reason a frontmatter mapping is not a valid thread.
 * @param data - Parsed frontmatter fields.
 * @returns Problem descriptions; empty means valid.
 */
export function validateThreadData(data: Readonly<Record<string, unknown>>): string[] {
  const problems: string[] = []
  if (typeof data.id !== 'string' || data.id.length === 0) problems.push('missing id')
  if (!THREAD_STATUSES.includes(data.status as ThreadStatus)) {
    problems.push(`status must be one of ${THREAD_STATUSES.join(', ')}`)
  }
  if (typeof data.why !== 'string' || data.why.trim().length === 0) {
    problems.push('missing why (a thread without a reason to exist is a hobby)')
  }
  if (!Array.isArray(data.evidence) || data.evidence.some(item => typeof item !== 'string')) {
    problems.push('evidence must be a list of strings')
  }
  if (typeof data.created !== 'string' || data.created.length === 0) problems.push('missing created')
  if (typeof data.updated !== 'string' || data.updated.length === 0) problems.push('missing updated')
  if (data.status === 'dropped' && (typeof data.reason !== 'string' || data.reason.trim().length === 0)) {
    problems.push('a dropped thread must record a reason')
  }
  if (data.status === 'promoted' && (typeof data.promotedTo !== 'string' || data.promotedTo.length === 0)) {
    problems.push('a promoted thread must name what carries the answer')
  }
  if (data.lean !== undefined && typeof data.lean !== 'string') problems.push('lean must be a string')
  if (data.source !== undefined && typeof data.source !== 'string') problems.push('source must be a string')
  return problems
}

/**
 * Read a thread from a room entry.
 * @param entry - Parsed room entry.
 * @returns The thread, or `undefined` when the entry is not a valid thread.
 */
export function threadFromEntry(entry: RoomEntry): ResearchThread | undefined {
  if (validateThreadData(entry.data).length > 0) return undefined
  if (entry.body.length === 0) return undefined
  const data = entry.data
  return {
    id: entry.id,
    status: data.status as ThreadStatus,
    question: entry.body,
    why: data.why as string,
    ...(typeof data.lean === 'string' ? { lean: data.lean } : {}),
    evidence: (data.evidence as string[]).slice(),
    created: data.created as string,
    updated: data.updated as string,
    ...(typeof data.source === 'string' ? { source: data.source } : {}),
    ...(typeof data.promotedTo === 'string' ? { promotedTo: data.promotedTo } : {}),
    ...(typeof data.reason === 'string' ? { reason: data.reason } : {}),
  }
}

/**
 * Render a thread's frontmatter fields in reading order, dropping absent optionals.
 * @param thread - Thread to serialize.
 * @returns Frontmatter fields and the body to write.
 */
export function threadToDocument(thread: ResearchThread): { data: Record<string, unknown>, body: string } {
  return {
    data: {
      id: thread.id,
      status: thread.status,
      created: thread.created,
      updated: thread.updated,
      ...(thread.source !== undefined ? { source: thread.source } : {}),
      why: thread.why,
      ...(thread.lean !== undefined ? { lean: thread.lean } : {}),
      evidence: thread.evidence,
      ...(thread.promotedTo !== undefined ? { promotedTo: thread.promotedTo } : {}),
      ...(thread.reason !== undefined ? { reason: thread.reason } : {}),
    },
    body: thread.question,
  }
}
