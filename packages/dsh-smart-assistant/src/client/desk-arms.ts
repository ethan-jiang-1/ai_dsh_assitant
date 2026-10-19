/**
 * The desk's four conversation arms — 处理 (process), 交代 (intake), 认领 (claim), 唤醒 (wake) —
 * their one-at-a-time launch skeleton, the context notes they seed, and the return dispatch that
 * hands the desk back once a bound session's work reads back.
 *
 * One arm at a time (spec K3): the launch lock, the bound-path check and the readable-projection
 * demand live in the skeleton, not in four copies, which is what keeps the double-click negative
 * (双击发送两次) and the one-path-at-a-time rule true for every arm at once. The intake arm is the
 * deliberate outlier — it opens its door on an unreadable projection, reuses the current session,
 * and seeds nothing.
 *
 * `createDeskArms` is a factory rather than module state: the launch lock and the binding must be
 * per materialization, the same lifecycle the entry's `apply` has. The entry calls `subscribe()`
 * where it used to register the effect, so lifecycle ordering is unchanged.
 *
 * Like every module of this face it stays free of bare-runtime imports: tsdown inlines the whole
 * `src/client` tree into one classic script (see `./index.ts`).
 *
 * @module dsh-smart-assistant/client/desk-arms
 */

import { bindClaimPath, bindDiscardPath, bindIntakePath, bindProcessPath, bindWakePath, canProcess, judgeClaimReturn, judgeDiscardReturn, judgeIntakeReturn, judgeReturn, judgeWakeReturn, type DeskPath } from './desk-process'
import { claimContextMessage, discardContextMessage, processingContextMessage, resumeContextMessage, wakeContextMessage } from './desk-process-messages'
import { createSettleRefreshObserver } from './desk-process-lifecycle'
import { deskCaptureRequest, getDeskRemote, panelPromptRequest } from './room-data-io'
import type { OperatingProjection } from './operating-projection'
import type { ProjectionDownload } from './projection-reader'
import type { DeskCaptureReceipt } from './projection-view'

/** The slice of a client snapshot store the arms read: a value, a subscription, a setter. */
interface DeskArmStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
  set(value: T): void
}

/**
 * Everything the arms read from their host. Every browser service is `undefined` in a headless
 * composition and stays `undefined` here — the arms fail closed on exactly the same shapes as
 * before, so the optionality is part of the contract, not a convenience.
 */
export interface DeskArmDeps {
  /** The operating-projection snapshot store the desk reads. */
  readonly projection: DeskArmStore<ProjectionDownload> | undefined
  /** The reader that refreshes that store. */
  readonly reader: { refresh(): void } | undefined
  /** The bound desk path: in-memory by design, so a reload never replays a path. */
  readonly deskPath: DeskArmStore<DeskPath | undefined> | undefined
  /** Open one session in the shell's own selection. */
  readonly uiWorkspace: { openSession(sessionId: string): void } | undefined
  /** The current session and every session's run state. */
  readonly uiSession: {
    readonly current: { readonly value: { readonly key?: unknown } }
    readonly sessionStatus: {
      getSnapshot(): ReadonlyMap<string, { readonly running?: boolean, readonly pendingInteraction?: unknown }>
      subscribe(listener: () => void): () => void
    }
  } | undefined
  /** The main panel's identity and selection. */
  readonly layout: {
    readonly panelInfo: { getSnapshot(): { readonly activePanelId: string | null }, subscribe(listener: () => void): () => void }
    selectPanel(panelId: string | null): void
  } | undefined
  /** The workspace catalogue the session is created in. */
  readonly workspaces: {
    readonly list: { getSnapshot(): { readonly items: readonly { readonly workspaceId: string, readonly sessionIds: readonly string[] }[] } | undefined }
  } | undefined
  /** Session creation and the session list the return dispatch re-evaluates on. */
  readonly sessions: {
    create(options?: { workspaceId?: string }): Promise<string | undefined>
    readonly list: { subscribe(listener: () => void): () => void }
  } | undefined
  /** The browser lifecycle owner (the entry's `ctx.effect`), called where the effect used to be. */
  readonly effect: (install: () => () => void) => unknown
  /** The live desk view actions, set by the render machinery when it injects the main slot. */
  readonly viewActions: () => { selectMatter(id: string): void; setCaptureReceipt?(receipt: DeskCaptureReceipt | null): void } | undefined
}

