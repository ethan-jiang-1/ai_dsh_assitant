/**
 * The home's map: the text the agent reads to know what its home is and where things live,
 * plus the compact blurb that rides in the always-on digest.
 *
 * The map is written for the agent, so it is in English like the persona and the skills;
 * the repo's own contracts (`docs/`) are in the maintainer's language. The map is generated
 * only when missing — a hand-edited map is never overwritten.
 *
 * @module dsh-smart-assistant/home/home-map
 */

import type { HomePaths } from './layout.ts'

/** File name of the home map. */
export const HOME_MAP_FILE_NAME = 'HOME.md'

/**
 * The blurb that rides in every digest: what the home is, in as few bytes as the agent needs
 * to know that `recall` and `HOME.md` exist.
 */
export const HOME_MAP_BLURB = [
  'Your home is a directory that outlives this session. Four rooms, one job each:',
  '- `memory/` settled facts, preferences, and decisions (recall when the digest is not enough)',
  '- `research/` unresolved threads — open or parked, with three exits: promote, park, drop',
  '- `skills/` procedures you wrote for yourself, loaded by name like any other skill',
  '- `knowledge/` domain pages that interlink — search them with `assistant_knowledge`',
  'Write through `assistant_memory`, `assistant_research`, and `assistant_reflect`; those tools',
  'validate the file format and keep the rooms consistent. `assistant_memory action=curate`',
  'reports what has rotted. The full map is `HOME.md` in the home root.',
].join('\n')

/**
 * Render the full home map.
 * @param paths - Resolved home paths, so the map names the real locations.
 * @returns Markdown contents for `HOME.md`.
 */
export function renderHomeMap(paths: HomePaths): string {
  return `# Your home

This directory outlives every session. What you keep here is what you will still know tomorrow;
what you do not keep is gone. Three rooms, one job each — do not mix them.

| Room | Holds | Lifecycle |
|---|---|---|
| \`memory/\` | Facts, preferences, and decisions that stay true | \`active\` → superseded or retired → \`archive/\` |
| \`research/\` | Threads you have not resolved: a question, why it matters, your current lean | \`open\` / \`parked\` → promoted or dropped → \`archive/\` |
| \`skills/\` | Procedures worth reusing, in the harness skill format | edited in place; loaded by name; retired (out of the catalog, recoverable) → \`archive/\` |
| \`knowledge/\` | Domain pages that interlink: concepts, entities, sources, how-things-work | \`draft\` → reviewed → \`stable\`; \`deprecated\` stays in place so links keep resolving |

## Retiring a skill

A skill you never load is catalog weight every request pays for. \`curate\` reports skills past
their use-by date (stale, then retirement-ready, by the usage ledger). When one is dead, retire it:

- **retire** — \`assistant_reflect action=retire_skill\`: the bundle moves to \`skills/archive/\`
  and stops loading immediately. Nothing is deleted — moving it back restores it.

## The three exits for a thread

A thread is not a task. It is a question with a lean. Every thread ends one of three ways:

- **promote** — the question got answered: it becomes a memory record (a fact or decision) or a skill.
- **park** — still valid, not now: it stays in \`research/\` but leaves the digest.
- **drop** — wrong, moot, or not worth it: it moves to \`research/archive/\` **with a required reason**.

The reason is the point. A thread dropped without one gets reopened by a future session that has
the same idea; a thread dropped with "we tried X, it broke Y" does not.

## What is always in front of you, and what is not

Only a bounded digest of this home rides in your context: the map blurb, the strongest active
memories, and the count of open threads. Everything else — full records, archived entries, skill
bodies — is fetched on demand. That is deliberate: a home that crowds out the work in front of you
makes you worse, not better.

## Keeping it worth reading

\`assistant_memory action=curate\` is a machine check over these files: near-duplicates, dangling
references, malformed headers, digest budget pressure, threads that have not moved, drops without
a reason, skills the loader would silently ignore, learned skills shadowed by a same-named
curated one, and skills past their use-by date. It finds candidates; you decide. Run it when
the digest reports over-budget, after a session of real learning, or when you suspect rot.

## Layout on disk

\`\`\`text
${paths.root}/
├── HOME.md
├── skill-usage.json    (load counts; advisory, safe to delete)
├── memory/            (active records; archive/ for superseded or retired)
├── research/          (open and parked threads; archive/ for promoted or dropped)
├── skills/            (<name>/SKILL.md, discovered by the skill provider; archive/ for retired)
└── knowledge/         (<id>.md pages with [[wikilinks]]; deprecated pages stay in place)
\`\`\`

Load \`memory-hygiene\` before writing memory, \`research-backlog\` before opening or closing a
thread, \`home-curation\` before tidying, and \`self-reflection\` before turning an experience
into a skill.
`
}
