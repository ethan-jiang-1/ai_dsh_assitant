/**
 * Fixture-testable cores of the mechanical gates, consumed by scripts/verify.mjs and pinned by
 * packages/dsh-smart-assistant/tests/tooling/verify-gates.spec.mjs.
 *
 * Each exported function takes the paths/inputs it needs and returns a list of problem strings
 * (empty = pass). verify.mjs owns what counts as the corpus and the exit code; these functions
 * own the diagnostics, so every accepted and rejected shape can be exercised against throwaway
 * fixtures without touching the real vendor tree, ROADMAP, or notes. Scope stays deliberately
 * narrow — what each check does and does not claim is written next to it, and the fixtures pin
 * both sides of that line.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { parseRows } from '../generate/gen-catalog.mjs'

const read = path => readFileSync(path, 'utf8')

/** Accept an owning project or its explicit pinned compiler face, not an arbitrary JSON file. */
export function projectReferenceMatches(projectDir, references) {
  const owner = resolve(projectDir)
  return [...references].some(reference => reference === owner
    || reference === join(owner, 'tsconfig.host.json')
    || reference === join(owner, 'tsconfig.client.json'))
}

/** Run git in a directory; undefined (not a crash) when git cannot answer. */
function tryGit(args, cwd) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

// ── gate wiring ──────────────────────────────────────────────────────────────────────────────

/**
 * A check core that exists in verify-checks.mjs but is never invoked by verify.mjs is a script,
 * not a gate — the top-level command would never run it, so no invalid case could reach a real
 * acceptance path. The import statement itself proves nothing about invocation (and neither does
 * a bare name in a comment), so import lines are stripped and the core must be *called* at least
 * once in the runner's body — named import or namespace call both count as wired. Functions only:
 * shared constants (e.g. a status regex) are data for cores and specs, not gates.
 *
 * @param {{ exportedCores: Record<string, unknown>, verifySource: string }} inputs
 */
export function gateWiringProblems({ exportedCores, verifySource }) {
  const problems = []
  const functions = Object.entries(exportedCores).filter(([, value]) => typeof value === 'function')
  if (functions.length === 0) return ['the core module exports no functions — the wiring check has nothing to see']
  const body = verifySource.split('\n').filter(line => !/^\s*import\b/.test(line)).join('\n')
  for (const [name] of functions) {
    if (!body.includes(name)) {
      problems.push(`${name} is exported by verify-checks.mjs but never invoked in the body of verify.mjs (the import line does not count) — a script that exists is not a gate that runs; wire the call or drop the export`)
    }
  }
  return problems
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

/** CJK ideographs: the model-facing surface is English (AGENTS.md language split). */
const CJK_TEXT = /[\u4e00-\u9fff]/

/** Comment-only lines are not model-visible; the language rule leaves existing comments as-is. */
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#)/

/**
 * Model-facing text is English; the browser shell and the preset display name are the Chinese
 * skin face by design. This scans the prompt-and-tool sources plus the skill bodies, skips
 * comment-only lines in TypeScript, and expects the caller to have excluded the skin files.
 *
 * @param {readonly string[]} files - absolute paths to scan (src *.ts, skills *.md).
 */
export function languageGuardProblems(files) {
  const problems = []
  for (const file of files) {
    const isTypeScript = file.endsWith('.ts')
    const lines = read(file).split('\n')
    for (const [index, line] of lines.entries()) {
      if (isTypeScript && COMMENT_LINE.test(line)) continue
      // Markdown skill bodies carry an HTML-comment escape hatch: a vocabulary line that must
      // teach the model a Chinese product word (e.g. threads = 「在跟的事」) is meta-information,
      // not prose — the `<!--` prefix marks it as such. CJK in prose still bites.
      if (file.endsWith('.md') && /^\s*<!--/.test(line)) continue
      if (CJK_TEXT.test(line)) {
        problems.push(`${file}:${index + 1} carries CJK outside a comment — model-facing text is English`)
      }
    }
  }
  return problems
}

/**
 * Managed text is strict UTF-8 and ends with exactly one newline, so a mojibake byte or a
 * missing/extra final newline is a red gate instead of a silent diff.
 *
 * @param {readonly string[]} files - absolute paths to scan.
 */
export function textHygieneProblems(files) {
  const problems = []
  for (const file of files) {
    const bytes = readFileSync(file)
    let text
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      problems.push(`${file} is not valid UTF-8`)
      continue
    }
    if (!text.endsWith('\n')) problems.push(`${file} has no trailing newline`)
    else if (text.endsWith('\n\n')) problems.push(`${file} ends with more than one newline`)
  }
  return problems
}

/**
 * Harness packages are peers, never runtime dependencies (DSH: extension plugins depend on
 * Service Definitions, never concrete providers), and the recorded compatibility list must name
 * the pinned upstream tag so "which release was verified" cannot drift from the submodule.
 *
 * @param {string} packageJsonPath - the plugin package.json.
 * @param {string} upstreamPath - vendor/UPSTREAM.md bookkeeping.
 */
