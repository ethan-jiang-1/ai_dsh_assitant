---
name: dev-startup
description: How this repo's dev Web instance starts — the one command, the stage-by-stage path with the per-stage cost, what keeps a start fast (instance reuse), what invalidates it, and how to measure a regression instead of guessing. Use when asked to start the dev instance, when a start feels slow, or when editing anything under dev/env/.
whenToUse: Starting or restarting the dev Web instance; a start that feels slow; editing dev/env/start.sh, dsh.mjs, instance.mjs, launch-mode.mjs or ensure-build.mjs.
---

# Start the dev instance (and know its path)

One command, one contract:

```sh
pnpm start            # hand over a healthy running instance, or boot one and hand over its URL
pnpm start --fresh    # ignore the instance registry and boot a new one
```

`pnpm start` is the only entry that matters for "启动一下这个插件". The manual five-step chain
(prepare → setup → `pnpm dsh --profile dev`) is the same pipeline without the self-checks;
[`docs/dev.md`](../../../docs/dev.md) §一 is the contract, this skill is how to read and change it.

## The path it takes

| Stage | Owner | Cost when nothing changed |
|---|---|---|
| prepare (vendor artifacts) | `dev/env/prepare.sh` | ~0.0s (probes only) |
| setup (profiles + plugin link + overlay) | `dev/env/setup.sh` | ~0.1–0.2s (`dsh plugin add` skipped, overlay not rewritten) |
| artifact self-check | `dev/env/ensure-build.mjs` | ~0.4–0.6s (`tsc -b --dry` + client bundle byte compare) |
| reuse probe | `dev/env/instance.mjs` | ~0.02s |
| boot → URL | `dev/env/launch-mode.mjs` chooses the CLI path | ~2.5s built / ~3–4s source |
| preflight | `dev/probes/web/webui-preflight.mjs` | ~0.5–1.5s (9MB combo fetch + parse) |

The script prints `⏱` per stage and a total. **Read those numbers before optimizing anything** —
the earlier guesswork ("it felt slow") was resolved by them, and the answer was never the plugin:
a 3.1s source boot spends 2.16s in Node module loading and 4ms in `dsh-smart-assistant`.

## Native order is not ours to change

DSH owns the boot: parse args → read the profile → apply the layers (ordered bundles → profile
`cordis.patch.yml` → home patch → `--patch` in argv order) → compose through app-boot → load
plugins → start the app. This repo wraps that order. It never edits, reorders or replaces it.

Do:

- do the preparation **before** the CLI runs: artifacts (`prepare.sh`), the profile and the plugin
  link (`dsh plugin add`, `--from-default-profile`), the overlay file (`setup.sh`);
- keep dev-only rows in `$DSH_HOME/dev-overlay-<profile>.yml` and inject them as the **first**
  `--patch`, so a caller's own patch still wins (there is a spec for this order);
- verify **after** the boot (`pnpm preflight`), never before it as a substitute.

Don't:

- write the profile's `cordis.patch.yml` or hand-edit `profiles/*/package.json`;
- mount rows through a bundle to dodge the patch order, or start a Cordis tree yourself instead of
  going through the `dsh` CLI;
- reorder `--patch` overlays, or put our overlay last so it overrides a caller's intent;
- add a startup step DSH does not have (own env loader, own home resolution, extra launcher flags);
- skip a DSH step for speed. The only legitimate speed lever is **not booting at all** (reuse) —
  once a boot happens, it is DSH's full sequence.

If a change seems to need a new startup step, that is a proposed change with its own rationale —
not something to slip into `start.sh`.

## What makes a start fast: reuse

The handed-over instance is recorded in `.tmp/start/instance.json`. The next `pnpm start` reuses it
(≈1.5s) when the pid is alive **and** nothing it loaded has changed. Invalidates:

- `packages/dsh-smart-assistant/lib/` (any rebuild), the dev overlay, the profile `cordis.patch.yml`,
  the profile `package.json`, and `vendor/UPSTREAM.md` (pin bookkeeping).

Does **not** invalidate: `presets/assistant/skills/**` (watched live root — a new session sees the
edit), and `cordis.patch.yml` composition edits (`patchReload: live`).

`pnpm start --fresh`, or passing any flag the launcher forwards (`--patch …`), skips reuse.

## Two launch paths

`pnpm dsh` prints which one it took. The judgment lives in one place —
[`dev/env/launch-mode.mjs`](../../../dev/env/launch-mode.mjs):

- **built** `vendor/dsh/apps/cli/lib/bin.js` (default): fastest, and the same artifact shape the
  shipped product uses.
- **source** `src/bin.ts` via tsx: the fallback when the built tree cannot be proven to belong to
  the checked-out pin (missing build, HEAD ≠ `vendor/UPSTREAM.md`, lib older than the pin record),
  or when `ASSISTANT_DSH_FROM_SOURCE=1` asks for it. Source launch is never wrong — just slower.

If a start suddenly reports the source path, the reason is printed with it; fix the stated condition
(`bash dev/env/prepare.sh`, `pnpm sync-dsh …`) instead of overriding the guard.

## Measure before/after

```sh
pnpm start --fresh            # read the ⏱ lines (boot→URL is the interesting one)
pnpm preflight '<URL>'        # the gate the handover already ran
kill -TERM -- -<pid>          # negative pid = the whole process group (printed in the banner)
```

For an A/B of the launch path, compare **CPU time**, not wall time — on a loaded machine wall time
swings by seconds:

```sh
/usr/bin/time -p node vendor/dsh/apps/cli/lib/bin.js --profile dev --port 0 --no-open   # stop it after the URL line
/usr/bin/time -p node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile dev --port 0 --no-open
```

## Deliberate non-optimizations

- `ensure-build` and `preflight` are gates, not overhead: they are the only things that catch a
  stale `lib/` and a client bundle that would kill the browser boot. A cache in front of either
  trades ~0.5s for the exact failure they exist to prevent.
- Do not "warm" a spare instance: a second environment binds a port, shares the same home, and
  makes "which one am I looking at" ambiguous.
