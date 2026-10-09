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
 * (color contract) / desk-core (store) / desk-io (workspace reads + prompt sends) /
 * dom-utils (row + panel chrome) / brand / commands / room-tabs / panels / dashboard /
 * first-mile — this entry owns the facade registration, the `apply` seat wiring, and the
 * dependency list.
 *
 * @module dsh-smart-assistant/client
 */

import type { ClientContext, ClientRequire, CommandUiRegistry, ModuleLoaderFacade } from './contracts'
import {
  deskSlice, expirePending, getDeskStore, initDeskStore, looksLikeDesk,
  patchDesk, retireStaleReceipt, settlePending,
} from './desk-core'
import type { DeskStore } from './desk-core'
import { bindDeskEnv, getDeskRemote, loadDesk, loadDeskFor, openBeside } from './desk-io'
import { AssistantBrandMark, AssistantBrandName, AssistantHeroMark } from './brand'
import { roomCommands } from './commands'
import { DashboardMainPanel, DashboardPanelIcon } from './dashboard'
import { ApprovalDockBanner, DeskSummaryDock, FirstMileDock } from './first-mile'
import { AssistantDeskChip, DeskTabBody, DeskViewBody, KnowledgeTabBody, MemoryTabBody, roomTabTitle } from './room-tabs'
import { DeskIcon, DeskPanel, KnowledgeIcon, KnowledgePanel, MemoryIcon, MemoryPanel } from './panels'
import { bindClientRequire } from './runtime'
import { ensureThemeVars } from './theme'

/** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote', 'remote.agentPresets', 'remote.workspaceFiles', 'remote.session', 'layout']

/** The cross-plugin panel-action face (ctx.layout) — the dashboard's way back to the Conversation. */
let deskLayout: { selectPanel: (panelId: string | null) => void } | undefined

/**
 * Default selection is consumed once per Client root. Keeping weak root identities on the page
 * realm makes slot/layout remounts and client HMR idempotent; a document reload gets a fresh root.
 */
function selectDashboardByDefault(ctx: ClientContext): void {
  const layout = ctx.layout
  const panelInfo = layout?.panelInfo
  if (layout === undefined || panelInfo === undefined) return
  const pageState = globalThis as typeof globalThis & {
    __DSH_SMART_ASSISTANT_DEFAULT_PANEL_ROOTS__?: WeakSet<object>
  }
  const defaultPanelRoots = pageState.__DSH_SMART_ASSISTANT_DEFAULT_PANEL_ROOTS__ ??= new WeakSet<object>()
  if (defaultPanelRoots.has(ctx.root)) return
  defaultPanelRoots.add(ctx.root)
  if (panelInfo.getSnapshot().activePanelId === null) {
    layout.selectPanel('dsh-smart-assistant-dashboard')
  }
}

/**
 * Build the typert contribution the client mounts for the knowledge-approve direct-call lane.
 * Hand-written (the vendor generator targets tsdown builds; this package's classic-script
 * face carries it inline), and using the `src-json` codec mode — TypertCodec's union offers
 * a no-schema shape exactly so a plain-JSON caller does not need a materialized zod schema,
 * which a classic-script contribution cannot reach.
 */
