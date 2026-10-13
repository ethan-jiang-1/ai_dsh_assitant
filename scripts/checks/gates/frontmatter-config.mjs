/**
 * Gate cores for frontmatter contracts (skills, playbooks) and config-file parsing.
 */
import { existsSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { read, frontmatterBlock } from './shared.mjs'

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
