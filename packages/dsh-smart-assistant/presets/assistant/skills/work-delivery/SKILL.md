---
name: work-delivery
description: How to leave one piece of work in the principal's project — one dated folder under deliverables/ with a README that records the ask, the evidence, the outputs and what is still open, and key files declared with present. Load when a task produces a file the principal will keep.
whenToUse: The piece of work will leave a file or a decision package the principal should open, share, or archive. Not for an answer that lives only in the conversation, and not for a one-line reply.
---

# Work delivery

The principal's project is the shelf. Your working folder is the notebook.

## One piece of work = one folder

Write it under the session's working directory:

```text
<session cwd>/deliverables/<YYYY-MM-DD>-<slug>/
├── README.md
└── <the files>
```

- Use the date the work is delivered and a short kebab-case slug (`2026-11-01-q3-gap`).
- One folder per piece of work, not one folder per file and not one giant folder per week.
- If the principal already has a `deliverables/` folder, put the run inside it; do not rename or
  reorganize their files.
- Do not create an empty folder. If the answer needs no file, answer in the conversation and load
  nothing.

## README.md is the record, not a second report

Four sections, short:

1. **The ask and the assumptions.** One paragraph: what the principal asked, what you assumed
   because the data was missing.
2. **The evidence.** Where each load-bearing fact came from — a file path in this project, a
   session id/date, a knowledge page id, a URL. If a claim has no locator, mark it as an assumption.
3. **What you produced.** The files in this folder and what each one is for.
4. **What is still open and the status.** Decisions pending, data missing, next review point;
   status as `draft`, `for review`, or `delivered`.

Do not paste the full deliverable into the README. The deliverable is the file; the README is how
someone finds it and checks it.

## Declare the files with present

`present` records the path, not a copy. Call it with the key files after they exist and are final
for this turn. A file the principal cannot open from the conversation is not delivered.

## Keep the notebook out of the shelf

- The working folder (`memory/`, `research/`, `knowledge/`, `skills/`) is your notebook. Do not
  put deliverables there.
- A distilled knowledge page is not the deliverable. The page holds what you learned for reuse;
  the folder holds the text the principal takes away. Do not copy one into the other.
- If the work has a ledger matter, name its id or title in the README. Do not invent a schema.
- Do not copy the session log into the folder and do not make the README depend on a session id.
  The run's identity is the folder and its date; the host may add machine state later.

## The project owns its instructions

Project `AGENTS.md`, `.dsh/skills/`, and `.agents/skills/` belong to the principal (or the
repository). Read them, follow them, and suggest edits when something is wrong. Do not silently
rewrite them. Project skills can shadow your learned skills of the same name; when that happens,
say so instead of pretending your version loaded.

## Stop condition

If the principal asks for a quick answer, give the answer and stop. Do not manufacture a folder to
look productive. The folder exists when there is a file worth keeping.
