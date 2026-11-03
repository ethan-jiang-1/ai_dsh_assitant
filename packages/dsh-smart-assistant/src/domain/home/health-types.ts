/**
 * Vocabulary for the curation check: finding codes, the finding record, and everything the check
 * reads. Split out of `health.ts` so the room rules and the skill rules can share one vocabulary
 * without importing each other.
 *
 * @module dsh-smart-assistant/home/health-types
 */

import type { MemoryRecord } from '../memory/record.ts'
import type { ResearchThread } from '../research/thread.ts'
import type { SkillUsage, SkillUsageLine, SkillUsageReadFailure } from '../skills/usage.ts'
import type { RoomReadFailure } from './room.ts'

/** Machine-readable finding kinds, stable enough for a caller to filter on. */
export type FindingCode =
  | 'unreadable-file'
  | 'notes-over-budget'
  | 'soul-over-budget'
  | 'duplicate-id'
  | 'dangling-reference'
  | 'near-duplicate'
  | 'digest-over-budget'
  | 'stale-thread'
  | 'skill-name-mismatch'
  | 'skill-invalid-name'
  | 'skill-missing-description'
  | 'skill-without-provenance'
  | 'skill-usage-unreadable'
  | 'skill-shadowed'
  | 'skill-stale'
  | 'skill-retirable'
  | 'skill-broken-reference'
  | 'skill-credential-leak'
  | 'page-unreadable'
  | 'page-link-unwritten'
  | 'page-link-ambiguous'
  | 'page-link-deprecated'
  | 'page-unproven'
  | 'page-source-missing'
  | 'credential-shaped-text'
  | 'page-orphan'
  | 'page-stale'
  | 'page-draft-stale'
  | 'proposal-awaiting-land'
  | 'proposal-stale'

/** One thing worth a human's or the agent's attention. */
export interface CurationFinding {
  /** Stable kind. */
  readonly code: FindingCode
  /** `error` means retrieval is silently wrong; `warn` means the home is losing signal now; `info` means it will soon. */
  readonly severity: 'error' | 'warn' | 'info'
  /** One line naming the problem and the fix. */
  readonly message: string
  /** Entry ids, skill names, or file paths the finding is about. */
  readonly refs: readonly string[]
}

/** What a learned-skill scan found for one bundle. */
export interface LearnedSkillInfo {
  /** Bundle directory name. */
  readonly dirName: string
  /** `name` from the bundle's frontmatter, when it parsed. */
  readonly name?: string
  /** `description` from the bundle's frontmatter. */
  readonly description?: string
  /** `metadata.origin`, when present. */
  readonly origin?: string
  /** `metadata.learnedAt`, when present — the age anchor for a never-loaded skill. */
  readonly learnedAt?: string
  /** `metadata.source`, when present — real provenance (origin is the constant 'learned'). */
  readonly source?: string
}

/** Everything the check reads; assembled by the service so the check itself stays pure. */
export interface CurationInput {
  /** Active memory records. */
  readonly memories: readonly MemoryRecord[]
  /** Active threads. */
  readonly threads: readonly ResearchThread[]
  /** Memory files that did not parse. */
  readonly memoryFailures: readonly RoomReadFailure[]
  /** Thread files that did not parse. */
  readonly researchFailures: readonly RoomReadFailure[]
  /** Ids present in both a room and its archive, which means bookkeeping went wrong. */
  readonly duplicatedIds: readonly string[]
  /** Ids available for dangling-reference checks: active and archived entries of both rooms. */
  readonly knownIds: readonly string[]
  /** Learned skill bundles found in the skills room. */
  readonly skills: readonly LearnedSkillInfo[]
  /** Knowledge pages found in the knowledge room (headline count; the graph check runs separately). */
  readonly knowledgePages: number
  /** Retired bundles (and flat retired skills) in the skills archive. */
  readonly retiredSkillBundles: number
  /** Pre-overwrite snapshots under the skills archive. */
  readonly skillSnapshots: number
  /** Bytes of the user notes (AGENTS.md); omitted when the file is absent. */
  readonly notesBytes?: number
  /** Byte budget the prompt keeps for the notes. */
  readonly notesMaxBytes?: number
  /** Bytes of the on-disk SOUL.md identity; omitted when the file is absent. */
  readonly soulBytes?: number
  /** Byte budget the prompt keeps for the identity. */
  readonly soulMaxBytes?: number
  /** The skill-usage ledger, joined against `skills` for the usage lines. */
  readonly skillUsage: SkillUsage
  /** Set when the ledger file exists but is not a valid ledger. */
  readonly skillUsageFailure?: SkillUsageReadFailure
  /** When the usage ledger started counting; absent when unknown (older ledger or fresh home). */
  readonly skillUsageSince?: string
  /** Learned skill names that lost the registry's name resolution, mapped to the winning provider. */
  readonly shadowedSkills: Readonly<Record<string, string>>
  /** Bytes the current digest occupies (post-truncation, so never above the budget). */
  readonly digestBytes: number
  /** Digest budget. */
  readonly digestMaxBytes: number
  /** Whether the budget cut the digest short — the real pressure signal. */
  readonly digestTruncated: boolean
  /** Active memory records the budget left off the desktop — the gate keying (0 = memories all ride). */
  readonly digestOmittedMemories: number
  /** Age at which an open thread is reported as stalled. */
  readonly staleResearchDays: number
  /** Days without a load after which a learned skill is reported as stale. */
  readonly staleSkillDays: number
  /** Days without a load after which a learned skill is retirement-ready. */
  readonly retireSkillDays: number
  /** Timestamp used for age comparisons. */
  readonly now: Date
}

/** Counts and findings the caller renders or acts on. */
export interface CurationBrief {
  /** Findings, warns first. */
  readonly findings: readonly CurationFinding[]
  /** Per-skill usage lines for the learned skills, least-used first (retirement candidates first). */
  readonly skillUsage: readonly SkillUsageLine[]
  /** Passed through from the ledger so consumers can say which window the counts cover. */
  readonly skillUsageSince?: string
  /** Headline counts. */
  readonly counts: {
    readonly memories: number
    readonly activeMemories: number
    readonly threads: number
    readonly openThreads: number
    readonly parkedThreads: number
    readonly learnedSkills: number
    readonly knowledgePages: number
    readonly retiredSkillBundles: number
    readonly skillSnapshots: number
    readonly digestBytes: number
    readonly digestMaxBytes: number
  }
}

const SEVERITY_ORDER: ReadonlyMap<CurationFinding['severity'], number> = new Map([
  ['error', 0],
  ['warn', 1],
  ['info', 2],
])

/**
 * Order findings errors-first then warns-first, stably — the curation brief, the post-write
 * audit, and the knowledge graph check all sort with this, so merged lists keep one order.
 * @param left - One finding.
 * @param right - The other finding.
 * @returns Negative when `left` should come first.
 */
export function compareFindings(
  left: CurationFinding,
  right: CurationFinding,
): number {
  return (SEVERITY_ORDER.get(left.severity) ?? 3) - (SEVERITY_ORDER.get(right.severity) ?? 3)
}
