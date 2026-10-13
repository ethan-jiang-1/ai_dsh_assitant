/**
 * Gate cores over the tracked markdown corpus: relative links, machine-local
 * absolute paths, scratch-path confinement, corpus shape, and note-card pointers.
 */
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { read, COMMENT_LINE } from './shared.mjs'

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

// ── language guard, text hygiene, dependency posture ─────────────────────────────

/**
 * Machine-local absolute paths must not appear in shared repo prose: a checkout path or home
 * directory baked into a document breaks for everyone else, and it is the kind of provenance that
 * belongs in `notes/` (the registered home for external sourcing) rather than in a contract or a
 * card. The caller decides the corpus and keeps `notes/` out of it.
 *
 * Extracted from an inline closure in `verify.mjs` on 2026-10-08, when the rule was extended to the
 * active deliberation space: the check had no fixture because nothing could exercise it. Corpus
 * policy stays with the caller (per scripts/AGENTS.md, logic and corpus live apart).
 *
 * @param {Array<{file: string, where: string}>} corpus - files to scan, with display paths.
 */
export function machineLocalPathProblems(corpus) {
  const problems = []
  for (const { file, where } of corpus) {
    if (MACHINE_LOCAL_PATH.test(read(file))) {
      problems.push(`${where} cites a machine-local absolute path — provenance belongs in notes/`)
    }
  }
  return problems
}

/** `/Users/...` (macOS) or a path-initial `/home/...` (Linux). Deliberately not matching `home/` mid-word. */
const MACHINE_LOCAL_PATH = /\/Users\/|(?<![a-z])\/home\//

/**
 * Temporary files live under `<repo>/.tmp/` (root AGENTS.md hard rule 8): the file sandbox only
 * permits the session workspace, so a write to the system temp root comes back as a permission
 * prompt — one human click per stray file, which is what makes a fully automatic run impossible.
 * This flags the two forms that would do it from a live repo-owned surface: an explicit temp-root
 * path literal, and a Node `os.tmpdir()` call that takes whatever the environment hands over.
 * Historical prose in `notes/` and `_backlog/` stays out of the caller's corpus, and `vendor/dsh`
 * ships its own policy.
 *
 * `allowTmpdir` is per file and exists for surfaces whose whole run redirects `TMPDIR` into the
 * repo (the package's vitest config does that for tests) — the exemption tracks that mechanism
 * rather than a list of forgiven filenames, so removing the redirect turns the calls red again.
 *
 * @param {Array<{file: string, where: string, allowTmpdir?: boolean}>} corpus - files to scan.
 */
export function scratchPathProblems(corpus) {
  const problems = []
  for (const { file, where, allowTmpdir = false } of corpus) {
    // Comments describe the rule instead of doing the write ("we redirect the temp root because a
    // write there is denied"); the same carve-out the language guard makes. Markdown has no
    // comment syntax the reader would skip, so a heading or prose line that spells out a path
    // still counts there.
    const skipComments = !file.endsWith('.md')
    const lines = read(file).split('\n')
    for (const [index, line] of lines.entries()) {
      if (skipComments && COMMENT_LINE.test(line)) continue
      const literal = SCRATCH_PATH_LITERAL.test(line)
      const tmpdirCall = !allowTmpdir && SCRATCH_TMPDIR_CALL.test(line)
      // A shell `mktemp` builds its directory wherever it is told to; with no repo path on the line
      // that is the system temp root again. Written plainly because the corpus excludes this
      // directory: the gate names the forms it forbids, so it must not police its own source.
      const shellMktemp = SCRATCH_MKTEMP.test(line) && !line.includes('.tmp')
      if (literal || tmpdirCall || shellMktemp) {
        problems.push(`${where}:${index + 1} points at scratch outside the repo — temporary files belong under the repo's .tmp/ (hard rule 8)`)
      }
    }
  }
  return problems
}

/** An absolute temp-root path with a name under it — that path is outside the workspace by definition. */
const SCRATCH_PATH_LITERAL = /(?<![\w.])[/\\]tmp[/\\][\w.-]/

