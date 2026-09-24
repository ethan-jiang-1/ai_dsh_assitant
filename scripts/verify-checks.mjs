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

// ── notes naming & proposal status ───────────────────────────────────────────────────────────────

/** Notes carry their first-proposal date in the filename: YYYY-MM-DD-topic.md (lowercase slug). */
const NOTE_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/

/** Status words that mean a proposal is done and must have left notes/proposed/. */
export const GRADUATED_STATUS = /已全部实施|已消化|已毕业|已完成|已实施/

/**
 * Note filenames under the note-bearing subdirectories follow YYYY-MM-DD-topic.md. README.md
 * and non-markdown files (.gitkeep, intents.md at the notes root) are not notes and are exempt.
 *
 * @param {string} notesRoot - path of the notes/ directory.
 */
export function notesNamingProblems(notesRoot) {
  const problems = []
  for (const sub of ['proposed', 'implemented', 'rejected', 'postmortem', 'research']) {
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
 * Every proposal carries a bold `状态：**…**` line. The graduation gate reads that line; a
 * proposal without one is invisible to it forever, so the shape itself is checked.
 *
 * @param {string} proposedDir - path of notes/proposed/.
 */
export function proposalStatusProblems(proposedDir) {
  const problems = []
  if (!existsSync(proposedDir)) return problems
  for (const name of readdirSync(proposedDir)) {
    if (!name.endsWith('.md')) continue
    const status = /状态：\*\*([^*]*)\*/.exec(read(join(proposedDir, name)))?.[1]
    if (status === undefined) {
      problems.push(`${name} carries no bold 状态： line — the graduation gate cannot see its state`)
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
