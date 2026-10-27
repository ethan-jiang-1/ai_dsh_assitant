/**
 * Explicit maintenance surfaces of `assistant-data`: audited purge, archive rotation and the
 * shared audit writer. Split from the import/export/status core so the CLI entry stays a router.
 *
 * @module dsh-smart-assistant/cli/assistant-data-maintenance
 */
import { lstat, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { atomicWriteFile } from '../domain/home/atomic-write.ts'
import { isEntryId } from '../domain/home/room.ts'
import { OPERATIONS_ARCHIVE_FILE } from '../domain/operating/archive.ts'
import { appendAuditLine } from './assistant-data-audit.ts'

/** The record kinds an explicit purge can erase. Sessions are not in this list. */
export const PURGE_KINDS = ['memory', 'research', 'knowledge', 'skill', 'proposal', 'ledger'] as const

/** One purgeable record kind. */
export type PurgeKind = (typeof PURGE_KINDS)[number]

/** Arguments for {@link purgeData}. */
export interface DataPurgeOptions {
  readonly assistantDir: string
  /** Required for `kind: 'ledger'`; the separate operating home. */
  readonly operatingDir?: string
  readonly kind: PurgeKind
  readonly id: string
  /** Why this record is being erased; written to the local purge audit. */
  readonly reason: string
  /** Destructive action; the caller must pass true explicitly. */
  readonly confirm: boolean
  /** Clock override for tests. */
  readonly now?: Date
}

/** Result of a purge. */
export interface DataPurgeResult {
  readonly removed: readonly string[]
  readonly audit: string
}

/** Arguments for {@link rotateArchives}. */
export interface ArchiveRotationOptions {
  readonly assistantDir: string
  readonly operatingDir: string
  /** Only surfaces whose mtime is older than this many days are candidates. */
  readonly olderThanDays: number
  /** Move for real; false is a dry run. */
  readonly apply: boolean
}

/** One rotation candidate or completed move. */
export interface ArchiveRotationEntry {
  readonly path: string
  readonly bytes: number
  readonly mtime: string
}

/** Result of a dry-run or applied archive rotation. */
export interface ArchiveRotationResult {
  readonly dryRun: boolean
  readonly candidates: readonly ArchiveRotationEntry[]
  readonly moved: readonly string[]
  readonly audit: string
}

/** Every on-disk location a purge of one record kind may own (active, archive, snapshots). */
function purgeCandidates(root: string, kind: PurgeKind, id: string): string[] {
  switch (kind) {
    case 'memory':
    case 'research':
      return [join(root, kind, `${id}.md`), join(root, kind, 'archive', `${id}.md`)]
    case 'knowledge':
      return [join(root, 'knowledge', `${id}.md`)]
    case 'proposal':
      return [join(root, 'skill-proposals', `${id}.md`), join(root, 'skill-proposals', 'archive', `${id}.md`)]
    case 'ledger':
      return []
    case 'skill':
      return [
        join(root, 'skills', id),
        join(root, 'skills', `${id}.md`),
        join(root, 'skills', 'archive', id),
        join(root, 'skills', 'archive', `${id}.md`),
        join(root, 'skills', 'archive', 'snapshots', id),
      ]
  }
}

/**
 * Erase one room record, its archived copy and (for a skill) its snapshots. This is the explicit
 * erasure path: it requires a reason and `confirm`, writes a local audit line before deleting, and
 * refuses symlinks. It does **not** touch sessions, credentials, ledger history, or client state.
 *
 * @param options - Working folder, record kind/id, reason, and explicit confirmation.
 * @returns Removed paths and the purge audit path.
 * @throws When confirmation/reason/id is missing, nothing exists, or a candidate is a symlink.
 */
export async function purgeData(options: DataPurgeOptions): Promise<DataPurgeResult> {
  const assistantDir = resolve(options.assistantDir)
  if (options.confirm !== true) throw new Error('assistant-data: purge requires explicit confirmation (--yes)')
  const reason = options.reason.trim()
  if (reason === '') throw new Error('assistant-data: purge requires a reason')
  if (!PURGE_KINDS.includes(options.kind)) throw new Error(`assistant-data: unknown purge kind ${JSON.stringify(options.kind)}`)
  if (!isEntryId(options.id)) throw new Error(`assistant-data: "${options.id}" is not a safe record id`)
  const rootInfo = await lstat(assistantDir).catch(() => undefined)
  if (rootInfo === undefined) throw new Error(`assistant-data: working folder not found: ${assistantDir}`)
  if (rootInfo.isSymbolicLink()) throw new Error(`assistant-data: working folder is a symbolic link: ${assistantDir}`)
  if (!rootInfo.isDirectory()) throw new Error(`assistant-data: working folder is not a directory: ${assistantDir}`)

  const audit = join(assistantDir, 'audit', 'purges.jsonl')
  const at = (options.now ?? new Date()).toISOString()
  if (options.kind === 'ledger') {
    const operatingDir = options.operatingDir === undefined ? undefined : resolve(options.operatingDir)
    if (operatingDir === undefined) throw new Error('assistant-data: purge --kind ledger requires --operating <dir>')
    const ledgerPath = join(operatingDir, 'ledger.json')
    const archivePath = join(operatingDir, OPERATIONS_ARCHIVE_FILE)
    const ledgerText = await readFile(ledgerPath, 'utf8').catch(() => undefined)
    const archiveText = await readFile(archivePath, 'utf8').catch(() => undefined)
    const present = (ledgerText !== undefined && ledgerText.includes(`"${options.id}"`))
      || (archiveText !== undefined && archiveText.includes(`"${options.id}"`))
    if (!present) throw new Error(`assistant-data: nothing to purge for ledger:${options.id}`)
    await appendAuditLine(audit, { at, kind: 'ledger', id: options.id, reason, paths: [ledgerPath, archivePath], status: 'requested' })
    const removed: string[] = []
    try {
      if (ledgerText !== undefined) {
        const state = JSON.parse(ledgerText) as { operations?: Record<string, unknown> }
        if (state.operations !== undefined && Object.hasOwn(state.operations, options.id)) {
          delete state.operations[options.id]
          await atomicWriteFile(ledgerPath, `${JSON.stringify(state)}\n`)
          removed.push(ledgerPath)
        }
      }
      if (archiveText !== undefined) {
        const kept = archiveText.split('\n').filter(line => line.trim() !== '' && !line.includes(`"operationId":"${options.id}"`))
        if (kept.length !== archiveText.split('\n').filter(line => line.trim() !== '').length) {
          await atomicWriteFile(archivePath, kept.length === 0 ? '' : `${kept.join('\n')}\n`)
          removed.push(archivePath)
        }
      }
    } catch (error) {
      await appendAuditLine(audit, { at, kind: 'ledger', id: options.id, status: 'failed', error: error instanceof Error ? error.message : String(error) })
      throw error
    }
    await appendAuditLine(audit, { at, kind: 'ledger', id: options.id, status: 'deleted', removed })
    return { removed, audit }
  }
  const candidates = purgeCandidates(assistantDir, options.kind, options.id)
  const existing: string[] = []
  for (const path of candidates) {
    const info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
    if (info === undefined) continue
    if (info.isSymbolicLink()) throw new Error(`assistant-data: refusing to purge a symbolic link: ${path}`)
    existing.push(path)
  }
  if (existing.length === 0) {
    throw new Error(`assistant-data: nothing to purge for ${options.kind}:${options.id}`)
  }

  await appendAuditLine(audit, { at, kind: options.kind, id: options.id, reason, paths: existing, status: 'requested' })
  const removed: string[] = []
  try {
    // Deepest first, so a bundle and its snapshots both disappear deterministically.
    for (const path of [...existing].sort((left, right) => right.length - left.length)) {
      await rm(path, { recursive: true, force: true })
      removed.push(path)
    }
  } catch (error) {
    await appendAuditLine(audit, {
      at,
      kind: options.kind,
      id: options.id,
      reason,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
  await appendAuditLine(audit, { at, kind: options.kind, id: options.id, status: 'deleted', removed })
  return { removed, audit }
}

/**
 * Rotate whole closed surfaces out of the working folder: old approvals, room archives and the
 * operations archive. This is deliberately coarse and explicit: default is a dry run, `apply`
 * moves the path into `<root>/archive-maintenance/<stamp>/`, and one audit line records it.
 * It does not filter JSONL records by timestamp; an active-format file that is still current is
 * not a candidate.
 *
 * @param options - Directories, age threshold and apply flag.
 * @returns Candidates, moved paths and the audit path.
 * @throws When the threshold is not a positive whole number of days.
 */
export async function rotateArchives(options: ArchiveRotationOptions): Promise<ArchiveRotationResult> {
  if (!Number.isSafeInteger(options.olderThanDays) || options.olderThanDays <= 0) {
    throw new Error('assistant-data rotate: --older-than must be a positive whole number of days')
  }
  const assistantDir = resolve(options.assistantDir)
  const operatingDir = resolve(options.operatingDir)
  const cutoff = Date.now() - options.olderThanDays * 24 * 60 * 60 * 1000
  const surfaces: { readonly root: string, readonly relative: string }[] = [
    { root: assistantDir, relative: 'audit/approvals.jsonl' },
    { root: assistantDir, relative: 'memory/archive' },
    { root: assistantDir, relative: 'research/archive' },
    { root: assistantDir, relative: 'skills/archive' },
    { root: operatingDir, relative: OPERATIONS_ARCHIVE_FILE },
  ]
  const candidates: ArchiveRotationEntry[] = []
  for (const surface of surfaces) {
    const path = join(surface.root, surface.relative)
    const info = await lstat(path).catch(() => undefined)
    if (info === undefined || info.isSymbolicLink() || info.mtimeMs >= cutoff) continue
    candidates.push({ path, bytes: info.size, mtime: new Date(info.mtimeMs).toISOString() })
  }
  const stamp = new Date().toISOString().replace(/[:.]/gu, '-')
  const moved: string[] = []
  if (options.apply) {
    for (const candidate of candidates) {
      const root = candidate.path.startsWith(operatingDir) ? operatingDir : assistantDir
      const rel = relative(root, candidate.path)
      const destination = join(root, 'archive-maintenance', stamp, rel)
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
      await rename(candidate.path, destination)
      moved.push(candidate.path)
    }
  }
  const audit = join(assistantDir, 'audit', 'maintenance.jsonl')
  if (options.apply) {
    await appendAuditLine(audit, { at: new Date().toISOString(), action: 'rotate', moved: moved.length, candidates: candidates.map(entry => entry.path) })
  }
  return { dryRun: !options.apply, candidates, moved, audit }
}
