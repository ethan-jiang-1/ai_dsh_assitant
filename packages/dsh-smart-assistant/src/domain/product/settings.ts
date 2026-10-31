/**
 * The product settings: one small file that binds this installation to a user workspace.
 *
 * The file is machine-local state, not user content and not backup material. It lives under
 * `<dshHome>/assistant-product/` so a product home can be moved without touching the assistant
 * brain, and so the default `assistant/` tree keeps its own ownership. The launcher writes it
 * before boot; the web-only product row reads it and registers the workspace.
 *
 * @module dsh-smart-assistant/product/settings
 */

import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { atomicWriteFile } from '../home/atomic-write.ts'

/** Current settings schema version. */
export const PRODUCT_SETTINGS_VERSION = 1

/** Upper bound for the stored file; this file holds one path, not a document. */
export const PRODUCT_SETTINGS_MAX_BYTES = 4096

/** Directory name under the harness home that holds product settings. */
export const PRODUCT_SETTINGS_DIRECTORY = 'assistant-product'

/** File name inside {@link PRODUCT_SETTINGS_DIRECTORY}. */
export const PRODUCT_SETTINGS_FILE = 'settings.json'

/** One stored binding. */
export interface ProductSettings {
  /** Schema version; a mismatch is an invalid file, not a silent default. */
  readonly version: typeof PRODUCT_SETTINGS_VERSION
  /** Canonical absolute directory the product works in. */
  readonly workspaceDir: string
  /** ISO timestamp of the last write, when the writer supplied one. */
  readonly updatedAt?: string
}

/** Result of reading the settings file. */
export type ProductSettingsRead =
  | { readonly kind: 'missing' }
  | { readonly kind: 'invalid'; readonly reason: string }
  | { readonly kind: 'ok'; readonly settings: ProductSettings }

/**
 * Resolve the settings directory under a harness home.
 * @param home - The product's `DSH_HOME`.
 * @returns the absolute settings directory.
 */
export function productSettingsDir(home: string): string {
  return join(home, PRODUCT_SETTINGS_DIRECTORY)
}

/**
 * Resolve the settings file under a harness home.
 * @param home - The product's `DSH_HOME`.
 * @returns the absolute settings path.
 */
export function productSettingsPath(home: string): string {
  return join(productSettingsDir(home), PRODUCT_SETTINGS_FILE)
}

/**
 * Read and validate the stored binding. A missing file is a normal first-run state; a file that
 * exists but cannot be used is `invalid`, never silently treated as absent.
 * @param path - Absolute settings path.
 * @returns the read result.
 */
export async function readProductSettings(path: string): Promise<ProductSettingsRead> {
  const info = await stat(path).catch(error => {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined
    throw error
  })
  if (info === undefined) return { kind: 'missing' }
  if (!info.isFile()) return { kind: 'invalid', reason: 'not-a-file' }
  if (info.size > PRODUCT_SETTINGS_MAX_BYTES) return { kind: 'invalid', reason: 'too-large' }
  const text = await readFile(path, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { kind: 'invalid', reason: 'bad-json' }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'invalid', reason: 'not-an-object' }
  }
  const record = parsed as Record<string, unknown>
  if (record['version'] !== PRODUCT_SETTINGS_VERSION) return { kind: 'invalid', reason: 'bad-version' }
  const workspaceDir = record['workspaceDir']
  if (typeof workspaceDir !== 'string' || workspaceDir.trim() === '') {
    return { kind: 'invalid', reason: 'missing-workspace' }
  }
  const updatedAt = record['updatedAt']
  if (updatedAt !== undefined && typeof updatedAt !== 'string') {
    return { kind: 'invalid', reason: 'bad-updated-at' }
  }
  return {
    kind: 'ok',
    settings: {
      version: PRODUCT_SETTINGS_VERSION,
      workspaceDir,
      ...(updatedAt === undefined ? {} : { updatedAt }),
    },
  }
}

/**
 * Atomically replace the stored binding. The parent directory is owner-only; the file is 0600.
 * @param path - Absolute settings path.
 * @param workspaceDir - Canonical workspace directory to store.
 * @param now - Clock injection for tests.
 * @returns the written value.
 */
export async function writeProductSettings(
  path: string,
  workspaceDir: string,
  now: Date = new Date(),
): Promise<ProductSettings> {
  const settings: ProductSettings = {
    version: PRODUCT_SETTINGS_VERSION,
    workspaceDir,
    updatedAt: now.toISOString(),
  }
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  await atomicWriteFile(path, `${JSON.stringify(settings)}\n`, 0o600)
  return settings
}

/** Narrow an unknown caught value to a Node error with a string code. */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
