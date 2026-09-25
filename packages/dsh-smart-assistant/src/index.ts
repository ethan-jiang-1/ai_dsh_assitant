/**
 * `assistantMemory`: the service that owns the agent's home.
 *
 * The home is the harness ring made physical — durable memory, unresolved threads, distilled
 * knowledge, and skills the agent wrote for itself — and this service is its single writer. It lives on the HOST plane
 * (`cordis.patch.yml`) because the home is persistence shared across sessions; the model-facing
 * tools and prompt sections live on the AGENT plane (`presets/assistant/agent.cordis.yml`) because
 * they are what one session contributes to the registries.
 *
 * Layout, room semantics, and the curation rules are contracts in `docs/home.md`; every path here
 * comes from `home/layout.ts` so the document and the code cannot drift apart silently.
 *
 * @module dsh-smart-assistant
 */

import { readFileSync } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { expandHomePath, resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: the goal package declares the 'goal/changed' event and the 'goal' message source
// kind in the cordis Events / llm MessageSourceMap merges — the proposal slot listens to the
// event, so the augmentation must be in the program.
import type {} from '@deepseek-ai/dsh-goal'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

// 0.1.7: message sources became a merge-extensible map (`MessageSourceMap`); the generic
// `{ kind: 'plugin' }` shape was removed. DSH's own packages each declare their kinds, so this
// plugin declares the one kind it injects — a turn it queued on its own (maintenance metronome,
// proposal slot). Consumers switch on `kind` and fall through unknowns.
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /** A turn this plugin queued by itself, with no user or model behind it. */
    'assistant-plugin': { kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' }
  }
}
import { renderDigest, type DigestResult } from './home/digest.ts'
import { parseFrontmatterDocument, renderFrontmatterDocument } from './home/frontmatter.ts'
import { compareFindings, curateHome, type CurationBrief, type CurationFinding } from './home/health.ts'
import { HOME_STATUS_BLURB, parseManualVersion, renderHomeManual } from './home/home-map.ts'
import { DEFAULT_SOUL } from './home/soul.ts'
import { HOME_DIRECTORY_NAME, homePaths, scaffoldHome, ARCHIVE_DIRECTORY_NAME, type HomePaths, type ScaffoldResult } from './home/layout.ts'
import { isMaintenanceRound, renderMaintenancePrompt } from './home/metronome.ts'
import { curateKnowledge } from './knowledge/health.ts'
import { pageFromEntry, pageToDocument, parseWikiLinks, normalizeWikiLinks, backlinksOf, type KnowledgePage } from './knowledge/page.ts'
import { searchPages, type KnowledgeQuery } from './knowledge/search.ts'
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
import { scanLearnedSkills, scanSkillArchiveScale } from './skills/scan.ts'
import { auditLearnedSkill, auditSkillsRoom, auditSkillCredentials } from './skills/audit.ts'
import { snapshotExistingSkill } from './skills/snapshot.ts'
import {
  proposalFromEntry,
  proposalToDocument,
  renderProposalPrompt,
  type SkillProposal,
} from './skills/proposal.ts'
import { writeLearnedSkill, validateSkillDraft, isSkillName, SKILL_FILE_NAME, type SkillDraft } from './skills/skill-file.ts'
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
  /** Days without a load after which a learned skill is reported as stale. */
  staleSkillDays?: number
  /** Days without a load after which a learned skill is retirement-ready. */
  retireSkillDays?: number
  /** Goal rounds between maintenance slots; values below 1 disable the metronome. */
  maintenanceEveryRounds?: number
  /** Whether a completed goal queues a skill-proposal slot (propose-only; never auto-lands). */
  goalProposalTurns?: boolean
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

/** Byte cap for the identity file riding in the prompt. */
const SOUL_BYTE_CAP = 4096

/** Byte cap for the manual riding in the prompt. */
const MANUAL_BYTE_CAP = 8192

