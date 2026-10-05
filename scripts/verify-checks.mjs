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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'

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

/** Directory names directly under notes/ that may hold notes (archived/research = wound-up survey ledger). */
const NOTE_SUBDIRECTORIES = ['proposed', 'implemented', 'rejected', 'archived', 'archived/research']

/** Every top-level entry notes/ may carry besides the note subdirectories. */
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
 * notes/ is a closed classification tree: the lifecycle directories, the wound-up survey ledger
 * and two root files. An unknown directory is a second home for something and drifts (DSH taxonomy:
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
 * freeze line, and rejected notes must carry the one-line reason that keeps them useful. The
 * wound-up survey ledger (`archived/research/`) keeps its own loose rule: a survey line says 已收卷.
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
  const surveyLedger = join(notesRoot, 'archived', 'research')
  if (existsSync(surveyLedger)) {
    for (const name of readdirSync(surveyLedger)) {
      if (!name.endsWith('.md') || name === 'README.md') continue
      if (!/状态：[^\n]*已收卷/.test(read(join(surveyLedger, name)))) {
        problems.push(`notes/archived/research/${name} must carry 状态：…已收卷 — an archived survey is wound up, not in progress`)
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

// ── language guard, text hygiene, dependency posture ─────────────────────────────

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

// ── dev tooling home boundary ───────────────────────────────────────────────────

/**
 * Dev tooling must never read the inherited `DSH_HOME`: a session environment may carry the daily
 * `~/.dsh`, and the repository's rule is that everything dev-shaped points at `dev/harness-home`
 * (the only explicit exit is `ASSISTANT_DSH_HOME`; `scripts/dsh.mjs` owns the override warning and
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
 * error: no `dev/prepare.sh` and the boot libs are missing (setup.sh's guard is the only thing that
 * says so), no `bash dev/setup.sh` and DSH answers `profile "dev" does not exist; create it with
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
  for (const script of ['dev/prepare.sh', 'dev/setup.sh']) {
    // A fencing/indent-tolerant extraction: a shell comment sits on the same line, and the command
    // itself may be `bash dev/prepare.sh`, `./dev/setup.sh`, or a bare path copy-paste.
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
      problems.push(`${agentsPath} never launches profile \`${profile}\` after dev/setup.sh — one of the two dev surfaces lost its route`)
    }
  }
  return problems
}

export function dshHomeInheritanceProblems(files) {
  const problems = []
  for (const file of files) {
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
 * notes/implemented/2026-09-30-dsh-0-2-0-rc-2-pin.md, 2026-10-03 补正). Skips, and why:
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
export function exportManualProblems({ manualPath, manifest }) {
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
  return problems
}

/**
 * Backlog liveness (borrowed 2026-10-02 from ai_dsh_loop_advisor/_backlog's `backlog-liveness`,
 * owner-directed): the deliberation space's own mechanical gate. Three checks, all structural —
 * they never judge a card's content:
 *
 * 1. the institution's directories exist (plans / bugs / reference and the five _done pools);
 * 2. every active card carries its status line (the hukou: 立卡 + 状态 within the first 12 lines,
 *    per the plans/ and bugs/ card templates) — a dead draft cannot hide;
 * 3. index membership both ways: every card file is named by its area's index (plans/ and bugs/
 *    active lists, _done/_closed_plans/ index, _done/README archive rows) — a card moved without
 *    the index update is the drift the gate exists for.
 *
 * @param {string} backlogRoot - path of the _backlog/ directory.
 */
export function backlogLivenessProblems(backlogRoot) {
  const problems = []
  const requiredDirs = [
    'plans', 'bugs', 'reference',
    join('_done', '_closed_plans'), join('_done', '_fixed_bugs'),
    join('_done', '_suspended_plans'), join('_done', '_suspended_bugs'), join('_done', '_reference'),
  ]
  for (const dir of requiredDirs) {
    if (!existsSync(join(backlogRoot, dir))) problems.push(`_backlog/${dir} is missing (the institution's directories are part of the charter)`)
  }
  if (!existsSync(backlogRoot)) return problems

  const cardNames = (dir) => readdirSync(join(backlogRoot, dir), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map(entry => entry.name)

  // Active cards: status line within the first 12 lines (the hukou), then index membership.
  for (const area of ['plans', 'bugs']) {
    const index = readFileSync(join(backlogRoot, area, 'README.md'), 'utf8')
    for (const name of cardNames(area)) {
      const head = readFileSync(join(backlogRoot, area, name), 'utf8').split('\n').slice(0, 12).join('\n')
      if (!head.includes('状态：')) problems.push(`_backlog/${area}/${name} carries no 状态： line in its first 12 lines (the hukou rule)`)
      if (!index.includes(name)) problems.push(`_backlog/${area}/${name} is not named by ${area}/README.md's active index`)
    }
  }

  // reference/ material is named by its area's index (the contract in reference/README.md).
  // Since 2026-10-05 material may live in topic subdirectories — the walk must follow the
  // layout, or subdir files silently escape the index cross-check (coverage follows layout).
  if (existsSync(join(backlogRoot, 'reference'))) {
    const refIndex = readFileSync(join(backlogRoot, 'reference', 'README.md'), 'utf8')
    const refNames = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      if (entry.isDirectory()) return refNames(join(dir, entry.name), join(prefix, entry.name))
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') return [join(prefix, entry.name)]
      return []
    })
    for (const name of refNames(join(backlogRoot, 'reference'))) {
      if (!refIndex.includes(name)) problems.push(`_backlog/reference/${name} is not named by reference/README.md's index`)
    }
  }

  // Archive membership: every archived card is named by its pool's index.
  const archiveIndexes = {
    [join('_done', '_closed_plans')]: join('_done', '_closed_plans', 'README.md'),
    [join('_done', '_fixed_bugs')]: join('_done', '_fixed_bugs', 'README.md'),
    [join('_done', '_suspended_plans')]: join('_done', 'README.md'),
    [join('_done', '_suspended_bugs')]: join('_done', 'README.md'),
    [join('_done', '_reference')]: join('_done', 'README.md'),
  }
  for (const [dir, indexPath] of Object.entries(archiveIndexes)) {
    const fullDir = join(backlogRoot, dir)
    if (!existsSync(fullDir)) continue
    const index = readFileSync(join(backlogRoot, indexPath), 'utf8')
    for (const name of cardNames(dir)) {
      if (!index.includes(name)) problems.push(`_backlog/${dir}/${name} is not named by ${indexPath}'s index`)
    }
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
