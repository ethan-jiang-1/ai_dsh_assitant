/**
 * `assistantMemory`: the service that owns the agent's home.
 *
 * The home is the harness ring made physical — durable memory, unresolved threads, and skills the
 * agent wrote for itself — and this service is its single writer. It lives on the HOST plane
 * (`cordis.patch.yml`) because the home is persistence shared across sessions; the model-facing
 * tools and prompt sections live on the AGENT plane (`presets/assistant/agent.cordis.yml`) because
 * they are what one session contributes to the registries.
 *
 * Layout, room semantics, and the curation rules are contracts in `docs/home.md`; every path here
 * comes from `home/layout.ts` so the document and the code cannot drift apart silently.
 *
 * @module dsh-smart-assistant
 */

import { join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { expandHomePath, resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { renderDigest, type DigestResult } from './home/digest.ts'
import { curateHome, type CurationBrief } from './home/health.ts'
import { HOME_MAP_BLURB } from './home/home-map.ts'
import { HOME_DIRECTORY_NAME, homePaths, scaffoldHome, type HomePaths, type ScaffoldResult } from './home/layout.ts'
import { Room, type RoomEntry, type RoomReadFailure } from './home/room.ts'
import {
  DEFAULT_IMPORTANCE,
  IMPORTANCE_RANGE,
  memoryFromEntry,
  memoryToDocument,
  newMemoryId,
  type MemoryKind,
  type MemoryRecord,
} from './memory/record.ts'
import { recallMemories, type RecallHit, type RecallQuery } from './memory/recall.ts'
import {
  CLOSED_THREAD_STATUSES,
  newThreadId,
  threadFromEntry,
  threadToDocument,
  type ResearchThread,
} from './research/thread.ts'
import { scanLearnedSkills } from './skills/scan.ts'
import { writeLearnedSkill, isSkillName, type SkillDraft } from './skills/skill-file.ts'
import {
  readSkillUsage,
  recordSkillLoad,
  writeSkillUsage,
  type SkillUsageEntry,
  type SkillUsageRead,
} from './skills/usage.ts'
import { DEFAULT_WEB_TITLE, webBrandingInjection } from './web-branding.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    assistantMemory: AssistantMemory
  }
}

/** Deployment configuration for the home. */
export interface Config {
  /** Home root. Omitted resolves `<dshHome>/assistant`, so the dual-home split applies automatically. */
  dataDir?: string
  /** Byte budget for the always-on digest. */
  digestMaxBytes?: number
  /** Default hit limit for recall. */
  recallLimit?: number
  /** Age at which an open thread is reported as stalled. */
  staleResearchDays?: number
  /** Tab title the branded Web shell carries; empty string disables the branding row. */
  webTitle?: string
}

/** Input for {@link AssistantMemory.saveMemory}. */
export interface SaveMemoryInput {
  /** The claim: one sentence or two, phrased so it can be falsified later. */
  readonly text: string
  /** What the claim asserts; defaults to `fact`. */
  readonly kind?: MemoryKind
  /** Retrieval tags. */
  readonly tags?: readonly string[]
  /** 1–5; defaults to 3. */
  readonly importance?: number
  /** Where the claim came from. */
  readonly source?: string
  /** Id of the record this one replaces; that record is archived as `superseded`. */
  readonly supersedes?: string
  /** Explicit file-name slug; defaults to a slug of `text`. */
  readonly slug?: string
}

/** Input for {@link AssistantMemory.openThread}. */
export interface OpenThreadInput {
  /** The thing that is not known yet. */
  readonly question: string
  /** Why it deserves attention. */
  readonly why: string
  /** Current best answer and its weakness. */
  readonly lean?: string
  /** What is already known. */
  readonly evidence?: readonly string[]
  /** Where the thread came from. */
  readonly source?: string
  /** Explicit file-name slug; defaults to a slug of `question`. */
  readonly slug?: string
}

/** Fields {@link AssistantMemory.updateThread} may append to or replace. */
export interface ThreadUpdate {
  /** Replacement question text. */
  readonly question?: string
  /** Replacement rationale. */
  readonly why?: string
  /** Replacement lean. */
  readonly lean?: string
  /** Evidence entries to append. */
  readonly evidence?: readonly string[]
}

/** Where a closed thread's answer lives. */
export interface PromoteTarget {
  /** Id of the memory record or skill name that carries the answer. */
  readonly promotedTo: string
}

