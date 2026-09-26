---
name: desk-refresh
description: How to refresh the My Desk panel's state file so the principal's sidebar shows live counts, open threads and recent memories. Load when the principal asks to refresh or update their desk, or at the end of a session that changed memories, threads, knowledge pages or skills.
whenToUse: Refreshing the desk panel after the working folder changed (memories, threads, knowledge, skills), or when the principal asks what is on their desk and the panel looks stale.
---

# Refreshing the desk file

The web client's **My Desk** panel renders a state file from the session workspace. You maintain
that file; the panel only reads it. It is the panel's whole data source for the working folder —
the counts, the open threads, and the recent memories all come from here.

## Where

`.desk/state.json`, relative to the session workspace (the directory you are working in — the same
place your file tools write). Create the directory if it is missing.

## Shape

```json
{
  "generatedBy": "desk-refresh",
  "generatedAt": "2026-09-25T16:00:00+08:00",
  "counts": { "memories": 8, "knowledgeStable": 13, "skills": 2, "threads": 1 },
  "threads": [
    { "id": "20260925-20-…", "status": "open", "why": "…", "lean": "…", "updated": "…" }
  ],
  "recentMemories": [
    { "id": "20260925-…", "kind": "fact", "updated": "…", "text": "…" }
  ]
}
```

Keep `why` and `lean` to roughly one line each — the panel renders them as-is and a wall of text
stops being a glance. `recentMemories`: the five most recently updated active records.

## How to fill it

1. **Counts** — from your own tools, not from memory: `assistant_memory action=curate` (memories,
   knowledge, skills) and `assistant_research action=list` (threads).
2. **Threads** — `assistant_research action=list`, then `action=brief` for the ones you include;
   carry their `why` and current `lean` verbatim rather than re-summarising.
3. **Recent memories** — `assistant_memory action=list` (or `recall`), newest first, take five.

## Rules

- **Never invent numbers.** Every count comes from a tool call you actually made this turn. If a
  tool failed, write the file without that section rather than guessing — the panel renders a
  missing section as empty, which is honest.
- **Say what you did.** After writing, tell the principal the desk is refreshed and name the
  counts, so they can check the panel against your sentence.
- **Do not touch anything else in the workspace.** This file is the only thing the panel reads.
- If the workspace is read-only (the deployment refuses the write), say so plainly instead of
  reporting success.
