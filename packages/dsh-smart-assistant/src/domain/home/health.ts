/**
 * The curation check: a pure function over the home's parsed files that reports what has rotted.
 *
 * This is the "let code check what code can check" half of the home's design. It never guesses and
 * never repairs — it names candidates (near-duplicates, dangling references, budget pressure,
 * threads that stopped moving, skills the loader would silently ignore) and leaves the decision to
 * the agent or the person. The same function backs `assistant_memory action=curate` and the tests,
 * so the brief the model reads and the brief CI asserts are the same brief.
 *
 * @module dsh-smart-assistant/home/health
 */

import type { MemoryRecord } from '../memory/record.ts'
import type { ResearchThread } from '../research/thread.ts'
import type { SkillUsage, SkillUsageLine, SkillUsageReadFailure } from '../skills/usage.ts'
import { skillUsageLines } from '../skills/usage.ts'
import type { RoomReadFailure } from './room.ts'
import { MS_PER_DAY } from './time.ts'

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

const NEAR_DUPLICATE_THRESHOLD = 0.6
const MAX_DUPLICATE_PAIRS = 10

function tokens(text: string): Set<string> {
  const set = new Set<string>()
  for (const token of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (token.length >= 3) set.add(token)
  }
  return set
}

function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const token of left) if (right.has(token)) shared += 1
  return shared / (left.size + right.size - shared)
}

function ageInDays(updated: string, now: Date): number {
  const at = Date.parse(updated)
  if (Number.isNaN(at)) return Number.POSITIVE_INFINITY
  return (now.getTime() - at) / MS_PER_DAY
}

function findNearDuplicates(memories: readonly MemoryRecord[]): CurationFinding[] {
  const findings: CurationFinding[] = []
  const tokenSets = memories.map(record => tokens(record.text))
  for (let left = 0; left < memories.length; left += 1) {
    for (let right = left + 1; right < memories.length; right += 1) {
      const leftRecord = memories[left]
      const rightRecord = memories[right]
      if (leftRecord === undefined || rightRecord === undefined) continue
      const overlap = jaccard(tokenSets[left] ?? new Set(), tokenSets[right] ?? new Set())
      if (overlap < NEAR_DUPLICATE_THRESHOLD) continue
      findings.push({
        code: 'near-duplicate',
        severity: 'info',
        message: `"${leftRecord.id}" and "${rightRecord.id}" say nearly the same thing `
          + `(${Math.round(overlap * 100)}% overlap): keep the better-phrased one and supersede the other`,
        refs: [leftRecord.id, rightRecord.id],
      })
      if (findings.length >= MAX_DUPLICATE_PAIRS) return findings
    }
  }
  return findings
}

/**
 * Check a home's parsed state.
 * @param input - Parsed records, threads, skills, and the current digest size.
 * @returns Findings (warns first) and headline counts.
 */
