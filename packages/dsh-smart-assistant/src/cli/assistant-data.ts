/**
 * Portable user-data export/import for the two plugin-owned directories.
 *
 * The bundle is deliberately narrow: `<assistant>` and `<assistant-operating>` only. Sessions,
 * credentials, settings and storages belong to the harness home and stay out; the agent artifact
 * never enters. A manifest names the schema generation so an importer can refuse a future bundle
 * instead of guessing.
 *
 * This module is shared by the shipped `assistant-data` bin and the repo tests. It uses Node
 * built-ins only, so the installed bin does not need the harness peers.
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
  /** Destination working folder; must be absent or empty. */
  readonly assistantDir: string
  /** Destination operating ledger; must be absent or empty. */
  readonly operatingDir: string
}

/** Result of an import. */
export interface DataImportResult {
  readonly assistantFiles: number
  readonly operatingFiles: number
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
  await assertEmptyDestination(assistantDir, 'import destination')
  await assertEmptyDestination(operatingDir, 'import destination')

  const suffix = `${process.pid.toString(36)}-${Date.now().toString(36)}`
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
    // both destinations are absent (the pre-import state) rather than a working folder without
    // its ledger.
    if (movedOperating) await rm(operatingDir, { recursive: true, force: true })
    if (movedAssistant) await rm(assistantDir, { recursive: true, force: true })
    throw error
  }

  const assistant = await countTree(assistantDir)
  const operating = await countTree(operatingDir)
  return { assistantFiles: assistant.files, operatingFiles: operating.files }
}