export function dependencyPoseProblems(packageJsonPath, upstreamPath) {
  const problems = []
  const pkg = JSON.parse(read(packageJsonPath))
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (name.startsWith('@deepseek-ai/')) {
        problems.push(`${field}.${name} — harness packages stay peerDependencies so the deployment owns the version`)
      }
    }
  }
  const tag = /钉住的 tag \| `([^`]+)`/.exec(read(upstreamPath))?.[1]
  const pinned = tag === undefined ? undefined : tag.replace(/^dsh-v/, '')
  const releases = Object.keys(pkg.dsh?.compatibility?.dshReleases ?? {})
  if (pinned !== undefined && !releases.includes(pinned)) {
    problems.push(`dsh.compatibility.dshReleases (${releases.join(', ')}) does not name the pinned upstream tag ${pinned}`)
  }
  return problems
}

// ── skill file contract ─────────────────────────────────────────────────────────

/** The loader's public skill-name grammar (`isSkillName` in `@deepseek-ai/dsh-skill`). */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Frontmatter keys the loader rejects outright, with the canonical key that replaced each. */
const LEGACY_INVOCATION_KEYS = new Map([
  ['disableModelInvocation', 'disable-model-invocation'],
  ['modelInvocable', 'disable-model-invocation'],
  ['userInvocable', 'user-invocable'],
])

/** Frontmatter keys whose value the loader requires to be a boolean. */
const BOOLEAN_INVOCATION_KEYS = ['disable-model-invocation', 'user-invocable']

/** The loader's accepted boolean spellings (`frontmatterBoolean` in `dsh-skill-filesystem`). */
const BOOLEAN_WORDS = new Set(['true', 'yes', 'on', 'false', 'no', 'off'])

/** Whether a frontmatter value is one the loader reads as a boolean. */
function isBooleanSpelling(value) {
  return typeof value === 'boolean' || value === 1 || value === 0
    || (typeof value === 'string' && BOOLEAN_WORDS.has(value.toLowerCase()))
}

/**
 * The frontmatter block of a SKILL.md, mirroring the loader's own scan: the first line must be
 * exactly `---` and the block ends at the next line that is exactly `---`.
 *
 * @param {string} text - the skill file's contents.
 * @returns {string | undefined} the block between the delimiters, or undefined when absent.
 */
function frontmatterBlock(text) {
  const firstLineEnd = text.indexOf('\n')
  if (firstLineEnd < 0 || text.slice(0, firstLineEnd).replace(/\r$/, '') !== '---') return undefined
  let lineStart = firstLineEnd + 1
  while (lineStart <= text.length) {
    const nextNewline = text.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? text.length : nextNewline
    if (text.slice(lineStart, lineEnd).replace(/\r$/, '') === '---') return text.slice(firstLineEnd + 1, lineStart)
    if (nextNewline < 0) return undefined
    lineStart = nextNewline + 1
  }
  return undefined
}

/**
 * Every SKILL.md — curated (model-facing) or development (.agents/skills, discovered by the
 * provider's `project-agents` root) — carries frontmatter whose `name` matches its directory and
 * a non-empty `description`. The loader silently ignores a malformed skill, so the shape is gated.
 *
 * The frontmatter is parsed with the same YAML dialect the loader uses, not scanned with regular
 * expressions: a plain scalar containing `: ` (`whenToUse: … shape: who does what`) is a YAML
 * parse error, which made two curated skills invisible — present on disk, absent from the catalog,
 * each load answering "unknown". A gate that only reads lines cannot see that.
 *
 * @param {string} skillsDir - a directory of <name>/SKILL.md bundles.
 */
export function skillFrontmatterProblems(skillsDir) {
  const problems = []
  if (!existsSync(skillsDir)) return problems
  for (const name of readdirSync(skillsDir)) {
    const file = join(skillsDir, name, 'SKILL.md')
    if (!existsSync(file)) {
      problems.push(`${name}/ has no SKILL.md`)
      continue
    }
    const text = read(file)
    const block = frontmatterBlock(text)
    if (block === undefined) {
      problems.push(`${name}/SKILL.md does not start with frontmatter`)
      continue
    }
    let data
    try {
      data = parseYaml(block)
    } catch (error) {
      problems.push(`${name}/SKILL.md frontmatter is not parsable YAML: ${String(error).split('\n')[0]}`)
      continue
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      problems.push(`${name}/SKILL.md frontmatter is not a mapping`)
      continue
    }
    if (data.name !== name) {
      problems.push(`${name}/SKILL.md declares name ${typeof data.name === 'string' ? data.name : '(none)'}`)
    }
    if (!SKILL_NAME.test(name)) problems.push(`${name}/ is not a valid skill name (kebab-case)`)
    if (typeof data.description !== 'string' || data.description.trim().length === 0) {
      problems.push(`${name}/SKILL.md has no description`)
    }
    for (const [legacy, canonical] of LEGACY_INVOCATION_KEYS) {
      if (Object.hasOwn(data, legacy)) problems.push(`${name}/SKILL.md uses unsupported "${legacy}"; use "${canonical}"`)
    }
    for (const key of BOOLEAN_INVOCATION_KEYS) {
      if (Object.hasOwn(data, key) && !isBooleanSpelling(data[key])) {
        problems.push(`${name}/SKILL.md sets "${key}" to a non-boolean value`)
      }
    }
  }
  return problems
}

/**
 * Method drafts staged in `_backlog/methods/` are flat `<name>.md`
 * files carrying a small SKILL-shaped frontmatter contract for predictable agent consumption.
 *
 * They need their own check because this project's long-lived method area is not a serving skill home:
 * `skillFrontmatterProblems` cannot reach its flat files. Without this, a draft could sit in
 * `_backlog/` with unparsable or mismatched frontmatter. The name must equal the file's basename so
 * references remain stable, and the description must be non-empty because it is the routing summary.
 *
 * Problem text reports the area by its real directory name (derived from `stagingDir`), so renaming
 * the area cannot leave the gate pointing at a path that no longer exists.
 *
 * @param {string} stagingDir - path of the staging directory, `_backlog/methods/`.
 */
export function playbookFrontmatterProblems(stagingDir) {
  const problems = []
  if (!existsSync(stagingDir)) return problems
  const label = `_backlog/${basename(stagingDir)}`
  for (const entry of readdirSync(stagingDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') continue
    const file = join(stagingDir, entry.name)
    const expected = entry.name.slice(0, -'.md'.length)
    const text = read(file)
    const block = frontmatterBlock(text)
    if (block === undefined) {
      problems.push(`${label}/${entry.name} does not start with frontmatter (a playbook is SKILL-shaped from the start)`)
      continue
    }
    let data
    try {
      data = parseYaml(block)
    } catch (error) {
      problems.push(`${label}/${entry.name} frontmatter is not parsable YAML: ${String(error).split('\n')[0]}`)
      continue
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      problems.push(`${label}/${entry.name} frontmatter is not a mapping`)
      continue
    }
    if (data.name !== expected) {
      problems.push(`${label}/${entry.name} declares name ${typeof data.name === 'string' ? data.name : '(none)'} — the method area's stable name must match the basename`)
    }
    if (typeof data.description !== 'string' || data.description.trim().length === 0) {
      problems.push(`${label}/${entry.name} has no description`)
    }
    if (typeof data.whenToUse !== 'string' || data.whenToUse.trim().length === 0) {
      problems.push(`${label}/${entry.name} has no whenToUse`)
    }
  }
  return problems
}

// ── config files parse ──────────────────────────────────────────────────────────

/** The overlay loader resolves `!!js` scalars; the gate only needs the YAML layer to accept them. */
const YAML_JS_TAG = { tag: 'tag:yaml.org,2002:js', resolve: value => String(value) }

