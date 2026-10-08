---
name: requirements-synthesis
description: Compile confirmed requirements and evidence into this repo's existing card/proposal shape, assess candidate vertical slices when authorized, and record the appropriate four-gate judgment.
whenToUse: An issue card is ready for synthesis or a graduation judgment; a mature multi-session scope needs a reviewed breakdown. Not scheduling, automatic publication or implementation.
---

# Synthesize and judge

**Input:** the scoped card, confirmed answers/terms, evidence and prototype verdicts, alternatives,
red lines and unresolved prerequisites. Before proceeding, read the entry's
[confidence gate and skill-loading rules](requirements-elicitation.md). A missing fact or uncertain
requirements judgment must not be guessed into a mature proposal.

## 1. Compile aligned requirements

Read `to-spec` in full when this functional step is needed. Supply existing owner vocabulary and
related decisions. Override its tracker/setup, template and ready-for-agent publication defaults:
write back to the card's existing sections, then the appropriate local graduation destination.
Do not create a second spec store or treat publication as approval.

Synthesize confirmed answers instead of restarting the interview. Cover the user's complete workflow
and relevant failure/recovery scenarios; completeness matters, not a user-story count. For model-facing
work include per-action authority, correction and behavior when the model is wrong, uncertain, refuses
or hallucinates. Carry explicit Out of Scope and genuine alternatives/costs into the result.

Use `codebase-design` only when module interfaces or test seams need analysis. Verify existing
capabilities and prefer existing behavioral test seams. Technical analysis may be agent-led within
scope, but uncertainty or a choice affecting requirements returns to human confirmation. If synthesis
exposes a new gap, reopen that specific question, not the entire settled interview.

Keep implementation decisions at the behavior/contract level. Override upstream's path ban where
local evidence and executable acceptance need source links, commands and assertion targets; avoid
brittle line-by-line implementation recipes. Decision-rich prototype snippets may be linked or
included with provenance. A doing-now major proposal follows the
[note shape and executable acceptance contract](../../notes/README.md).

**Done:** synthesis is traceable to confirmed answers and evidence, the intended behavior and exclusions
are explicit, and another session can reconstruct the requirements from the card without the transcript.
Do not add validation evidence here. If this judgment will point at a doing-now/proposal exit, run
[validation-design](validation-design.md) next — the slice assessment and gate judgment below consume its
matrix. Deferral, rejection and digestion exits need no acceptance matrix. Otherwise retain the named
requirements blocker in the card.

## 2. Assess slices only when needed and in scope

For an authorized multi-session planning scope, read `to-tickets` and assess a candidate breakdown.
Override tracker, `.scratch/` ticket files and ready labels: candidate slices live with the current
card/proposal, not in a new execution queue. Each names delivered behavior, executable acceptance
(from the acceptance matrix) and only its real blockers; it must be independently verifiable and fit a
fresh context window.
Use expand-contract for wide mechanical refactors that cannot stay green as vertical slices.

Present the breakdown for human review: behavior delivered, granularity, blockers, merge/split options
and remaining uncertainties. Even a confirmed breakdown records dependencies, not scheduling or
start authority. A small scope or a justified rejection needs no hypothetical slice list.

**Done:** the needed breakdown is reviewed, or its precise confirmation gap is recorded. Implementation
remains outside this playbook and follows the user's authorized scope.

## 3. Record the judgment, not an automatic next task

Read the [four graduation gates and card/evidence lifecycle](../README.md) and
[note/authorization boundaries](../../notes/README.md). Keep all four exits available: doing-now,
decided deferral, rejection and digestion. The selected gate determines the destination; not every
result becomes a proposal. Honor current-request and local-edit exemptions instead of re-proposing
already authorized work. A card status, cleared frontier or upstream ready label never grants authority.

When the judgment is supported, hand the card to [issue-to-note](issue-to-note.md). That playbook
turns the gate into a note, or into an explicit decision that no note is warranted, and rewrites a
doing-now acceptance matrix into the proposal's `## 验收`. Synthesis stops at the judgment.

If evidence or human confirmation still blocks the judgment, keep the card active with next step and
trigger. A decided deferral may leave future design to its trigger; rejection need not answer every
hypothetical implementation question. Name what is unnecessary for this exit rather than inventing
answers. Move cards/evidence only under their owner lifecycle rules.

Preserve continuity from interview to synthesis where possible. Because the harness may compact
and this repo works across sessions, persist confirmed answers, unresolved prerequisites, evidence
and dependencies before a boundary. On resume, reread the card and linked artifacts; ask the human
where reconstruction is uncertain. Do not claim an unbroken window or fixed token threshold.

**Finish:** the card carries a supported graduation judgment and destination, or an honest unresolved
state with a concrete unblocker. This is judgment material, not a new implementation queue.
