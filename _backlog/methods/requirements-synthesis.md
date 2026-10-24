---
name: requirements-synthesis
description: Organize confirmed requirements and evidence, compare approaches, and record a supported conclusion and closure criteria on the issue.
whenToUse: An issue has enough information to compare approaches or prepare a conclusion; an authorized planning scope may need independently verifiable steps. Not implementation or scheduling.
---

# Organize the approach and conclusion

**Input:** the scoped card, confirmed answers and terms, evidence, prototype findings, alternatives,
constraints and unresolved questions. Follow the [user-confirmation and skill-loading rules](requirements-elicitation.md).
A missing fact or uncertain choice remains explicit.

## 1. Organize confirmed requirements

Read `to-spec` in full when this step is needed. Supply existing owner vocabulary and related decisions.
Override its tracker, setup, template and publication defaults: write back to the existing issue.

Synthesize the answers already obtained. Cover the user's workflow, intended result, relevant failure and
recovery cases, scope and exclusions. For model-facing work include authority per action, correction, and
behavior when the model is wrong, uncertain, refuses or hallucinates. Retain alternatives actually considered,
their costs and supporting evidence.

Use `codebase-design` only when module interfaces or test seams need analysis. Verify existing capabilities
and prefer established seams. If a new requirements gap appears, return to that specific question rather
than restarting the entire discussion.

**Done:** another session can reconstruct the intended result, scope and reasons from the card without the
conversation. For a do-it conclusion, prepare [acceptance criteria](validation-design.md) now, before comparing
implementation steps or completing the conclusion below. Deferral, rejection and an existing conclusion do
not require hypothetical implementation criteria. This prepares the handoff; it does not require downstream
implementation or acceptance to have happened.

## 2. Compare approaches and steps where needed

Compare genuine candidates against the confirmed requirements, costs and evidence. Prefer behavior and
contract descriptions over brittle line-by-line implementation recipes. Keep source paths and assertion
targets where they make a fact or acceptance criterion checkable.

For an authorized planning scope that needs multiple independently verifiable steps, read `to-tickets`.
Keep candidate steps on the current card, not in new ticket files or an execution queue. Each names the
result delivered, acceptance criteria and real prerequisites. A small problem needs no invented breakdown.

Present unresolved choices with evidence and a recommendation when supported. Human approval of a breakdown
confirms that choice; it does not grant implementation authority beyond the user's actual request.

**Done:** the chosen approach and necessary steps are supported, or a precise fact/confirmation gap is recorded.

## 3. Record the conclusion and prepare the handoff

Use the [backlog closure criteria](../README.md). Answer whether to do it, when, in what order and what is
excluded, only to the detail needed for the conclusion. Record one of:

- **Do it:** confirmed result, scope, approach, reasons and executable acceptance criteria.
- **Do it later:** reason, observable reconsideration condition and its location; future design may remain open.
- **Do not do it:** reason and applicable scope.
- **An existing conclusion answers it:** destination link and the question it settles.

If facts or user confirmation still block the conclusion, keep the issue active and name the exact gap and
next step. A card status or an upstream ready label never grants authority.

Use [the handoff method](issue-to-note.md) to route the conclusion. Do-it work goes to the proposed/closure
card; a persistent decision goes to [notes](../../notes/README.md) or a trigger row. Backlog prepares the
materials; the receiver owns the form. Routing is not note creation or downstream completion. Do not
maintain those rules here.

Persist the confirmed answers, evidence and unresolved questions before a session boundary. On resume,
reread the card and linked artifacts; ask the user only where reconstruction leaves a dependent choice uncertain.

**Finish:** the card has a supported conclusion ready for handoff, or a concrete unresolved question. The
card's closure follows the backlog rules, independently of downstream completion.
