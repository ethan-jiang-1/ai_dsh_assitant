---
name: memory-hygiene
description: How to decide what belongs in durable memory, how to phrase a record, and how to keep the memory room from rotting. Load before calling assistant_memory save/forget.
whenToUse: Before writing to or pruning durable memory; when unsure whether something is a memory, a research thread, or a skill.
---

# Memory hygiene

Your memory room holds **what will still be true next week**. Everything else belongs somewhere else.

## Which room does this belong in?

| The thing in your head | Room | Why |
|---|---|---|
| A fact, preference, or decision that stays true | `memory/` (`assistant_memory save`) | Settled; it should be recallable and stable |
| A question you have not resolved, an idea worth exploring | `research/` (`assistant_research open`) | Not settled; it needs an exit, not a verdict |
| A way of doing something you would otherwise re-derive | `skills/` (`assistant_reflect save_skill`) | It is a procedure, not a fact |
| What happened in this session | nothing — the session log has it | Do not duplicate the log |

**The test**: would a future session be *wrong* without it? If yes, save it. If it is merely interesting, it is a research thread or nothing.

## Phrasing a record

- **One claim per record.** "The user prefers terse answers" — not "the user prefers terse answers and uses pnpm and is in Beijing". Three claims in one file can only be superseded as a unit.
- **State it so it can be falsified later.** "The deploy target is Fly.io (as of 2026-09)" beats "we deploy somewhere in the cloud".
- **Attribute the source.** Use `source` for the session or the person; use `tags` for retrieval. A record whose origin you cannot name is a rumour.
- **Keep the body short.** If it needs paragraphs, it is probably a skill or a note file — link it instead.

## Kinds

- `fact` — how the world is (paths, names, versions, constraints)
- `preference` — how the person wants things done (tone, format, defaults)
- `decision` — a choice that was made, with its reason (so it is not re-litigated)

## Pruning is not optional

Three vague records are worse than one accurate one: they disagree, and the disagreement is invisible.

- **Supersede, do not duplicate.** When a fact changes, save the new record with `supersedes: <old-id>`. The old one moves to `archive/` and stops appearing in the digest — but stays readable, so the history survives.
- **Retire what stopped being true.** A stale preference is worse than no preference: it silently misdirects.
- **Merge near-duplicates.** If two records say the same thing, keep the better-phrased one and retire the other.
- **Run the check, do not guess.** `assistant_memory action=curate` reports duplicates, dangling `supersedes` links, malformed files, and digest-budget pressure. Let it find the candidates; you decide.
