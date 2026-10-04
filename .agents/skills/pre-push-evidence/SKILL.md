---
name: pre-push-evidence
description: How to pick the minimal credible evidence for a change surface before committing or handing over — which gate actually fails for which kind of edit, and which combinations are known to give false green. Use at the end of a slice, or when unsure whether typecheck/test/verify is enough.
whenToUse: Choosing what to run before a commit or handover; deciding whether a change needs a build, a live probe, or a release smoke. Not a substitute for semantic review.
---

# Pick evidence by change surface

"Run everything" is not a plan when one of the commands silently proves nothing for your change
(and a build-dependent test can pass against a stale artifact). Route by surface:

| Surface you touched | Minimal credible evidence |
|---|---|
| pure core (`src/home`, `memory`, `research`, `skills`, `knowledge`, `tool-support`) | package `pnpm test` (the unit specs own these behaviors) |
| `src/client/` browser half | the **whole package suite**, not just the spec you touched: `client-brand.spec.ts` asserts the complete slot-registration surface, so adding one registration reds a spec you never opened (this happened — P1-B landed red and the fixture followed two commits later) **+ both web-face scenes re-run** (`pnpm web-expected` against an isolated home) — unit green while a recorded scene went silently stale for a day (the approve-direct-call console change landed after blank-first-open was recorded; caught 2026-10-05 by building the second scene) |
| model-visible surface (tool description, prompt section, persona, digest) | `pnpm build` **then** the real-composition test **then** a live probe (`repo-live-probe`) |
| `src/index.ts` service behavior | `pnpm test` (service-level specs construct a real cordis context) + the composition test |
| `scripts/verify*.mjs` | the new/changed check's **red fixture** in `tests/verify-gates.spec.mjs` + `pnpm verify` |
| `docs/` and `notes/` | `pnpm verify` (links, self-containment, notes shape, entry-file stability) |
| `package.json` exports / patch rows / preset composition | `pnpm gen-catalog` (freshness) + `pnpm build` + `pnpm release-smoke` |
| the pin (`vendor/`) | `pnpm sync-dsh -- --tag <tag>` owns its own chain; never hand-edit |

## Rules that keep the evidence honest

- **Name the lane by the file's suffix.** Test-asset shapes are the shared vocabulary —
  `*.spec.*` unit lane, web-face scenes, and the reserved `e2e`/`snapshot`/`bench` forms live in
  [docs/testing.md](../../../docs/testing.md)'s naming table (mechanically enforced by the
  `test assets:` verify gate). When the user names a lane, that table is what maps the word to a
  command and a regression semantics.
- **Build before trusting `lib/`-consuming tests.** The composition and release-smoke specs read
  the built package; without `pnpm build` they assert yesterday's code and go green anyway.
- **A new gate without a red fixture is a claim, not a guard.** Introduce the regression, watch it
  fail, revert — then report the gate as covering the case.
- **Report only what actually ran.** A blocked or skipped check is reported as blocked with its
  reason; it never joins the green list.
- **Gate the commit on the gate's own verdict, not on the command having run.** `node scripts/verify.mjs`
  prints its failure count and exits non-zero; `... ; echo VERIFY=$?` still commits if the next command
  is unconditional. Two red commits in this campaign came from exactly that (the shell printed
  `VERIFY=1` and the `&&` chain was not actually a chain). Make it mechanical: read the exit code AND
  count the `FAIL` lines before `git commit`, and when a red commit is already made, fix it and
  **amend** — local history stays green per commit, which is what the slice rule means.
- **One slice, one vertical cut.** Code, test, docs/README and the note land together; if the
  evidence needs a different slice, split the change instead of widening the evidence.
- **An evidence set that covers one state cannot catch a state bug.** Every screenshot of the
  first-mile strip was a blank session, so "renders only in the blank-session state" looked
  proven while the strip actually rendered in every session (the owner renders that dock for
  every session — only the hero chrome is hero-gated). When a claim is conditional ("only when
  X"), the evidence must include the **complementary case** (here: a session with content), not
  one more instance of X.

## Finish line

`pnpm typecheck && pnpm test && pnpm verify` is the floor for every slice. Add the rows above that
apply, and stop there — the exhaustive matrix is not the goal, a red light that would actually
have caught *this* regression is.
