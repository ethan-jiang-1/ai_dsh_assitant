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

/**
 * Scan a home's skills directory.
 * @param skillsDir - Directory holding learned skill bundles and flat files.
 * @returns Discovered skills and the files that could not be read as skills.
 */
export async function scanLearnedSkills(skillsDir: string): Promise<SkillScan> {
  let names: string[]
  try {
    names = await readdir(skillsDir)
  } catch {
    return { skills: [], failures: [] }
  }
  const skills: LearnedSkillInfo[] = []
  const failures: RoomReadFailure[] = []
  for (const name of names.sort()) {
    // The archive is layout, not a skill: the provider skips a directory without SKILL.md, and
    // retired bundles live one level below its scan.
    if (name === ARCHIVE_DIRECTORY_NAME) continue
    const path = join(skillsDir, name)
    const isDirectory = await stat(path).then(entry => entry.isDirectory()).catch(() => false)
    const file = isDirectory ? join(path, SKILL_FILE_NAME) : name.endsWith('.md') ? path : undefined
    if (file === undefined) continue
    const text = await readFile(file, 'utf8').catch(() => undefined)
    if (text === undefined) {
      if (isDirectory) failures.push({ path: file, reason: `missing ${SKILL_FILE_NAME}` })
      continue
    }
    const document = parseFrontmatterDocument(text)
    if (document === undefined) {
      failures.push({ path: file, reason: 'missing or unparsable YAML frontmatter' })
      continue
    }
    skills.push({ dirName: isDirectory ? name : name.slice(0, -3), ...readInfo(document.data) })
  }
  return { skills, failures }
}
