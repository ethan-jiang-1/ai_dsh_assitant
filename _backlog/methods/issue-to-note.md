---
name: issue-to-note
description: Prepare a confirmed issue conclusion, route it to the right downstream (a work card/closure ledger or a decision note), record the destination, and close the issue when its backlog conditions are met.
whenToUse: A confirmed issue conclusion needs downstream handling. Work goes to the work tree; a persistent decision goes to notes; each receiver decides the form.
---

# Route a conclusion to its downstream

**Input:** the scoped issue, its confirmed conclusion and supporting evidence. For work that will be done,
include its scope, alternatives and executable acceptance criteria. Resolve uncertain choices through
[requirements confirmation](requirements-elicitation.md) before treating them as decisions.

**Output:** a recorded destination in the right tree, or an explicit gap preventing the handoff.

Backlog and notes are not one pipeline. A conclusion has two possible downstreams, and they are different
handoffs:

- **Work handoff** — the conclusion is "do it" and needs authorization/execution. The work goes to a
  `notes/proposed/` card for approval (or the card records an authorization already given), then to a
  **closure card** in [`_backlog/issues/`](../issues/README.md) that owns the slice ledger, acceptance
  evidence and open work. The decision note is optional; it is written only when
  [`notes/README.md`](../../notes/README.md) §〇 says a persistent tradeoff remains.
- **Memory handoff** — the conclusion is "do it later", "do not do it", or "an existing decision answers
  it". The decision goes to a note in `notes/` or a trigger row; no work card is needed.

The work handoff's receiver is the closure/implementation, not the notes shelf. The memory handoff's
receiver is a future decision-maker reading the note. Neither handoff creates the other's artifact.

## 1. Prepare the materials

Use the [backlog closure criteria](../README.md). State the applicable conclusion:

- **Do it:** the observable problem, intended result, scope and exclusions, chosen approach, actual
  alternatives and their costs, and executable acceptance criteria. If completion cannot be judged,
  return to [acceptance design](validation-design.md). The work handoff needs this material; the note
  does not duplicate it.
- **Do it later:** why it is deferred, the condition for reconsidering it, and where that condition can
  be observed. Leave future design unresolved when it is unnecessary for this decision.
- **Do not do it:** why, and the scope in which that reason applies.
- **An existing conclusion already answers it:** link the existing decision or current contract and
  explain which question it settles. If no further processing is needed, the card can close under the
  backlog rules without a downstream request.

Separate confirmed facts from recommendations. A human choice that is still pending keeps the dependent
conclusion open; record the exact question and next step.

## 2. Route the conclusion and record the destination

For a **work handoff**, the destination is the proposed card (authorization) and the closure card
(ledger). Record the closure-card link and the authorization fact on the issue; the closure card owns
the slice status, evidence and any open acceptance. The proposed card points to the closure card; it
does not duplicate the ledger. The work starts only after the user's authorization is recorded.

For a **memory handoff**, the destination is the note or the trigger row. Record the note/trigger link
and the one-line reason it is the destination. A full submission section (date, recipient, requested
handling) is only needed when the user is actually being asked to decide whether a note should exist;
otherwise a one-line destination on the card is the record. The [notes entry](../../notes/README.md) is
a rules entry, not an inbox.

Keep the record on the issue (or in the closure card it points to); moving the card later must preserve
the pointer. Source links support the problem, conclusion and reasons; they do not replace those
statements.

## 3. Close the issue when its conditions are met

Apply the [backlog closure rules](../README.md): preserve the discussion, add the conclusion and
destination (or the existing conclusion that already answers the issue), move the card into the
appropriate archive, repair relative links, and update the active and archive lists. Research follows
its [consumer-linked lifecycle](../research/README.md). A recorded destination need not have produced a
note before the backlog card can close.

Existing cards that already carry implementation and pending acceptance stay active until their stated
requirements are resolved. Keep the remaining evidence gaps and human decisions explicit; do not treat
implementation alone as acceptance. Open acceptance that outlives the note's graduation moves to a live
work card; the note keeps only a pointer.

**Finish:** another reader can tell what backlog concluded, why, which downstream received it (work or
memory), and whether the card is closed or exactly what still prevents closure. Each receiver owns its
own subsequent decisions: the closure card owns work, the note owns memory.
