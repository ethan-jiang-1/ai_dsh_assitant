/**
 * Keyword search over knowledge pages (tri-line proposal 2026-09-24, phase 2 slice 2d): the
 * room's recall surface stays deliberately pre-semantic — word matching over titles,
 * descriptions, tags, and bodies, with the match reasons reported so the model can judge the
 * hit. Embedding stays deferred (the survey's trigger: real missed recalls).
 *
 * @module dsh-smart-assistant/knowledge/search
 */

import type { KnowledgePage } from './page.ts'
import { RETRIEVABLE_PAGE_STATUSES } from './page.ts'

/** One search hit: the page plus why it matched. */
export interface KnowledgeHit {
  /** The matched page. */
  readonly page: KnowledgePage
  /** Why the page matched, one reason per surface. */
  readonly why: readonly string[]
}

/** What a search asks for. */
export interface KnowledgeQuery {
  /** Free-text terms matched against title, description, and body. */
  readonly text?: string
  /** Tags every hit must carry. */
  readonly tags?: readonly string[]
  /** Maximum hits; defaults to a caller-provided bound. */
  readonly limit?: number
}

const DEFAULT_LIMIT = 10

function terms(text: string | undefined): string[] {
  if (text === undefined) return []
  return [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(term => term.length >= 2))]
}

/**
 * Rank retrievable pages (stable and deprecated — deprecated hits stay visible with their
 * status so the model can judge them) against a keyword query. Drafts never match: staged
 * pages do not participate in recall.
 * @param pages - All pages in the room.
 * @param query - Terms and required tags.
 * @returns Hits ranked by distinct match surfaces, then by id; empty when nothing matches.
 */
export function searchPages(pages: readonly KnowledgePage[], query: KnowledgeQuery): readonly KnowledgeHit[] {
  const requiredTags = (query.tags ?? []).map(tag => tag.toLowerCase())
  const words = terms(query.text)
  const limit = query.limit ?? DEFAULT_LIMIT
  if (requiredTags.length === 0 && words.length === 0) return []
  const hits: KnowledgeHit[] = []
  for (const page of pages) {
    if (!RETRIEVABLE_PAGE_STATUSES.includes(page.status)) continue
    const pageTags = page.tags.map(tag => tag.toLowerCase())
    if (requiredTags.some(tag => !pageTags.includes(tag))) continue
    const why: string[] = []
    const title = page.title?.toLowerCase() ?? ''
    const description = page.description?.toLowerCase() ?? ''
    const body = page.body.toLowerCase()
    for (const term of words) {
      if (title.includes(term)) why.push(`title mentions "${term}"`)
      else if (description.includes(term)) why.push(`description mentions "${term}"`)
      else if (body.includes(term)) why.push(`body mentions "${term}"`)
    }
    for (const tag of requiredTags) {
      if (pageTags.includes(tag)) why.push(`tag "${tag}"`)
    }
    if (why.length > 0) hits.push({ page, why: [...new Set(why)] })
  }
  hits.sort((left, right) =>
    right.why.length - left.why.length || left.page.id.localeCompare(right.page.id))
  return hits.slice(0, Math.max(0, limit))
}
