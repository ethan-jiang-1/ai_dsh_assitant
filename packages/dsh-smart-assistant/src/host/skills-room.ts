/**
 * Skills room of the home: learned skills the agent wrote for itself (`skills/`), the proposal
 * inbox gating what lands there (`skills/proposals/`), and the usage ledger counting what
 * actually loads. Functions here are the moved bodies of the {@link AssistantMemory} skill and
 * proposal methods; they take the host instance (the service itself or the cordis shadow overlay,
 * which forwards field access) so the class methods stay one-line delegates.
 *
 * @module
 */
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AssistantMemory } from './index.ts'
import { touchDigest } from './curate-digest.ts'
import type { CurationFinding } from '../domain/home/health.ts'
import type { HomePaths } from '../domain/home/layout.ts'
import type { Room } from '../domain/home/room.ts'
import { atomicWriteFile } from '../domain/home/atomic-write.ts'
import { parseFrontmatterDocument, renderFrontmatterDocument } from '../domain/home/frontmatter.ts'
import { scanLearnedSkills } from '../domain/skills/scan.ts'
import { auditLearnedSkill } from '../domain/skills/audit.ts'
import { snapshotExistingSkill } from '../domain/skills/snapshot.ts'
import { recordApproval, type ApprovalAuditOptions } from './approval-audit.ts'
import {
  proposalFromEntry,
  proposalToDocument,
  type SkillProposal,
} from '../domain/skills/proposal.ts'
import { writeLearnedSkill, validateSkillDraft, isSkillName, SKILL_FILE_NAME, type SkillDraft } from '../domain/skills/skill-file.ts'
import {
  readSkillUsage,
  recordSkillLoad as recordSkillLoadInLedger,
  writeSkillUsage,
  type SkillUsageEntry,
  type SkillUsageRead,
} from '../domain/skills/usage.ts'
import type { RoomReadResult } from './index.ts'

/** Read only the learned skill directory. */
interface LearnedSkillsReader {
  readonly paths: Pick<HomePaths, 'skillsDir'>
}

/** Read only the skill proposal inbox entries and failures. */
interface ProposalRoomReader {
  readonly proposals: Pick<Room, 'list'>
}

/**
 * List skill proposals.
 * @param host - The home service whose proposal inbox is read.
 * @returns Parsed proposals and the files that failed to parse.
 */
