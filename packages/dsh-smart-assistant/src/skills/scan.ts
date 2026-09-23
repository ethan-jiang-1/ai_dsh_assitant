/**
 * Reading the home's skills room the way the harness provider reads it.
 *
 * The provider discovers `<name>/SKILL.md` bundles and flat `<name>.md` files directly inside a
 * root, and silently ignores anything whose frontmatter is unusable. This scanner reports those
 * cases instead of ignoring them, so the curation check can name a skill the loader would drop.
 *
 * @module dsh-smart-assistant/skills/scan
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { ARCHIVE_DIRECTORY_NAME } from '../home/layout.ts'
import { parseFrontmatterDocument } from '../home/frontmatter.ts'
import type { LearnedSkillInfo } from '../home/health.ts'
import type { RoomReadFailure } from '../home/room.ts'
import { SKILL_FILE_NAME } from './skill-file.ts'

/** Result of scanning a skills room. */
export interface SkillScan {
  /** Bundles and flat files found, ordered by directory or file name. */
  readonly skills: readonly LearnedSkillInfo[]
  /** Files that exist but do not describe a usable skill. */
  readonly failures: readonly RoomReadFailure[]
}

function readInfo(data: Readonly<Record<string, unknown>>): Pick<LearnedSkillInfo, 'name' | 'description' | 'origin' | 'learnedAt'> {
  const metadata = data.metadata
  const info = metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {}
  const origin = info.origin
  const learnedAt = info.learnedAt
  return {
    ...(typeof data.name === 'string' ? { name: data.name } : {}),
    ...(typeof data.description === 'string' ? { description: data.description } : {}),
    ...(typeof origin === 'string' ? { origin } : {}),
    ...(typeof learnedAt === 'string' ? { learnedAt } : {}),
  }
}

/** One skill file the room's enumeration found, with the directory its references resolve against. */
export interface SkillFileEntry {
  /** Skill name: the bundle directory name, or the flat file's stem. */
  readonly name: string
  /** The skill file itself: `<dir>/SKILL.md` for bundles, the file for flat skills. */
  readonly file: string
  /** Directory relative references resolve against: the bundle dir, or the room root for flat skills. */
  readonly baseDir: string
}

/**
 * Enumerate a skills room the way the provider does: bundle directories and flat Markdown files
 * directly inside the root, with the archive exempt. Shared by the catalog scan and the
 * post-write audit so the two can never disagree about what is in the room. A bundle directory
 * is listed even when its `SKILL.md` is missing, so the scan can name it as a failure.
 * @param skillsDir - Directory holding learned skill bundles and flat files.
 * @returns Entries ordered by name.
 */
export async function listSkillFiles(skillsDir: string): Promise<SkillFileEntry[]> {
  let names: string[]
  try {
    names = await readdir(skillsDir)
  } catch {
    return []
  }
  const entries: SkillFileEntry[] = []
  for (const name of names.sort()) {
    // The archive is layout, not a skill: the provider skips a directory without SKILL.md, and
    // retired bundles live one level below its scan.
    if (name === ARCHIVE_DIRECTORY_NAME) continue
    const path = join(skillsDir, name)
    const isDirectory = await stat(path).then(entry => entry.isDirectory()).catch(() => false)
    if (isDirectory) {
      entries.push({ name, file: join(path, SKILL_FILE_NAME), baseDir: path })
    } else if (name.endsWith('.md')) {
      entries.push({ name: name.slice(0, -3), file: path, baseDir: skillsDir })
    }
  }
  return entries
}

/**
 * Scan a home's skills directory.
 * @param skillsDir - Directory holding learned skill bundles and flat files.
 * @returns Discovered skills and the files that could not be read as skills.
 */
export async function scanLearnedSkills(skillsDir: string): Promise<SkillScan> {
  const skills: LearnedSkillInfo[] = []
  const failures: RoomReadFailure[] = []
  for (const entry of await listSkillFiles(skillsDir)) {
    const text = await readFile(entry.file, 'utf8').catch(() => undefined)
    if (text === undefined) {
      // Only a bundle directory can be missing its file: a flat file that vanished between
      // enumeration and read is no longer in the room at all.
      if (entry.baseDir !== skillsDir) {
        failures.push({ path: entry.file, reason: `missing ${SKILL_FILE_NAME}` })
      }
      continue
    }
    const document = parseFrontmatterDocument(text)
    if (document === undefined) {
      failures.push({ path: entry.file, reason: 'missing or unparsable YAML frontmatter' })
      continue
    }
    skills.push({ dirName: entry.name, ...readInfo(document.data) })
  }
  return { skills, failures }
}
