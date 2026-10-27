/**
 * Portable user-data bundle implementation: export/import, the manifest, conservative merge,
 * manual refresh, and the proposal-inbox rotation. The CLI entry re-exports this module; the
 * module itself imports only Node built-ins plus package-internal pure modules.
 *
 * @module dsh-smart-assistant/cli/assistant-data-bundle
 */

import { existsSync } from 'node:fs'
import { chmod, copyFile, cp, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { atomicWriteFile } from '../domain/home/atomic-write.ts'
import { parseFrontmatterDocument } from '../domain/home/frontmatter.ts'
import { appendAuditLine } from './assistant-data-audit.ts'
import { renderHomeManual } from '../domain/home/home-map.ts'
import { isEntryId } from '../domain/home/room.ts'
import {
  DATA_MANIFEST_FILE,
  DATA_SCHEMA_VERSION,
  MAX_IMPORT_BYTES,
  type DataExportOptions,
  type DataExportResult,
  type DataImportOptions,
  type DataImportResult,
  type DataManifest,
  type DataMergeEntry,
  type DataMergeOptions,
  type DataMergeResult,
  type ManualRefreshOptions,
  type ManualRefreshResult,
  type ProposalArchiveOptions,
  type ProposalArchiveResult,
} from './assistant-data-types.ts'

async function countTree(dir: string): Promise<{ files: number, bytes: number }> {
  if (!existsSync(dir)) return { files: 0, bytes: 0 }
  let files = 0
  let bytes = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await countTree(path)
      files += nested.files
      bytes += nested.bytes
    } else {
      const info = await stat(path)
      files += 1
      bytes += info.size
    }
  }
  return { files, bytes }
}

/** True when `child` is `parent` or lies below it. Both paths are expected to be absolute. */
function isInside(parent: string, child: string): boolean {
  const nested = relative(parent, child)
  return nested === '' || (!nested.startsWith('..') && !isAbsolute(nested))
}

/** Parse the scaffold marker from a working-folder manual, without importing the domain. */
function manualVersionOf(text: string): number | undefined {
  const match = /^<!--\s*home-manual v(\d+)\s*-->/u.exec(text.trimStart())
  return match?.[1] === undefined ? undefined : Number(match[1])
}

/** Coordination files, never user data, and never valid in a portable bundle. */
function isTransient(name: string): boolean {
  return name === 'writer.lock' || name.endsWith('.tmp') || name.endsWith('.takeover')
}

/**
 * Require an absent, empty directory destination. A symlink or a regular file is refused rather
 * than replaced: both are more likely a mistaken path than an empty backup target.
 */
async function assertEmptyDestination(path: string, label: string): Promise<void> {
  if (!existsSync(path)) return
  const info = await lstat(path)
  if (info.isSymbolicLink()) throw new Error(`assistant-data: ${label} is a symbolic link: ${path}`)
  if (!info.isDirectory()) throw new Error(`assistant-data: ${label} is not a directory: ${path}`)
  if ((await readdir(path)).length > 0) throw new Error(`assistant-data: ${label} is not empty: ${path}`)
}

/**
 * Refuse a tree that cannot be represented as plain bundle data. The root itself is checked too:
 * copying a symlinked working folder would store a link whose target is not in the bundle.
 */
async function assertPlainTree(root: string, label: string): Promise<void> {
  const rootInfo = await lstat(root)
  if (rootInfo.isSymbolicLink()) {
    throw new Error(`assistant-data: ${label} is a symbolic link: ${root}; backups must contain regular files and directories only`)
  }
  if (!rootInfo.isDirectory()) {
    throw new Error(`assistant-data: ${label} is not a directory: ${root}`)
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    const info = await lstat(path)
    if (info.isSymbolicLink()) {
      throw new Error(`assistant-data: ${label} contains a symbolic link: ${path}; backups must contain regular files and directories only`)
    }
    if (info.isDirectory()) await assertPlainTree(path, label)
    else if (!info.isFile()) {
      throw new Error(`assistant-data: ${label} contains a non-regular file: ${path}`)
    }
  }
}

/** Remove transient coordination files a legacy bundle may still carry (recursively). */
async function dropTransient(root: string): Promise<void> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (isTransient(entry.name)) {
      await rm(path, { recursive: true, force: true })
    } else if (entry.isDirectory()) {
      await dropTransient(path)
    }
  }
}

