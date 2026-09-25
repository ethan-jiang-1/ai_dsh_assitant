/**
 * The ingest core: turn an external document into the *plan* for one governed source page.
 *
 * Why this exists beside `save_page`: that path is model-authored, one page per turn — it cannot
 * carry an enterprise document set. This module does the part that needs no judgement (segmenting,
 * deterministic ids, provenance, truncation bookkeeping) so the caller can be a batch CLI or a
 * future tool action, and the model only supplies what only a model can (concept pages).
 *
 * Deliberately NOT here: format conversion (docx/pdf), concept extraction, retrieval. Conversion is
 * deferred until a real document set exists (DSH native offers `document/office-to-pdf` only;
 * `attachment`/`file-reference` are session-scoped, not durable knowledge — recorded in the note).
 *
 * Idempotence is the point of the deterministic id: re-importing the same `ref` must land on the
 * same page id, so a second run updates instead of duplicating the corpus.
 *
 * @module dsh-smart-assistant/knowledge/ingest
 */

import { createHash } from 'node:crypto'

/** One external document to bring into the knowledge room. */
export interface SourceDocument {
  /** Stable provenance reference: a path, URL, or `file:<name>#<digest>`. It is the page's `sources` entry. */
  readonly ref: string
  /** Human-readable document title (the fallback deriving from the ref strips it to a path). */
  readonly title: string
  /** Raw document text, as extracted (markdown or plain text). */
  readonly text: string
}

/** A document split at its markdown headings — the unit a later concept pass works on. */
export interface IngestSection {
  /** Heading text without the leading `#`s; absent for the preamble before the first heading. */
  readonly heading?: string
  /** Section body, whitespace-trimmed. */
  readonly body: string
}

/** Everything a source page needs, minus the fields the room's write path owns. */
export interface SourcePagePlan {
  /** Deterministic page id (same `ref` ⇒ same id, so re-imports update rather than duplicate). */
  readonly id: string
  readonly title: string
  /** One-line summary for catalogs: the first prose line of the document. */
  readonly description: string
  /** Provenance, as the room requires. Always `[ref]`; never empty. */
  readonly sources: readonly string[]
  readonly tags: readonly string[]
  /** Page body: the document text, verbatim except for an explicit truncation marker. */
  readonly body: string
  /** Sections the concept pass should consider, in document order. */
  readonly sections: readonly IngestSection[]
}

/** Body cap: beyond this the page keeps a marker instead of pretending the text is complete. */
export const BODY_LIMIT_BYTES = 256 * 1024

const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*$/u

/**
 * Slug a title for an id: ASCII letters/digits kept, everything else (including CJK) folds to `-`.
 * A title with no ASCII alphanumerics yields `doc` — the id stays readable rather than empty.
 * @param title - Document title.
 */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
  return slug.length > 0 ? slug : 'doc'
}

/**
 * Deterministic page id: `source-<slug>-<8 hex of the ref>`. Stable across runs and machines, which
 * is what makes re-import an update.
 * @param title - Document title (slug source).
 * @param ref - Provenance reference (hash source).
 */
export function sourcePageId(title: string, ref: string): string {
  const digest = createHash('sha256').update(ref).digest('hex').slice(0, 8)
  return `source-${slugify(title)}-${digest}`
}

/**
 * Split a document at markdown headings. Text before the first heading becomes a headingless
 * section; fenced code is opaque (a `#` inside a fence is not a heading).
 * @param text - Document text.
 */
export function segmentDocument(text: string): IngestSection[] {
  const sections: IngestSection[] = []
  let heading: string | undefined
  let body: string[] = []
  let fence: string | undefined

  const flush = (): void => {
    const joined = body.join('\n').trim()
    if (joined.length > 0 || heading !== undefined) {
      sections.push({ ...(heading !== undefined ? { heading } : {}), body: joined })
    }
    body = []
  }

  for (const line of text.split('\n')) {
    const fenceMatch = /^\s*(```|~~~)/.exec(line)
    if (fenceMatch !== null) {
      fence = fence === undefined ? fenceMatch[1] : fence === fenceMatch[1] ? undefined : fence
      body.push(line)
      continue
    }
    const match = fence === undefined ? HEADING.exec(line) : null
    if (match !== null) {
      flush()
      heading = match[2]
      continue
    }
    body.push(line)
  }
  flush()
  return sections
}

/**
 * Plan one source page: id, provenance, summary, tags, body (with an explicit truncation marker),
 * and the sections a concept pass may mine.
 * @param document - The document to ingest.
 * @param options - `truncatedAt` records the byte cap when the caller wants a lower one.
 */
export function planSourcePage(document: SourceDocument, options: { truncatedAt?: number } = {}): SourcePagePlan {
  const limit = options.truncatedAt ?? BODY_LIMIT_BYTES
  const bytes = Buffer.byteLength(document.text, 'utf8')
  const body = bytes > limit
    ? `${Buffer.from(document.text, 'utf8').subarray(0, limit).toString('utf8')}\n\n<!-- truncated at ${limit} bytes of ${bytes}; the original stays at ${document.ref} -->`
    : document.text
  const sections = segmentDocument(document.text)
  const firstProse = sections
    .flatMap(section => section.body.split('\n'))
    .map(line => line.trim())
    .find(line => line.length > 0 && !line.startsWith('#'))
  const description = firstProse === undefined
    ? `${document.title} (imported source)`
    : firstProse.length <= 120 ? firstProse : `${firstProse.slice(0, 119)}…`
  return {
    id: sourcePageId(document.title, document.ref),
    title: document.title,
    description,
    sources: [document.ref],
    tags: ['imported'],
    body,
    sections,
  }
}