/** The arm faces the entry wires into the desk's main slot, plus its subscription entry point. */
export interface DeskArms {
  /** 处理: open (or re-enter) the conversation bound to one matter. */
  processMatter(matterId: string): void
  /** 交代新事项: open the conversation in which the principal states a new matter. */
  startIntake(): void
  /** 认领: open the conversation in which an unclaimed fragment finds its home. */
  claimFragment(fragmentId: string): void
  /** 判为噪音: open the conversation in which the principal records why a fragment is dropped. */
  discardFragment(fragmentId: string): void
  /** 桌面受理位: deliver the principal's own words to the intake conversation without leaving the desk.
   *  The action lane (`先试跑`/`替我盯上`) rides the same delivery channel but carries a human
   *  label and is allowed to settle without a ledger write (261019). Resolves with the delivery
   *  session once the inbox accepts the line. */
  captureFromDesk(text: string, options?: { lane?: 'capture' | 'action', label?: string }): Promise<string | undefined>
  /** 唤醒: open the conversation that states what changed about a settled matter. */
  wakeMatter(matterId: string): void
  /**
   * Evaluate the bound path's return on every projection, session-status, layout and session-list
   * change, and keep an open desk fresh on a timer. Call once per apply, where the effect was.
   */
  subscribe(): void
}

/**
 * Build the four arms over one desk-materialization.
 * @param deps - The browser services and stores the arms read.
 * @returns The arm faces and the subscription entry point.
 */