/**
 * Export the two plugin-owned directories into a portable bundle with a schema manifest.
 *
 * @param options - Source directories and an absent/empty destination.
 * @returns The written manifest and destination.
 * @throws When the working folder is missing, the destination is non-empty, or copying fails.
 */
export async function exportData(options: DataExportOptions): Promise<DataExportResult> {
  const assistantDir = resolve(options.assistantDir)
  const operatingDir = resolve(options.operatingDir)
  const outDir = resolve(options.outDir)
  if (!existsSync(assistantDir)) throw new Error(`assistant-data: working folder not found: ${assistantDir}`)
  // A destination below a source would copy the growing bundle into itself; a destination above
  // the sources would swallow them. Refuse both before any filesystem write.
  if (isInside(assistantDir, outDir) || isInside(operatingDir, outDir)
    || isInside(outDir, assistantDir) || isInside(outDir, operatingDir)) {
    throw new Error(`assistant-data: export destination must not be inside the working folder or ledger directories: ${outDir}`)
  }
  await assertEmptyDestination(outDir, 'export destination')
  await assertPlainTree(assistantDir, 'working folder')
  if (existsSync(operatingDir)) await assertPlainTree(operatingDir, 'ledger')

  // Copy into a sibling first, then rename. A failed copy (permission, disk, unreadable file)
  // therefore leaves no destination behind, and the next export is not blocked by a half bundle.
  const suffix = `${process.pid.toString(36)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const tempDir = join(dirname(outDir), `.${basename(outDir)}.export-${suffix}`)
  let manifest: DataManifest
  try {
    await mkdir(tempDir, { recursive: true, mode: 0o700 })
    const keep = (source: string): boolean => !isTransient(basename(source))
    await cp(assistantDir, join(tempDir, 'assistant'), { recursive: true, filter: keep })
    if (existsSync(operatingDir)) {
      await cp(operatingDir, join(tempDir, 'assistant-operating'), { recursive: true, filter: keep })
    } else {
      await mkdir(join(tempDir, 'assistant-operating'), { recursive: true, mode: 0o700 })
    }

    const assistant = await countTree(join(tempDir, 'assistant'))
    const operating = await countTree(join(tempDir, 'assistant-operating'))
    manifest = {
      schemaVersion: DATA_SCHEMA_VERSION,
      createdAt: (options.now ?? new Date()).toISOString(),
      includes: ['assistant', 'assistant-operating'],
      files: assistant.files + operating.files,
      bytes: assistant.bytes + operating.bytes,
    }
    await writeFile(join(tempDir, DATA_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })

    if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true })
    await rename(tempDir, outDir)
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw error
  }
  return { manifest, outDir }
}

/** Read and validate a bundle manifest. */
export async function readDataManifest(inDir: string): Promise<DataManifest> {
  const path = join(resolve(inDir), DATA_MANIFEST_FILE)
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new Error(`assistant-data: cannot read ${DATA_MANIFEST_FILE}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('assistant-data: manifest is not an object')
  }
  const record = parsed as Record<string, unknown>
  if (record.schemaVersion !== DATA_SCHEMA_VERSION) {
    throw new Error(`assistant-data: unsupported schemaVersion ${JSON.stringify(record.schemaVersion)}; this build imports ${DATA_SCHEMA_VERSION}`)
  }
  if (typeof record.createdAt !== 'string' || Number.isNaN(Date.parse(record.createdAt))) {
    throw new Error('assistant-data: manifest has no valid createdAt')
  }
  return parsed as DataManifest
}

async function moveInto(from: string, to: string): Promise<void> {
  if (existsSync(to)) await rm(to, { recursive: true, force: true })
  await rename(from, to)
}

/** Count one owned directory and read the two facts an operator asks first. */
/**
 * Rotate resolved proposals (`landed` / `rejected`) from the active inbox into
 * `skill-proposals/archive/`. Proposed and approved proposals stay: the inbox is still the
 * decision queue. A re-proposal after rotation continues its revision history because
 * `proposeSkill` also reads the archived copy.
 *
 * @param options - Working folder and explicit confirmation.
 * @returns Moved and kept proposal names.
 * @throws When confirmation is missing or the proposals directory is a symlink/not a directory.
 */
