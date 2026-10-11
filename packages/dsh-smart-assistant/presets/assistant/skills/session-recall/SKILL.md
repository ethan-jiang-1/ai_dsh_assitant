---
name: session-recall
description: How to search your own past sessions on disk — where the logs live, that they are zstd-compressed JSONL, and the rg recipe that searches them in under a second. Load when memory is not enough and you need what was actually said or done in an earlier conversation.
whenToUse: When the digest and your memory room are not enough — "what did we try last week", "which flags did that run use", finding a past session by topic. Not for conclusions — durable facts go through assistant_reflect, not copy-paste.
---

# Session recall

Your memory room holds curated conclusions. The raw conversations are also on disk — complete,
compressed, and yours to search. Nothing needs to be re-derived from scratch.

## Where the logs are

`<harness-home>/sessions/--<normalized-cwd>--/session-<id>/session.v<n>.jsonl.zstd`

- `<n>` is the **log format generation**: it moves when the harness is upgraded, so list the session
  directory (`ls`) instead of assuming the name. A generation you guessed wrong reads as "no logs at all",
  not as an error.
- The harness home is the **parent of your working folder** (the manual's layout tree names your working
  folder's absolute path — go one level up).
- Session directories are grouped per project: the project cwd with `/` swapped for `-`, wrapped
  in `--`. Sessions from other projects sit in sibling directories — search them deliberately,
  not by accident.
- Each file is **zstd-compressed JSONL**; each line is one event: user and assistant messages in
  full, `tool/call` with complete arguments, `tool/result`, and the session header (cwd, agent
  preset). Every session also carries a generated title early in the file — grepping a topic word
  often lands on the title first; open that file and read around the hit.

## The rg recipe (measured: 34 sessions searched in 0.7s)

`rg --pre` cannot take a command with spaces, so write the wrapper once per machine. The `--` is
required: the paths rg hands over start with `--`, which `zstd` otherwise reads as its own options.

Write the wrapper inside your session workspace under `.tmp/`, and note the absolute path it prints:
the file sandbox only permits the workspace (anything outside comes back as a permission prompt),
while `--pre` takes an absolute command path — so the wrapper can live in the workspace even when the
search itself runs from the sessions directory.

```sh
mkdir -p .tmp && printf '#!/bin/sh\nexec zstd -dc -- "$@"\n' > .tmp/zstd-cat \
  && chmod +x .tmp/zstd-cat && echo "$PWD/.tmp/zstd-cat"
```

Then search every session of the current project (derive the directory name from your cwd, and
pick a distinctive keyword for `<word>`):

```sh
rg --pre '<workspace>/.tmp/zstd-cat' -g '*.zstd' -l '<word>' './--<normalized-cwd>--/'
```

- The `./` prefix is **required**: directory names start with `--`, which rg would read as flags.
- `-l` lists files with hits; drop it (or use `-C2`) to read the matching events in context.
- Requires the `zstd` CLI (`brew install zstd` / `apt install zstd`). If it is missing, say so
  and ask instead of improvising a decoder.

## Judgment

- Search **your own** sessions for **your user's** work. Logs contain full tool arguments —
  what you find is conversation, not new memory: a durable conclusion goes through
  `assistant_reflect` once, not copy-pasted around.
- Prefer one good query over many broad ones: these are full transcripts; a distinctive word
  (a flag, a file name, an error string) narrows faster than a topic phrase.
