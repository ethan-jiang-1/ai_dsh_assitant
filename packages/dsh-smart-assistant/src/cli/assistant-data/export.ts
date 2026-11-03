/**
 * Export the two plugin-owned directories into a portable bundle with a schema manifest.
 *
 * @module dsh-smart-assistant/cli/assistant-data/export
 */
import { existsSync } from 'node:fs'
import { cp, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { DATA_MANIFEST_FILE, DATA_SCHEMA_VERSION, type DataExportOptions, type DataExportResult, type DataManifest } from '../assistant-data-types.ts'
import { assertEmptyDestination, assertPlainTree, countTree, isInside, isTransient } from './shared.ts'

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
