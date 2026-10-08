---
name: requirements-elicitation
description: How to grind a fuzzy idea into requirements this repo can act on, by routing to the real elicitation skills (grilling, domain-modeling, prototype, research, to-questionnaire) and mapping their output onto this repo's pipeline (_backlog/plans/ card → notes/proposed/ → implement). Use when a request arrives as a half-formed intention, when a plan card's 已知与未决 is thin, when a plan card is too big for one session, or when you are about to write a proposed card from a conversation nobody actually interrogated.
whenToUse: Turning a vague idea, a stakeholder wish, or a one-line request into a card with real candidates and a real graduation judgment; deciding which elicitation skill fits the unknown in front of you; stress-testing a plan card before it graduates. Not for scheduling the work, not for implementing it, and not a substitute for the skills it routes to — do not re-derive their protocols from memory.
---

# Requirements elicitation: route to the skills, land the result in a card

**This playbook is a router, not a copy.** The elicitation protocols live in the skills themselves
(`grilling`, `domain-modeling`, `prototype`, `research`, `to-questionnaire`, `codebase-design`,
`writing-for-agents`). Read the skill; do not reconstruct it from a summary, and do not let this page
stand in for it. What this page owns is the half the skills cannot own: **which one fits the unknown
in front of you, and where the output lands in *this* repo.**

**Check what you can actually load before planning around it.** Some of these are in a given session's
catalog and some are not, and the set is not stable across sessions:
`grilling`, `domain-modeling`, `prototype`, `research`, `codebase-design` and `writing-for-agents`
were reachable in the session that wrote this page; **`to-questionnaire` and `wayfinder` were not** —
so for those two this page's summary is all you have, and you must say so rather than imply you ran
them. The skills also live as plain `SKILL.md` files in the upstream `mattpocock/skills` checkout, so a
session that can read the filesystem but not invoke the skill tool can still read the protocol — see
the [upstream ledger](../README.md), where the checkout and its revision are recorded.
Never silently imitate a protocol you cannot read: an unconstrained impersonation produces ordinary
prose with a confident label on it.

