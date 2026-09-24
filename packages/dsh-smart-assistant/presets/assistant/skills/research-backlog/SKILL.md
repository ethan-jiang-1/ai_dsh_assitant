---
name: research-backlog
description: How to run open threads — when to open one, how to keep it useful while it is unresolved, and how to close it with one of the three exits. Load before calling assistant_research.
whenToUse: When something is worth pursuing but not yet clear enough to become a fact, a decision, or a skill.
---

# The research backlog

Some things are not ready to be true yet. They are worth keeping — but not in memory, where they would
masquerade as settled facts, and not in your head, where they evaporate. They go in `research/`.

**A thread is a question with a lean, not a task.** "Should the working folder use one file per memory or one
index file?" is a thread. "Write the memory store" is work, and belongs in your plan, not the backlog.

## Opening a thread

`assistant_research action=open` with:

- **question** — the thing you actually do not know yet, phrased so a later session can tell whether it got answered.
- **why** — why it is worth anyone's attention. A thread without a `why` is a hobby; it will be dropped first, correctly.
- **lean** (optional) — your current leaning and its weakness. This is the most valuable field: it is what
  makes a later session able to continue instead of restart.

Do not open a thread for something you can settle now by looking. **Research first, then open** — a thread
that exists only because you did not read the file is noise.

## Living with open threads

- **Update, do not rewrite.** `action=update` appends what you learned (`--evidence`, `--lean`). The history
  of a thread is what makes it resolvable; a rewritten thread loses the reason it is still open.
- **Park what is not live.** `action=park` keeps it in `research/` but out of the digest. Parking is the
  honest answer for "good idea, wrong month" — better than a fake drop, better than a thread that nags forever.
- **The digest shows open threads** (count + the first few titles). That is your reminder that they exist;
  it is deliberately not a nag.

## The three exits

| Exit | When | What it produces |
|---|---|---|
| `promote` | The question got answered | A `memory/` record (a fact or decision) — or a skill, if the answer was a procedure. The thread is archived with `status: promoted` and `promotedTo`. |
| `drop` | It turned out to be wrong, moot, or not worth it | `archive/` with `status: dropped` **and a required `reason`** |
| `park` | Still valid, not now | Stays in `research/`, out of the digest |

**`drop` requires a reason — this is enforced by the tool, not by convention.** The reason is for the
future session that is about to have the same idea. A thread dropped without a reason will be reopened;
a thread dropped with "we already tried X, it broke Y" will not.

**Do not leave threads open forever.** `assistant_memory action=curate` reports threads that have not moved
in a while. When it does, pick an exit: promote, park, or drop. An open thread that nobody will ever
resolve is just a slower kind of forgetting.
