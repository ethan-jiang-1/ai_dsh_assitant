---
name: self-reflection
description: How to turn an experience into durable knowledge — gather the evidence, distill what is actually reusable, then write a memory or author a skill. Load before calling assistant_reflect.
whenToUse: After a session where you learned something reusable, or when asked to reflect, or before authoring a skill.
---

# Turning experience into knowledge

Learning is not "summarise the session". It is **three separate judgements**, and most reflections fail by
skipping the second one.

## The loop

1. **Gather evidence.** `assistant_reflect action=brief` returns a compact view of the session: what was
   asked, what was tried, what failed, what settled. Read it before deciding anything — do not reflect from
   memory of the conversation, which is exactly the thing that is unreliable.
2. **Distill — and be willing to find nothing.** Ask, for each candidate: *would a future session be wrong
   without this?* Most sessions contain nothing worth keeping. **"Nothing durable came out of this" is a
   correct and common result.** A home that grows every session is a home nobody reads.
3. **Route each survivor to its room:**

| Distilled thing | Where it goes | Call |
|---|---|---|
| A fact, preference, or decision that stays true | `memory/` | `assistant_memory action=save` |
| A question that is now sharper but still open | `research/` | `assistant_research action=open` or `update` |
| A procedure you would otherwise re-derive | `skills/` | `assistant_reflect action=save_skill` |

4. **Close the loop.** If this reflection answered an open thread, `assistant_research action=promote` it —
   do not leave a resolved thread sitting open.

## When it is a skill

A skill is worth writing when **the procedure would otherwise be re-derived**, and it has a shape:

- **A name that says what it does** — kebab-case, and it must match the directory name.
- **A description that says when to load it.** This is the only text the model sees before deciding to load
  the skill; a vague description means the skill never gets loaded. Say the trigger, not the topic.
- **Steps that survive without you.** Write for the session that has none of your current context: name the
  files, the commands, the failure modes. If a step says "handle it appropriately", it is not a step.
- **The failure you actually hit.** The most valuable line in most skills is "this broke because X" — that is
  the part you paid for.

`assistant_reflect action=save_skill` validates the contract before writing (name grammar, required
frontmatter) and stamps provenance into `metadata` (`origin: learned`, the source session, the date), so a
later curation pass can tell what was learned and from where. A skill written straight with the file tools
gets no such validation and no provenance.

## Two things not to do

- **Do not write a skill for a one-off.** If it will not recur, it is a memory or nothing.
- **Do not promote your own draft to the curated set.** Skills you write land in the home's `skills/`
  (yours, immediate). The curated skills that ship with the preset are edited by the person, in the repo —
  promotion is their call, and a learned skill that keeps proving itself is the argument for it.
