---
name: home-curation
description: The maintenance loop for your working folder — how to read the machine-checked curation brief, resolve each finding, and keep the digest worth reading. Load when the working folder feels cluttered or before a periodic tidy.
whenToUse: When the digest is crowding out work, after a burst of learning, or when curate reports findings.
---

# Keeping the working folder worth reading

Your working folder has one quality bar: **someone reading it should find more signal and less noise than last month.**
This is not housekeeping for its own sake — a working folder that fills with near-duplicates and dead threads makes
you *worse*, because the digest is what you actually see.

## The loop

1. **Ask the machine.** `assistant_memory action=curate`. It is a pure function over your files: it reports
   what is wrong, and it never guesses. You do not need to remember the rules — run the check.
2. **Resolve each finding.** The brief is a to-do list, not a report to admire. Each finding has an obvious owner:

| Finding | What to do |
|---|---|
| Near-duplicate memories | Keep the better-phrased one, `supersedes` the other |
| Dangling `supersedes` / `promotedTo` | The referenced record is gone — fix the link or drop the field |
| Malformed file / missing field | Read it, repair the frontmatter; a file that does not parse is silently absent from your digest |
| Digest over budget | Promote the weakest active records to `archive/`, or tighten phrasing — the digest is a shop window, not a warehouse |
| Open thread untouched for a long time | Pick an exit: `promote`, `park`, or `drop` (with a reason) |
| `dropped` without a reason | Add the reason, or the next session will reopen it |
| Skill with a bad name or missing description | Fix the frontmatter; an undiscoverable skill is a skill you wasted |

3. **Re-run until clean.** `curate` is cheap. Stopping at "mostly fine" is how a working folder decays.

## What you must not do

- **Do not delete history to make the check pass.** `archive/` is not a bin: superseded records and dropped
  threads stay readable on purpose. The check counts *active* things, not files.
- **Do not invent records to look organised.** An empty memory room is honest; a room of vague summaries is not.
- **Do not tidy what you did not understand.** If a record's meaning is unclear, it probably needs to be
  re-derived from its `source` — or dropped with a reason saying exactly that.

## The rhythm

Tidy when: the digest reports over-budget, a session ends after real learning, or `curate` shows findings
you have been ignoring. Not on a timer, and never instead of the actual work — a working folder is a tool, not a hobby.
