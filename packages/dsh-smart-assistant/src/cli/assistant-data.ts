/**
 * Portable user-data export/import for the two plugin-owned directories.
 *
 * The bundle is deliberately narrow: `<assistant>` and `<assistant-operating>` only. Sessions,
 * credentials, settings and storages belong to the harness home and stay out; the agent artifact
 * never enters. A manifest names the schema generation so an importer can refuse a future bundle
 * instead of guessing.
 *
 * This module is shared by the shipped `assistant-data` bin and the repo tests. It uses Node
 * built-ins plus package-internal pure modules only, so the installed bin does not need the
 * harness peers.
 *
 * A bundle is plain data: exporting a working folder that contains a symbolic link is refused
 * rather than silently copying the link into a backup that another machine will restore. The
 * ledger's `writer.lock` and the atomic-write `*.tmp` siblings are transient coordination state,
 * not user data: they never enter a bundle, and an older bundle that carries them is cleaned on
 * import so restoring a backup cannot plant a foreign host's live claim.
 *
 * @module dsh-smart-assistant/cli/assistant-data
 */

import { cp, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { HOME_MANUAL_VERSION } from '../domain/home/home-map.ts'
import { OPERATIONS_ARCHIVE_FILE, parseOperationsArchive } from '../host/operating-ledger/archive.ts'

/** Manifest file written at the bundle root. */
export const DATA_MANIFEST_FILE = 'manifest.json'

/** Current export schema. Importers refuse anything else. */
export const DATA_SCHEMA_VERSION = 1

/** What an export bundle declares about itself. */
export interface DataManifest {
  /** Export schema generation. */
  readonly schemaVersion: 1
  /** Export time, ISO-8601. */
  readonly createdAt: string
  /** Bundle contents; a future schema may add more. */
  readonly includes: readonly ['assistant', 'assistant-operating']
  /** File count across both included directories. */
  readonly files: number
  /** Byte count across both included directories. */
  readonly bytes: number
}

/** Arguments for {@link exportData}. */
export interface DataExportOptions {
  /** Working folder to include (the service's `dataDir`). */
  readonly assistantDir: string
  /** Operating ledger directory to include; a missing one exports empty. */
  readonly operatingDir: string
  /** Destination bundle directory; must be absent or empty. */
  readonly outDir: string
  /** Clock override for tests. */
  readonly now?: Date
}

/** Result of an export. */
export interface DataExportResult {
  readonly manifest: DataManifest
  readonly outDir: string
}

/** Arguments for {@link importData}. */
export interface DataImportOptions {
  /** Bundle directory produced by {@link exportData}. */
  readonly inDir: string
  /** Destination working folder; must be absent or empty unless `replace` is set. */
  readonly assistantDir: string
  /** Destination operating ledger; must be absent or empty unless `replace` is set. */
  readonly operatingDir: string
  /**
   * Restore over an existing home. A non-empty destination is moved aside to
   * `<dir>.pre-import-<id>` before the import (never deleted); a failed import restores it.
   */
  readonly replace?: boolean
}

/** Result of an import. */
export interface DataImportResult {
  readonly assistantFiles: number
  readonly operatingFiles: number
  /** Sibling backups created by `replace`, in the order they were stashed. */
  readonly backups: readonly string[]
}

/** One owned directory as `status` sees it. */
export interface DataTreeStatus {
  readonly exists: boolean
  readonly files: number
  readonly bytes: number
}

/** The authoritative ledger file as `status` sees it. */
export interface DataLedgerStatus {
  readonly exists: boolean
  readonly bytes: number
  /** `missing` = no ledger yet; `invalid` = unreadable or not a v1 state. */
  readonly state: 'missing' | 'ok' | 'invalid'
  readonly version?: number
  readonly operations?: number
}

/** A read-only snapshot of the two owned directories, for deployment support. */
export interface DataStatus {
  readonly assistantDir: string
  readonly operatingDir: string
  readonly assistant: DataTreeStatus & { readonly manualVersion?: number }
  readonly operating: DataTreeStatus
  readonly ledger: DataLedgerStatus
  /** The append-only operation history, when a compacted ledger has one. */
  readonly archive?: { readonly bytes: number, readonly operations: number, readonly corruptLines: number }
}

/** A read-only diagnosis: the status plus every problem an operator should act on. */
export interface DataCheck {
  readonly status: DataStatus
  readonly problems: readonly string[]
}

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
async function treeStatus(dir: string): Promise<DataTreeStatus> {
  if (!existsSync(dir)) return { exists: false, files: 0, bytes: 0 }
  return { exists: true, ...await countTree(dir) }
}

/**
 * Read the two owned directories without changing them. Intended for the deployment support path:
 * it names the paths, sizes, manual generation, and whether the ledger parses as a v1 state.
 *
 * @param options - The two resolved directories.
 * @returns A read-only status snapshot.
 */
export async function statusData(options: { readonly assistantDir: string, readonly operatingDir: string }): Promise<DataStatus> {
  const assistantDir = resolve(options.assistantDir)
  const operatingDir = resolve(options.operatingDir)
  const assistant = await treeStatus(assistantDir)
  const operating = await treeStatus(operatingDir)
  let manualVersion: number | undefined
  try {
    manualVersion = manualVersionOf(await readFile(join(assistantDir, 'AGENTS.md'), 'utf8'))
  } catch { /* missing/unreadable manual is reported by curate, not by status */ }

  const ledgerPath = join(operatingDir, 'ledger.json')
  let ledger: DataLedgerStatus = { exists: false, bytes: 0, state: 'missing' }
  if (existsSync(ledgerPath)) {
    const bytes = (await stat(ledgerPath)).size
    try {
      const parsed: unknown = JSON.parse(await readFile(ledgerPath, 'utf8'))
      if (typeof parsed === 'object' && parsed !== null && (parsed as { version?: unknown }).version === 1) {
        const operations = (parsed as { operations?: unknown }).operations
        ledger = {
          exists: true,
          bytes,
          state: 'ok',
          version: 1,
          operations: typeof operations === 'object' && operations !== null ? Object.keys(operations).length : 0,
        }
      } else {
        ledger = { exists: true, bytes, state: 'invalid' }
      }
    } catch {
      ledger = { exists: true, bytes, state: 'invalid' }
    }
  }
  const archivePath = join(operatingDir, OPERATIONS_ARCHIVE_FILE)
  let archive: DataStatus['archive']
  if (existsSync(archivePath)) {
    const bytes = (await stat(archivePath)).size
    const parsed = parseOperationsArchive(await readFile(archivePath, 'utf8'))
    archive = { bytes, operations: parsed.records.length, corruptLines: parsed.corruptLines }
  }
  return {
    assistantDir,
    operatingDir,
    assistant: { ...assistant, ...(manualVersion === undefined ? {} : { manualVersion }) },
    operating,
    ledger,
    ...(archive === undefined ? {} : { archive }),
  }
}

/** Collect symbolic links under a root; backup/restore refuses them, so diagnosis should name them. */
async function findSymlinks(root: string, found: string[] = []): Promise<string[]> {
  if (!existsSync(root)) return found
  const info = await lstat(root)
  if (info.isSymbolicLink()) {
    found.push(root)
    return found
  }
  if (!info.isDirectory()) return found
  for (const entry of await readdir(root)) {
    await findSymlinks(join(root, entry), found)
  }
  return found
}

/**
 * Read-only deployment diagnosis: path shape, ledger/archive readability, manual generation, and
 * symbolic links. It never writes; a non-empty problem list is what `assistant-data check` exits on.
 * @param options - The two directories as the operator typed them.
 * @returns The status plus actionable problems.
 */
export async function checkData(options: { readonly assistantDir: string, readonly operatingDir: string }): Promise<DataCheck> {
  const problems: string[] = []
  if (!isAbsolute(options.assistantDir)) problems.push(`working folder path is relative: ${options.assistantDir} (use an absolute path or ~)`)
  if (!isAbsolute(options.operatingDir)) problems.push(`ledger path is relative: ${options.operatingDir} (use an absolute path or ~)`)
  const status = await statusData(options)
  if (status.ledger.state === 'invalid') {
    problems.push(`ledger.json is unreadable or not a v1 state: ${join(status.operatingDir, 'ledger.json')}`)
  }
  if (status.archive !== undefined && status.archive.corruptLines > 0) {
    problems.push(`${String(status.archive.corruptLines)} unreadable line(s) in ${join(status.operatingDir, OPERATIONS_ARCHIVE_FILE)}`)
  }
  if (status.assistant.manualVersion !== undefined
    && status.assistant.manualVersion > 0
    && status.assistant.manualVersion < HOME_MANUAL_VERSION) {
    problems.push(`working folder manual is v${String(status.assistant.manualVersion)}; current is v${String(HOME_MANUAL_VERSION)} (the next launch migrates known text, or the prompt marks it stale)`)
  }
  for (const link of [...await findSymlinks(status.assistantDir), ...await findSymlinks(status.operatingDir)]) {
    problems.push(`symbolic link in owned data: ${link}`)
  }
  return { status, problems }
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
  if (existsSync(join(operatingDir, 'writer.lock'))) {
    throw new Error(`assistant-data: a writer.lock exists at ${join(operatingDir, 'writer.lock')}; stop the instance before importing`)
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
