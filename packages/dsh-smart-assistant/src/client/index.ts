/**
 * Browser half of the plugin: the entry that assembles the split client modules and
 * submits them as one client-module registration.
 *
 * Format constraint (learned the hard way, 2026-09-24, two rounds): the web shell
 * concatenates client bundles into classic-script combos. One `import`/`export` statement
 * in the SERVED BUNDLE is a parse error there — including the `export {};` module marker —
 * and one bad statement kills every later registration in the same combo. Since S2
 * (261007 bigfile-split) the source is deliberately multi-module (relative imports only)
 * and tsdown inlines the whole `src/client` tree into the single classic script this entry
 * compiles to (`lib/client/index.js`) — the constraint moved from "no imports in the
 * source" to "no bare-runtime imports" (every runtime dependency still comes through the
 * factory's module-table require, see runtime.ts; vendor contract types are mirrored
 * structurally in contracts.ts). The surface is submitted through the stable page-global
 * facade `__ModuleLoader__.load` (queue mode before the module system boots). The
 * emitted bundle is gated by scripts/checks/verify.mjs (clientScriptSafetyProblems).
 *
 * Module map: contracts (type mirrors) / runtime (factory require binding) / theme
 * (color contract) / room-data-core + room-data-io + room-data-actions (the `.desk/state.json`
 * room-data file: store + workspace reads & prompt sends + the panel actions' wordings — "It is
 * not the desk", per the manual) /
 * dom-utils (row + panel chrome) / format (the time formatting family) /
 * approve-mount (the knowledge-approve direct-call lane's mount) /
 * desk-view-actions (deferred activity mode intent) /
 * default-panel-selection (one root-scoped cold-start choice) / brand / commands / room-tabs / panels / dashboard /
 * first-mile / desk-process (the operating desk's arm paths: bind & return judges) /
 * desk-arms (the four arms themselves: one launch skeleton, the seed notes, the return
 * dispatch — one factory per materialization, this entry calls its `subscribe`) /
 * desk-process-messages (those arms' four seed texts) /
 * desk-process-lifecycle (settlement refresh edge owner) /
 * projection-panel + projection-lifecycle +
 * projection-reader + projection-view + operating-projection (the desktop itself — the
 * read-only operating desk) — this entry owns the facade registration, `apply` seat wiring,
 * plugin-fiber effects, and the dependency list.
 *
 * @module dsh-smart-assistant/client
 */

import type { ClientContext, ClientRequire, CommandUiRegistry, ModuleLoaderFacade } from './contracts'
import { mountApproveRemote } from './approve-mount'
import {
  deskSlice, expirePending, getDeskStore, initDeskStore, looksLikeDesk,
  retireStaleReceipt, settlePending,
} from './room-data-core'
import type { DeskStore } from './room-data-core'
import { bindDeskEnv, loadDesk, loadDeskFor, openBeside } from './room-data-io'
import { AssistantBrandMark, AssistantBrandName, AssistantHeroMark } from './brand'
import { deskCommands, roomCommands } from './commands'
import { createDeskActivityHandoff } from './desk-view-actions'
import { DashboardMainPanel, DashboardPanelIcon } from './dashboard'
import { ApprovalDockBanner, FirstMileDock } from './first-mile'
import { KnowledgeTabBody, MemoryTabBody, roomTabTitle } from './room-tabs'
import { KnowledgeIcon, KnowledgePanel, MemoryIcon, MemoryPanel } from './panels'
import { bindClientRequire, clientRequire } from './runtime'
import { ensureThemeVars } from './theme'
import { ProjectionPanel } from './projection-panel'
import { mountProjectionReader } from './projection-lifecycle'
import type { ProjectionDownload } from './projection-reader'
import { createProjectionViewStore } from './projection-view'
import type { CaptureStatus, DeskPath } from './desk-process'
import { createDeskArms } from './desk-arms'
import { selectDashboardByDefault } from './default-panel-selection'
import { en as firstMileEn, zh as firstMileZh } from './locales'

/** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote', 'remote.agentPresets', 'remote.workspaceFiles', 'remote.session', 'layout', 'connection', 'uiSession', 'workspaces', 'uiWorkspace', 'locale']


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
    // Goal 1.5 (2026-10-06): the desk as a MAIN-AREA PANEL — not a tab inside the chat shell,
    // but a standalone page beside Settings and Tasks. This is the correct vehicle for
    // "desktop as primary object": the principal opens it and sees their dashboard without
    // needing a session, a message, or a chat at all. Conversation becomes an input channel
    // (the "有问题？" button), not the primary surface.
    ctx.slots.inject('sidebar.panellist', () =>
      ctx.slots.register({
        name: 'sidebar.panellist',
        id: 'dsh-smart-assistant-dashboard',
        order: 5,
        label: () => '桌面',
      }, DashboardPanelIcon))
    const storeApi = typeof document === 'undefined' ? undefined : clientRequire<{
      createSnapshotStore<T>(initial: T): { getSnapshot(): T; subscribe(listener: () => void): () => void; set(value: T): void }
      defineStore: import('./projection-view').DefineProjectionViewStore
    }>('@deepseek-ai/dsh-client-store')
    const projection = storeApi?.createSnapshotStore<ProjectionDownload>({ status: 'disconnected' })
    const reader = projection === undefined ? undefined : mountProjectionReader(ctx, ctx.connection, projection, {
      baseURI: document.baseURI, origin: location.origin, fetch: globalThis.fetch.bind(globalThis),
    })
    const viewStore = projection === undefined || storeApi === undefined ? undefined : createProjectionViewStore(storeApi.defineStore)
    // 片 1b: the platform's per-session status, mirrored into a snapshot store so the desk panel
    // can read it through a selector hook like the projection. The desk owns no copy of "whose
    // turn it is" — it re-reads the platform's own answer, which is what makes it survive a reload.
    // The injected face types `pendingInteraction` as `unknown` (it is a declaration-merged
    // domain value), so the shape is re-narrowed once, here, instead of being guessed at each
    // read. `completionUnread` is not in the injected type at all; it is read structurally.
    const toCaptureStatus = (value: { readonly running?: boolean, readonly pendingInteraction?: unknown }): CaptureStatus => {
      const pending = value.pendingInteraction as { readonly kind?: unknown } | null | undefined
      const completionUnread = (value as { readonly completionUnread?: boolean }).completionUnread
      return {
        ...(value.running === undefined ? {} : { running: value.running }),
        ...(pending === undefined || pending === null ? {} : { pendingInteraction: typeof pending.kind === 'string' ? { kind: pending.kind } : {} }),
        ...(completionUnread === true ? { completionUnread: true } : {}),
      }
    }
    const readStatuses = (): ReadonlyMap<string, CaptureStatus> => new Map(
      [...(ctx.uiSession?.sessionStatus.getSnapshot() ?? [])].map(([id, value]) => [id, toCaptureStatus(value)]),
    )
    const sessionStatuses = storeApi?.createSnapshotStore<ReadonlyMap<string, CaptureStatus>>(readStatuses())
    if (sessionStatuses !== undefined && ctx.uiSession !== undefined) {
      const status = ctx.uiSession.sessionStatus
      ctx.effect(() => status.subscribe(() => { sessionStatuses.set(readStatuses()) }))
    }
    // The explicit processing path (K3 slice F): one bound matter + processing session. The
    // path is in-memory by design — a reload reads the authoritative projection first and
    // never replays a path or re-submits. The slot store survives panel switches, so the
    // selection the principal left behind is exactly what the auto-return returns to.
    // One desk→conversation path at a time, either arm (spec K3): an existing matter being
    // processed, or the intake of a matter the principal is about to describe.
    const deskPath = storeApi?.createSnapshotStore<DeskPath | undefined>(undefined)
    // The live desk store's actions, handed to this entry's own inject face by the render
    // machinery (vendor runInject passes the baked actions of the instance it created). The
    // intake arm needs them for one thing only: selecting the matter it just created on return —
    // the matter arm's selection is the principal's own click, which the store already holds.
    let deskViewActions: { selectMatter(id: string): void } | undefined
    const deskActivity = createDeskActivityHandoff()
    // The four desk→conversation arms (spec K3 + principal-direction cards) live in
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
          }
          return { hooks, refreshProjection: () => { reader?.refresh() }, onAsk: () => { ctx.layout?.selectPanel(null) }, onEntrust: arms.startIntake, onProcess: arms.processMatter, onClaim: arms.claimFragment, onDiscard: arms.discardFragment, onCapture: arms.captureFromDesk, onOpenSession: (sessionId: string) => { ctx.uiWorkspace?.openSession(sessionId) }, onWake: arms.wakeMatter }
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

    // (2026-09-28 user steer) The rooms' home is the RIGHT sidebar as addable tabs — like the
    // browser and terminal tabs there, opened from the guide ("+") while a conversation is on,
    // several at once, each bound to its session. The left main-panel registrations are retired;
    // the wide-panel bodies are unchanged (the tab seat renders the same components).
    // One load feeds all three rooms; the store notifies them as it settles.
    loadDesk()

    // Follow the conversation: when the newest Session settles a turn, re-read the desk file AND
    // the operating projection after a short settle delay. A refresh the assistant performed
    // during that turn then lands on its own — the principal should not have to click to see what
    // changed. The projection half is the K4 processing readback (2026-10-10, desk-process-e2e
    // probe): without it the receipt committed by the processing turn never re-enters the client,
    // judgeReturn stays on 'receipt-not-read-back', and the auto-return to the desk never fires.
    // Room-data refresh also serves headless apply contexts, which may not expose effect. Keep
    // their historical direct subscription; browser Client fibers own teardown when available.
    const store = ctx.sessions?.list as { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void } | undefined
    if (store !== undefined) {
      const installSessionRefresh = (): (() => void) => {
        let lastStamp = 0
        let pending: ReturnType<typeof setTimeout> | undefined
        const unsubscribe = store.subscribe(() => {
          const state = store.getSnapshot() as { ids?: string[], byId?: Record<string, { updatedAt?: number }> }
          const ids = state?.ids ?? []
          const byId = state?.byId ?? {}
          const newest = ids.reduce((max, id) => Math.max(max, Number(byId[id]?.updatedAt ?? 0)), 0)
          if (newest === lastStamp) return
          lastStamp = newest
          if (pending !== undefined) clearTimeout(pending)
          // R11: refresh every bound session's own desk; with no bound tab, walk the newest five.
          pending = setTimeout(() => {
            pending = undefined
            if (getDeskStore().boundSessions.size === 0) loadDesk()
            for (const bound of getDeskStore().boundSessions) loadDeskFor(bound)
            reader?.refresh()
          }, 4000)
        })
        return () => {
          unsubscribe()
          if (pending !== undefined) clearTimeout(pending)
        }
      }
      if (typeof ctx.effect === 'function') ctx.effect(installSessionRefresh, 'assistant-client: Session settle refresh')
      else installSessionRefresh()
    }

    // The rooms live beside the conversation as right-sidebar tabs, each bound to the session
    // whose sidebar holds it — the body reads that session's workspace desk file directly, no
    // more newest-five walk. Two-stage like ui-schedule: the definition into
    // `sidebarRightTabs`, the body into the keyed `sidebar.right.pane.tab` seat under the
    // definition's id. The guide entries (user steer, 2026-09-28) put the rooms in the "+"
    // picker beside the browser and terminal tabs, so opening one no longer depends on knowing
    // the chip or the panel button: the rooms are first-class addable tabs of the right sidebar.
    // The session desk room is RETIRED (principal decision, 2026-10-11): the ledger's global
    // desk is the one "桌面" — a second desk reading .desk/state.json split the principal's
    // mental model, and the live model routed business items into it. The room components stay
    // exported for their specs; deleting the session-desk subsystem is a follow-up slice.
    const roomTabs = [
      {
        id: 'dsh-smart-assistant-knowledge', kind: 'knowledgeRoom', title: '知识室', body: KnowledgeTabBody,
        description: '它凭什么这样判断：知识页、出处与待你审批的草稿',
        icon: KnowledgeIcon, order: 11,
      },
      {
        id: 'dsh-smart-assistant-memory', kind: 'memoryRoom', title: '记忆室', body: MemoryTabBody,
        description: '它把你理解成什么：偏好、决定与事实，每条可纠错',
        icon: MemoryIcon, order: 12,
      },
    ] as const
    for (const room of roomTabs) {
      ctx.sidebarRightTabs.register({
        id: room.id,
        kind: room.kind,
        priority: 'fallback',
        title: () => room.title,
        guide: [{
          id: `${room.id}-guide`,
          order: room.order,
          title: () => room.title,
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
        ctx.slots.register({ name: 'sidebar.right.pane.tab.title', key: room.id }, roomTabTitle(room.icon, room.title)))
    }
    // Form migration: conversation.composer is a CHAIN slot — chain slots are owner-only
    // registration (the declaring entry is the only one that can add to the chain).
    // Our plugin cannot register on it. The rich landing card in conversation.input.dock
    // (below) is the plugin boundary's best shot. Full form migration needs upstream D7.


    // The session desk VIEW tab is retired with the room (same principal decision): no
    // second surface may carry the "桌面" name — the main-panel desk is the only one.

    // Discovery (P1-A, 2026-09-26): the `/` menu and the composer's `+` menu list these,
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

    // First-mile identity and guidance (P1-B, 2026-09-26). Two seats the shell leaves open
    // exactly where a first-time principal looks: the blank-session hero mark, and the
    // full-width dock above the composer that the owner renders only in that same hero
    // state. Both disappear on their own once the conversation starts.
    ctx.slots.inject('conversation.hero.brand.mark', () =>
      ctx.slots.register({ name: 'conversation.hero.brand.mark' }, AssistantHeroMark))
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

  // The occupants, the two room panels, and the shared store are exposed for tests: the store is
  // the panels' only input, so a test that fills it can render every section without a browser.
  // `roomCommands` is exposed the same way — its contributions are pure values, so a test can
  // assert names, copy, and the room each one opens without a browser context. The first-mile
  // components are exposed because their copy and their button are the deliverable.
  return {
    inject, apply, AssistantBrandMark, AssistantBrandName,
    KnowledgePanel, MemoryPanel, deskStore, deskSlice,
    DashboardPanelIcon, DashboardMainPanel, KnowledgeTabBody, MemoryTabBody, roomTabTitle,
    roomCommands, AssistantHeroMark, FirstMileDock, ApprovalDockBanner, expirePending, settlePending, loadDeskFor, retireStaleReceipt, looksLikeDesk,
  }
}

const facade = (globalThis as { __ModuleLoader__?: ModuleLoaderFacade }).__ModuleLoader__
if (facade !== undefined) {
  facade.load({ id: 'dsh-smart-assistant', factory: clientFactory })
}