export function curateHome(input: CurationInput): CurationBrief {
  const findings: CurationFinding[] = []
  const known = new Set(input.knownIds)

  for (const failure of [...input.memoryFailures, ...input.researchFailures]) {
    findings.push({
      code: 'unreadable-file',
      severity: 'warn',
      message: `${failure.path} is not a readable entry (${failure.reason}) — `
        + 'a file that does not parse is silently absent from the digest',
      refs: [failure.path],
    })
  }

  for (const id of input.duplicatedIds) {
    findings.push({
      code: 'duplicate-id',
      severity: 'warn',
      message: `"${id}" exists both in a room and in its archive — bookkeeping went wrong`,
      refs: [id],
    })
  }

  if (
    input.notesBytes !== undefined
    && input.notesMaxBytes !== undefined
    && input.notesBytes > input.notesMaxBytes
  ) {
    findings.push({
      code: 'notes-over-budget',
      severity: 'warn',
      message: `the working folder notes (AGENTS.md) are ${String(input.notesBytes)} bytes but the `
        + `prompt keeps ${String(input.notesMaxBytes)} — the tail is cut from every request; shorten the `
        + 'file or move detail into a skill',
      refs: ['AGENTS.md'],
    })
  }

  if (
    input.soulBytes !== undefined
    && input.soulMaxBytes !== undefined
    && input.soulBytes > input.soulMaxBytes
  ) {
    findings.push({
      code: 'soul-over-budget',
      severity: 'warn',
      message: `the identity file (SOUL.md) is ${String(input.soulBytes)} bytes but the prompt keeps `
        + `${String(input.soulMaxBytes)} — the voice is cut from every request; shorten the file`,
      refs: ['SOUL.md'],
    })
  }

  for (const record of input.memories) {
    if (record.supersedes !== undefined && !known.has(record.supersedes)) {
      findings.push({
        code: 'dangling-reference',
        severity: 'warn',
        message: `"${record.id}" supersedes "${record.supersedes}", which does not exist`,
        refs: [record.id, record.supersedes],
      })
    }
  }

  for (const thread of input.threads) {
    if (thread.promotedTo !== undefined && !known.has(thread.promotedTo)) {
      findings.push({
        code: 'dangling-reference',
        severity: 'warn',
        message: `"${thread.id}" was promoted to "${thread.promotedTo}", which does not exist`,
        refs: [thread.id, thread.promotedTo],
      })
    }
    if (thread.status === 'open' && ageInDays(thread.updated, input.now) > input.staleResearchDays) {
      findings.push({
        code: 'stale-thread',
        severity: 'info',
        message: `"${thread.id}" has been open for more than ${input.staleResearchDays} days: `
          + 'pick an exit — promote, park, or drop it with a reason',
        refs: [thread.id],
      })
    }
  }

  findings.push(...findNearDuplicates(input.memories))

  if (input.digestTruncated) {
    // The message names what is actually being squeezed (2026-10-02 keying fix): memory-line
    // omission is actionable by memory consolidation; lower-section truncation is not — pointing
    // the model at memory retirement there would misdirect the cure.
    findings.push({
      code: 'digest-over-budget',
      severity: 'warn',
      message: input.digestOmittedMemories > 0
        ? `the digest hit its ${input.digestMaxBytes}-byte budget and ${String(input.digestOmittedMemories)} `
          + 'active memory record(s) are invisible in every session — retire the weakest active records or tighten their phrasing'
        : `the digest hit its ${input.digestMaxBytes}-byte budget — lower-priority lines (threads / knowledge `
          + 'signposts) are omitted from the desktop, but every memory still rides and the rooms stay intact '
          + 'and searchable; memory writes remain open. Raise the budget only if the omitted signposts matter '
          + 'more than the resident-context cost',
      refs: [],
    })
  }

  if (input.skillUsageFailure !== undefined) {
    findings.push({
      code: 'skill-usage-unreadable',
      severity: 'warn',
      message: `${input.skillUsageFailure.path} is not a readable usage ledger `
        + `(${input.skillUsageFailure.reason}) — counts read as zero and would mislead a retirement decision`,
      refs: [input.skillUsageFailure.path],
    })
  }

  for (const [name, provider] of Object.entries(input.shadowedSkills)) {
    findings.push({
      code: 'skill-shadowed',
      severity: 'warn',
      message: `learned skill "${name}" is shadowed by provider "${provider}", which owns that name `
        + 'in the catalog — the learned bundle will never load: rename it and retire the shadowed '
        + 'bundle, or make the curated one yield',
      refs: [name],
    })
  }

  // Use-by dates: the age anchor is the last load from the usage ledger, or the learnedAt stamp
  // for a skill never loaded. A skill with neither (hand-written, no provenance) cannot be dated
  // and is left to its own findings; a shadowed skill's exit is the shadow finding above, and its
  // name-keyed ledger loads belong to the winner anyway.
  for (const skill of input.skills) {
    const name = skill.name
    if (name === undefined || name in input.shadowedSkills) continue
    const used = input.skillUsage[name]
    const anchor = used?.lastUsedAt ?? skill.learnedAt
    if (anchor === undefined) continue
    const age = ageInDays(anchor, input.now)
    if (!Number.isFinite(age)) continue
    const days = Math.floor(age)
    if (age > input.retireSkillDays) {
      findings.push({
        code: 'skill-retirable',
        severity: 'warn',
        message: `skill "${name}" has been unused for ${days} days, past the ${input.retireSkillDays}-day `
          + `threshold${used !== undefined ? ` (last loaded ${anchor.slice(0, 10)})` : ` (never loaded since it was learned ${anchor.slice(0, 10)})`}: `
          + 'retire it with assistant_reflect action=retire_skill — the bundle moves to skills/archive/ '
          + 'and stays recoverable',
        refs: [name],
      })
    } else if (age > input.staleSkillDays) {
      findings.push({
        code: 'skill-stale',
        severity: 'info',
        message: `skill "${name}" has not been loaded for ${days} days: keep it if it still matters, `
          + 'otherwise retire it',
        refs: [name],
      })
    }
  }

  for (const skill of input.skills) {
    if (skill.name === undefined) {
      findings.push({
        code: 'skill-missing-description',
        severity: 'warn',
        message: `skill bundle "${skill.dirName}" has no readable frontmatter — the loader ignores it`,
        refs: [skill.dirName],
      })
      continue
    }
    if (skill.name !== skill.dirName) {
      findings.push({
        code: 'skill-name-mismatch',
        severity: 'warn',
        message: `skill "${skill.name}" lives in directory "${skill.dirName}": `
          + 'the bundle is loaded by directory, so the two must agree',
        refs: [skill.name, skill.dirName],
      })
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)) {
      findings.push({
        code: 'skill-invalid-name',
        severity: 'warn',
        message: `skill name "${skill.name}" is not kebab-case — the loader ignores it`,
        refs: [skill.name],
      })
    }
    if (skill.description === undefined || skill.description.trim().length === 0) {
      findings.push({
        code: 'skill-missing-description',
        severity: 'warn',
        message: `skill "${skill.name}" has no description, so no future session will know when to load it`,
        refs: [skill.name],
      })
    }
    if (skill.origin === undefined) {
      findings.push({
        code: 'skill-without-provenance',
        severity: 'info',
        message: `skill "${skill.name}" carries no metadata.origin — it was hand-written, or written `
          + 'without assistant_reflect',
        refs: [skill.name],
      })
    }
  }

  findings.sort(compareFindings)

  const openThreads = input.threads.filter(thread => thread.status === 'open').length
  // Usage lines cover loadable learned skills only: a shadowed name's loads belong to the
  // winning provider's body, so attributing them to the shadowed bundle would read as use.
  const shadowedNames = new Set(Object.keys(input.shadowedSkills))
  const learnedNames = input.skills
    .flatMap(skill => skill.name !== undefined ? [skill.name] : [])
    .filter(name => !shadowedNames.has(name))
  return {
    findings,
    skillUsage: skillUsageLines(input.skillUsage, learnedNames, input.now, 'least-used'),
    ...(input.skillUsageSince !== undefined ? { skillUsageSince: input.skillUsageSince } : {}),
    counts: {
      memories: input.memories.length,
      activeMemories: input.memories.filter(record => record.status === 'active').length,
      threads: input.threads.length,
      openThreads,
      parkedThreads: input.threads.filter(thread => thread.status === 'parked').length,
      learnedSkills: input.skills.length,
      knowledgePages: input.knowledgePages,
      retiredSkillBundles: input.retiredSkillBundles,
      skillSnapshots: input.skillSnapshots,
      digestBytes: input.digestBytes,
      digestMaxBytes: input.digestMaxBytes,
    },
  }
}
