---
name: validation-judgment
description: Accept or reject an implemented change against a confirmed plan, separating technical evidence, model-quality evidence and human product judgment.
whenToUse: Implementation claims a plan is complete and its acceptance matrix and evidence are available. Not a replacement for requirements elicitation, debugging, or release authorization.
---

# Judge delivery against the plan

**Input:** the confirmed plan, its acceptance matrix, implementation diff or fixed point, evidence from
[validation-evidence](validation-evidence.md), and any named human judgment. Do not reopen settled
requirements merely because implementation is inconvenient. If the matrix exposes a genuinely ambiguous
product choice, stop that row and return it to the requirements chain for human confirmation.

## 1. Check the evidence, not the claim

For each matrix row, record one of: **pass**, **fail**, **blocked**, or **human judgment pending**.
Re-run the plan's stated command or inspect its retained artifact at the stated baseline. Confirm that:

- the evidence exercises the named behavior and input/state;
- the pass signal is independent of the implementation and can catch the stated failure;
- the negative, recovery or complementary state was covered where required;
- the result belongs to the correct owner and does not claim more than that owner proves;
- model-visible results include the required focused eval or real-request observation, while human-quality
  claims remain explicitly human;
- a technical green result is not silently promoted to product-value acceptance.

A missing command, stale artifact, unrun human step, or unsupported interpretation is **blocked**, not pass.
A failed criterion becomes a bug/plan follow-up according to the existing owner; do not create a second
validation queue here.

## 2. Keep the judgment axes separate

Report at least these independent views when they apply:

- **Contract/spec:** does the delivered behavior match the confirmed plan, including failures, recovery and
  Out of Scope? If not, name the unmet row; do not let clean code compensate for missing behavior.
- **Standards/technical:** does the change satisfy the repository's existing tests, composition, rendering,
  documentation and review contracts? Borrow the upstream `code-review` two-axis separation, but use this
  repo's fixed point and owners; do not import its tracker or review workflow into the plan.
- **Model behavior:** did the applicable eval/real-request evidence hold, and what remains for human review?
- **Human/product:** is the required business value, tone, acceptable risk, compliance or authority judgment
  explicitly made by the right person? The agent may prepare the comparison; it cannot turn silence or a
  score into approval.

## 3. Close honestly

The delivery is accepted only when every required technical row passes and every required human judgment is
recorded. Otherwise return the exact failing or blocked rows, evidence gap, owner and next trigger. Distinguish:

- **implemented:** all applicable criteria and required human judgments pass;
- **rework/bug:** a criterion fails and has a concrete correction path;
- **waiting:** evidence or human input is missing, including a pending complementary state;
- **scope/requirements gap:** the criterion cannot be interpreted without changing the confirmed intent;
- **not accepted:** the evidence contradicts the plan or an explicit human rejection applies.

Do not rewrite the plan after a failed check to make the result green. If the intended behavior changed,
return to requirements synthesis and record the new decision before revising the matrix.

**Finish:** the plan carries row-level outcomes, evidence links/commands, limitations, attribution and any
human decision; the result is accepted, reworkable, waiting, or returned to requirements with an honest reason.
