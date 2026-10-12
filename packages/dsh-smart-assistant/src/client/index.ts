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
 * first-mile / desk-process (processing-path bind & return judge) / projection-panel +
 * projection-lifecycle + projection-reader + projection-view + operating-projection
 * (the read-only operating desk) — this entry owns the facade registration, the `apply`
 * seat wiring, and the dependency list.
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
import { ApprovalDockBanner, FirstMileDock } from './first-mile'
import { KnowledgeTabBody, MemoryTabBody, roomTabTitle } from './room-tabs'
import { KnowledgeIcon, KnowledgePanel, MemoryIcon, MemoryPanel } from './panels'
import { bindClientRequire, clientRequire } from './runtime'
import { ensureThemeVars } from './theme'
import { ProjectionPanel } from './projection-panel'
import { mountProjectionReader } from './projection-lifecycle'
import type { ProjectionDownload } from './projection-reader'
import { createProjectionViewStore } from './projection-view'
import { bindClaimPath, bindIntakePath, bindProcessPath, claimContextMessage, judgeClaimReturn, judgeIntakeReturn, judgeReturn, processingContextMessage, type DeskPath } from './desk-process'
import { en as firstMileEn, zh as firstMileZh } from './locales'

/** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote', 'remote.agentPresets', 'remote.workspaceFiles', 'remote.session', 'layout', 'connection', 'uiSession', 'workspaces', 'uiWorkspace', 'locale']

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
    ensureThemeVars()
    if (ctx.locale !== undefined) {
      ctx.effect(() => ctx.locale!.register('assistantFirstMile', { zh: firstMileZh, en: firstMileEn }), 'assistant-first-mile: dictionaries')
    }

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
    const storeApi = typeof document === 'undefined' ? undefined : clientRequire<{
      createSnapshotStore<T>(initial: T): { getSnapshot(): T; subscribe(listener: () => void): () => void; set(value: T): void }
      defineStore: import('./projection-view').DefineProjectionViewStore
    }>('@deepseek-ai/dsh-client-store')
    const projection = storeApi?.createSnapshotStore<ProjectionDownload>({ status: 'disconnected' })
    const reader = projection === undefined ? undefined : mountProjectionReader(ctx, ctx.connection, projection, {
      baseURI: document.baseURI, origin: location.origin, fetch: globalThis.fetch.bind(globalThis),
    })
    const viewStore = projection === undefined || storeApi === undefined ? undefined : createProjectionViewStore(storeApi.defineStore)
    // The explicit processing path (K3 slice F): one bound matter + processing session. The
    // path is in-memory by design — a reload reads the authoritative projection first and
    // never replays a path or re-submits. The slot store survives panel switches, so the
    // selection the principal left behind is exactly what the auto-return returns to.
    // One desk→conversation path at a time, either arm (spec K3): an existing matter being
    // processed, or the intake of a matter the principal is about to describe.
    const deskPath = storeApi?.createSnapshotStore<DeskPath | undefined>(undefined)
    // Reuse-or-create (spec: 「可复用明确可用的处理 Session，否则显式创建/绑定」; the
    // double-click negative 双击发送两次: a second click must not create a second processing
    // session — 会话增殖 is the losing option 4). Same matter → re-open the bound session; a
    // launch in flight swallows further clicks until its path binds (the create is async, so
    // the bound-path check alone cannot cover the double-click window); a different matter
    // replaces the path with a fresh session.
    let processLaunchInFlight = false
    // The live desk store's actions, handed to this entry's own inject face by the render
    // machinery (vendor runInject passes the baked actions of the instance it created). The
    // intake arm needs them for one thing only: selecting the matter it just created on return —
    // the matter arm's selection is the principal's own click, which the store already holds.
    let deskViewActions: { selectMatter(id: string): void } | undefined
    // Shared by the matter and claim arms: create one session in the designated workspace (the
    // current session's, else the first in host workspace order — the vendor list is
    // host-ordered, not recency-ordered) — the shell's own startSession resolution; creating
    // bare pops a from-scratch picker. The intake arm does not use this: it reuses the current
    // session when one exists, a different explicit shape.
    const createSessionInDesignatedWorkspace = async (): Promise<string | undefined> => {
      const catalog = ctx.workspaces?.list.getSnapshot()
      const currentKey = ctx.uiSession?.current.value.key
      const workspaceId = catalog?.items.find(item => currentKey !== undefined && item.sessionIds.includes(String(currentKey)))?.workspaceId
        ?? catalog?.items[0]?.workspaceId
      return ctx.sessions?.create(workspaceId === undefined ? undefined : { workspaceId })
    }
    // The panel-seeded context note rides the same remote prompt channel for every arm: one
    // queued, logged user message per created session; reopening a bound session never re-seeds.
    const seedPanelMessage = (requestKind: string, sessionId: string, text: string): void => {
      const prompt = (getDeskRemote()?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
      if (prompt !== undefined) {
        void prompt({
          requestId: `${requestKind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text: `[面板] ${text}` }],
        })
      }
    }
    const processMatter = (matterId: string): void => {
      const existing = deskPath?.getSnapshot()
      if (existing !== undefined && existing.kind === 'matter' && existing.matterId === matterId) {
        ctx.uiWorkspace?.openSession(existing.sessionId)
        return
      }
      if (processLaunchInFlight) return
      const snapshot = projection?.getSnapshot()
      if (snapshot?.status !== 'ready' || snapshot.stale === true || snapshot.data === undefined) {
        reader?.refresh()
        return
      }
      const matter = snapshot.data.matters.find(item => item.id === matterId)
      if (matter === undefined) return
      processLaunchInFlight = true
      void (async () => {
        try {
          const sessionId = await createSessionInDesignatedWorkspace()
          if (sessionId === undefined) return
          // Bind before navigation so the session's first render receives this matter's
          // visual context and is not mistaken for an unrelated first-time conversation.
          if (deskPath !== undefined) {
            deskPath.set({
              ...bindProcessPath(matterId, sessionId, matter.revision),
              displayContext: { title: matter.title, summary: matter.summary },
            })
          }
          // Open through the shell's own selection action; retaining alone leaves the old
          // main-view session selected, so the principal would type into the wrong conversation.
          ctx.uiWorkspace?.openSession(sessionId)
          // The matter IS this session's context (principal decision, 2026-10-11): seed it as a
          // visible, logged message through the same panel channel — the model starts knowing
          // what it is processing instead of reconstructing intent from the filesystem. Once per
          // created session; reopening a bound session never re-seeds.
          seedPanelMessage('desk-process-context', sessionId, processingContextMessage(matter))
        } finally {
          processLaunchInFlight = false
        }
      })()
    }
    // The intake arm (spec K3's 交代首事 side): the desk's 「＋ 交代新事项」 opens a conversation in
    // which the principal says the matter, and the desk comes back once the ledger holds it —
    // selecting the new matter. The bound session is the current one (explicit, never guessed);
    // a fresh folder with no session yet gets one through the same workspace resolution
    // processMatter uses. The ids present at binding are what later tells a creation apart from
    // an update, so the projection must be readable first — otherwise the path is not bound.
    const startIntake = (): void => {
      const existing = deskPath?.getSnapshot()
      if (existing !== undefined && existing.kind === 'intake') {
        ctx.uiWorkspace?.openSession(existing.sessionId)
        return
      }
      if (processLaunchInFlight) return
      const snapshot = projection?.getSnapshot()
      const readable = snapshot?.status === 'ready' && snapshot.stale !== true && snapshot.data !== undefined
      // `missing` is the 404 the download answers when no ledger exists — that is "no matters",
      // not "unknown", so the ids at binding are honestly empty. Anything else (loading, error,
      // disconnected) is genuinely unknown: the path is then left unbound rather than bound on a
      // guess, but the door still opens — a Day-0 principal clicking 「＋ 交代新事项」 on a fresh
      // home must never meet a dead button (the loop probe caught exactly that, 2026-10-11).
      const noLedger = snapshot?.status === 'missing'
      if (!readable && !noLedger) reader?.refresh()
      const observed = readable ? new Set(snapshot.data.matters.map(matter => matter.id)) : new Set<string>()
      const binds = readable || noLedger
      processLaunchInFlight = true
      void (async () => {
        try {
          const current = ctx.uiSession?.current.value.key
          let sessionId = current === undefined ? undefined : String(current)
          if (sessionId === undefined) {
            const catalog = ctx.workspaces?.list.getSnapshot()
            const workspaceId = catalog?.items[0]?.workspaceId
            sessionId = await ctx.sessions?.create(workspaceId === undefined ? undefined : { workspaceId })
          }
          if (sessionId === undefined) return
          if (binds) deskPath?.set(bindIntakePath(sessionId, observed))
          ctx.uiWorkspace?.openSession(sessionId)
        } finally {
          processLaunchInFlight = false
        }
      })()
    }
    // The claim arm (principal direction, 2026-10-12: every desk item selects into a contextual
    // action): an unclaimed fragment opens the conversation in which the principal decides its
    // home — claim to an existing matter or entrust a new one — and the desk returns once the
    // fragment leaves the unclaimed lane and this session reads back its committed receipt.
    // Unlike the intake arm this needs the projection readable (the fragment must exist to bind),
    // and it always creates its own session — the current conversation may be the one that
    // produced the ambiguity.
    const claimFragment = (fragmentId: string): void => {
      const existing = deskPath?.getSnapshot()
      if (existing !== undefined && existing.kind === 'claim' && existing.fragmentId === fragmentId) {
        ctx.uiWorkspace?.openSession(existing.sessionId)
        return
      }
      if (processLaunchInFlight) return
      const snapshot = projection?.getSnapshot()
      if (snapshot?.status !== 'ready' || snapshot.stale === true || snapshot.data === undefined) {
        reader?.refresh()
        return
      }
      const fragment = snapshot.data.unclaimed.find(item => item.id === fragmentId)
      if (fragment === undefined) return
      processLaunchInFlight = true
      void (async () => {
        try {
          const sessionId = await createSessionInDesignatedWorkspace()
          if (sessionId === undefined) return
          deskPath?.set(bindClaimPath(fragmentId, sessionId))
          ctx.uiWorkspace?.openSession(sessionId)
          seedPanelMessage('desk-claim-context', sessionId, claimContextMessage(fragment))
        } finally {
          processLaunchInFlight = false
        }
      })()
    }
    const evaluateReturn = (): void => {
      const path = deskPath?.getSnapshot()
      const snapshot = projection?.getSnapshot()
      const data = snapshot?.data
      if (path === undefined || snapshot?.status !== 'ready' || snapshot.stale === true || data === undefined) return
      const panel = ctx.layout?.panelInfo.getSnapshot()
      const currentKey = ctx.uiSession?.current.value.key
      const status = ctx.uiSession?.sessionStatus.getSnapshot().get(path.sessionId)
      const judgeInput = {
        projection: {
          status: snapshot.status,
          ...(snapshot.stale === undefined ? {} : { stale: snapshot.stale }),
          receipts: data.receipts,
          matterIds: new Set(data.matters.map(matter => matter.id)),
          proposals: data.matters.flatMap(matter => matter.proposals.map(proposal => ({
            id: proposal.id,
            matterId: matter.id,
            status: proposal.status,
            ...(proposal.source === undefined ? {} : { sessionId: proposal.source.sessionId }),
            ...(proposal.proposedAt === undefined ? {} : { proposedAt: proposal.proposedAt }),
            ...(proposal.resolutionOperationId === undefined ? {} : { resolutionOperationId: proposal.resolutionOperationId }),
          }))),
        },
        // The client cannot observe turn settlement separately: it derives from the known
        // running state, and an unknown running state fails closed as running.
        session: { running: status?.running, turnSettled: status?.running === false, pendingInteraction: status?.pendingInteraction !== undefined },
        onPath: panel?.activePanelId === null && String(currentKey ?? '') === path.sessionId,
        // V4/V5 提醒协调 is a deferred face (the projection's reminders are an empty
        // placeholder until then) — this input stays 'synced' and flips when the reminder
        // channel lands; judgeReturn already reports the unsynced notice on its output.
        reminders: 'synced',
      } as const
      const decision = path.kind === 'matter' ? judgeReturn(path, judgeInput)
        : path.kind === 'intake' ? judgeIntakeReturn(path, judgeInput)
        : judgeClaimReturn(path, { ...judgeInput, unclaimedIds: new Set(data.unclaimed.map(item => item.id)) })
      if (decision.decision === 'return') {
        deskPath?.set(undefined)
        // The matter arm returns to a selection the store already holds; the intake and claim
        // arms have to select where the work landed — the created matter, or the one the
        // fragment was claimed into ("返回仍选 A" / the claim's answer to 「这条落在哪」).
        if (path.kind !== 'matter' && decision.matterId !== undefined) deskViewActions?.selectMatter(decision.matterId)
        ctx.layout?.selectPanel('dsh-smart-assistant-dashboard')
      }
    }
    // The settle signal the desk file's quiet-gap proxy cannot see: session-list `updatedAt`
    // bumps ONLY on user messages (vendor api-session/activity), so a settle-follow keyed to it
    // fires mid-turn and never again after the turn ends. The running→false edge of the bound
    // processing session is the real settlement signal (the same store the stop button reads):
    // pull the projection on each settle so the receipt this turn committed enters the client
    // and judgeReturn can decide the auto-return (probed red→green, desk-process-e2e, 2026-10-10).
    let settlePathKey: string | undefined
    let lastRunning: boolean | undefined
    const refreshOnSettle = (): void => {
      const path = deskPath?.getSnapshot()
      if (path === undefined) { settlePathKey = undefined; lastRunning = undefined; return }
      const key = `${path.sessionId}@${path.boundAt}`
      if (key !== settlePathKey) { settlePathKey = key; lastRunning = undefined }
      const running = ctx.uiSession?.sessionStatus.getSnapshot().get(path.sessionId)?.running
      if (running === lastRunning) return
      lastRunning = running
      if (running === false) reader?.refresh()
    }
    // Subscriptions ride the browser-only path: headless client contexts carry no `effect`
    // (the reader mount follows the same boundary).
    if (projection !== undefined) {
      ctx.effect(() => {
        const disposes: Array<(() => void) | undefined> = []
        if (deskPath !== undefined) {
          disposes.push(
            projection.subscribe(evaluateReturn),
            ctx.uiSession?.sessionStatus.subscribe(() => { refreshOnSettle(); evaluateReturn() }),
            ctx.layout?.panelInfo.subscribe(evaluateReturn),
            ctx.sessions?.list.subscribe(evaluateReturn),
          )
        }
        // Periodic desk refresh (principal ask, 2026-10-11): the ledger can move from any
        // session, and a desk left open must not go stale between conversation settles. The
        // tick skips a backgrounded page; the reader's own state machine dates the panel.
        if (reader !== undefined) {
          const timer = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') reader.refresh()
          }, 30_000)
          disposes.push(() => { clearInterval(timer) })
        }
        return () => { for (const dispose of disposes) dispose?.() }
      })
    }
    ctx.slots.inject('main', () => {
      const registration = ctx.slots.register({
        name: 'main',
        key: 'dsh-smart-assistant-dashboard',
        ...(viewStore === undefined ? {} : { store: viewStore }),
        // Positional convention from the render machinery: a session-scoped registration gets
        // `(sessionId, actions)`, a root-scoped one gets `(actions)` alone (`main` is root-scoped).
        // Take whichever argument actually carries the baked actions instead of trusting position.
        inject: (...args: unknown[]) => {
          const actions = args.find((argument): argument is { selectMatter(id: string): void } =>
            typeof argument === 'object' && argument !== null && typeof (argument as { selectMatter?: unknown }).selectMatter === 'function')
          deskViewActions = actions ?? deskViewActions
          return { hooks: projection === undefined ? {} : { projection }, refreshProjection: () => { reader?.refresh() }, onAsk: () => { ctx.layout?.selectPanel(null) }, onEntrust: startIntake, onProcess: processMatter, onClaim: claimFragment }
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
    const store = ctx.sessions?.list as { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void } | undefined
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
          reader?.refresh()
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
