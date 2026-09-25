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
 * Reserved byte allowance for the omission markers the compact pass may need, so the marker can
 * always be appended without pushing the digest over its budget.
 */
const OMISSION_RESERVE_BYTES = 96

interface PassOptions {
  /** Knowledge lines drop their description hint — the tree keeps every page, just terser. */
  compactKnowledge: boolean
  /** Byte allowance withheld from data lines so omission markers still fit. */
  reserveBytes: number
}

interface PassResult {
  lines: string[]
  memoryIds: string[]
  used: number
  truncated: boolean
  omittedMemories: number
  omittedPages: number
}

/**
 * One rendering pass. `truncated` means the budget cut data lines; the caller decides whether to
 * degrade further or to spend the reserve on markers that announce what is missing.
 * @param input - Home contents and budget.
 * @param options - Degradation knob and the withheld allowance.
 */
function renderPass(input: DigestInput, options: PassOptions): PassResult {
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
  const budget = input.maxBytes - options.reserveBytes
  let used = 0
  let truncated = false
  let omittedMemories = 0
  let omittedPages = 0

  const push = (line: string): boolean => {
    const cost = bytes(`${line}\n`)
    if (used + cost > budget) {
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
    for (const [index, record] of memories.entries()) {
      const line = `- [${record.kind}] ${oneLine(record.text)} (${record.id})`
      if (!push(line)) {
        omittedMemories = memories.length - index
        break
      }
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
    for (const [index, page] of stablePages.entries()) {
      const name = oneLine(page.title ?? page.id)
      const line = options.compactKnowledge
        ? `- ${name} (${page.id})`
        : `- ${name} — ${oneLine(page.description ?? page.type)} (${page.id})`
      if (!push(line)) {
        omittedPages = stablePages.length - index
        break
      }
    }
  }

  return { lines, memoryIds, used, truncated, omittedMemories, omittedPages }
}

/**
 * Marker lines announcing what the budget left out. The digest may shorten what it shows, but it
 * never lies by omission: a reader must be able to tell that the desktop is partial (intent: know
 * what is here, and know what is not).
 * @param omittedMemories - Active records the pass could not fit.
 * @param omittedPages - Stable pages the pass could not fit.
 */
function omissionMarkers(omittedMemories: number, omittedPages: number): string[] {
  const markers: string[] = []
  if (omittedMemories > 0) markers.push(`- (+${omittedMemories} more active records omitted — digest budget)`)
  if (omittedPages > 0) markers.push(`- (+${omittedPages} more knowledge pages omitted — digest budget)`)
  return markers
}

/**
 * Render the bounded digest. Degradation order when the budget bites: drop the knowledge
 * descriptions first (every page stays signposted, just terser), then — only if that is still not
 * enough — stop listing entries and append an explicit omission marker. Markers are fitted by
 * dropping trailing data lines, never by dropping the marker.
 * @param input - Home contents and budget.
 * @returns The digest text with its byte size and contents.
 */
export function renderDigest(input: DigestInput): DigestResult {
  const full = renderPass(input, { compactKnowledge: false, reserveBytes: 0 })
  let chosen = full
  if (full.truncated) {
    const compact = renderPass(input, { compactKnowledge: true, reserveBytes: 0 })
    chosen = compact
    if (compact.truncated) {
      // Spend the reserve on markers: withhold their room, then trim data lines until they fit.
      // Two floors hold: the status blurb is never evicted (a digest with no map is worse than a
      // digest that admits it is partial), and the marker is best-effort — when even the blurb
      // cannot spare the room, the marker is dropped rather than the map.
      const reserve = Math.min(OMISSION_RESERVE_BYTES, Math.max(0, Math.floor(input.maxBytes / 4)))
      const reserved = renderPass(input, { compactKnowledge: true, reserveBytes: reserve })
      const markers = omissionMarkers(reserved.omittedMemories, reserved.omittedPages)
      const blurbLines = input.statusBlurb.split('\n').length
      const lines = reserved.lines.slice()
      let markerBytes = markers.reduce((total, marker) => total + bytes(`${marker}\n`), 0)
      let used = reserved.used
      while (lines.length > blurbLines && used + markerBytes > input.maxBytes) {
        const dropped = lines.pop()
        if (dropped !== undefined) used -= bytes(`${dropped}\n`)
      }
      const fits = used + markerBytes <= input.maxBytes
      if (fits) lines.push(...markers)
      chosen = {
        ...reserved,
        lines,
        used: fits ? used + markerBytes : used,
        truncated: true,
      }
    }
  }

  const text = chosen.lines.join('\n')
  const openThreads = input.threads.filter(thread => thread.status === 'open')
  const parkedThreads = input.threads.filter(thread => thread.status === 'parked')
  return {
    text,
    bytes: bytes(text),
    memoryIds: chosen.memoryIds,
    openThreads: openThreads.length,
    parkedThreads: parkedThreads.length,
    truncated: chosen.truncated,
  }
}
