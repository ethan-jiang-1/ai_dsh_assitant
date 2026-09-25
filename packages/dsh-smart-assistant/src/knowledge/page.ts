/**
 * The knowledge page vocabulary: what a domain page looks like on disk, and how `[[wikilinks]]`
 * parse and resolve (tri-line proposal 2026-09-24, phase 2; the OKF v0.2 field subset from the
 * R3 survey §7.2, with every borrowed source named in the note).
 *
 * A page is one frontmatter file in `knowledge/`. The governance fields are OKF's — `type` is
 * the only required field, `generated`/`verified` separate who wrote a page from who confirmed
 * it, `stale_after` is an absolute time so staleness is a plain comparison, and `status:
 * deprecated` keeps the page in place so links keep resolving. `[[wikilinks]]` are Obsidian-
 * compatible syntax (`[[target]]`, `[[target|alias]]`, `[[target#section]]`), resolved by id
 * first and then by title — the ambiguity that resolution can produce is a real state the
 * curation check reports, not an error to hide.
 *
 * Two resolvers read these files, and they do not agree on the key: we resolve id → title,
 * Obsidian resolves file name (our id) → `aliases` and **never** a bare alias or a `title`
 * property (obsidian-help `Aliases`, and the resolver only consults `uniqueFileLookup`, which
 * holds file names — forum.obsidian.md/t/113902, verified 2026-09-25). So a page written as
 * `[[Name]]` is clickable for us and unresolved in Obsidian, where clicking it forks a new
 * page. The one form both resolve is the file name plus display text: `[[<id>|<title>]]`.
 * `writePage` therefore normalizes resolvable name links into that form, and every page mirrors
 * its `title` into `aliases` so Obsidian's autocomplete can reach it by name and insert exactly
 * that form when a person picks it.
 *
 * @module dsh-smart-assistant/knowledge/page
 */

import type { RoomEntry } from '../home/room.ts'

/** Page lifecycle (OKF §5.4 subset): drafts await review, deprecated pages stay in place. */
export const PAGE_STATUSES = ['draft', 'stable', 'deprecated'] as const

/** A page's lifecycle status. */
export type PageStatus = (typeof PAGE_STATUSES)[number]

/** Statuses that participate in retrieval and the digest tree. */
export const RETRIEVABLE_PAGE_STATUSES: readonly PageStatus[] = ['stable', 'deprecated']

/** Where a page's content came from — a URL, a repo path, a research thread, a memory record. */
export interface KnowledgeSource {
  /** The pointer itself. */
  readonly resource: string
  /** Stable id at the target, when it has one. */
  readonly id?: string
  /** Human label for the pointer. */
  readonly title?: string
}

/** One domain page. */
export interface KnowledgePage {
  /** Entry id, equal to the file name without its suffix. */
  readonly id: string
  /** Lifecycle status. */
  readonly status: PageStatus
  /** Free-form kind: concept, entity, source, how-it-works — consumers tolerate unknowns. */
  readonly type: string
  /** Human-readable name; `[[links]]` may resolve against it. */
  readonly title?: string
  /**
   * Alternative names (Obsidian's `aliases` property, a YAML list). Obsidian's link resolver
   * ignores aliases — they only feed its autocomplete — so this is an authoring affordance, not
   * a resolution key here either. The title is always mirrored in (see `pageFromEntry`).
   */
  readonly aliases?: readonly string[]
  /** One-line summary for catalogs. */
  readonly description?: string
  /** Who wrote the page and when (OKF actor: `human:<id>` / `process:<id>` / `agent:<id>`). */
  readonly generated?: { readonly by: string, readonly at: string }
  /** Who confirmed the page and when — separate from who wrote it (OKF §5.2/5.3). */
  readonly verified?: readonly { readonly by: string, readonly at: string }[]
  /** Absolute time after which the page is stale (a plain comparison, not a TTL). */
  readonly staleAfter?: string
  /** Where the page's claims came from. A stable page without sources is a governance problem. */
  readonly sources: readonly KnowledgeSource[]
  /** Retrieval tags. */
  readonly tags: readonly string[]
  /** Prose body. */
  readonly body: string
  /** `[[targets]]` parsed from the body, in order of appearance. */
  readonly links: readonly string[]
}

/** Result of resolving one `[[target]]` against the room's pages. */
export type LinkResolution =
  | { readonly kind: 'page', readonly page: KnowledgePage }
  | { readonly kind: 'missing' }
  | { readonly kind: 'ambiguous', readonly candidates: readonly string[] }

/** Matches `[[target]]`, `[[target#section]]`, and `[[target|alias]]`; captures the target. */
const WIKILINK = /\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g

/**
 * Blank inline code spans and fenced blocks, preserving length so match offsets still line up
 * with the original text. A `[[literal]]` inside backticks is a literal, not a link — a page
 * documenting the syntax itself must not grow phantom unwritten links (found live by the
 * 2026-09-25 campaign: the OKF page's examples).
 * @param text - Text to mask.
 * @returns Same-length text with code spans blanked.
 */
