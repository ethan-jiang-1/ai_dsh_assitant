/**
 * The home's operating manual: the text that rides in the system prompt's guidance section
 * and is seeded as `AGENTS.md` in the home root (the industry name; DSH's native instruction
 * loader reads AGENTS.md files from the workspace and the harness home — this one is the
 * home's own, loaded by this plugin's section, so the convention is shared and the paths
 * never collide).
 *
 * The manual is written for the agent, so it is in English like the persona and the skills;
 * the repo's own contracts (`docs/`) are in the maintainer's language. The file is generated
 * only when missing — a hand-edited manual is never overwritten — and carries a scaffold
 * version marker so `curate` can report a manual that predates the current scaffold without
 * fighting hand edits (content edits are the owner's; the marker is the machine's).
 *
 * @module dsh-smart-assistant/home/home-map
 */

import type { HomePaths } from './layout.ts'

/** File name of the home's operating manual (the AGENTS.md convention). */
export const AGENTS_FILE_NAME = 'AGENTS.md'

/** Version of the generated manual; bump when the generated content changes meaningfully. */
export const HOME_MANUAL_VERSION = 4

/** The version marker stamped as the file's first line (an HTML comment: invisible when rendered). */
export const HOME_MANUAL_MARKER = `<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`

/**
 * Parse a manual's scaffold version from its marker. A file without a marker (hand-written
 * from scratch, or predating versioning) reads as version 0.
 * @param text - The manual's contents.
 * @returns The parsed version, or 0 when unmarked.
 */
export function parseManualVersion(text: string): number {
  const match = /^<!--\s*home-manual v(\d+)\s*-->/u.exec(text.trimStart())
  return match?.[1] !== undefined ? Number(match[1]) : 0
}

/**
 * The blurb that rides in every digest: the manual above carries how the home works, so this
 * is only the live-status pointer — that `SOUL.md` and `AGENTS.md` are the agent's own files,
 * and that the digest is bounded on purpose.
 */
export const HOME_STATUS_BLURB = [
  'Live status of your working folder. The manual above (`AGENTS.md`) is how it works, your voice',
  'is `SOUL.md`, and both are files in your working folder root — yours to read and edit. Only',
  'this bounded status rides in every request; `recall` and `assistant_reflect` fetch the rest',
  'on demand.',
].join('\n')

/**
 * Render the full home manual.
 * @param paths - Resolved home paths, so the manual names the real locations.
 * @returns Markdown contents for `AGENTS.md`.
 */
export function renderHomeManual(paths: HomePaths): string {
  return `${HOME_MANUAL_MARKER}
# Your working folder — operating manual

This directory outlives every session. What you keep here is what you will still know tomorrow;
what you do not keep is gone. Four rooms, one job each — do not mix them. Who you are lives in
\`SOUL.md\` next to this file; this manual is how the working folder works.

| Room | Holds | Lifecycle |
|---|---|---|
| \`memory/\` | Facts, preferences, and decisions that stay true | \`active\` → superseded or retired → \`archive/\` |
| \`research/\` | Threads you have not resolved: a question, why it matters, your current lean | \`open\` / \`parked\` → promoted or dropped → \`archive/\` |
| \`skills/\` | Procedures worth reusing, in the harness skill format | edited in place; loaded by name; retired (out of the catalog, recoverable) → \`archive/\` |
| \`knowledge/\` | Domain pages that interlink: concepts, entities, sources, how-things-work | \`draft\` → reviewed → \`stable\`; \`deprecated\` stays in place so links keep resolving |

## The three exits for a thread

A thread is not a task. It is a question with a lean. Every thread ends one of three ways:

- **promote** — the question got answered: it becomes a memory record, a knowledge page, or a skill.
- **park** — still valid, not now: it stays in \`research/\` but leaves the digest.
- **drop** — wrong, moot, or not worth it: it moves to \`research/archive/\` **with a required reason**.

The reason is the point. A thread dropped without one gets reopened by a future session that has
the same idea; a thread dropped with "we tried X, it broke Y" does not.

## Retiring a skill

A skill you never load is catalog weight every request pays for. \`curate\` reports skills past
their use-by date (stale, then retirement-ready, by the usage ledger). When one is dead, retire it
with \`assistant_reflect action=retire_skill\`: the bundle moves to \`skills/archive/\` and stops
loading immediately. Nothing is deleted — moving the bundle back restores it.

## What is always in front of you, and what is not

Three things ride in every request: your identity (\`SOUL.md\`), this manual (\`AGENTS.md\`), and a
bounded digest of the working folder's live state — the strongest active memories and the open
threads. Everything else — full records, archived entries, skill bodies, knowledge pages — is
fetched on demand. That is deliberate: a working folder that crowds out the work in front of you
makes you worse, not better.

## Past conversations

Every session you have ever had is on disk: \`<harness-home>/sessions/--<normalized-cwd>--/session-<id>/session.v3.jsonl.zstd\`
(the harness home is your working folder's parent directory). Each line is one event — full user and assistant
messages, tool calls with their arguments, session headers naming the cwd and preset. Nothing indexes
them; when memory is not enough and you need what was actually said or done, search them with the
recipe in the \`session-recall\` skill.

## Keeping it worth reading

\`assistant_memory action=curate\` is a machine check over these files: near-duplicates, dangling
references, malformed headers, digest budget pressure, threads that have not moved, drops without
a reason, skills the loader would silently ignore, learned skills shadowed by a same-named
curated one, and skills past their use-by date. It finds candidates; you decide. Run it when the
digest reports over-budget, after a session of real learning, or when you suspect rot.

## Layout on disk

\`\`\`text
${paths.root}/
├── SOUL.md            (your identity; seeded, never overwritten)
├── AGENTS.md          (this manual; seeded, never overwritten)
├── skill-usage.json   (load counts; advisory, safe to delete)
├── memory/            (active records; archive/ for superseded or retired)
├── research/          (open and parked threads; archive/ for promoted or dropped)
├── skills/            (<name>/SKILL.md, discovered by the skill provider; archive/ for retired)
└── knowledge/         (<id>.md pages with [[wikilinks]]; deprecated pages stay in place)
\`\`\`

Load \`memory-hygiene\` before writing memory, \`research-backlog\` before opening or closing a
thread, \`knowledge-craft\` before writing a knowledge page, \`session-recall\` before searching
past conversations, \`home-curation\` before tidying, and \`self-reflection\` before turning an
experience into a skill.
`
}