/**
 * Every composition file we own must parse as YAML. This exists because a change to
 * `dev/probes/session/preset-runner.patch.yml` shipped with a template-literal `!!js` scalar that the overlay's
 * tag resolver rejects — `verify` and `test` stayed green while the runner could not boot at all.
 * A patch file is boot-time input; parsing it is the cheapest member of that evidence layer.
 *
 * @param {readonly string[]} files - composition/patch YAML files.
 */
export function configParseProblems(files) {
  const problems = []
  for (const file of files) {
    try {
      parseYaml(read(file), { customTags: [YAML_JS_TAG] })
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
      problems.push(`${file} does not parse as YAML: ${message}`)
    }
  }
  return problems
}

// ── package subpaths ───────────────────────────────────────────────────────────

/**
 * Every patch in this repo that names one of our package subpaths is a load-bearing reference:
 * a dev probe that resolves `dsh-smart-assistant/preset-runner` at runtime breaks the moment that
 * export is renamed, with no compile-time signal.
 *
 * The historical exports check read only `cordis.patch.yml`, which never references `preset-runner`
 * at all — so the four dev runner patches were unguarded, and renaming that single export would have
 * broken all of them while `verify` stayed green (found by audit, 2026-10-10).
 *
 * The corpus is passed in rather than discovered here: `verify.mjs` owns "what counts as corpus",
 * and a caller that forgets a patch is a visible gap instead of a silent one.
 *
 * @param options - `{ sources, exported }`; `sources` is `[{ file, text }]`, `exported` the manifest's
 *   `exports` keys.
 * @returns problem strings, empty when every referenced subpath is exported.
 */
