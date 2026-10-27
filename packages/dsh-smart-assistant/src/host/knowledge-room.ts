/**
 * Knowledge room of the home: distilled, sourced pages the agent keeps as reference
 * (`knowledge/`; deprecated pages stay in place so inbound links keep resolving). Functions here
 * are the moved bodies of the {@link AssistantMemory} knowledge methods; they take the host
 * instance (the service itself or the cordis shadow overlay, which forwards field access) so the
 * class methods stay one-line delegates.
 *
 * @module
 */
import { join } from 'node:path'
import type { AssistantMemory, RoomReadResult } from './service.ts'
import { touchDigest } from './curate-digest.ts'
import type { CurationFinding } from '../domain/home/health.ts'
import type { Room } from '../domain/home/room.ts'
import { renderFrontmatterDocument } from '../domain/home/frontmatter.ts'
import { newThreadId } from '../domain/research/thread.ts'
import { pageFromEntry, pageToDocument, parseWikiLinks, normalizeWikiLinks, backlinksOf, type KnowledgePage, type PageStatus } from '../domain/knowledge/page.ts'
import { searchPages, type KnowledgeQuery } from '../domain/knowledge/search.ts'
import { auditSkillCredentials } from '../domain/skills/audit.ts'
import { recordApproval, type ApprovalAuditOptions } from './approval-audit.ts'

/** Input for {@link AssistantMemory.writePage} (the shape is unchanged; it was inline on the method). */
export interface WritePageInput {
  readonly type: string
  readonly title?: string
  readonly description?: string
  readonly body: string
  readonly sources: readonly string[]
  readonly tags?: readonly string[]
  readonly staleAfter?: string
  /** Slug for a generated id; ignored when `id` is given. */
  readonly slug?: string
  /**
   * Explicit page id, for callers whose identity is already determined — bulk import derives it
   * from the document's provenance, so re-importing the same document updates its page instead of
   * minting a second one (the generated form carries a random 4-char suffix, which would
   * duplicate). The room's own write path still validates the id as a safe file name.
   */
  readonly id?: string
  /** Who wrote the page, for its provenance stamp. Defaults to the reflect tool's process label. */
  readonly generatedBy?: string
}

/**
 * Write a distilled knowledge page into the knowledge room, as a staged draft.
 *
 * Drafts never enter search results or the digest tree — the review gate is a deliberate file
 * edit (a hand flip of `status` to `stable` is the approval), so nothing a session writes
 * promotes itself. Sources are required: an unsourced page is useless even as a draft.
 * @param host - The home service whose knowledge room is written.
 * @param input - The page's content and where it came from.
 * @returns The written page's id, path, and credential-audit findings.
 * @throws when `body` or `sources` is empty, or the generated id is not a safe file name.
 */
export async function writePage(host: AssistantMemory, input: WritePageInput): Promise<{ id: string, path: string, findings: readonly CurationFinding[] }> {
  const body = input.body.trim()
  const type = input.type.trim()
  if (body.length === 0) throw new Error('assistant_reflect save_page requires a body')
  if (type.length === 0) throw new Error('assistant_reflect save_page requires a type')
  const sources = input.sources.map(source => source.trim()).filter(source => source.length > 0)
  if (sources.length === 0) {
    throw new Error('assistant_reflect save_page requires sources — where the knowledge came from (cite memory:<id>, research:<id>, a URL, or a repo path)')
  }
  if (input.staleAfter !== undefined && Number.isNaN(Date.parse(input.staleAfter))) {
    throw new Error('stale_after must be an absolute ISO-8601 time')
  }
  await host.ensureHome()
  // Normalize links at the write boundary: a resolvable bare name link is rewritten into
  // `[[<id>|<title>]]`, the only form this room and Obsidian both resolve (knowledge/page.ts).
  const listing = await host.listKnowledge()
  const linkedBody = normalizeWikiLinks(body, listing.entries)
  const now = new Date()
  const id = input.id?.trim() ?? newThreadId(now, input.title ?? input.type, undefined, input.slug)
  // Re-imports refresh content, not governance (BUG-005 F10, 2026-10-07): an existing page's
  // status is the principal's act (a hand flip or a promote) — a mechanical re-import must not
  // roll a stable page back to draft. Fresh pages are always drafts.
  const existingPage = listing.entries.find(candidate => candidate.id === id)
  const existingEntry = existingPage === undefined ? undefined : await host.knowledge.read(id)
  const page: KnowledgePage = {
    id,
    status: existingPage?.status ?? 'draft',
    type,
    ...(input.title !== undefined && input.title.trim().length > 0 ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined && input.description.trim().length > 0 ? { description: input.description.trim() } : {}),
    generated: { by: input.generatedBy ?? 'process:assistant-reflect', at: now.toISOString() },
    ...(input.staleAfter !== undefined ? { staleAfter: input.staleAfter } : {}),
    sources: sources.map(resource => ({ resource })),
    tags: [...(input.tags ?? [])],
    body: linkedBody,
    links: parseWikiLinks(linkedBody),
  }
  const document = pageToDocument(page)
  await host.knowledge.write(id, document.data, document.body, existingEntry?.text)
  // The credential audit is content-agnostic: a page carrying a live secret is the same
  // failure as a skill carrying one.
  const findings = auditSkillCredentials(id, renderFrontmatterDocument(document.data, document.body))
  touchDigest(host)
  const entry = await host.knowledge.read(id)
  return { id, path: entry?.path ?? join(host.paths.knowledgeDir, `${id}.md`), findings }
}

