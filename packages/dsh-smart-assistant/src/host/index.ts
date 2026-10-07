/**
 * `assistantMemory`: the service that owns the agent's home.
 *
 * The home is the harness ring made physical — durable memory, unresolved threads, distilled
 * knowledge, and skills the agent wrote for itself — and this service is its single writer. It lives on the HOST plane
 * (`cordis.patch.yml`) because the home is persistence shared across sessions; the model-facing
 * tools and prompt sections live on the AGENT plane (the `preset-assistant` row of this
 * package's `cordis.patch.yml`) because
 * they are what one session contributes to the registries.
 *
 * Layout, room semantics, and the curation rules are contracts in `docs/home.md`; every path here
 * comes from `home/layout.ts` so the document and the code cannot drift apart silently.
 *
 * The class is a thin shell over the room modules beside it (`memory-room.ts`, `research-room.ts`,
 * `skills-room.ts`, `knowledge-room.ts`, `curate-digest.ts`, `self-turns.ts`): every method is a
 * one-line delegate onto a function that takes the host instance, so the class identity, public
 * method signatures, Config, and cordis augmentation stay in this one file. Method contracts
 * (JSDoc) live on the room functions they delegate to.
 *
 * @module dsh-smart-assistant
 */

import { join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { expandHomePath, resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { digestNow, digestSnapshotNow, manualSnapshotOf, prewarmHome, runCuration, soulSnapshotOf } from './curate-digest.ts'
import { forgetMemory, listMemories, recall, saveMemory, type SaveMemoryInput } from './memory-room.ts'
import { dropThread, listThreads, openThread, parkThread, promoteThread, updateThread, type OpenThreadInput, type PromoteTarget, type ThreadUpdate } from './research-room.ts'
import { landSkill, learnedSkillNames, listProposals, proposeSkill, recordSkillLoad, retireSkill, skillUsage, writeSkill } from './skills-room.ts'
import { deprecatePage, listKnowledge, promotePage, readKnowledgePage, searchKnowledge, writePage, type WritePageInput } from './knowledge-room.ts'
import type { ApprovalAuditOptions } from './approval-audit.ts'
import { installSelfTurnSlots } from './self-turns.ts'
import { DEFAULT_WEB_TITLE, webBrandingInjection } from './web-branding.ts'
import { HOME_DIRECTORY_NAME, homePaths, scaffoldHome, ARCHIVE_DIRECTORY_NAME, type HomePaths, type ScaffoldResult } from '../domain/home/layout.ts'
import { Room, type RoomReadFailure } from '../domain/home/room.ts'
import type { DigestResult } from '../domain/home/digest.ts'
import type { CurationBrief, CurationFinding } from '../domain/home/health.ts'
import type { MemoryRecord } from '../domain/memory/record.ts'
import type { RecallHit, RecallQuery } from '../domain/memory/recall.ts'
import type { ResearchThread } from '../domain/research/thread.ts'
import type { KnowledgePage, PageStatus } from '../domain/knowledge/page.ts'
import type { KnowledgeQuery } from '../domain/knowledge/search.ts'
import type { SkillProposal } from '../domain/skills/proposal.ts'
import type { SkillDraft } from '../domain/skills/skill-file.ts'
import type { SkillUsageEntry, SkillUsageRead } from '../domain/skills/usage.ts'

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

/** A room listing with its unreadable files. */
export interface RoomReadResult<T> {
  /** Parsed entries. */
  readonly entries: readonly T[]
  /** Files that exist but are not usable entries. */
  readonly failures: readonly RoomReadFailure[]
}

export type { SaveMemoryInput } from './memory-room.ts'
export type { OpenThreadInput, ThreadUpdate, PromoteTarget } from './research-room.ts'
export type { WritePageInput } from './knowledge-room.ts'

/**
 * The home service. One instance per process, mounted from the host composition.
 */
export class AssistantMemory extends Service {
  static Config: Schema<Config> = z.object({
    dataDir: z.string(),
    // 6144（2026-10-02 校准）：4096 是骨架期（三房间）定的，第四房间（知识签树）落地后从未
    // 校准——真实使用里 6 记忆 + 9 线索 + 3 稳定页就把知识签树挤到只挂 1/3、线索只列 3/5，
    // 预算闸门随之被知识节的截断误触发（记忆写入门被堵）。6144 = 四房间成熟形状
    // （~10 记忆 + 5 线索 + 5 签树页）仍有余量的有界值；桌面仍然有界，只是不再过紧。
    digestMaxBytes: z.number().step(1).min(256).default(6144),
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
  // Regression: tests/host/service-shadow-access.spec.ts.
  //
  // The owning context (widened from Service's `protected`; `declare` emits nothing), the
  // resolved config values, the four rooms, and the digest cache below are package-visible:
  // the room modules beside this shell read them through the host parameter. Callers keep the
  // methods; no external contract changes.
  declare readonly ctx: Context
  readonly digestMaxBytes: number
  readonly recallLimit: number
  readonly staleResearchDays: number
  readonly staleSkillDays: number
  readonly retireSkillDays: number
  readonly maintenanceEveryRounds: number
  readonly goalProposalTurns: boolean
  readonly memory: Room
  readonly research: Room
  readonly knowledge: Room
  readonly proposals: Room
  /**
   * Last rendered digest. Prompt sections assemble synchronously while the home is read
   * asynchronously, so the section reads this cache and a write kicks a background refresh; a cold
   * cache still returns the status blurb, so the model always learns that the home exists.
   */
  digestCache: DigestResult | undefined
  prewarmPromise: Promise<void> | undefined

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
    this.digestMaxBytes = config.digestMaxBytes ?? 6144
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
    // Best-effort prewarm, memoized in `prewarmHome` so the constructor's fire-and-forget and
    // the cordis `Service.init` hook (awaited by the plugin loader) share one run; the loader
    // awaiting `init` is what turns the prewarm from best-effort into a guarantee (T+113ms vs
    // T+115ms measured 2026-09-25).
    void prewarmHome(this)
    // Web shell branding (skin: browser-only, never model-visible; docs/identity.md §二). A
    // webserver collects `webserver/index-inject` rows on every index render; in headless
    // compositions no webserver exists, the event never fires, and this listener idles.
    const webTitle = config.webTitle ?? DEFAULT_WEB_TITLE
    if (webTitle.length > 0) {
      ctx.on('webserver/index-inject', (table) => {
        table.push(webBrandingInjection(webTitle))
      })
    }
    // Maintenance metronome + goal-completion proposal slot (self-turns.ts).
    installSelfTurnSlots(this, ctx)
  }

  /**
   * Create the home if it is missing. Idempotent; never overwrites a hand-edited `AGENTS.md` or `SOUL.md`.
   * @returns What this call created.
   */
  async ensureHome(): Promise<ScaffoldResult> {
    return scaffoldHome(this.paths)
  }

  /** List memory records, active and archived. */
  async listMemories(): Promise<RoomReadResult<MemoryRecord> & { readonly archived: readonly MemoryRecord[] }> { return listMemories(this) }

  /** Write a memory record, optionally superseding an existing one. */
  async saveMemory(input: SaveMemoryInput): Promise<MemoryRecord> { return saveMemory(this, input) }

  /** Move a memory record out of the active set. */
  async forgetMemory(id: string): Promise<boolean> { return forgetMemory(this, id) }

  /** Rank active memory records; `limit` defaults to the configured recall limit. */
  async recall(query: Omit<RecallQuery, 'limit'> & { readonly limit?: number }): Promise<readonly RecallHit[]> { return recall(this, query) }

  /** List research threads: active, archived, and unreadable files. */
  async listThreads(): Promise<RoomReadResult<ResearchThread> & { readonly archived: readonly ResearchThread[] }> { return listThreads(this) }

  /** Open a thread. */
  async openThread(input: OpenThreadInput): Promise<ResearchThread> { return openThread(this, input) }

  /** Append to or revise an active thread. */
  async updateThread(id: string, update: ThreadUpdate): Promise<ResearchThread> { return updateThread(this, id, update) }

  /** Park a thread: still valid, not now; it stays in the room but leaves the digest. */
  async parkThread(id: string): Promise<ResearchThread> { return parkThread(this, id) }

  /** Drop a thread (reason required): wrong, moot, or not worth it. */
  async dropThread(id: string, reason: string): Promise<ResearchThread> { return dropThread(this, id, reason) }

  /** Promote a thread: the question got answered and the destination must already exist. */
  async promoteThread(id: string, target: PromoteTarget): Promise<ResearchThread> { return promoteThread(this, id, target) }

  /** Write a distilled knowledge page into the knowledge room, as a staged draft. */
  async writePage(input: WritePageInput): Promise<{ id: string, path: string, findings: readonly CurationFinding[] }> { return writePage(this, input) }

  /** List skill proposals. */
  async listProposals(): Promise<RoomReadResult<SkillProposal>> { return listProposals(this) }

  /** Propose a skill: the entry side of the governance gate (inbox only, never the skills room). */
  async proposeSkill(input: Omit<SkillDraft, 'learnedAt'> & { readonly source?: string }): Promise<SkillProposal> { return proposeSkill(this, input) }

  /** Land an approved proposal into the skills room; every land appends an approval-ledger line. */
  async landSkill(name: string, audit?: ApprovalAuditOptions): Promise<{ name: string, path: string }> { return landSkill(this, name, audit) }

  /** Render the bounded digest. */
  async digest(): Promise<DigestResult> { return digestNow(this) }

  /** Read the digest without awaiting; refreshes in the background when the cache is cold. */
  digestSnapshot(): string { return digestSnapshotNow(this) }

  /**
   * Cordis lifecycle hook (class plugins): the loader awaits this after construction, before
   * the plugin counts as loaded. Awaiting the prewarm here guarantees the digest section is
   * warm for the first prompt assembly of a fresh process.
   */
  async [Service.init](): Promise<void> { await prewarmHome(this) }

  /** The identity that rides in the system prompt: `SOUL.md` verbatim, byte-capped. */
  soulSnapshot(): string { return soulSnapshotOf(this) }

  /** The home manual that rides in the system prompt, byte-capped and path-free. */
  manualSnapshot(): string { return manualSnapshotOf(this) }

  /** Record one successful `skill`-tool load into the home's usage ledger. */
  async recordSkillLoad(name: string): Promise<SkillUsageEntry> { return recordSkillLoad(this, name) }

  /** Read the skill-usage ledger. */
  async skillUsage(): Promise<SkillUsageRead> { return skillUsage(this) }

  /** List the names of the learned skills currently in the home's skills room. */
  async learnedSkillNames(): Promise<string[]> { return learnedSkillNames(this) }

  /** Promote one knowledge page from draft to stable (the principal's approval, mechanized); every
   * transition appends an approval-ledger line naming the page, the lane, and the session. */
  async promotePage(id: string, audit?: ApprovalAuditOptions): Promise<{ id: string, path: string, status: PageStatus }> { return promotePage(this, id, audit) }

  /** Mark one knowledge page deprecated; the page stays in place so links keep resolving. */
  async deprecatePage(id: string, audit?: ApprovalAuditOptions): Promise<{ id: string, path: string, status: PageStatus }> { return deprecatePage(this, id, audit) }

  /** List knowledge pages. */
  async listKnowledge(): Promise<RoomReadResult<KnowledgePage>> { return listKnowledge(this) }

  /** Search knowledge pages by keyword; drafts are staged out. */
  async searchKnowledge(query: KnowledgeQuery): Promise<readonly { page: KnowledgePage, why: readonly string[] }[]> { return searchKnowledge(this, query) }

  /** Read one knowledge page with its graph neighbourhood (backlinks computed on demand). */
  async readKnowledgePage(id: string): Promise<{ page: KnowledgePage, backlinks: readonly string[] } | undefined> { return readKnowledgePage(this, id) }

  /** Run the curation check over the home. */
  async curate(shadowedBy?: Readonly<Record<string, string>>): Promise<CurationBrief> { return runCuration(this, shadowedBy) }

  /** Write a skill the agent learned into the home's skills room, then audit what was written. */
  async writeSkill(
    draft: Omit<SkillDraft, 'learnedAt'>,
  ): Promise<{ name: string, path: string, snapshot?: string, findings: readonly CurationFinding[] }> { return writeSkill(this, draft) }

  /** Retire a learned skill: move its bundle into the skills archive (nothing is deleted). */
  async retireSkill(name: string, reason?: string): Promise<{ name: string, path: string }> { return retireSkill(this, name, reason) }
}

export default AssistantMemory