export function packageSubpathProblems({ sources, exported }) {
  const problems = []
  const subpaths = new Set(Object.keys(exported).map(key => key.replace(/^\.\//, '')).filter(key => key !== '' && key !== 'package.json'))
  let references = 0
  for (const { file, text } of sources) {
    for (const match of text.matchAll(/name:\s*'?(dsh-smart-assistant\/[a-z0-9-]+)'?/g)) {
      references++
      const subpath = match[1].slice('dsh-smart-assistant/'.length)
      if (!subpaths.has(subpath)) {
        problems.push(`${file} references dsh-smart-assistant/${subpath}, which package.json does not export — renaming an export breaks every patch that names it`)
      }
    }
  }
  if (references === 0) problems.push('no patch references a dsh-smart-assistant subpath — the exports check has nothing to compare against')
  return problems
}

// ── identity names ─────────────────────────────────────────────────────────────

/**
 * `docs/identity.md` is the single authority for identity names, and its row-id cell is a hand copy
 * of what the patch mounts — so it rots in both directions, not just one. The historical check only
 * asked "does every mounted row appear in identity.md", which cannot see a rename: the new id gets
 * added, the dead id stays, and `verify` goes green while the page still advertises a row that no
 * longer exists (found by audit, 2026-10-10; reproduced with a rename fixture).
 *
 * Names are read from backticked tokens **in the rows that own them** (「插件行 id」/「工具 wire 名」),
 * not page-wide. The page legitimately writes counter-examples in prose — a note like "不要写成
 * `assistant-Memory`" would otherwise be read as a claim and red the check on good documentation.
 * Reading only the owning rows keeps the reverse direction honest without punishing explanation.
 *
 * @param options - `{ patchText, avatars, identityText }`; `avatars` maps a source label to its text.
 * @returns problem strings, empty when the page and the code agree.
 */
export function identityNameProblems({ patchText, avatars, identityText }) {
  const problems = []
  const rowLine = label => {
    const line = identityText.split('\n').find(candidate => candidate.includes(label) && candidate.trimStart().startsWith('|'))
    return line === undefined ? '' : line
  }
  const rowIdLine = rowLine('插件行 id')
  const toolLine = rowLine('工具 wire 名')
  // A row-id *claim* is an id the cell annotates with its plane — `` `assistant-x`（agent） ``. The
  // cell also names non-row vocabulary in backticks (the `assistant-` prefix itself, the
  // `assistant-operating` dataDir, config keys like `denyToolPrefix`), and the annotation convention
  // is exactly what separates "this is one of our rows" from "this word appears nearby".
  const rowNames = new Set([...rowIdLine.matchAll(/`(assistant-[a-z0-9]+(?:-[a-z0-9]+)*)`（(?:host|agent)/g)].map(match => match[1]))
  const toolNames = new Set([...toolLine.matchAll(/`(assistant_[a-z0-9]+(?:_[a-z0-9]+)*)`/g)].map(match => match[1]))
  if (rowNames.size === 0) {
    problems.push('docs/identity.md declares no `assistant-` row ids — the reverse check cannot verify a page that names nothing')
  }

  const rows = parseRows(patchText)
  const mounted = new Set(rows.map(row => row.id))
  const ourRows = rows
    .filter(row => row.name !== undefined && /^dsh-smart-assistant(\/|$)/.test(row.name))
    .map(row => row.id)
  if (ourRows.length === 0) {
    problems.push('cordis.patch.yml declares no dsh-smart-assistant rows — the identity check has nothing to compare against')
  }

  // Forward: a mounted row must be named in the row-id line.
  for (const id of ourRows) {
    if (!rowNames.has(id)) problems.push(`row id ${id} is not in docs/identity.md`)
  }
  // Reverse: a row id the page names must really be mounted (catches the dead id after a rename).
  for (const id of rowNames) {
    if (!mounted.has(id)) {
      problems.push(`docs/identity.md names row id ${id}, but cordis.patch.yml mounts no such row — a renamed or deleted row left a dead id behind`)
    }
  }

  // Tool wire names: the same two directions against the sources that declare them.
  const declaredTools = new Set()
  for (const source of Object.values(avatars)) {
    for (const match of source.matchAll(/name:\s*'(assistant_[a-z_]+)'/g)) declaredTools.add(match[1])
  }
  if (declaredTools.size === 0) problems.push('no assistant_* tool names found in src')
  for (const name of declaredTools) {
    if (!toolNames.has(name)) problems.push(`tool name ${name} is not in docs/identity.md`)
  }
  for (const name of toolNames) {
    if (!declaredTools.has(name)) {
      problems.push(`docs/identity.md names tool ${name}, but no src module declares it — a renamed tool left a dead name behind`)
    }
  }

  if (!identityText.includes('assistantMemory')) problems.push('docs/identity.md does not record the ctx key')
  return problems
}

// ── composition rows: the hand-copied plane trees ───────────────────────────────

/**
 * `docs/architecture.md` §二 is a hand-copied diff of the generated catalog's 组合行 table: two
 * plane trees naming the rows `cordis.patch.yml` mounts. Prose has no freshness check, and this
 * copy has the most surface to rot — the audited drift class is "the composition grew, the tree
 * stayed short" (a row mounts with no line in the picture). Two directions, both mechanical:
 *
 *   · every row the patch mounts under our own package name must be named by a §二 tree line;
 *   · every row id those tree lines name must be a real row in the patch.
 *
 * Only the §二 fenced blocks count: they are the composition picture; a prose mention elsewhere is
 * not one. Capture covers both shapes the trees use — `├── id` / `└── id` and the indented `+ id 行`
 * continuation — so a restyled tree fails loud instead of passing by naming nothing.
 *
 * @param options - `{ patchText, architectureText }`.
 * @returns problem strings, empty when the trees and the patch agree.
 */
export function compositionRowProblems({ patchText, architectureText }) {
  const problems = []
  const rows = parseRows(patchText)
  const mounted = new Set(rows.map(row => row.id))
  const ourRows = rows
    .filter(row => row.name !== undefined && /^dsh-smart-assistant(\/|$)/.test(row.name))
    .map(row => row.id)

  const start = architectureText.indexOf('## 二、')
  const end = architectureText.indexOf('\n## 三、', start)
  if (start < 0 || end < 0) {
    return ['docs/architecture.md carries no §二/§三 heading pair — the composition-tree slice cannot be cut; restore the section titles before trusting this gate']
  }
  const named = new Set()
  let inFence = false
  for (const line of architectureText.slice(start, end).split('\n')) {
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (!inFence) continue
    const match = /^\s*(?:[├└]──|[+])\s*([a-z][a-z0-9-]*)/.exec(line)
    if (match !== null) named.add(match[1])
  }

  for (const id of ourRows) {
    if (!named.has(id)) {
      problems.push(`composition: cordis.patch.yml mounts row ${id} but no §二 plane-tree line in docs/architecture.md names it — the composition grew and the hand copy stayed short`)
    }
  }
  for (const id of named) {
    if (!mounted.has(id)) {
      problems.push(`composition: docs/architecture.md §二 names row ${id} but cordis.patch.yml mounts no such row — the hand copy kept a row that is gone`)
    }
  }
  return problems
}

// ── dev tooling home boundary ───────────────────────────────────────────────────

/**
 * Dev tooling must never read the inherited `DSH_HOME`: a session environment may carry the daily
 * `~/.dsh`, and the repository's rule is that everything dev-shaped points at `dev/harness-home`
 * (the only explicit exit is `ASSISTANT_DSH_HOME`; `dev/env/dsh.mjs` owns the override warning and
 * is out of scope here). Found the hard way: the first run of the usage dashboard read the daily
 * home and reported 553 sessions that were not ours.
 *
 * @param {readonly string[]} files - dev tooling files.
 */
/**
 * The docs' commands and `package.json` must agree, both ways.
 *
 * Why: the front door rotted exactly here — `README.md` advertised an npm-publish path that no alias
 * ever provided, and nothing failed. Docs drift silently because prose has no freshness check; this
 * gives the two directions a mechanical one (2026-09-27):
 *   · every `pnpm <name>` in a current doc must be an alias (or a pnpm builtin);
 *   · every alias must be named in at least one current doc, so adding one cannot skip documentation.
 * "At least one" rather than "the root command table": a generator documented in the dev manual is
 * findable, and forcing the root table to list every generator would bloat the one place that must stay
 * short. Notes are deliberately outside the corpus: they record what was true when written.
 * @param options - `{ scripts, documents }`.
 * @returns problem strings, empty when the two sides agree.
 */
export function commandAliasProblems({ scripts, documents, ownerPath }) {
  const problems = []
  const aliases = new Set(Object.keys(scripts))
  // pnpm's own subcommands, which are not aliases and never will be
  const builtins = new Set(['install', 'exec', 'add', 'dlx', 'run', 'pack', 'publish', 'why', 'outdated',
    'list', 'update', 'rebuild', 'config', 'store', 'import', 'link', 'prune', 'start', 'deploy', 'licenses'])
  for (const { path: file, text } of documents) {
    for (const match of text.matchAll(/\bpnpm (?:run )?([a-z][a-z0-9:_-]*)/gu)) {
      const name = match[1]
      if (aliases.has(name) || builtins.has(name)) continue
      problems.push(`${file} names \`pnpm ${name}\`, which is not a script in package.json — the doc outlived the alias`)
    }
  }
  if (documents.length === 0) {
    problems.push('the document corpus is empty — alias coverage cannot be checked')
    return problems
  }
  const allText = documents.map(document => document.text).join('\n')
  for (const name of aliases) {
    if (!new RegExp(`\\bpnpm (?:run )?${name}\\b`, 'u').test(allText)) {
      problems.push(`alias \`pnpm ${name}\` is named in no current doc — a command nobody documents is a command nobody finds`)
    }
  }
  return problems
}

/**
 * The startup path is the one thing a fresh agent must get right on its first read, and it is the
 * only thing here that fails *before* any tooling can help. Two skips each produce a misleading
 * error: no `dev/env/prepare.sh` and the boot libs are missing (setup.sh's guard is the only thing that
 * says so), no `bash dev/env/setup.sh` and DSH answers `profile "dev" does not exist; create it with
 * 'dsh plugin --profile dev add <package>'` — which points at a template profile carrying neither
 * this plugin nor the roster. So the command table's startup block is pinned to three facts: both
 * preparatory scripts are marked as the first step and come before any launch, and the block names
 * both profiles (each is the only place its surface — preset behaviour vs host smoke — is verifiable).
 */
export function startPathProblems({ agentsPath, source }) {
  const problems = []
  if (typeof source !== 'string' || source.length === 0) {
    problems.push(`${agentsPath} was not read (or is empty) — the startup path cannot be checked`)
    return problems
  }
  const lines = source.split('\n')
  // A server-launching command is `dsh … --profile …` minus the two boot-free diagnostics: those
  // never need a profile to exist, so they must not be mistaken for the thing setup.sh precedes.
  const launches = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includes('--profile') && !line.includes('--dump-config') && !line.includes('--help'))
  // Order matters: prepare builds the vendor artifacts, setup.sh then builds the profiles.
  let lastIndex = -1
  for (const script of ['dev/env/prepare.sh', 'dev/env/setup.sh']) {
    // A fencing/indent-tolerant extraction: a shell comment sits on the same line, and the command
    // itself may be `bash dev/env/prepare.sh`, `./dev/env/setup.sh`, or a bare path copy-paste.
    const line = lines.find(candidate => candidate.includes(script))
    if (line === undefined) {
      problems.push(`${agentsPath} names ${script} nowhere — a fresh clone has no way to reach a runnable instance`)
      return problems
    }
    const index = lines.indexOf(line)
    if (!/首次|前置|先跑|先执行|\bfirst\b/iu.test(line)) {
      problems.push(`${agentsPath}:${index + 1} names ${script} without saying it is the first step — an unmarked step is a step agents skip`)
    }
    const early = launches.find(launch => launch.index < index && launch.index > lastIndex)
    if (early) {
      problems.push(`${agentsPath}:${early.index + 1} launches a profile before ${script} (line ${index + 1}) — that order boots the "profile does not exist" failure`)
    }
    lastIndex = index
  }
  const startup = launches.filter(({ index }) => index > lastIndex).map(({ line }) => line).join('\n')
  for (const profile of ['dev', 'dev-task']) {
    if (!new RegExp(`--profile ${profile}\\b`, 'u').test(startup)) {
      problems.push(`${agentsPath} never launches profile \`${profile}\` after dev/env/setup.sh — one of the two dev surfaces lost its route`)
    }
  }
  return problems
}

export function dshHomeInheritanceProblems(files) {
  const problems = []
  for (const file of files) {
    // The launcher (dev/env/dsh.mjs) is this rule's enforcement, not its violation: it reads
    // inherited DSH_HOME only to override it and warn on stderr. Exempting it by exact path
    // keeps the rule's bite for every other dev tool — the verify-gates fixture pins both
    // sides (the launcher passes, a sibling one directory up still fires).
    if (file.endsWith(join('dev', 'env', 'dsh.mjs'))) continue
    const lines = read(file).split('\n')
    for (const [index, line] of lines.entries()) {
      if (!/process\.env\.DSH_HOME/.test(line)) continue
      if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue
      problems.push(`${file}:${index + 1} reads process.env.DSH_HOME — dev tooling must use ASSISTANT_DSH_HOME or the repo dev home`)
    }
  }
  return problems
}

// ── vendor client-face freshness ────────────────────────────────────────────────────────────────

/** Newest mtime (ms) among `src/**` .ts/.tsx files under one package; undefined when there is no src. */
function newestSrcMtime(packageDir) {
  const srcDir = join(packageDir, 'src')
  if (!existsSync(srcDir)) return undefined
  let newest
  const visit = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) visit(path)
      else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        const mtime = statSync(path).mtimeMs
        newest = newest === undefined ? mtime : Math.max(newest, mtime)
      }
    }
  }
  visit(srcDir)
  return newest
}