/**
 * Promote one knowledge page from draft to stable — the mechanical half of the principal's
 * approval. `writePage` never promotes itself, but that closes only one path: whoever calls
 * this decides, and both a conversation turn and the desk panel reach it (BUG-004, 2026-10-07).
 * What this layer guarantees is visibility — every transition appends a line to the approval
 * ledger (`audit/approvals.jsonl`) naming the page, the lane, and the session — not the
 * judgement of who asked for it.
 * @param host - The home service whose knowledge room is written.
 * @param id - The page id to promote.
 * @param audit - Lane context for the ledger line; defaults to the reflect tool's model turn.
 * @returns The page's id, absolute path, and the status it now carries.
 * @throws when no page carries that id, or the page does not parse.
 */
export async function promotePage(host: AssistantMemory, id: string, audit: ApprovalAuditOptions = {}): Promise<{ id: string, path: string, status: PageStatus }> {
  await host.ensureHome()
  const listing = await host.knowledge.list()
  const entry = listing.entries.find(candidate => candidate.id === id)
  if (entry === undefined) throw new Error(`no knowledge page "${id}"`)
  const page = pageFromEntry(entry)
  if (page === undefined) throw new Error(`knowledge page "${id}" does not parse`)
  if (page.status === 'stable') return { id, path: entry.path, status: 'stable' }
  const promoted: KnowledgePage = { ...page, status: 'stable' }
  const document = pageToDocument(promoted)
  await host.knowledge.write(id, document.data, document.body, entry.text)
  await recordApproval(host, 'promote', id, audit)
  return { id, path: entry.path, status: 'stable' }
}

/**
 * Mark one knowledge page deprecated — the page stays in place so inbound links keep resolving,
 * but it stops counting as current knowledge. Like `promotePage`, this performs the edit the
 * principal asked for and appends a ledger line when a real transition happens.
 * @param host - The home service whose knowledge room is written.
 * @param id - The page id to deprecate.
 * @param audit - Lane context for the ledger line; defaults to the reflect tool's model turn.
 * @returns The page's id, absolute path, and the status it now carries.
 * @throws when no page carries that id, or the page does not parse.
 */
export async function deprecatePage(host: AssistantMemory, id: string, audit: ApprovalAuditOptions = {}): Promise<{ id: string, path: string, status: PageStatus }> {
  await host.ensureHome()
  const listing = await host.knowledge.list()
  const entry = listing.entries.find(candidate => candidate.id === id)
  if (entry === undefined) throw new Error(`no knowledge page "${id}"`)
  const page = pageFromEntry(entry)
  if (page === undefined) throw new Error(`knowledge page "${id}" does not parse`)
  if (page.status === 'deprecated') return { id, path: entry.path, status: 'deprecated' }
  const deprecated: KnowledgePage = { ...page, status: 'deprecated' }
  const document = pageToDocument(deprecated)
  await host.knowledge.write(id, document.data, document.body, entry.text)
  await recordApproval(host, 'deprecate', id, audit)
  return { id, path: entry.path, status: 'deprecated' }
}

/** Read only the knowledge room's parsed entries and failures. */
interface KnowledgeRoomReader {
  readonly knowledge: Pick<Room, 'list'>
}

/**
 * List knowledge pages.
 * @param host - The home service whose knowledge room is read.
 * @returns Parsed pages and the files that failed to parse.
 */
export async function listKnowledge(host: KnowledgeRoomReader): Promise<RoomReadResult<KnowledgePage>> {
  const listing = await host.knowledge.list()
  return {
    entries: listing.entries
      .map(pageFromEntry)
      .filter((page): page is KnowledgePage => page !== undefined),
    failures: listing.failures,
  }
}

/**
 * Search knowledge pages by keyword. Retrieval covers stable and deprecated pages (the
 * status rides along so the model can judge deprecated hits); drafts are staged out.
 * @param host - The home service whose knowledge room is searched.
 * @param query - Terms, required tags, and an optional limit.
 * @returns Ranked hits with match reasons.
 */
export async function searchKnowledge(host: KnowledgeRoomReader, query: KnowledgeQuery): Promise<readonly { page: KnowledgePage, why: readonly string[] }[]> {
  const listing = await listKnowledge(host)
  return searchPages(listing.entries, query)
}

/**
 * Read one knowledge page with its graph neighbourhood: backlinks are computed on demand
 * over the whole room — no index to keep fresh.
 * @param host - The home service whose knowledge room is read.
 * @param id - Page id.
 * @returns The page and the ids of pages linking to it, or `undefined` when the page does
 * not exist or does not parse.
 */
export async function readKnowledgePage(host: KnowledgeRoomReader, id: string): Promise<{ page: KnowledgePage, backlinks: readonly string[] } | undefined> {
  const listing = await listKnowledge(host)
  const page = listing.entries.find(candidate => candidate.id === id)
  if (page === undefined) return undefined
  return { page, backlinks: backlinksOf(page, listing.entries) }
}
