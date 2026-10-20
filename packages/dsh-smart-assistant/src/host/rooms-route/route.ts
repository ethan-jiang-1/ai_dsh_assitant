/**
 * Host rooms route: the authoritative working-folder projection for the maintenance panel.
 *
 * The four rooms live in the assistant home (`<dataDir>/memory|research|skills|knowledge`), not in
 * a Session workspace. This reader never accepts a session, workspace or arbitrary path: the panel
 * asks for all rooms, or one knowledge page by id. Authentication and the exact-route policy are
 * owned by the shared Connection carrier (`/api/assistant/rooms`, owner-only).
 *
 * Why it exists (the panel's read-authority move, 2026-10-19,
 * [maintenance-read-authority](../../../../../notes/implemented/2026-10-19-maintenance-read-authority.md)): the panel used to render the model-written
 * per-session room-data copy in a Session workspace, so every room change waited for an old
 * rewrite pass and the knowledge body was a 200-char excerpt. The host service already
 * owns the rooms; this route exposes them without a second file parser.
 *
 * @module
 */
import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import type { KnowledgePage } from '../../domain/knowledge/page.ts'
import type { MemoryRecord } from '../../domain/memory/record.ts'
import type { ResearchThread } from '../../domain/research/thread.ts'
import type { LearnedSkillInfo } from '../../domain/home/health.ts'
import type { SkillUsageRead } from '../../domain/skills/usage.ts'
import { isEntryId, type RoomReadFailure } from '../../domain/home/room.ts'
import { isSkillName } from '../../domain/skills/skill-file.ts'
import type { ApprovalAuditOptions, ApprovalKind } from '../approval-audit.ts'
import type { ApprovalLine, ReceiptRoom } from '../../domain/maintenance/receipt.ts'
import type { SaveMemoryInput } from '../memory-room.ts'

/** The read slice of the home service the route consumes; the plugin binds the real service. */
export interface RoomsReader {
  listMemories(): Promise<{ entries: readonly MemoryRecord[], failures: readonly RoomReadFailure[] }>
  listThreads(): Promise<{ entries: readonly ResearchThread[], failures: readonly RoomReadFailure[] }>
  listKnowledge(): Promise<{ entries: readonly KnowledgePage[], failures: readonly RoomReadFailure[] }>
  readKnowledgePage(id: string): Promise<{ page: KnowledgePage, backlinks: readonly string[] } | undefined>
  /** One learned skill's SKILL.md body by name (the Skills tab's drawer). */
  readLearnedSkill(name: string): Promise<{ name: string, body: string, path: string } | undefined>
  learnedSkills(): Promise<{ entries: readonly LearnedSkillInfo[], failures: readonly RoomReadFailure[] }>
  skillUsage(): Promise<SkillUsageRead>
  /** Newest approval-ledger lines for the maintenance receipt. */
  ledger(): Promise<readonly ApprovalLine[]>
}

/** The controlled writes the panel's direct-write lane exposes on the same route; the plugin binds the real home service. */
export interface RoomsActions {
  promotePage(id: string, audit?: ApprovalAuditOptions): Promise<{ id: string, path: string, status: string }>
  deprecatePage(id: string, audit?: ApprovalAuditOptions): Promise<{ id: string, path: string, status: string }>
  saveMemory(input: SaveMemoryInput): Promise<MemoryRecord>
  forgetMemory(id: string): Promise<boolean>
  retireSkill(name: string, reason?: string): Promise<{ name: string, path: string }>
  /** Save one durable assistant message verbatim (the 「记下来」 action); the host reads it, not the caller's text. */
  remember(sessionId: string, messageId: string): Promise<MemoryRecord>
  recordApproval(kind: ApprovalKind, id: string, options: ApprovalAuditOptions): Promise<void>
}

/** One unreadable entry, named by file (never by deployment path). */
interface Problem {
  readonly room: 'memory' | 'research' | 'skills' | 'knowledge'
  readonly file: string
  readonly reason: string
}

function headers(): Record<string, string> {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
}

function failure(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: headers() })
}

/** Keep the panel's preview bounded; the full text is served by the detail query. */
function excerpt(body: string): string {
  return body.length > 200 ? body.slice(0, 200) : body
}

function problem(room: Problem['room'], failures: readonly RoomReadFailure[]): Problem[] {
  return failures.map(failure => ({ room, file: basename(failure.path), reason: failure.reason }))
}

/** Latest ISO stamp across the rooms and the usage ledger; absent data falls back to the epoch. */
function latestStamp(values: readonly (string | undefined)[]): string {
  const stamps = values
    .flatMap(value => typeof value === 'string' && value.length > 0 ? [Date.parse(value)] : [])
    .filter(stamp => Number.isFinite(stamp))
  return stamps.length === 0 ? new Date(0).toISOString() : new Date(Math.max(...stamps)).toISOString()
}

/**
 * Build the exact GET route. A bare request returns every room; `?kind=knowledge&id=<id>` returns
 * one page's full body and backlinks. Every other query is refused before any read.
 * @param reader - The home read surface.
 * @param maxBytes - Complete JSON byte limit for one response.
 * @returns The exact GET contribution; registration is owned by the Host plugin fiber.
 */
