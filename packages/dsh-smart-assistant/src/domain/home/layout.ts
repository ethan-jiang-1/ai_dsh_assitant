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
import { AGENTS_FILE_NAME, renderHomeManual } from './home-map.ts'
import { DEFAULT_SOUL, SOUL_FILE_NAME } from './soul.ts'

/** Directory name of the home under the harness home. */
export const HOME_DIRECTORY_NAME = 'assistant'

/** Room holding settled facts, preferences, and decisions. */
export const MEMORY_ROOM = 'memory'

/** Room holding threads the agent has not resolved. */
export const RESEARCH_ROOM = 'research'

/** Room holding skills the agent wrote for itself. */
export const SKILLS_ROOM = 'skills'

/** Room holding domain knowledge: concept, entity, and source pages that interlink. */
export const KNOWLEDGE_ROOM = 'knowledge'

/** Directory holding skill proposals: drafts awaiting human review, one `<name>.md` per name. */
export const SKILL_PROPOSALS_DIRECTORY_NAME = 'skill-proposals'

/** Directory holding governance ledgers (not a room, never scaffolded; created on first approval). */
export const AUDIT_DIRECTORY_NAME = 'audit'

/** Append-only approval ledger inside the audit directory. */
export const APPROVALS_LEDGER_FILE_NAME = 'approvals.jsonl'

/** Subdirectory holding entries that left a room's active set. */
export const ARCHIVE_DIRECTORY_NAME = 'archive'

/** Machine-owned ledger of `skill`-tool load counts; advisory state, safe to delete. */
export const SKILL_USAGE_FILE_NAME = 'skill-usage.json'

/** Every path the home layout owns. */
export interface HomePaths {
  /** Home root. */
  readonly root: string
  /** The home's operating manual (AGENTS.md). */
  readonly agentsFile: string
  /** The home's identity file (SOUL.md). */
  readonly soulFile: string
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
  /** Retired skills, out of the provider's scan but recoverable. */
  readonly skillsArchiveDir: string
  /**
   * Knowledge pages. No archive subdirectory on purpose: OKF keeps `deprecated` pages in place
   * so links keep resolving — retirement is a frontmatter status, not a move.
   */
  readonly knowledgeDir: string
  /** Skill proposals: one `<name>.md` per proposed name, awaiting human review. */
  readonly skillProposalsDir: string
  /** Governance ledger directory (created on first approval, never scaffolded). */
  readonly auditDir: string
  /** Append-only approval ledger (`audit/approvals.jsonl`). */
  readonly approvalsLedgerFile: string
}

/**
 * Derive every home path from the home root.
 * @param root - Absolute home root.
 * @returns The complete path set for that root.
 */
export function homePaths(root: string): HomePaths {
  const memoryDir = join(root, MEMORY_ROOM)
  const researchDir = join(root, RESEARCH_ROOM)
  const skillsDir = join(root, SKILLS_ROOM)
  return {
    root,
    agentsFile: join(root, AGENTS_FILE_NAME),
    soulFile: join(root, SOUL_FILE_NAME),
    skillUsageFile: join(root, SKILL_USAGE_FILE_NAME),
    memoryDir,
    memoryArchiveDir: join(memoryDir, ARCHIVE_DIRECTORY_NAME),
    researchDir,
    researchArchiveDir: join(researchDir, ARCHIVE_DIRECTORY_NAME),
    skillsDir,
    skillsArchiveDir: join(skillsDir, ARCHIVE_DIRECTORY_NAME),
    knowledgeDir: join(root, KNOWLEDGE_ROOM),
    skillProposalsDir: join(root, SKILL_PROPOSALS_DIRECTORY_NAME),
    auditDir: join(root, AUDIT_DIRECTORY_NAME),
    approvalsLedgerFile: join(root, AUDIT_DIRECTORY_NAME, APPROVALS_LEDGER_FILE_NAME),
  }
}

/** What a scaffold run created, for logging and tests. */
export interface ScaffoldResult {
  /** Directories that did not exist before this call. */
  readonly createdDirectories: readonly string[]
  /** Whether the operating manual was written by this call. */
  readonly manualWritten: boolean
  /** Whether the identity file was seeded by this call. */
  readonly soulWritten: boolean
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
 * created, and `AGENTS.md` / `SOUL.md` are written only when absent, so hand edits survive.
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
    paths.skillsArchiveDir,
    paths.knowledgeDir,
    paths.skillProposalsDir,
  ]
  const createdDirectories: string[] = []
  for (const directory of directories) {
    if (!(await exists(directory))) createdDirectories.push(directory)
    await mkdir(directory, { recursive: true })
  }
  const manualWritten = !(await exists(paths.agentsFile))
  if (manualWritten) await writeFile(paths.agentsFile, renderHomeManual(), 'utf8')
  const soulWritten = !(await exists(paths.soulFile))
  if (soulWritten) await writeFile(paths.soulFile, `${DEFAULT_SOUL}\n`, 'utf8')
  return { createdDirectories, manualWritten, soulWritten }
}
