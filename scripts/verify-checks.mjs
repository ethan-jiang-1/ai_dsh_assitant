/**
 * Fixture-testable cores of the mechanical gates, consumed by scripts/verify.mjs and pinned by
 * packages/dsh-smart-assistant/tests/verify-gates.spec.mjs.
 *
 * Each exported function takes the paths/inputs it needs and returns a list of problem strings
 * (empty = pass). verify.mjs owns what counts as the corpus and the exit code; these functions
 * own the diagnostics, so every accepted and rejected shape can be exercised against throwaway
 * fixtures without touching the real vendor tree, ROADMAP, or notes. Scope stays deliberately
 * narrow — what each check does and does not claim is written next to it, and the fixtures pin
 * both sides of that line.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const read = path => readFileSync(path, 'utf8')

/** Run git in a directory; undefined (not a crash) when git cannot answer. */
function tryGit(args, cwd) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

// ── submodule pin ────────────────────────────────────────────────────────────────────────────────

/**
 * The vendor/dsh pin against its bookkeeping. Checks four facts:
 *   1. the tree is checked out and declared (.gitmodules);
 *   2. `git describe --tags` matches the tag recorded in vendor/UPSTREAM.md;
 *   3. the checked-out HEAD is the exact SHA recorded in vendor/UPSTREAM.md;
 *   4. no tracked source file under vendor/dsh is modified (untracked build output is exempt —
 *      it is generated, not pinned).
 *
 * Parent gitlink semantics: a divergence between the parent's COMMITTED pointer (`git ls-tree
 * HEAD`) and the checkout is the normal pending tail of a `pnpm sync-dsh` run — the parent
 * commit lands last — so it is allowed exactly when the bookkeeping already matches the new
 * checkout (rule 3); any other divergence is reported by that rule.
 *
 * @param {string} repoRoot - repository root carrying vendor/dsh, vendor/UPSTREAM.md, .gitmodules.
 */
