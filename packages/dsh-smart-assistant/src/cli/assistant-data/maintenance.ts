/**
 * Maintenance verbs over a working folder: proposal-inbox rotation and manual regeneration.
 *
 * @module dsh-smart-assistant/cli/assistant-data/maintenance
 */
import { existsSync } from 'node:fs'
import { chmod, copyFile, lstat, mkdir, readFile, readdir, rename, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { atomicWriteFile } from '../../domain/home/atomic-write.ts'
import { parseFrontmatterDocument } from '../../domain/home/frontmatter.ts'
import { MANUAL_FILE_NAME, renderHomeManual } from '../../domain/home/home-map.ts'
import { isEntryId } from '../../domain/home/room.ts'
import type { ManualRefreshOptions, ManualRefreshResult, ProposalArchiveOptions, ProposalArchiveResult } from '../assistant-data-types.ts'

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

export async function refreshManual(options: ManualRefreshOptions): Promise<ManualRefreshResult> {
  if (options.confirm !== true) throw new Error('assistant-data: refresh-manual requires explicit confirmation (--yes)')
  const assistantDir = resolve(options.assistantDir)
  const rootInfo = await lstat(assistantDir).catch(() => undefined)
  if (rootInfo === undefined) throw new Error(`assistant-data: working folder not found: ${assistantDir}`)
  if (rootInfo.isSymbolicLink()) throw new Error(`assistant-data: working folder is a symbolic link: ${assistantDir}`)
  if (!rootInfo.isDirectory()) throw new Error(`assistant-data: working folder is not a directory: ${assistantDir}`)
  const path = join(assistantDir, MANUAL_FILE_NAME)
  const existing = await lstat(path).catch(() => undefined)
  if (existing === undefined) {
    await atomicWriteFile(path, renderHomeManual())
    return { path }
  }
  if (existing.isSymbolicLink()) throw new Error(`assistant-data: refusing to refresh a symlinked manual: ${path}`)
  if (!existing.isFile()) throw new Error(`assistant-data: manual is not a regular file: ${path}`)
  const stamp = (options.now ?? new Date()).toISOString().replace(/[:.]/g, '-')
  const backup = join(assistantDir, `${MANUAL_FILE_NAME}.bak-${stamp}-${process.pid.toString(36)}`)
  await copyFile(path, backup)
  await chmod(backup, 0o600)
  await atomicWriteFile(path, renderHomeManual())
  return { path, backup }
}