export function createRoomsRoute(reader: RoomsReader, maxBytes: number = 1024 * 1024, actions?: RoomsActions): ConnectionFetchRoute {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('rooms maxBytes must be a positive safe integer')
  const emit = (value: unknown): Response => {
    const body = JSON.stringify(value)
    if (Buffer.byteLength(body, 'utf8') > maxBytes) return failure(413, 'projection-too-large')
    return new Response(body, { headers: headers() })
  }
  /** One controlled write; the JSON body names the action and its target. */
  const handleAction = async (request: Request): Promise<Response> => {
    if (actions === undefined) return failure(405, 'method-not-allowed')
    let body: unknown
    try { body = await request.json() } catch { return failure(400, 'invalid-json') }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return failure(400, 'invalid-body')
    const input = body as Record<string, unknown>
    const action = typeof input.action === 'string' ? input.action : undefined
    if (action === undefined) return failure(400, 'missing-action')
    const sessionId = typeof input.sessionId === 'string' && input.sessionId.length > 0 ? input.sessionId : undefined
    const title = typeof input.title === 'string' && input.title.length > 0 ? input.title : undefined
    const audit = (room: ReceiptRoom, before: unknown, after: unknown): ApprovalAuditOptions => ({
      source: 'panel-direct',
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(title === undefined ? {} : { title }),
      room,
      before,
      after,
    })
    const failAction = (error: unknown): Response => {
      const message = error instanceof Error ? error.message : String(error)
      const status = /does not exist|not found|no learned skill|no knowledge page/.test(message)
        ? 404
        : /only drafts|not a draft|already archived|is not active|supersedes names|is approved and waiting/.test(message)
          ? 409
          : 400
      return new Response(JSON.stringify({ error: 'action-failed', message }), { status, headers: headers() })
    }
    const id = typeof input.id === 'string' ? input.id : undefined
    try {
      switch (action) {
        case 'knowledge.approve': {
          if (id === undefined || !isEntryId(id)) return failure(400, 'invalid-id')
          const page = await reader.readKnowledgePage(id)
          if (page === undefined) return failure(404, 'page-not-found')
          if (page.page.status !== 'draft') return failure(409, 'not-a-draft')
          const promoted = await actions.promotePage(id, audit('knowledge', { status: 'draft' }, { status: 'stable' }))
          return emit({ ok: true, action, id: promoted.id, status: promoted.status })
        }
        case 'knowledge.deprecate': {
          if (id === undefined || !isEntryId(id)) return failure(400, 'invalid-id')
          const page = await reader.readKnowledgePage(id)
          if (page === undefined) return failure(404, 'page-not-found')
          if (page.page.status !== 'stable') return failure(409, 'not-stable')
          const deprecated = await actions.deprecatePage(id, audit('knowledge', { status: 'stable' }, { status: 'deprecated' }))
          return emit({ ok: true, action, id: deprecated.id, status: deprecated.status })
        }
        case 'memory.correct': {
          if (id === undefined || !isEntryId(id)) return failure(400, 'invalid-id')
          const text = typeof input.text === 'string' ? input.text.trim() : ''
          if (text.length === 0) return failure(400, 'missing-text')
          const listing = await reader.listMemories()
          const old = listing.entries.find(record => record.id === id)
          if (old === undefined) return failure(404, 'memory-not-found')
          const saved = await actions.saveMemory({
            text, kind: old.kind, tags: old.tags, importance: old.importance, supersedes: old.id, source: 'panel-direct',
          })
          await actions.recordApproval('correct', saved.id, audit(
            'memory',
            { id: old.id, text: old.text },
            { id: saved.id, text: saved.text },
          ))
          return emit({ ok: true, action, id: saved.id, status: saved.status })
        }
        case 'memory.retire': {
          if (id === undefined || !isEntryId(id)) return failure(400, 'invalid-id')
          const listing = await reader.listMemories()
          const old = listing.entries.find(record => record.id === id)
          if (old === undefined) return failure(404, 'memory-not-found')
          const archived = await actions.forgetMemory(id)
          if (!archived) return failure(409, 'memory-not-active')
          await actions.recordApproval('retire', id, audit('memory', { status: old.status }, { status: 'retired' }))
          return emit({ ok: true, action, id, status: 'retired' })
        }
        case 'memory.remember': {
          const sessionId = typeof input.sessionId === 'string' && input.sessionId.length > 0 ? input.sessionId : undefined
          const messageId = typeof input.messageId === 'string' && input.messageId.length > 0 ? input.messageId : undefined
          if (sessionId === undefined || messageId === undefined) return failure(400, 'missing-message')
          try {
            const saved = await actions.remember(sessionId, messageId)
            return emit({ ok: true, action, id: saved.id, status: saved.status })
          } catch (error) {
            return failAction(error)
          }
        }
        case 'skill.retire': {
          const name = typeof input.name === 'string' ? input.name : undefined
          if (name === undefined || !isSkillName(name)) return failure(400, 'invalid-name')
          const reason = typeof input.reason === 'string' && input.reason.trim().length > 0 ? input.reason.trim() : undefined
          const retired = await actions.retireSkill(name, reason)
          await actions.recordApproval('retire', name, audit(
            'skills',
            { status: 'active' },
            { status: 'archived', ...(reason === undefined ? {} : { reason }) },
          ))
          return emit({ ok: true, action, name, path: retired.path })
        }
        default:
          return failure(400, 'unknown-action')
      }
    } catch (error) {
      if (request.signal.aborted) throw error
      return failAction(error)
    }
  }

  return {
    path: '/api/assistant/rooms',
    methods: actions === undefined ? ['GET'] : ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request) {
      request.signal.throwIfAborted()
      const url = new URL(request.url)
      try {
        if (request.method === 'POST') return handleAction(request)
        if (url.searchParams.size === 0) {
          const [memories, threads, knowledge, skills, usage, ledger] = await Promise.all([
            reader.listMemories(),
            reader.listThreads(),
            reader.listKnowledge(),
            reader.learnedSkills(),
            reader.skillUsage(),
            reader.ledger(),
          ])
          request.signal.throwIfAborted()
          const generatedAt = latestStamp([
            ...memories.entries.map(record => record.updated),
            ...threads.entries.map(thread => thread.updated),
            ...knowledge.entries.map(page => page.generated?.at),
            ...skills.entries.map(skill => skill.learnedAt),
            ...Object.values(usage.usage).map(entry => entry.lastUsedAt),
            ...ledger.map(line => line.at),
          ])
          const payload = {
            schemaVersion: 1,
            generatedAt,
            revision: '',
            counts: {
              memories: memories.entries.length,
              threads: threads.entries.length,
              skills: skills.entries.length,
              knowledgeStable: knowledge.entries.filter(page => page.status === 'stable').length,
              knowledgeDraft: knowledge.entries.filter(page => page.status === 'draft').length,
            },
            memories: memories.entries.map(record => ({
              id: record.id,
              kind: record.kind,
              text: record.text,
              updated: record.updated,
              ...(record.source !== undefined ? { source: record.source } : {}),
            })),
            research: threads.entries.map(thread => ({
              id: thread.id,
              title: thread.question,
              status: thread.status,
              why: thread.why,
              ...(thread.lean !== undefined ? { lean: thread.lean } : {}),
              updated: thread.updated,
            })),
            skills: skills.entries.map(skill => {
              const name = skill.name ?? ''
              const entry = usage.usage[name]
              return {
                name,
                description: skill.description ?? '',
                kind: 'learned',
                ...(skill.origin !== undefined ? { origin: skill.origin } : {}),
                ...(skill.learnedAt !== undefined ? { learnedAt: skill.learnedAt } : {}),
                count: entry?.count ?? 0,
                ...(entry?.lastUsedAt !== undefined ? { lastUsedAt: entry.lastUsedAt } : {}),
              }
            }),
            knowledge: knowledge.entries.map(page => ({
              id: page.id,
              ...(page.title !== undefined ? { title: page.title } : {}),
              status: page.status,
              type: page.type,
              ...(page.description !== undefined ? { description: page.description } : {}),
              ...(page.generated?.at !== undefined ? { updated: page.generated.at } : {}),
              sources: page.sources.map(source => source.resource),
              excerpt: excerpt(page.body),
            })),
            ledger,
            problems: [
              ...problem('memory', memories.failures),
              ...problem('research', threads.failures),
              ...problem('knowledge', knowledge.failures),
              ...problem('skills', skills.failures),
            ],
          }
          payload.revision = createHash('sha256').update(JSON.stringify({ ...payload, revision: '' })).digest('hex')
          return emit(payload)
        }
        if (url.searchParams.size !== 2
          || !url.searchParams.has('kind')
          || !url.searchParams.has('id')) {
          return failure(400, 'unexpected-query')
        }
        const kind = url.searchParams.get('kind')
        const id = url.searchParams.get('id') as string
        if (kind === 'skill') {
          if (!isSkillName(id)) return failure(400, 'invalid-query')
          const skill = await reader.readLearnedSkill(id)
          if (skill === undefined) return failure(404, 'skill-not-found')
          return emit(skill)
        }
        if (kind !== 'knowledge') return failure(400, 'invalid-query')
        if (!isEntryId(id)) return failure(400, 'invalid-query')
        const found = await reader.readKnowledgePage(id)
        request.signal.throwIfAborted()
        if (found === undefined) return failure(404, 'page-not-found')
        const page = found.page
        return emit({
          schemaVersion: 1,
          id: page.id,
          ...(page.title !== undefined ? { title: page.title } : {}),
          status: page.status,
          type: page.type,
          ...(page.generated?.at !== undefined ? { updated: page.generated.at } : {}),
          sources: page.sources.map(source => source.resource),
          links: page.links,
          body: page.body,
          backlinks: found.backlinks,
        })
      } catch (error) {
        if (request.signal.aborted) throw error
        return failure(500, 'rooms-unavailable')
      }
    },
  }
}