export function createDeskArms(deps: DeskArmDeps): DeskArms {
  // Reuse-or-create (spec: 「可复用明确可用的处理 Session，否则显式创建/绑定」; the
  // double-click negative 双击发送两次: a second click must not create a second processing
  // session — 会话增殖 is the losing option 4). Same matter → re-open the bound session; a
  // launch in flight swallows further clicks until its path binds (the create is async, so
  // the bound-path check alone cannot cover the double-click window); a different matter
  // replaces the path with a fresh session.
  let launchedInFlight = false
  // Shared by the matter and claim arms: create one session in the designated workspace (the
  // current session's, else the first in host workspace order — the vendor list is
  // host-ordered, not recency-ordered) — the shell's own startSession resolution; creating
  // bare pops a from-scratch picker. The intake arm does not use this: it reuses the current
  // session when one exists, a different explicit shape.
  const createSessionInDesignatedWorkspace = async (): Promise<string | undefined> => {
    const catalog = deps.workspaces?.list.getSnapshot()
    const currentKey = deps.uiSession?.current.value.key
    const workspaceId = catalog?.items.find(item => currentKey !== undefined && item.sessionIds.includes(String(currentKey)))?.workspaceId
      ?? catalog?.items[0]?.workspaceId
    return deps.sessions?.create(workspaceId === undefined ? undefined : { workspaceId })
  }
  // The panel-seeded context note rides the same remote prompt channel for every arm: one
  // queued, logged user message per created session — and, per Q11 (confirmed 2026-10-12),
  // one resume note each time the principal re-enters a bound matter from the desk: a 处理
  // click is an explicit continuation intent whether the binding is fresh or reused.
  const seedPanelMessage = (requestKind: string, sessionId: string, text: string): void => {
    const prompt = (getDeskRemote()?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
    if (prompt !== undefined) {
      // The request shape is shared with every panel action (see panelPromptRequest); a seed is
      // fire-and-forget — nothing on the desk freezes waiting for it.
      void prompt(panelPromptRequest(requestKind, sessionId, text))
    }
  }
  // The four desk→conversation arms (spec K3 + principal-direction cards) share one launch
  // skeleton — guard the bound path, take the launch lock, demand a readable projection,
  // resolve the arm's subject, then create/steer the session, bind the path, open it, and
  // seed the context note — and differ only in the declarative parts below. The shared
  // skeleton is what keeps the double-click negative (双击发送两次) and the one-path-at-a-time
  // rule (spec K3) true for every arm at once: the launch lock lives here, not in four copies.
  // The intake arm is the deliberate outlier: it keeps opening its door when the projection
  // is unreadable (`toleratesMissing`) — a Day-0 principal clicking 「＋ 交代新事项」 on a fresh
  // home must never meet a dead button (the loop probe caught exactly that, 2026-10-11) —
  // reuses the CURRENT session when one exists, and seeds nothing: the principal's own words
  // are the context.
  const launchDeskArm = <S>(arm: {
    /** True when the currently bound path is this arm's subject re-entered. */
    reentry: (existing: DeskPath) => boolean
    /** The resume-side effect of a re-entry (only the matter arm has one — Q11). */
    reentrySeed?: (existing: DeskPath) => void
    /** The arm's subject from a readable projection; undefined = not on this desk now. */
    subject: (data: OperatingProjection) => S | undefined
    /** Open the door even when the projection is unreadable (intake only). When given, it is
     *  called for every unreadable state and decides whether the path still binds. */
    unreadableSubject?: (status: ProjectionDownload['status'] | undefined) => S
    /** How this arm obtains its session. */
    session: () => Promise<string | undefined>
    /** Bind the path, open the session, and seed the context note. */
    engage: (sessionId: string, subject: S) => void
  }): void => {
    const existing = deps.deskPath?.getSnapshot()
    if (existing !== undefined && arm.reentry(existing)) {
      deps.uiWorkspace?.openSession(existing.sessionId)
      arm.reentrySeed?.(existing)
      return
    }
    if (launchedInFlight) return
    const snapshot = deps.projection?.getSnapshot()
    const readable = snapshot?.status === 'ready' && snapshot.stale !== true && snapshot.data !== undefined
    const missing = snapshot?.status === 'missing'
    // Refresh on an unreadable projection — except for a `missing` that the arm tolerates:
    // `missing` is the 404 the download answers when no ledger exists, which is "no matters",
    // not "unknown", so a tolerating arm does not re-ask. Anything else (loading, error,
    // disconnected) is genuinely unknown: the subject arms close their door and leave the
    // path unbound rather than binding on a guess; a tolerating arm opens it unbound.
    if (!readable && !(missing === true && arm.unreadableSubject !== undefined)) deps.reader?.refresh()
    const subject = readable
      ? arm.subject(snapshot.data)
      : arm.unreadableSubject !== undefined ? arm.unreadableSubject(snapshot?.status) : undefined
    if (subject === undefined) return
    launchedInFlight = true
    void (async () => {
      try {
        const sessionId = await arm.session()
        if (sessionId === undefined) return
        arm.engage(sessionId, subject)
      } finally {
        launchedInFlight = false
      }
    })()
  }

  // The matter arm (explicit processing, K3 slice F): one bound matter + processing session.
  const processMatter = (matterId: string): void => launchDeskArm({
    reentry: path => path.kind === 'matter' && path.matterId === matterId,
    // Q11: re-entering a bound matter from the desk is a continuation intent — seed the
    // resume contract (fresh ledger read, six-category handover, then wait) so the
    // returning principal gets the package without asking. A plain sidebar open of the
    // old chat seeds nothing; only the desk's 处理 action does. The title comes from the
    // projection read (displayContext stays visual-only, never submitted to the model).
    reentrySeed: existing => {
      const matter = deps.projection?.getSnapshot().data?.matters.find(item => item.id === matterId)
      seedPanelMessage('desk-process-resume', existing.sessionId, resumeContextMessage({
        id: matterId,
        ...(matter?.title !== undefined ? { title: matter.title } : {}),
      }))
    },
    subject: data => data.matters.find(item => item.id === matterId),
    session: createSessionInDesignatedWorkspace,
    engage: (sessionId, matter) => {
      // Bind before navigation so the session's first render receives this matter's
      // visual context and is not mistaken for an unrelated first-time conversation.
      if (deps.deskPath !== undefined) {
        deps.deskPath.set({
          ...bindProcessPath(matterId, sessionId, matter.revision),
          displayContext: { title: matter.title, summary: matter.summary },
        })
      }
      // Open through the shell's own selection action; retaining alone leaves the old
      // main-view session selected, so the principal would type into the wrong conversation.
      deps.uiWorkspace?.openSession(sessionId)
      // The matter IS this session's context (principal decision, 2026-10-11): seed it as a
      // visible, logged message through the same panel channel — the model starts knowing
      // what it is processing instead of reconstructing intent from the filesystem. Once per
      // created session; re-entering from the desk later seeds the resume note (Q11, above).
      seedPanelMessage('desk-process-context', sessionId, processingContextMessage(matter))
    },
  })

  // The intake arm (spec K3's 交代首事 side): the desk's 「＋ 交代新事项」 opens a conversation in
  // which the principal says the matter, and the desk comes back once the ledger holds it —
  // selecting the new matter. The bound session is the current one (explicit, never guessed);
  // a fresh folder with no session yet gets one through the first workspace. The ids present
  // at binding are what later tells a creation apart from an update, so the path binds only
  // where those ids are honestly known: readable (the real ids) or a 404-missing ledger
  // (honestly empty) — on any other unreadable state the door opens but the path stays unbound.
  const startIntake = (): void => launchDeskArm({
    reentry: path => path.kind === 'intake',
    subject: data => ({ observed: new Set(data.matters.map(matter => matter.id)), binds: true }),
    unreadableSubject: status => ({ observed: new Set<string>(), binds: status === 'missing' }),
    session: async (): Promise<string | undefined> => {
      const current = deps.uiSession?.current.value.key
      if (current !== undefined) return String(current)
      const catalog = deps.workspaces?.list.getSnapshot()
      const workspaceId = catalog?.items[0]?.workspaceId
      return deps.sessions?.create(workspaceId === undefined ? undefined : { workspaceId })
    },
    engage: (sessionId, { observed, binds }) => {
      if (binds) deps.deskPath?.set(bindIntakePath(sessionId, observed))
      deps.uiWorkspace?.openSession(sessionId)
    },
  })

  // The claim arm (principal direction, 2026-10-12: every desk item selects into a contextual
  // action): an unclaimed fragment opens the conversation in which the principal decides its
  // home — claim to an existing matter or entrust a new one — and the desk returns once the
  // fragment leaves the unclaimed lane and this session reads back its committed receipt.
  // It always creates its own session — the current conversation may be the one that produced
  // the ambiguity.
  const claimFragment = (fragmentId: string): void => launchDeskArm({
    reentry: path => path.kind === 'claim' && path.fragmentId === fragmentId,
    subject: data => data.unclaimed.find(item => item.id === fragmentId),
    session: createSessionInDesignatedWorkspace,
    engage: (sessionId, fragment) => {
      deps.deskPath?.set(bindClaimPath(fragmentId, sessionId))
      deps.uiWorkspace?.openSession(sessionId)
      seedPanelMessage('desk-claim-context', sessionId, claimContextMessage(fragment))
    },
  })

  // The discard arm (261018 片 0): the principal pressed 「是噪音，不归户」, so the conversation
  // exists to capture the one-line reason the ledger requires — not to decide anything. It always
  // creates its own session for the same reason the claim arm does, and it settles when the
  // fragment leaves the lane with this session's own matterless committed receipt behind it.
  const discardFragment = (fragmentId: string): void => launchDeskArm({
    reentry: path => path.kind === 'discard' && path.fragmentId === fragmentId,
    subject: data => data.unclaimed.find(item => item.id === fragmentId),
    session: createSessionInDesignatedWorkspace,
    engage: (sessionId, fragment) => {
      deps.deskPath?.set(bindDiscardPath(fragmentId, sessionId))
      deps.uiWorkspace?.openSession(sessionId)
      seedPanelMessage('desk-discard-context', sessionId, discardContextMessage(fragment))
    },
  })

  // 片 1 (261018): the desk's capture row. The principal's own words go into the intake
  // conversation WITHOUT taking the desk away — the whole difference from `startIntake`, which
  // opens the session because the principal chose to go and talk there. The row remembers what it
  // delivered (a receipt), and the desk keeps showing it as in flight until the projection's
  // revision moves past the submission: acceptance by the queue is not completion (the gate
  // room-data-io learned on 2026-09-26 — a fixed delay mis-advises and leaves contradictions).
  // The receipt is a delivery fact only; the words are durable in the conversation, and the
  // ledger stays the only authority on what exists.
  // Returns the session the line was delivered into once the inbox accepts it — the watch lane
  // uses it as the reconciliation key for its pending acceptance (261019 片 4).
  const captureFromDesk = (text: string, options?: { lane?: 'capture' | 'action', label?: string }): Promise<string | undefined> => {
    const trimmed = text.trim()
    if (trimmed === '') return Promise.resolve(undefined)
    return (async () => {
      const current = deps.uiSession?.current.value.key
      const sessionId = current !== undefined ? String(current) : await createSessionInDesignatedWorkspace()
      if (sessionId === undefined) return undefined
      const prompt = (getDeskRemote()?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
      if (prompt === undefined) return undefined
      const request = deskCaptureRequest(sessionId, trimmed)
      const result = await prompt(request).catch(() => undefined) as { ok?: boolean } | undefined
      if (result?.ok === false) return undefined
      const revision = deps.projection?.getSnapshot().data?.revision ?? 0
      deps.viewActions()?.setCaptureReceipt?.({
        requestId: request.requestId, sessionId, text: trimmed, observedRevision: revision,
        ...(options?.lane !== undefined ? { lane: options.lane } : {}),
        ...(options?.label !== undefined ? { label: options.label } : {}),
      })
      return sessionId
    })()
  }

  // The wake arm (state-gated actions, card 261012): a settled matter's only legal action is
  // waking it — the conversation exists to state what changed, the model reopens explicitly,
  // and the desk returns once the matter reads back active with this session's receipt.
  // The matter must be readable AND settled: an active matter wakes nothing (its action is
  // 处理). The fault-tolerance layer: a settled matter's status gates the binding itself —
  // even a bypassed caller cannot open a 处理 path on finished work.
  const wakeMatter = (matterId: string): void => launchDeskArm({
    reentry: path => path.kind === 'wake' && path.matterId === matterId,
    subject: data => {
      const matter = data.matters.find(item => item.id === matterId)
      return matter !== undefined && !canProcess(matter.status) ? matter : undefined
    },
    session: createSessionInDesignatedWorkspace,
    engage: (sessionId, matter) => {
      const observedStatus = matter.status === 'abandoned' ? 'abandoned' as const : 'completed' as const
      deps.deskPath?.set(bindWakePath(matterId, sessionId, observedStatus))
      deps.uiWorkspace?.openSession(sessionId)
      seedPanelMessage('desk-wake-context', sessionId, wakeContextMessage({ id: matter.id, title: matter.title, status: observedStatus, summary: matter.summary }))
    },
  })

  const evaluateReturn = (): void => {
    const path = deps.deskPath?.getSnapshot()
    const snapshot = deps.projection?.getSnapshot()
    const data = snapshot?.data
    if (path === undefined || snapshot?.status !== 'ready' || snapshot.stale === true || data === undefined) return
    const panel = deps.layout?.panelInfo.getSnapshot()
    const currentKey = deps.uiSession?.current.value.key
    const status = deps.uiSession?.sessionStatus.getSnapshot().get(path.sessionId)
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
      : path.kind === 'claim' ? judgeClaimReturn(path, { ...judgeInput, unclaimedIds: new Set(data.unclaimed.map(item => item.id)) })
      : path.kind === 'discard' ? judgeDiscardReturn(path, { ...judgeInput, unclaimedIds: new Set(data.unclaimed.map(item => item.id)) })
      : judgeWakeReturn(path, { ...judgeInput, matterStatuses: new Map(data.matters.map(matter => [matter.id, matter.status])) })
    if (decision.decision === 'return') {
      deps.deskPath?.set(undefined)
      // The matter arm returns to a selection the store already holds; the intake and claim
      // arms have to select where the work landed — the created matter, or the one the
      // fragment was claimed into ("返回仍选 A" / the claim's answer to 「这条落在哪」).
      if (path.kind !== 'matter' && decision.matterId !== undefined) deps.viewActions()?.selectMatter(decision.matterId)
      deps.layout?.selectPanel('dsh-smart-assistant-dashboard')
    }
  }

  // The settle signal the desk file's quiet-gap proxy cannot see: session-list `updatedAt`
  // bumps ONLY on user messages (vendor api-session/activity), so a settle-follow keyed to it
  // fires mid-turn and never again after the turn ends. The running→false edge of the bound
  // processing session is the real settlement signal (the same store the stop button reads):
  // pull the projection on each settle so the receipt this turn committed enters the client
  // and judgeReturn can decide the auto-return (probed red→green, desk-process-e2e, 2026-10-10).
  const observeSettle = createSettleRefreshObserver(() => deps.reader?.refresh())
  const refreshOnSettle = (): void => {
    const path = deps.deskPath?.getSnapshot()
    const running = path === undefined
      ? undefined
      : deps.uiSession?.sessionStatus.getSnapshot().get(path.sessionId)?.running
    observeSettle(path, running)
  }

  return {
    processMatter,
    startIntake,
    claimFragment,
    discardFragment,
    captureFromDesk,
    wakeMatter,
    subscribe: (): void => {
      const projection = deps.projection
      // Subscriptions ride the browser-only path: headless client contexts carry no `effect`
      // (the reader mount follows the same boundary).
      if (projection === undefined) return
      deps.effect(() => {
        const disposes: Array<(() => void) | undefined> = []
        if (deps.deskPath !== undefined) {
          disposes.push(
            projection.subscribe(evaluateReturn),
            deps.uiSession?.sessionStatus.subscribe(() => { refreshOnSettle(); evaluateReturn() }),
            deps.layout?.panelInfo.subscribe(evaluateReturn),
            deps.sessions?.list.subscribe(evaluateReturn),
          )
        }
        // Periodic desk refresh (principal ask, 2026-10-11): the ledger can move from any
        // session, and a desk left open must not go stale between conversation settles. The
        // tick skips a backgrounded page; the reader's own state machine dates the panel.
        const reader = deps.reader
        if (reader !== undefined) {
          const timer = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') reader.refresh()
          }, 30_000)
          disposes.push(() => { clearInterval(timer) })
        }
        return () => { for (const dispose of disposes) dispose?.() }
      })
    },
  }
}
