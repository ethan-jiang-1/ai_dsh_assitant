/**
 * Gate cores for the notes/ lifecycle governance: naming, top-level shape, state
 * lines, AGENTS.md standing-orders stability, and the 输掉的方案 requirement.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { read } from './shared.mjs'

// ── notes naming & lifecycle state ─────────────────────────────────────────────

/** Notes carry their first-proposal date in the filename: YYYY-MM-DD-topic.md (lowercase slug). */
const NOTE_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/


/** Directory names directly under notes/ that may hold notes. */
const NOTE_SUBDIRECTORIES = ['proposed', 'implemented', 'rejected', 'archived']

/** Every top-level entry notes/ may carry besides the note subdirectories. The tree is the inventory; a root index is a second list. */
const NOTES_ROOT_FILES = new Set(['README.md', '.gitkeep'])

/** The status word each lifecycle directory's notes must carry (archived keeps implemented). */
const LIFECYCLE_STATUS = {
  proposed: 'proposed',
  implemented: 'implemented',
  rejected: 'rejected',
  archived: 'implemented',
}

/** Canonical state line: 日期：YYYY-MM-DD · 状态：**<word>**（reason, optional). */
const STATE_LINE = /^日期：(\d{4}-\d{2}-\d{2}) · 状态：\*\*([a-z]+|进行中|已收卷)/

/**
 * Note filenames under the note-bearing subdirectories follow YYYY-MM-DD-topic.md. README.md
 * and non-markdown files (.gitkeep at the notes root) are not notes and are exempt.
 *
 * @param {string} notesRoot - path of the notes/ directory.
 */
export function notesNamingProblems(notesRoot) {
  const problems = []
  for (const sub of NOTE_SUBDIRECTORIES) {
    const dir = join(notesRoot, sub)
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name === 'README.md') continue
      if (!NOTE_NAME_PATTERN.test(name)) {
        problems.push(`notes/${sub}/${name} does not follow YYYY-MM-DD-topic.md`)
      }
    }
  }
  return problems
}

/**
 * notes/ is a closed classification tree: the lifecycle directories and README.md at the root.
 * An unknown directory is a second home for something and drifts (DSH taxonomy:
 * the tree is the classification, checked by a gate rather than convention).
 *
 * @param {string} notesRoot - path of the notes/ directory.
 */
export function notesTopLevelProblems(notesRoot) {
  const problems = []
  if (!existsSync(notesRoot)) return problems
  const allowedDirs = new Set(NOTE_SUBDIRECTORIES.filter(sub => !sub.includes('/')))
  for (const name of readdirSync(notesRoot, { withFileTypes: true })) {
    if (name.isDirectory()) {
      if (!allowedDirs.has(name.name)) {
        problems.push(`notes/${name.name}/ is not a documented lifecycle directory — an undocumented bucket becomes a second home`)
      }
    } else if (!NOTES_ROOT_FILES.has(name.name)) {
      problems.push(`notes/${name.name} is not a documented notes-root file — records belong in a lifecycle directory`)
    }
  }
  for (const sub of ['proposed', 'implemented', 'rejected', 'archived']) {
    const dir = join(notesRoot, sub)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      problems.push(`notes/${sub}/${entry.name}/ is not a documented lifecycle directory — notes stay flat under the lifecycle folder`)
    }
  }
  return problems
}

/**
 * The state line makes the lifecycle readable at a glance, so the directory and the status word
 * must agree, the filename date must equal the status date, archived notes must carry their
 * freeze line, and rejected notes must carry the one-line reason that keeps them useful.
 *
 * @param {string} notesRoot - path of the notes/ directory.
 */
export function notesStateProblems(notesRoot) {
  const problems = []
  for (const [dir, word] of Object.entries(LIFECYCLE_STATUS)) {
    const full = join(notesRoot, dir)
    if (!existsSync(full)) continue
    for (const name of readdirSync(full)) {
      if (!name.endsWith('.md') || name === 'README.md') continue
      const text = read(join(full, name))
      const line = text.split('\n', 6).find(candidate => candidate.startsWith('日期：') && candidate.includes('状态：'))
      const match = line === undefined ? null : STATE_LINE.exec(line)
      if (match === null) {
        problems.push(`notes/${dir}/${name} carries no 日期：… · 状态：**…** line in its first 6 lines — the lifecycle is unreadable`)
        continue
      }
      const [, date, statusWord] = match
      if (statusWord !== word) {
        problems.push(`notes/${dir}/${name} says 状态：**${statusWord}** but sits in ${dir}/ — directory and status must agree`)
      }
      if (name.slice(0, 10) !== date) {
        problems.push(`notes/${dir}/${name} status date ${date} differs from its filename date`)
      }
      if (dir === 'archived' && !/^已归档：\d{4}-\d{2}-\d{2}/m.test(text)) {
        problems.push(`notes/archived/${name} carries no 已归档：YYYY-MM-DD line — archived notes are frozen history, not current authority`)
      }
      if (dir === 'rejected' && !/状态：\*\*rejected\*\*（.+）/.test(line ?? '')) {
        problems.push(`notes/rejected/${name} carries no one-line rejection reason on its status line`)
      }
    }
  }
  return problems
}

