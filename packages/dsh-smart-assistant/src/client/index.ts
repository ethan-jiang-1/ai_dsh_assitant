/**
 * Browser half of the plugin: the entry that assembles the split client modules and
 * submits them as one client-module registration.
 *
 * Format constraint (learned the hard way): the web shell concatenates client bundles into
 * classic-script combos. One `import`/`export` statement in the SERVED BUNDLE is a parse error
 * there — including the `export {};` module marker — and one bad statement kills every later
 * registration in the same combo. The source is deliberately multi-module (relative imports
 * only) and tsdown inlines the whole `src/client` tree into the single classic script this
 * entry compiles to (`lib/client/index.js`), so the constraint is "no bare-runtime imports",
 * not "no imports in the source": every runtime dependency still comes through the factory's
 * module-table require (see runtime.ts; vendor contract types are mirrored structurally in
 * contracts.ts). The surface is submitted through the stable page-global facade
 * `__ModuleLoader__.load` (queue mode before the module system boots). The
 * emitted bundle is gated by scripts/checks/verify.mjs (clientScriptSafetyProblems).
 *
 * Module map: `chrome/` (contracts, runtime, theme, dom/format/locales, brand, commands,
 * dashboard, first-mile, approve mount, default panel selection) / `rooms/` (room-data
 * store/io/actions, prompt bridge, session settle refresh, panels, tab definitions and bodies,
 * skills, viki, receipt, message action, drawer) / `desk/` (arms, session capture statuses,
 * messages, processing settle observer, view actions; the return state machine itself is the
 * domain module `domain/desk/desk-process.ts`) / `projection/` (download
 * reader, v1/v2 normalization, view store, panel, lifecycle) / `proactive/` (suggestion rows
 * and handlers, catalog source) / `local-state` (per-tab persistence) — this entry owns the
 * facade registration, the seat and command registrations inside `apply`, and the dependency
 * wiring between them (store mounts, the arms, the suggestion handlers).
 *
 * @module dsh-smart-assistant/client
 */

import type { ClientContext, ClientRequire, CommandUiRegistry, ModuleLoaderFacade } from './chrome/contracts'
import { mountApproveRemote } from './chrome/approve-mount'
import { initDeskStore } from './rooms/room-data-core'
import type { DeskStore } from './rooms/room-data-core'
import { bindDeskEnv, loadDesk, newestSessionId, openBeside } from './rooms/room-data-io'
import { mountSessionSettleRefresh } from './rooms/room-settle-refresh'
import { AssistantBrandMark, AssistantBrandName, AssistantHeroMark } from './chrome/brand'
import { deskCommands, roomCommands, uiModeCommands } from './chrome/commands'
import { createDeskActivityHandoff } from './desk/desk-view-actions'
import { mountSessionCaptureStatuses } from './desk/desk-capture-status'
import { DashboardMainPanel, DashboardPanelIcon } from './chrome/dashboard'
import { ApprovalDockBanner, FirstMileDock } from './chrome/first-mile'
import { mountRoomBodies, mountRoomGuides } from './rooms/mount-rooms'
import { RememberAction } from './rooms/message-action'
import { createElement } from './chrome/runtime'
import { bindUiModeRemote, initUiModeStore, isUiMode, type ModeRemote } from './chrome/ui-mode'
import { UiModeRow } from './chrome/ui-mode-row'
import { returnToConversation } from './chrome/navigation'
import { bindVikiEnv } from './rooms/viki-data-io'
import { bindClientRequire } from './chrome/runtime'
import { createSnapshotStore, defineStore } from './chrome/store'
import { ensureThemeVars } from './chrome/theme'
import { debugEnabled } from './chrome/debug-flag'
import { HomeSurface } from './projection/home-surface'
import { DebugPanel } from './debug/debug-panel'
import { createDeskSurface } from './projection/desk-surface'
import { mountProjectionReader } from './projection/projection-lifecycle'
import type { ProjectionDownload } from './projection/projection-reader'
import type { OperatingReceipt } from './projection/operating-projection'
import { createProjectionViewStore } from './projection/projection-view'
import type { DeskPath } from '../domain/desk/desk-process'
import { createDeskArms } from './desk/desk-arms'
import { createProactiveCatalogSource, type ProactiveCatalogState, type ProactiveRemoteLike } from './proactive/proactive-face-source'
import { createProactiveHandlers } from './proactive/proactive-handlers'
import type { ProactiveUiState } from './proactive/proactive-face'
import { readProactiveUi } from './local-state'
import { selectDashboardByDefault } from './chrome/default-panel-selection'
import { deskEn, deskZh, en as firstMileEn, zh as firstMileZh } from './chrome/locales'

/** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote', 'remote.agentPresets', 'remote.workspaceFiles', 'remote.session', 'remote.schedule', 'layout', 'connection', 'uiSession', 'workspaces', 'uiWorkspace', 'locale']

/**
 * Build the plugin surface and the brand occupants against a module-table require.
 * @param require - Synchronous module-table require; 'react' is a baseline external.
 * @returns the plugin surface plus the occupants (exposed for tests).
 */
function clientFactory(require: ClientRequire): Record<string, unknown> {
  // One binding per factory run: the modules take createElement and the hook surface from
  // it, and the desk store is re-created fresh — the same per-materialization lifecycle the
  // single-file original had inside its factory closure.
  bindClientRequire(require)
  const deskStore: DeskStore = initDeskStore()
  initUiModeStore()

  function apply(ctx: ClientContext): void {
    try {
      applyInner(ctx)
    } catch (error) {
      console.error('dsh-smart-assistant client apply failed', error)
      throw error
    }
  }

  function applyInner(ctx: ClientContext): void {
    bindDeskEnv(ctx)
    bindVikiEnv(ctx)
    ensureThemeVars()
    if (ctx.locale !== undefined) {
      ctx.effect(() => ctx.locale!.register('assistantFirstMile', { zh: firstMileZh, en: firstMileEn }), 'assistant-first-mile: dictionaries')
      ctx.effect(() => ctx.locale!.register('assistantDesk', { zh: deskZh, en: deskEn }), 'assistant-desk: dictionaries')
    }

    // The knowledge-approve direct-call lane: mount our contribution (contract and console
    // levels live in approve-mount.ts — an error there would trip the web-face scenes).
    mountApproveRemote()

    // The official build's brand package occupies these slots under its own build profile;
    // step aside there. A browser has no `process`, so the guard reads false and we register.
    if (typeof process !== 'undefined' && process.env?.DSH_CLIENT_BUILD_PROFILE === 'official') {
      return
    }
    // The desk as a MAIN-AREA PANEL (user direction 2026-10-06,
    // [desk-primary-view](../../../../notes/archived/2026-10-06-desk-primary-view.md)) — not a tab inside the chat shell,
    // but a standalone page beside Settings and Tasks. This is the correct vehicle for
    // "desktop as primary object": the principal opens it and sees their dashboard without
    // needing a session, a message, or a chat at all. Conversation becomes an input channel
    // (the "有问题？" button), not the primary surface.
    ctx.slots.inject('sidebar.panellist', () =>
      ctx.slots.register({
        name: 'sidebar.panellist',
        id: 'dsh-smart-assistant-dashboard',
        order: 5,
        label: () => '今天',
      }, DashboardPanelIcon))
    // Local store primitives: the web shell's module table carries React and client modules,
    // not package libraries. A dynamic clientRequire('@deepseek-ai/dsh-client-store') works in
    // the dev composition but fails on a fresh installed web profile; a bare import is barred
    // by the browser-bundle gate. The two primitives are small enough to own locally.
    const storeApi = typeof document === 'undefined' ? undefined : { createSnapshotStore, defineStore }
    const projection = storeApi?.createSnapshotStore<ProjectionDownload>({ status: 'disconnected' })
    const reader = projection === undefined ? undefined : mountProjectionReader(ctx, ctx.connection, projection, {
      baseURI: document.baseURI, origin: location.origin, fetch: globalThis.fetch.bind(globalThis),
    })
    const viewStore = projection === undefined || storeApi === undefined ? undefined : createProjectionViewStore(storeApi.defineStore)
    // A second store handle for the workbench view: the dashboard store is exclusive to
    // its registration, but the projection data itself is the same shared snapshot.
    const workbenchViewStore = projection === undefined || storeApi === undefined ? undefined : createProjectionViewStore(storeApi.defineStore)
    const sessionStatuses = mountSessionCaptureStatuses(ctx, storeApi)
    // The schedule catalog bridge (proactive face, 2026-10-18). Wiring verdict (stage-0, three
    // binary-search rounds): the `'remote.schedule'` subface inject works ONLY together with
    // the `"@deepseek-ai/dsh-schedule"` peer declaration (vendor ui-schedule is wired the same
    // way); either piece alone kills the whole client entry at runtime with zero type-level
    // warning. The source degrades to an explicit marker when the namespace never materializes.
    const proactiveCatalog = storeApi?.createSnapshotStore<ProactiveCatalogState>({ status: 'fetching' })
    if (proactiveCatalog !== undefined) {
      const remoteFace = ctx.remote as ProactiveRemoteLike | undefined
      const source = createProactiveCatalogSource({ effect: install => ctx.effect(install), remote: remoteFace })
      ctx.effect(() => source.subscribe(() => { proactiveCatalog.set(source.getSnapshot()) }))
    }
    const proactiveUi = storeApi?.createSnapshotStore<ProactiveUiState>(readProactiveUi())
    // The explicit processing path: one bound matter + processing session. The
    // path is in-memory by design — a reload reads the authoritative projection first and
    // never replays a path or re-submits. The slot store survives panel switches, so the
    // selection the principal left behind is exactly what the auto-return returns to.
    // One desk→conversation path at a time, either arm: an existing matter being
    // processed, or the intake of a matter the principal is about to describe.
    const deskPath = storeApi?.createSnapshotStore<DeskPath | undefined>(undefined)
    // The live desk store's actions, handed to this entry's own inject face by the render
    // machinery (vendor runInject passes the baked actions of the instance it created). The
    // intake arm needs them for one thing only: selecting the matter it just created on return —
    // the matter arm's selection is the principal's own click, which the store already holds.
    let deskViewActions: { selectMatter(id: string): void } | undefined
    const deskActivity = createDeskActivityHandoff()
    // The four desk→conversation arms (the desk-operating-entry contract + principal-direction
    // cards) live in
    // ./desk-arms: one factory per materialization, so the launch lock and the bound-path
    // access keep the lifecycle they had inside apply. Subscriptions are registered below,
    // where the effect used to be, so lifecycle ordering is unchanged.
    const arms = createDeskArms({
      projection,
      reader,
      deskPath,
      uiWorkspace: ctx.uiWorkspace,
      uiSession: ctx.uiSession,
      layout: ctx.layout,
      workspaces: ctx.workspaces,
      sessions: ctx.sessions,
      effect: (install: () => () => void) => ctx.effect(install),
      viewActions: () => deskViewActions,
    })

    arms.subscribe()
    // The suggestion block's handlers ride the arms' capture lane and the proactive UI store
    // (the prompts and labels live in proactive-handlers.ts).
    const { onSuggestAction, onSuggestDismiss, onWatchForget, onSuggestCollapse } = createProactiveHandlers({ arms, proactiveUi })
    const dashboardComponent = projection === undefined ? DashboardMainPanel : HomeSurface
    const dashboardInject = (sessionId: string | undefined, ...args: unknown[]) => {
      const actions = args.find((argument): argument is { selectMatter(id: string): void, selectMode(mode: 'activity'): void } =>
        typeof argument === 'object' && argument !== null && typeof (argument as { selectMatter?: unknown }).selectMatter === 'function')
      deskViewActions = actions ?? deskViewActions
      deskActivity.receive(actions)
      const hooks = {
        ...(projection === undefined ? {} : { projection }),
        ...(sessionStatuses === undefined ? {} : { sessionStatus: sessionStatuses }),
        ...(proactiveCatalog === undefined ? {} : { catalog: proactiveCatalog }),
        ...(proactiveUi === undefined ? {} : { proactiveUi }),
      }
      const surface = createDeskSurface({
        ctx,
        sessionId,
        reader,
        arms,
        handlers: { onSuggestAction, onSuggestDismiss, onWatchForget, onSuggestCollapse },
        openRecords: () => { openBeside('knowledgeRoom') },
      })
      const current = ctx.uiSession?.current.value.key
      const resolvedSession = sessionId ?? (current === undefined ? undefined : String(current))
      const loadOlderReceipts = async (before: string | undefined): Promise<{ readonly receipts: readonly OperatingReceipt[], readonly nextBefore: string | null }> => {
        const url = new URL('/api/assistant/operating-receipts', document.baseURI)
        if (before !== undefined) url.searchParams.set('before', before)
        url.searchParams.set('limit', '50')
        const response = await fetch(url, { headers: { accept: 'application/json' } })
        if (!response.ok) throw new Error(`receipt archive request failed (${String(response.status)})`)
        const body = await response.json() as { receipts?: unknown, nextBefore?: unknown }
        if (!Array.isArray(body.receipts) || (body.nextBefore !== null && typeof body.nextBefore !== 'string')) throw new Error('receipt archive response is invalid')
        return {
          receipts: body.receipts.filter((receipt): receipt is OperatingReceipt =>
            typeof receipt === 'object' && receipt !== null
            && typeof (receipt as { operationId?: unknown }).operationId === 'string'
            && typeof (receipt as { submittedAt?: unknown }).submittedAt === 'string'),
          nextBefore: body.nextBefore,
        }
      }
      return {
        surface,
        hooks,
        loadOlderReceipts,
        ...(resolvedSession === undefined ? {} : { sessionId: resolvedSession }),
        // The fallback panel (no projection store in this composition) reads only the return.
        ...(projection === undefined ? { onAsk: () => returnToConversation(ctx, sessionId, typeof document === 'undefined' ? {} : { document }) } : {}),
      }
    }
    // The slot inject face is variadic and differs between `main` (no session) and
    // `conversation.view` (session first). Resolve the session once at injection, not inside the
    // eventual click handler; the navigation module owns what to do with it.
    const injectDashboard = (...args: unknown[]) => dashboardInject(
      args.find((argument): argument is string => typeof argument === 'string'),
      ...args,
    )
    ctx.slots.inject('main', () => {
      const registration = ctx.slots.register({
        name: 'main',
        key: 'dsh-smart-assistant-dashboard',
        locale: 'assistantDesk',
        ...(viewStore === undefined ? {} : { store: viewStore }),
        inject: injectDashboard,
      }, dashboardComponent)
      selectDashboardByDefault(ctx)
      return registration
    })

    // The developer debug panel and the Viki room share one flag. A separate `main`
    // registration is not an option for the tab: the main slot is single-occupant, and a second
    // one kills the whole client entry.
    const roomsDebug = debugEnabled()
    if (projection !== undefined && storeApi !== undefined && roomsDebug) {
      ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'assistant-debug',
        order: 32,
        label: () => '开发调试',
        ...(workbenchViewStore === undefined ? {} : { store: workbenchViewStore }),
        inject: injectDashboard,
      }, DebugPanel))
    }

    ctx.slots.inject('sidebar.brand.mark', () =>
      ctx.slots.inject('sidebar.brand.name', function* () {
        // A fresh standard web profile also mounts the official brand row at the default
        // priority. Two same-priority single-slot occupants throw and take the whole client
        // entry down; -1 is the documented shadowing rank (lowest renders).
        yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -1 }, AssistantBrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -1 }, AssistantBrandName)
      }))

    // (User steer, 2026-09-28 —
    // [rooms-to-right-sidebar](../../../../notes/archived/2026-09-28-rooms-to-right-sidebar.md)) The rooms' home is the RIGHT sidebar as addable tabs — like the
    // browser and terminal tabs there, opened from the guide ("+") while a conversation is on,
    // several at once, each bound to its session. The left main-panel registrations are retired;
    // the wide-panel bodies are unchanged (the tab seat renders the same components).
    // One load feeds all three rooms; the store notifies them as it settles.
    loadDesk()

    mountSessionSettleRefresh(ctx, reader)

    // The rooms live beside the conversation as right-sidebar tabs, each bound to the session
    // whose sidebar holds it — the body reads that session's workspace desk file directly, no
    // more newest-five walk. Two-stage like ui-schedule: the definition into
    // `sidebarRightTabs`, the body into the keyed `sidebar.right.pane.tab` seat under the
    // definition's id. The guide entries (user steer, 2026-09-28) put the rooms in the "+"
    // picker beside the browser and terminal tabs, so opening one no longer depends on knowing
    // the chip or the panel button: the rooms are first-class addable tabs of the right sidebar.
    // The session desk room is RETIRED (principal decision, 2026-10-11): the ledger's global
    // desk is the one "桌面" — a second desk reading the old room-data copy split the principal's
    // mental model, and the live model routed business items into it. The room components stay
    // exported for their specs; deleting the session-desk subsystem is a follow-up slice.
    // The three product rooms are always in the "+" guide; Viki(调试) joins them only when the
    // debug flag is on (same flag as the developer tab). Density never touches this surface.
    ctx.effect?.(() => mountRoomGuides(ctx, roomsDebug), "assistant: room guides")
    ctx.effect?.(() => mountRoomBodies(ctx, roomsDebug), "assistant: room tab bodies")

    // Form migration: conversation.composer is a CHAIN slot — chain slots are owner-only
    // registration (the declaring entry is the only one that can add to the chain).
    // Our plugin cannot register on it. The rich landing card in conversation.input.dock
    // (below) is the plugin boundary's best shot. Full form migration needs upstream D7.


    // The session desk VIEW tab is retired with the room (same principal decision). The
    // workbench tab may reuse the 「桌面」 label for the same global ledger desk; there is still
    // no second session-desk subsystem.

    // Discovery (2026-09-26): the `/` menu and the composer's `+` menu list these,
    // so "what can this thing do" stops depending on the principal guessing at a prompt.
    // Scoped inject rather than the plugin's own inject list keeps the rooms independent
    // of whether this composition carries a command surface at all.
    ctx.inject?.(['commandUi'], (scope) => {
      const commandUi = scope.get('commandUi') as CommandUiRegistry | undefined
      if (commandUi === undefined) return
      for (const contribution of [...roomCommands(openBeside), ...deskCommands(() => {
        deskActivity.requestActivity()
        ctx.layout?.selectPanel('dsh-smart-assistant-dashboard')
      }), ...uiModeCommands()]) commandUi.register(contribution)
    })

    // The mode's durable half: the Host's authenticated `ui-mode.json` route. Its value wins
    // over the localStorage first paint; a failed read/write leaves the local choice standing.
    const modeRemote: ModeRemote = {
      load: async () => {
        try {
          const response = await fetch('/api/assistant/ui-mode', { headers: { accept: 'application/json' } })
          if (!response.ok) return undefined
          const body = await response.json() as { mode?: unknown }
          return isUiMode(body.mode) ? body.mode : undefined
        } catch {
          return undefined
        }
      },
      save: async (mode) => {
        try {
          const response = await fetch('/api/assistant/ui-mode', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ mode }),
          })
          return response.ok
        } catch {
          return false
        }
      },
    }
    if (typeof fetch === 'function') {
      ctx.effect?.(() => bindUiModeRemote(modeRemote), 'assistant: ui mode remote')
    }
    ctx.slots.inject('settings.general.item', () =>
      ctx.slots.register({ name: 'settings.general.item', id: 'assistant-ui-mode', order: -10 }, UiModeRow))

    // First-mile identity and guidance (2026-09-26). Two seats the shell leaves open
    // exactly where a first-time principal looks: the blank-session hero mark, and the
    // full-width dock above the composer that the owner renders only in that same hero
    // state. Both disappear on their own once the conversation starts.
    ctx.slots.inject('conversation.hero.brand.mark', () =>
      ctx.slots.register({ name: 'conversation.hero.brand.mark', priority: -1 }, AssistantHeroMark))
    ctx.slots.inject('conversation.chat.assistant-actions', () =>
      ctx.slots.register({
        name: 'conversation.chat.assistant-actions',
        id: 'dsh-smart-assistant-remember',
      }, function RememberActionSlot(props: { messageId?: string }): unknown {
        return createElement(RememberAction as unknown as import('react').FunctionComponent<{ messageId?: string | undefined, sessionId?: string | undefined }>, {
          messageId: props.messageId,
          sessionId: newestSessionId(),
        })
      })),
    ctx.slots.inject('conversation.input.dock', () =>
      ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'assistant-first-mile',
        order: -10,
        locale: 'assistantFirstMile',
        inject: (sessionId?: string) => {
          const path = deskPath?.getSnapshot()
          const processingMatter = path !== undefined && path.kind === 'matter' && sessionId !== undefined
            && path.sessionId === sessionId && path.displayContext !== undefined
            ? { matterId: path.matterId, ...path.displayContext }
            : undefined
          return {
            // The one desk is a MAIN panel (the ledger projection), not a room tab — this is
            // what the dock's 「打开桌面全景」 switches to.
            openDesk: () => { ctx.layout?.selectPanel('dsh-smart-assistant-dashboard') },
            ...(processingMatter === undefined ? {} : { processingMatter }),
          }
        },
      }, FirstMileDock))
    // The approval banner (first-open UX card round 16) rides the same dock seat as the
    // first-mile strip; the two coexist (each answers a different question).
    ctx.slots.inject('conversation.input.dock', () =>
      ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'assistant-approval-banner',
        order: -9,
        inject: () => ({ openRoom: openBeside }),
      }, ApprovalDockBanner))


  }

  // The serving interface is intentionally small. Component/function coverage lives in
  // `tests/support/client-surface.harness.ts`, which re-exports the same module instances; only the live
  // desk store stays here because it is created per materialization.
  return {
    inject, apply, deskStore,
  }
}

const facade = (globalThis as { __ModuleLoader__?: ModuleLoaderFacade }).__ModuleLoader__
if (facade !== undefined) {
  facade.load({ id: 'dsh-smart-assistant', factory: clientFactory })
}
