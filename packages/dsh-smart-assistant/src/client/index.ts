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
import { deskCommands, roomCommands } from './chrome/commands'
import { createDeskActivityHandoff } from './desk/desk-view-actions'
import { mountSessionCaptureStatuses } from './desk/desk-capture-status'
import { DashboardMainPanel, DashboardPanelIcon } from './chrome/dashboard'
import { TasksView, bindTasksEnv } from './rooms/tasks-view'
import { ApprovalDockBanner, FirstMileDock } from './chrome/first-mile'
import { roomTabTitle, roomTabs } from './rooms/room-tabs'
import { RememberAction } from './rooms/message-action'
import { createElement } from './chrome/runtime'
import { bindVikiEnv } from './rooms/viki-data-io'
import { bindClientRequire, clientRequire } from './chrome/runtime'
import { ensureThemeVars } from './chrome/theme'
import { ProjectionPanel } from './projection/projection-panel'
import { mountProjectionReader } from './projection/projection-lifecycle'
import type { ProjectionDownload } from './projection/projection-reader'
import { createProjectionViewStore } from './projection/projection-view'
import type { DeskPath } from '../domain/desk/desk-process'
import { createDeskArms } from './desk/desk-arms'
import { createProactiveCatalogSource, type ProactiveCatalogState, type ProactiveRemoteLike } from './proactive/proactive-face-source'
import { createProactiveHandlers } from './proactive/proactive-handlers'
import type { ProactiveUiState } from './proactive/proactive-face'
import { readProactiveUi } from './local-state'
import { selectDashboardByDefault } from './chrome/default-panel-selection'
import { en as firstMileEn, zh as firstMileZh } from './chrome/locales'

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

  function apply(ctx: ClientContext): void {
    bindDeskEnv(ctx)
    bindVikiEnv(ctx)
    ensureThemeVars()
    if (ctx.locale !== undefined) {
      ctx.effect(() => ctx.locale!.register('assistantFirstMile', { zh: firstMileZh, en: firstMileEn }), 'assistant-first-mile: dictionaries')
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
    // Workbench tab: the desk lives beside Conversation/Trajectory, not only as a
    // left-rail main panel. The native right rail belongs to the session and stays.
    ctx.slots.inject('conversation.view', () => ctx.slots.register({
      name: 'conversation.view',
      id: 'assistant-desk',
      order: 30,
      label: () => '桌面',
    }, DashboardMainPanel))

    ctx.slots.inject('conversation.view', () => ctx.slots.register({
      name: 'conversation.view',
      id: 'assistant-tasks',
      order: 31,
      label: () => '自动化任务',
    }, TasksView))

    ctx.slots.inject('sidebar.panellist', () =>
      ctx.slots.register({
        name: 'sidebar.panellist',
        id: 'dsh-smart-assistant-dashboard',
        order: 5,
        label: () => '桌面',
      }, DashboardPanelIcon))
    const storeApi = typeof document === 'undefined' ? undefined : clientRequire<{
      createSnapshotStore<T>(initial: T): { getSnapshot(): T; subscribe(listener: () => void): () => void; set(value: T): void }
      defineStore: import('./projection/projection-view').DefineProjectionViewStore
    }>('@deepseek-ai/dsh-client-store')
    const projection = storeApi?.createSnapshotStore<ProjectionDownload>({ status: 'disconnected' })
    const reader = projection === undefined ? undefined : mountProjectionReader(ctx, ctx.connection, projection, {
      baseURI: document.baseURI, origin: location.origin, fetch: globalThis.fetch.bind(globalThis),
    })
    const viewStore = projection === undefined || storeApi === undefined ? undefined : createProjectionViewStore(storeApi.defineStore)
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
      bindTasksEnv({
        source,
        openTask: (sessionId, id) => {
          // The schedule package owns this kind; its params are session + task id.
          ctx.sidebarRight?.openTab('scheduleTask' as never, { params: { sessionId, id } } as never)
        },
      })
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
    ctx.slots.inject('main', () => {
      const registration = ctx.slots.register({
        name: 'main',
        key: 'dsh-smart-assistant-dashboard',
        ...(viewStore === undefined ? {} : { store: viewStore }),
        // Positional convention from the render machinery: a session-scoped registration gets
        // `(sessionId, actions)`, a root-scoped one gets `(actions)` alone (`main` is root-scoped).
        // Take whichever argument actually carries the baked actions instead of trusting position.
        inject: (...args: unknown[]) => {
          const actions = args.find((argument): argument is { selectMatter(id: string): void, setMode(mode: 'activity'): void } =>
            typeof argument === 'object' && argument !== null && typeof (argument as { selectMatter?: unknown }).selectMatter === 'function')
          deskViewActions = actions ?? deskViewActions
          deskActivity.receive(actions)
          const hooks = {
            ...(projection === undefined ? {} : { projection }),
            ...(sessionStatuses === undefined ? {} : { sessionStatus: sessionStatuses }),
            ...(proactiveCatalog === undefined ? {} : { catalog: proactiveCatalog }),
            ...(proactiveUi === undefined ? {} : { proactiveUi }),
          }
          return { hooks, refreshProjection: () => { reader?.refresh() }, onAsk: () => { ctx.layout?.selectPanel(null) }, onEntrust: arms.startIntake, onProcess: arms.processMatter, onClaim: arms.claimFragment, onDiscard: arms.discardFragment, onCapture: arms.captureFromDesk, onOpenSession: (sessionId: string) => { ctx.uiWorkspace?.openSession(sessionId) }, onWake: arms.wakeMatter, onOpenTasks: () => { ctx.layout?.selectPanel('schedules') }, onSuggestAction, onSuggestDismiss, onWatchForget, onSuggestCollapse }
        },
      }, projection === undefined ? DashboardMainPanel : ProjectionPanel)
      selectDashboardByDefault(ctx)
      return registration
    })

    ctx.slots.inject('sidebar.brand.mark', () =>
      ctx.slots.inject('sidebar.brand.name', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, AssistantBrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, AssistantBrandName)
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
    for (const room of roomTabs) {
      ctx.sidebarRightTabs.register({
        id: room.id,
        kind: room.kind,
        priority: 'fallback',
        title: () => ('tabTitle' in room ? room.tabTitle : room.title),
        guide: [{
          id: `${room.id}-guide`,
          order: room.order,
          title: () => ('tabTitle' in room ? room.tabTitle : room.title),
          description: () => room.description,
          icon: room.icon,
        }],
      })
      ctx.slots.inject('sidebar.right.pane.tab', () =>
        ctx.slots.register({ name: 'sidebar.right.pane.tab', key: room.id }, room.body))
      // The tab strip's chip: the room's own glyph before its title (user steer, 2026-09-28 —
      // "tab 上最好每个都有一个自己的 icon"). The title seat replaces the bare-label chip the
      // definition would otherwise draw (same mechanism as the vendor's guide compass).
      ctx.slots.inject('sidebar.right.pane.tab.title', () =>
        ctx.slots.register(
          { name: 'sidebar.right.pane.tab.title', key: room.id },
          roomTabTitle(
            room.icon,
            'tabTitle' in room ? room.tabTitle : room.title,
            room.kind === 'vikiRoom' ? { icon: false, fontSize: '10px' } : {},
          ),
        ))
    }
    // Form migration: conversation.composer is a CHAIN slot — chain slots are owner-only
    // registration (the declaring entry is the only one that can add to the chain).
    // Our plugin cannot register on it. The rich landing card in conversation.input.dock
    // (below) is the plugin boundary's best shot. Full form migration needs upstream D7.


    // The session desk VIEW tab is retired with the room (same principal decision): no
    // second surface may carry the "桌面" name — the main-panel desk is the only one.

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
      })]) commandUi.register(contribution)
    })

    // First-mile identity and guidance (2026-09-26). Two seats the shell leaves open
    // exactly where a first-time principal looks: the blank-session hero mark, and the
    // full-width dock above the composer that the owner renders only in that same hero
    // state. Both disappear on their own once the conversation starts.
    ctx.slots.inject('conversation.hero.brand.mark', () =>
      ctx.slots.register({ name: 'conversation.hero.brand.mark' }, AssistantHeroMark))
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
