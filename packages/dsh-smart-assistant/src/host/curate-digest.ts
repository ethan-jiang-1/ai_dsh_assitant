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
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AssistantMemory } from './service.ts'
import { renderDigest, type DigestResult } from '../domain/home/digest.ts'
import { compareFindings, curateHome, type CurationBrief } from '../domain/home/health.ts'
import { HOME_MANUAL_VERSION, HOME_STATUS_BLURB, parseManualVersion, renderHomeManual } from '../domain/home/home-map.ts'
import { DEFAULT_SOUL } from '../domain/home/soul.ts'
import { curateKnowledge } from '../domain/knowledge/health.ts'
import { scanLearnedSkills, scanSkillArchiveScale } from '../domain/skills/scan.ts'
import { auditSkillsRoom, credentialShapeLabels } from '../domain/skills/audit.ts'
import { proposalFindings } from '../domain/skills/proposal.ts'
import { readSkillUsage } from '../domain/skills/usage.ts'

/** Byte cap for the identity file riding in the prompt. */
const SOUL_BYTE_CAP = 4096

/**
 * Byte cap for the manual riding in the prompt.
 *
 * The generated manual must fit this budget: a cap smaller than the render silently cuts the tail
 * from every request (2026-10-28: 11,033-byte render against 8,192 cut the collaboration
 * boundaries and the layout). `tests/host/root-files.spec.ts` holds the invariant, and `curate`
 * reports an owner-grown file that outgrows it.
 */
export const MANUAL_BYTE_CAP = 14_336

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
  // Byte-accurate cut (BUG-006 F5, 2026-10-07): `slice(0, cap)` counts UTF-16 code units, so a
  // CJK soul of 9000 bytes against a 4096 cap came back whole with a lying marker. The subarray
  // form is the same one ingest.ts uses; a cut landing mid-character costs at most one
  // replacement character, never more than the cap.
  const head = Buffer.from(trimmed, 'utf8').subarray(0, cap).toString('utf8')
  return `${head}\n[… truncated ${String(bytes - cap)} bytes; edit the file to be shorter]`
}

/**
 * A cheap identity of the active room files the digest is rendered from. The home is user-editable:
 * a file changed outside the tools must invalidate the cached desktop on the next prompt, or the
 * model keeps reading a stale view. Archive files are excluded because the digest never lists them.
 * @param host - The home service whose room files are fingerprinted.
 * @returns A stable string that changes on a file add/remove/size/mtime change.
 */
function digestFingerprintOf(host: AssistantMemory): string {
  const parts: string[] = []
  for (const directory of [host.paths.memoryDir, host.paths.researchDir, host.paths.knowledgeDir]) {
    let names: string[]
    try {
      names = readdirSync(directory).filter(name => name.endsWith('.md')).sort()
    } catch {
      continue
    }
    for (const name of names) {
      try {
        const info = statSync(join(directory, name))
        parts.push(`${directory}/${name}:${String(info.size)}:${String(info.mtimeMs)}`)
      } catch { /* a file removed between readdir and stat is simply absent from the next render */ }
    }
  }
  return parts.join('|')
}

/**
 * Invalidate the digest cache after a write and refresh it in the background, so the next request
 * sees the home as it is now rather than as it was.
 * @param host - The home service whose digest cache is invalidated.
 */
export function touchDigest(host: AssistantMemory): void {
  host.digestCache = undefined
  host.digestFingerprint = undefined
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
  host.digestFingerprint = digestFingerprintOf(host)
  return result
}

/**
 * Read the digest without awaiting. Prompt sections assemble synchronously, so this returns the
 * cached rendering and refreshes in the background when the cache is cold or invalidated.
 * @param host - The home service whose digest cache is read.
 * @returns The cached digest text, or the status blurb while the first rendering is in flight.
 */
export function digestSnapshotNow(host: AssistantMemory): string {
  // A hand edit is invisible to `touchDigest`; the fingerprint is the cheap bridge. The stale
  // cache is still returned for the request that notices the change while the async refresh runs;
  // the next request sees the fresh render.
  if (host.digestCache !== undefined && host.digestFingerprint === digestFingerprintOf(host)) {
    return host.digestCache.text
  }
  void digestNow(host).catch((error: unknown) => {
    host.ctx.logger.warn(`assistant home digest refresh failed: ${String(error)}`)
  })
  return host.digestCache?.text ?? HOME_STATUS_BLURB
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
  const text = rootFileSnapshot(host.paths.agentsFile, renderHomeManual(), MANUAL_BYTE_CAP)
  const version = parseManualVersion(text)
  // A generated manual older than this build may not be reproducible by exact text replacement.
  // Say so in the prompt: a model reading stale operating rules is worse than a visible warning.
  // A hand-written manual (v0) is the owner's and is not warned.
  if (version === 0 || version >= HOME_MANUAL_VERSION) return text
  const warning = `\n\n[This manual is generation v${String(version)}; the current scaffold is v${String(HOME_MANUAL_VERSION)}. Treat older instructions as possibly stale; do not rewrite the file yourself.]`
  const allowance = MANUAL_BYTE_CAP - Buffer.byteLength(warning, 'utf8')
  const head = Buffer.from(text, 'utf8').subarray(0, Math.max(0, allowance)).toString('utf8')
  return `${head}${warning}`
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
  const soulText = await readFile(host.paths.soulFile, 'utf8').catch(() => undefined)
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
  const now = new Date()
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
    ...(manualText !== undefined
      ? {
          manualVersion: parseManualVersion(manualText),
          manualBytes: Buffer.byteLength(manualText.trim(), 'utf8'),
          manualMaxBytes: MANUAL_BYTE_CAP,
        }
      : {}),
    ...(soulText !== undefined
      ? {
          soulBytes: Buffer.byteLength(soulText.trim(), 'utf8'),
          soulMaxBytes: SOUL_BYTE_CAP,
        }
      : {}),
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
    now,
  })
  // Post-write audit findings join the brief: the pure room check and the content audit are
  // two passes over the same home, and the model should read one brief.
  const audit = await auditSkillsRoom(host.paths.skillsDir)
  const knownSourceIds = new Set<string>([
    ...memories.entries.map(record => `memory:${record.id}`),
    ...memories.archived.map(record => `memory:${record.id}`),
    ...threads.entries.map(thread => `research:${thread.id}`),
    ...threads.archived.map(thread => `research:${thread.id}`),
  ])
  const pages = curateKnowledge({
    pages: knowledge.entries,
    failures: knowledge.failures,
    now: new Date(),
    staleResearchDays: host.staleResearchDays,
    knownSourceIds,
  })
  // The proposal inbox is part of the home's health: the proposal-* finding rules live with
  // the rest of the inbox's vocabulary (domain/skills/proposal.ts) — this module only feeds
  // them the room and the thresholds.
  const proposals = await host.listProposals()
  const inbox = proposalFindings(proposals.entries, now, host.staleResearchDays)
  const credentials = [...memories.entries, ...memories.archived].flatMap(record => credentialShapeLabels(record.text).map(label => ({
    code: 'credential-shaped-text' as const,
    severity: 'warn' as const,
    message: `memory "${record.id}" carries what looks like ${label} — strip it and rotate the credential if it was real; memory enters the prompt and backups`,
    refs: [record.id],
  })))
  return {
    ...brief,
    findings: [...brief.findings, ...audit, ...pages, ...inbox, ...credentials].sort(compareFindings),
  }
}
