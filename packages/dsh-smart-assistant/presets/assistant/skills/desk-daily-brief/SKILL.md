---
name: desk-daily-brief
description: How the operating ledger becomes a daily briefing — when the principal asks for a daily report (or any standing report rhythm), commit ONE recurring schedule whose prompt loads this skill, and when the scheduled prompt arrives, read the whole ledger via assistant_operating and present the brief. Load when the principal asks for a daily/standing report, or when a `[daily desk brief]` scheduled prompt arrives.
whenToUse: (a) The principal asks for a daily report, morning briefing, or any standing report rhythm over their operating matters. (b) A scheduled prompt containing `[daily desk brief]` has just arrived in this conversation — that arrival IS the brief moment. (c) The principal answers the brief with confirmations, attributions, or deferrals (their own words are explicit instructions).
---

# The daily desk brief: the ledger speaking, the principal deciding

Operating matters live in one authoritative ledger; a daily brief is how it speaks first thing
instead of waiting to be opened. Three halves, all mandatory: **one standing schedule**, **the
brief read from the ledger**, **the principal's reply as instructions**.

## 1. The standing schedule (once, same turn)

When the principal asks for a daily report (first time or changing the rhythm):

- `schedule_create` with `every` = 86400 seconds, created at the moment that matches their
  preferred time (ask once for the time and timezone if ambiguous, then remember it in memory);
- `prompt` = `[daily desk brief] Present the operating desk brief per the desk-daily-brief skill`;
- the schedule lives in THIS conversation — say so: the brief always lands here. To move it,
  create the new one and `schedule_delete` the old in the same turn.

## 2. The brief moment — read the ledger first, decide nothing

When the `[daily desk brief]` prompt arrives, call `assistant_operating` with action `desk`
BEFORE writing a word. The brief is composed ONLY from what the ledger returns — never from
memory of past conversations. Sections, in this order, skipping empty ones:

1. **Due today** — matters whose next checkpoint or promised deadline is today: name the matter,
   the time, and what "done" looks like.
2. **Waiting for you** — every pending proposal, one line each: the matter, the change
   (reschedule / checkpoint / complete / abandon), and the default action you suggest. These are
   the asks; each one needs their explicit word to apply.
3. **Unclaimed** — fragments that named no matter: one line each, ask whether to attach one to a
   matter (never guess attribution yourself).
4. **Overdue, no news** — promised deadline passed, still active, no new material: present the
   three options (push / reschedule / abandon) as a question, not a recommendation.
5. **Overnight material** — materials retained since the previous brief.

Tone: itemised when there is something, one short line when there is nothing. Never mark a matter done
because a sentence sounded final; completion rides the tool with verbatim evidence.

## 3. The reply is the instruction

When the principal answers the brief, every confirmation / attribution / deferral in their words
is an explicit instruction: apply it through `assistant_operating` in the same turn (confirm a
proposal by its id, claim a fragment to its matter, revise on their word — with a fresh operation
id and the observed revision), and say what the ledger now records. If their words are ambiguous
about WHICH matter, ask — do not pick.
