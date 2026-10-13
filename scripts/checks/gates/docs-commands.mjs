/**
 * Gate cores for the docs command surface and dev-tooling environment routing:
 * command aliases, the startup path, and the DSH_HOME inheritance boundary.
 */
import { join } from 'node:path'
import { read } from './shared.mjs'

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

/**
 * Dev tooling must never read the inherited `DSH_HOME`: a session environment may carry the daily
 * `~/.dsh`, and the repository's rule is that everything dev-shaped points at `dev/harness-home`
 * (the only explicit exit is `ASSISTANT_DSH_HOME`; `dev/env/dsh.mjs` owns the override warning and
 * is out of scope here). Found the hard way: the first run of the usage dashboard read the daily
 * home and reported 553 sessions that were not ours.
 *
 * @param {readonly string[]} files - dev tooling files.
 */
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