/**
 * Vendored browser artifacts must not be older than the sources they were built from. A pin
 * switch rewrites vendor sources and leaves the gitignored `lib/client.js` builds behind, and a
 * partially rebuilt client face set fractures the web boot (new client bundles against a stale
 * `api/remotes` assembly left a fresh home on a full-screen "Failed to load plugins" — evidence:
 * notes/archived/2026-09-30-dsh-0-2-0-rc-2-pin.md, 2026-10-03 补正). Skips, and why:
 *   - a package without `lib/client.js` has no built face yet (fresh clone; `prepare.sh` owns that);
 *   - `packages/experimental/` hosts preview-only faces whose packages declare no `bundle` script,
 *     so the rebuild playbook cannot refresh them and they are not in the served composition;
 *   - a missing `apps/web/dist/index.html` means the shell was never built here (`prepare.sh`).
 *
 * @param {string} vendorPackagesRoot - path of `vendor/dsh/packages`.
 * @param {string} webAppRoot - path of `vendor/dsh/apps/web` (its `src` and `dist` are compared).
 * @returns {string[]} problem strings; empty = every present client face and the web dist are fresh.
 */
export function vendorClientFreshnessProblems({ vendorPackagesRoot, webAppRoot }) {
  const problems = []
  for (const group of readdirSync(vendorPackagesRoot).sort()) {
    if (group === 'experimental') continue
    const groupDir = join(vendorPackagesRoot, group)
    if (!statSync(groupDir).isDirectory()) continue
    for (const pkg of readdirSync(groupDir).sort()) {
      const packageDir = join(groupDir, pkg)
      const libClient = join(packageDir, 'lib', 'client.js')
      if (!statSync(packageDir).isDirectory() || !existsSync(libClient)) continue
      const newest = newestSrcMtime(packageDir)
      if (newest !== undefined && statSync(libClient).mtimeMs < newest) {
        const face = `${join('vendor/dsh/packages', group, pkg)}/lib/client.js`
        problems.push(`${face} is older than its sources — rebuild the WHOLE stale set, then the web shell (a partial rebuild fractures the client): pnpm --dir <pkg> run bundle && pnpm --dir vendor/dsh/apps/web run build`)
      }
    }
  }
  const distIndex = join(webAppRoot, 'dist', 'index.html')
  if (existsSync(distIndex)) {
    let newest = newestSrcMtime(join(webAppRoot))
    for (const pkg of readdirSync(join(vendorPackagesRoot, 'client')).sort()) {
      const mtime = newestSrcMtime(join(vendorPackagesRoot, 'client', pkg))
      if (mtime !== undefined) newest = newest === undefined ? mtime : Math.max(newest, mtime)
    }
    if (newest !== undefined && statSync(distIndex).mtimeMs < newest) {
      problems.push('vendor/dsh/apps/web/dist is older than client sources — rebuild the web shell: pnpm --dir vendor/dsh/apps/web run build')
    }
  }
  return problems
}

// ── manual export ────────────────────────────────────────────────────────────────────────────────

/**
 * The exported install manual (`_dist/安装手册.md`) is the only tracked artifact of a manual
 * distribution: the tarball next to it is gitignored, so a version bump without a re-export would
 * otherwise leave a manual advertising a tarball that no longer exists. This gate pins the manual's
 * header table to the package manifest. No manual = nothing exported yet = nothing to check (the
 * gate must stay green on fresh clones, where `_dist/` does not exist).
 */