/** A room listing with its unreadable files. */
export interface RoomReadResult<T> {
  /** Parsed entries. */
  readonly entries: readonly T[]
  /** Files that exist but are not usable entries. */
  readonly failures: readonly RoomReadFailure[]
}

/**
 * The home service. One instance per process, mounted from the host composition.
 */
export class AssistantMemory extends Service {
  static Config: Schema<Config> = z.object({
    dataDir: z.string(),
    digestMaxBytes: z.number().step(1).min(256).default(4096),
    recallLimit: z.number().step(1).min(1).default(20),
    staleResearchDays: z.number().step(1).min(1).default(30),
    webTitle: z.string().default(DEFAULT_WEB_TITLE),
  })

  /** Resolved home paths. */
  readonly paths: HomePaths

  // Cordis resolves `ctx.assistantMemory` through caller-bound shadow receivers: a method
  // invoked via the property proxy runs with a forwarding overlay as `this` (the framework's
  // `createShadowMethod`), which fails JS `#private` brand checks. Service members must
  // therefore be TypeScript-private, never `#`-private — the harness-wide convention.
  // Regression: tests/service-shadow-access.spec.ts.
  private readonly digestMaxBytes: number
  private readonly recallLimit: number
  private readonly staleResearchDays: number
  private readonly memory: Room
  private readonly research: Room
  /**
   * Last rendered digest. Prompt sections assemble synchronously while the home is read
   * asynchronously, so the section reads this cache and a write kicks a background refresh; a cold
   * cache still returns the map blurb, so the model always learns that the home exists.
   */
  private digestCache: DigestResult | undefined

  /**
   * @param ctx - Owning context.
   * @param config - Deployment configuration; see {@link Config}.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'assistantMemory')
    const root = config.dataDir !== undefined && config.dataDir.trim().length > 0
      ? expandHomePath(config.dataDir)
      : join(resolveDshHome(), HOME_DIRECTORY_NAME)
    this.paths = homePaths(root)
    this.digestMaxBytes = config.digestMaxBytes ?? 4096
    this.recallLimit = config.recallLimit ?? 20
    this.staleResearchDays = config.staleResearchDays ?? 30
    this.memory = new Room(this.paths.memoryDir, this.paths.memoryArchiveDir)
    this.research = new Room(this.paths.researchDir, this.paths.researchArchiveDir)
    // Best-effort activation scaffold: a home that cannot be created is reported, never fatal —
    // the write paths call ensureHome again, so a transient failure heals on the next write.
    void this.ensureHome().catch((error: unknown) => {
      this.ctx.logger.warn(`assistant home scaffold failed at ${this.paths.root}: ${String(error)}`)
    })
    // Web shell branding (skin: browser-only, never model-visible; docs/identity.md §二). A
    // webserver collects `webserver/index-inject` rows on every index render; in headless
    // compositions no webserver exists, the event never fires, and this listener idles.
    const webTitle = config.webTitle ?? DEFAULT_WEB_TITLE
    if (webTitle.length > 0) {
      ctx.on('webserver/index-inject', (table) => {
        table.push(webBrandingInjection(webTitle))
      })
    }
  }

  /**
   * Create the home if it is missing. Idempotent; never overwrites a hand-edited `HOME.md`.
   * @returns What this call created.
   */
  async ensureHome(): Promise<ScaffoldResult> {
    return scaffoldHome(this.paths)
  }

  /**
   * List memory records, active and archived.
   * @returns Active and archived records with the files that failed to parse.
   */
  async listMemories(): Promise<RoomReadResult<MemoryRecord> & { readonly archived: readonly MemoryRecord[] }> {
    const active = await this.memory.list()
    const archived = await this.memory.listArchived()
    return {
      entries: active.entries.map(memoryFromEntry).filter((record): record is MemoryRecord => record !== undefined),
      archived: archived.entries.map(memoryFromEntry).filter((record): record is MemoryRecord => record !== undefined),
      failures: [...active.failures, ...archived.failures],
    }
  }

