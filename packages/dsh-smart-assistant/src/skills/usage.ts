/**
 * The skill-usage ledger: load counts and last-used stamps for every skill the `skill` tool
 * loaded, kept as one machine-owned JSON file at the home root.
 *
 * This is the data plane the governance loop runs on (tri-line proposal 2026-09-24, slice 1a):
 * retirement decisions and the deferred auto-distill criterion both need "which skills does the
 * agent actually load" as a recorded fact, not as the model's recollection. The ledger is
 * advisory state, not knowledge — deleting it resets the counts, and it never enters the digest.
 *
 * Reads never throw on a bad file: a corrupt ledger is reported upward as a failure so the
 * curation check can warn on it, because silently reading zero counts would mislead a retirement
 * decision. The one load path not counted is the user's `/<name>` slash invocation, which injects
 * skill content as a message and never traverses the tool pipeline.
 *
 * @module dsh-smart-assistant/skills/usage
 */

import { readFile, rename, writeFile } from 'node:fs/promises'
import { isSkillName } from './skill-file.ts'

/** One skill's usage facts. */
export interface SkillUsageEntry {
  /** Successful `skill`-tool loads observed. */
  readonly count: number
  /** ISO-8601 timestamp of the most recent load. */
  readonly lastUsedAt: string
}

/** The ledger as a name → usage map. */
export type SkillUsage = Readonly<Record<string, SkillUsageEntry>>

/** Why a ledger file could not be read as a ledger. */
export interface SkillUsageReadFailure {
  /** Absolute file path. */
  readonly path: string
  /** What is wrong with the file. */
  readonly reason: string
}

/** Result of reading the ledger: the parsed map, plus the failure when the file is unusable. */
export interface SkillUsageRead {
  /** Parsed entries; empty when the file is missing or corrupt. */
  readonly usage: SkillUsage
  /** Set when the file exists but is not a valid ledger. */
  readonly failure?: SkillUsageReadFailure
}

/** One learned skill's usage line, joined from the ledger and the skills-room scan. */
export interface SkillUsageLine {
  /** Skill name. */
  readonly name: string
  /** Recorded loads; `0` when the ledger has no entry. */
  readonly count: number
  /** ISO-8601 timestamp of the most recent load; absent when never loaded. */
  readonly lastUsedAt?: string
  /** Whole days since the most recent load; absent when never loaded. */
  readonly daysSinceLastUse?: number
}

/** Ledger file format version. */
const LEDGER_VERSION = 1

const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseEntry(value: unknown): SkillUsageEntry | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (!Number.isInteger(record.count) || (record.count as number) < 0) return undefined
  if (typeof record.lastUsedAt !== 'string' || record.lastUsedAt.length === 0) return undefined
  return { count: record.count as number, lastUsedAt: record.lastUsedAt }
}

/**
 * Parse ledger file contents.
 * @param text - Raw file text.
 * @returns The usage map, or `undefined` when the text is not a valid ledger.
 */
export function parseSkillUsage(text: string): SkillUsage | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  const file = parsed as Record<string, unknown>
  if (file.version !== LEDGER_VERSION) return undefined
  if (file.usage === null || typeof file.usage !== 'object' || Array.isArray(file.usage)) return undefined
  const usage: Record<string, SkillUsageEntry> = {}
  for (const [name, value] of Object.entries(file.usage as Record<string, unknown>)) {
    const entry = parseEntry(value)
    if (entry !== undefined) usage[name] = entry
  }
  return usage
}

/**
 * Render the ledger with sorted names and stable formatting, so consecutive writes diff cleanly
 * under git.
 * @param usage - Ledger contents.
 * @returns File text.
 */
export function renderSkillUsage(usage: SkillUsage): string {
  const sorted: Record<string, SkillUsageEntry> = {}
  for (const name of Object.keys(usage).sort()) sorted[name] = usage[name] as SkillUsageEntry
  return `${JSON.stringify({ version: LEDGER_VERSION, usage: sorted }, null, 2)}\n`
}