The failure this prevents is not "we built the wrong thing because the user lied". It is **a
confident card written out of a conversation nobody interrogated** — acceptance criteria invented
downstream of the decision, candidates never weighed, and the riskiest assumption ("the model can
probably do this") never treated as a fact to go check.

## Where the output lands (read this first)

Elicitation produces **judgment material, not authorization**. The pipeline it feeds:

```text
fog ──elicitation──▶ _backlog/plans/ card ──毕业四门──▶ notes/proposed/ card ──用户点头──▶ implement
                          (推敲中)                (呈批)              (唯一授权点)
```

- **Never skip to `notes/proposed/`.** A proposed card must carry 问题/方案/验收 with **executable**
  acceptance ([notes/README.md](../../../notes/README.md) §二之三). Elicitation that hasn't finished is
  a `plans/` card, not a thin proposal.
- **Never schedule.** Ordering and start authority belong to the user's scope and the current turn.
  Producing a sequenced task list here rebuilds the second queue this repo has retired twice
  ([_backlog/README.md](../../README.md) 主干 / 明确不借).
- **One fact, one home.** Interview findings → the card's 已知与未决. Evidence-heavy material →
  [`_backlog/reference/`](../../reference/README.md), linked from the card. Neither gets a second copy.

## The router: unknown → skill

| The unknown | Skill | Why this one | What it can never prove |
|---|---|---|---|
| The idea itself is fuzzy, or a card's 已知与未决 is thin | **`grilling`** | The interview primitive: rounds, the frontier, facts are the agent's job and decisions are the user's | Nothing to build — it settles *decisions*, not facts |
| A term is overloaded, or two words are doing one job | **`domain-modeling`** | Challenges terms against the project's language, and records hard-to-reverse decisions | Not a spec and not a scratch pad — vocabulary only |
| It must be *run* to be answered: does this state model feel right, does extraction hold, what should this look like | **`prototype`** | Throwaway code that answers one question; two distinct branches (logic vs UI) | Adoption, business value, or that a real audience exists |
| An external fact: capability limits, API/schema behaviour, pricing, what upstream actually does | **`research`** | Background agent against **primary** sources; returns a cited Markdown | That *our* design works, or that anyone wants it |
| The answer lives in **someone else's** head | **`to-questionnaire`** | Interviews you about the **send** (who, what back), then aims questions at the gap | Anything, until it comes back — mark it unknown; never simulate a human |
| The effort is bigger than one session can hold | **`grilling` again, breadth-first**, then chart (§ The too-big case) | Fans out across the space instead of going deep on one thread | — |
| A module's *shape* is the question (where the seam goes) | **`codebase-design`** | Deep-module vocabulary: module, interface, depth, seam | Not an elicitation tool; it shapes what you already decided to build |

## The discipline the router rests on

Four properties of `grilling` carry most of the value, and all four change how you work the card:

1. **A design tree, worked in rounds.** Every decision branches into the decisions hanging off it.
   The **frontier** is every decision whose prerequisites are already settled — the questions you can
   ask *now*. Ask the whole frontier in one round, **numbered, each with your recommended answer**,
   then wait for the answers before the next round. A question whose answer depends on another still
   open this round belongs to a **later** round. Each round's answers reshape the tree and push the
   frontier outward.
2. **Facts are yours; decisions are the user's.** Dispatch a sub-agent for any fact you could look
   up yourself. Only decisions go to the human. The characteristic agent-app mistake is asking a fact
   question in decision clothing — *"can the model reliably extract this field?"* is a claim to be
   tested, not a preference.
3. **A running fact-exploration is itself an unsettled prerequisite.** Do not block the round on it:
   only the questions *downstream* of that fact wait for the sub-agent; ask the rest of the frontier
   now. (This is the part most easily lost — treating a dispatched lookup as a reason to stall.)
4. **Done means the frontier is empty** — every branch visited, nothing left silently assumed. Not
   "the user stopped objecting", and not "we ran out of questions".

## Driving each skill to full capacity

Routing to the right skill is necessary but not sufficient — a skill driven against its grain produces
a mediocre result with a competent-looking wrapper. Three levers hold for all of them:

1. **Outsource the fact-finding.** These skills assume facts are the agent's job. Give the agent
   environment access (point at the file, the doc, the command) and what reaches the human is only
   real decisions — the round completes far faster. Being your own search engine is the worst-value
   usage in the whole method; it burns the human's scarcest resource on work the agent should have done.
2. **Treat the recommended answer as the default.** Every question carries a ➡️. Where there is no
   disagreement, "go with the recommendation" is a complete answer — it is what makes a ten-question
   round answerable in one pass. Spend the human's decision budget only on real forks.
3. **Let the artifacts flow.** Any one skill alone is just a good conversation. Maximum value comes
   from the pipeline: terminology and decisions settled during the interview feed the plan; research
   files and prototype verdicts feed back as facts into the interview or the plan; the plan feeds the
   slices. **An artifact that never reaches the next stage did not happen** — which for this repo means
   it is not in the card and not linked from [`reference/`](../../reference/README.md).

Per skill, the lever that pays and the waste to avoid:

| Skill | Do this | Not this |
|---|---|---|
| **`grilling`** | Answer the whole frontier per round ("per the recommendation" where there is no disagreement); write each term down the moment it settles and record hard-to-reverse decisions immediately; stop exactly when the frontier is empty | One question per turn (multiplies the interview's cost); doing the fact-finding yourself; calling it done early because it feels "close enough"; batching terminology to the end |
| **`research`** | Cut small, decidable questions ("does version X of this tool support Y" beats "look into X for me"); fan several out in parallel; check the citation density on return; feed the file back into the interview as fact | One broad question then waiting serially; filing the report and moving on; accepting conclusions with no traceable source |
| **`to-questionnaire`** | Write it the moment you find the answer is in someone else's head — async has the longest latency, so send early; settle the **send** (who, what back) before letting it draft; order by importance, assuming one pass | Waiting until the interview is fully blocked; skipping the send and asking straight for questions; treating replies as conclusions rather than as new interview input |
| **`prototype`** | Decide the branch first (logic-feel vs UI-shape — getting this wrong wastes the whole prototype); for a two-candidate decision build both and feed identical inputs; let a non-technical stakeholder drive it; fold the verdict into the plan and keep the prototype as evidence | A UI prototype for a logic question (or the reverse); three "variants" that differ only in styling; writing it inline in the main thread; nursing prototype code as production |
| **the plan** | Compile immediately after the interview, in the **same unbroken context**; before shipping, audit three things — are the user stories long enough (did the failure paths make it in), does Out of Scope pin the red lines, are the implementation decisions contracts rather than file paths | Cold-starting it (unaligned conversation yields a hollow plan); accepting five user stories; letting it hardcode paths and line numbers that rot |
| **the slices** | Use the confirmation step as leverage: for each one ask "does it depend only on what genuinely blocks it" and "can it complete in a fresh window"; insist on vertical slices | Accepting horizontal slices (database, then API, then UI); leaving blocking edges empty and relying on default order; forcing one oversized slice into a window |
| **charting (too-big)** | Only for a genuinely oversized idea; name the destination first and let it lock scope; fire the research tickets in parallel; questions only a human can settle must be worked with that human — the agent must not answer its own | Charting something one conversation could settle (pure overhead); several tickets per session; letting the agent stand in for the human's side |

**One hard sequencing rule** (source: `ask-matt`, not the summary pages): keep the interview, the plan
and the slices in **one unbroken context window** — do not clear or compact until the slices exist, so
all three build on the same thinking. The limit is degradation, not tidiness: if the session approaches
the point where reasoning sharpens poorly, do not push on degraded — compact **at a phase boundary** and
carry on. Slices, by contrast, are designed to be worked fresh, one per context.

## The too-big case: chart before you spec

When the idea is **too big for one session**, do not interview it linearly — a long interview degrades
and you lose the linked detail. The real mechanism (`wayfinder`) charts a **map of decision tickets**
and works them **one per session**, producing **decisions, not deliverables**. The parts worth
carrying over even when you use our own homes instead of a tracker:

- **Name the destination first.** What reaching the end looks like — a spec, a locked decision, a
  change in place. The destination fixes scope and shapes every ticket.
- **Ticket when the question is already sharp, even if you can't act on it yet.** Do **not** pre-slice
  what you can't yet phrase: that is *fog*, deliberately left coarse. One patch of fog may graduate
  into several tickets, or none.
- **Fog only gathers toward the destination.** Work beyond it is **out of scope** — scope, not
  sharpness, puts it there; it never graduates, and it returns only if the destination is redrawn.
- **The map is an index, not a store.** A decision lives in exactly one place; the map gists and links.
- **Refer to tickets by name, never by bare id.** A wall of `#42, #43` is illegible.
- **Hand off, don't build.** When the map clears, collapse it into a plan — looping a cleared map
  straight into implementation throws away the linked detail.
- **Claim before working**, so concurrent sessions don't collide.

**Where the map lives here:** the tracking half is the gap. `wayfinder` assumes an issue tracker with
child issues and native blocking; this repo's `_backlog/plans/` is explicitly **never a scheduler**.
So for a too-big effort, use a `plans/` card as the **map** (destination, decisions-so-far, fog,
out-of-scope as sections) and keep the ticket-by-ticket working in that card's own sections —
**without inventing a second tracker**. If an effort genuinely needs parallel claimable tickets, that
is a question for the user, not something to stand up unilaterally.

## Compiling to a plan (the `to-spec` / `to-tickets` disciplines)

When elicitation has settled enough, the compile step has its own rules. Borrow the disciplines, not
the templates:

- **Compile, do not re-interview.** This step synthesises what is already decided and must not reopen
  the interview. Re-interviewing here is how aligned answers get quietly overwritten.
- **Check the seam before writing.** Decide where this will be tested, and prefer the highest existing
  seam; new seams are a design cost. Confirm the seams with the user before committing to a plan.
- **Write from the user's perspective.** Problem and solution as the *user* experiences them — not a
  layer-by-layer implementation list.
- **User stories, extremely extensive.** A long numbered list, `As an <actor>, I want a <feature>, so
  that <benefit>`. For agent apps this list must include the **failure paths** (§ below). Under-writing
  this list is the documented way specs get thin.
- **Out of Scope gets its own section** — a separate, explicit statement of what is *not* being done.
- **No file paths or code snippets in the plan.** They go stale fastest. The one exception: a prototype
  snippet that encodes a decision more precisely than prose (state machine, reducer, schema, type
  shape) — inline the decision-rich part and note it came from a prototype.
- **Vertical slices, not horizontal.** Each unit cuts a narrow but **complete** path through every layer,
  is demoable/verifiable alone, and is sized to one fresh context window. Declare each one's **blocking
  edges** explicitly — which units genuinely gate it.
- **Wide refactors are the exception.** A mechanical change whose blast radius fans across the whole
  codebase (a rename, a retype) cannot land green as one vertical slice: sequence it **expand → migrate
  in batches → contract**, staying green batch to batch because the old form still exists.
- **Quiz the user on the breakdown** — granularity right? edges correct? merge or split anything? —
  before treating it as settled.

## The question class agent apps keep forgetting

For anything model-facing, two families are **requirements**, not implementation details:

1. **Autonomy boundary.** Per action: does the agent decide it, recommend it, or ask first? Answer
   per-action — the boundary is usually jagged, and answering it once for the whole product hides that.
   A settled boundary is a **hard-to-reverse decision** (a `domain-modeling` ADR candidate).
2. **Failure paths.** What happens when the model is wrong, unsure, refuses, or hallucinates? These
   belong in the user-story list, and their absence is the single most common omission in a card
   written from a pleasant conversation.

Neither is researchable. Both need the human.

## Exit criteria: is the card actually ready?

The card has been elicited properly when all of these hold. If any fails it stays 推敲中 — a card that
cannot name its own missing evidence is the failure mode.

- [ ] **Frontier empty**: nothing left silently assumed; every open item is written down as open, with
      what would settle it.
- [ ] **四问 answerable**: 该不该做 / 何时 / 次序 / 放弃什么 each has an answer with its reason.
- [ ] **Candidates are real**: every candidate has a cost, and at least one plausible option was written
      down and rejected **with its reason**. A single-candidate card means no search happened.
- [ ] **Red lines on record**: what we will never do here (negative knowledge, so the argument does not
      reopen).
- [ ] **Every fact is sourced** (path, command, or URL); every decision is attributed to the human, not
      to your inference.
- [ ] **毕业门 written as a test**: what evidence would move it, and to which of the four exits.
- [ ] **Autonomy and failure paths** answered, if the work is model-facing.

Meeting these makes the card **graduate-ready** — eligible for `notes/proposed/`. It does not make it
authorized.

## Hard-won details

- **A recommendation is not a decision.** Attaching one to each question speeds the round up; never let
  it become the recorded answer without the human confirming it.
- **Do not let "the user said X" end the search.** Stated want and underlying want diverge most often
  exactly where the requester already picked a mechanism. Separate the need from the proposed solution.
- **Write the interview into the card as you go.** Findings living only in a transcript are worth
  nothing to the next session — this repo grades on cards.
- **A prototype is throwaway code, not a throwaway answer.** Mark it clearly as a prototype and locate
  it near what it prototypes; when done, fold the validated decision into the real thing and **keep the
  prototype as a primary source** (a side branch, pointed at from the implementation record).
  "Throwaway" constrains how the code is written — it is not a promise to destroy the evidence.
- **When a fact undercuts the premise, stop and re-open.** Discovering mid-way that the "obvious"
  mechanism does not exist is a *result*: record it and re-derive the candidates, rather than patching
  the old ones.
- **Thin cards are cheaper than confident ones.** Mostly-未决 is legitimate. Filling 候选与取舍 with
  options never weighed is not.
- **Never simulate a human.** If an answer needs a real person, the honest output is a field marked
  unknown plus a questionnaire — not a plausible invention.

## Finish line

A card in [`_backlog/plans/`](../../plans/README.md) satisfying every exit criterion, its evidence
linked from [`reference/`](../../reference/README.md), its status line naming next step and trigger,
and its 毕业门 naming the exit it would take. Then — and only then — proposing it is a conversation with
the user, not a formatting step.

This playbook is a draft living in [playbooks_plan/](../README.md); it graduates to
`.agents/skills/requirements-elicitation/` once one or two real deliberations have validated or
corrected it.