export function exportManualProblems({ manualPath, manifest, upstreamTag }) {
  if (!existsSync(manualPath)) return []
  const text = read(manualPath)
  const problems = []
  const version = /^\| 版本 \| `?([^`|\n]+?)`? \|$/m.exec(text)?.[1]?.trim()
  if (version !== manifest.version) {
    problems.push(`manual 版本 row says ${version ?? 'nothing'}, package.json says ${manifest.version} — rerun \`pnpm export-dist\``)
  }
  const expected = `${manifest.name}-${manifest.version}.tgz`
  // The generator appends a suffix（与本手册同目录）after the filename, so only the backticked
  // token itself is pinned — anchoring the row end red-lined the real artifact (the fixtures
  // mirror the generated shape, so this cannot regress silently).
  const tarball = /^\| 安装包 \| `([^`]+)`/m.exec(text)?.[1]?.trim()
  if (tarball !== expected) {
    problems.push(`manual 安装包 row says ${tarball ?? 'nothing'}, expected ${expected}`)
  }
  // The 验证基线 row pins the DSH tag the manual was verified against. It went stale once for
  // real (0.1.7 → 0.2.0 pin bump without a re-export) because only the version row was gated.
  const baseline = /^\| 验证基线 \| DSH `([^`|]+)`/m.exec(text)?.[1]?.trim()
  if (!baseline) {
    problems.push('manual 验证基线 row is missing — rerun `pnpm export-dist`')
  } else if (upstreamTag && baseline !== upstreamTag) {
    problems.push(`manual 验证基线 row says ${baseline}, vendor/UPSTREAM.md pins ${upstreamTag} — rerun \`pnpm export-dist\``)
  }
  return problems
}

/**
 * Backlog liveness (borrowed 2026-10-02 from ai_dsh_loop_advisor/_backlog's `backlog-liveness`,
 * owner-directed): the deliberation space's own mechanical gate. Three checks, all structural —
 * they never judge a card's content:
 *
 * 1. the institution's directories exist (issues / bugs / research / methods and the _archive pools);
 * 2. every issue and bug card opens with frontmatter whose first field is status, plus opened
 *    (and severity on a bug). Research files open with topic and a one-line intent.
 * 3. index membership: every card or research file is named by its area's index. A card moved
 *    without the index update is the drift the gate exists for. Missing link targets are the
 *    relative-link gate.
 *
 * @param {string} backlogRoot - path of the _backlog/ directory.
 */
export function backlogLivenessProblems(backlogRoot) {
  const problems = []
  const requiredDirs = [
    'issues', 'bugs', 'research', 'methods',
    join('_archive', 'settled_issues'), join('_archive', 'suspended_issues'),
    join('_archive', 'fixed_bugs'), join('_archive', 'suspended_bugs'),
    join('_archive', 'research'),
  ]
  for (const dir of requiredDirs) {
    if (!existsSync(join(backlogRoot, dir))) problems.push(`_backlog/${dir} is missing (the institution's directories are part of the charter)`)
  }
  if (!existsSync(backlogRoot)) return problems

  const cardNames = (dir) => readdirSync(join(backlogRoot, dir), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map(entry => entry.name)

  const cardStatus = {
    issues: new Set(['推敲中', '等人拍板']),
    bugs: new Set(['活跃']),
    [join('_archive', 'settled_issues')]: new Set(['已结']),
    [join('_archive', 'suspended_issues')]: new Set(['叫停']),
    [join('_archive', 'fixed_bugs')]: new Set(['已修']),
    [join('_archive', 'suspended_bugs')]: new Set(['待修']),
  }
  const topicByDir = { positioning: '定位', upstream: '上游', 'tech-exploration': '技术' }
  const headProblems = (text, where, expect) => {
    const block = frontmatterBlock(text)
    if (block === undefined) {
      problems.push(`${where} has no frontmatter`)
      return
    }
    let data
    try {
      data = parseYaml(block)
    } catch (error) {
      problems.push(`${where} frontmatter is not parsable YAML: ${String(error).split('\n')[0]}`)
      return
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      problems.push(`${where} frontmatter is not a field map`)
      return
    }
    const keys = Object.keys(data)
    if (expect.kind === 'card') {
      if (keys[0] !== 'status') problems.push(`${where} frontmatter must start with status`)
      else if (!expect.statuses.has(String(data.status))) problems.push(`${where} status ${JSON.stringify(data.status)} is not a status of this shelf`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.opened ?? ''))) problems.push(`${where} frontmatter needs opened: YYYY-MM-DD`)
      if (expect.bug && !['P0', 'P1', 'P2'].includes(data.severity)) problems.push(`${where} frontmatter needs severity: P0, P1, or P2`)
    } else {
      if (keys[0] !== 'topic') problems.push(`${where} frontmatter must start with topic`)
      else if (expect.topic !== undefined && data.topic !== expect.topic) problems.push(`${where} topic ${JSON.stringify(data.topic)} does not match its directory (${expect.topic})`)
      if (typeof data.intent !== 'string' || data.intent.trim() === '' || data.intent.includes('\n')) problems.push(`${where} frontmatter needs a one-line intent`)
    }
  }

  // Active cards: frontmatter status first, then index membership.
  for (const area of ['issues', 'bugs']) {
    const areaDir = join(backlogRoot, area)
    if (!existsSync(areaDir)) continue
    const index = readFileSync(join(areaDir, 'README.md'), 'utf8')
    for (const name of cardNames(area)) {
      const where = `_backlog/${area}/${name}`
      headProblems(readFileSync(join(areaDir, name), 'utf8'), where, { kind: 'card', statuses: cardStatus[area], bug: area === 'bugs' })
      if (!index.includes(name)) problems.push(`${where} is not named by ${area}/README.md's active index`)
    }
  }

  // Research material is named by its area's index. Topic subdirectories are part of the
  // layout, so the walk follows them; a nested file that escapes the index is an unlisted file.
  const markdownNames = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return markdownNames(join(dir, entry.name), join(prefix, entry.name))
    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') return [join(prefix, entry.name)]
    return []
  })
  for (const [dir, indexPath, label] of [
    ['research', join('research', 'README.md'), 'research/README.md'],
    [join('_archive', 'research'), join('_archive', 'research', 'README.md'), '_archive/research/README.md'],
  ]) {
    const fullDir = join(backlogRoot, dir)
    if (!existsSync(fullDir)) continue
    const index = readFileSync(join(backlogRoot, indexPath), 'utf8')
    for (const name of markdownNames(fullDir)) {
      const where = `_backlog/${dir}/${name}`
      const parent = name.includes('/') ? name.slice(0, name.indexOf('/')) : ''
      headProblems(readFileSync(join(fullDir, name), 'utf8'), where, { kind: 'research', topic: topicByDir[parent] })
      if (!index.includes(name)) problems.push(`${where} is not named by ${label}'s index`)
    }
  }

  // Settled, suspended and fixed cards are flat files named by the pool README.
  for (const dir of [
    join('_archive', 'settled_issues'), join('_archive', 'suspended_issues'),
    join('_archive', 'fixed_bugs'), join('_archive', 'suspended_bugs'),
  ]) {
    const fullDir = join(backlogRoot, dir)
    if (!existsSync(fullDir)) continue
    const indexPath = join(dir, 'README.md')
    const index = readFileSync(join(backlogRoot, indexPath), 'utf8')
    const bug = dir.endsWith('bugs')
    for (const name of cardNames(dir)) {
      const where = `_backlog/${dir}/${name}`
      headProblems(readFileSync(join(fullDir, name), 'utf8'), where, { kind: 'card', statuses: cardStatus[dir], bug })
      if (!index.includes(name)) problems.push(`${where} is not named by ${indexPath}'s index`)
    }
  }
  return problems
}

