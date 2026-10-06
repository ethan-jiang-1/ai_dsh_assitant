---
name: morning-brief
description: How due dates become deliveries — commit a dated desk action AND schedule its reminder in the same turn (schedule_create), ensure the standing weekly reconciliation exists, and when a scheduled follow-up or the weekly review arrives, present the brief. Load when an action lands on the desk with a due, or when a scheduled reminder (due or weekly) fires.
whenToUse: (a) Any turn that writes a desk `actions[]` row with a `due` — create the matching reminder and ensure the weekly review before the turn ends. (b) A scheduled follow-up (due or weekly) has just arrived in this conversation — that arrival IS the brief moment. (c) The principal answers a brief by deferring it or telling you to stop reminding them (their own words, any language).
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

## 2. The brief moment — a contextual briefing, not a doorbell

When the scheduled prompt arrives, do NOT just list what is due. Read ALL THREE sources first,
then deliver a briefing that shows you know the principal's context:

**Before writing the brief, read:**
1. The desk slice for this session (decisions, actions, gaps — their current state);
2. The memory room (`assistant_memory action=list`) — for relevant context about the principal,
   their company, their preferences, and what they have previously decided;
3. The research room (`assistant_research action=list`) — for open threads related to the due item.

**Then deliver in ONE message, in the principal's language:**
- **Due and nearly due** (next ~3 days): for EACH item, include not just its status but its
  CONTEXT — what decision led to this action, what the principal said about it when they
  approved it, what has changed since. This is the difference between a doorbell and a briefing.
  Example: instead of a bare "follow up on the client renewal call", reference the decision
  that led to it ("you approved the price increase plan last week — the hesitation was about
  cost increase vs. their unknown budget"), connect it to today ("today is the meeting day you
  agreed on"), and offer a useful next step ("if you already met, tell me the outcome and I will
  close it; if not, is the cost data you have now enough to support that conversation?")."
- **Needing their call** (decisions whose moment has come): reference the original context and
  the options that were presented, not just the question.
- **Blocking gaps** (only the missing data that blocks a due item): remind the principal WHY
  this data matters to THIS decision, not just that it's missing.

The brief should feel like it comes from someone who was in the room when the decision was made.
Three blocks maximum, no essay, no tables of zeros — but each block carries context.

## 3. Silence, defer, budget

- The principal **defers** (puts it off to another date, in their own words) → `schedule_update`
  to the new date, update the desk action's `due` to match, one line of confirmation.
- The principal **silences** (stop reminding me, I will watch it myself) → `schedule_delete`,
  keep the desk action, note the silence in memory so a later session does not re-create it.
- **Budget — one delivery per due.** No re-ping without new information: a delivery
  the principal ignored is an answer, not an invitation to resend. Restarts do not stack (the Host
  already collapses missed recurring occurrences to the latest one); you do not stack either.

## 4. The weekly sit — one standing reconciliation

Due pings handle single items; the weekly sit is the batch channel — the principal reviews a
whole week in one sitting. Two halves, same skill:

**Ensure it exists (same turn as any dated action, trigger (a)):** call `schedule_list` first —
if a weekly review you created is already active, do nothing (never stack). Otherwise
`schedule_create` with kind `weekly`, Monday 09:00 in the principal's IANA zone, prompt
`[weekly review] — present the weekly reconciliation per the morning-brief skill`. One weekly
review per working folder, ever; the principal silences it → `schedule_delete` and note the
silence in memory like any other.

**Deliver it** when the `[weekly review]` prompt arrives — the RECONCILIATION, bad news first:
1. **Last week's open promises** — actions past their due or slipped, stated as facts
   ("the renewal draft was due Thursday; the desk has no outcome on it"), never as blame;
2. **Decisions taken last week** — one line each: the call and its review date;
3. **Blocking gaps** — the missing readings stalling what is in flight, and why each matters;
4. **This week's asks** — what needs the principal's call in the next five days.

Same honesty rules as the daily brief: only what the desk and rooms actually hold, short
prose blocks, no tables of zeros.

## 5. Honest limits

The brief carries what the desk actually holds — no invented progress, no "should be done by now".
If a due item's state cannot be read from the desk, say exactly that. v1 delivers inside the
conversation; the desk panel remains the standing view.
