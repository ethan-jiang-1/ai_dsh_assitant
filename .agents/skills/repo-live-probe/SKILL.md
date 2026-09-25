---
name: repo-live-probe
description: How to prove that a model-visible change actually reaches the request — run a preset-mounted one-shot, unpack its session log, and measure the assembled prompt by section. Use when a change touches prompt sections, tool descriptions, persona, or the digest and "the tests pass" is not enough.
whenToUse: Verifying model-visible surfaces end-to-end (sections, tools, persona, digest), measuring system-prompt section bytes, or reproducing a "the model did not see it" report. Not for pure-core logic — that is a unit test.
---

# Live probe: read the request that actually went out

Tests prove the code; only the session log proves **what the model received**. This skill is the
loop that answers "did it actually ride in the request?" without guessing.

## The loop

1. **Build before you probe** if anything under `src/` changed. The dev profile installs the
   package by link, and the composition consumes `lib/` — probe an un-built tree and you measure
   yesterday's behavior.
2. **Run a preset-mounted one-shot from the repo root**:
   ```sh
   pnpm dsh --profile dev-task --patch dev/preset-runner.patch.yml "<probe task>"
   ```
   Root matters: the launcher pins `DSH_HOME` and resolves the profile relative to the cwd; run it
   from a package directory and you get `profile does not exist`.
   Redirect to a file when you care about the whole output (`> /tmp/probe.log 2>&1`); piping into
   `head` can swallow the lines you need.
3. **Write the probe task so it can only answer from resident context** — e.g. "do not call any
   tool; answer only from what is already in front of you; if it is not there, say so." That turns
   the request into the measurement: an honest "I do not have it" is a finding, not a failure.
4. **Find the newest session and unpack it**:
   ```sh
   cd dev/harness-home/sessions
   ls -t ./--Users-...--/            # the ./ prefix is REQUIRED: dir names start with --
   zstd -dc ./--<cwd-dir>--/<session-id>/session.v3.jsonl.zstd > /tmp/probe.jsonl
   ```
   For bulk searches prefer the wrapper form (`printf '#!/bin/sh\nexec zstd -dc "$@"\n' > /tmp/zstd-cat`)
   because `rg --pre` cannot take a command with spaces.
5. **Read the `system/message` event** (that is the assembled system prompt) and the
   `assistant/message` event (what the model said). Measure section bytes by locating the section
   headers and subtracting, rather than eyeballing the whole prompt.

## Hard-won details

- **A one-shot session has exactly one request.** Any "it will be warm on the next turn" behavior
  is untestable here — and that is precisely the class of bug one-shots catch. If a section must be
  resident, prove it **on the first request**.
- **The digest section always starts with the status blurb**, even when it is warm. Do not use
  `startsWith(blurb)` to test warmth; check for the records/threads/pages the digest should carry.
- **Probe twice for before/after**: run the same task on the pre-change build (or `git stash`) and
  on the post-change build, and keep both log excerpts next to the claim in the note.
- **A tool-using answer hides the resident state.** If the model calls `curate` and reports the
  numbers, you have proven the tool, not the prompt. Ask for a no-tool answer when the resident
  surface is the thing under test.

## When the probe disagrees with the tests

Believe the probe, then find out why the test was blind. The usual causes: the test constructs the
service directly instead of assembling the prompt; the test asserts the section is registered
rather than what it resolves to; the artifact under test is `lib/` and nobody rebuilt. Record the
finding in the note that owns the change — this skill produces evidence, it does not own decisions.
