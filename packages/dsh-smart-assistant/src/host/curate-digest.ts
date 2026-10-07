/**
 * Digest and curation — the read-and-judge half of the home: the bounded desktop digest and its
 * cache lifecycle, the curation brief over all rooms, and the prompt-section snapshots
 * (`SOUL.md`, the home manual). Functions here are the moved bodies of the corresponding
 * {@link AssistantMemory} methods; they take the host instance (the service itself or the cordis
 * shadow overlay, which forwards field access) so the class methods stay one-line delegates.
 * Cross-room reads go through the host's own methods, so this module imports no room module.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { AssistantMemory } from './index.ts'
import { renderDigest, type DigestResult } from '../domain/home/digest.ts'
import { compareFindings, curateHome, type CurationBrief, type CurationFinding } from '../domain/home/health.ts'
import { HOME_STATUS_BLURB, parseManualVersion, renderHomeManual } from '../domain/home/home-map.ts'
import { DEFAULT_SOUL } from '../domain/home/soul.ts'
import { curateKnowledge } from '../domain/knowledge/health.ts'
import { scanLearnedSkills, scanSkillArchiveScale } from '../domain/skills/scan.ts'
import { auditSkillsRoom } from '../domain/skills/audit.ts'
import { readSkillUsage } from '../domain/skills/usage.ts'

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

/**
 * Invalidate the digest cache after a write and refresh it in the background, so the next request
 * sees the home as it is now rather than as it was.
 * @param host - The home service whose digest cache is invalidated.
 */
export function touchDigest(host: AssistantMemory): void {
  host.digestCache = undefined
  void digestNow(host).catch((error: unknown) => {
    host.ctx.logger.warn(`assistant home digest refresh failed: ${String(error)}`)
  })
}

/**
 * Render the bounded digest.
 * @param host - The home service whose rooms are read.
 * @returns Digest text, its byte size, and what it contained.
 */
export async function digestNow(host: AssistantMemory): Promise<DigestResult> {
  const listing = await host.listMemories()
  const threads = await host.listThreads()
  const knowledge = await host.listKnowledge()
  const result = renderDigest({
    statusBlurb: HOME_STATUS_BLURB,
    memories: listing.entries,
    threads: threads.entries,
    pages: knowledge.entries,
    maxBytes: host.digestMaxBytes,
  })
  host.digestCache = result
  return result
}

/**
 * Read the digest without awaiting. Prompt sections assemble synchronously, so this returns the
 * cached rendering and refreshes in the background when the cache is cold or invalidated.
 * @param host - The home service whose digest cache is read.
 * @returns The cached digest text, or the status blurb while the first rendering is in flight.
 */
export function digestSnapshotNow(host: AssistantMemory): string {
  if (host.digestCache !== undefined) return host.digestCache.text
  void digestNow(host).catch((error: unknown) => {
    host.ctx.logger.warn(`assistant home digest refresh failed: ${String(error)}`)
  })
  return HOME_STATUS_BLURB
}

/**
 * Memoized startup chain: scaffold the working folder (best-effort — the write paths call
 * `ensureHome` again, so a transient failure heals on the next write), then render the first
 * digest. Shared by the constructor's fire-and-forget call and the cordis `Service.init`
 * hook, so the plugin loader can await exactly the work the constructor started.
 * @param host - The home service being prewarmed.
 */
export function prewarmHome(host: AssistantMemory): Promise<void> {
  host.prewarmPromise ??= (async () => {
    try {
      await host.ensureHome()
    } catch (error: unknown) {
      host.ctx.logger.warn(`assistant home scaffold failed at ${host.paths.root}: ${String(error)}`)
    }
    try {
      await digestNow(host)
    } catch (error: unknown) {
      host.ctx.logger.warn(`assistant home digest prewarm failed: ${String(error)}`)
    }
  })()
  return host.prewarmPromise
}

/**
 * The identity that rides in the system prompt: `SOUL.md` verbatim when it has content, the
 * built-in default when it is missing, empty, or unreadable (Hermes semantics: the file
 * replaces the default entirely; the default is the fallback, never an addition). Frozen
 * per assembly read, so a hand edit is visible to the next request.
 * @param host - The home service whose identity file is read.
 * @returns The identity text, byte-capped.
 */
export function soulSnapshotOf(host: AssistantMemory): string {
  return rootFileSnapshot(host.paths.soulFile, DEFAULT_SOUL, SOUL_BYTE_CAP)
}

/**
 * The home manual that rides in the system prompt: `AGENTS.md` verbatim when present, a
 * freshly rendered manual otherwise — the fallback is always current, so a missing manual
 * can never go stale. Hand edits are the owner's; only the scaffold version marker is the
 * machine's (see `curate`'s drift finding). Since v10 the manual is fully portable: the
 * layout tree roots at a symbolic placeholder and NO machine path rides in the prompt —
 * all home access is tool-mediated, and a prompt-level path both goes stale when a home
 * moves and primes the model to bypass the tools with raw file access (both observed
 * 2026-10-01; the path-priming also degraded skill selection in the behavior eval).
 * @param host - The home service whose manual is read.
 * @returns The manual text, byte-capped.
 */
export function manualSnapshotOf(host: AssistantMemory): string {
  return rootFileSnapshot(host.paths.agentsFile, renderHomeManual(), MANUAL_BYTE_CAP)
}

/**
 * Run the curation check over the home.
 * @param host - The home service whose rooms are read.
 * @param shadowedBy - Learned skill names that lost the registry's name resolution, mapped to
 * the winning provider. The registry only resolves names inside an agent's layer chain, so the
 * agent-plane `assistant_memory` curate action probes it and passes the result in; callers
 * without a registry (tests, host-side maintenance) omit it and get no shadow findings.
 * @returns Findings, per-skill usage lines, and headline counts.
 */
export async function runCuration(host: AssistantMemory, shadowedBy?: Readonly<Record<string, string>>): Promise<CurationBrief> {
  const memories = await host.listMemories()
  const threads = await host.listThreads()
  const knowledge = await host.listKnowledge()
  const skills = await scanLearnedSkills(host.paths.skillsDir)
  const archiveScale = await scanSkillArchiveScale(host.paths.skillsArchiveDir)
  const manualText = await readFile(host.paths.agentsFile, 'utf8').catch(() => undefined)
  const usage = await readSkillUsage(host.paths.skillUsageFile)
  const digest = await digestNow(host)
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
    digestMaxBytes: host.digestMaxBytes,
    digestTruncated: digest.truncated,
    digestOmittedMemories: digest.omittedMemories,
    staleResearchDays: host.staleResearchDays,
    staleSkillDays: host.staleSkillDays,
    retireSkillDays: host.retireSkillDays,
    now: new Date(),
  })
  // Post-write audit findings join the brief: the pure room check and the content audit are
  // two passes over the same home, and the model should read one brief.
  const audit = await auditSkillsRoom(host.paths.skillsDir)
  const pages = curateKnowledge({
    pages: knowledge.entries,
    failures: knowledge.failures,
    now: new Date(),
    staleResearchDays: host.staleResearchDays,
  })
  // The proposal inbox is part of the home's health: an approved proposal waiting to land is
  // a decision made and not executed; an aging proposal is a decision nobody is making.
  const proposals = await host.listProposals()
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
    if (Number.isFinite(age) && age > host.staleResearchDays && (proposal.status === 'proposed' || proposal.status === 'approved')) {
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