/**
 * Liveness proves that a card exists and is indexed, but not that it still belongs in the active area.
 * An explicit closure verdict must therefore be checked separately from deliberation status.
 * “可关闭：是” and “关闭条件 = 已满足” are current wording; legacy fields remain accepted so old cards
 * keep their protection. Partial delivery, missing evidence and pending user choices are not closure.
 * Only the first 12 lines are read, so historical verdicts quoted in discussion do not close a card.
 * The exported name stays stable for the runner and existing fixtures.
 * @param {string} backlogRoot - path of the _backlog/ directory.
 */
export function backlogGraduationProblems(backlogRoot) {
  const problems = []
  const plansDir = join(backlogRoot, 'issues')
  if (!existsSync(plansDir)) return problems

  // Require a complete verdict token: 是否/是非未定 are questions, not closure declarations.
  const CLOSABLE = /可关闭\s*[：:=＝]\s*\**\s*是\**\s*(?=[｜|\n（(]|$)/
  const CLOSURE_MET = /关闭条件(?:判断)?\s*[：:=＝]\s*\**\s*(?:已满足|已通过|已过)\**\s*(?=[｜|\n（(]|$)/
  // Existing cards keep their old field; renaming prose must not remove their protection.
  const GATE_DONE = /毕业门(?:判断)?\s*[=＝]\s*\**\s*(?:已过|已通过|已毕业)/
  // A status field that *is* a completion word ("状态：**已毕业**"). Anchored immediately after the
  // field label, so "状态：推敲中｜毕业门判断 = 该做…" can never match by reaching across the ｜.
  const STATUS_DONE = /状态：\**\s*(?:已全部实施|已消化|已毕业|已完成|已实施)/
  // "已交付" is ordinary mid-flight wording ("S1 已交付，S2 进行中"), so it counts only as the
  // *terminal* content of the status field — the shape a card uses once every slice has landed.
  // Without the lookahead this pattern red-lines every partially delivered card and gets turned off.
  const STATUS_DELIVERED = /状态：\**\s*[^｜|\n]*已交付\**\s*(?=｜|$)/
  const signals = [CLOSABLE, CLOSURE_MET, GATE_DONE, STATUS_DONE, STATUS_DELIVERED]

  const plansIndex = join(plansDir, 'README.md') // issues/README.md, the active ledger
  const index = existsSync(plansIndex) ? read(plansIndex) : ''

  for (const entry of readdirSync(plansDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') continue
    // Only the header is read: a card may legitimately *discuss* completion deeper in its
    // body (an evidence section quoting a passing gate) without being finished.
    const head = read(join(plansDir, entry.name)).split('\n').slice(0, 12).join('\n').replaceAll('**', '')
    if (!signals.some(pattern => pattern.test(head))) continue
    const stillListed = index.includes(entry.name)
    problems.push(
      `_backlog/issues/${entry.name} declares closure conditions met but still sits in issues/` +
      `${stillListed ? ' and is still named by issues/README.md\'s active list' : ''}` +
      ` — close it with \`git mv\` to _backlog/_archive/settled_issues/ and add its index row`,
    )
  }
  return problems
}

/**
 * Test-asset naming: the file shapes under the package tests tree and the web-face scene
 * tree must match the naming table in docs/testing.md ("新增测试资产形态先入本表再落文件").
 * Code files that are neither spec nor harness would still RUN or sit silently outside
 * every lane's vocabulary — the gate makes the table's rule mechanical. `fixtures/`-style
 * subdirectories are exempt (the upstream convention for fixture trees); they join the
 * table when one actually appears. Web-face scenes must carry their contract files
 * (snapshot.yml + README.md, per snapshots/AGENTS.md) or a year later nobody can replay
 * them.
 */
export function testAssetNamingProblems(repoRoot) {
  const problems = []
  const testsDir = join(repoRoot, 'packages', 'dsh-smart-assistant', 'tests')
  if (existsSync(testsDir)) {
    const inspect = (dir, relativeDir = '') => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const relativePath = relativeDir === '' ? entry.name : join(relativeDir, entry.name)
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          // Upstream fixture/support trees are containers, not test lanes. Their contents are
          // intentionally outside the naming vocabulary until a lane adopts them explicitly.
          if (entry.name === 'fixtures' || entry.name === 'support') continue
          inspect(full, relativePath)
          continue
        }
        if (!entry.isFile() || !/\.(ts|mjs|tsx|js)$/.test(entry.name)) continue
        if (/\.spec\.(ts|mjs|tsx|js)$/.test(entry.name)) continue
        if (/harness\.(ts|mjs)$/.test(entry.name)) continue
        problems.push(`packages/dsh-smart-assistant/tests/${relativePath}: not an admitted test-asset shape (*.spec.* / *harness.*) — enter the naming table in docs/testing.md first`)
      }
    }
    inspect(testsDir)
  }
  const webFace = join(repoRoot, 'snapshots', 'web-face')
  if (existsSync(webFace)) {
    for (const scenario of readdirSync(webFace)) {
      const dir = join(webFace, scenario)
      if (!statSync(dir).isDirectory()) {
        problems.push(`snapshots/web-face/${scenario}: a scene is a directory, not a loose file`)
        continue
      }
      for (const required of ['snapshot.yml', 'README.md']) {
        if (!existsSync(join(dir, required))) {
          problems.push(`snapshots/web-face/${scenario}: missing ${required} — the scene contract must be recorded beside the fixture (snapshots/AGENTS.md)`)
        }
      }
    }
  }
  return problems
}

