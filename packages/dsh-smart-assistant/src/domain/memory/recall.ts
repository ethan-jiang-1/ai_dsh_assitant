/**
 * Recall ranking for memory records.
 *
 * Ranking is deterministic and explainable on purpose: a memory system whose retrieval a person
 * cannot predict is a memory system they cannot audit. Every hit carries the reasons it matched, so
 * the model can tell a tag match from a lucky keyword and can explain the recall to the user.
 *
 * @module dsh-smart-assistant/memory/recall
 */

import type { MemoryKind, MemoryRecord } from './record.ts'

/** What a caller is looking for. */
export interface RecallQuery {
  /** Free-text terms matched against the claim text and the id. */
  readonly query?: string
  /** Restrict to one kind. */
  readonly kind?: MemoryKind
  /** Require every listed tag. */
  readonly tags?: readonly string[]
  /** Maximum hits returned. */
  readonly limit: number
}

/** One ranked record with the reasons it matched. */
export interface RecallHit {
  /** The matched record. */
  readonly record: MemoryRecord
  /** Ranking score; higher sorts first. */
  readonly score: number
  /** Human-readable match reasons, in scoring order. */
  readonly why: readonly string[]
}

const TAG_SCORE = 3
const TERM_SCORE = 2
const RECENT_DAYS = 7
const STALE_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_COUNTED_TERMS = 4
/**
 * Importance dominates recency, so recall ranks records in the same spirit as the digest (strongest
 * first) instead of burying an explicitly important record under something merely new. Recency then
 * breaks ties among equally important records.
 */
const IMPORTANCE_WEIGHT = 1.5

function terms(query: string): string[] {
  const seen = new Set<string>()
  for (const raw of query.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 2) continue
    seen.add(raw)
    if (seen.size >= MAX_COUNTED_TERMS) break
  }
  return [...seen]
}

function ageInDays(updated: string, now: Date): number {
  const at = Date.parse(updated)
  if (Number.isNaN(at)) return Number.POSITIVE_INFINITY
  return (now.getTime() - at) / MS_PER_DAY
}

/**
 * Rank active records against a query.
 * @param records - Candidate records; non-active ones are ignored.
 * @param query - What to look for.
 * @param now - Timestamp used for recency scoring.
 * @returns Hits ordered by score then recency, truncated to `query.limit`.
 */
export function recallMemories(
  records: readonly MemoryRecord[],
  query: RecallQuery,
  now: Date,
): readonly RecallHit[] {
  const wantedTags = query.tags ?? []
  const wantedTerms = query.query === undefined ? [] : terms(query.query)
  const hits: RecallHit[] = []
  for (const record of records) {
    if (record.status !== 'active') continue
    if (query.kind !== undefined && record.kind !== query.kind) continue
    if (wantedTags.some(tag => !record.tags.includes(tag))) continue
    const why: string[] = []
    let score = 0
    for (const tag of wantedTags) {
      score += TAG_SCORE
      why.push(`tag:${tag}`)
    }
    const haystack = `${record.id}\n${record.text}`.toLowerCase()
    for (const term of wantedTerms) {
      if (haystack.includes(term)) {
        score += TERM_SCORE
        why.push(`term:${term}`)
      }
    }
    const age = ageInDays(record.updated, now)
    if (age <= RECENT_DAYS) {
      score += 2
      why.push('recent')
    } else if (age <= STALE_DAYS) {
      score += 1
      why.push('this month')
    }
    if (record.importance !== 3) {
      score += (record.importance - 3) * IMPORTANCE_WEIGHT
      why.push(`importance:${record.importance}`)
    }
    if (wantedTags.length === 0 && wantedTerms.length === 0) why.push('listing')
    hits.push({ record, score, why })
  }
  hits.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    const byUpdated = right.record.updated.localeCompare(left.record.updated)
    return byUpdated !== 0 ? byUpdated : left.record.id.localeCompare(right.record.id)
  })
  return hits.slice(0, Math.max(0, query.limit))
}
