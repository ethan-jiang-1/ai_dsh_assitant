---
name: desk-refresh
description: How to keep the memory and knowledge rooms' data file current, and where business matters belong instead. Load at the end of a session that changed memories, knowledge pages or skills, or when a room looks stale.
whenToUse: After the memory or knowledge rooms changed, or when a room looks stale. NEVER for business matters — matters go through the assistant_operating tool and the principal's desk renders that ledger directly.
---

# Room data upkeep — and where matters do NOT go

You maintain two data surfaces. Confusing them loses the principal's work:

1. **Business matters — the one desk.** Things to act on: matters, deadlines, follow-ups,
   decisions awaiting the principal, changes you would propose. These live ONLY in the
   authoritative operating ledger via the `assistant_operating` tool: `entrust` a new matter
   with the principal's words verbatim, `report` progress, `propose` a major change you inferred
   (their explicit confirm or reject applies it). The desk the principal looks at renders that
   ledger directly — **the receipt is the proof it landed, so cite it.** Never write a business
   matter into `.desk/state.json`; never say "on the desk" without a ledger receipt.
   A matter the principal explicitly asks you to record is recorded even when they call it a
   test or a demo: take their words verbatim and label it in the title in the principal's language (e.g. "Test matter: …").
   Refusing, re-qualifying, or diverting an explicit entrust into questions is a failure.
   Not everything is a matter: facts, preferences and portrait corrections go to the memory room
   (`assistant_memory`); reference knowledge to the knowledge room. Route by what the principal
   intends and what the thing is — the desk carries things to act on, nothing else.
2. **Room data — this file.** `.desk/state.json` in the session workspace feeds the principal's
   memory and knowledge rooms (the room panels read the `memories`, `knowledge` and `skills`
   sections). Maintain it only after those rooms change, per the rules below.

## The file

`.desk/state.json`, relative to the session workspace. Create the directory if missing. Shape:

```json
{
  "generatedBy": "desk-refresh",
  "generatedAt": "2026-10-11T16:00:00+08:00",
  "counts": { "memories": 8, "knowledgeStable": 10, "knowledgeDraft": 3, "skills": 2 },
  "memories": [
    { "id": "20261011-…", "kind": "fact", "updated": "…", "text": "…", "source": "…" }
  ],
  "knowledge": [
    { "id": "…", "title": "…", "status": "stable", "type": "how-it-works", "updated": "…",
      "sources": ["…"],
      "excerpt": "first ~200 chars of the page body (required for draft pages)" }
  ],
  "skills": [
    { "name": "…", "description": "…", "kind": "curated" }
  ]
}
```

## How to fill it

1. **Counts** — from tools run this turn, never from memory: `assistant_memory action=curate`
   and the knowledge/skills listings. A tool that failed means that section is omitted, not guessed.
2. **Memories** — `assistant_memory action=list` (or `recall`), newest first, about twenty. Carry
   each record's `source` verbatim: the room renders it as the trust line and the correction trace.
3. **Knowledge** — list the knowledge room's files, read each page's frontmatter, include drafts
   (a draft you leave out is a draft the principal never sees; drafts carry an `excerpt` so the
   approval card shows the content in view).
4. **Skills** — both sources: curated skills from your own skill catalog, learned bundles from the
   working folder's `skills/` room. The room renders a count plus names; retire is a conversation.
5. Write every rendered string in the principal's own language; keep mechanism words (page ids,
   draft/stable/superseded) out of prose — say "waiting for your approval" / "approved" in the principal's language.

## Rules

- **Business content never enters this file.** A matter, deadline, decision-to-make or proposal
  named in conversation goes to `assistant_operating` in the same turn, and you report its receipt.
  This file carries the rooms' portrait data only.
- **Never invent numbers**; omit a section whose source tool failed.
- **Always end a room-data refresh by writing the file** (fresh `generatedAt` from a real pass) —
  but a refresh is never a substitute for a ledger write: matters go to `assistant_operating`.
- **Say what you did in one short line**, and where it landed (which room, or which ledger receipt).
