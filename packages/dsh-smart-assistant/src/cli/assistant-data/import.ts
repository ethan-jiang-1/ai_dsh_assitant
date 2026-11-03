/**
 * Import a bundle into absent/empty plugin directories with stash/restore on failure.
 *
 * @module dsh-smart-assistant/cli/assistant-data/import
 */
import { existsSync } from 'node:fs'
import { cp, lstat, mkdir, readFile, readdir, rename, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { MAX_IMPORT_BYTES, type DataImportOptions, type DataImportResult } from '../assistant-data-types.ts'
import { readDataManifest } from './manifest.ts'
import { assertEmptyDestination, assertPlainTree, countTree, dropTransient, isInside, moveInto } from './shared.ts'

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