  /**
   * Write a memory record, optionally superseding an existing one.
   * @param input - The claim and its metadata.
   * @returns The written record.
   * @throws when `text` is empty, `supersedes` names a missing record, or `importance` is out of range.
   */
  async saveMemory(input: SaveMemoryInput): Promise<MemoryRecord> {
    const text = input.text.trim()
    if (text.length === 0) throw new Error('assistant_memory save requires non-empty text')
    const importance = input.importance ?? DEFAULT_IMPORTANCE
    if (!Number.isInteger(importance) || importance < IMPORTANCE_RANGE.min || importance > IMPORTANCE_RANGE.max) {
      throw new Error(`importance must be an integer in ${IMPORTANCE_RANGE.min}–${IMPORTANCE_RANGE.max}`)
    }
    await this.ensureHome()
    const now = new Date()
    const stamp = now.toISOString()
    const id = newMemoryId(now, text, undefined, input.slug)
    const record: MemoryRecord = {
      id,
      kind: input.kind ?? 'fact',
      status: 'active',
      created: stamp,
      updated: stamp,
      ...(input.source !== undefined ? { source: input.source } : {}),
      tags: [...(input.tags ?? [])],
      importance,
      ...(input.supersedes !== undefined ? { supersedes: input.supersedes } : {}),
      text,
    }
    if (input.supersedes !== undefined) {
      const existing = await this.memory.read(input.supersedes)
      if (existing === undefined) {
        throw new Error(`supersedes names "${input.supersedes}", which is not an active memory record`)
      }
    }
    const document = memoryToDocument(record)
    await this.memory.write(record.id, document.data, document.body)
    // Archive only after the replacement exists: a failed archive leaves two readable records,
    // which the digest shows and curation reports, instead of losing the old claim.
    if (input.supersedes !== undefined) await this.memory.archive(input.supersedes, { status: 'superseded' })
    this.touch()
    return record
  }

  /**
   * Move a memory record out of the active set.
   * @param id - Record id.
   * @returns Whether an active record was archived.
   */
  async forgetMemory(id: string): Promise<boolean> {
    const archived = await this.memory.archive(id, { status: 'retired' })
    if (archived) this.touch()
    return archived
  }

  /**
   * Rank active memory records.
   * @param query - What to look for; `limit` defaults to the configured recall limit.
   * @returns Ranked hits with match reasons.
   */
  async recall(query: Omit<RecallQuery, 'limit'> & { readonly limit?: number }): Promise<readonly RecallHit[]> {
    const listing = await this.listMemories()
    const now = new Date()
    return recallMemories(listing.entries, { ...query, limit: query.limit ?? this.recallLimit }, now)
  }

  /**
   * List research threads.
   * @returns Active threads, archived threads, and unreadable files.
   */
  async listThreads(): Promise<RoomReadResult<ResearchThread> & { readonly archived: readonly ResearchThread[] }> {
    const active = await this.research.list()
    const archived = await this.research.listArchived()
    return {
      entries: active.entries.map(threadFromEntry).filter((thread): thread is ResearchThread => thread !== undefined),
      archived: archived.entries
        .map(threadFromEntry)
        .filter((thread): thread is ResearchThread => thread !== undefined),
      failures: [...active.failures, ...archived.failures],
    }
  }

  /**
   * Open a thread.
   * @param input - The question, its rationale, and optional lean and evidence.
   * @returns The written thread.
   * @throws when the question or the rationale is empty.
   */
  async openThread(input: OpenThreadInput): Promise<ResearchThread> {
    const question = input.question.trim()
    const why = input.why.trim()
    if (question.length === 0) throw new Error('assistant_research open requires a question')
    if (why.length === 0) {
      throw new Error('assistant_research open requires why the thread deserves attention')
    }
    await this.ensureHome()
    const now = new Date()
    const stamp = now.toISOString()
    const thread: ResearchThread = {
      id: newThreadId(now, question, undefined, input.slug),
      status: 'open',
      question,
      why,
      ...(input.lean !== undefined ? { lean: input.lean } : {}),
      evidence: [...(input.evidence ?? [])],
      created: stamp,
      updated: stamp,
      ...(input.source !== undefined ? { source: input.source } : {}),
    }
    const document = threadToDocument(thread)
    await this.research.write(thread.id, document.data, document.body)
    this.touch()
    return thread
  }

  /**
   * Append to or revise an active thread.
   * @param id - Thread id.
   * @param update - Fields to replace; `evidence` entries are appended, not replaced.
   * @returns The updated thread.
   * @throws when the thread is missing or already closed.
   */
  async updateThread(id: string, update: ThreadUpdate): Promise<ResearchThread> {
    const entry = await this.requireActiveThread(id)
    const thread = threadFromEntry(entry)
    if (thread === undefined) throw new Error(`thread "${id}" is not readable`)
    const next: ResearchThread = {
      ...thread,
      ...(update.question !== undefined ? { question: update.question.trim() } : {}),
      ...(update.why !== undefined ? { why: update.why.trim() } : {}),
      ...(update.lean !== undefined ? { lean: update.lean } : {}),
      evidence: [...thread.evidence, ...(update.evidence ?? [])],
      updated: new Date().toISOString(),
    }
    const document = threadToDocument(next)
    await this.research.write(next.id, document.data, document.body)
    this.touch()
    return next
  }

