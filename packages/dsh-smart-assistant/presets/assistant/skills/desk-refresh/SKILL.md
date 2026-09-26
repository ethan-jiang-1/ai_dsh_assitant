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
  "counts": { "memories": 8, "knowledgeStable": 10, "knowledgeDraft": 3, "skills": 2, "threads": 1 },
  "decisions": [
    { "id": "…", "question": "…", "context": "…" }
  ],
  "threads": [
    { "id": "20260925-20-…", "status": "open", "title": "…", "why": "…", "lean": "…", "updated": "…" }
  ],
  "recentMemories": [
    { "id": "20260925-…", "kind": "fact", "updated": "…", "text": "…" }
  ],
  "knowledge": [
    { "id": "…", "title": "…", "status": "stable", "type": "how-it-works", "updated": "…" }
  ],
  "skills": [
    { "name": "…", "description": "…" }
  ]
}
```

The panels read `knowledge` and `skills` too: the knowledge panel lists pages with the drafts
(`status: "draft"`) first as "waiting for your review", and the memory panel lists
`recentMemories`. Fill every section you can; a missing one renders empty, which is honest.

The desk panel leads with its decisions section (`decisions`) and its threads section
(`threads`), so both must read as a glance:

- Write every rendered string **in the principal's own language** — the panels show them verbatim,
  and a Chinese-speaking principal reading English one-liners is a worse panel, not a safer one.
- `decisions[].question` — one line, the thing you would actually put to the principal (for example:
  "should we retire the weakest record in the digest?"). `context` is one short line of why the call
  is theirs. **Only real ones**: something you are genuinely waiting on. An empty list is a fine
  answer and renders as "nothing waiting on you".
- `threads[].title` — one line naming the question (for example: "Q3 sales down 20% — settle the
  definition first, or the customers?"). `why` is the rationale (rendered small and grey), `lean` is
  your current lean (rendered under the title). Keep `why` to about two lines: it is the footnote,
  not the headline.
- `recentMemories`: the five most recently updated active records.

## How to fill it

1. **Counts** — from your own tools, not from memory: `assistant_memory action=curate` (memories,
   knowledge, skills) and `assistant_research action=list` (threads).
2. **Threads** — `assistant_research action=list`, then `action=brief` for the ones you include;
   carry their `why` and current `lean` verbatim rather than re-summarising, and write the `title`
   yourself (the thread record has no one-line headline).
2b. **Decisions** — ask yourself: *is there anything I am waiting on the principal for?* A draft page
   awaiting approval, a question I could not answer without their numbers, a choice they reserved.
   If yes, one entry each; if no, leave the list empty rather than inventing work for them.
3. **Recent memories** — `assistant_memory action=list` (or `recall`), newest first, take five.
4. **Knowledge pages** — list the knowledge room's files and read each page's frontmatter
   (`id`, `title`, `status`, `type`, `updated`). Include drafts: the principal reviews them from
   the knowledge panel, so a draft you leave out is a draft they never see.
5. **Skills** — list your skill bundles and take each `name` (the directory) plus the first line of
   its `description`.

## Rules

- **Never invent numbers.** Every count comes from a tool call you actually made this turn. If a
  tool failed, write the file without that section rather than guessing — the panel renders a
  missing section as empty, which is honest.
- **Say what you did.** After writing, tell the principal the desk is refreshed and name the
  counts, so they can check the panel against your sentence.
- **Do not touch anything else in the workspace.** This file is the only thing the panel reads.
- If the workspace is read-only (the deployment refuses the write), say so plainly instead of
  reporting success.
