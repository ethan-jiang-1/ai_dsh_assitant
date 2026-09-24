/**
 * The digest: the bounded view of the home that rides in every model request.
 *
 * This is the desktop of the home, and its budget is the whole point. A digest that grows without
 * limit stops being a view and becomes a warehouse — and a full desktop is how the thing that
 * mattered gets missed. Selection is deterministic (strongest active memories first, then most
 * recent) so a person can predict what the model will have seen.
 *
 * @module dsh-smart-assistant/home/digest
 */

import type { MemoryRecord } from '../memory/record.ts'
import type { ResearchThread } from '../research/thread.ts'
import type { KnowledgePage } from '../knowledge/page.ts'

/** What the digest is rendered from. */
export interface DigestInput {
  /** The home status blurb; always rendered first. */
  readonly statusBlurb: string
  /** Candidate memory records; only active ones are considered. */
  readonly memories: readonly MemoryRecord[]
  /** Candidate threads; only open and parked ones are mentioned. */
  readonly threads: readonly ResearchThread[]
  /**
   * Knowledge pages for the signpost tree; the caller passes stable pages only (deprecated
   * pages stay findable through search, drafts are staged out of recall).
   */
  readonly pages: readonly KnowledgePage[]
  /** Byte budget for the whole digest. */
  readonly maxBytes: number
}

/** The rendered digest plus what it actually contained. */
export interface DigestResult {
  /** Digest text. */
  readonly text: string
  /** UTF-8 byte length of `text`. */
  readonly bytes: number
  /** Ids of the memory records that made it in, in render order. */
  readonly memoryIds: readonly string[]
  /** Number of open threads in the home (not only the ones listed). */
  readonly openThreads: number
  /** Number of parked threads in the home. */
  readonly parkedThreads: number
  /** Whether the budget cut the digest short. */
  readonly truncated: boolean
}

const MAX_OPEN_THREADS_LISTED = 5
const MAX_LINE_CHARS = 200

function bytes(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

function oneLine(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= MAX_LINE_CHARS ? flat : `${flat.slice(0, MAX_LINE_CHARS - 1)}…`
}

/**
 * Render the bounded digest.
 * @param input - Home contents and budget.
 * @returns The digest text with its byte size and contents.
 */
export function renderDigest(input: DigestInput): DigestResult {
  const openThreads = input.threads.filter(thread => thread.status === 'open')
  const parkedThreads = input.threads.filter(thread => thread.status === 'parked')
  const memories = input.memories
    .filter(record => record.status === 'active')
    .slice()
    .sort((left, right) => {
      if (right.importance !== left.importance) return right.importance - left.importance
      const byUpdated = right.updated.localeCompare(left.updated)
      return byUpdated !== 0 ? byUpdated : left.id.localeCompare(right.id)
    })

  const lines: string[] = []
  const memoryIds: string[] = []
  let used = 0
  let truncated = false

  const push = (line: string): boolean => {
    const cost = bytes(`${line}\n`)
    if (used + cost > input.maxBytes) {
      truncated = true
      return false
    }
    lines.push(line)
    used += cost
    return true
  }

  for (const line of input.statusBlurb.split('\n')) {
    if (!push(line)) break
  }

  if (memories.length > 0) {
    push('')
    push(`## What you know (${memories.length} active)`)
    for (const record of memories) {
      const line = `- [${record.kind}] ${oneLine(record.text)} (${record.id})`
      if (!push(line)) break
      memoryIds.push(record.id)
    }
  }

  if (openThreads.length > 0 || parkedThreads.length > 0) {
    push('')
    push(`## Open threads (${openThreads.length} open, ${parkedThreads.length} parked)`)
    for (const thread of openThreads.slice(0, MAX_OPEN_THREADS_LISTED)) {
      if (!push(`- ${oneLine(thread.question)} (${thread.id})`)) break
    }
  }

  // The knowledge signpost tree: names act as directory signposts (Letta MemFS's shape) —
  // one line per stable page, self-bounded by the same byte budget as everything else.
  const stablePages = input.pages
    .filter(page => page.status === 'stable')
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
  if (stablePages.length > 0) {
    push('')
    push(`## Knowledge (${stablePages.length} pages)`)
    for (const page of stablePages) {
      const name = page.title ?? page.id
      const hint = page.description ?? page.type
      if (!push(`- ${oneLine(name)} — ${oneLine(hint)} (${page.id})`)) break
    }
  }

  const text = lines.join('\n')
  return {
    text,
    bytes: bytes(text),
    memoryIds,
    openThreads: openThreads.length,
    parkedThreads: parkedThreads.length,
    truncated,
  }
}
