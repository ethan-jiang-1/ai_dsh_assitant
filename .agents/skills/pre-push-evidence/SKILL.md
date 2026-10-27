---
name: pre-push-evidence
description: How to pick the minimal credible evidence for a change surface before committing or handing over — which gate actually fails for which kind of edit, and which combinations are known to give false green. Use at the end of a slice, or when unsure whether typecheck/test/verify is enough.
whenToUse: Choosing what to run before a commit or handover; deciding whether a change needs a build, a live probe, or a release smoke. Not a substitute for semantic review.
---

# Pick evidence by change surface

"Run everything" is not a plan when one of the commands silently proves nothing for your change
(and a build-dependent test can pass against a stale artifact).

The routing table — surface → minimal evidence command → regression-asset home → what it can and
cannot prove — lives in [docs/testing.md](../../../docs/testing.md)'s「一页证据地图」(one fact,
one home). Read it there; this skill owns the judgment rules the table cannot carry.

Check selection for the harness repo lives in
[dsh-pre-push-checks](../../../vendor/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md) and runs
harness commands. This skill selects this repo's commands.

## Rules that keep the evidence honest

- **Name the lane by the file's suffix.** Test-asset shapes are the shared vocabulary —
  `*.spec.*` unit lane, web-face scenes, and the reserved `e2e`/`snapshot`/`bench` forms live in
  [docs/testing.md](../../../docs/testing.md)'s naming table (mechanically enforced by the
  `test assets:` verify gate). When the user names a lane, that table is what maps the word to a
  command and a regression semantics.
- **The client suite is whole-package, not per-file.** `brand.spec.ts` asserts the complete
  slot-registration surface, so adding one registration reds a spec you never opened (this happened
  — P1-B landed red and the fixture followed two commits later); and a recorded web-face scene can
  go silently stale while unit tests stay green (the approve-direct-call console change landed
  after blank-first-open was recorded; caught 2026-10-05 by building the second scene) — re-run
  **all** scenes through `pnpm web-face-check --all` (4 customer + 4 Viki; default is the 4
  customer scenes), not just the one you touched. Browser evidence is not in `pnpm verify`;
  green test/verify does not prove the page.
- **Build before trusting `lib/`-consuming tests.** The composition and release-smoke specs read
  the built package; without `pnpm build` they assert yesterday's code and go green anyway.
- **A new gate without a red fixture is a claim, not a guard.** Introduce the regression, watch it
  fail, revert — then report the gate as covering the case.
- **Report only what actually ran.** A blocked or skipped check is reported as blocked with its
  reason; it never joins the green list.
- **An environment-specific claim needs three records.** "It only fails here" is not established
  until the exact command, the failing test name, and the platform difference are all written
  down; with any of the three missing, treat the failure as unexplained — not environmental.
- **Gate the commit on the gate's own verdict, not on the command having run.** `node scripts/checks/verify.mjs`
  prints its failure count and exits non-zero; `... ; echo VERIFY=$?` still commits if the next command
  is unconditional. Two red commits in this campaign came from exactly that (the shell printed
  `VERIFY=1` and the `&&` chain was not actually a chain). Make it mechanical: read the exit code AND
  count the `FAIL` lines before `git commit`, and when a red commit is already made, fix it and
  **amend** — local history stays green per commit, which is what the slice rule means.
- **One slice, one vertical cut.** Code, the test that would fail for this regression, and the
  contract that owns the changed fact land together. A note lands in the same diff only when
  [`notes/README.md`](../../../notes/README.md) §〇 says this change leaves a tradeoff those three
  cannot hold. If the evidence needs a different slice, split the change instead of widening it.
- **An evidence set that covers one state cannot catch a state bug.** Every screenshot of the
  first-mile strip was a blank session, so "renders only in the blank-session state" looked
  proven while the strip actually rendered in every session (the owner renders that dock for
  every session — only the hero chrome is hero-gated). When a claim is conditional ("only when
  X"), the evidence must include the **complementary case** (here: a session with content), not
  one more instance of X.
- **Point instrument checks at the target, not at the runner.** `webui-preflight` checks the
  served instance through its authenticated cookie (boot graph, bundle registration, Remote
  namespaces, rooms route); it must not be pointed at a DSH home or a different instance. A
  check that scans the runner's own state can green on an unrelated leftover while the
  handed-over URL serves an empty page. Session bucket names are a lossy encoding (a literal
  dash in a workspace path is indistinguishable from an encoded slash); do not decode them
  back into paths.

## Finish line

`pnpm typecheck && pnpm test && pnpm verify` is the floor for every slice. Add the evidence-map
rows that apply — the routing table lives in
[docs/testing.md](../../../docs/testing.md)'s「一页证据地图」 — and stop there — the exhaustive
matrix is not the goal, a red light that would actually have caught *this* regression is.
