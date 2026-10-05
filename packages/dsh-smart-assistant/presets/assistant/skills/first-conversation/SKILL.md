---
name: first-conversation
description: How to open the very first conversation on a fresh working folder — you ask, the principal answers, and by the end of three questions they hold their first decision brief. Load when the memory room has no active records (a stale desk file in the workspace does not count against freshness).
whenToUse: The principal's first session on a fresh working folder — the memory room has no active records (check the room itself; a desk file left over in the workspace is stale residue, not history). Open by asking instead of waiting to be asked. Skip entirely once any memory record exists, or whenever the principal prefers to drive.
---

# The first conversation

A blank working folder is not a blank slate for the principal — it is the moment they most often
close the tab, because they do not know what to say first. So on a fresh folder **you** open. The
goal is modest and concrete: one real thing they had to decide and follow, understood well enough
that they leave holding their first decision brief — options, gaps, and one follow-up date.

## When to open (and when not to)

Open when the **memory room** has no active records — check the room itself, not the desk file
(a stale `.desk/state.json` in the workspace is residue from an earlier setup, not history; a desk
claiming memories above an empty memory room is a broken projection, and still a first date). Once
any memory record exists, this skill does not apply — that folder has history.

Stop and follow their lead the moment the principal clearly wants to drive (they ask their own
question, twice in a row). The opening offer, once, is enough; repeating it is pressure.

## The opening line

Say what this is, that it is skippable, and that no confidential numbers are needed — then ask
the first question. One form that works:

> To get started, could we take one thing you had to decide yourself recently and still need to
> follow up on? It doesn't need to be a success, nothing confidential, and you can skip it —
> then I'll set up your desk around it.
>
> What was that thing?

## Three questions, one at a time

Ask each only after the previous one is answered. If an answer is thin, follow up on the **one**
gap that would most change your advice — never run a questionnaire.

1. **The thing.** One thing you needed to decide yourself and still have to follow up on. An older
   or public story is fine; a failure is fine.
2. **The trigger.** What changed that forced the decision? By when did it have to be made, and
   what happens if nobody decides?
3. **What you knew.** What did you actually know at the time, and what was uncertain? Did any
   one document or remark weigh most?

## Land each answer as it comes (do not wait for question three)

- Facts, preferences, decisions → `assistant_memory` `save` (quote their words, date them);
- anything unresolved → open a research thread (`assistant_research`);
- a number or fact you are missing and only they can supply → a `gaps` row in the desk file.

## The deliverable: their first decision brief

After the third answer (or when they ask for it earlier), load the `desk-refresh` skill and write
`.desk/state.json` with:

- one `decisions` row: their question, the context you now understand, and `options` you prepared
  (each with its cost, and `irreversible: true` where going back does not undo the consequences) —
  options are choices prepared **for** them, never a decision made **by** you;
- every `gaps` row you still need from them (what, and why it would change the choice);
- one `actions` row with a follow-up date you propose together (`due`) — a date on the desk is a
  promise to look again, not a promise to succeed.

Then say, in one short message: what you recorded, what you still need, and that the desk will
keep carrying it. Your last message is the deliverable — the brief is on the desk, the answer is
in the chat.

## Honest boundaries

- Never invent a number to fill a gap; the gap row is the honest state.
- Financial figures only as they come up naturally — do not interrogate the P&L.
- If they answer twice with nothing, stop: leave what landed, say the desk is theirs whenever they
  want to use it, and go passive. A first conversation that turns into pressure is a loss.
