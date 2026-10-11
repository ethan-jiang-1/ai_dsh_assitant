---
name: action-plan
description: How to turn an agreed breakdown into an executable action plan — every action carries owner, timing, metric, and a stop condition, and deferrals are recorded with reasons. Load when the principal says "so what do we do" or asks for a plan.
whenToUse: A breakdown (or decision) exists and the principal wants the execution shape — who does what by when, how success is measured, and when to stop. Not for the breakdown itself — use management-breakdown first.
---

# Action plan

A plan is a promise with a stop condition. Lists without owners are not plans.

## Every action carries four things

- **Owner** — one name (a person, or "principal" when it is the principal's own move). "The team"
  is not an owner.
- **Timing** — a date or a trigger ("by Friday" / "when the renewal lands"). "Soon" is not timing.
- **Metric** — the observable that says it worked. If no metric can be named, the action is a hope;
  say so and either find the metric or drop the action.
- **Stop condition** — the observable that says stop, reverse, or escalate. Plans without stop
  conditions run on momentum.

## The rest of the shape

- **Conclusions first.** One paragraph: what is being committed, and the single biggest risk.
- **Sequence and dependencies** — what blocks what; which action unblocks the others.
- **Deferrals, with reasons** — what you considered and deliberately did *not* put in the plan, and
  why. A plan that hides its deferrals will be re-litigated next week.
- **What the plan needs from the principal** — decisions, data, or interventions only they can
  provide, each with when it is needed by.

## Land the plan so it outlives the conversation

A plan that lives only in this reply is gone the moment the session ends, and the desk renders the
**operating ledger** — not your recollection, and not the room file. So once the shape is agreed
(or the principal asks for it to be recorded):

1. `assistant_reflect save_page` with `type: plan`, a `title` naming what it commits to, and the plan
   as the body: the four things per action, the sequence and dependencies, the deferrals with their
   reasons, and what you need from the principal. `sources` is required — cite the thread or memory
   the plan came from.
2. It lands as a **draft**. The principal approves it from the knowledge room when they accept the
   plan, and that approval is what makes it count as current knowledge.
3. Anything in the plan the principal has to act on becomes a **matter in the ledger**
   (`assistant_operating` `entrust`, provenance quoted from the principal), because the ledger is the
   only surface the desk renders; a dated one gets its reminder in the same turn per the
   `morning-brief` skill. Never write these into `.desk/state.json` — that file carries room data
   only (see the `desk-refresh` skill).

If the plan changes later, write the page again under the same title and say what changed — a plan
tracker that drifts silently is worse than no tracker.

## Honesty rules

- Every borrowed fact cites its source; every number without provenance is labelled assumed.
- Do not pad. Two real actions beat six aspirational ones.
- If the breakdown is missing a layer (no tested hypotheses, no criteria), say the plan is built on
  sand and name the missing layer instead of planning anyway.
