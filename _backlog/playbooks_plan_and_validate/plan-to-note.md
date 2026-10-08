---
name: plan-to-note
description: Turn a supported graduation judgment into this repo's note, or into an explicit decision that no note is warranted, with the local section shape and a quality check a later session can re-apply.
whenToUse: Synthesis has already chosen a graduation gate for a plans card. Not interviewing, not designing the acceptance matrix, and not authorization to implement.
---

# Record the decision, or record that none is needed

**Input:** a plans card whose graduation judgment is already supported — doing-now, decided deferral,
rejection, or digestion — plus the confirmed behavior, the alternatives that were really considered, and
the acceptance matrix when [validation-design](validation-design.md) produced one. Read the
[confidence gate](requirements-elicitation.md) before treating an uncertain tradeoff as settled.

This playbook writes the decision a later session would otherwise have to reconstruct. Code says what the
system does. Tests pin a behavior. The plan keeps the deliberation and, once the judgment is real, leaves
the active shelf with a pointer. The note keeps the tradeoff.

The rule text this method is adapted from lives in the pinned DSH tree:
[`vendor/dsh/.agents/notes/README.md`](../../vendor/dsh/.agents/notes/README.md) (when to write one, the
body skeleton, alternatives, moving a proposal into a delivered decision),
[`vendor/dsh/.agents/notes/AGENTS.md`](../../vendor/dsh/.agents/notes/AGENTS.md) (a new note searches for
what it replaces), and the skills beside them —
[`dsh-prose-standard`](../../vendor/dsh/.agents/skills/dsh-prose-standard/SKILL.md),
[`dsh-trim-cot-leakage`](../../vendor/dsh/.agents/skills/dsh-trim-cot-leakage/SKILL.md),
[`dsh-archive-agent-notes`](../../vendor/dsh/.agents/skills/dsh-archive-agent-notes/SKILL.md).
When the pin moves, re-read those files and fold the judgment into this playbook and
[`notes/README.md`](../../notes/README.md). Their folder layout stays on that tree. The sections below are
how the same judgment is written here.

Writing the note does not start the work. A `notes/proposed/` card is a graduated proposal waiting for
the user to nod or to name it.

## 1. Name the mistake, or stop

Ask what goes wrong if the only records are the code, the tests, and the current docs. Four outcomes count:

- Someone brings back an option that was already rejected, and the argument has to be built again.
- Someone sees the code as it is, invents a reason, and edits toward that invention.
- A constraint sits untouched because nobody can say what it protects.
- The only way to learn why is to dig through git history and old sessions.

If none of those will actually happen, do not write a note. A large diff, a bug fix, a new test, or a
user-visible tweak does not by itself create a decision. A few-line change that moves a guarantee does.
A local wording, spacing, or presentation change does not; the reason for that change belongs in the commit.

Search `notes/proposed/`, `notes/implemented/`, `notes/rejected/`, and [`_backlog/triggers.md`](../triggers.md)
for the same mechanism before opening a file. Then pick one:

- **Nothing new was decided.** The change sits inside a decision that already exists: a defect returning
  code to that decision, a mechanical edit, a local presentation change. Follow the plan's graduation
  rule. Do not open `notes/proposed/`.
- **The decision is the same; a fact moved.** A path, name, default, or mechanism description is now
  wrong. Edit the owning note in the same change. A second file that repeats the decision is a duplicate,
  not a record.
- **A new tradeoff exists**, code and current docs cannot hold it, and one of the four mistakes above
  would follow. Continue to section 2.

If the draft you are about to write would have no decision value the day it lands, it belongs in the
commit, not in `notes/`.

## 2. Write the note the gate actually requires

The gate was chosen in [requirements-synthesis](requirements-synthesis.md). This section chooses the
text. Use the status line this repo already checks: within the first six lines,
`日期：YYYY-MM-DD · 状态：**<状态词>**`, and a filename `YYYY-MM-DD-<topic>.md` whose date is the day
the topic was first raised, matching the status line. The directory and the status word are the same word.

**Doing now, and the tradeoff is new.** Create `notes/proposed/`. Four sections, in this order:

- `## 问题（可观察行为）` — the situation, readable with the remedy covered. State the conflict, the
  broken guarantee, or the behavior someone can point at. The mechanism you are about to propose does
  not appear here.
- `## 提案` — what will be true if this is accepted, what it rules out, and what it costs. One decision.
  Name what can go wrong and what the change knowingly gives up; this repo has no separate risks
  heading, and those two facts still belong in the proposal. The session that implements this will
  read this file and not the frozen plan, so the behavior, the authority boundary, and the exclusions
  are written here in full.
- `## 输掉的方案` — each alternative that was really on the table, as its own short block: what it was,
  and why it lost. The reason is a constraint, a cost, or evidence that failed. "Rejected in review" and
  "the user preferred the other one" are not reasons; write the constraint that made it lose. Do not
  invent a block to fill the heading. If no real alternative exists, return to section 1.
- `## 验收` — the plan's `## 验收矩阵`, rewritten as checks. Each load-bearing row names the command or
  diff check, the assertion, and what red looks like. Someone who never saw the chat can run it. A row
  that cannot be written that way means the plan is not mature: leave the card active and return to
  [validation-design](validation-design.md). Do not file a proposal to hold a placeholder.

Do not add a second status word (待拍板, 调研中, 待实施). The status line is the lifecycle. The cost of
the choice stays inside `## 提案`; what will pin it stays inside `## 验收`.