/**
 * AGENTS.md is a standing-orders file (docs/discipline.md: no state sections, no progress marks,
 * no pin numbers). Dated lines, progress marks and progress prose are all the same state claim —
 * the kind that belongs in the file that owns that state (a README) or a note, so the promise gets
 * a command instead of being remembered.
 *
 * The prose arm exists because the gate first shipped as a date-and-emoji regex and let a whole
 * "harness 状态" section reading "已建"/"仍未建" stay green in snapshots/AGENTS.md (2026-10-08).
 * Both patterns are deliberately narrow: the words alone are legitimate standing-order vocabulary
 * ("无状态"、"桌面状态"、"TODO/FIXME 不立项"), so only a `## … 状态 …` heading and the built/not-built
 * verbs are rejected — which is why the fixtures pin both directions.
 *
 * @param {string} agentsPath - path of the root AGENTS.md.
 */
export function agentsMdStabilityProblems(agentsPath) {
  const problems = []
  if (!existsSync(agentsPath)) return problems
  const lines = read(agentsPath).split('\n')
  for (const [index, line] of lines.entries()) {
    // The date ban covers the instruction text, not the address of the dated record: the message
    // itself sends dated records into notes, so a date inside a markdown link target is the
    // sanctioned shape (found 2026-10-10: linking the 0.1.7 migration note tripped the bare regex).
    if (/\b20\d{2}-\d{2}-\d{2}\b/.test(line.replace(/\]\([^)]*\)/g, '()'))) {
      problems.push(`AGENTS.md:${index + 1} carries a date — standing orders do not age; put the dated record in a note and link it`)
    }
    if (/[✅⏳⏸▶🧹]/.test(line)) {
      problems.push(`AGENTS.md:${index + 1} carries a progress mark — progress and state live in the file that owns them (a README or a note), not in the entry file`)
    }
    if (/^#{1,6}\s.*状态/.test(line)) {
      problems.push(`AGENTS.md:${index + 1} is a state section — standing orders do not report progress; keep the steps here and let the owning README or note hold the state`)
    }
    if (/已建|未建|待建|尚未|仍未|已落地|未落地|已交付|未交付|进行中/.test(line)) {
      problems.push(`AGENTS.md:${index + 1} carries progress prose — standing orders do not age; say what to do here, and let the owning README or note say how far it has got`)
    }
  }
  return problems
}

/**
 * Implemented notes dated on/after this day must carry an alternatives section — before it,
 * notes are grandfathered (the obligation landed 2026-09-24; see the absorption note).
 */
const ALTERNATIVES_GATE_DATE = '2026-09-25'

/** A heading that names the alternatives the decision beat (中文惯例节名 or the English heading). */
const ALTERNATIVES_PATTERN = /^##[^#\n]*(输掉的方案|[Aa]lternatives)/m

/**
 * Every implemented note carries what it beat: "a decision recorded without what it beat
 * invites re-litigation — the failure notes exist to prevent" (DSH .agents/notes rule,
 * absorbed 2026-09-24). Alternatives are recorded, never invented. Applies to notes dated
 * on/after the gate date; older notes keep their shape.
 *
 * @param {string} implementedDir - path of notes/implemented/.
 */
export function implementedAlternativesProblems(implementedDir) {
  const problems = []
  if (!existsSync(implementedDir)) return problems
  for (const name of readdirSync(implementedDir)) {
    if (!name.endsWith('.md') || name === 'README.md') continue
    if (!NOTE_NAME_PATTERN.test(name)) continue // the naming gate owns that problem
    if (name.slice(0, 10) < ALTERNATIVES_GATE_DATE) continue // grandfathered
    if (!ALTERNATIVES_PATTERN.test(read(join(implementedDir, name)))) {
      problems.push(
        `notes/implemented/${name} carries no 输掉的方案 section — a decision recorded without what it beat invites re-litigation`,
      )
    }
  }
  return problems
}
