/**
 * Pre-overwrite snapshots for the skills room (tri-line proposal 2026-09-24, slice 1f;
 * the garvel `.bak` shape): `save_skill` replacing an existing bundle is the one mutation
 * that can lose a learned skill's previous wording, so the old file is copied aside first.
 *
 * Snapshots live under `skills/archive/snapshots/<name>/` — below the scanner's and the
 * provider's scan depth, so they never surface as skills — and only the newest few per name
 * are kept: the point is undoing the last mistake, not archiving every draft. Restoring is a
 * plain file copy back, deliberately not a tool verb.
 *
 * @module dsh-smart-assistant/skills/snapshot
 */

import { chmod, copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { SKILL_FILE_NAME } from './skill-file.ts'

/** Directory name for snapshots, under the skills archive. */
export const SNAPSHOTS_DIRECTORY_NAME = 'snapshots'

/** How many snapshots to keep per skill name. */
export const SNAPSHOTS_KEPT = 3

function snapshotDir(skillsArchiveDir: string, name: string): string {
  return join(skillsArchiveDir, SNAPSHOTS_DIRECTORY_NAME, name)
}

/**
 * Prune one skill's snapshots down to the newest {@link SNAPSHOTS_KEPT}, by file name
 * (ISO-8601 stamps sort chronologically).
 * @param dir - Directory holding that skill's snapshots.
 */
async function pruneSnapshots(dir: string): Promise<void> {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return
  }
  const stale = names.filter(name => name.endsWith('.md')).sort().slice(0, -SNAPSHOTS_KEPT)
  for (const name of stale) await rm(join(dir, name), { force: true })
}

/**
 * Snapshot a skill's current file before it is overwritten.
 * @param skillsDir - The skills room root.
 * @param skillsArchiveDir - The skills archive root (snapshots live below it).
 * @param name - Skill name (bundle directory name or flat file stem).
 * @returns The snapshot path, or `undefined` when the skill does not exist yet (a first
 * write overwrites nothing) or its file cannot be read.
 */
export async function snapshotExistingSkill(
  skillsDir: string,
  skillsArchiveDir: string,
  name: string,
): Promise<string | undefined> {
  const bundleFile = join(skillsDir, name, SKILL_FILE_NAME)
  const flatFile = join(skillsDir, `${name}.md`)
  const isBundle = await stat(bundleFile).then(entry => entry.isFile()).catch(() => false)
  const source = isBundle
    ? bundleFile
    : await stat(flatFile).then(entry => entry.isFile()).catch(() => false) ? flatFile : undefined
  if (source === undefined) return undefined
  // Read to write: a file that vanished between stat and copy is not a snapshot-worthy state.
  if (await readFile(source, 'utf8').catch(() => undefined) === undefined) return undefined
  const dir = snapshotDir(skillsArchiveDir, name)
  await mkdir(dir, { recursive: true, mode: 0o700 })
  const target = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  await copyFile(source, target)
  // A snapshot of an older, wider file must not keep the wider mode.
  await chmod(target, 0o600)
  await pruneSnapshots(dir)
  return target
}
