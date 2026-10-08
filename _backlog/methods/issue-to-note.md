---
name: issue-to-note
description: Prepare a confirmed issue conclusion and submit it to the downstream notes process for handling; record the request destination and close the issue when its backlog conditions are met.
whenToUse: A confirmed issue conclusion needs downstream handling. The receiving process decides whether it becomes a note; this method only prepares and submits the request.
---

# Request downstream handling

**Input:** the scoped issue, its confirmed conclusion and supporting evidence. For work that will be done,
include its scope, alternatives and acceptance criteria. Resolve uncertain choices through
[requirements confirmation](requirements-elicitation.md) before treating them as decisions.

**Output:** a submitted processing request with a traceable destination, or an explicit gap preventing submission.

Backlog and the downstream notes process are two successive parts. Backlog clarifies the problem and
prepares the conclusion; this method requests the next part to handle it. The receiving process decides
whether a note is needed and what form the result takes. Submitting the request does not mean a note
exists, the request is approved, or downstream work is complete.

## 1. Prepare the materials

Use the [backlog closure criteria](../README.md). State the applicable conclusion:

- **Do it:** the observable problem, intended result, scope and exclusions, chosen approach, actual
  alternatives and their costs, and executable acceptance criteria. If completion cannot be judged,
  return to [acceptance design](validation-design.md).
- **Do it later:** why it is deferred, the condition for reconsidering it, and where that condition can
  be observed. Leave future design unresolved when it is unnecessary for this decision.
- **Do not do it:** why, and the scope in which that reason applies.
- **An existing conclusion already answers it:** link the existing decision or current contract and
  explain which question it settles. If no further processing is needed, the card can close under the
  backlog rules without a downstream request.

Separate confirmed facts from recommendations. A human choice that is still pending keeps the dependent
conclusion open; record the exact question and next step.

## 2. Submit a processing request

Keep the complete request on the issue. Present it in the current reply with the card link, confirmed
conclusion, and what downstream handling is requested. If the user has already named a receiving session
or destination, submit there instead within the authorized scope. The receiver follows the
[notes entry](../../notes/README.md); that README is a rules entry, not a request inbox.

Record the submission date, recipient or destination, and requested handling on the card. This makes the
handoff reconstructable without relying on the conversation alone. Source links support the problem,
conclusion and reasons; they do not replace those statements. Moving the card later must preserve the request.

Backlog does not create a note as proof of submission, decide whether one is needed, or prescribe downstream
format and lifecycle. Merely drafting the request on the card is preparation, not submission. If delivery
could not happen, report the gap and do not claim it was submitted.

**Done:** the request has been presented to the user or submitted to the designated receiver, and its
submission is recorded. Waiting for downstream processing is separate from an unresolved backlog question.
Submission itself grants no implementation authority.

## 3. Close the issue when its conditions are met

Apply the [backlog closure rules](../README.md): preserve the discussion, add the conclusion and request
destination (or the existing conclusion that already answers the issue), move the card into the appropriate
archive, repair relative links, and update the active and archive lists. Research follows its
[consumer-linked lifecycle](../research/README.md). A submitted request need not have produced a note before
the backlog card can close.

Existing cards that already carry implementation and pending acceptance stay active until their stated
requirements are resolved. Keep the remaining evidence gaps and human decisions explicit; do not treat
implementation alone as acceptance. This exception does not create a second implementation process here.

**Finish:** another reader can tell what backlog concluded, why, where downstream handling was requested,
and whether the card is closed or exactly what still prevents closure. The receiving process owns all
subsequent decisions about notes and delivery.
