/**
 * Host rooms route: the authoritative working-folder projection for the maintenance panel.
 *
 * The four rooms live in the assistant home (`<dataDir>/memory|research|skills|knowledge`), not in
 * a Session workspace. This reader never accepts a session, workspace or arbitrary path: the panel
 * asks for all rooms, or one knowledge page by id. Authentication and the exact-route policy are
 * owned by the shared Connection carrier (`/api/assistant/rooms`, owner-only).
 *
 * Why it exists (A1a, 2026-10-19): the panel used to render the model-written
 * `.desk/state.json` copy in a Session workspace, so every room change waited for a
 * `desk-refresh` rewrite and the knowledge body was a 200-char excerpt. The host service already
 * owns the rooms; this route exposes them without a second file parser.
 *
 * @module
 */
import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import type { KnowledgePage } from '../domain/knowledge/page.ts'
import type { MemoryRecord } from '../domain/memory/record.ts'
import type { ResearchThread } from '../domain/research/thread.ts'
import type { LearnedSkillInfo } from '../domain/home/health.ts'
import type { SkillUsageRead } from '../domain/skills/usage.ts'
import { isEntryId, type RoomReadFailure } from '../domain/home/room.ts'

/** The read slice of the home service the route consumes; the plugin binds the real service. */
export interface RoomsReader {
  listMemories(): Promise<{ entries: readonly MemoryRecord[], failures: readonly RoomReadFailure[] }>
  listThreads(): Promise<{ entries: readonly ResearchThread[], failures: readonly RoomReadFailure[] }>
  listKnowledge(): Promise<{ entries: readonly KnowledgePage[], failures: readonly RoomReadFailure[] }>
  readKnowledgePage(id: string): Promise<{ page: KnowledgePage, backlinks: readonly string[] } | undefined>
  learnedSkills(): Promise<{ entries: readonly LearnedSkillInfo[], failures: readonly RoomReadFailure[] }>
  skillUsage(): Promise<SkillUsageRead>
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
export function createRoomsRoute(reader: RoomsReader, maxBytes: number = 1024 * 1024): ConnectionFetchRoute {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('rooms maxBytes must be a positive safe integer')
  const emit = (value: unknown): Response => {
    const body = JSON.stringify(value)
    if (Buffer.byteLength(body, 'utf8') > maxBytes) return failure(413, 'projection-too-large')
    return new Response(body, { headers: headers() })
  }
  return {
    path: '/api/assistant/rooms',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      request.signal.throwIfAborted()
      const url = new URL(request.url)
      try {
        if (url.searchParams.size === 0) {
          const [memories, threads, knowledge, skills, usage] = await Promise.all([
            reader.listMemories(),
            reader.listThreads(),
            reader.listKnowledge(),
            reader.learnedSkills(),
            reader.skillUsage(),
          ])
          request.signal.throwIfAborted()
          const generatedAt = latestStamp([
            ...memories.entries.map(record => record.updated),
            ...threads.entries.map(thread => thread.updated),
            ...knowledge.entries.map(page => page.generated?.at),
            ...skills.entries.map(skill => skill.learnedAt),
            ...Object.values(usage.usage).map(entry => entry.lastUsedAt),
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
        if (url.searchParams.get('kind') !== 'knowledge') return failure(400, 'invalid-query')
        const id = url.searchParams.get('id') as string
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
