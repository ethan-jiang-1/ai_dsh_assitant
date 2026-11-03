/**
 * Read and validate a portable bundle manifest.
 *
 * @module dsh-smart-assistant/cli/assistant-data/manifest
 */
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { DATA_MANIFEST_FILE, DATA_SCHEMA_VERSION, type DataManifest } from '../assistant-data-types.ts'

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