export async function archiveResolvedProposals(options: ProposalArchiveOptions): Promise<ProposalArchiveResult> {
  if (options.confirm !== true) throw new Error('assistant-data: archive-proposals requires explicit confirmation (--yes)')
  const assistantDir = resolve(options.assistantDir)
  const inbox = join(assistantDir, 'skill-proposals')
  const rootInfo = await lstat(assistantDir).catch(() => undefined)
  if (rootInfo === undefined) throw new Error(`assistant-data: working folder not found: ${assistantDir}`)
  if (rootInfo.isSymbolicLink()) throw new Error(`assistant-data: working folder is a symbolic link: ${assistantDir}`)
  if (!rootInfo.isDirectory()) throw new Error(`assistant-data: working folder is not a directory: ${assistantDir}`)
  const inboxInfo = await lstat(inbox).catch(() => undefined)
  if (inboxInfo === undefined) return { moved: [], kept: [] }
  if (inboxInfo.isSymbolicLink() || !inboxInfo.isDirectory()) {
    throw new Error(`assistant-data: proposal inbox is not a plain directory: ${inbox}`)
  }

  const moved: string[] = []
  const kept: string[] = []
  for (const entry of await readdir(inbox, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const id = entry.name.slice(0, -3)
    if (!isEntryId(id)) {
      kept.push(id)
      continue
    }
    const document = parseFrontmatterDocument(await readFile(join(inbox, entry.name), 'utf8'))
    const status = document?.data.status
    if (status !== 'landed' && status !== 'rejected') {
      kept.push(id)
      continue
    }
    const archive = join(inbox, 'archive')
    await mkdir(archive, { recursive: true, mode: 0o700 })
    const target = join(archive, entry.name)
    if (existsSync(target)) await rm(target, { force: true })
    await rename(join(inbox, entry.name), target)
    moved.push(id)
  }
  return { moved, kept }
}

/**
 * Merge a bundle into a live home without deleting target-only files. The default is a dry run
 * and keeps the target on every conflict; `prefer: 'incoming'` replaces only working-folder
 * conflicts after copying the old file to a `.merge-backup-*` sibling. Ledger conflicts are never
 * overwritten here — replacing a ledger wholesale is `import --replace`, not a merge.
 *
 * @param options - Bundle, destinations and policy.
 * @returns Decisions, backups and the audit path.
 * @throws When the bundle is invalid, oversized, nested, or a ledger writer is live.
 */
export async function mergeData(options: DataMergeOptions): Promise<DataMergeResult> {
  const assistantDir = resolve(options.assistantDir)
  const operatingDir = resolve(options.operatingDir)
  if (assistantDir === operatingDir) throw new Error('assistant-data: the working folder and the ledger must be different directories')
  if (isInside(assistantDir, operatingDir) || isInside(operatingDir, assistantDir)) {
    throw new Error('assistant-data: the working folder and the ledger must not nest inside each other')
  }
  const manifest = await readDataManifest(options.inDir)
  if (!manifest.includes.includes('assistant') || !manifest.includes.includes('assistant-operating')) {
    throw new Error('assistant-data: manifest does not declare both directories')
  }
  const sourceAssistant = join(options.inDir, 'assistant')
  const sourceOperating = join(options.inDir, 'assistant-operating')
  await assertPlainTree(sourceAssistant, 'bundle working folder')
  await assertPlainTree(sourceOperating, 'bundle ledger')
  const sourceCount = await countTree(sourceAssistant)
  const sourceBytes = sourceCount.bytes + (await countTree(sourceOperating)).bytes
  if (options.maxBytes !== undefined && (!Number.isSafeInteger(options.maxBytes) || options.maxBytes <= 0)) {
    throw new Error('assistant-data: maxBytes must be a positive safe integer')
  }
  const maxBytes = options.maxBytes ?? MAX_IMPORT_BYTES
  if (sourceBytes > maxBytes) throw new Error(`assistant-data: bundle is ${String(sourceBytes)} byte(s), above the ${String(maxBytes)}-byte merge cap`)
  if (existsSync(join(operatingDir, 'writer.lock'))) {
    throw new Error(`assistant-data: a writer.lock exists at ${join(operatingDir, 'writer.lock')}; stop the instance before merging`)
  }
  const apply = options.apply === true
  const prefer = options.prefer ?? 'current'
  const stamp = new Date().toISOString().replace(/[:.]/gu, '-')
  const added: DataMergeEntry[] = []
  const conflicts: DataMergeEntry[] = []
  const same: DataMergeEntry[] = []
  const backups: string[] = []

  const walk = async (sourceRoot: string, targetRoot: string, allowIncoming: boolean): Promise<void> => {
    if (!existsSync(sourceRoot)) return
    for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
      const source = join(sourceRoot, entry.name)
      const target = join(targetRoot, entry.name)
      if (entry.isDirectory()) {
        await walk(source, target, allowIncoming)
        continue
      }
      if (!entry.isFile()) continue
      const rel = relative(sourceRoot, source)
      if (!existsSync(target)) {
        added.push({ path: rel, kind: 'add' })
        if (apply) {
          await mkdir(dirname(target), { recursive: true, mode: 0o700 })
          await copyFile(source, target)
          await chmod(target, 0o600)
        }
        continue
      }
      const [left, right] = await Promise.all([readFile(source), readFile(target)])
      if (left.equals(right)) {
        same.push({ path: rel, kind: 'same' })
        continue
      }
      conflicts.push({ path: rel, kind: 'conflict' })
      if (apply && allowIncoming && prefer === 'incoming') {
        const backup = `${target}.merge-backup-${stamp}`
        await copyFile(target, backup)
        backups.push(backup)
        await copyFile(source, target)
        await chmod(target, 0o600)
      }
    }
  }

  await walk(sourceAssistant, assistantDir, true)
  await walk(sourceOperating, operatingDir, false)
  const audit = join(assistantDir, 'audit', 'merge.jsonl')
  if (apply) {
    await appendAuditLine(audit, {
      at: new Date().toISOString(),
      action: 'merge',
      added: added.length,
      conflicts: conflicts.length,
      prefer,
      backups: backups.length,
    })
  }
  return { dryRun: !apply, added, conflicts, same, backups, audit }
}