export function pinProblems(repoRoot) {
  const problems = []
  const vendorDsh = join(repoRoot, 'vendor', 'dsh')
  if (!existsSync(join(vendorDsh, 'packages', 'core', 'tools', 'src', 'index.ts'))) {
    return ['vendor/dsh is not checked out — run `git submodule update --init`']
  }
  const gitmodules = existsSync(join(repoRoot, '.gitmodules')) ? read(join(repoRoot, '.gitmodules')) : ''
  if (!gitmodules.includes('vendor/dsh')) problems.push('.gitmodules does not declare vendor/dsh')
  const upstream = existsSync(join(repoRoot, 'vendor', 'UPSTREAM.md')) ? read(join(repoRoot, 'vendor', 'UPSTREAM.md')) : ''
  const tag = /`(dsh-v[0-9][^`]*)`/.exec(upstream)?.[1]
  const sha = /`([0-9a-f]{40})`/.exec(upstream)?.[1]
  if (tag === undefined) problems.push('vendor/UPSTREAM.md does not record the pinned tag')
  if (sha === undefined) problems.push('vendor/UPSTREAM.md does not record the exact SHA')

  const status = tryGit(['status', '--porcelain'], vendorDsh) ?? ''
  for (const line of status.split('\n')) {
    if (line === '' || line.startsWith('??')) continue // untracked artifacts are generated, not pinned
    problems.push(`vendor/dsh has tracked-source changes (rule 4): ${line.trim()}`)
  }

  const head = tryGit(['rev-parse', 'HEAD'], vendorDsh)
  if (head === undefined) problems.push('could not read the submodule HEAD (git rev-parse failed)')
  if (tag !== undefined) {
    const described = tryGit(['describe', '--tags'], vendorDsh)
    if (described === undefined) problems.push('could not read the submodule revision (git describe failed)')
    else if (described !== tag) problems.push(`vendor/dsh is at ${described}, UPSTREAM.md records ${tag}`)
  }
  if (sha !== undefined && head !== undefined && sha !== head) {
    problems.push(`vendor/dsh is checked out at ${head.slice(0, 12)}, UPSTREAM.md records ${sha.slice(0, 12)} (rule 3) — finish or revert the upgrade via pnpm sync-dsh`)
  }
  return problems
}

// ── notes naming & lifecycle state ─────────────────────────────────────────────

/** Notes carry their first-proposal date in the filename: YYYY-MM-DD-topic.md (lowercase slug). */
const NOTE_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/

/** Status words that mean a proposal is done and must have left notes/proposed/. */
export const GRADUATED_STATUS = /状态：\*\*(implemented|rejected|archived|已全部实施|已消化|已毕业|已完成|已实施)/

/** Directory names directly under notes/ that may hold notes. */
const NOTE_SUBDIRECTORIES = ['proposed', 'implemented', 'rejected', 'archived', 'research', 'research/archive']

/** Every top-level entry notes/ may carry besides the note subdirectories. */
const NOTES_ROOT_FILES = new Set(['README.md', 'intents.md', '.gitkeep'])

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
 * and non-markdown files (.gitkeep, intents.md at the notes root) are not notes and are exempt.
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
 * notes/ is a closed classification tree: the lifecycle directories plus the research pair and
 * two root files. An unknown directory is a second home for something and drifts (DSH taxonomy:
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
  return problems
}

/**
 * The state line makes the lifecycle readable at a glance, so the directory and the status word
 * must agree, the filename date must equal the status date, archived notes must carry their
 * freeze line, and rejected notes must carry the one-line reason that keeps them useful. Research
 * states are checked the same way: `research/` is in progress, `research/archive/` is wound up.
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
  const research = join(notesRoot, 'research')
  if (existsSync(research)) {
    for (const name of readdirSync(research)) {
      if (!name.endsWith('.md') || name === 'README.md') continue
      if (!/状态：[^\n]*进行中/.test(read(join(research, name)))) {
        problems.push(`notes/research/${name} must carry 状态：…进行中 — wound-up research moves to research/archive/`)
      }
    }
    const archive = join(research, 'archive')
    if (existsSync(archive)) {
      for (const name of readdirSync(archive)) {
        if (!name.endsWith('.md') || name === 'README.md') continue
        if (!/状态：[^\n]*已收卷/.test(read(join(archive, name)))) {
          problems.push(`notes/research/archive/${name} must carry 状态：…已收卷 — an archived survey is wound up, not in progress`)
        }
      }
    }
  }
  return problems
}

/**
 * AGENTS.md is a standing-orders file (docs/discipline.md: no state sections, no progress marks,
 * no pin numbers). A dated line or a progress mark is exactly the state claim that belongs in
 * ROADMAP.md or a note, so the promise gets a command instead of being remembered.
 *
 * @param {string} agentsPath - path of the root AGENTS.md.
 */
export function agentsMdStabilityProblems(agentsPath) {
  const problems = []
  if (!existsSync(agentsPath)) return problems
  const lines = read(agentsPath).split('\n')
  for (const [index, line] of lines.entries()) {
    if (/\b20\d{2}-\d{2}-\d{2}\b/.test(line)) {
      problems.push(`AGENTS.md:${index + 1} carries a date — standing orders do not age; put the dated record in a note and link it`)
    }
    if (/[✅⏳⏸▶🧹]/.test(line)) {
      problems.push(`AGENTS.md:${index + 1} carries a progress mark — progress lives in ROADMAP.md, not in the entry file`)
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

// ── relative markdown links ─────────────────────────────────────────────────────────────────────

/**
 * A markdown link target counts as a repo path pointer only when it is relative and path-shaped
 * (contains "/" or ends in .md). That keeps prose placeholders like `(url)` or `(…)` out of
 * scope. Anchors and query strings are stripped before the existence check but are NOT
 * validated — heading slugs are out of scope for this gate, as recorded in verify.mjs's scope
 * note.
 *
 * @param {string} target - raw link target from `[text](target)`.
 * @returns {string | null} the path to resolve against the linking file, or null when out of scope.
 */
function relativeMarkdownPath(target) {
  if (target.startsWith('#')) return null // same-file anchor
  let path = target.split('#')[0].split('?')[0]
  if (!path || path.includes(' ') || path.startsWith('/')) return null
  if (!path.includes('/') && !path.endsWith('.md')) return null
  if (/[*<>~$@:'"()]/.test(path)) return null
  return path
}

/**
 * Relative markdown links in the corpus must resolve to existing files (relative to the linking
 * file, standard markdown semantics). URL-decoded targets are checked; anchors are not.
 *
 * @param {{ file: string, where: string }[]} corpus - absolute file paths with display names.
 */
export function relativeLinkProblems(corpus) {
  const problems = []
  for (const { file, where } of corpus) {
    const text = read(file)
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      let decoded = match[1]
      try {
        decoded = decodeURIComponent(decoded)
      } catch {
        // Malformed escapes stay as written; the raw target is what the reader would trip on.
      }
      const rel = relativeMarkdownPath(decoded)
      if (rel === null) continue
      if (!existsSync(resolve(dirname(file), rel))) {
        problems.push(`${where} links to ${match[1]}, which does not exist`)
      }
    }
  }
  return problems
}
