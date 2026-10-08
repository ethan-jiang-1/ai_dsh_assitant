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

This playbook designates, at plan time, which owner must prove each row and what it cannot prove. The
final minimal evidence lane at implementation/push time is still picked by the repo's `pre-push-evidence`
judgment rules and the evidence map: if a pre-written command has gone stale or over-broad, run what the
current map requires and record the deviation in the plan row.

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
