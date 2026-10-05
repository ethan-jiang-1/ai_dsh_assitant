---
name: morning-brief
description: How due dates become deliveries — commit a dated desk action AND schedule its reminder in the same turn (schedule_create), and when the scheduled follow-up arrives, present the brief. Load when an action lands on the desk with a due, or when a scheduled reminder fires.
whenToUse: (a) Any turn that writes a desk `actions[]` row with a `due` — create the matching reminder before the turn ends. (b) A scheduled follow-up has just arrived in this conversation — that arrival IS the brief moment. (c) The principal answers a brief by deferring it or telling you to stop reminding them (their own words, any language).
---

# Due dates that actually arrive

A dated action on the desk is a promise the principal can see; a promise nobody pings is a calendar
entry they must remember to open. This skill wires the two halves together: **commit = schedule**,
and **delivery = brief**. v1's promise is exactly the positioning one: not new information —
"the things you approved get pushed to the day they matter."

## 1. Commit = schedule (same turn, always)

Whenever you write a desk action with a `due` (first-conversation briefs, follow-up agreements,
review dates), call `schedule_create` before the turn ends:

- `at` = the due instant when it has a time, else **09:00 of the due date in the principal's IANA
  zone** (ask once, then remember it in memory);
- `prompt` = `[due follow-up] {the action's what} — present the due items per the morning-brief skill`;
- one reminder per due. The action's date moved → `schedule_update` the reminder to match; the
  action dropped or done → `schedule_delete` it. Desk and schedule never disagree silently.

## 2. The brief moment

When the scheduled prompt arrives, read the desk slice for this session, then answer in ONE short
message, in the principal's language:

- **Due and nearly due** (next ~3 days): each with its honest status — still open, or the desk
  already shows it done (then say so and close it; never invent completion);
- **Needing their call** (decisions whose moment has come, if the due implies one);
- **Blocking gaps** (only the missing data that blocks a due item).

Three blocks, no essay, no tables of zeros. The desk stays the record; the brief is the doorbell.

## 3. Silence, defer, budget

- The principal **defers** (puts it off to another date, in their own words) → `schedule_update`
  to the new date, update the desk action's `due` to match, one line of confirmation.
- The principal **silences** (stop reminding me, I will watch it myself) → `schedule_delete`,
  keep the desk action, note the silence in memory so a later session does not re-create it.
- **Budget — one delivery per due.** No re-ping without new information: a delivery
  the principal ignored is an answer, not an invitation to resend. Restarts do not stack (the Host
  already collapses missed recurring occurrences to the latest one); you do not stack either.

## 4. Honest limits

The brief carries what the desk actually holds — no invented progress, no "should be done by now".
If a due item's state cannot be read from the desk, say exactly that. v1 delivers inside the
conversation; the desk panel remains the standing view.
