/**
 * The home layout: the single owner of where a home's rooms live and how a missing home is created.
 *
 * Every other module — the service, the six tools, the digest, the curation check — derives its
 * paths from {@link homePaths} instead of joining directory names itself. That is what keeps
 * `docs/home.md` and the code from drifting apart, and it is why a layout change is a one-file change.
 *
 * @module dsh-smart-assistant/home/layout
 */

import { constants } from 'node:fs'
import { access, mkdir, readFile, rename } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { atomicWriteFile } from './atomic-write.ts'
import { AGENTS_FILE_NAME, MANUAL_FILE_NAME, NOTES_HEADER, renderHomeManual } from './home-map.ts'
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
  /** The plugin-owned operating manual (MANUAL.md; always the current render). */
  readonly manualFile: string
  /** The user-owned notes appended after the manual (AGENTS.md). */
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
    manualFile: join(root, MANUAL_FILE_NAME),
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
  /** Whether `MANUAL.md` was written by this call. */
  readonly manualWritten: boolean
  /** Whether the user notes file was seeded by this call. */
  readonly notesSeeded: boolean
  /** Where a legacy generated manual was moved, when the split migration ran. */
  readonly legacyManualBackup?: string
  /** Whether the identity file was seeded by this call. */
  readonly soulWritten: boolean
}

/** A filename-safe timestamp plus a short random suffix for one-time backups. */
function backupStamp(): string {
  return `${new Date().toISOString().replace(/[:.]/gu, '-')}-${randomUUID().slice(0, 8)}`
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
 * created, `SOUL.md` is written only when absent, `MANUAL.md` is refreshed to the current render
 * (with a backup when it drifted), and `AGENTS.md` is the user's notes file. A legacy generated
 * manual (the old `<!-- home-manual vN -->` marker) is moved to `AGENTS.md.bak-*` and replaced by
 * the notes header — its hand edits stay visible in the backup, never in the prompt.
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
    await mkdir(directory, { recursive: true, mode: 0o700 })
  }

  const render = renderHomeManual()
  const manualWritten = !(await exists(paths.manualFile))
  if (manualWritten) {
    await atomicWriteFile(paths.manualFile, render)
  } else {
    const existing = await readFile(paths.manualFile, 'utf8')
    if (existing.trim() !== render.trim()) {
      await atomicWriteFile(`${paths.manualFile}.bak-${backupStamp()}`, existing)
      await atomicWriteFile(paths.manualFile, render)
    }
  }

  let notesSeeded = false
  let legacyManualBackup: string | undefined
  if (await exists(paths.agentsFile)) {
    const text = await readFile(paths.agentsFile, 'utf8')
    if (/^<!--\s*home-manual v\d+\s*-->/u.test(text.trimStart())) {
      legacyManualBackup = `${paths.agentsFile}.bak-${backupStamp()}`
      await rename(paths.agentsFile, legacyManualBackup)
      await atomicWriteFile(paths.agentsFile, NOTES_HEADER)
      notesSeeded = true
    }
  } else {
    await atomicWriteFile(paths.agentsFile, NOTES_HEADER)
    notesSeeded = true
  }

  const soulWritten = !(await exists(paths.soulFile))
  if (soulWritten) await atomicWriteFile(paths.soulFile, `${DEFAULT_SOUL}\n`)
  return {
    createdDirectories,
    manualWritten,
    notesSeeded,
    ...(legacyManualBackup === undefined ? {} : { legacyManualBackup }),
    soulWritten,
  }
}
