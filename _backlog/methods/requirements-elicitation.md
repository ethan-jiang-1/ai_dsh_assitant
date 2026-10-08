---
name: requirements-elicitation
description: Clarify a vague request or an incomplete issue card through Matt Pocock's interview skills applied to this repo. Use for uncertain requirements, overloaded terms, or an effort too large for one interview.
whenToUse: User-directed requirements deliberation; settle the scope and questions, record answers in _backlog/issues/, and ask the human when judgment lacks confidence. Not implementation or scheduling.
---

# Clarify requirements

This playbook is a capability of this repo, not a paraphrase of an upstream document; its only external
dependency is the Matt Pocock skill bodies named below. This draft owns local routing and overrides; the
selected skill's full instructions own its protocol.

**Input:** the user's request or named card and authorized deliberation scope.
**Output:** an issue card with confirmed answers, evidence links and a judgment-ready or blocked state.

## Human confidence gate

**If you lack confidence in a requirements interpretation, trade-off or recommendation, ask the human
before settling it.** Present what is confirmed, what is uncertain, its impact, the evidence and the
specific confirmation needed. Offer a recommendation only when supported; otherwise say you cannot
yet recommend. Keep the item unresolved and pause dependent judgments, not independent work.

Facts are the agent's job: inspect accessible code, docs or experiments. If evidence remains missing
or contradictory, ask whether to investigate further, change direction or accept an explicit
assumption. Confirmation of an assumption is not proof of a fact. Business goals, taste, acceptable
risk and authority boundaries require human judgment. In-scope technical analysis can be agent-led,
but technical autonomy never bypasses this gate. Silence is not approval; explicit "use the
recommendations" is confirmation. An interview ends with confirmed shared understanding.

## Load the named skills

Check the current catalog. Missing expected skills are a discovery fault: report the name and inspect
installed files and discovery roots read-only. Do not install or change global configuration here.
Invoke only names available through the harness and permitted by its invocation rules.

If a skill is not callable but its complete source and referenced resources are accessible, disclose
**source-read adaptation, not a registered invocation**, and read them before proceeding. If neither
route works, stop that branch and request access/repair; a FAQ summary is not a substitute. The
[area ledger](README.md) links the provenance note with source locations and audited revisions.

## 1. Establish scope and a card

Read the [charter](../README.md), [issues contract](../issues/README.md) and relevant existing decisions
and owner docs. Search by domain concept for an existing card, implementation or rejection.
Record the trigger, user-visible outcome and completion condition in the existing or new
`YYMMDD-slug.md` card; update its ledger entry. Separate facts, assumptions and unanswered questions.

For a raw external bug/feature report, use the [raw-request entry](requirements-probes.md) to verify
it before treating it as aligned requirements.

**Done:** one card owns the named deliberation and its current unknowns. A partial card is valid.

## 2. Interview and sharpen vocabulary

For an idea that fits one interview, use the upstream `grill-with-docs` composition: `grilling` plus
`domain-modeling`. Load both when permitted, supplying the card, constraints, existing vocabulary
and decisions. Follow their frontier/round protocol; pending lookups block only dependent questions.
Capture answers, attribution, alternatives and costs in the card as they settle, not at the end.
Record only alternatives actually considered; a fixed constraint need not generate fake candidates.

Override the glossary/ADR defaults before running: tentative terms and choices stay in the card.
Current room terms belong to [home](../../docs/home.md), identity to [identity](../../docs/identity.md),
structural contracts to [architecture](../../docs/architecture.md), module terms to owner README/JSDoc.
Update current owners only for authorized, effective facts; delivered persistent rationale follows
[notes](../../notes/README.md). Do not create parallel glossary or ADR directories.

**Done or waiting:** confirmed requirements and new unknowns are on the card. An empty ready frontier
with pending facts/answers is waiting, not a completed interview. For evidence gaps, read
[requirements-probes](requirements-probes.md); return its results to the dependent question.

## 3. Chart only genuinely oversized ideas

Load `wayfinder` for a destination too foggy or large for one interview. Override tracker creation,
automatic claims and task selection: use named decision sections in the scoped card, with destination,
resolved decisions, precise questions/prerequisites, Not yet specified and Out of Scope. These are
judgment dependencies, not an execution queue. The map indexes its records rather than copying them.
Mark human judgments HITL and fact-finding AFK; uncertainty triggers the human confidence gate.
Work one human decision branch per session; independent research can proceed in parallel. Keep fog
coarse until a question is precise, even if then blocked. Stay within the user's named scope.

**Finish:** confirmed understanding or an honest blocker with next step/trigger is recorded. Only when
judgment or compilation is ready, read [requirements-synthesis](requirements-synthesis.md). This draft
neither schedules work nor authorizes implementation.