// ── client classic-script safety ─────────────────────────────────────────────────────────────────

/** Recursively collect .ts files under a directory (the client source tree is flat today). */
function collectTsFiles(directory) {
  const out = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...collectTsFiles(full))
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

/**
 * The browser half's classic-script safety, end to end (S2, 261007 bigfile-split).
 *
 * Since tsdown took over the client build, `src/client` is a multi-module source tree and the
 * served artifact is the ONE classic script the entry compiles to (`lib/client/index.js`).
 * The old per-file "no imports/exports at all" shape is gone; what still breaks the page is:
 *   1. an empty src/client — package.json's dsh.client declaration promises a browser half;
 *   2. a BARE EXTERNAL runtime import in any module (`from '<not ./ ../>'`, or a bare
 *      `import '<not ./ ../>'`): every runtime dependency must come through the factory's
 *      module-table require (runtime.ts), or the bundle either leaves it external (parse
 *      error in the combo) or inlines code the page already carries. Relative imports are
 *      expected — the bundler inlines them. Type-only imports in the `import type` form are
 *      erased at emit and stay allowed (inline `{ type X }` specifiers are NOT exempt — the
 *      unambiguous form is the gate). Runtime exports between modules are fine: the bundler
 *      inlines them, and only the entry submits its surface, through `__ModuleLoader__.load`,
 *      which the entry module must still name;
 *   3. a bundle that exists but does not parse as a classic script or lost the facade call —
 *      `new Function` is the honest check (`node --check` is a false negative under Node's
 *      module-syntax detection). A missing lib is not a failure: verify runs on fresh clones
 *      before the first build, and the source gate above is always active.
 *
 * @param {{ clientDir: string, bundlePath: string }} paths - the client source tree and the
 *   expected single-file bundle.
 * @returns {string[]} problem strings (empty = pass).
 */
export function clientScriptSafetyProblems({ clientDir, bundlePath }) {
  const problems = []
  const files = existsSync(clientDir) ? collectTsFiles(clientDir) : []
  if (files.length === 0) {
    return ['src/client is empty — the dsh.client declaration in package.json promises a browser half']
  }
  for (const path of files) {
    const where = `src/client/${relative(clientDir, path)}`
    const text = read(path)
    // Clause imports: `import x from 'y'` / `import * as ns from 'y'` / `import { a } from 'y'`
    // (braces may span lines, hence the [^'"]+ which crosses newlines). `import type` is exempt.
    for (const match of text.matchAll(/^[ \t]*import\s+(?!type\b)[^'"]+?from\s*['"]([^'"]+)['"]/gm)) {
      if (!/^[.]{1,2}\//.test(match[1])) {
        problems.push(`${where} has a bare external runtime import ('${match[1]}') — the browser half takes every runtime dependency through the factory require; only relative imports and import type are allowed`)
      }
    }
    // Bare side-effect imports: `import 'y'`.
    for (const match of text.matchAll(/^[ \t]*import\s*['"]([^'"]+)['"]/gm)) {
      if (!/^[.]{1,2}\//.test(match[1])) {
        problems.push(`${where} has a bare external side-effect import ('${match[1]}') — the browser half takes every runtime dependency through the factory require`)
      }
    }
    if (path === join(clientDir, 'index.ts') && !text.includes('__ModuleLoader__')) {
      problems.push(`${where} never touches __ModuleLoader__ — the entry must submit a factory registration through the page-global facade`)
    }
  }
  // A missing bundle is not a failure (fresh clones have no lib yet); when it exists it must
  // carry the facade call and parse as a classic script.
  if (existsSync(bundlePath)) {
    const bundle = read(bundlePath)
    if (!bundle.includes('__ModuleLoader__')) {
      problems.push('lib/client/index.js never touches __ModuleLoader__ — run pnpm build after changing the browser half')
    }
    try {
      void new Function(bundle)
    } catch (error) {
      problems.push(`lib/client/index.js does not parse as a classic script (${String(error)}) — the combo it rides in would kill every later registration at browser boot`)
    }
  }
  return problems
}

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
 * Note-card pointers must resolve wherever they hide, and inside notes/ they must be markdown
 * links. Two escape classes found by audit live here: a `notes/…​.md` path inside a patch YAML
 * comment (no link gate scans non-markdown — the 2026-09-28 and 2026-10-08 escapes both rode
 * that blind spot), and a bare full-filename mention in prose that outlives the file it names
 * (notes/README.md:「note 之间只用相对 Markdown 链接」).
 *
 * @param {{ repoRoot: string, files: Array<{file: string, where: string, text: string}> }} input
 */
export function notePointerProblems({ repoRoot, files }) {
  const problems = []
  // The lookbehind keeps repo-relative pointers in scope and tails of larger paths out of it:
  // `/Users/other/ai_dsh_company/notes/…` (external provenance) and
  // `vendor/dsh/.agents/notes/implemented/AGENTS.md` (a vendor link target) are not our pointers.
  const pathPattern = /(?<![A-Za-z0-9._/-])notes\/(?:proposed|implemented|archived|rejected)\/[A-Za-z0-9._/-]+\.md/g
  for (const { file, where, text } of files) {
    const inNotes = file.split(/[/\\]/).includes('notes')
    for (const match of text.matchAll(pathPattern)) {
      if (!existsSync(join(repoRoot, ...match[0].split('/')))) {
        problems.push(`${where} references \`${match[0]}\`, which does not exist — repoint it (or inline the reason) in the same diff that deletes or moves the note`)
        continue
      }
      const linked = match.index >= 2 && text.slice(match.index - 2, match.index) === ']('
      if (inNotes && !linked) {
        problems.push(`${where} mentions \`${match[0]}\` as bare text — note references use relative markdown links (notes/README.md)`)
      }
    }
  }
  return problems
}
