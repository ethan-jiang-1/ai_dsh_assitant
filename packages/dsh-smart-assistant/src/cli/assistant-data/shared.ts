/**
 * Shared filesystem helpers for the portable data bundle: owned directories are copied as plain
 * trees, never through symlinks, and transient coordination files never travel.
 *
 * @module dsh-smart-assistant/cli/assistant-data/shared
 */
import { existsSync } from 'node:fs'
import { lstat, readdir, rename, rm, stat } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'

export async function countTree(dir: string): Promise<{ files: number, bytes: number }> {
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
export function isInside(parent: string, child: string): boolean {
  const nested = relative(parent, child)
  return nested === '' || (!nested.startsWith('..') && !isAbsolute(nested))
}

/** Coordination files, never user data, and never valid in a portable bundle. */
export function isTransient(name: string): boolean {
  return name === 'writer.lock' || name.endsWith('.tmp') || name.endsWith('.takeover')
}

/**
 * Require an absent, empty directory destination. A symlink or a regular file is refused rather
 * than replaced: both are more likely a mistaken path than an empty backup target.
 */
export async function assertEmptyDestination(path: string, label: string): Promise<void> {
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
export async function assertPlainTree(root: string, label: string): Promise<void> {
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
export async function dropTransient(root: string): Promise<void> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (isTransient(entry.name)) {
      await rm(path, { recursive: true, force: true })
    } else if (entry.isDirectory()) {
      await dropTransient(path)
    }
  }
}

export async function moveInto(from: string, to: string): Promise<void> {
  if (existsSync(to)) await rm(to, { recursive: true, force: true })
  await rename(from, to)
}