/**
 * Regenerate the working-folder manual from the current build. The old file is copied to
 * `AGENTS.md.bak-<stamp>` first, so a hand-edited manual is recoverable; the caller must confirm.
 * This is the escape hatch for a generated manual older than the migration table: instead of
 * guessing its text, replace it with the current render after a backup.
 *
 * @param options - Working folder and explicit confirmation.
 * @returns The written manual, its backup (when one existed), and the previous generation.
 * @throws When confirmation is missing, the folder is absent/a symlink, or the manual is a symlink.
 */
export async function refreshManual(options: ManualRefreshOptions): Promise<ManualRefreshResult> {
  if (options.confirm !== true) throw new Error('assistant-data: refresh-manual requires explicit confirmation (--yes)')
  const assistantDir = resolve(options.assistantDir)
  const rootInfo = await lstat(assistantDir).catch(() => undefined)
  if (rootInfo === undefined) throw new Error(`assistant-data: working folder not found: ${assistantDir}`)
  if (rootInfo.isSymbolicLink()) throw new Error(`assistant-data: working folder is a symbolic link: ${assistantDir}`)
  if (!rootInfo.isDirectory()) throw new Error(`assistant-data: working folder is not a directory: ${assistantDir}`)
  const path = join(assistantDir, 'AGENTS.md')
  const existing = await lstat(path).catch(() => undefined)
  if (existing === undefined) {
    await atomicWriteFile(path, renderHomeManual())
    return { path }
  }
  if (existing.isSymbolicLink()) throw new Error(`assistant-data: refusing to refresh a symlinked manual: ${path}`)
  if (!existing.isFile()) throw new Error(`assistant-data: manual is not a regular file: ${path}`)
  const previous = await readFile(path, 'utf8')
  const previousVersion = manualVersionOf(previous)
  const stamp = (options.now ?? new Date()).toISOString().replace(/[:.]/g, '-')
  const backup = join(assistantDir, `AGENTS.md.bak-${stamp}-${process.pid.toString(36)}`)
  await copyFile(path, backup)
  await chmod(backup, 0o600)
  await atomicWriteFile(path, renderHomeManual())
  return { path, backup, ...(previousVersion === undefined ? {} : { previousVersion }) }
}

