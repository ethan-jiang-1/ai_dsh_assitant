/**
 * The `SKILL.md` contract for skills the agent writes for itself.
 *
 * The name grammar is copied verbatim from the harness registry (`packages/skill/skill/src/index.ts`,
 * `SKILL_NAME`); `pnpm verify` fails when the two drift apart. Writing through this module is what
 * makes a learned skill *discoverable*: the provider silently ignores a bundle whose frontmatter is
 * wrong or whose directory name disagrees with `name`, so an unvalidated write is a wasted lesson.
 *
 * Provenance is stamped into the optional `metadata` field (`origin`, `source`, `learnedAt`), which
 * is how a later curation pass tells a learned skill from a hand-written one without moving it to a
 * separate directory the provider would not scan.
 *
 * @module dsh-smart-assistant/skills/skill-file
 */

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from '../home/atomic-write.ts'
import { renderFrontmatterDocument } from '../home/frontmatter.ts'

/** Skill-name grammar, identical to the harness registry's `SKILL_NAME`. */
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** File name of a skill bundle's body. */
export const SKILL_FILE_NAME = 'SKILL.md'

/** `metadata.origin` value marking a skill the agent learned rather than a curated one. */
export const LEARNED_ORIGIN = 'learned'

/** Longest accepted description; the provider puts it in every catalog. */
export const MAX_DESCRIPTION_LENGTH = 500

/** Longest accepted body. */
export const MAX_BODY_BYTES = 32_768

/**
 * Whether a string is a valid skill name.
 * @param name - Candidate name.
 * @returns Whether the name matches the registry grammar.
 */
export function isSkillName(name: string): boolean {
  return SKILL_NAME_PATTERN.test(name)
}

/** A skill the agent wants to write. */
export interface SkillDraft {
  /** Kebab-case name; also the bundle directory name. */
  readonly name: string
  /** When to load this skill — the only text the model sees before loading it. */
  readonly description: string
  /** Optional extra trigger guidance. */
  readonly whenToUse?: string
  /** Skill body: the procedure itself. */
  readonly body: string
  /** Session or source the skill was learned from. */
  readonly source?: string
  /** ISO-8601 timestamp of the learning. */
  readonly learnedAt?: string
}

/**
 * Report every reason a draft would produce an undiscoverable or useless skill.
 * @param draft - Draft to check.
 * @returns Problem descriptions; empty means valid.
 */
export function validateSkillDraft(draft: SkillDraft): string[] {
  const problems: string[] = []
  if (!isSkillName(draft.name)) {
    problems.push(`name "${draft.name}" must be kebab-case matching ${String(SKILL_NAME_PATTERN)}`)
  }
  const description = draft.description.trim()
  if (description.length === 0) {
    problems.push('description is required — it is how a future session decides to load this skill')
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    problems.push(`description must be at most ${MAX_DESCRIPTION_LENGTH} characters`)
  }
  if (draft.body.trim().length === 0) problems.push('body is required — a skill with no steps teaches nothing')
  if (Buffer.byteLength(draft.body, 'utf8') > MAX_BODY_BYTES) {
    problems.push(`body must be at most ${MAX_BODY_BYTES} bytes`)
  }
  return problems
}

/**
 * Render a complete `SKILL.md`.
 * @param draft - Validated draft.
 * @returns File contents.
 */
export function renderSkillFile(draft: SkillDraft): string {
  const metadata: Record<string, unknown> = { origin: LEARNED_ORIGIN }
  if (draft.source !== undefined) metadata.source = draft.source
  if (draft.learnedAt !== undefined) metadata.learnedAt = draft.learnedAt
  return renderFrontmatterDocument({
    name: draft.name,
    description: draft.description.trim(),
    ...(draft.whenToUse !== undefined ? { whenToUse: draft.whenToUse.trim() } : {}),
    metadata,
  }, draft.body)
}

/**
 * Write a learned skill into the home's skills room.
 * @param skillsDir - The home's skills directory.
 * @param draft - Draft to validate and write.
 * @returns The written bundle's name and path.
 * @throws when the draft violates the skill contract.
 */
export async function writeLearnedSkill(
  skillsDir: string,
  draft: SkillDraft,
): Promise<{ name: string, path: string }> {
  const problems = validateSkillDraft(draft)
  if (problems.length > 0) throw new Error(`skill draft rejected: ${problems.join('; ')}`)
  const bundleDir = join(skillsDir, draft.name)
  await mkdir(bundleDir, { recursive: true, mode: 0o700 })
  const path = join(bundleDir, SKILL_FILE_NAME)
  // The home's one write discipline: a unique sibling temp then a rename. A crash mid-write
  // must leave the previous skill readable, not a truncated SKILL.md the provider skips.
  await atomicWriteFile(path, renderSkillFile(draft))
  return { name: draft.name, path }
}