function buildApproveContribution(): unknown {
  return {
    package: 'dsh-smart-assistant',
    descriptors: [{
      id: 'dsh-smart-assistant#knowledgeApproveRemote/approvePage',
      service: 'knowledgeApproveRemote',
      namespace: 'assistantKnowledge',
      method: 'approvePage',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'src-json' } }],
      result: { mode: 'src-json' },
    }],
  }
}

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
    deskLayout = ctx.layout
    ensureThemeVars()

    // The knowledge-approve direct-call lane (approve-direct-call): mount our contribution so
    // `remote.assistantKnowledge.approvePage` reaches the host service without a model round
    // trip. Failure degrades approveKnowledgePage to the legacy prompt path, announced in-panel.
    // This pin deterministically rejects the mount (strict codec vs classic-script contribution,
    // 261004-approve-direct-call) — the designed state until upstream moves, so the diagnostic
    // stays at info level: an error here would pollute every first open and trip the web-face
    // scenes' empty-console contract (first-open-draft-banner caught this on 2026-10-05).
    const deskRemote = getDeskRemote()
    if (typeof (deskRemote as { $mount?: unknown })?.$mount === 'function') {
      // TypertCodec's `src-json` mode needs no zod schema, so a classic-script contribution
      // can carry plain-JSON codecs without reaching the shell's module table.
      const contribution = buildApproveContribution()
      void Promise.resolve(
        (deskRemote as { $mount: (c: unknown) => Promise<unknown> }).$mount(contribution),
      ).then(() => {
        // Mount evidence: the approve button's direct-call branch reads this namespace.
        console.info('assistantKnowledge remote mounted')
      }).catch((reason: unknown) => {
        console.info('assistantKnowledge mount failed (fallback prompt path stays):', String(reason))
        patchDesk({ note: `批准直调通道未挂载（回退指令通道）：${String(reason)}` })
      })
    } else {
      console.warn('assistantKnowledge mount skipped: no $mount on the client remote service')
    }

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
    ctx.slots.inject('main', () => {
      const registration = ctx.slots.register({
        name: 'main',
        key: 'dsh-smart-assistant-dashboard',
        inject: (): { onAsk: () => void } => ({ onAsk: () => { deskLayout?.selectPanel(null) } }),
      }, DashboardMainPanel)
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

    // Follow the conversation: when the newest Session settles a turn, re-read the desk file after
    // a short settle delay. A refresh the assistant performed during that turn then lands on its
    // own — the principal should not have to click to see what just changed.
    const store = (ctx as { sessions?: { list?: { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void } } }).sessions?.list
    if (store !== undefined) {
      let lastStamp = 0
      let pending: ReturnType<typeof setTimeout> | undefined
      store.subscribe(() => {
        const state = store.getSnapshot() as { ids?: string[], byId?: Record<string, { updatedAt?: number }> }
        const ids = state?.ids ?? []
        const byId = state?.byId ?? {}
        const newest = ids.reduce((max, id) => Math.max(max, Number(byId[id]?.updatedAt ?? 0)), 0)
        if (newest === lastStamp) return
        lastStamp = newest
        if (pending !== undefined) clearTimeout(pending)
        // R11: refresh every bound session's own desk; with no bound tab, walk the newest five.
        pending = setTimeout(() => {
          if (getDeskStore().boundSessions.size === 0) loadDesk()
          for (const bound of getDeskStore().boundSessions) loadDeskFor(bound)
        }, 4000)
      })
    }

    // The rooms live beside the conversation as right-sidebar tabs, each bound to the session
    // whose sidebar holds it — the body reads that session's workspace desk file directly, no
    // more newest-five walk. Two-stage like ui-schedule: the definition into
    // `sidebarRightTabs`, the body into the keyed `sidebar.right.pane.tab` seat under the
    // definition's id. The guide entries (user steer, 2026-09-28) put the rooms in the "+"
    // picker beside the browser and terminal tabs, so opening one no longer depends on knowing
    // the chip or the panel button: the rooms are first-class addable tabs of the right sidebar.
    const roomTabs = [
      {
        id: 'dsh-smart-assistant-desk', kind: 'desk', title: '我的桌面', body: DeskTabBody,
        description: '现在要采取什么行动：等你拍板、在办的事、缺什么',
        icon: DeskIcon, order: 10,
      },
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


    // Desk primary view (desk-primary-view proposal, 2026-10-06): the desk stops being only a
    // right-sidebar tab — it claims a first-class conversation view beside chat. See
    // DeskViewBody's docstring for the seam facts; order 5 keeps chat (0) first on the strip
    // while the desk tab stays one click away, remembered per session once chosen.

    ctx.slots.inject('conversation.view', () =>
      ctx.slots.register({
        name: 'conversation.view',
        id: 'dsh-smart-assistant-desk-view',
        order: 5,
        label: () => '桌面',
        inject: (sessionId: string) => ({ sessionId }),
      }, DeskViewBody))

    // The opener the principal sees where they already are: a chip in the Session header.
    ctx.slots.inject('conversation.session.header.utilities', () =>
      ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'assistant-desk-chip',
        order: -6,
      }, AssistantDeskChip))

    // Discovery (P1-A, 2026-09-26): the `/` menu and the composer's `+` menu list these,
    // so "what can this thing do" stops depending on the principal guessing at a prompt.
    // Scoped inject rather than the plugin's own inject list keeps the rooms independent
    // of whether this composition carries a command surface at all.
    ctx.inject?.(['commandUi'], (scope) => {
      const commandUi = scope.get('commandUi') as CommandUiRegistry | undefined
      if (commandUi === undefined) return
      for (const contribution of roomCommands(openBeside)) commandUi.register(contribution)
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
        inject: (sessionId?: string) => {
          // Form migration: pre-write the view preference at session-binding time (before
          // the view area activates and reads it). Without this, the preference write
          // happens during render — after activateView already ran.
          if (sessionId !== undefined && typeof localStorage !== 'undefined') {
            try {
              const key = 'dsh.conversation.' + sessionId
              if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, JSON.stringify({ view: 'dsh-smart-assistant-desk-view' }))
              }
            } catch { /* localStorage unavailable */ }
          }
          return { openRoom: openBeside }
        },
      }, FirstMileDock))
    // The pending-approval banner (first-open UX card round 16): the desk pointer's shallow
    // twin, visible above the composer in ANY session state whenever drafts wait. Rides the
    // same dock as the first-mile strip; the two coexist (a first open with pending approvals
    // shows both — each answers a different question: how do I start vs what needs my call).
    ctx.slots.inject('conversation.input.dock', () =>
      ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'assistant-approval-banner',
        order: -9,
        inject: () => ({ openRoom: openBeside }),
      }, ApprovalDockBanner))

    // A2' (2026-10-06): the persistent desk summary — rides every non-blank session above
    // the composer. Same dock seat, one order slot below the approval banner.
    ctx.slots.inject('conversation.input.dock', () =>
      ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'assistant-desk-summary',
        order: -7,
        inject: () => ({ openDeskView: () => { openBeside('desk') } }),
      }, DeskSummaryDock))
  }

  // The occupants, the three panels, and the shared store are exposed for tests: the store is the
  // panels' only input, so a test that fills it can render every section without a browser.
  // `roomCommands` is exposed the same way — its contributions are pure values, so a test can
  // assert names, copy, and the room each one opens without a browser context. The first-mile
  // components are exposed because their copy and their button are the deliverable.
  return {
    inject, apply, AssistantBrandMark, AssistantBrandName,
    DeskPanel, KnowledgePanel, MemoryPanel, deskStore, deskSlice,
    DeskTabBody, DeskViewBody, DeskSummaryDock, DashboardPanelIcon, DashboardMainPanel, KnowledgeTabBody, MemoryTabBody, AssistantDeskChip, roomTabTitle,
    roomCommands, AssistantHeroMark, FirstMileDock, ApprovalDockBanner, expirePending, settlePending, loadDeskFor, retireStaleReceipt, looksLikeDesk,
  }
}

const facade = (globalThis as { __ModuleLoader__?: ModuleLoaderFacade }).__ModuleLoader__
if (facade !== undefined) {
  facade.load({ id: 'dsh-smart-assistant', factory: clientFactory })
}