export async function listProposals(host: ProposalRoomReader): Promise<RoomReadResult<SkillProposal>> {
  const listing = await host.proposals.list()
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
 * @param host - The home service whose proposal inbox is written.
 * @param input - The proposed skill, validated by the same contract as `save_skill`.
 * @returns The written proposal.
 * @throws when the draft violates the skill contract, or an approved proposal of that name is
 * already waiting to land (revise nothing behind a pending approval).
 */
export async function proposeSkill(host: AssistantMemory, input: Omit<SkillDraft, 'learnedAt'> & { readonly source?: string }): Promise<SkillProposal> {
  const problems = validateSkillDraft(input)
  if (problems.length > 0) throw new Error(`skill proposal rejected: ${problems.join('; ')}`)
  await host.ensureHome()
  const existing = await host.proposals.read(input.name)
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
  await host.proposals.write(proposal.id, document.data, document.body)
  touchDigest(host)
  return proposal
}

/**
 * Land an approved proposal into the skills room. The approval itself is a hand edit of the
 * proposal file's `status` — this function only materializes what a person already approved,
 * stamps the landed skill's provenance with the proposal revision it came from, and appends a
 * line to the approval ledger (`audit/approvals.jsonl`) so the land is never invisible.
 * @param host - The home service whose proposal inbox and skills room are written.
 * @param name - Proposal (and skill) name.
 * @param audit - Lane context for the ledger line; defaults to the reflect tool's model turn.
 * @returns The written bundle's name and path.
 * @throws when no proposal has that name, or its status is not `approved`.
 */
export async function landSkill(host: AssistantMemory, name: string, audit: ApprovalAuditOptions = {}): Promise<{ name: string, path: string }> {
  const entry = await host.proposals.read(name)
  const proposal = entry === undefined ? undefined : proposalFromEntry(entry)
  if (proposal === undefined) throw new Error(`no skill proposal "${name}" in the inbox`)
  if (proposal.status !== 'approved') {
    throw new Error(`proposal "${name}" is ${proposal.status}, not approved — the approval is a hand edit of its status field`)
  }
  const written = await writeSkill(host, {
    name: proposal.id,
    description: proposal.description,
    ...(proposal.whenToUse !== undefined ? { whenToUse: proposal.whenToUse } : {}),
    body: proposal.body,
    source: `proposal:${proposal.id}#r${String(proposal.revision)}`,
  })
  const document = proposalToDocument({ ...proposal, status: 'landed', updated: new Date().toISOString() })
  await host.proposals.write(proposal.id, document.data, document.body)
  await recordApproval(host, 'land', name, audit)
  return { name: written.name, path: written.path }
}

/**
 * Record one successful `skill`-tool load into the home's usage ledger. The learn module's
 * `tools/result` subscription calls this for every load in a session running the preset;
 * counts are advisory (last writer wins on a concurrent write, a deleted file resets to zero).
 * @param host - The home service whose ledger is written.
 * @param name - Skill name; must satisfy the skill-name grammar.
 * @returns The ledger entry after the increment.
 * @throws when the name is not a valid skill name.
 */
export async function recordSkillLoad(host: AssistantMemory, name: string): Promise<SkillUsageEntry> {
  if (!isSkillName(name)) throw new Error(`"${name}" is not a valid skill name`)
  const now = new Date()
  const read = await readSkillUsage(host.paths.skillUsageFile)
  if (read.failure !== undefined) {
    host.ctx.logger.warn(
      `skill-usage ledger unreadable at ${read.failure.path} (${read.failure.reason}) — counts reset`,
    )
  }
  const usage = recordSkillLoadInLedger(read.usage, name, now)
  const since = read.since ?? now.toISOString()
  const entry = usage[name]
  if (entry === undefined) throw new Error(`usage ledger did not record "${name}"`)
  await writeSkillUsage(host.paths.skillUsageFile, usage, since)
  return entry
}

/**
 * Read the skill-usage ledger.
 * @param host - The home service whose ledger is read.
 * @returns The parsed map, plus the failure when the file exists but is unusable.
 */
export async function skillUsage(host: AssistantMemory): Promise<SkillUsageRead> {
  return readSkillUsage(host.paths.skillUsageFile)
}

/**
 * List the names of the learned skills currently in the home's skills room.
 * @param host - The home service whose skills room is scanned.
 * @returns Kebab-case skill names; broken bundles contribute nothing (their findings come
 * from the scan itself).
 */
export async function learnedSkillNames(host: LearnedSkillsReader): Promise<string[]> {
  const scan = await scanLearnedSkills(host.paths.skillsDir)
  return scan.skills.flatMap(skill => skill.name !== undefined ? [skill.name] : [])
}

/**
 * Write a skill the agent learned into the home's skills room, then audit what was written.
 * Replacing an existing bundle snapshots the previous wording first (`skills/archive/
 * snapshots/<name>/`, newest few kept) — the write-time contract check refuses an unusable
 * frontmatter shape, and the audit covers the two ways a well-formed skill still fails a
 * future session (broken relative pointers, credential shapes). Findings ride the return
 * value — reported, never blocking.
 * @param host - The home service whose skills room is written.
 * @param draft - Validated skill draft; provenance is stamped automatically.
 * @returns The written bundle's name, path, the pre-overwrite snapshot path when one was
 * taken, and post-write audit findings.
 */
export async function writeSkill(
  host: AssistantMemory,
  draft: Omit<SkillDraft, 'learnedAt'>,
): Promise<{ name: string, path: string, snapshot?: string, findings: readonly CurationFinding[] }> {
  await host.ensureHome()
  const snapshot = await snapshotExistingSkill(
    host.paths.skillsDir,
    host.paths.skillsArchiveDir,
    draft.name,
  )
  const written = await writeLearnedSkill(host.paths.skillsDir, { ...draft, learnedAt: new Date().toISOString() })
  const text = await readFile(written.path, 'utf8').catch(() => undefined)
  const findings = text === undefined
    ? []
    : await auditLearnedSkill(written.name, dirname(written.path), text)
  touchDigest(host)
  return { ...written, ...(snapshot !== undefined ? { snapshot } : {}), findings }
}

/**
 * Retire a learned skill: move its bundle out of the provider's scan into the skills archive.
 * The skill stops loading immediately (the provider watches the room) but nothing is deleted —
 * moving the bundle back restores it. The archived copy is stamped with `metadata.retiredAt`
 * and, when given, `metadata.retireReason`, so the corpse says how it died.
 * @param host - The home service whose skills room is moved to its archive.
 * @param name - Skill name; must satisfy the skill-name grammar.
 * @param reason - Optional why; the usage facts are already in the ledger.
 * @returns The archived bundle's name and path.
 * @throws when no active learned skill has that name, the file is unreadable, or the name is
 * already archived.
 */
export async function retireSkill(host: AssistantMemory, name: string, reason?: string): Promise<{ name: string, path: string }> {
  if (!isSkillName(name)) throw new Error(`"${name}" is not a valid skill name`)
  const trimmed = reason?.trim()
  const bundleDir = join(host.paths.skillsDir, name)
  const bundleFile = join(bundleDir, SKILL_FILE_NAME)
  const flatFile = join(host.paths.skillsDir, `${name}.md`)
  const isBundle = await stat(bundleFile).then(entry => entry.isFile()).catch(() => false)
  const isFlat = isBundle ? false : await stat(flatFile).then(entry => entry.isFile()).catch(() => false)
  if (!isBundle && !isFlat) {
    // The more honest error first: a name that is already archived names its archived copy,
    // not a vague absence.
    const archivedBundle = join(host.paths.skillsArchiveDir, name, SKILL_FILE_NAME)
    const archivedFlat = join(host.paths.skillsArchiveDir, `${name}.md`)
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
  if (isBundle) {
    // Move the whole bundle, not just SKILL.md (BUG-005 F4, 2026-10-07): references/ and other
    // side files are legal bundle content ("fix the path or ship the file"), and the promise
    // "moving the bundle back restores it" holds only if nothing is deleted. The rename is
    // atomic — no window where the skill exists in neither place; the stamp write happens
    // inside the archive, and if it fails the bundle is still readable, just unstamped.
    const targetDir = join(host.paths.skillsArchiveDir, name)
    await mkdir(host.paths.skillsArchiveDir, { recursive: true })
    if (await stat(targetDir).then(() => true).catch(() => false)) {
      throw new Error(`skill "${name}" is already archived`)
    }
    await rename(bundleDir, targetDir)
    const stampedPath = join(targetDir, SKILL_FILE_NAME)
    await atomicWriteFile(stampedPath, renderFrontmatterDocument({ ...document.data, metadata }, document.body))
    return { name, path: stampedPath }
  }
  const target = join(host.paths.skillsArchiveDir, `${name}.md`)
  await mkdir(host.paths.skillsArchiveDir, { recursive: true })
  if (await stat(target).then(() => true).catch(() => false)) {
    throw new Error(`skill "${name}" is already archived`)
  }
  // Archive before removing the original: a failure leaves two readable copies (which curate's
  // duplicate scan and the shadow check would surface) instead of losing the skill.
  await atomicWriteFile(target, renderFrontmatterDocument({ ...document.data, metadata }, document.body))
  await rm(flatFile, { force: true })
  return { name, path: target }
}