function maskCodeSpans(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, span => ' '.repeat(span.length))
    .replace(/`[^`\n]*`/g, span => ' '.repeat(span.length))
}

/**
 * Parse every `[[wikilink]]` target from text, in order of appearance.
 * @param text - Page body (or any text).
 * @returns Trimmed link targets.
 */
export function parseWikiLinks(text: string): string[] {
  const targets: string[] = []
  for (const match of maskCodeSpans(text).matchAll(WIKILINK)) {
    const target = (match[1] ?? '').trim()
    if (target.length > 0) targets.push(target)
  }
  return targets
}

/**
 * Rewrite every resolvable bare name link into the one form both resolvers click:
 * `[[<id>|<title>]]` (the section anchor, if any, is preserved). Links inside code spans, links
 * that already carry display text, and targets that resolve to nothing are left exactly as
 * written — an unresolved link is a signal the curation check reports, not something to guess
 * at, and a forward reference cannot be rewritten until its page exists.
 * @param body - Page body as authored.
 * @param pages - Pages currently in the room.
 * @returns The body with resolvable links in id form.
 */
export function normalizeWikiLinks(body: string, pages: readonly KnowledgePage[]): string {
  let out = ''
  let cursor = 0
  for (const match of maskCodeSpans(body).matchAll(WIKILINK)) {
    const start = match.index ?? 0
    const raw = body.slice(start, start + match[0].length)
    const inner = raw.slice(2, -2)
    if (inner.includes('|')) continue
    const hash = inner.indexOf('#')
    const target = (hash === -1 ? inner : inner.slice(0, hash)).trim()
    const anchor = hash === -1 ? '' : inner.slice(hash)
    if (target.length === 0) continue
    const resolution = resolveWikiLink(target, pages)
    if (resolution.kind !== 'page') continue
    const page = resolution.page
    out += body.slice(cursor, start) + `[[${page.id}${anchor}|${page.title ?? target}]]`
    cursor = start + raw.length
  }
  return out + body.slice(cursor)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSources(value: unknown): { sources?: KnowledgeSource[], problem?: string } {
  if (value === undefined) return {}
  if (!Array.isArray(value)) return { problem: 'sources must be a list' }
  const sources: KnowledgeSource[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.resource !== 'string' || item.resource.length === 0) {
      return { problem: 'each source needs a non-empty resource' }
    }
    sources.push({
      resource: item.resource,
      ...(typeof item.id === 'string' ? { id: item.id } : {}),
      ...(typeof item.title === 'string' ? { title: item.title } : {}),
    })
  }
  return { sources }
}

/**
 * Report every reason a frontmatter mapping is not a valid knowledge page.
 * @param data - Parsed frontmatter fields.
 * @returns Problem descriptions; empty means valid.
 */
export function validatePageData(data: Readonly<Record<string, unknown>>): string[] {
  const problems: string[] = []
  if (typeof data.type !== 'string' || data.type.trim().length === 0) {
    problems.push('missing type (OKF: the only required field)')
  }
  if (data.status !== undefined && !PAGE_STATUSES.includes(data.status as PageStatus)) {
    problems.push(`status must be one of ${PAGE_STATUSES.join(', ')}`)
  }
  const sources = parseSources(data.sources)
  if (sources.problem !== undefined) problems.push(sources.problem)
  if (data.staleAfter !== undefined && (typeof data.staleAfter !== 'string' || Number.isNaN(Date.parse(data.staleAfter)))) {
    problems.push('staleAfter must be an absolute ISO-8601 time')
  }
  if (data.generated !== undefined) {
    const generated = data.generated
    if (!isRecord(generated) || typeof generated.by !== 'string' || typeof generated.at !== 'string') {
      problems.push('generated must be { by, at }')
    }
  }
  if (data.verified !== undefined) {
    const verified = data.verified
    if (!Array.isArray(verified)
      || verified.some(item => !isRecord(item) || typeof item.by !== 'string' || typeof item.at !== 'string')) {
      problems.push('verified must be a list of { by, at }')
    }
  }
  if (data.tags !== undefined
    && (!Array.isArray(data.tags) || data.tags.some(item => typeof item !== 'string'))) {
    problems.push('tags must be a list of strings')
  }
  if (data.aliases !== undefined
    && (!Array.isArray(data.aliases) || data.aliases.some(item => typeof item !== 'string'))) {
    problems.push('aliases must be a list of strings (Obsidian requires the list form)')
  }
  return problems
}

/**
 * Read a page's alternative names, always including the title: an alias list that does not
 * carry the page's own name would hide it from Obsidian's autocomplete.
 * @param value - Raw `aliases` frontmatter value.
 * @param title - The page's title, if it has one.
 * @returns Deduped aliases, or `undefined` when the page declares none.
 */
function parseAliases(value: unknown, title: string | undefined): string[] | undefined {
  const declared = Array.isArray(value) ? (value as string[]) : []
  const aliases = [...new Set([...declared, ...(title !== undefined ? [title] : [])])]
  return aliases.length > 0 ? aliases : undefined
}

/**
 * Read a knowledge page from a room entry.
 * @param entry - Parsed room entry.
 * @returns The page, or `undefined` when the entry is not a valid page (the curation scan
 * reports those as unreadable files).
 */
export function pageFromEntry(entry: RoomEntry): KnowledgePage | undefined {
  if (validatePageData(entry.data).length > 0) return undefined
  if (entry.body.trim().length === 0) return undefined
  const data = entry.data
  const body = entry.body
  const title = typeof data.title === 'string' ? data.title : undefined
  const aliases = parseAliases(data.aliases, title)
  return {
    id: entry.id,
    status: (data.status ?? 'stable') as PageStatus,
    type: (data.type as string).trim(),
    ...(title !== undefined ? { title } : {}),
    ...(aliases !== undefined ? { aliases } : {}),
    ...(typeof data.description === 'string' ? { description: data.description } : {}),
    ...(isRecord(data.generated) && typeof data.generated.by === 'string' && typeof data.generated.at === 'string'
      ? { generated: { by: data.generated.by, at: data.generated.at } }
      : {}),
    ...(Array.isArray(data.verified)
      ? {
        verified: (data.verified as Record<string, unknown>[])
          .filter(item => isRecord(item) && typeof item.by === 'string' && typeof item.at === 'string')
          .map(item => ({ by: (item as { by: string }).by, at: (item as { at: string }).at })),
      }
      : {}),
    ...(typeof data.staleAfter === 'string' ? { staleAfter: data.staleAfter } : {}),
    sources: parseSources(data.sources).sources ?? [],
    tags: Array.isArray(data.tags) ? [...(data.tags as string[])] : [],
    body,
    links: parseWikiLinks(body),
  }
}

/**
 * Render a page's frontmatter fields in reading order, dropping absent optionals.
 * @param page - Page to serialize.
 * @returns Frontmatter fields and the body to write.
 */
export function pageToDocument(page: KnowledgePage): { data: Record<string, unknown>, body: string } {
  // The title always rides in the alias list: that is what lets a person type the name in
  // Obsidian and have autocomplete offer (and then write) the clickable `[[id|name]]` form.
  const aliases = parseAliases(page.aliases, page.title)
  return {
    data: {
      id: page.id,
      type: page.type,
      status: page.status,
      ...(page.title !== undefined ? { title: page.title } : {}),
      ...(aliases !== undefined ? { aliases } : {}),
      ...(page.description !== undefined ? { description: page.description } : {}),
      ...(page.generated !== undefined ? { generated: page.generated } : {}),
      ...(page.verified !== undefined && page.verified.length > 0 ? { verified: page.verified } : {}),
      ...(page.staleAfter !== undefined ? { staleAfter: page.staleAfter } : {}),
      ...(page.sources.length > 0 ? { sources: page.sources } : {}),
      ...(page.tags.length > 0 ? { tags: page.tags } : {}),
    },
    body: page.body,
  }
}

/**
 * Resolve one `[[target]]` against the room's pages: by id first, then by title
 * (case-insensitive). Multiple title matches are an ambiguity the caller reports, not a guess.
 * A trailing `.md` is dropped from the target first, because Obsidian accepts `[[id.md]]` as the
 * same link as `[[id]]` and a name written for Obsidian must not go missing on our side.
 * @param target - Link target as written.
 * @param pages - Pages currently in the room.
 * @returns The resolution outcome.
 */
export function resolveWikiLink(target: string, pages: readonly KnowledgePage[]): LinkResolution {
  const trimmed = target.trim()
  const byId = pages.find(page => page.id === trimmed || `${page.id}.md` === trimmed)
  if (byId !== undefined) return { kind: 'page', page: byId }
  const folded = trimmed.toLowerCase()
  const byTitle = pages.filter(page => page.title !== undefined && page.title.toLowerCase() === folded)
  if (byTitle.length === 1) {
    const page = byTitle[0]
    if (page !== undefined) return { kind: 'page', page }
  }
  if (byTitle.length > 1) return { kind: 'ambiguous', candidates: byTitle.map(page => page.id) }
  return { kind: 'missing' }
}

/**
 * Compute the backlinks of one page: every page in the room whose body links to it.
 * @param page - The page others might point at.
 * @param pages - All pages in the room.
 * @returns Ids of pages linking to `page`, sorted.
 */
export function backlinksOf(page: KnowledgePage, pages: readonly KnowledgePage[]): string[] {
  return [...new Set(pages
    .filter(other => other.id !== page.id)
    .filter(other => other.links.some(target => {
      const resolution = resolveWikiLink(target, pages)
      return resolution.kind === 'page' && resolution.page.id === page.id
    }))
    .map(other => other.id))]
    .sort()
}
