---
name: requirements-elicitation
description: How to grind a fuzzy idea into requirements this repo can actually act on — the frontier interview discipline, the fact/decision split, routing each unknown to the right probe, the autonomy-boundary question class, and where the result lands (a _backlog/plans/ card that can graduate into notes/proposed/). Use when a request arrives as a half-formed intention, when a plan card's 已知与未决 is thin, or when you are about to write a proposed card from a conversation that was never actually interrogated.
whenToUse: Turning a vague idea, a stakeholder wish, or a one-line request into a card with real candidates and a real graduation judgment; stress-testing an existing plan card before it graduates. Not for scheduling the work, not for implementing it, and not a substitute for the probes it routes to.
---

# Requirements elicitation: from fog to a card that can graduate

The failure this prevents is not "we built the wrong thing because the user lied". It is
**we wrote a confident card out of a conversation nobody interrogated** — a proposal whose
acceptance criteria were invented downstream of the decision, whose candidates were never
weighed, and whose riskiest assumption ("the model can probably do this") was never treated as
a fact to go check. This repo's own [plans/](../../plans/README.md) template already asks for
已知与未决 / 候选与取舍 / 毕业门; this playbook owns **how you fill those sections honestly**.

## Where the output lands (read this first)

Elicitation produces **judgment material, not authorization**. The pipeline it feeds:

```text
fog ──elicitation──▶ _backlog/plans/ card ──毕业四门──▶ notes/proposed/ card ──用户点头──▶ implement
                          (推敲中)                (呈批)              (唯一授权点)
```

- **Never skip to `notes/proposed/`.** A proposed card must carry 问题/方案/验收 with
  **executable** acceptance ([notes/README.md](../../../notes/README.md) §二之三). Elicitation that
  hasn't finished is a `plans/` card, not a thin proposal.
- **Never schedule.** Ordering and start authority belong to the user's scope and the current
  turn; producing a sequenced task list here rebuilds the second queue this repo has retired
  twice ([_backlog/README.md](../../README.md) 主干 / 明确不借).
- **One fact, one home.** Interview findings go in the card's 已知与未决; evidence-heavy material
  goes to [`_backlog/reference/`](../../reference/README.md) and the card links it. Do not keep a
  second copy of either.

## The interview discipline (the part that carries the value)

**Frontier, one round at a time.** A *frontier* is the set of questions whose prerequisites are
all now settled — questions you can answer *right now* without guessing at something undecided.
Each round:

1. Ask **the whole frontier at once**, not one question per turn (drip-feeding wastes the user's
   attention and invites answers that go stale before the round closes).
2. **Attach a recommended answer to every question.** A recommendation is what lets the user
   answer with "yes" or "no, because…" instead of authoring an answer from scratch — and it forces
   *you* to commit to a reading that can be corrected.
3. When an answer opens new questions, they join the **next** round. Never ask a question whose
   prerequisite is still open — that is how you get answers that have to be thrown away.

**Split facts from decisions, and do the facts yourself.** This is the load-bearing rule.

| Kind of unknown | Who resolves it | Where it goes |
|---|---|---|
| A **fact** — what the code does, whether an API supports it, what the vendor documents, what a package's affordance is | **You**, without asking | card 已知, with the read/command as its source |
| A **decision** — what we want, what we will trade away, who the user is, what matters more | **The human**, always | card 候选与取舍 / 未决, not silently resolved |

The characteristic failure of agent-app requirements work is asking the human a fact question in
decision clothing: *"can the model reliably extract this field?"* is not a preference — it is a
claim to be tested. Ask it of the code, the docs, or a prototype, and bring back the measurement.

**Terminology drift is a bug.** When an interview settles what a word means here (a room, a
"brief", a "slice"), write it down where the repo already keeps vocabulary rather than letting the
next session re-litigate it. Do not stand up a parallel glossary if one exists.

## Route each unknown to the right probe

Three classes of unknown survive the interview. Each has a different probe — picking the wrong one
is why "we researched it" sometimes settles nothing.

