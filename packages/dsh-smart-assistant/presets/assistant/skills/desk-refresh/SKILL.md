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
  "gaps": [
    { "id": "…", "what": "…", "why": "…" }
  ],
  "recentActivity": [
    { "at": "2026-09-26T13:10:00+08:00", "what": "…" }
  ],
  "threads": [
    { "id": "20260925-20-…", "status": "open", "title": "…", "why": "…", "lean": "…", "updated": "…" }
  ],
  "memories": [
    { "id": "20260925-…", "kind": "fact", "updated": "…", "text": "…", "source": "…" }
  ],
  "knowledge": [
    { "id": "…", "title": "…", "status": "stable", "type": "how-it-works", "updated": "…",
      "sources": ["…"] }
  ],
  "skills": [
    { "name": "…", "description": "…" }
  ]
}
```

The panels read `knowledge` and `skills` too: the knowledge panel lists pages with the drafts
(`status: "draft"`) first as "waiting for your review", and the memory panel lists
`memories`. Fill every section you can; a missing one renders empty, which is honest.

The desk panel leads with its decisions section (`decisions`) and its threads section
(`threads`), so both must read as a glance:

- Write every rendered string **in the principal's own language** — the panels show them verbatim,
  and a Chinese-speaking principal reading English one-liners is a worse panel, not a safer one.
- `gaps[].what` — one line, the thing you lack, written so the principal knows what to hand over
  ("this quarter's monthly revenue by customer", "read access to the company facts folder").
  `why` is one line on what it unblocks. Keep it to what you actually hit, not a wish list.
- `decisions[].question` — one line, the thing you would actually put to the principal (for example:
  "should we retire the weakest record in the digest?"). `context` is one short line of why the call
  is theirs. **Only real ones**: something you are genuinely waiting on. An empty list is a fine
  answer and renders as "nothing waiting on you".
- `threads[].title` — one line naming the question (for example: "Q3 sales down 20% — settle the
  definition first, or the customers?"). `why` is the rationale (rendered small and grey), `lean` is
  your current lean (rendered under the title). Keep `why` to about two lines: it is the footnote,
  not the headline.
- `memories`: the **active** records the principal would want to audit — newest first, up to about
  twenty. This is the memory panel's whole list, and each row is a correction target: a record you
  leave out is one the principal cannot fix. Carry each record's `source` verbatim: the panel shows
  it as the trust line, and for a record the principal corrected it *is* the trace of that
  correction ("the principal corrected this on …"). A record with no source renders without one —
  do not invent a citation.

## What the panels render, section by section

- **Desk** — decisions, gaps, threads, `recentActivity`, counts. The activity list answers the
  question a long-lived assistant has to keep answering: *what have you been doing?* Keep it to
  the last few real changes (newest first, about five), each one line with its time. Derive it from
  what actually changed in the working folder — file times and your own tool results — not from a
  narrative you would like to be true.
- **Knowledge** — drafts (with approval), stable pages (with provenance and a retire action),
  deprecated pages (kept in place so links resolve, shown without actions), skills (flag or retire).
  The principal's three lifecycle moves arrive as ordinary messages: approve a draft
  (`promote_page`), retire a page that is past its use-by date (`deprecate_page`), or tell you what
  is wrong with it. Perform the edit and refresh the desk in the same turn.
- **Memory** — every active record, with its source and a correction action.

## How to fill it

1. **Counts** — from your own tools, not from memory: `assistant_memory action=curate` (memories,
   knowledge, skills) and `assistant_research action=list` (threads).
2. **Threads** — `assistant_research action=list`, then `action=brief` for the ones you include;
   carry their `why` and current `lean` verbatim rather than re-summarising, and write the `title`
   yourself (the thread record has no one-line headline).
2b. **Decisions** — ask yourself: *is there anything I am waiting on the principal for?* A draft page
   awaiting approval, a choice they reserved, a call only they can make. If yes, one entry each; if
   no, leave the list empty rather than inventing work for them.
2d. **Recent activity** — list the last few changes you actually made to the working folder
   (newest first, about five): a record written, a thread opened or closed, a page distilled, a
   skill retired, a correction applied. One line each, `at` = when it happened. This is what makes
   a long-lived assistant legible; a stale or invented list is worse than none, so if nothing moved,
   leave it short rather than padding it.
2c. **Gaps** — the other half of the ask, and not the same thing: a decision is *theirs to make*,
   a gap is *something I lack* to be useful — a number I have no source for, an access I do not
   have, a document nobody has handed me, a question I cannot even frame without a fact. `what` is
   one line naming it, `why` is one line on what it would unblock. This is the cultivation ask:
   the principal reads it and knows what to hand over. An empty list is a fine answer.
3. **Memories** — `assistant_memory action=list` (or `recall`), newest first, up to about twenty
   active records.
4. **Knowledge pages** — list the knowledge room's files and read each page's frontmatter
   (`id`, `title`, `status`, `type`, `updated`, `sources`). Flatten `sources` to plain resource
   strings for the panel. Include drafts: the principal reviews them from the knowledge panel, so a
   draft you leave out is a draft they never see.
5. **Skills** — list your skill bundles and take each `name` (the directory) plus the first line of
   its `description`.

## Their moves come back through this file

Every action on the panels arrives as an ordinary message, and the loop is yours to close in the same
turn — record it, then **refresh the desk file** so the surface they are looking at matches what you
just did. A change you apply but do not re-render reads as if you ignored them:

- **A correction** ("correct this memory: … what is right is …") → rewrite the record or page, and
  drop the wrong line from the panel.
- **A decision answered** ("my decision is: …") → record the call where you will act on it (a memory
  is usually right), act on it if it unblocks something, and take it off the decisions list.
- **An approval** ("I approve page X") → `promote_page`, then re-render.
- **A retirement** ("page X is obsolete" / "skill X is dead") → `deprecate_page` / `retire_skill`,
  then re-render.

## Rules

- **Never invent numbers.** Every count comes from a tool call you actually made this turn. If a
  tool failed, write the file without that section rather than guessing — the panel renders a
  missing section as empty, which is honest.
- **Say what you did.** After writing, tell the principal the desk is refreshed and name the
  counts, so they can check the panel against your sentence.
- **Do not touch anything else in the workspace.** This file is the only thing the panel reads.
- If the workspace is read-only (the deployment refuses the write), say so plainly instead of
  reporting success.
