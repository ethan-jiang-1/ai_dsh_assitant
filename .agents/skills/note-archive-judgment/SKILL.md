---
name: note-archive-judgment
description: How to decide whether an implemented note should stay the current rationale owner or be frozen into notes/archived/ — and the exact move, freeze line, and inbound-link repair when it is archived. Use when notes/implemented/ has grown, when a campaign or remediation is finished, or when curate-adjacent tidying touches decisions.
whenToUse: Judging archive-vs-keep for an implemented note, or performing the archive move. Not for stale proposals — those go to notes/rejected/ with a one-line reason.
---

# Archive or keep: judge by future decision value

The harness archive procedure is
[dsh-archive-agent-notes](../../../vendor/dsh/.agents/skills/dsh-archive-agent-notes/SKILL.md).
It applies to `vendor/dsh/.agents/notes/` (class folders, frozen triplets, manifest). This repo's
contract is [`notes/README.md`](../../../notes/README.md). The move below is only
`notes/implemented/` → `notes/archived/`.

`notes/implemented/` is the **current rationale owner** — a note lives there while a later
participant would still need it to avoid re-litigating a live decision. `notes/archived/` is
frozen history: readable, citable, no longer authoritative. The axis is *future decision value*,
not age and not "the work is done".

## Shipped behavior is not an archive reason

Code and current docs say what the system does now. `docs/` does not link an individual note and
does not carry why, so a missing doc link is not an archive signal. A note stays in `implemented/`
when a later change would still do any of the four things in [`notes/README.md`](../../../notes/README.md) §〇:

- bring back an option that was already rejected;
- invent a reason from the code as it stands and edit toward that invention;
- leave a constraint in place that nobody can say what it protects;
- require git history to learn why.

Archive only when none of those four would happen. A campaign log can still be frozen when the
tradeoff that prevents one of the four already lives in a note that stays active, or when the log
itself would only say what happened once.

## Keep it active when

- one of the four mistakes above would still happen on a later change;
- a current test, gate, or owner file cites its rationale (the link is the evidence);
- it explains a mechanism someone may change later (contracts, layout, identity, boundaries);
- it records a **negative** result that still blocks a plausible wrong turn (the "why not X" cases);
- it is the owner of a rule that a gate enforces.

## Archive it when

- it is a **record of a campaign, absorption, audit, or remediation**, and the tradeoff it carried
  already lives in an active note or would not prevent any of the four mistakes;
- the decision it carries has been superseded by a newer note (the newer one is the owner);
- nobody would need it to avoid re-litigating anything — only to know what happened once.

## The move (all in one diff)

1. `git mv notes/implemented/<name>.md notes/archived/<name>.md`
2. Insert **one line after the status line**: `已归档：YYYY-MM-DD（一句理由）`. Keep
   `状态：**implemented**` — `archived/` is not a fourth lifecycle state.
3. **Repair inbound relative links** in the same diff (`rg -l "<name>"` across the repo) — a moved
   note that leaves dangling links is worse than a note left in place. The `verify` link gate
   catches misses; do not rely on it as the plan.
4. Re-run `pnpm verify` — the parity gate checks the `已归档：` line and the directory/status match.

## Never

- **Never archive a `proposed/` note.** Stale proposals go to `notes/rejected/` with a one-line
  reason (that is the negative-knowledge exit); proposed notes are never frozen.
- **Never edit an archived note afterwards** except to fix a link that points at it. If its content
  becomes wrong, the note that supersedes it is the fix — that is what supersession is for.
- **Never archive by bulk.** The judgment is per note: two notes written the same day can have
  opposite futures. A batch move with one shared reason is a sign nobody read them.