| The unknown is… | Probe | What comes back | What it can never prove |
|---|---|---|---|
| An **external fact**: capability limits, API/schema behaviour, pricing, what upstream actually does | Source-level research, delegated to a background agent, against first-party sources | A Markdown with primary-source citations, graded [affordance]/[documented]/[observed] per [reference/ contract](../../reference/README.md) | That *our* design works, or that a stakeholder wants it |
| An answer that lives **in someone else's head**: real user expectations, compliance constraints, data permissions | A questionnaire — interview the requester about **who to send it to and what to get back**, not about the answer | An artifact that can be sent asynchronously | Anything, until it comes back — mark it unknown, do not simulate it |
| Something only **running it** can settle: does this state model feel right, does extraction hold on real input, what should this look like | A throwaway prototype — and to compare two candidates, build both and feed them the same inputs | A decision, plus the prototype archived as its evidence | Adoption, business value, or that a real audience exists |

Probe results feed the card ([reference/](../../reference/README.md) for the evidence, the card's
已知 for the conclusion). **A probe that never lands in the card did not happen.**

## The question class agent apps keep forgetting

For anything model-facing, two families are requirements — not implementation details:

1. **Autonomy boundary.** For each action: does the agent decide it, recommend it, or ask first?
   Answer it per-action, not once for the whole product — the boundary is usually jagged. A settled
   boundary is a *hard-to-reverse decision*: record it where this repo records decisions, not in a
   passing comment.
2. **Failure paths.** What happens when the model is wrong, unsure, refuses, or hallucinates?
   A user-story list for an agent app that only describes the happy path is incomplete, and this is
   the single most common omission in cards written from a pleasant conversation.

Both belong in 已知与未决 like any other requirement. Neither is a fact you can research — they are
decisions, and they need the human.

## Exit criteria: is the card actually ready?

A `plans/` card has been elicited properly when all of the following hold. If any fails, it stays in
推敲中 — a card that cannot name its own missing evidence is the failure mode.

- [ ] **四问 answerable**: 该不该做 / 何时 / 次序 / 放弃什么 each has an answer with its reason,
      or is explicitly recorded as open with what would settle it.
- [ ] **Candidates are real**: every candidate has a cost, and at least one plausible option was
      written down and rejected **with its reason** (无论证不写入). A single-candidate card means
      the search never happened.
- [ ] **Red lines are on record**: what we will *never* do here is written down — this is the
      negative knowledge that prevents the same argument from reopening next month.
- [ ] **Every fact is sourced** (path, command, or URL) and every decision is attributed to the
      human, not to your inference.
- [ ] **毕业门 is written** as a test: what evidence would move it, and to which of the four exits
      (该做 / 待触发 / 否决 / 消化).
- [ ] **Autonomy and failure paths** are answered, if the work is model-facing.

Meeting these makes the card **graduate-ready** — eligible for `notes/proposed/`. It does not make
it authorized.

## Hard-won details

- **A recommendation is not a decision.** Attaching one to each question speeds the interview up;
  never let it become the recorded answer without the human actually confirming it.
- **Do not let "the user said X" end the search.** The stated want and the underlying want differ
  most often exactly where the requester has already decided on a mechanism. Separate the need
  from the proposed solution, and record both.
- **Write the interview down as you go, in the card.** A well-run interview whose findings live
  only in the transcript is worth nothing to the next session — this repo grades on cards.
- **When a fact undercuts the premise, stop and re-open.** Finding out mid-way that the "obvious"
  mechanism does not exist is a *result*: record it, and re-derive the candidates rather than
  patching the old ones.
- **Thin cards are cheaper than confident ones.** It is legitimate for a card to be mostly 未决.
  What is not legitimate is filling 候选与取舍 with options that were never weighed.
- **Never simulate a human.** If an answer needs a real person (a stakeholder, a user, a sign-off),
  the honest output is a card field marked unknown plus a questionnaire — not a plausible-sounding
  invention. This repo has been burned by exactly that; see the negative knowledge in
  [notes/](../../../notes/README.md).

## Finish line

A card in [`_backlog/plans/`](../../plans/README.md) that satisfies every exit criterion above,
with its evidence linked from [`reference/`](../../reference/README.md), its status line naming the
next step and trigger, and its 毕业门 naming the exit it would take. Then — and only then — the
question of proposing it is a conversation with the user, not a formatting step.

This playbook is a draft living in [playbooks_plan/](../README.md); it graduates to
`.agents/skills/requirements-elicitation/` once one or two real deliberations have validated or
corrected it.
