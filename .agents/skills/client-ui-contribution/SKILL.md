---
name: client-ui-contribution
description: How to contribute UI to the DSH web client from this package — where the mechanism lives in vendor/dsh, and the paths, build, and checks that are specific to dsh-smart-assistant. Use when adding a sidebar panel, a brand mark, a right-sidebar tab, or any browser-side surface, or when a client plugin reports a pending entry that waits on a service.
whenToUse: Adding or debugging a browser-side surface from this package (sidebar panel, brand mark, right-sidebar tab, client service), or diagnosing a client entry that never activates. Not for host-plane services or model-visible tools.
---

# Contributing UI from this package

Mechanism lives in the pinned `vendor/dsh`. Read the page that owns the question, then use the paths and checks below. Do not paste those pages back into this skill.

## Read first

| Question | Page |
|---|---|
| Slot declaration, `inject` + `register`, lifecycle | [slots.md](../../../vendor/dsh/docs/subsystems/slots.md) |
| Boot graph, layers, Remote | [web-client.md](../../../vendor/dsh/docs/subsystems/web-client.md) |
| How a `dsh.client` declaration becomes a bundle | [dsh-client-modules README](../../../vendor/dsh/packages/client/modules/README.md) |
| Service `inject` vs module `external` vs `dsh.client.inject` (package ids) | [packages/client/AGENTS.md](../../../vendor/dsh/packages/client/AGENTS.md) — "The module graph sits below cordis DI" |
| Right-sidebar type + body, and what reload restores | [sidebar-right.md](../../../vendor/dsh/docs/subsystems/sidebar-right.md) and [ui-sidebar-right README](../../../vendor/dsh/packages/client/ui-sidebar-right/README.md) state section (navigation parameters are not layout state) |
| Adding a Remote method inside the harness repo | [adding-a-remote-api.md](../../../vendor/dsh/docs/cookbook/adding-a-remote-api.md) |

Worked registrations to copy from, not to restate: `vendor/dsh/packages/client/ui-schedule/src/client/index.ts` and `vendor/dsh/packages/client/ui-sidebar/src/client/index.ts`.

## This package

- Source is multi-module at `packages/dsh-smart-assistant/src/client/`. The served artifact is `lib/client/index.js`, one classic script. Build ownership is [`docs/dev.md`](../../../docs/dev.md); the client line of the running path is [`docs/architecture.md`](../../../docs/architecture.md).
- Entry registers through `__ModuleLoader__.load` in `src/client/index.ts`. Runtime dependencies come through the factory `require` in `src/client/runtime.ts`. Relative imports and `import type` stay in source; tsdown inlines them.
- Type a slot registration from the slot's declared props ([slots.md](../../../vendor/dsh/docs/subsystems/slots.md)). A hand-narrowed `{ name: string }` fails because entries also carry `id`, `order`, `label`, `key`.
- A new Remote namespace is a harness-repo typert change (the cookbook above). This package calls a namespace already in the pinned `@deepseek-ai/dsh-api-remotes/client.js` manifest (`skills`, `session`, `workspaceFiles`, `workspace`, `goals`, …). The attempted out-of-tree namespace and why it never materialized is in `notes/archived/2026-09-25-ceo-sidebar-ux.md` §四·二. Panel data that is not one of those namespaces is a file the assistant keeps in the workspace, read through `workspaceFiles`.

## Checks

1. `pnpm build` — the dev profile links the package and the composition consumes `lib/`.
2. Restart the web UI with a clean session cwd. A repo cwd leaks this repo's AGENTS.md into the session; the launcher pins the session cwd to the repo root unless overridden:
   `mkdir -p .tmp && ASSISTANT_SESSION_CWD=$(mktemp -d "$PWD/.tmp/session-cwd-XXXXXX") node <repo>/dev/env/dsh.mjs --profile dev --port 0 --no-open`.
3. `node dev/probes/web/webui-preflight.mjs '<url with token>'` — green before a human opens it. It checks auth, that every combo parses, that our bundle registers, that the boot graph is satisfiable, that every `remote.<ns>` we inject exists in the Remote manifest, and that the served host rooms route answers through the authenticated cookie.
4. Hand over the URL only after that.

`pnpm verify` is the static half (the client bundle stays classic-script-safe, including no bare runtime imports). Preflight is the live half. One green does not cover the other.
