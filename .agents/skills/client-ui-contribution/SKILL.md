---
name: client-ui-contribution
description: How to contribute UI to the DSH web client from this package — the classic-script bundle constraint, the slot system (inject + register), the boot graph, and why out-of-tree Remote namespaces do not materialize. Use when adding a sidebar panel, a brand mark, a right-sidebar tab, or any browser-side surface, or when a client plugin reports a pending entry that waits on a service.
whenToUse: Adding or debugging a browser-side surface (sidebar panel, brand mark, right-sidebar tab, client service), reading the boot graph, or diagnosing a client entry that never activates. Not for host-plane services or model-visible tools.
---

# Contributing UI to the DSH web client

Four things bite, in this order. Check them in this order.

## 1. The client bundle is a classic script, not an ESM module

The web shell concatenates client bundles into `<script>` combos. One `import`/`export`
statement — including the `export {}` marker tsc synthesizes for an all-type import — is a parse
error, and **one bad statement kills every later registration in the same combo**.

- No imports. Mirror vendor types structurally; pull dependencies through the factory's `require`
  (`'react'` is a baseline external every dynamic bundle may request).
- Register through the page-global facade: `__ModuleLoader__.load({ id: '<package name>', factory })`.
- Verify the emitted bundle parses: `node dev/probes/web/webui-preflight.mjs '<url>'` compiles each combo
  as a classic-script body and fails loudly on the first ESM-looking line.

## 2. Everything visible goes through the slot system: `inject` + `register`

One mechanism covers brand marks, sidebar panels and right-sidebar tabs. The shape, learned from
`vendor/dsh/packages/client/ui-schedule/src/client/index.ts`:

```ts
// left sidebar panel list (the Settings-gear mechanism)
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: 'my-panel', order: 10, label: 'My Panel',
}, PanelIcon))
// the panel body, in the main area, under the same id
ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'my-panel' }, PanelBody))
```

Traps that cost real rounds:

- There is **no `contribute` method** — the list slot is fed by one `inject` + `register` per entry.
- The declaration carries extra fields (`id`, `order`, `label`, `key`, `locale`); a narrow mirror
  type (`{ name: string }`) fails to compile — widen it with `[key: string]: unknown`.
- Registering a **right-sidebar tab type** (`ctx.sidebarRightTabs.register({ id, kind, patterns, … })`)
  declares what you *can* open. It produces **no visible entry** on its own.
- The consumer reads the list with `entriesOfSlot('sidebar.panellist')` and subscribes to changes
  (`vendor/dsh/packages/client/ui-sidebar/src/client/index.ts`).

## 3. The boot graph decides activation; `dsh.client.inject` feeds it

The index carries `globalThis["__DSH_BOOT__"]` = `{ rev, entries[], batches[] }`. Each entry has
`{ id, url, rev, inject? }`; `inject` comes from the package manifest's `dsh.client.inject`
(a list of **client package ids**, not service names) — see
`vendor/dsh/packages/client/ui-sidebar-documentpreview/package.json`.

At runtime the bundle's own `export const inject = [...]` lists **service names**. A service that
nothing provides leaves the entry `pending` forever — the browser shows
`<id>: pending (waiting for service: <name>)` and the user becomes the crash-test dummy.

## 4. Remote namespaces: in-tree only, unless you do the typert work

`remote.<ns>` proxies are **not** own-properties of the remote object; the loader materializes them
from your inject declaration (`Object.keys(remote)` returning `[]` is normal). Whether a namespace
can materialize is decided by a **build-time manifest embedded in
`@deepseek-ai/dsh-api-remotes/client.js`** (`{ service, namespace, method, … }` records, generated
by the typert generator from the vendor workspace's artifacts).

So an **out-of-tree package cannot open a new Remote namespace** by writing a
`TypertRemoteService`: the manifest has no record of it and the client waits forever. Making one
work means joining the typert generation workspace (emit `lib/typert.host.js` +
`lib/typert.remote-client.js`, get the namespace into the client manifest). Evidence and the
attempted path: `notes/archived/2026-09-25-ceo-sidebar-ux.md` §四·二.

Cheaper routes for panel data, in order of preference: an **already-manifested** namespace
(`skills`, `session`, `workspaceFiles`, `workspace`, `goals`, … — 27 of them), or a file the
assistant maintains in the workspace, read through `workspaceFiles`.

## 5. Right-sidebar tab bodies: two-stage registration, and what a restored tab remembers

A **visible** tab needs the type AND a body AND a reachable opener. The type alone is the passive
declaration from §2; the body rides a keyed seat, and nothing opens itself:

```ts
// stage 1 — the type; a kind-opened page needs no patterns at all (shape: ui-schedule's definition.ts)
ctx.sidebarRightTabs.register({ id: 'pkg/room', kind: 'pkg-room', priority: 'fallback', title: () => 'Room' })
// stage 2 — the body under the type's id; the chip-title seat is optional (the captured title suffices)
ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
  { name: 'sidebar.right.pane.tab', key: 'pkg/room' }, Body))
// an opener, e.g. a chip in the Session header (list seat, session-scoped — ui-schedule's catalog entry):
ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
  { name: 'conversation.session.header.utilities', id: 'pkg-room-chip', order: -6 }, Chip))
// add the 'sidebarRight' service to the bundle's inject list, then open with:
// ctx.sidebarRight.openTab('pkg-room')
```

Facts that save rounds:

- The `sidebar.right.pane.tab` seat is **keyed and session-scoped**: the body receives the holding
  session's id as a plain `sessionId` prop (the session standard props) — per-session binding needs
  no navigation plumbing. Route the body's actions to that same session: a correction typed beside
  session X that lands in the newest session reads as being ignored.
- A restored tab persists its **layout record only, not the opener's params** (`tab.navigation.params`
  is `undefined` after a reload). Content that names an external object needs a provider-owned
  binding store (`ui-schedule`'s `task-tab-bindings`); content that is inherently about its own
  session — a desk — needs nothing: read the session prop.
- Placement (`SidebarRightTabPlacement`) carries pane/splitting options but **no sessionId** — a tab
  lives in the session whose sidebar was mounted when it was opened.

## The loop

1. Build (`pnpm build`) — the dev profile links the package and the composition consumes `lib/`.
2. Restart the web UI from a **clean directory** (a repo cwd leaks the repo's AGENTS.md into the
   session): `cd /tmp/desk && node <repo>/dev/env/dsh.mjs --profile dev --port 0 --no-open`.
3. `node dev/probes/web/webui-preflight.mjs '<url with token>'` — must be green before a human opens it.
   It checks the auth flow, that every combo parses, that our bundle registers, that the boot graph
   is satisfiable, and that every `remote.<ns>` we inject exists in the Remote manifest.
4. Only then hand over the URL.

`pnpm verify` covers the static half (the client bundle stays classic-script-safe); preflight covers
the live half. Passing one is not passing the other.
