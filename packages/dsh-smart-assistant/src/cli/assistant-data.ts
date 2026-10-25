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
 * @module dsh-smart-assistant/cli/assistant-data
 */

import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

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

async function nonEmpty(path: string): Promise<boolean> {
  if (!existsSync(path)) return false
  return (await readdir(path)).length > 0
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
  if (await nonEmpty(outDir)) throw new Error(`assistant-data: export destination is not empty: ${outDir}`)

  await mkdir(outDir, { recursive: true })
  await cp(assistantDir, join(outDir, 'assistant'), { recursive: true })
  if (existsSync(operatingDir)) {
    await cp(operatingDir, join(outDir, 'assistant-operating'), { recursive: true })
  } else {
    await mkdir(join(outDir, 'assistant-operating'), { recursive: true })
  }

  const assistant = await countTree(join(outDir, 'assistant'))
  const operating = await countTree(join(outDir, 'assistant-operating'))
  const manifest: DataManifest = {
    schemaVersion: DATA_SCHEMA_VERSION,
    createdAt: (options.now ?? new Date()).toISOString(),
    includes: ['assistant', 'assistant-operating'],
    files: assistant.files + operating.files,
    bytes: assistant.bytes + operating.bytes,
  }
  await writeFile(join(outDir, DATA_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
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
  if (await nonEmpty(assistantDir)) throw new Error(`assistant-data: import destination is not empty: ${assistantDir}`)
  if (await nonEmpty(operatingDir)) throw new Error(`assistant-data: import destination is not empty: ${operatingDir}`)

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