/**
 * Import a bundle into absent/empty plugin directories. Both directories are copied to siblings
 * first and renamed into place; if the second rename fails, the first destination is removed, so
 * a failure leaves both destinations absent (the pre-import empty state), not half-imported.
 *
 * @param options - Bundle directory and absent/empty destinations.
 * @returns File counts written per directory.
 * @throws When the manifest is unsupported, the bundle is incomplete, or a destination is non-empty.
 */
export async function importData(options: DataImportOptions): Promise<DataImportResult> {
  const inDir = resolve(options.inDir)
  const assistantDir = resolve(options.assistantDir)
  const operatingDir = resolve(options.operatingDir)
  if (assistantDir === operatingDir) {
    throw new Error('assistant-data: the working folder and the ledger must be different directories')
  }
  if (isInside(assistantDir, operatingDir) || isInside(operatingDir, assistantDir)) {
    throw new Error('assistant-data: the working folder and the ledger must not nest inside each other')
  }
  const manifest = await readDataManifest(inDir)
  if (!manifest.includes.includes('assistant') || !manifest.includes.includes('assistant-operating')) {
    throw new Error('assistant-data: manifest does not declare both directories')
  }
  const sourceAssistant = join(inDir, 'assistant')
  const sourceOperating = join(inDir, 'assistant-operating')
  if (!existsSync(sourceAssistant) || !existsSync(sourceOperating)) {
    throw new Error('assistant-data: bundle is missing assistant/ or assistant-operating/')
  }
  await assertPlainTree(sourceAssistant, 'bundle working folder')
  await assertPlainTree(sourceOperating, 'bundle ledger')
  // Manifest counts are the cheap integrity check a truncated copy fails: a bundle can lose a
  // file or a tail without the manifest disappearing. Extra files are tolerated (a legacy bundle
  // may still carry the writer lock); fewer files or fewer bytes are not.
  const sourceAssistantCount = await countTree(sourceAssistant)
  const sourceOperatingCount = await countTree(sourceOperating)
  const sourceFiles = sourceAssistantCount.files + sourceOperatingCount.files
  const sourceBytes = sourceAssistantCount.bytes + sourceOperatingCount.bytes
  if (sourceFiles < manifest.files) {
    throw new Error(`assistant-data: bundle is incomplete: manifest declares ${String(manifest.files)} file(s), found ${String(sourceFiles)}`)
  }
  if (sourceBytes < manifest.bytes) {
    throw new Error(`assistant-data: bundle is truncated: manifest declares ${String(manifest.bytes)} byte(s), found ${String(sourceBytes)}`)
  }
  if (options.maxBytes !== undefined && (!Number.isSafeInteger(options.maxBytes) || options.maxBytes <= 0)) {
    throw new Error('assistant-data: maxBytes must be a positive safe integer')
  }
  const maxBytes = options.maxBytes ?? MAX_IMPORT_BYTES
  if (sourceBytes > maxBytes) {
    throw new Error(`assistant-data: bundle is ${String(sourceBytes)} byte(s), above the ${String(maxBytes)}-byte import cap; raise --max-bytes only after inspecting deliverables`)
  }
  if (existsSync(join(operatingDir, 'writer.lock'))) {
    throw new Error(`assistant-data: a writer.lock exists at ${join(operatingDir, 'writer.lock')}; stop the instance before importing`)
  }

  if (options.dryRun === true) {
    // Same validation as a real import, but only report. A non-empty target still needs
    // `replace`; the caller sees the exact directories that would be moved aside.
    const wouldStash: string[] = []
    for (const path of [assistantDir, operatingDir]) {
      if (!existsSync(path)) continue
      const info = await lstat(path)
      if (info.isSymbolicLink()) throw new Error(`assistant-data: import destination is a symbolic link: ${path}`)
      if (!info.isDirectory()) throw new Error(`assistant-data: import destination is not a directory: ${path}`)
      if ((await readdir(path)).length === 0) continue
      if (options.replace !== true) throw new Error(`assistant-data: import destination is not empty: ${path}`)
      wouldStash.push(path)
    }
    const added: string[] = []
    const replaced: string[] = []
    const removed: string[] = []
    const compare = async (sourceRoot: string, targetRoot: string): Promise<void> => {
      if (existsSync(sourceRoot)) {
        for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
          const source = join(sourceRoot, entry.name)
          const target = join(targetRoot, entry.name)
          if (entry.isDirectory()) {
            await compare(source, target)
            continue
          }
          if (!entry.isFile()) continue
          const rel = relative(sourceRoot, source)
          if (!existsSync(target)) added.push(rel)
          else if (!(await readFile(source)).equals(await readFile(target))) replaced.push(rel)
        }
      }
      if (existsSync(targetRoot)) {
        for (const entry of await readdir(targetRoot, { withFileTypes: true })) {
          const target = join(targetRoot, entry.name)
          const source = join(sourceRoot, entry.name)
          if (entry.isDirectory()) {
            await compare(source, target)
            continue
          }
          if (entry.isFile() && !existsSync(source)) removed.push(relative(targetRoot, target))
        }
      }
    }
    await compare(sourceAssistant, assistantDir)
    await compare(sourceOperating, operatingDir)
    return {
      assistantFiles: sourceAssistantCount.files,
      operatingFiles: sourceOperatingCount.files,
      backups: [],
      dryRun: true,
      wouldStash,
      preview: { added, replaced, removed },
    }
  }

  const suffix = `${process.pid.toString(36)}-${Date.now().toString(36)}`
  // `replace` is the normal restore path: a first launch has already scaffolded both directories.
  // Stash non-empty targets beside themselves rather than deleting anything the owner may still
  // need; a failed import restores the stash before rethrowing.
  const stashed: { readonly path: string, readonly backup: string }[] = []
  const stash = async (path: string, label: string): Promise<void> => {
    if (!existsSync(path)) return
    const info = await lstat(path)
    if (info.isSymbolicLink()) throw new Error(`assistant-data: ${label} is a symbolic link: ${path}`)
    if (!info.isDirectory()) throw new Error(`assistant-data: ${label} is not a directory: ${path}`)
    if ((await readdir(path)).length === 0) return
    const backup = `${path}.pre-import-${suffix}`
    await rename(path, backup)
    stashed.push({ path, backup })
  }
  const restoreStash = async (): Promise<void> => {
    for (const entry of [...stashed].reverse()) {
      await rm(entry.path, { recursive: true, force: true })
      await rename(entry.backup, entry.path)
    }
  }
  if (options.replace === true) {
    try {
      await stash(assistantDir, 'import destination')
      await stash(operatingDir, 'import destination')
    } catch (error) {
      await restoreStash()
      throw error
    }
  } else {
    await assertEmptyDestination(assistantDir, 'import destination')
    await assertEmptyDestination(operatingDir, 'import destination')
  }

  const tempAssistant = join(dirname(assistantDir), `.assistant-import-${suffix}`)
  const tempOperating = join(dirname(operatingDir), `.assistant-operating-import-${suffix}`)
  await mkdir(dirname(assistantDir), { recursive: true })
  await mkdir(dirname(operatingDir), { recursive: true })
  let movedAssistant = false
  let movedOperating = false
  try {
    await cp(sourceAssistant, tempAssistant, { recursive: true })
    await cp(sourceOperating, tempOperating, { recursive: true })
    // An older bundle (or a hand-made one) may still carry the writer claim. Planting it would
    // make the restored ledger refuse writes until a person moved the lock; strip it here.
    await dropTransient(tempAssistant)
    await dropTransient(tempOperating)
    await moveInto(tempAssistant, assistantDir)
    movedAssistant = true
    await moveInto(tempOperating, operatingDir)
    movedOperating = true
  } catch (error) {
    await rm(tempAssistant, { recursive: true, force: true })
    await rm(tempOperating, { recursive: true, force: true })
    // Two directory renames are not one atomic operation. If the second fails, undo the first:
    // the destinations are absent (or restored) rather than a working folder without its ledger.
    if (movedOperating) await rm(operatingDir, { recursive: true, force: true })
    if (movedAssistant) await rm(assistantDir, { recursive: true, force: true })
    await restoreStash()
    throw error
  }

  const assistant = await countTree(assistantDir)
  const operating = await countTree(operatingDir)
  return {
    assistantFiles: assistant.files,
    operatingFiles: operating.files,
    backups: stashed.map(entry => entry.backup),
  }
}