  /**
   * Park a thread: still valid, not now. It stays in the room but leaves the digest.
   * @param id - Thread id.
   * @returns The parked thread.
   */
  async parkThread(id: string): Promise<ResearchThread> {
    const thread = await this.setThreadStatus(id, 'parked')
    return thread
  }

  /**
   * Drop a thread: wrong, moot, or not worth it. The reason is required — it is what stops a future
   * session from reopening the same question.
   * @param id - Thread id.
   * @param reason - Why it was dropped.
   * @returns The archived thread.
   * @throws when `reason` is empty.
   */
  async dropThread(id: string, reason: string): Promise<ResearchThread> {
    const trimmed = reason.trim()
    if (trimmed.length === 0) {
      throw new Error('assistant_research drop requires a reason: a thread dropped without one gets reopened')
    }
    return this.setThreadStatus(id, 'dropped', { reason: trimmed })
  }

  /**
   * Promote a thread: the question got answered. The destination must already exist, so one writer
   * owns each room and the archived thread's `promotedTo` stays checkable.
   * @param id - Thread id.
   * @param target - Id of the memory record or skill name that carries the answer.
   * @returns The archived thread.
   * @throws when the destination does not exist.
   */
  async promoteThread(id: string, target: PromoteTarget): Promise<ResearchThread> {
    const destination = target.promotedTo.trim()
    if (destination.length === 0) throw new Error('assistant_research promote requires promotedTo')
    const memory = await this.memory.read(destination)
    const archivedMemory = memory ?? await this.memory.readArchived(destination)
    const skills = await scanLearnedSkills(this.paths.skillsDir)
    const known = archivedMemory !== undefined || skills.skills.some(skill => skill.name === destination)
    if (!known) {
      throw new Error(`promotedTo names "${destination}", which is neither a memory record nor a learned skill`)
    }
    return this.setThreadStatus(id, 'promoted', { promotedTo: destination })
  }

  /**
   * Render the bounded digest.
   * @returns Digest text, its byte size, and what it contained.
   */
  async digest(): Promise<DigestResult> {
    const listing = await this.listMemories()
    const threads = await this.listThreads()
    const result = renderDigest({
      mapBlurb: HOME_MAP_BLURB,
      memories: listing.entries,
      threads: threads.entries,
      maxBytes: this.digestMaxBytes,
    })
    this.digestCache = result
    return result
  }

  /**
   * Read the digest without awaiting. Prompt sections assemble synchronously, so this returns the
   * cached rendering and refreshes in the background when the cache is cold or invalidated.
   * @returns The cached digest text, or the map blurb while the first rendering is in flight.
   */
  digestSnapshot(): string {
    if (this.digestCache !== undefined) return this.digestCache.text
    void this.digest().catch((error: unknown) => {
      this.ctx.logger.warn(`assistant home digest refresh failed: ${String(error)}`)
    })
    return HOME_MAP_BLURB
  }

  /**
   * Record one successful `skill`-tool load into the home's usage ledger. The learn module's
   * `tools/result` subscription calls this for every load in a session running the preset;
   * counts are advisory (last writer wins on a concurrent write, a deleted file resets to zero).
   * @param name - Skill name; must satisfy the skill-name grammar.
   * @returns The ledger entry after the increment.
   * @throws when the name is not a valid skill name.
   */
  async recordSkillLoad(name: string): Promise<SkillUsageEntry> {
    if (!isSkillName(name)) throw new Error(`"${name}" is not a valid skill name`)
    const now = new Date()
    const read = await readSkillUsage(this.paths.skillUsageFile)
    if (read.failure !== undefined) {
      this.ctx.logger.warn(
        `skill-usage ledger unreadable at ${read.failure.path} (${read.failure.reason}) — counts reset`,
      )
    }
    const usage = recordSkillLoad(read.usage, name, now)
    const entry = usage[name]
    if (entry === undefined) throw new Error(`usage ledger did not record "${name}"`)
    await writeSkillUsage(this.paths.skillUsageFile, usage)
    return entry
  }

  /**
   * Read the skill-usage ledger.
   * @returns The parsed map, plus the failure when the file exists but is unusable.
   */
  async skillUsage(): Promise<SkillUsageRead> {
    return readSkillUsage(this.paths.skillUsageFile)
  }

