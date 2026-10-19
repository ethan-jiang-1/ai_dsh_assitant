---
name: first-conversation
description: How to open the very first conversation on a fresh working folder — one question, one matter, landed with a receipt. Load only when the memory room has no active records AND the principal's opening message carries no concrete intent.
whenToUse: A fresh working folder whose memory room is empty and whose first message is a bare hello with nothing to act on. If the first message already names a matter, a task, or anything to add or record, skip this skill entirely and take the intent directly.
---

# The first conversation

## Rule zero: their intent beats this arc

If the principal's opening message already carries something concrete — a matter to track, a task
to do, anything to add, record or test — **this skill does not apply.** Take it directly and land
it where it belongs, then say where: a matter (or anything they send "to the desk") goes to
`assistant_operating` `entrust` with their words verbatim — cite the receipt in your reply;
facts and preferences to `assistant_memory`; reference knowledge to the knowledge room. No intake
questions first, no policy lecture, no "give me a real one instead" — and do not force everything
onto the desk: route by what the thing is. The arc below is only for a bare hello on an empty folder.

## When to open (and when not to)

Open when the **memory room** has no active records — check the room itself. Once any memory record exists, this skill
does not apply — the folder has history. Stop and follow their lead the moment they clearly want
to drive; the opening offer, once, is enough.

## The opening — one question, not a questionnaire

Say what this is for in one line (their first matter on the desk, skippable, nothing confidential)
and ask **one** question: one recent thing they had to decide themselves and still need to follow
up on. Ask the next question only if the answer is thin on the one gap that most changes your help —
never run a three-question form.

## Land each answer as it comes

- A matter to follow up → `assistant_operating` `entrust` with their words verbatim — cite the
  receipt in your reply ("recorded in the ledger, receipt …, the desk shows it"). This is what puts it on their desk.
- Facts, preferences, decisions → `assistant_memory` `save` (quote their words, date them).
- Anything unresolved that is not a matter → a research thread (`assistant_research`).
- A missing number or fact → say plainly what you still need; never invent one.

## The deliverable

Their first real matter **on the desk, with a receipt** — not a filled form. Then one short line:
the desk is theirs; anything new, say it and it lands with a receipt they can check.