/** A `tmpdir()` call, bare or as `os.tmpdir()`: fine only where the run redirects that root (see `allowTmpdir`). */
const SCRATCH_TMPDIR_CALL = /(?<![\w.$])tmpdir\s*\(\)/

/** The shell verb that creates a temp directory: legitimate only with a `.tmp/` target on the same line. */
const SCRATCH_MKTEMP = /\bmktemp\b/

// ── corpus shape & note-card pointers ───────────────────────────────────────────────────────────

/**
 * The markdown corpus = every tracked .md file, minus the frozen deliberation pool
 * (`_backlog/_archive/`: archived cards keep their historical prose by policy —
 * research/README.md「归档默认不展开阅读」). The previous hand-picked corpus (root + docs + notes +
 * snapshots) left the dev/, packages/, scripts/ and .agents/ entry files unchecked, and both live
 * broken links found by the 2026-10-10 audit hid exactly there — the corpus must move with the
 * repo, not with a remembered list of "the files that matter".
 *
 * @param {string[]} trackedPaths - `git ls-files` output (repo-relative, forward slashes).
 * @param {string} repoRoot
 */
export function markdownCorpusFromTracked(trackedPaths, repoRoot) {
  return trackedPaths
    .filter(path => path.endsWith('.md'))
    .filter(path => !path.split('/').includes('_archive'))
    .map(path => join(repoRoot, ...path.split('/')))
}

/**
 * Note- and backlog-card pointers must resolve wherever they hide, and inside notes/ note
 * references must be markdown links. Escape classes found by audit live here: a `notes/…​.md`
 * or `_backlog/…​.md` path inside a patch-YAML comment or dev script header (no link gate scans
 * non-markdown — the 2026-09-28, 2026-10-08 and 2026-10-12 escapes all rode that blind spot),
 * and a bare full-filename mention in prose that outlives the file it names
 * (notes/README.md:「note 之间只用相对 Markdown 链接」).
 *
 * @param {{ repoRoot: string, files: Array<{file: string, where: string, text: string}> }} input
 */
export function notePointerProblems({ repoRoot, files }) {
  const problems = []
  // The lookbehind keeps repo-relative pointers in scope and tails of larger paths out of it:
  // `/Users/other/ai_dsh_company/notes/…` (external provenance) and
  // `vendor/dsh/.agents/notes/implemented/AGENTS.md` (a vendor link target) are not our pointers.
  // Two pointer families, same existence rule. The second (backlog cards) exists because cards
  // move into _archive/ when they close — a comment that cites `_backlog/issues/<card>.md` goes
  // stale the moment that card settles (the 2026-10-12 round found exactly that in dev/*.mjs);
  // the link-form rule stays notes/-internal, so it applies to the notes family only.
  const pointerPatterns = [
    {
      re: /(?<![A-Za-z0-9._/-])notes\/(?:proposed|implemented|archived|rejected)\/[A-Za-z0-9._/-]+\.md/g,
      linkedRule: true,
    },
    {
      re: /(?<![A-Za-z0-9._/-])_backlog\/(?:issues|bugs|research|methods|_archive)\/[A-Za-z0-9._/-]+\.md/g,
      linkedRule: false,
    },
  ]
  for (const { file, where, text } of files) {
    const inNotes = file.split(/[/\\]/).includes('notes')
    for (const { re, linkedRule } of pointerPatterns) {
      re.lastIndex = 0
      for (const match of text.matchAll(re)) {
        if (!existsSync(join(repoRoot, ...match[0].split('/')))) {
          problems.push(`${where} references \`${match[0]}\`, which does not exist — repoint it (or inline the reason) in the same diff that deletes or moves the target`)
          continue
        }
        if (!linkedRule) continue
        const linked = match.index >= 2 && text.slice(match.index - 2, match.index) === ']('
        if (inNotes && !linked) {
          problems.push(`${where} mentions \`${match[0]}\` as bare text — note references use relative markdown links (notes/README.md)`)
        }
      }
    }
  }
  return problems
}