/**
 * Read the ledger. A missing file is an empty ledger, not a failure; a file that exists but is
 * not a valid ledger is a failure, because counts read as zero would look like disuse.
 * @param path - Ledger file path.
 * @returns The parsed map and the failure when the file is unusable.
 */
export async function readSkillUsage(path: string): Promise<SkillUsageRead> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return { usage: {} }
  }
  const usage = parseSkillUsage(text)
  if (usage === undefined) {
    return { usage: {}, failure: { path, reason: 'not a valid skill-usage ledger (version or entries wrong)' } }
  }
  return { usage }
}

/**
 * Write the ledger atomically (temporary file + rename), matching the room store's discipline.
 * @param path - Ledger file path.
 * @param usage - Ledger contents.
 */
export async function writeSkillUsage(path: string, usage: SkillUsage): Promise<void> {
  const temporary = `${path}.tmp`
  await writeFile(temporary, renderSkillUsage(usage), 'utf8')
  await rename(temporary, path)
}

/**
 * Record one load, purely.
 * @param usage - Current ledger.
 * @param name - Skill name; must satisfy the skill-name grammar.
 * @param now - Load timestamp.
 * @returns The next ledger.
 */
export function recordSkillLoad(usage: SkillUsage, name: string, now: Date): SkillUsage {
  const previous = usage[name]
  return {
    ...usage,
    [name]: { count: (previous?.count ?? 0) + 1, lastUsedAt: now.toISOString() },
  }
}

/**
 * Extract the skill name from a `skill`-tool result notification, when it names a successful
 * load of a validly named skill. The subscription in the learn module feeds every tool result
 * through this; anything else passes through as `undefined`.
 * @param toolName - Tool name from the execution.
 * @param args - The execution's parsed arguments.
 * @param isError - Whether the execution reported an error.
 * @returns The loaded skill's name, or `undefined` when this is not a successful skill load.
 */
export function skillLoadFromResult(toolName: string, args: unknown, isError: boolean): string | undefined {
  if (toolName !== 'skill' || isError) return undefined
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return undefined
  const candidate = (args as Record<string, unknown>).name
  if (typeof candidate !== 'string' || !isSkillName(candidate)) return undefined
  return candidate
}

/**
 * Join the ledger with a skills-room scan into display lines, one per learned skill — the
 * ledger also holds curated names, but governance is about the room.
 * @param usage - Ledger.
 * @param names - Learned skill names present in the room.
 * @param now - Timestamp for age computation.
 * @param order - `least-used` first (retirement candidates, what curate shows) or `most-used`
 *   first (what a reflection should build on, what brief shows).
 * @param limit - Maximum lines to return; `undefined` keeps all.
 * @returns Usage lines for the named skills.
 */
export function skillUsageLines(
  usage: SkillUsage,
  names: readonly string[],
  now: Date,
  order: 'least-used' | 'most-used',
  limit?: number,
): SkillUsageLine[] {
  const lines: SkillUsageLine[] = []
  for (const name of names) {
    const entry = usage[name]
    if (entry === undefined) {
      lines.push({ name, count: 0 })
      continue
    }
    const at = Date.parse(entry.lastUsedAt)
    const days = Number.isNaN(at) ? undefined : Math.floor((now.getTime() - at) / MS_PER_DAY)
    lines.push({ name, count: entry.count, lastUsedAt: entry.lastUsedAt, ...(days !== undefined ? { daysSinceLastUse: days } : {}) })
  }
  lines.sort((left, right) => {
    if (left.count !== right.count) return order === 'most-used' ? right.count - left.count : left.count - right.count
    const leftStamp = left.lastUsedAt ?? ''
    const rightStamp = right.lastUsedAt ?? ''
    if (leftStamp !== rightStamp) return leftStamp < rightStamp ? -1 : 1
    return left.name.localeCompare(right.name)
  })
  return limit === undefined ? lines : lines.slice(0, Math.max(0, limit))
}
