---
name: validation-evidence
description: Route an approved acceptance criterion to this repository's existing evidence owner without inventing a parallel test or evaluation system.
whenToUse: A plan already states what must be true and needs a credible evidence route before or during implementation. Not requirements discovery, test-framework design, or a new queue.
---

# Route acceptance evidence

**Input:** the acceptance matrix in a confirmed plan, including behavior class, pass/fail signal,
negative or complementary state, and any named human judgment. Before proceeding, read
[validation-design](validation-design.md). If the criterion itself is uncertain, return to the
requirements chain instead of choosing evidence to hide the gap.

## 1. Select the existing owner

Use the repository's [testing evidence map](../../docs/testing.md) as the authority. Route by the
behavior actually being proven, not by the fact that the product uses an agent:

| Plan behavior class | Existing evidence route | Proves | Does not prove |
|---|---|---|---|
| Deterministic domain or service behavior | Relevant `pnpm test:domain` / `pnpm test:host` / `pnpm test:agent`, with the owning `tests/**` seam | Repeatable rules, service contracts, or agent-facing contract behavior | Loader composition, real browser rendering, model quality |
| Composition or orchestration | `pnpm build` then `pnpm test:composition`; for client rendering, `pnpm test` plus both `pnpm web-expected` scenes | Loader rows, registration/scope lifecycle, or owned web rendering expectations | Product value, arbitrary end-to-end behavior, model quality |
| Model-visible behavior | `pnpm build` → `pnpm test:composition` → focused `pnpm eval --only <task-id>`; use `pnpm eval:domain` when its human quality judgment applies | Arrival, behavior floor, and recorded evaluation result | Domain taste or business acceptance when human judgment is required |
| Prompt-arrival investigation | `repo-live-probe` as a one-off source-reading/trace action | What reached the actual request | A durable regression asset; a single successful probe is not a regression suite |
| Documentation, plan or gate shape | `pnpm verify`, plus the relevant existing negative fixture when a guard changed | Links, contracts, generated freshness and gate wiring | Semantic correctness of the requirement itself |
| Session or web replay | Existing owner under [snapshots](../../snapshots/README.md), only for its admitted fixture shapes | Keyless replay or web DOM expectation | Unit/CLI expectations or a not-yet-triggered session harness |

Do not make `snapshots/` a general evidence bucket. Unit, CLI and generator expectations stay with
their owning layer; session replay remains unbuilt until its documented trigger occurs.

## 1b. When no owner exists, say so and name the reading protocol

Some load-bearing behavior is only visible when the product actually runs (a geometry/visibility probe,
a real-model turn's side effect such as a schedule landing on disk). This repo has no admitted owner for
that shape: the two shapes `snapshots/` admits are session replay and web rendering expectations, and a
screenshot is neither. **A file path is not an owner.** `/tmp`, a screenshot directory, or a chat
attachment cannot carry a row, and a durable claim written next to volatile images is still volatile.

Before reporting such a row, take these three steps instead of inventing a bucket:

1. **Name the reading protocol, not the artifact.** Write down the assertion object, the input/state,
   and the command or file that carries the *reading* (for this repo, side effects visible in a session
   log are read through [`dev/reports/usage-report.mjs`](../../dev/reports/usage-report.mjs)'s
   `sessionLogs`/`readEvents` — never a hardcoded `session.v<n>` generation). The protocol is what a
   later session re-runs; the picture was only ever how one session looked at it.
2. **Record the row as blocked, with the gap named.** Evidence that cannot be re-obtained at the stated
   baseline is blocked, not pass ([validation-judgment](validation-judgment.md) §1). Do not let a
   one-time pass stand as the current result.
3. **If the observation class keeps recurring, its admission is a decided change, not a silent
   promotion.** Prebuilding a third `snapshots/` shape from inside this playbook is out of bounds; name
   the trigger (the second time the same class is hand-carried) and let the owner decide.

**Done:** every row either points at an existing owner, or is explicitly blocked with its reading
protocol named and its missing owner identified.

This playbook designates, at plan time, which owner must prove each row and what it cannot prove. The
implementation/push evidence is selected by the repo's `pre-push-evidence` rules and the evidence map.
If a pre-written command has gone stale or over-broad, use the current map and report the deviation to the
record that already owns the work. For existing active cards carrying delivery this is the card; after
handoff, the downstream process owns the location. This method does not define note content or lifecycle.

## 2. Make the evidence complementary and attributable

For each matrix row, record the exact command or artifact, baseline/commit, input and state, and what
it can and cannot establish. A conditional claim needs both the triggering and complementary state.
A happy-path demo, keyword search, command exit code, or green unrelated suite is not acceptance.
For a new mechanical guard, the evidence includes a prove-it-red negative fixture before the guard is
reported as protective.

Keep independent evidence separate: deterministic tests, composition/render evidence, model evaluation,
and human judgment answer different questions. Do not merge them into one score or let an automatic
model score stand in for user value, taste, risk, compliance or authority.

**Done:** every plan row points to an existing owner, a runnable or explicitly human evidence action,
its limitation, and the complementary/negative case required to interpret the result.
