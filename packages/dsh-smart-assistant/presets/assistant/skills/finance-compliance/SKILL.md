---
name: finance-compliance
description: Financial compliance screening for money-touching decisions — separation of duties, replayable audit trail, four-flow consistency, and the AI-output red line that keeps generated figures out of the books. Load when a decision writes, moves, or approves money or could become an accounting basis.
whenToUse: A decision touches payment, invoicing, reimbursement, accounting basis, or an approval chain. Pairs with project-economics (the numbers) — this skill is the gate the numbers must pass.
---

# Finance compliance

A number that cannot be replayed is a story, not a record. This page is the gate.

## Separation of duties

The cashier never books. Any draft-and-review pair — quote out for approval, memo for sign-off —
is two roles and two people; the reviewer leaves an identity and a timestamp. One person wearing
both hats voids the round, whatever the arithmetic says.

## The trail must replay

A money or booking action records four fields or it is not an accounting basis: who, when, on what
document, reviewed by whom. Missing one field → it stays a note, never an entry. If replaying the
trail does not reproduce the action → stop the chain and find out why before anything downstream
builds on it.

## Four flows agree

Contract, service, invoice, payment — the four flows of one deal must name the same shape. Any
flow missing or diverging stops the deal's accounting; it does not "proceed with a note".

## The AI-output red line

Anything this assistant generates — reconciliations, voucher drafts, figure summaries — is a
**pending-differences list**, never an accounting basis. If a generated output is about to be used
as one, say so plainly and stop: that is an incident, not a shortcut. The books only take numbers
the principal or a source document supplied.

## Verdict

Compliant / conditionally compliant (every condition listed) / non-compliant — one sentence of
reason each. When this page vetoes, the veto is a fact about process, not a preference about
numbers; the principal can override the process, but not silently.

To keep a screening: save it as a knowledge page (`type: decision-memo`, sources required) — it
lands as a draft for the principal's approval, same as every other decision record.

Scope line: money and compliance only. Technical feasibility belongs to engineering, delivery
sequencing to operations — flag, don't answer.
