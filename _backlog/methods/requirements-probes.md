---
name: requirements-probes
description: Resolve requirements evidence gaps with research, a stakeholder questionnaire or a prototype; verify incoming raw reports with triage. Return findings to the consuming issue card rather than creating a parallel workflow.
whenToUse: A requirements question cannot be settled by the current interview alone, or an incoming report needs verification before deliberation. Not production implementation or approval.
---

# Probe a requirements unknown

**Input:** a scoped issue card, the exact unknown, and the judgment it blocks. Before proceeding,
read the entry's [user-confirmation and skill-loading rules](requirements-elicitation.md).
Read the chosen skill and its branch resources; use only the missing functional step.

## 1. Pick by the unknown

| Unknown | Skill and input | Result that must return |
|---|---|---|
| External fact | `research`: small decidable question, version and primary sources | Cited answer, counterevidence and limits, not merely a report |
| Knowledge held by another person | `to-questionnaire`: who receives it and what facts/decisions are needed back | Sendable questions, then attributed replies feeding the interview |
| Logic/state feel or UI shape | `prototype`: one design question, logic or UI branch, candidates and shared inputs | Runnable artifact, observed behavior and a separately confirmed human verdict |

**Raw-request entry, not a fourth probe:** read `triage` for an incoming external bug/feature report.
Supply the original report, existing implementation, related rejections and verification steps; return
a verified claim or structured "confirmed / still needed" request and a disposition recommendation.

For questionnaires, settle the send rather than asking the requester to invent the recipient's
knowledge. Send early, order by importance and assume one reply. Replies are new evidence, not an
automatic decision. For triage, search by domain concept and reproduce the claim where possible;
use existing card/bug/note homes instead of tracker labels or a new rejection directory. Already
aligned requirements need no second triage; a ready brief is not permission to build.

**Done:** the probe has a bounded question, input, destination and a stated way to judge its result.

## 2. Run without stalling independent questions

Delegate independent primary-source research in the background; continue the interview's ready
questions. Verify each load-bearing finding against its source and baseline when it returns.
Treat source limits and contradictory evidence as unresolved rather than smoothing them away.

For a prototype, read `LOGIC.md` or `UI.md` from the skill's resources and use its corresponding
artifact shape. Hand off the bounded question to an isolated session/directory or branch. Compare
candidates on the same inputs and let the stakeholder react to the runnable result. If the branch,
interpretation or verdict is uncertain, ask the human; **override upstream's guess-when-unavailable
fallback**. Preserve the prototype as primary evidence on a side branch with a commit pointer;
production keeps only an authorized validated change, not the demo. No production integration here.

For model-facing requirements, evidence may test extraction, failure mechanisms or harness
capabilities. The human still confirms acceptable behavior, autonomy and risk; successful operation
of a sample does not establish reliability, adoption or business value.

**Done or waiting:** distinguish observed result, human verdict and unresolved assumptions. Missing
recipient input or human confirmation blocks its dependent judgment, not unrelated fact-finding.

## 3. Return evidence to its consumer

Keep short findings in the card's known/unresolved section. Retained research, experiment reports,
questionnaires and replies serving active cards belong under a topic in
[research](../research/README.md), with its naming, ledger and consumer-linked lifecycle.
Link the evidence once; record which question it settles, source/version or artifact commit,
limitations, attribution and what becomes answerable next. Temporary send/hand-off files are not a
second cross-session authority; preserve any relied-on result in the card or retained evidence.
Research follows the linked research lifecycle when its last active consumer closes.

**Finish:** the consuming card has updated evidence and unresolved items. Return to the affected
interview question in [requirements-elicitation](requirements-elicitation.md), or proceed to
[requirements-synthesis](requirements-synthesis.md) only when that judgment is ready. A report or
prototype alone does not settle a requirement or authorize implementation.