/**
 * Read one home-root file for a prompt section, synchronously (assembly is sync; the files are
 * small and rarely change, so a per-assembly read keeps hand edits visible with no cache).
 * @param path - The file to read.
 * @param fallback - What to return when the file is missing, empty, or unreadable.
 * @param cap - UTF-8 byte cap; an oversized file keeps its head plus a marker naming the cut.
 * @returns The file's trimmed content, or the fallback.
 */
function rootFileSnapshot(path: string, fallback: string, cap: number): string {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return fallback
  }
  const trimmed = text.trim()
  if (trimmed.length === 0) return fallback
  const bytes = Buffer.byteLength(trimmed, 'utf8')
  if (bytes <= cap) return trimmed
  return `${trimmed.slice(0, cap)}\n[… truncated ${String(bytes - cap)} bytes; edit the file to be shorter]`
}

export class AssistantMemory extends Service {
  static Config: Schema<Config> = z.object({
    dataDir: z.string(),
    digestMaxBytes: z.number().step(1).min(256).default(4096),
    recallLimit: z.number().step(1).min(1).default(20),
    staleResearchDays: z.number().step(1).min(1).default(30),
    staleSkillDays: z.number().step(1).min(1).default(30),
    retireSkillDays: z.number().step(1).min(1).default(90),
    maintenanceEveryRounds: z.number().step(1).min(0).default(5),
    goalProposalTurns: z.boolean().default(true),
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
  private readonly staleSkillDays: number
  private readonly retireSkillDays: number
  private readonly maintenanceEveryRounds: number
  private readonly goalProposalTurns: boolean
  private readonly memory: Room
  private readonly research: Room
  private readonly knowledge: Room
  private readonly proposals: Room
  /**
   * Last rendered digest. Prompt sections assemble synchronously while the home is read
   * asynchronously, so the section reads this cache and a write kicks a background refresh; a cold
   * cache still returns the status blurb, so the model always learns that the home exists.
   */
  private digestCache: DigestResult | undefined
  private prewarmPromise: Promise<void> | undefined

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
    this.staleSkillDays = config.staleSkillDays ?? 30
    this.retireSkillDays = config.retireSkillDays ?? 90
    this.maintenanceEveryRounds = config.maintenanceEveryRounds ?? 5
    this.goalProposalTurns = config.goalProposalTurns ?? true
    this.memory = new Room(this.paths.memoryDir, this.paths.memoryArchiveDir)
    this.research = new Room(this.paths.researchDir, this.paths.researchArchiveDir)
    // Knowledge pages never move to an archive (deprecated stays in place), so the Room's
    // archive paths are simply never used for this room.
    this.knowledge = new Room(this.paths.knowledgeDir, join(this.paths.knowledgeDir, ARCHIVE_DIRECTORY_NAME))
    this.proposals = new Room(this.paths.skillProposalsDir, join(this.paths.skillProposalsDir, ARCHIVE_DIRECTORY_NAME))
    // Best-effort prewarm, memoized so the constructor's fire-and-forget and the cordis
    // `Service.init` hook (awaited by the plugin loader) share one run. Construction alone
    // loses the race by milliseconds — measured live on 2026-09-25: the runner's first prompt
    // assembly evaluated the digest section at T+113ms while the async refresh finished at
    // T+115ms, a coin flip every fresh process. The loader awaiting `init` is what turns the
    // prewarm from best-effort into a guarantee for plugin-loading paths; direct construction
    // (tests) still gets the fire-and-forget head start.
    void this.prewarm()
    // Web shell branding (skin: browser-only, never model-visible; docs/identity.md §二). A
    // webserver collects `webserver/index-inject` rows on every index render; in headless
    // compositions no webserver exists, the event never fires, and this listener idles.
    const webTitle = config.webTitle ?? DEFAULT_WEB_TITLE
    if (webTitle.length > 0) {
      ctx.on('webserver/index-inject', (table) => {
        table.push(webBrandingInjection(webTitle))
      })
    }

    // The maintenance metronome (I14, tri-line proposal slice 1e): every `maintenanceEveryRounds`
    // goal rounds, queue a maintenance turn ahead of the next round. The round driver's yield
    // barrier — a non-goal message in nextTurn defers the next round until it is consumed — is
    // what makes the slot safe (iteration-rhythm note: the native safe position). The round
    // number and goal id ride the goal-kind message source, so the metronome is stateless across
    // restarts and self-resets for a new goal; the fired-map only dedupes a re-queued round.
    // Non-goal sessions fall to the persona discipline instead (the note's layer (a)).
    if (this.maintenanceEveryRounds >= 1) {
      const fired = new Map<string, number>()
      ctx.on('agent/inbox/inserted', ({ agent, message }): undefined => {
        // Widened on purpose: the 'goal' source kind is declared by @deepseek-ai/dsh-goal, which
        // this package does not depend on — the runtime check needs only the two fields.
        const source = message.source as { kind: string, goalId?: unknown, round?: number }
        if (source.kind !== 'goal' || source.round === undefined || source.goalId === undefined) {
          return undefined
        }
        const key = String(source.goalId)
        if (!isMaintenanceRound(source.round, this.maintenanceEveryRounds)) return undefined
        if ((fired.get(key) ?? 0) >= source.round) return undefined
        fired.set(key, source.round)
        const maintenance = createUserMessage({
          content: [{
            type: 'text',
            text: renderMaintenancePrompt(source.round, this.maintenanceEveryRounds),
          }],
          source: { kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' },
        })
        try {
          agent.followup(maintenance)
        } catch (error: unknown) {
          fired.delete(key)
          this.ctx.logger.warn(
            `maintenance metronome could not queue a slot for agent "${String(agent.id)}": ${String(error)}`,
          )
        }
        return undefined
      })
    }

    // The proposal slot (phase 3): a completed goal is a natural batch boundary, so it queues
    // one proposal turn — propose-only. The model proposes; a person approves by editing the
    // proposal file's status (the same review shape as knowledge drafts); nothing auto-lands.
    if (this.goalProposalTurns) {
      ctx.on('goal/changed', ({ agent, change }): undefined => {
        if (change.operation !== 'complete') return undefined
        const proposal = createUserMessage({
          content: [{ type: 'text', text: renderProposalPrompt() }],
          source: { kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' },
        })
        try {
          agent.followup(proposal)
        } catch (error: unknown) {
          this.ctx.logger.warn(
            `proposal slot could not queue for agent "${String(agent.id)}": ${String(error)}`,
          )
        }
        return undefined
      })
    }
  }

  /**
   * Create the home if it is missing. Idempotent; never overwrites a hand-edited `AGENTS.md` or `SOUL.md`.
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
   *
   * Budget enforcement (tri-line proposal slice 1h): when the digest is already cut short by its
   * byte budget, a pure addition is refused at the write primitive — the budget stops being
   * advisory. Superseding and retiring writes stay open because they replace or remove.
   * @param input - The claim and its metadata.
   * @returns The written record.
   * @throws when `text` is empty, `supersedes` names a missing record, `importance` is out of
   * range, or the digest is over budget and this write would only add.
   */
  async saveMemory(input: SaveMemoryInput): Promise<MemoryRecord> {
    const text = input.text.trim()
    if (text.length === 0) throw new Error('assistant_memory save requires non-empty text')
    const importance = input.importance ?? DEFAULT_IMPORTANCE
    if (!Number.isInteger(importance) || importance < IMPORTANCE_RANGE.min || importance > IMPORTANCE_RANGE.max) {
      throw new Error(`importance must be an integer in ${IMPORTANCE_RANGE.min}–${IMPORTANCE_RANGE.max}`)
    }
    await this.ensureHome()
    if (input.supersedes === undefined) {
      const digest = await this.digest()
      if (digest.truncated) {
        throw new Error(
          `the working folder digest is already cut short by its ${this.digestMaxBytes}-byte budget — `
          + 'retire a record (forget) or supersede an existing one instead of adding; '
          + 'assistant_memory action=curate reports the pressure',
        )
      }
    }
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
    const knowledge = await this.listKnowledge()
    const known = archivedMemory !== undefined
      || skills.skills.some(skill => skill.name === destination)
      || knowledge.entries.some(page => page.id === destination)
    if (!known) {
      throw new Error(`promotedTo names "${destination}", which is neither a memory record, a learned skill, nor a knowledge page`)
    }
    return this.setThreadStatus(id, 'promoted', { promotedTo: destination })
  }

  /**
   * Write a distilled knowledge page into the knowledge room, as a staged draft.
   *
   * Drafts never enter search results or the digest tree — the review gate is a deliberate file
   * edit (a hand flip of `status` to `stable` is the approval), so nothing a session writes
   * promotes itself. Sources are required: an unsourced page is useless even as a draft.
   * @param input - The page's content and where it came from.
   * @returns The written page's id, path, and credential-audit findings.
   * @throws when `body` or `sources` is empty, or the generated id is not a safe file name.
   */
  async writePage(input: {
    readonly type: string
    readonly title?: string
    readonly description?: string
    readonly body: string
    readonly sources: readonly string[]
    readonly tags?: readonly string[]
    readonly staleAfter?: string
    readonly slug?: string
  }): Promise<{ id: string, path: string, findings: readonly CurationFinding[] }> {
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
    await this.ensureHome()
    // Normalize links at the write boundary: a resolvable bare name link is rewritten into
    // `[[<id>|<title>]]`, the only form this room and Obsidian both resolve (knowledge/page.ts).
    const linkedBody = normalizeWikiLinks(body, (await this.listKnowledge()).entries)
    const now = new Date()
    const id = newThreadId(now, input.title ?? input.type, undefined, input.slug)
    const page: KnowledgePage = {
      id,
      status: 'draft',
      type,
      ...(input.title !== undefined && input.title.trim().length > 0 ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined && input.description.trim().length > 0 ? { description: input.description.trim() } : {}),
      generated: { by: 'process:assistant-reflect', at: now.toISOString() },
      ...(input.staleAfter !== undefined ? { staleAfter: input.staleAfter } : {}),
      sources: sources.map(resource => ({ resource })),
      tags: [...(input.tags ?? [])],
      body: linkedBody,
      links: parseWikiLinks(linkedBody),
    }
    const document = pageToDocument(page)
    await this.knowledge.write(id, document.data, document.body)
    // The credential audit is content-agnostic: a page carrying a live secret is the same
    // failure as a skill carrying one.
    const findings = auditSkillCredentials(id, renderFrontmatterDocument(document.data, document.body))
    this.touch()
    const entry = await this.knowledge.read(id)
    return { id, path: entry?.path ?? join(this.paths.knowledgeDir, `${id}.md`), findings }
  }

  /**
   * List skill proposals.
   * @returns Parsed proposals and the files that failed to parse.
   */
  async listProposals(): Promise<RoomReadResult<SkillProposal>> {
    const listing = await this.proposals.list()
    return {
      entries: listing.entries
        .map(proposalFromEntry)
        .filter((proposal): proposal is SkillProposal => proposal !== undefined),
      failures: listing.failures,
    }
  }

  /**
   * Propose a skill (or revise an existing proposal of the same name): the entry side of the
   * governance gate. The proposal lands in the inbox for a person to review — it does not touch
   * the skills room. Re-proposing a name bumps the revision and replaces the text, so an
   * approval always binds to the content in the file at approval time.
   * @param input - The proposed skill, validated by the same contract as `save_skill`.
   * @returns The written proposal.
   * @throws when the draft violates the skill contract, or an approved proposal of that name is
   * already waiting to land (revise nothing behind a pending approval).
   */
  async proposeSkill(input: Omit<SkillDraft, 'learnedAt'> & { readonly source?: string }): Promise<SkillProposal> {
    const problems = validateSkillDraft(input)
    if (problems.length > 0) throw new Error(`skill proposal rejected: ${problems.join('; ')}`)
    await this.ensureHome()
    const existing = await this.proposals.read(input.name)
    const previous = existing === undefined ? undefined : proposalFromEntry(existing)
    if (previous?.status === 'approved') {
      throw new Error(`proposal "${input.name}" is approved and waiting to land — land it or reject it before proposing again`)
    }
    const now = new Date().toISOString()
    const proposal: SkillProposal = {
      id: input.name,
      status: 'proposed',
      revision: (previous?.revision ?? 0) + 1,
      description: input.description.trim(),
      ...(input.whenToUse !== undefined ? { whenToUse: input.whenToUse.trim() } : {}),
      created: previous?.created ?? now,
      updated: now,
      ...(input.source !== undefined && input.source.length > 0 ? { source: input.source } : {}),
      body: input.body,
    }
    const document = proposalToDocument(proposal)
    await this.proposals.write(proposal.id, document.data, document.body)
    this.touch()
    return proposal
  }

  /**
   * Land an approved proposal into the skills room. The approval itself is a hand edit of the
   * proposal file's `status` — this method only materializes what a person already approved,
   * and stamps the landed skill's provenance with the proposal revision it came from.
   * @param name - Proposal (and skill) name.
   * @returns The written bundle's name and path.
   * @throws when no proposal has that name, or its status is not `approved`.
   */
  async landSkill(name: string): Promise<{ name: string, path: string }> {
    const entry = await this.proposals.read(name)
    const proposal = entry === undefined ? undefined : proposalFromEntry(entry)
    if (proposal === undefined) throw new Error(`no skill proposal "${name}" in the inbox`)
    if (proposal.status !== 'approved') {
      throw new Error(`proposal "${name}" is ${proposal.status}, not approved — the approval is a hand edit of its status field`)
    }
    const written = await this.writeSkill({
      name: proposal.id,
      description: proposal.description,
      ...(proposal.whenToUse !== undefined ? { whenToUse: proposal.whenToUse } : {}),
      body: proposal.body,
      source: `proposal:${proposal.id}#r${String(proposal.revision)}`,
    })
    const document = proposalToDocument({ ...proposal, status: 'landed', updated: new Date().toISOString() })
    await this.proposals.write(proposal.id, document.data, document.body)
    return { name: written.name, path: written.path }
  }

  /**
   * Render the bounded digest.
   * @returns Digest text, its byte size, and what it contained.
   */
  async digest(): Promise<DigestResult> {
    const listing = await this.listMemories()
    const threads = await this.listThreads()
    const knowledge = await this.listKnowledge()
    const result = renderDigest({
      statusBlurb: HOME_STATUS_BLURB,
      memories: listing.entries,
      threads: threads.entries,
      pages: knowledge.entries,
      maxBytes: this.digestMaxBytes,
    })
    this.digestCache = result
    return result
  }

  /**
   * Read the digest without awaiting. Prompt sections assemble synchronously, so this returns the
   * cached rendering and refreshes in the background when the cache is cold or invalidated.
   * @returns The cached digest text, or the status blurb while the first rendering is in flight.
   */
  digestSnapshot(): string {
    if (this.digestCache !== undefined) return this.digestCache.text
    void this.digest().catch((error: unknown) => {
      this.ctx.logger.warn(`assistant home digest refresh failed: ${String(error)}`)
    })
    return HOME_STATUS_BLURB
  }

  /**
   * Memoized startup chain: scaffold the working folder (best-effort — the write paths call
   * `ensureHome` again, so a transient failure heals on the next write), then render the first
   * digest. Shared by the constructor's fire-and-forget call and the cordis `Service.init`
   * hook, so the plugin loader can await exactly the work the constructor started.
   */
  private prewarm(): Promise<void> {
    this.prewarmPromise ??= (async () => {
      try {
        await this.ensureHome()
      } catch (error: unknown) {
        this.ctx.logger.warn(`assistant home scaffold failed at ${this.paths.root}: ${String(error)}`)
      }
      try {
        await this.digest()
      } catch (error: unknown) {
        this.ctx.logger.warn(`assistant home digest prewarm failed: ${String(error)}`)
      }
    })()
    return this.prewarmPromise
  }

  /**
   * Cordis lifecycle hook (class plugins): the loader awaits this after construction, before
   * the plugin counts as loaded. Awaiting the prewarm here is what guarantees the digest
   * section is warm for the first prompt assembly of a fresh process — the constructor alone
   * loses that race by milliseconds (measured 2026-09-25: section evaluated at T+113ms,
   * fire-and-forget digest finished at T+115ms).
   */
  async [Service.init](): Promise<void> {
    await this.prewarm()
  }

  /**
   * The identity that rides in the system prompt: `SOUL.md` verbatim when it has content, the
   * built-in default when it is missing, empty, or unreadable (Hermes semantics: the file
   * replaces the default entirely; the default is the fallback, never an addition). Frozen
   * per assembly read, so a hand edit is visible to the next request.
   * @returns The identity text, byte-capped.
   */
  soulSnapshot(): string {
    return rootFileSnapshot(this.paths.soulFile, DEFAULT_SOUL, SOUL_BYTE_CAP)
  }

  /**
   * The home manual that rides in the system prompt: `AGENTS.md` verbatim when present, a
   * freshly rendered manual otherwise — the fallback is always current, so a missing manual
   * can never go stale. Hand edits are the owner's; only the scaffold version marker is the
   * machine's (see `curate`'s drift finding).
   * @returns The manual text, byte-capped.
   */
  manualSnapshot(): string {
    return rootFileSnapshot(this.paths.agentsFile, renderHomeManual(this.paths), MANUAL_BYTE_CAP)
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
    const since = read.since ?? now.toISOString()
    const entry = usage[name]
    if (entry === undefined) throw new Error(`usage ledger did not record "${name}"`)
    await writeSkillUsage(this.paths.skillUsageFile, usage, since)
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
   * List knowledge pages.
   * @returns Parsed pages and the files that failed to parse.
   */
  async listKnowledge(): Promise<RoomReadResult<KnowledgePage>> {
    const listing = await this.knowledge.list()
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
   * @param query - Terms, required tags, and an optional limit.
   * @returns Ranked hits with match reasons.
   */
  async searchKnowledge(query: KnowledgeQuery): Promise<readonly { page: KnowledgePage, why: readonly string[] }[]> {
    const listing = await this.listKnowledge()
    return searchPages(listing.entries, query)
  }

  /**
   * Read one knowledge page with its graph neighbourhood: backlinks are computed on demand
   * over the whole room — no index to keep fresh.
   * @param id - Page id.
   * @returns The page and the ids of pages linking to it, or `undefined` when the page does
   * not exist or does not parse.
   */
  async readKnowledgePage(id: string): Promise<{ page: KnowledgePage, backlinks: readonly string[] } | undefined> {
    const listing = await this.listKnowledge()
    const page = listing.entries.find(candidate => candidate.id === id)
    if (page === undefined) return undefined
    return { page, backlinks: backlinksOf(page, listing.entries) }
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
    const knowledge = await this.listKnowledge()
    const skills = await scanLearnedSkills(this.paths.skillsDir)
    const archiveScale = await scanSkillArchiveScale(this.paths.skillsArchiveDir)
    const manualText = await readFile(this.paths.agentsFile, 'utf8').catch(() => undefined)
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
    const brief = curateHome({
      memories: memories.entries,
      threads: threads.entries,
      memoryFailures: memories.failures,
      researchFailures: threads.failures,
      duplicatedIds: activeIds.filter(id => archivedSet.has(id)),
      knownIds: [...activeIds, ...archivedIds, ...skills.skills.flatMap(skill => skill.name ?? [])],
      skills: skills.skills,
      knowledgePages: knowledge.entries.length,
      retiredSkillBundles: archiveScale.retiredBundles,
      skillSnapshots: archiveScale.snapshots,
      ...(manualText !== undefined ? { manualVersion: parseManualVersion(manualText) } : {}),
      skillUsage: usage.usage,
      ...(usage.since !== undefined ? { skillUsageSince: usage.since } : {}),
      ...(usage.failure !== undefined ? { skillUsageFailure: usage.failure } : {}),
      shadowedSkills: shadowedBy ?? {},
      digestBytes: digest.bytes,
      digestMaxBytes: this.digestMaxBytes,
      digestTruncated: digest.truncated,
      staleResearchDays: this.staleResearchDays,
      staleSkillDays: this.staleSkillDays,
      retireSkillDays: this.retireSkillDays,
      now: new Date(),
    })
    // Post-write audit findings join the brief: the pure room check and the content audit are
    // two passes over the same home, and the model should read one brief.
    const audit = await auditSkillsRoom(this.paths.skillsDir)
    const pages = curateKnowledge({
      pages: knowledge.entries,
      failures: knowledge.failures,
      now: new Date(),
      staleResearchDays: this.staleResearchDays,
    })
    // The proposal inbox is part of the home's health: an approved proposal waiting to land is
    // a decision made and not executed; an aging proposal is a decision nobody is making.
    const proposals = await this.listProposals()
    const proposalFindings: CurationFinding[] = []
    for (const proposal of proposals.entries) {
      if (proposal.status === 'approved') {
        proposalFindings.push({
          code: 'proposal-awaiting-land',
          severity: 'info',
          message: `proposal "${proposal.id}" (r${String(proposal.revision)}) is approved and waiting to land — `
            + 'run assistant_reflect action=land_skill to write it into the skills room',
          refs: [proposal.id],
        })
      }
      const age = (Date.now() - Date.parse(proposal.updated)) / (24 * 60 * 60 * 1000)
      if (Number.isFinite(age) && age > this.staleResearchDays && (proposal.status === 'proposed' || proposal.status === 'approved')) {
        proposalFindings.push({
          code: 'proposal-stale',
          severity: 'info',
          message: `proposal "${proposal.id}" has sat ${String(Math.floor(age))} days in ${proposal.status} — `
            + 'pick an exit: a person edits its status (approve/reject), or it keeps waiting',
          refs: [proposal.id],
        })
      }
    }
    return {
      ...brief,
      findings: [...brief.findings, ...audit, ...pages, ...proposalFindings].sort(compareFindings),
    }
  }

  /**
   * Write a skill the agent learned into the home's skills room, then audit what was written.
   * Replacing an existing bundle snapshots the previous wording first (`skills/archive/
   * snapshots/<name>/`, newest few kept) — the write-time contract check refuses an unusable
   * frontmatter shape, and the audit covers the two ways a well-formed skill still fails a
   * future session (broken relative pointers, credential shapes). Findings ride the return
   * value — reported, never blocking.
   * @param draft - Validated skill draft; provenance is stamped automatically.
   * @returns The written bundle's name, path, the pre-overwrite snapshot path when one was
   * taken, and post-write audit findings.
   */
  async writeSkill(
    draft: Omit<SkillDraft, 'learnedAt'>,
  ): Promise<{ name: string, path: string, snapshot?: string, findings: readonly CurationFinding[] }> {
    await this.ensureHome()
    const snapshot = await snapshotExistingSkill(
      this.paths.skillsDir,
      this.paths.skillsArchiveDir,
      draft.name,
    )
    const written = await writeLearnedSkill(this.paths.skillsDir, { ...draft, learnedAt: new Date().toISOString() })
    const text = await readFile(written.path, 'utf8').catch(() => undefined)
    const findings = text === undefined
      ? []
      : await auditLearnedSkill(written.name, dirname(written.path), text)
    this.touch()
    return { ...written, ...(snapshot !== undefined ? { snapshot } : {}), findings }
  }

  /**
   * Retire a learned skill: move its bundle out of the provider's scan into the skills archive.
   * The skill stops loading immediately (the provider watches the room) but nothing is deleted —
   * moving the bundle back restores it. The archived copy is stamped with `metadata.retiredAt`
   * and, when given, `metadata.retireReason`, so the corpse says how it died.
   * @param name - Skill name; must satisfy the skill-name grammar.
   * @param reason - Optional why; the usage facts are already in the ledger.
   * @returns The archived bundle's name and path.
   * @throws when no active learned skill has that name, the file is unreadable, or the name is
   * already archived.
   */
  async retireSkill(name: string, reason?: string): Promise<{ name: string, path: string }> {
    if (!isSkillName(name)) throw new Error(`"${name}" is not a valid skill name`)
    const trimmed = reason?.trim()
    const bundleDir = join(this.paths.skillsDir, name)
    const bundleFile = join(bundleDir, SKILL_FILE_NAME)
    const flatFile = join(this.paths.skillsDir, `${name}.md`)
    const isBundle = await stat(bundleFile).then(entry => entry.isFile()).catch(() => false)
    const isFlat = isBundle ? false : await stat(flatFile).then(entry => entry.isFile()).catch(() => false)
    if (!isBundle && !isFlat) {
      // The more honest error first: a name that is already archived names its archived copy,
      // not a vague absence.
      const archivedBundle = join(this.paths.skillsArchiveDir, name, SKILL_FILE_NAME)
      const archivedFlat = join(this.paths.skillsArchiveDir, `${name}.md`)
      const archived = await stat(archivedBundle).then(() => true).catch(() => false)
        || await stat(archivedFlat).then(() => true).catch(() => false)
      throw new Error(archived
        ? `skill "${name}" is already archived`
        : `no learned skill "${name}" in the skills room`)
    }
    const sourcePath = isBundle ? bundleFile : flatFile
    const text = await readFile(sourcePath, 'utf8')
    const document = parseFrontmatterDocument(text)
    if (document === undefined) {
      throw new Error(`skill "${name}" is not a readable SKILL.md — fix or remove it by hand`)
    }
    const metadata = document.data.metadata !== null
      && typeof document.data.metadata === 'object'
      && !Array.isArray(document.data.metadata)
      ? { ...(document.data.metadata as Record<string, unknown>) }
      : {}
    metadata.retiredAt = new Date().toISOString()
    if (trimmed !== undefined && trimmed.length > 0) metadata.retireReason = trimmed
    const targetDir = isBundle ? join(this.paths.skillsArchiveDir, name) : this.paths.skillsArchiveDir
    await mkdir(targetDir, { recursive: true })
    const target = isBundle ? join(targetDir, SKILL_FILE_NAME) : join(targetDir, `${name}.md`)
    if (await stat(target).then(() => true).catch(() => false)) {
      throw new Error(`skill "${name}" is already archived`)
    }
    // Archive before removing the original: a failure leaves two readable copies (which curate's
    // duplicate scan and the shadow check would surface) instead of losing the skill.
    const temporary = `${target}.tmp`
    await writeFile(temporary, renderFrontmatterDocument({ ...document.data, metadata }, document.body), 'utf8')
    await rename(temporary, target)
    await rm(isBundle ? bundleDir : flatFile, { recursive: true, force: true })
    return { name, path: target }
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
