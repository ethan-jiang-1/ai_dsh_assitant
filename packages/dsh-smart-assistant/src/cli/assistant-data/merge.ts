/**
 * Conservative merge of a bundle into a live home; ledger conflicts are never overwritten here.
 *
 * @module dsh-smart-assistant/cli/assistant-data/merge
 */
import { existsSync } from 'node:fs'
import { chmod, copyFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { appendAuditLine } from '../assistant-data-audit.ts'
import { MAX_IMPORT_BYTES, type DataMergeEntry, type DataMergeOptions, type DataMergeResult } from '../assistant-data-types.ts'
import { readDataManifest } from './manifest.ts'
import { assertPlainTree, countTree, isInside } from './shared.ts'

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
