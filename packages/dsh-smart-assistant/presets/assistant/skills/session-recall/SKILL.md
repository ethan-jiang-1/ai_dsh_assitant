---
name: session-recall
description: How to find what was actually said or done in an earlier session — the indexed session tools first, raw disk logs only as an explicit fallback.
whenToUse: When the digest and your memory room are not enough — "what did we try last week", "which flags did that run use", finding a past session by topic or an exact string. Not for conclusions — durable facts go through assistant_reflect, not copy-paste.
---

# Session recall

Your memory room holds curated conclusions. Earlier conversations are searchable evidence.

## First: the indexed tools

The harness indexes your sessions for full-text search. Reach for these before any file work:

- `session_search` — search prior sessions in this project; returns the strongest matching event
  per session. It excludes the session you are in.
- `session_event_search` — search the events of one session.
- `session_event_read` — read one exact event after a hit, with optional neighboring events.
- `session_trace` / `session_event_trace` — lineage, replacements, and relationships.

The index is workspace-scoped: it reaches sessions whose working directory matches yours. That is
usually exactly your working folder's sessions. Another project, an exact substring the tokenizer
misses, or a deployment without these tools needs the fallback below.

## Fallback: the raw logs

Use it only when the index cannot answer.

1. Resolve the harness home: `$DSH_HOME` when set, otherwise `~/.dsh`. Do **not** assume it is your
   working folder's parent — a deployment may have moved the working folder.
2. List `"${DSH_HOME:-$HOME/.dsh}/sessions"`. Project directories are `--<normalized-cwd>--/`, and
   each session is its own directory holding `session.v<n>.jsonl.zstd`. `<n>` is the log format
   generation and moves with the harness: list the directory instead of guessing.
3. Each file is zstd-compressed JSONL; each line is one event — full user and assistant messages,
   `tool/call` with complete arguments, `tool/result`, and the session header (cwd, agent preset).
   A generated title sits near the top, so a topic word often lands on the title first; open the
   file and read around the hit.
4. `rg --pre` cannot take a command with spaces, so write the wrapper once per machine. The `--`
   is required: the paths rg hands over start with `--`, which `zstd` otherwise reads as options.

```sh
mkdir -p .tmp && printf '#!/bin/sh\nexec zstd -dc -- "$@"\n' > .tmp/zstd-cat \
  && chmod +x .tmp/zstd-cat && echo "$PWD/.tmp/zstd-cat"
```

Then search one project's sessions (the `./` prefix is required: directory names start with `--`):

```sh
rg --pre '<workspace>/.tmp/zstd-cat' -g '*.zstd' -l '<word>' \
  "${DSH_HOME:-$HOME/.dsh}/sessions/--<normalized-cwd>--/"
```

`-l` lists files with hits; drop it (or use `-C2`) to read the matching events in context. Requires
the `zstd` CLI (`brew install zstd` / `apt install zstd`); if it is missing, say so and ask instead
of improvising a decoder.

## Judgment

- **Search your own sessions for your user's work.** Sessions of other projects are other contexts:
  reading them is a deliberate act — say what you are about to search and why before you do it, and
  search only what the question needs.
- Logs contain full tool arguments — what you find is conversation, not new memory: a durable
  conclusion goes through `assistant_reflect` once, not copy-pasted around.
- Prefer one good query over many broad ones: these are full transcripts, and a distinctive word
  (a flag, a file name, an error string) narrows faster than a topic phrase.