**Doing now, and the work is already authorized or exempt.** A mechanical or local edit, a slice the
user already named, and a bug fix that stays inside an existing decision do not become a proposal. Do
the work. When that same change still creates a lasting tradeoff, write `notes/implemented/` with the
delivery: present tense, `## 输掉的方案`, and the commands that actually ran, including the red that
was produced before the fix. A check that did not run is written as blocked, with the reason.

**Decided deferral.** Do not open `proposed/`. Write the trigger into the note that owns the decision.
The trigger is one observation someone can check, and the place it shows up. "Later" and "when there is
time" do not qualify. A row in [`triggers.md`](../triggers.md) is not automatic. Add one only when leaving
it off the index would let a later session redo the rejected option, and the condition is a single
observation that shows up in the work: a run, a file, a vendor release, or an audit. A life event, a user
nod, a bundle of maybes, or anything a standing order already watches stays on the owner and the closed
plan. Close the plan into `_done/_closed_plans/` with a pointer at that note. When the condition arrives,
open a new card that cites the closed one.

**Rejection.** The lost option has to remain findable, or the same proposal returns. When an owner note
already exists, add the alternative and why it lost to that note's `## 输掉的方案`, then close the plan.
Open `notes/rejected/` when a standalone page is what will stop the re-argument. The status line says
`rejected` and one line of why. Keep the problem, the proposal that lost, and the alternatives; a slogan
in place of those sections will not stop the next proposal.

**Digestion.** The conclusion already lives in a note or a current contract. Point the plan's status
line at that home and close the plan. A second file that repeats the sentence is not a record.

**The judgment is not supported yet.** The card stays in `plans/`. Name the missing evidence or the
human confirmation, and the next step. A missing acceptance matrix is unfinished work, not digestion.

## 3. Carry the decision across; leave the deliberation on the plan

On a real graduation, `git mv` the plan to the closed pool named by the [backlog charter](../README.md).
Keep the plan body: background, open questions, probe notes, and the argument about how to slice the
work are the record of how the judgment was reached. Add a destination pointer on the status line and
repair relative links in the same change.

Write the note as a new text. Carry only what the next session needs in order not to reopen the decision:

- the observable problem;
- the decision, its boundary, and its cost;
- the alternatives that lost, with the reasons;
- for a proposal, the executable checks;
- which earlier note this replaces in part or in full.

A sentence whose subject is the conversation ("round two", "the reviewer", "as of this draft") does not
carry. A link may point at the closed plan or at an owner file; the link does not stand in for the
sentence that states the behavior and how to know it is done.

Settle ownership in the same change:

- The same decision, with a fact now wrong: edit the owner. Write the fact as it is. Do not append a
  changelog of the note itself.
- Part of an older decision is replaced, and the rest still stands: keep both notes, link each to the
  other, and say in each file what it still owns.
- The older decision is fully replaced: absorb its unique rationale, alternatives, costs, required
  verification, and any named gap in what was checked, repair every inbound link, then delete the old
  file. Git is not a substitute for that absorption. The history remains in git after the unique
  content has moved.
- The decision is reversed: write a new note and cross-link. Do not edit the old decision into its
  opposite.

## 4. Read it as the next session

Read the draft as someone who does not have this chat. It is recorded when every line below holds:

- The mistake it prevents is one of the four in section 1, and you can say what that mistake looks like
  on a future change.
- `## 问题（可观察行为）` still makes sense if `## 提案` is covered.
- Each block under `## 输掉的方案` is an alternative that was actually considered, and the reason it
  lost is a constraint, a cost, or failed evidence.
- A proposal's `## 验收` can be run: command or check, assertion, red shape. Unrun items are named as
  unrun.
- The file is one decision, and section 1's search is visible in the result: an edited owner, a
  cross-link, or an absorbed predecessor.
- Behavior, exclusions, and acceptance are in the file. A later session does not need the plan or the
  transcript to start.
- The status word, the directory, and the filename date agree.

`pnpm verify` checks the status line, the filename, the directory, relative links, and that an
implemented note contains `## 输掉的方案`. It does not check whether the alternative is real or whether
the problem can be read without the remedy. A green run leaves this section's failures in place.

When a proposal ships, rewrite it in the same change as the delivery. What was `## 提案` is written as
what is now true, including the cost and the risk as facts of the shipped decision. `## 验收` becomes the
commands that ran and the red-then-green that was seen; a blocked check stays blocked, with the reason.
Delete future tense and leftover task lists. Keep the alternatives, the evidence that pins the decision,
and any check that was named and not run. The close line states the external result this repo already
requires: what would trigger this behavior, what the user gets, how completion was judged (a real
walkthrough, `pnpm eval`, or a fresh-context review), and which checks did not run. Whether a delivered
note later stays the current owner or is frozen is [archive judgment](../../vendor/dsh/.agents/skills/dsh-archive-agent-notes/SKILL.md),
not this playbook.

**Finish:** one destination is true. A proposed note is waiting for a nod. An implemented note records a
decision that already shipped, with the commands that ran. A deferral's trigger sits on its owner. A
`triggers.md` row exists only when the index is what stops the rejected option from returning. A rejection is findable where the next proposal will be seen. Digestion points at the
home that already holds the conclusion. Or no note was warranted, and that is the recorded result. The
plan has left the active shelf with a pointer. If acceptance or a human confirmation is still missing,
the card is still active and the gap is named. None of these outcomes authorize implementation by
themselves.
