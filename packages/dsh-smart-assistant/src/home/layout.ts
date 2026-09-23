/**
 * The home layout: the single owner of where a home's rooms live and how a missing home is created.
 *
 * Every other module — the service, the three tools, the digest, the curation check — derives its
 * paths from {@link homePaths} instead of joining directory names itself. That is what keeps
 * `docs/home.md` and the code from drifting apart, and it is why a layout change is a one-file change.
 *
 * @module dsh-smart-assistant/home/layout
 */

import { constants } from 'node:fs'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { HOME_MAP_FILE_NAME, renderHomeMap } from './home-map.ts'

/** Directory name of the home under the harness home. */
export const HOME_DIRECTORY_NAME = 'assistant'

/** Room holding settled facts, preferences, and decisions. */
export const MEMORY_ROOM = 'memory'

/** Room holding threads the agent has not resolved. */
export const RESEARCH_ROOM = 'research'

/** Room holding skills the agent wrote for itself. */
export const SKILLS_ROOM = 'skills'

/** Subdirectory holding entries that left a room's active set. */
export const ARCHIVE_DIRECTORY_NAME = 'archive'

/** Machine-owned ledger of `skill`-tool load counts; advisory state, safe to delete. */
export const SKILL_USAGE_FILE_NAME = 'skill-usage.json'

/** Every path the home layout owns. */
export interface HomePaths {
  /** Home root. */
  readonly root: string
  /** The home map file. */
  readonly mapFile: string
  /** The skill-usage ledger (load counts; not a room, never scaffolded). */
  readonly skillUsageFile: string
  /** Active memory records. */
  readonly memoryDir: string
  /** Superseded and retired memory records. */
  readonly memoryArchiveDir: string
  /** Open and parked threads. */
  readonly researchDir: string
  /** Promoted and dropped threads. */
  readonly researchArchiveDir: string
  /** Skills the agent wrote for itself, as `<name>/SKILL.md` bundles. */
  readonly skillsDir: string
}

/**
 * Derive every home path from the home root.
 * @param root - Absolute home root.
 * @returns The complete path set for that root.
 */
export function homePaths(root: string): HomePaths {
  const memoryDir = join(root, MEMORY_ROOM)
  const researchDir = join(root, RESEARCH_ROOM)
  return {
    root,
    mapFile: join(root, HOME_MAP_FILE_NAME),
    skillUsageFile: join(root, SKILL_USAGE_FILE_NAME),
    memoryDir,
    memoryArchiveDir: join(memoryDir, ARCHIVE_DIRECTORY_NAME),
    researchDir,
    researchArchiveDir: join(researchDir, ARCHIVE_DIRECTORY_NAME),
    skillsDir: join(root, SKILLS_ROOM),
  }
}

/** What a scaffold run created, for logging and tests. */
export interface ScaffoldResult {
  /** Directories that did not exist before this call. */
  readonly createdDirectories: readonly string[]
  /** Whether the home map was written by this call. */
  readonly mapWritten: boolean
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Create a missing home. Idempotent, and safe on a home a person has edited: directories are only
 * created, and `HOME.md` is written only when absent, so hand edits survive.
 * @param paths - Resolved home paths.
 * @returns What this call created.
 */
export async function scaffoldHome(paths: HomePaths): Promise<ScaffoldResult> {
  const directories = [
    paths.root,
    paths.memoryDir,
    paths.memoryArchiveDir,
    paths.researchDir,
    paths.researchArchiveDir,
    paths.skillsDir,
  ]
  const createdDirectories: string[] = []
  for (const directory of directories) {
    if (!(await exists(directory))) createdDirectories.push(directory)
    await mkdir(directory, { recursive: true })
  }
  const mapWritten = !(await exists(paths.mapFile))
  if (mapWritten) await writeFile(paths.mapFile, renderHomeMap(paths), 'utf8')
  return { createdDirectories, mapWritten }
}