  /**
   * List the names of the learned skills currently in the home's skills room.
   * @returns Kebab-case skill names; broken bundles contribute nothing (their findings come
   * from the scan itself).
   */
  async learnedSkillNames(): Promise<string[]> {
    const scan = await scanLearnedSkills(this.paths.skillsDir)
    return scan.skills.flatMap(skill => skill.name !== undefined ? [skill.name] : [])
  }

  /**
   * Run the curation check over the home.
   * @param shadowedBy - Learned skill names that lost the registry's name resolution, mapped to
   * the winning provider. The registry only resolves names inside an agent's layer chain, so the
   * agent-plane `assistant_memory` curate action probes it and passes the result in; callers
   * without a registry (tests, host-side maintenance) omit it and get no shadow findings.
   * @returns Findings, per-skill usage lines, and headline counts.
   */
  async curate(shadowedBy?: Readonly<Record<string, string>>): Promise<CurationBrief> {
    const memories = await this.listMemories()
    const threads = await this.listThreads()
    const skills = await scanLearnedSkills(this.paths.skillsDir)
    const usage = await readSkillUsage(this.paths.skillUsageFile)
    const digest = await this.digest()
    const activeIds = [
      ...memories.entries.map(record => record.id),
      ...threads.entries.map(thread => thread.id),
    ]
    const archivedIds = [
      ...memories.archived.map(record => record.id),
      ...threads.archived.map(thread => thread.id),
    ]
    const archivedSet = new Set(archivedIds)
    return curateHome({
      memories: memories.entries,
      threads: threads.entries,
      memoryFailures: memories.failures,
      researchFailures: threads.failures,
      duplicatedIds: activeIds.filter(id => archivedSet.has(id)),
      knownIds: [...activeIds, ...archivedIds, ...skills.skills.flatMap(skill => skill.name ?? [])],
      skills: skills.skills,
      skillUsage: usage.usage,
      ...(usage.failure !== undefined ? { skillUsageFailure: usage.failure } : {}),
      shadowedSkills: shadowedBy ?? {},
      digestBytes: digest.bytes,
      digestMaxBytes: this.digestMaxBytes,
      staleResearchDays: this.staleResearchDays,
      now: new Date(),
    })
  }

  /**
   * Write a skill the agent learned into the home's skills room.
   * @param draft - Validated skill draft; provenance is stamped automatically.
   * @returns The written bundle's name and path.
   */
  async writeSkill(draft: Omit<SkillDraft, 'learnedAt'>): Promise<{ name: string, path: string }> {
    await this.ensureHome()
    const written = await writeLearnedSkill(this.paths.skillsDir, { ...draft, learnedAt: new Date().toISOString() })
    this.touch()
    return written
  }

  /**
   * Invalidate the digest cache after a write and refresh it in the background, so the next request
   * sees the home as it is now rather than as it was.
   */
  private touch(): void {
    this.digestCache = undefined
    void this.digest().catch((error: unknown) => {
      this.ctx.logger.warn(`assistant home digest refresh failed: ${String(error)}`)
    })
  }

  private async requireActiveThread(id: string): Promise<RoomEntry> {
    const entry = await this.research.read(id)
    if (entry === undefined) {
      const archived = await this.research.readArchived(id)
      if (archived !== undefined) throw new Error(`thread "${id}" is already closed and archived`)
      throw new Error(`thread "${id}" does not exist`)
    }
    return entry
  }

  private async setThreadStatus(
    id: string,
    status: ResearchThread['status'],
    extra: Readonly<Record<string, unknown>> = {},
  ): Promise<ResearchThread> {
    const entry = await this.requireActiveThread(id)
    const thread = threadFromEntry(entry)
    if (thread === undefined) throw new Error(`thread "${id}" is not readable`)
    const next: ResearchThread = {
      ...thread,
      status,
      updated: new Date().toISOString(),
      ...(typeof extra.reason === 'string' ? { reason: extra.reason } : {}),
      ...(typeof extra.promotedTo === 'string' ? { promotedTo: extra.promotedTo } : {}),
    }
    const document = threadToDocument(next)
    await this.research.write(next.id, document.data, document.body)
    // Only a closed thread (dropped or promoted) leaves the active room: park stays in
    // research/ — digest visibility is a render concern, not a location concern.
    // Regression: tests/park-contract.spec.ts (the campaign found park archiving the file).
    if (CLOSED_THREAD_STATUSES.includes(status)) {
      await this.research.archive(next.id)
    }
    this.touch()
    return next
  }
}

export default AssistantMemory
