---
name: semantic-drift-audit
description: How to find prose that has gone stale — claims in AGENTS.md, ROADMAP.md, README.md and docs/ that no longer match the code and files they point at, which mechanical gates cannot see. Use at a stage close, or after a campaign that touched the entry chain, the docs tier, or a tool's verb set.
whenToUse: After several slices that changed behaviour, commands, rows or verbs; when a doc sentence is suspected of outliving its subject; when a fresh session would be misled by the entry chain. Not a substitute for the mechanical gates — run those first, and never report a suspicion you did not verify.
---

# Semantic drift audit: read the entry chain with fresh eyes

The gates check structure, links, names and command aliases. They cannot see a sentence that is
grammatically perfect and factually dead: a verb list that is two verbs short, an identity row that
says "none" about a plane that shipped, a queue line that contradicts another line written the same
day. Four rounds of this audit have produced 19 such drifts (zero, then six on 2026-09-23, seven
on 2026-09-27, six on 2026-09-28) — every one of them invisible to `pnpm verify`.

## The loop

1. **Delegate to a fresh context, read-only.** The value is in *not* knowing what the change was.
   Give the auditor the entry chain and nothing else; if you brief it with your own summary, you get
   your own blind spots back. Run it as a sub-agent with "read-only, no test suite, time-box ~20
   minutes".
2. **Walk the chain the way a new session does**: `AGENTS.md` → the docs each one links
   (`docs/home.md`, `docs/architecture.md`, `docs/identity.md`, `docs/dev.md`,
   `docs/discipline.md`) → `_backlog/README.md` → `README.md`. Stop where a claim becomes checkable.
3. **Verify every claim against the thing it describes** — the file, the code, the generated catalog,
   or a read-only command. A finding is a pair: *claim* (`file:line`) and *contradicting fact*
   (`file:line` or command output). Suspicions go in a separate list, never in the findings.
4. **Hunt the classes that keep recurring** (all six from the last round were one of these):
   - a **verb or row list** that went short when the tool/composition grew;
   - an **identity or capability row** that still says "none / day 0 / future" about something shipped;
   - a **hardcoded count** in prose (alias counts, package counts) that nobody recomputes;
   - **two lines that disagree**, especially ones written the same day, or a decision recorded as
     pending after it was made;
   - a **dangling pointer** to a sketch, section or card that does not contain it;
   - a **governance claim** ("no agent approves its own work") that the tool seam quietly contradicts;
   - a **doc's list of what something renders/does** that omits an entry the code has;
   - a **pointer hiding in a non-markdown file** (YAML/patch comment) that the link gates never
     scan — found 2026-09-28: `cordis.patch.yml` still cited a `notes/proposed/` path after the
     note graduated to `implemented/`.
5. **Fix in one slice, claim→fact quoted.** Each fix cites what it contradicted; docs-only fixes need
   `pnpm verify` (and `pnpm test` if you touched a package file).
6. **Mechanize the class you can.** When a drift class turns out to be checkable, add a gate for it in
   the same campaign — that is how the *docs ↔ alias table* check was born (it found two real drifts
   on its first run). Adding a gate means a red-green fixture in `tests/tooling/verify-gates.spec.mjs`.

## Hard-won details

- **The entry chain is the corpus.** A drift that only a `notes/` reader would meet is history, not a
  bug — notes record what was true when written. Fix `docs/`, `AGENTS.md`, `_backlog/` READMEs, `README.md`.
- **Same-day self-contradiction is the cheapest signal.** A queue line saying "IM still pending" two
  lines under "IM decided, entry dropped" needed no code reading at all.
- **Numbers in prose expire silently.** Prefer "the count lives in the generated file" over a copied
  number; if you must keep a number, expect the next audit to correct it.
- **Do not let the auditor rewrite.** It reports; the owner of the doc decides, because a fix needs the
  reason the doc said what it said.
- **A clean audit is a result.** Round one found zero drifts; that is worth recording, not hiding.
