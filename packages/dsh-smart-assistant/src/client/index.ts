/**
 * Browser half of the plugin, as a client-module registration script.
 *
 * Format constraint (learned the hard way, 2026-09-24, two rounds): the web shell
 * concatenates client bundles into classic-script combos. ESM import/export statements
 * are a parse error there — including the `export {};` module marker tsc synthesizes for
 * a module whose imports are all erased — and one bad statement kills every later
 * registration in the same combo. So this file is deliberately a *script*: no imports at
 * all (vendor contract types are mirrored structurally below; drift fails loudly at
 * registration), types come from `typeof import('react')` queries, and the surface is
 * submitted through the stable page-global facade `__ModuleLoader__.load` (queue mode
 * before the module system boots). Its factory receives a synchronous `require` bound to
 * the shared module table — 'react' is a baseline external every dynamic bundle may
 * request. Vendor packages emit this shape with their bundler; this hand-rolled
 * equivalent keeps the tsc-only build. scripts/checks/verify.mjs gates both the source and the
 * emitted bundle.
 *
 * @module dsh-smart-assistant/client
 */

/** Geometry the sidebar supplies to the brand-mark occupant (mirrors the sidebar contract). */
interface BrandMarkProps {
  /** Requested square edge in pixels. */
  size: number
}

/** The slots-registry surface this face uses (structural mirror of the client renderer's). */
interface SlotsRegistry {
  inject(name: string, contribute: () => unknown): unknown
  register(declaration: { name: string, [key: string]: unknown }, component: (props: never) => unknown): unknown
}

/** The browser root-context surface this face uses. */
interface ClientContext {
  slots: SlotsRegistry
  sidebarRightTabs: SidebarRightTabsRegistry
  /** The right-sidebar controller, so a page can open a room tab beside the conversation. */
  sidebarRight?: { openTab: (kind: string, options?: { params?: unknown }) => void }
  /**
   * Scoped dependency injection. The command registry is reached this way instead of
   * through the plugin's own `inject` list: the rooms must render whether or not the
   * composition carries a command surface, so the panels must not wait on it.
   */
  inject?: (deps: string[], callback: (scope: { get: (name: string) => unknown }) => void) => unknown
}

/** One client-owned command's UI behavior (mirrors the ui-commands contract). */
interface CommandActionSpec {
  readonly kind: 'action'
  /** Runs for one session; consumes the trigger token and submits nothing. */
  run(session: unknown): void
}

/** A client-owned slash-menu command (mirrors the ui-commands contract). */
interface CommandContribution {
  /** Command name without the leading slash. */
  readonly name: string
  /** Localized menu row title. */
  label?(): string
  /** Localized menu row description. */
  description?(): string
  /** Capability filter, called with a fresh projection per candidate pass. */
  available(session: unknown): boolean
  readonly ui: CommandActionSpec
}

/** The client command registry surface this face uses. */
interface CommandUiRegistry {
  register(contribution: CommandContribution): unknown
}

/**
 * The three rooms as one vocabulary. A bare `string` here let a mistyped kind compile —
 * the card's own red-proof had to simulate exactly that bug — so the union makes it
 * unrepresentable instead.
 */
type RoomKind = 'desk' | 'knowledgeRoom' | 'memoryRoom'

/** The desk room's command/dock label, shared so the two surfaces cannot drift apart. */
const DESK_LABEL = '打开我的桌面'

/**
 * Provenance shown to the principal speaks product language: repo-internal
 * seed paths are developer coordinates (the approval flow's source line is
 * the principal's surface — first-open UX card, 2026-10-01). Known internal
 * prefixes map to product words; every other source stays verbatim, because
 * workspace/external origins ARE the provenance the owner needs.
 */
function friendlySource(source: string): string {
  return source.replace(/packages\/dsh-smart-assistant\/seeds\//g, '内置基座种子页/')
}

/**
 * The rooms as discoverable commands.
 *
 * Why this exists: the first-mile walkthrough (2026-09-26) found the product had zero
 * presence in the composer's `/` and `+` menus — "what can this thing do" depended on the
 * principal guessing. These rows are the discovery surface; each opens its room beside the
 * conversation and submits nothing.
 * @param open - opens one room's right-sidebar tab by kind.
 * @returns the three contributions, in menu order.
 */
function roomCommands(open: (kind: RoomKind) => void): CommandContribution[] {
  return [
    {
      name: 'desk',
      label: () => DESK_LABEL,
      description: () => '现在要采取什么行动：等你拍板、在办的事、缺什么',
      available: () => true,
      ui: { kind: 'action', run: () => { open('desk') } },
    },
    {
      name: 'knowledge',
      label: () => '打开知识室',
      description: () => '它凭什么这样判断：知识页、出处与适用范围',
      available: () => true,
      ui: { kind: 'action', run: () => { open('knowledgeRoom') } },
    },
    {
      name: 'memory',
      label: () => '打开记忆室',
      description: () => '它把你理解成什么：记住的偏好、决定与事实',
      available: () => true,
      ui: { kind: 'action', run: () => { open('memoryRoom') } },
    },
  ]
}

/** One capsule the right sidebar's guide ("+" picker) lists; picking it opens this type. */
interface SidebarRightGuideEntry {
  readonly id: string
  /** Ascending position among every registered type's entries. */
  readonly order: number
  readonly title: () => string
  /** One line under the title; the guide drops it when crowded. */
  readonly description?: () => string
  /** Glyph drawn before the title; without one the guide draws its cube placeholder. */
  readonly icon?: (props: { size: number }) => unknown
}

/** Minimal structural mirror of the sidebar-right tab registration surface. */
interface SidebarRightTabDefinition {
  readonly id: string
  readonly kind: string
  /** Resource addresses this type claims; a kind-opened page (no address) omits it. */
  readonly patterns?: readonly string[]
  readonly priority: string
  readonly canOpen?: (address: string) => boolean
  /** The chip text captured at open time; a title-seat registration may replace it. */
  readonly title: (address: string) => string
  /** Entries on the guide page — without one the type registers but has no visible entry. */
  readonly guide?: readonly SidebarRightGuideEntry[]
}

/** The sidebar-right tab registry surface this face uses. */
interface SidebarRightTabsRegistry {
  register(definition: SidebarRightTabDefinition): unknown
}

/** Synchronous module-table require handed to a client bundle factory. */
type ClientRequire = (spec: string) => unknown

/** One client bundle's factory registration submitted through the page-global facade. */
interface ClientBundleRegistration {
  /** Package name — the registration key; must match the graph row being executed. */
  readonly id: string
  /** Closure factory; runs once at materialization and returns the plugin surface. */
  readonly factory: (require: ClientRequire) => Record<string, unknown>
}

/** Stable page-global facade the served index preloads ahead of every combo script. */
interface ModuleLoaderFacade {
  load(registration: ClientBundleRegistration): void
}

/** The deployment's sidebar identity. */
const BRAND_NAME = '智能助手'

/** Panel accent (brand teal) as a theme variable; the favicon in `src/host/web-branding.ts` keeps the
 * literal hex — favicons are fixed images and cannot resolve CSS variables. */
const MARK_TEAL = 'var(--dsha-accent)'

/**
 * Panel color contract, injected once per page. Neutral roles consume the vendor theme aliases
 * (`--dsw-alias-*`) directly; the warn and accent roles ride these `dsha-` variables because the
 * vendor amber scale has no step meeting the AA bar this package committed to on light surfaces
 * (R8: ≥4.5:1) and the teal is this assistant's own brand identity (the vendor palette has no
 * teal). Dark values reference vendor statics where one fits.
 */
function ensureThemeVars(): void {
  // Headless compositions (tests, no DOM) skip the injection: the variables only matter
  // when something renders, and the panels already treat "no document" as no-op elsewhere.
  if (typeof document === 'undefined') return
  if (document.getElementById('dsha-theme-vars') !== null) return
  const style = document.createElement('style')
  style.id = 'dsha-theme-vars'
  style.textContent = [
    'body{--dsha-warn:#92400e;--dsha-warn-tint:#fff7e6;'
      + '--dsha-accent:#0f766e;--dsha-accent-tint:#f0fdfa}',
    'body[data-ds-dark-theme]{--dsha-warn:var(--dsw-static-amber-400);'
      + '--dsha-warn-tint:var(--dsw-static-amber-900);'
      + '--dsha-accent:#2dd4bf;--dsha-accent-tint:rgba(45,212,191,0.12)}',
  ].join('')
  document.head.appendChild(style)
}

/**
 * Build the plugin surface and the brand occupants against a module-table require.
 * @param require - Synchronous module-table require; 'react' is a baseline external.
 * @returns the plugin surface plus the occupants (exposed for tests).
 */
function clientFactory(require: ClientRequire): Record<string, unknown> {
  const { createElement } = require('react') as typeof import('react')

  /**
   * Brand mark: the house from the tab favicon — teal square, white silhouette, teal door.
   * @param props - Geometry supplied by the sidebar.
   * @returns the mark element.
   */
  function AssistantBrandMark({ size }: BrandMarkProps) {
    return createElement('svg', {
      width: size,
      height: size,
      viewBox: '0 0 64 64',
      'aria-hidden': true,
    },
    createElement('rect', { width: 64, height: 64, rx: 14, fill: MARK_TEAL }),
    createElement('path', { d: 'M32 11 57 33h-8v18H15V33H7Z', fill: '#ffffff' }),
    createElement('rect', { x: 26, y: 38, width: 12, height: 13, fill: MARK_TEAL }),
    )
  }

  /**
   * Brand name: the deployment's identity, sized like the sidebar's fallback brand copy.
   * @returns the name element.
   */
  function AssistantBrandName() {
    return createElement('span', { style: { fontSize: '17px', whiteSpace: 'nowrap' } }, BRAND_NAME)
  }

  /** One desk snapshot as the assistant writes it (see the desk-refresh skill). */
  interface DeskData {
    generatedAt?: string
    counts?: { memories?: number, knowledgeStable?: number, knowledgeDraft?: number, skills?: number, threads?: number }
    threads?: { id?: string, status?: string, title?: string, why?: string, lean?: string }[]
    decisions?: {
      id?: string, question?: string, context?: string,
      /** The choices the assistant presented (written back after "看选项"); rendered as one-click answers. */
      options?: { label?: string, cost?: string, irreversible?: boolean }[] | undefined
      /** The assistant's latest word on this row, rendered as its own line. */
      reply?: string | undefined
      /**
       * `"business"` = only the principal can call it and calling it changes what happens outside;
       * anything else (including a missing field) is the assistant's own upkeep and cannot lead on
       * `kind` alone — but R4 gives the lead slot to an options-bearing decision when no business
       * one is waiting. Contract rule: at most one decision leads.
       */
      kind?: string,
      /** Optional ordering among business decisions; lower first. */
      rank?: number,
    }[]
    gaps?: { id?: string, what?: string, why?: string }[]
    actions?: {
      id?: string, what?: string, owner?: string, due?: string,
      metric?: string, stop?: string, status?: string,
      /** The assistant's outcome/seal record for this action (real files already carry it). */
      note?: string | undefined
    }[]
    recentActivity?: { at?: string, what?: string }[]
    memories?: { id?: string, kind?: string, text?: string, updated?: string, source?: string }[]
    knowledge?: { id?: string, title?: string, status?: string, type?: string, updated?: string, sources?: string[], excerpt?: string }[]
    skills?: { name?: string, description?: string, kind?: string }[]
  }

  /**
   * One desk decision as the file carries it.
   * @see DeskData.decisions for the `kind` rule that keeps upkeep off the lead card.
   */
  type DeskDecision = NonNullable<DeskData['decisions']>[number]

  /**
   * Per-session desk state (R11, graduated 2026-09-29): the row-scoped facts — data, pending,
   * receipt, stalled, readError — belong to the session whose workspace produced them. The FLAT
   * fields are the primary slice: the session the newest-five walk last answered (recorded in
   * `sourceSession`). `bySession` carries one slice per additional tab-bound session, so two tabs
   * bound to different sessions no longer freeze each other's same-id rows, stamp receipts across
   * sessions, or invalidate each other's loads (the pre-slice store was one shared object with
   * bare-rowId matching and ONE global load sequence — a session A action froze session B's row,
   * and two mounted tabs re-fired each other's reloads forever).
   */
  interface DeskSlice {
    data?: DeskData | undefined
    source?: string | undefined
    /** A corrupt desk file from the bound session (A5): the tab shows the error and a retry, not "reading…". */
    readError?: string | undefined
    /** The action in flight: which row, when it left, what it was. The DATA GATE — buttons stay
     *  frozen until the desk file is rewritten past `at`. The prompt promise resolving only means
     *  the queue accepted the message; the assistant then works for tens of seconds, and a freeze
     *  that lifts at acceptance invites repeat clicks (real use queued one decision three times
     *  and left an action with seven contradictory orders — reviews, 2026-09-26). */
    pending?: { rowId: string, at: number, action: string } | undefined
    /** Receipt of the last action the desk file confirmed, shown on its row. */
    lastReceipt?: { rowId: string, action: string, at: number } | undefined
    /** An action that left but whose desk rewrite never arrived (the poller gave up). Rendered on
     *  its row as a durable, honest state — clearing it silently would read as "done" (R1). */
    stalled?: { rowId: string, at: number, action: string } | undefined
    /** The bound session's own conversation clock, so a tab can say when it lags (A2). */
    sessionUpdatedAt?: number | undefined
    /** This slice's load sequence; unused on the primary (which owns the module-level counter). */
    seq?: number | undefined
  }

  /**
   * Shared desk state: one loader, three panels. The panels are separate sidebar entries, so
   * they must not each re-fetch; the store is the single owner and notifies its subscribers.
   */
  const deskStore: DeskSlice & {
    note?: string | undefined
    /** The Session whose workspace answered the last walk — the flat fields above belong to it. */
    sourceSession?: string | undefined
    /** A count that could not open its panel (R9): the cell used to swallow the throw and stay
     *  clickable, so the principal saw an underlined number that did nothing. */
    jumpError?: string | undefined
    /** The desk tab could not be opened (R9): visible on the chip, which is where the click was. */
    openError?: string | undefined
    /** The desk's draft pointer just sent the principal over (S4): highlight and scroll to the drafts. */
    focusKnowledge?: 'drafts' | undefined
    /** Sessions whose workspace is known to have no desk file (moved onto the store: testable). */
    misses: Set<string>
    /** One slice per tab-bound session that is not the primary (R11). */
    bySession: Record<string, DeskSlice>
    /** Sessions with a mounted tab — the follow-the-conversation reload refreshes each of these. */
    boundSessions: Set<string>
    listeners: Set<() => void>
  } = { listeners: new Set(), misses: new Set<string>(), bySession: {}, boundSessions: new Set<string>() }

  /**
   * The slice a surface reads: the flat fields for the primary session (or the walk view —
   * `undefined`), a per-session slice for a tab bound to another session. While no session owns
   * the flat fields yet (`sourceSession` unset), the first targeted load claims them — the
   * loadDeskFor success path sets `sourceSession`, so an owned flat never serves a stranger.
   */
  function deskSlice(sessionId: string | undefined): DeskSlice {
    if (sessionId === undefined || deskStore.sourceSession === undefined || sessionId === deskStore.sourceSession) return deskStore
    if (deskStore.bySession[sessionId] === undefined) deskStore.bySession[sessionId] = {}
    return deskStore.bySession[sessionId]
  }

  const patchDesk = (next: Partial<typeof deskStore>): void => {
    Object.assign(deskStore, next)
    for (const listener of [...deskStore.listeners]) listener()
  }

  /** Patch one session's slice (the flat object is the primary session's slice). */
  const patchSlice = (slice: DeskSlice, next: Partial<DeskSlice>): void => {
    Object.assign(slice, next)
    for (const listener of [...deskStore.listeners]) listener()
  }

  /**
   * Monotonic load sequence per slice: a newer load invalidates every older attempt of the SAME
   * slice only. The pre-slice single counter made a load for one session cancel an in-flight read
   * for another (two mounted tabs then re-fired each other forever — the R11 reload ping-pong).
   */
  let deskLoadSeq = 0
  const sliceSeq = (slice: DeskSlice): { current: () => number, next: () => number } => {
    if (slice === (deskStore as DeskSlice)) {
      return { current: () => deskLoadSeq, next: () => ++deskLoadSeq }
    }
    return { current: () => slice.seq ?? 0, next: () => (slice.seq = (slice.seq ?? 0) + 1) }
  }

  /**
   * When the walk re-homes the flat fields to a different session, the row-scoped facts still
   * belong to the OLD owner: carry them into that session's OWN slice (`bySession[previous]` —
   * resolved EXPLICITLY, because at call time `sourceSession` still names the previous owner, so
   * `deskSlice(previous)` would return the flat itself and hand the row state right back to the
   * slice being re-homed; acceptance round 3, 2026-09-29, caught the walk path doing exactly
   * that — the new owner's settle then consumed the old owner's pending as its own).
   */
  function carryRowStateTo(previous: string, next: string): void {
    if (previous === next) return
    const carry: Partial<DeskSlice> = {}
    for (const key of ['pending', 'lastReceipt', 'stalled', 'readError'] as const) {
      if (deskStore[key] !== undefined) {
        (carry as Record<string, unknown>)[key] = deskStore[key]
        patchDesk({ [key]: undefined } as Partial<typeof deskStore>)
      }
    }
    if (Object.keys(carry).length > 0) {
      if (deskStore.bySession[previous] === undefined) deskStore.bySession[previous] = {}
      Object.assign(deskStore.bySession[previous], carry)
    }
  }

  /**
   * Read `.desk/state.json` for the newest Session that has one. The file is per-workspace, so
   * walk the recent Sessions and say which workspace answered — a silent miss reads as breakage.
   */
  function loadDesk(): void {
    const read = (deskRemote?.['workspaceFiles'] as {
      read?: (sessionId: string, path: string, options: unknown) => Promise<unknown>
    } | undefined)?.read
    const store = deskSessions?.list
    if (read === undefined) {
      patchDesk({ note: 'remote.workspaceFiles did not materialize' })
      return
    }
    if (store === undefined) {
      patchDesk({ note: 'the client Session store is not available' })
      return
    }
    const state = store.getSnapshot() as {
      ids?: string[]
      byId?: Record<string, { updatedAt?: number, cwd?: string }>
    }
    const ids = state?.ids ?? []
    const byId = state?.byId ?? {}
    const ordered = ids
      .slice()
      .sort((left, right) => Number(byId[right]?.updatedAt ?? 0) - Number(byId[left]?.updatedAt ?? 0))
      .slice(0, 5)
    if (ordered.length === 0) {
      patchDesk({ note: '还没有会话——先和助手说句话，再点刷新桌面' })
      return
    }
    const newest = ids.reduce((max, id) => Math.max(max, Number(byId[id]?.updatedAt ?? 0)), 0)
    patchDesk({ sessionUpdatedAt: newest === 0 ? undefined : newest })
    const seq = ++deskLoadSeq
    // R6 (self-review, 2026-09-27): "the read threw" and "the file is absent" are different facts.
    // The walk deliberately falls through on a failed read (A4: an older session's desk must never
    // be presented as the present one), but when EVERY attempt threw, claiming the file does not
    // exist is a lie the principal cannot see through.
    let readFailures = 0
    const attempt = async (index: number): Promise<void> => {
      if (seq !== deskLoadSeq) return
      if (index >= ordered.length) {
        if (readFailures > 0) {
          patchDesk({ readError: `读桌面文件失败（${readFailures} 个工作区都读不到）——点「刷新桌面」重试`, note: undefined })
          return
        }
        patchDesk({ note: '最近 5 个会话的工作区里都没有 .desk/state.json——点「刷新桌面」让助手写一份' })
        return
      }
      const sessionId = ordered[index] as string
      // Only the READ may fall through to the next session (the file is simply absent). A file
      // that is PRESENT but corrupt must stop and say so: silently rendering an older session's
      // desk as the present is exactly how a CEO gets lied to (A4).
      let text: string | undefined
      try {
        const result = await read(sessionId, '.desk/state.json', {})
        if (seq !== deskLoadSeq) return
        const wrapped = result as { ok?: boolean, value?: { text?: string } }
        text = wrapped?.ok === false ? undefined : wrapped?.value?.text
      } catch {
        if (seq === deskLoadSeq) {
          readFailures += 1
          await attempt(index + 1)
        }
        return
      }
      if (typeof text !== 'string' || text.trim() === '') {
        if (seq === deskLoadSeq) await attempt(index + 1)
        return
      }
      let parsed: DeskData
      try {
        parsed = JSON.parse(text) as DeskData
      } catch {
        if (seq === deskLoadSeq) {
          patchDesk({ note: `桌面文件损坏（${byId[sessionId]?.cwd ?? sessionId}）——点「刷新桌面」让助手重写一份` })
        }
        return
      }
      if (!looksLikeDesk(parsed)) {
        // A file that parses but carries none of the contract's shape would render as a legitimately
        // empty desk: every section shows its honest "（没有…）" and the principal reads "nothing is
        // happening" while the assistant believes it just refreshed him.
        carryRowStateTo(deskStore.sourceSession ?? sessionId, sessionId)
        patchDesk({
          data: undefined,
          readError: '这份桌面文件不像 desk-refresh 写的（没有 generatedAt、也没有任何分区）——点「刷新桌面」让助手按契约重写',
          source: byId[sessionId]?.cwd ?? '', sourceSession: sessionId, jumpError: undefined,
        })
        return
      }
      // Re-homing the walk view: the flat fields become this session's, and the previous owner's
      // row state rides into its own slice (R11).
      carryRowStateTo(deskStore.sourceSession ?? sessionId, sessionId)
      patchDesk({ data: parsed, note: undefined, source: byId[sessionId]?.cwd ?? '', sourceSession: sessionId, readError: undefined, jumpError: undefined })
      deskStore.misses.delete(sessionId)
      settlePending(parsed.generatedAt, sessionId)
      retireStaleReceipt(parsed, sessionId)
    }
    void attempt(0)
  }

  /**
   * The per-session fields of a slice. A merge must set each of these EXPLICITLY from the slice:
   * a plain `{ ...deskStore, ...slice }` leaves the flat values in place for keys the slice does
   * not carry, which is exactly the cross-session leak the slices exist to prevent (R11).
   */
  const DESK_SLICE_KEYS = ['data', 'source', 'readError', 'pending', 'lastReceipt', 'stalled', 'sessionUpdatedAt'] as const

  /** The view one surface reads: the shared fields plus one session's slice, slice keys explicit. */
  function mergeDeskSlice(sessionId?: string): typeof deskStore {
    const slice = deskSlice(sessionId)
    const merged: Record<string, unknown> = { ...deskStore }
    for (const key of DESK_SLICE_KEYS) merged[key] = slice[key]
    return merged as unknown as typeof deskStore
  }

  /**
   * Subscribe one surface to the desk store. `undefined` follows the walk view (the primary
   * slice); a tab passes its own session and reads that session's slice merged over the shared
   * fields (R11).
   */
  function useDesk(sessionId?: string): typeof deskStore {
    const { useEffect, useState } = require('react') as typeof import('react')
    const [snapshot, setSnapshot] = useState(mergeDeskSlice(sessionId))
    useEffect(() => {
      const update = (): void => setSnapshot(mergeDeskSlice(sessionId))
      deskStore.listeners.add(update)
      update()
      return () => { deskStore.listeners.delete(update) }
    }, [sessionId])
    return snapshot
  }

  /** The desk file's generation time in ms, or undefined when missing or unparseable. */
  function deskGeneratedAtMs(data: DeskData | undefined): number | undefined {
    const raw = data?.generatedAt
    if (raw === undefined) return undefined
    const parsed = new Date(raw).getTime()
    return Number.isNaN(parsed) ? undefined : parsed
  }

  /**
   * The DATA GATE: an action is in flight until the desk file is rewritten past the moment it was
   * sent. @see deskStore.pending for why the promise resolving must not lift this.
   */
  function pendingInFlight(store: typeof deskStore): boolean {
    const pending = store.pending
    if (pending === undefined) return false
    const generated = deskGeneratedAtMs(store.data)
    return generated === undefined || generated <= pending.at
  }

  /**
   * Release the data gate when the poller gives up waiting for the assistant to rewrite the desk
   * file. Leaving `pending` set froze every action button in all three rooms behind a "正在处理"
   * that never ended, while the escape hatch (刷新桌面) was disabled by that same flag — the live
   * desk was 13 h stale in exactly that state (self-review R1, 2026-09-27). Expiry is honest: the
   * action was sent and is not revoked; only the "still working" claim stops.
   */
  function expirePending(sessionId?: string): void {
    const slice = deskSlice(sessionId)
    const pending = slice.pending
    patchSlice(slice, {
      pending: undefined,
      // The row keeps an honest, durable state: the action DID leave, the desk just has not caught
      // up. A transient note would be wiped by the next successful load (verified live: the note
      // was gone by the time the release was captured), and silence would read as "done".
      stalled: pending === undefined ? undefined : { ...pending },
    })
    patchDesk({ note: '它还没重写桌面——点「刷新桌面」再试一次（动作已发出，不会被撤销）' })
  }

  /**
   * A receipt claims "the principal answered this row". When a load comes back still carrying that row
   * unanswered, the claim is stale — the assistant re-opened it, or the answer never landed — and the
   * row was stuck read-only until a reload (R11, narrow review 2026-09-27). Retiring it lets the
   * principal answer again. Scoped to decisions, where the false 已回答 was observed.
   * @param data - the file just parsed, if any.
   */
  function retireStaleReceipt(data: DeskData | undefined, sessionId?: string): void {
    const slice = deskSlice(sessionId)
    const receipt = slice.lastReceipt
    if (receipt === undefined || data === undefined) return
    const stillOpen = (data.decisions ?? [])
      .some(item => String(item.id ?? item.question) === receipt.rowId)
    if (stillOpen) patchSlice(slice, { lastReceipt: undefined })
  }

  /**
   * Does this JSON look like a desk file at all?
   *
   * Why (2026-09-27, from the friction report on real sessions): panel messages name the
   * `desk-refresh` skill, the model rewrites the file, but in 5 of 7 real panel actions it never
   * LOADED the skill — it improvised from memory. A file that parses but carries none of the
   * contract's shape then renders as a legitimately empty desk: every section shows its honest
   * "（没有…）" empty text and the principal reads "nothing is happening" while the assistant thinks
   * it just refreshed him. That is the "a stale or invented list is worse than none" case the skill
   * itself warns about, so the panel says what it can actually see.
   * @param parsed - the JSON just parsed.
   * @returns true when the file carries the contract's mandatory `generatedAt` or a known section.
   */
  function looksLikeDesk(parsed: DeskData): boolean {
    if (typeof parsed.generatedAt === 'string' && parsed.generatedAt.trim() !== '') return true
    // The nine the contract owns (`desk-refresh/SKILL.md` §Shape): counts, decisions, actions, gaps,
    // threads, recentActivity, memories, knowledge, skills.
    const sections = [parsed.decisions, parsed.actions, parsed.gaps, parsed.threads, parsed.recentActivity,
      parsed.memories, parsed.knowledge, parsed.skills]
    if (sections.some(section => Array.isArray(section) && section.length > 0)) return true
    return parsed.counts !== undefined && typeof parsed.counts === 'object' && parsed.counts !== null
  }

  /** A finished load settles the pending action: the file moving past `at` is the completion
   *  signal — on the slice of the session whose file moved (R11: another session's file moving
   *  past the send must not settle this one's rows). */
  function settlePending(generatedAt: string | undefined, sessionId?: string): void {
    const generated = deskGeneratedAtMs({ generatedAt } as DeskData)
    if (generated === undefined) return
    const slice = deskSlice(sessionId)
    const pending = slice.pending
    if (pending !== undefined && generated > pending.at) {
      patchSlice(slice, { pending: undefined, stalled: undefined, lastReceipt: { rowId: pending.rowId, action: pending.action, at: Date.now() } })
      return
    }
    // A stalled row is settled by the same signal: the file moving past its send.
    const stalled = slice.stalled
    if (stalled !== undefined && generated > stalled.at) {
      patchSlice(slice, { stalled: undefined, lastReceipt: { rowId: stalled.rowId, action: stalled.action, at: Date.now() } })
    }
  }

  /** The newest Session, which every panel action drives. */
  function newestSessionId(): string | undefined {
    const state = deskSessions?.list?.getSnapshot() as { ids?: string[], byId?: Record<string, { updatedAt?: number }> } | undefined
    const ids = state?.ids ?? []
    const byId = state?.byId ?? {}
    return ids.slice().sort((left, right) => Number(byId[right]?.updatedAt ?? 0) - Number(byId[left]?.updatedAt ?? 0))[0]
  }

  /**
   * Put one line to the assistant in the newest Session. Every panel action rides this — the
   * panel is a control surface for the same conversation the principal is having.
   *
   * The action is tracked as `pending` on its row and stays frozen behind the DATA GATE until the
   * desk file is rewritten past the send: acceptance by the queue is not completion (the assistant
   * then works for tens of seconds), and this poller keeps re-reading until the file actually
   * moves — a single fixed delay reliably re-reads a stale file, mis-advises "click refresh", and
   * left an action with seven contradictory orders (2026-09-26).
   * @param text - the line to send.
   * @param action - the action name shown on the receipt line.
   * @param rowId - the row this action belongs to (receipts and freezing are row-scoped).
   */
  function sendPrompt(text: string, action: string, rowId: string, sessionId?: string): void {
    const prompt = (deskRemote?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
    // A tab bound to session X passes X explicitly: a correction typed beside one conversation
    // that lands in another would read as the assistant ignoring what was just pointed at. The
    // old global `sendSession` slot made the LAST mounted tab steal every send (R11); the target
    // is now a per-surface argument with the newest session as the walk-view fallback.
    const target = sessionId ?? newestSessionId()
    if (target === undefined) {
      patchDesk({ note: '还没有会话——先和助手说句话' })
      return
    }
    if (prompt === undefined) {
      patchDesk({ note: 'remote.session did not materialize' })
      return
    }
    const slice = deskSlice(target)
    // `stalled` is deliberately NOT cleared here: it is an earlier action's unconfirmed trace, and
    // only the desk file moving past its `at` may retire it (R11, narrow review 2026-09-27).
    patchSlice(slice, { pending: { rowId, at: Date.now(), action }, lastReceipt: undefined })
    // A10: panel messages carry a marker so the conversation log (and the usage meter) can tell
    // machine-written prompts from the principal's own words — otherwise the principal's history
    // fills with assertions they never typed, and the meter counts the panel as the human.
    const marked = `[桌面] ${text}`
    void prompt({
      requestId: `desk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: target,
      mode: 'queue',
      content: [{ type: 'text', text: marked }],
    }).then((result: unknown) => {
      const wrapped = result as { ok?: boolean, error?: { message?: string } }
      if (wrapped?.ok === false) {
        patchSlice(slice, { pending: undefined })
        patchDesk({ note: wrapped.error?.message ?? 'prompt failed' })
      }
    }).catch((reason: unknown) => {
      patchSlice(slice, { pending: undefined })
      patchDesk({ note: String(reason) })
    })
    let tries = 0
    let lastGenerated: number | undefined
    const tick = (): void => {
      if (deskSlice(target).pending === undefined) return
      const generated = deskGeneratedAtMs(deskSlice(target).data)
      if (generated !== undefined && generated !== lastGenerated) {
        // The desk moved since the last look — the assistant is visibly working the queue.
        // Progress resets the budget: approval turns (promote + desk-refresh) run 60–90s each
        // and queue behind each other, so the fixed 150s budget expired mid-queue and pushed
        // manual refreshes onto the principal (CEO first-reading friction #1, 2026-10-04).
        tries = 0
      }
      lastGenerated = generated
      if (tries >= 15) {
        // Giving up releases the gate (see expirePending): a frozen surface whose escape hatch is
        // disabled by the same flag has no way out at all.
        expirePending(target)
        return
      }
      tries += 1
      reloadDesk(target)
      setTimeout(tick, 10_000)
    }
    setTimeout(tick, 10_000)
  }

  /**
   * Every desk action ends the same way: the desk-refresh skill owns the rewrite. Naming the
   * skill in the message makes the model's path explicit instead of hoping skill discovery fires
   * on a small model (measured 2026-09-26: cold discovery skipped the skill on 2 of 3 live runs).
   * The panel and the skill ship together; the pairing is recorded on the campaign card §四·十九.
   */
  const DESK_REFRESH_STEP = '完成后加载 desk-refresh 技能，把桌面文件重写一遍。'

  /** Ask the assistant to refresh the desk file; the poller re-reads until it actually moves. */
  function askRefresh(sessionId?: string): void {
    sendPrompt('刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。', '刷新桌面', 'desk', sessionId)
  }

  /**
   * Day-0's true start (real-user walk finding, 2026-10-06): on a desk-less folder the
   * refresh button produced an honest zero-report loop with no meaning — the principal
   * clicked it three times "not knowing what I'm doing". The empty desk's next step is the
   * first conversation, not a refresh; this invites that conversation in this session (on a
   * fresh folder the first-conversation skill takes it from here).
   */
  function askStart(sessionId?: string): void {
    sendPrompt('开始第一件事：从最近要我拍板、还要跟进的一件事说起。', '开始第一件事', 'desk', sessionId)
  }

  /**
   * Inline skill-proposal approval (B2, 2026-10-06): the click IS the approval — the prompt
   * asks the assistant to edit the proposal file's status to approved and then land_skill it
   * in the same turn. Same one-click shape as the knowledge draft's 批准 button, so every
   * review queue on the principal's surface is in-place, not a separate chore.
   */
  function askApproveProposal(name: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人批准技能提案「${name}」：请把提案文件的 status 改为 approved，然后立刻 land_skill 落地。${DESK_REFRESH_STEP}`,
      '批准提案', name, sessionId,
    )
  }

  /** The rejection twin: the proposal is rejected with the principal's one-line reason. */
  function askRejectProposal(name: string, reason: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人拒绝技能提案「${name}」：请把提案文件的 status 改为 rejected（理由：${reason}）。${DESK_REFRESH_STEP}`,
      '拒绝提案', name, sessionId,
    )
  }

  /**
   * Answer one open decision. The mirror of a correction: there the principal says a record is
   * wrong, here they say what they have decided — and the assistant records the call and moves.
   */
  function answerDecision(question: string, answer: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人拍板——待决事项「${question}」的决定：${answer}。请把决定记入记忆并据此更新判断。${DESK_REFRESH_STEP}`,
      '回答', rowId, sessionId,
    )
  }

  /** Put one open decision to the assistant and ask for options with their costs. */
  function askAboutDecision(question: string, rowId: string, sessionId?: string): void {
    sendPrompt(`桌面面板代本人提问——待决事项「${question}」：请给两三个选项，每个选项的代价与不可逆程度，以及你的建议。`,
      '看选项', rowId, sessionId)
  }

  /**
   * Close one action: the principal reports it is done, and the assistant records the outcome
   * rather than leaving a finished item sitting in flight.
   */
  /**
   * Hand the missing reading to the assistant in place (R5, self-review 2026-09-27): the gap row
   * used to be inert text, so the one thing only the principal could supply had no way to reach him
   * except back through the conversation.
   * @param what - the gap's headline, so the assistant knows which entry is being filled.
   * @param value - the reading the principal typed.
   * @param rowId - the row the receipt lands on.
   */
  function fillGap(what: string, value: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人补数——缺口「${what}」的原始读数：${value}。请据此更新相关记录，并把这条从 gaps 里拿掉（或写明还缺什么）。${DESK_REFRESH_STEP}`,
      '补上', rowId, sessionId,
    )
  }

  function finishAction(what: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人回执——行动「${what}」已经办完了。请记录结果（度量上发生了什么）。${DESK_REFRESH_STEP}`,
      '办完了', rowId, sessionId,
    )
  }

  /** Drop one action: no longer worth doing — the assistant records why and takes it off the list. */
  function dropAction(what: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人回执——行动「${what}」决定不办了：请记一行原因（写进在跟的事或记忆）。${DESK_REFRESH_STEP}`,
      '不办了', rowId, sessionId,
    )
  }

  /**
   * Park one thread: still valid, not now. The research room's middle exit, offered where the
   * principal sees the thread rather than only in chat.
   */
  function parkThread(title: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人操作——在跟的事「${title}」先放一放（park）：现在不推，但别丢。${DESK_REFRESH_STEP}`,
      '先放放', rowId, sessionId,
    )
  }

  /** Close one thread: answered, moot, or not worth it — the assistant promotes or drops it. */
  function closeThread(title: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `桌面面板代本人操作——在跟的事「${title}」可以收了：请判断该 promote（变成记忆/知识页/技能）还是 drop（写一行原因），`
      + `做完告诉我你归到了哪里。${DESK_REFRESH_STEP}`,
      '收了', rowId, sessionId,
    )
  }

  /**
   * Correct one memory record. This is the cultivation loop: the principal says which line is
   * wrong and what is right, and the assistant rewrites the record and refreshes the desk.
   */
  function correctMemory(text: string, correction: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `请更正这条记忆。原记录：「${text}」。正确的是：${correction}。${DESK_REFRESH_STEP}`,
      '更正', rowId, sessionId,
    )
  }

  /**
   * Approve one draft knowledge page. The counterpart of a correction: the principal says the page
   * is right, and the assistant promotes it so it starts counting in retrieval and the digest.
   *
   * Direct-call lane (approve-direct-call): the click IS the approval, so the flip goes straight
   * to the host service — seconds, not a model round trip — and the service writes the audit
   * record. Needs the session id (the audit lands in that session's log); without one, or before
   * the remote namespace mounts (first boot after install), it falls back to the legacy prompt
   * path, which is honest degradation rather than a silently lost approval.
   */
  function approveKnowledgePage(title: string, rowId: string, sessionId?: string): void {
    const namespace = deskRemote?.assistantKnowledge as { approvePage?: (request: unknown) => Promise<unknown> } | undefined
    if (typeof namespace?.approvePage === 'function' && sessionId !== undefined) {
      void namespace.approvePage({ pageId: rowId, sessionId, title }).then((result: unknown) => {
        const outcome = result as { ok?: boolean, error?: { message?: string } }
        if (outcome?.ok === false) {
          patchDesk({ note: outcome.error?.message ?? '批准未生效' })
        }
      }).catch((reason: unknown) => {
        patchDesk({ note: `直调批准失败，回退指令通道：${String(reason)}` })
        sendPrompt(
          `桌面面板代本人批准——知识页「${title}」已获批准：请把它从 draft 翻成 stable。${DESK_REFRESH_STEP}`,
          '批准', rowId, sessionId,
        )
      })
      return
    }
    sendPrompt(
      `桌面面板代本人批准——知识页「${title}」已获批准：请把它从 draft 翻成 stable。${DESK_REFRESH_STEP}`,
      '批准', rowId, sessionId,
    )
  }

  /**
   * Mark one stable knowledge page past its use-by date. The page stays in place (links resolve)
   * but stops counting as current — the third lifecycle step beside approval and correction.
   */
  function deprecateKnowledgePage(title: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `知识页「${title}」过时了，请把它标记为 deprecated（保留在原处以便链接解析）。${DESK_REFRESH_STEP}`,
      '过时了', rowId, sessionId,
    )
  }

  /** Tell the assistant what is wrong with one knowledge page. */
  function flagKnowledgePage(title: string, problem: string, rowId: string, sessionId?: string): void {
    sendPrompt(
      `知识页「${title}」有问题：${problem}。请核对并更正这一页。${DESK_REFRESH_STEP}`,
      '提意见', rowId, sessionId,
    )
  }

  /**
   * One row the principal can correct in place: the content, a small action, and — once opened —
   * an input plus send. Inline on purpose: pointing at the wrong line and typing the fix is one
   * gesture, which is what "cultivating the assistant" actually costs.
   */
  /**
   * Minimal inline markdown for principal-facing text: the live desk rendered `**已消解**` with the
   * asterisks visible (self-review R7, 2026-09-27). Only bold and inline code are recognised —
   * anything else stays verbatim, because guessing at the model's formatting is worse than showing it.
   * @param text - the raw string.
   * @returns the alternating text/element sequence React can render.
   */
  function inlineMarkdown(text: string): (string | ReturnType<typeof createElement>)[] {
    const parts: (string | ReturnType<typeof createElement>)[] = []
    const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g
    let last = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index))
      parts.push(match[1] === undefined
        ? createElement('code', { key: `c${match.index}`, style: { fontSize: '11px' } }, match[2] ?? '')
        : createElement('strong', { key: `b${match.index}` }, match[1]))
      last = match.index + match[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts
  }

  /**
   * Long free text clamps to a few lines with a one-click expander. Measured on the live desk: one
   * thread's `lean` rendered 345 px tall — 35% of the 530 px pane — and pushed the rest of the room
   * off-screen (self-review R7, 2026-09-27). Clamping, never deleting: every word stays one click away.
   * @param props - the text, the clamp height, and the style of the containing line.
   * @returns the clamped line with its expander when the text is long.
   */
  function ClampedText({ text, maxLines = 3, style }: {
    text: string
    maxLines?: number
    style?: Record<string, unknown>
  }): ReturnType<typeof createElement> {
    const { useState } = require('react') as typeof import('react')
    const [open, setOpen] = useState(false)
    if (text.length <= 220) return createElement('div', { style }, ...inlineMarkdown(text))
    return createElement('div', { style },
      createElement('div', {
        style: {
          overflowWrap: 'anywhere',
          ...(open
            ? {}
            : { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
        },
      }, ...inlineMarkdown(text)),
      createElement('button', {
        onClick: () => { setOpen(!open) },
        style: {
          marginTop: '2px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
          border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
        },
      }, open ? '收起' : '展开全部'))
  }

  function CorrectableRow(props: {
    primary: ReturnType<typeof createElement> | string
    meta?: string | undefined
    /** Content excerpt shown under the title — the approval card's answer to blind approval (CEO friction #2). */
    excerpt?: string | undefined
    actionLabel: string
    placeholder: string
    onSubmit: (text: string) => void
    actions?: { label: string, run: () => void, destructive?: boolean }[] | undefined
    source?: string | undefined
    /** Lead variant: the one item the desk points at first, rendered larger. */
    lead?: boolean
    /** This row's identity: the in-flight receipt and the settled receipt land on the row acted on. */
    rowId?: string | undefined
    /** Read-only: the row was acted on and its question is settled — no buttons, no input. */
    readOnly?: boolean
    /** The session this row's desk belongs to: the freeze, receipt and stall scoping (R11). */
    deskSession?: string | undefined
  }): ReturnType<typeof createElement> {
    const { useState } = require('react') as typeof import('react')
    const store = useDesk(props.deskSession)
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [armed, setArmed] = useState<string | undefined>(undefined)
    const [openSource, setOpenSource] = useState(false)
    // The DATA GATE: buttons freeze until the desk file is rewritten past the send — not until the
    // queue accepts it (acceptance is milliseconds; the work is tens of seconds. Real use queued a
    // decision three times and left an action with seven contradictory orders).
    const frozen = pendingInFlight(store)
    const inflight = store.pending?.rowId === props.rowId && store.pending !== undefined && frozen
    const receipt = store.lastReceipt?.rowId === props.rowId ? store.lastReceipt : undefined
    const stalled = store.stalled?.rowId === props.rowId ? store.stalled : undefined
    const submit = (): void => {
      const value = text.trim()
      if (value === '') return
      props.onSubmit(value)
      setText('')
      setOpen(false)
    }
    // Provenance is the trust line: where a claim came from is what lets the principal judge it —
    // and for a record they corrected, the source is the cultivation trace itself.
    const source = props.source === undefined || props.source.trim() === '' ? undefined : props.source.trim()
    // Hierarchy (P2, 2026-09-26): the actions ride the row's first line, right-aligned, with the
    // detail lines flowing underneath them. The narrow-pane measurement showed 6–9 lines per row
    // and the buttons at the very bottom, so acting meant reading the audit trail first. One
    // change here covers every row type that shares this component.
    const controls = createElement('div', {
      style: {
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
        flexWrap: 'wrap', justifyContent: 'flex-end',
      },
    },
    props.meta === undefined || props.meta === '' ? null : createElement('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, props.meta),
    ...(props.actions ?? []).map(action => {
          // A destructive move asks twice: one click arms it for three seconds ("确认…？"), the
          // second click sends. The record itself is recoverable (history/archives), and the
          // confirm label says so — reversibility the principal can see.
          const fire = (): void => {
            if (action.destructive === true && armed !== action.label) {
              setArmed(action.label)
              // Five seconds, not three: these are 18px buttons and a Chinese principal may be
              // mid-IME when the confirm appears (R3, self-review 2026-09-27).
              setTimeout(() => { setArmed(current => current === action.label ? undefined : current) }, 5000)
              return
            }
            action.run()
          }
          const label = armed === action.label ? `确认${action.label}？（可恢复）` : action.label
          return createElement('button', {
            key: action.label,
            onClick: fire,
            disabled: frozen,
            style: {
              padding: '4px 8px', fontSize: '12px',
              cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
              border: `1px solid ${armed === action.label ? 'var(--dsha-warn)' : MARK_TEAL}`,
              borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: armed === action.label ? 'var(--dsha-warn)' : MARK_TEAL,
            },
          }, label)
        }),
        createElement('button', {
          onClick: () => { setOpen(!open) },
          disabled: frozen,
          style: {
            padding: '4px 8px', fontSize: '12px',
            cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
            border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
          },
        }, open ? '取消' : props.actionLabel))

    return createElement('li', { style: { marginBottom: '10px', listStyle: 'none' } },
      createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '8px' } },
        createElement('div', { style: { flex: '1', minWidth: 0 } },
          createElement('div', { style: { fontSize: props.lead === true ? '16px' : '13px', lineHeight: 1.6, color: props.lead === true ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)' } }, props.primary),
          // The excerpt is what makes an approval informed: title + provenance alone had the
          // principal approving blind (CEO friction #2 — 「盲批全靠信任」).
          props.excerpt === undefined || props.excerpt.trim() === '' ? null : createElement('div', {
            style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)', marginTop: '4px' },
          }, props.excerpt),
          source === undefined
            ? null
            // R7 (self-review, 2026-09-27): the live page carried 11 sources / 945 characters and this
            // line showed ~12% of them, the rest reachable only by hovering a clipped element.
            // Provenance is the trust line — it gets a real expander.
            : createElement('div', {
                style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' },
              },
              openSource || source.length <= 110 ? `来源：${friendlySource(source)}` : `来源：${friendlySource(source).slice(0, 110)}…`,
              source.length <= 110
                ? null
                : createElement('button', {
                    onClick: () => { setOpenSource(!openSource) },
                    style: {
                      marginLeft: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
                      border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
                    },
                  }, openSource ? '收起来源' : `来源全文（${source.length} 字）`))),
        props.readOnly === true ? null : controls),
      // R11 (narrow review, 2026-09-27): this used to co-render with the in-flight line below, so a
      // just-answered row said "已回答" and "正在处理" at once. While the answer is in flight the row
      // says one thing; the settled line is what replaces it.
      props.readOnly === true && inflight === false
        ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' } },
            '已回答——改主意？在对话里说一声，它会改回来')
        : null,
      inflight === false ? null : createElement('div', {
        style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', marginTop: '4px' },
      }, `已交给助手 · ${shortTime(new Date(store.pending?.at ?? Date.now()).toISOString())} · ${String(store.pending?.action ?? '')}——正在处理，回复出现在对话里`),
      // The poller gave up: the action left, the desk did not catch up. Durable on the row on
      // purpose — a row that looks untouched reads as "nothing happened" (R1).
      stalled === undefined ? null : createElement('div', {
        style: { fontSize: '12px', color: 'var(--dsha-warn)', marginTop: '4px' },
      }, `已发出 · ${shortTime(new Date(stalled.at).toISOString())} · ${stalled.action}——桌面还没跟上，点「刷新桌面」再试（动作不会被撤销）`),
      receipt === undefined ? null : createElement('div', {
        style: { fontSize: '12px', color: MARK_TEAL, marginTop: '4px' },
      }, `✓ 已更新 · ${shortTime(new Date(receipt.at).toISOString())}`),
      open && props.readOnly !== true
        ? createElement('div', { style: { marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start' } },
            // A textarea, not an input: corrections run one to three sentences. Enter still sends,
            // but guarded against IME composition — without the guard, a Chinese principal's
            // Enter-to-pick-a-candidate fires half a sentence (runtime-proven class, 2026-09-26).
            createElement('textarea', {
              value: text,
              rows: 2,
              onChange: (event: { target: { value: string } }) => { setText(event.target.value) },
              onKeyDown: (event: { key: string, shiftKey?: boolean, keyCode?: number, nativeEvent?: { isComposing?: boolean } }) => {
                if (event.nativeEvent?.isComposing === true || event.keyCode === 229) return
                if (event.key === 'Enter' && event.shiftKey !== true) submit()
              },
              placeholder: props.placeholder,
              style: {
                flex: '1', padding: '5px 8px', fontSize: '12px', border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px',
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
              },
            }),
            createElement('button', {
              onClick: submit,
              disabled: frozen,
              style: {
                padding: '5px 12px', fontSize: '12px',
                cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
                borderRadius: '4px', border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
              },
            }, '发送'))
        : null)
  }

  /**
   * A timestamp the principal can read at a glance. ISO strings ("2026-09-26T05:10:02.454Z") are
   * for machines; a desk shows "09-26 13:10". Unparseable values pass through untouched rather
   * than turning into "Invalid Date".
   */
  function shortTime(value: string | undefined): string {
    if (value === undefined || value.trim() === '') return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    const pad = (part: number): string => String(part).padStart(2, '0')
    return `${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  }

  /**
   * Whether the desk file lags the conversation. The desk is only as fresh as the assistant's last
   * refresh, so when the newest turn is newer than the file the panels say so instead of presenting
   * a stale snapshot as current (a minute of slack absorbs the refresh itself).
   * @param store - The shared desk store.
   * @returns A warning line, or undefined when the file is current.
   */
  function staleWarning(store: typeof deskStore): string | undefined {
    const generated = store.data?.generatedAt
    const sessionAt = store.sessionUpdatedAt
    if (generated === undefined || sessionAt === undefined) return undefined
    const generatedAt = new Date(generated).getTime()
    if (Number.isNaN(generatedAt)) return undefined
    if (sessionAt - generatedAt <= 60_000) return undefined
    return `对话比这份桌面新（对话 ${shortTime(new Date(sessionAt).toISOString())}，桌面 ${shortTime(generated)}）——点「刷新桌面」让它跟上`
  }

  /** Re-read the desk for one target session; `undefined` walks the newest five (the primary view). */
  function reloadDesk(sessionId?: string): void {
    if (sessionId === undefined) loadDesk()
    else loadDeskFor(sessionId)
  }

  /**
   * Read one Session's desk file — the bound form a right-sidebar tab uses. The tab lives in a
   * specific Session's sidebar, so it reads that Session's workspace directly instead of walking
   * the five newest; a silent miss is remembered so the tab can say "this session has none yet"
   * rather than spinning on a reload that will never answer.
   */
  function loadDeskFor(sessionId: string): void {
    const read = (deskRemote?.['workspaceFiles'] as {
      read?: (sessionId: string, path: string, options: unknown) => Promise<unknown>
    } | undefined)?.read
    if (read === undefined) {
      patchDesk({ note: 'remote.workspaceFiles did not materialize' })
      return
    }
    // R11: the target session's own slice and load sequence — a load for one session no longer
    // cancels an in-flight read for another.
    const slice = deskSlice(sessionId)
    const seqOf = sliceSeq(slice)
    const seq = seqOf.next()
    void (async (): Promise<void> => {
      const state = deskSessions?.list?.getSnapshot() as { byId?: Record<string, { cwd?: string, updatedAt?: number }> } | undefined
      const cwd = state?.byId?.[sessionId]?.cwd ?? ''
      // A2: the bound form's staleness line must track ITS session's conversation — without this
      // the warning was computed once at startup and then frozen wrong forever.
      const updatedAt = state?.byId?.[sessionId]?.updatedAt
      if (seq !== seqOf.current()) return
      if (updatedAt !== undefined) patchSlice(slice, { sessionUpdatedAt: Number(updatedAt) })
      let text: string | undefined
      try {
        const result = await read(sessionId, '.desk/state.json', {})
        if (seq !== seqOf.current()) return
        const wrapped = result as { ok?: boolean, value?: { text?: string } }
        text = wrapped?.ok === false ? undefined : wrapped?.value?.text
      } catch {
        // R6 (self-review, 2026-09-27): a throw used to land only in `note`, and the right-pane tab
        // returns before any Panel renders notes — so a failed read showed "正在读这个会话的桌面…"
        // forever, with no retry anywhere. `readError` is the field the tab and the panels both
        // render an error-and-retry from, so a failure reaches the principal wherever he is.
        if (seq === seqOf.current()) {
          patchSlice(slice, { readError: `读桌面文件失败（${cwd === '' ? '本会话工作区' : cwd}）` })
        }
        return
      }
      if (typeof text !== 'string' || text.trim() === '') {
        deskStore.misses.add(sessionId)
        return
      }
      // A5: a corrupt file is an ERROR with a retry, not "reading…" forever — and it must not
      // leave another session's data in place behind the guard.
      let parsed: DeskData
      try {
        parsed = JSON.parse(text) as DeskData
      } catch {
        deskStore.misses.delete(sessionId)
        patchSlice(slice, { readError: '桌面文件损坏（JSON 解析失败）', data: undefined, pending: undefined })
        return
      }
      deskStore.misses.delete(sessionId)
      if (!looksLikeDesk(parsed)) {
        patchSlice(slice, {
          data: undefined,
          readError: '这份桌面文件不像 desk-refresh 写的（没有 generatedAt、也没有任何分区）——点「刷新桌面」让助手按契约重写',
          source: cwd,
        })
        return
      }
      patchSlice(slice, { data: parsed, source: cwd, readError: undefined })
      patchDesk({ note: undefined, jumpError: undefined })
      // A first targeted load may be the flat slice's first owner (the walk never answered): claim
      // it so later walks carry row state instead of re-attributing it (R11).
      if (slice === (deskStore as DeskSlice) && deskStore.sourceSession === undefined) {
        patchDesk({ sourceSession: sessionId })
      }
      settlePending(parsed.generatedAt, sessionId)
      retireStaleReceipt(parsed, sessionId)
    })()
  }

  /** Open one room as a right-sidebar tab beside the conversation (the approved form). */
  function openBeside(kind: RoomKind): void {
    const controller = deskSidebarRight
    if (controller === undefined || controller.openTab === undefined) {
      // R9: the note rendered inside a panel body — invisible from the Session header, where the
      // click happened. The chip shows it instead.
      patchDesk({ note: 'sidebarRight 服务没有物化，开不了对话旁的 tab', openError: '开不了' })
      return
    }
    patchDesk({ openError: undefined })
    // Call THROUGH the controller, never through a detached reference: the vendor's openTab starts
    // with `this.require()`, so a bare function call loses the receiver and throws. Runtime-proven
    // 2026-09-26 (独立体验反馈): "Cannot read properties of undefined (reading 'require')" — the
    // approved right-tab form never opened for a real click.
    try {
      controller.openTab(kind)
    } catch (reason: unknown) {
      // R11 (narrow review, 2026-09-27): clearing openError BEFORE the call and leaving the call
      // uncaught meant a throwing openTab showed nothing at all — the exact failure this marker was
      // added for.
      patchDesk({ openError: '开不了', note: `打开桌面失败：${String(reason)}` })
    }
  }

  /** Props a right-sidebar tab body receives (structural mirror of the session-scoped seat). */
  interface TabBodyProps {
    /** The Session whose sidebar holds this tab — session-scope slots get it as a standard prop. */
    sessionId?: string
    /** The tab record; a kind-opened tab's opener may also have bound a session in its params. */
    useTabInfo?: () => { tab?: { navigation?: { params?: { sessionId?: string } } } }
  }

  /**
   * One room rendered as a right-sidebar tab, bound to the session the tab lives in. The store is
   * shared with the main pages, so when its data came from another session's workspace the tab
   * withholds it and reloads its own — presenting another session's desk as yours would be worse
   * than a one-line wait.
   */
  /**
   * The room's tab-strip title: the room's own glyph before its title text (user steer,
   * 2026-09-28 — each tab should carry its own icon). Shapes after the vendor's guide title:
   * reads the live tab title through the seat's `useTabInfo` prop, falls back to the room's
   * constant when the hook is absent (tests, or a seat that passes no hook).
   * @param Icon - the room's glyph component.
   * @param fallbackTitle - the room's constant title.
   * @returns the title component for that room's tab.
   */
  function roomTabTitle(Icon: (props: { size: number }) => unknown, fallbackTitle: string) {
    return function RoomTabTitle(props: { useTabInfo?: () => { tab?: { title?: string } } }): ReturnType<typeof createElement> {
      const title = props.useTabInfo?.()?.tab?.title ?? fallbackTitle
      return createElement('span', {
        style: { display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: '0' },
      },
      createElement(Icon as unknown as import('react').FunctionComponent<{ size: number }>, { size: 14 }),
      title)
    }
  }

  function tabBody(props: TabBodyProps, Panel: (props?: { sessionId?: string }) => unknown): ReturnType<typeof createElement> {
    const { useEffect } = require('react') as typeof import('react')
    const sessionId = props.sessionId ?? props.useTabInfo?.()?.tab?.navigation?.params?.sessionId
    // R11: this tab renders its OWN session's slice, never the shared walk view.
    const store = useDesk(sessionId)
    const slice = deskSlice(sessionId)
    const unloaded = sessionId === undefined
      || (slice.data === undefined && slice.readError === undefined && !deskStore.misses.has(sessionId))
    useEffect(() => {
      if (sessionId === undefined) return
      // Register the bound session — the follow-the-conversation reload refreshes each of these;
      // the old single global `sendSession` slot made the last-mounted tab steal every send.
      deskStore.boundSessions.add(sessionId)
      if (deskSlice(sessionId).data === undefined && deskSlice(sessionId).readError === undefined && !deskStore.misses.has(sessionId)) {
        loadDeskFor(sessionId)
      }
      return () => { deskStore.boundSessions.delete(sessionId) }
      // `unloaded` re-fires the load when the walk re-homes the primary away from this session and
      // its slice empties — without it a tab could sit on "reading…" forever.
    }, [sessionId, unloaded])
    if (sessionId === undefined) return roomScroller(muted('这个 tab 没有落在任何会话里，读不到它的工作区'))
    const retryButton = (label: string): ReturnType<typeof createElement> => createElement('button', {
      onClick: () => { askRefresh(sessionId) },
      style: {
        marginTop: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
        border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
      },
    }, label)
    // A5: a corrupt file is an error with a way out, not an eternal "reading…".
    if (store.readError !== undefined) return roomScroller(
      muted(`读桌面文件失败：${store.readError}。`), retryButton('让助手重写一份'))
    // A6 inverted by the real-user walk (2026-10-06): on a desk-less Day-0 the refresh button
    // produced an honest zero-report loop with no meaning — the one-click refresh this branch
    // once prided itself on was the trap. The empty desk's next step is the first conversation;
    // the copy says what the desk IS and how it grows, and the button starts that conversation
    // instead of refreshing nothing. (2026-10-01: the raw `.desk/state.json` path stays off the
    // principal's surface.)
    if (deskStore.misses.has(sessionId)) return roomScroller(
      muted('桌面还空着——先在对话里说一句话（说什么都行，它会先问你最近要拍板、还要跟进的一件事），这里才开始长：在办的事、待你拍板的决定、缺的数据。'),
      createElement('button', {
        onClick: () => { askStart(sessionId) },
        style: {
          marginTop: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
          border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
        },
      }, '开始第一件事'))
    if (slice.data === undefined) return roomScroller(muted('正在读这个会话的桌面…'))
    // The panel reads and acts on this session's slice: the session rides in as a plain prop.
    return roomScroller(createElement(Panel as unknown as import('react').FunctionComponent<{ sessionId?: string }>, { sessionId }))
  }

  /**
   * The room tab's scroll container. The vendor's pane body is a flex column with
   * `overflow: hidden` and no scroll of its own — the seat's content brings scrolling.
   * Without this wrapper the long desk was clipped at the fold with no way down
   * (user on the real machine, right-sidebar era, 2026-09-28).
   * @param children - the room content, or an error/empty state.
   * @returns the scrollable wrapper element.
   */
  function roomScroller(...children: (string | ReturnType<typeof createElement>)[]): ReturnType<typeof createElement> {
    return createElement('div', {
      style: { flex: '1', minHeight: '0', minWidth: '0', overflowY: 'auto', overflowX: 'hidden' },
    }, ...children)
  }

  /** Tab bodies: the same three rooms the main pages render, bound to their own session. */
  function DeskTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
    return tabBody(props, DeskPanel)
  }

  /**
   * The desk as a conversation view (desk-primary-view proposal, 2026-10-06): the same panel
   * tree and the same session-scoped slice the right-sidebar tab renders, claimed as a
   * main-area view beside chat. The vendor seam this rides: a `conversation.view` entry
   * ({id, label} + component) becomes a view tab whose body renders via
   * `renderSlot('conversation.view', …, {only: id})` inside the session's view area, with the
   * entry's `inject(sessionId)` supplying the body's session props (ui-chat's chat view is the
   * mirrored shape). The blank phase renders no views (vendor-owned hero) — the first-mile
   * dock still owns that state, and the desk as the DEFAULT view needs the upstream enabler
   * (candidate D7), so this view is reachable-by-tab and remembered per session once chosen.
   * @param props - The session-standard props the view seat injects (`sessionId`).
   * @returns The desk panel, loading/empty states included (same wrapper as the room tab).
   */
  function DeskViewBody(props: { sessionId?: string } & Record<string, unknown>): ReturnType<typeof createElement> {
    return tabBody(props as TabBodyProps, DeskPanel)
  }
  function KnowledgeTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
    return tabBody(props, KnowledgePanel)
  }
  function MemoryTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
    return tabBody(props, MemoryPanel)
  }

  /** The opener where the principal already is: a chip in the Session header beside the conversation. */
  function AssistantDeskChip(): ReturnType<typeof createElement> {
    const store = useDesk()
    const failed = store.openError !== undefined
    return createElement('button', {
      onClick: () => { openBeside('desk') },
      title: failed ? '上次没能打开桌面：刷新页面通常能恢复' : '在对话旁打开我的桌面',
      style: {
        border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: '12px', color: failed ? 'var(--dsha-warn)' : MARK_TEAL, padding: '4px 6px',
      },
    }, failed ? `桌面（${store.openError}）` : '桌面')
  }

  /**
   * The blank-session hero mark: the deployment's own house mark, where the shell would
   * otherwise show its official one. First impressions should say whose assistant this is
   * — the first-mile walkthrough (2026-09-26) found the product's only identity on the
   * opening screen was a line in the sidebar.
   * @param props - the hero seat's owner props (requested edge, surrounding geometry class).
   * @returns the mark element.
   */
  function AssistantHeroMark({ size, className }: { size: number, className?: string }): ReturnType<typeof createElement> {
    return createElement('svg', {
      width: size,
      height: size,
      viewBox: '0 0 64 64',
      className,
      'aria-hidden': true,
    },
    createElement('rect', { width: 64, height: 64, rx: 14, fill: MARK_TEAL }),
    createElement('path', { d: 'M32 11 57 33h-8v18H15V33H7Z', fill: '#ffffff' }),
    createElement('rect', { x: 26, y: 38, width: 12, height: 13, fill: MARK_TEAL }),
    )
  }

  /**
   * The first-open strip above the composer, for a session that has no content yet: it
   * answers the two questions the walkthrough found unanswered — what do I say first, and
   * what can this thing do — and offers the one surface worth visiting before there is any
   * content (the desk, whose own empty state explains what it becomes).
   *
   * The blank check is OURS, not the owner's: the vendor renders this dock for every
   * session (`zone` is defined whenever session+input exist; only the hero chrome is
   * hero-gated — ConversationContent.tsx), so without this line a first-open strip would
   * sit above the composer of every ongoing conversation. A blank session is the owner
   * data's own `session.blank`.
   * @param props - the dock's owner data and injected opener.
   * @returns the strip element, or null once the session has any content.
   */
  /**
   * The rich desk landing for the blank (pre-first-message) phase (A1, 2026-10-06 stepwise form
   * migration). This replaces the old thin first-mile strip with a substantial card that fills
   * the gap between the vendor hero and the composer — the plugin boundary's best shot at making
   * the first screen carry real content.
   *
   * Two modes:
   * - fresh folder (no desk file, no memories): the Day-0 landing — what the arc is, what you'll
   *   have after three answers, and one start button (the assistant asks first, not you).
   * - folder with a desk: the compact desk summary — what needs your call, what's due, what's
   *   blocking — with one-click actions, so the first screen IS the working surface.
   *
   * Vendor seam facts this rides: `conversation.input.dock` is a list slot with no height limit,
   * rendered between HeroShell and the composer bar in the blank phase (ConversationContent.tsx:165-168).
   */
  function FirstMileDock({ session, openRoom }: {
    session?: { blank?: boolean, id?: string } | undefined
    openRoom?: (kind: RoomKind) => void
  }): ReturnType<typeof createElement> | null {
    if (session?.blank !== true) return null
    // The walk view's desk data — on a blank session there is no session slice yet, so we
    // read the global walk store to detect "has a desk at all" (a one-shot check, no memo).
    const walk = deskSlice(undefined)
    const hasDesk = walk.data !== undefined && Object.keys(walk.data).length > 0
    const shell = (children: (string | ReturnType<typeof createElement> | undefined)[]): ReturnType<typeof createElement> =>
      createElement('div', {
        style: {
          display: 'flex', flexDirection: 'column', gap: '8px',
          width: 'min(var(--dsh-composer-card-max-width, 952px), 100%)',
          margin: '0 auto 8px', padding: '16px 20px',
          border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '10px',
          background: 'var(--dsw-alias-bg-layer-1)',
        },
      }, ...children)
    const heading = (text: string): ReturnType<typeof createElement> =>
      createElement('div', { style: { fontSize: '14px', fontWeight: 600 } }, text)
    const body = (text: string): ReturnType<typeof createElement> =>
      createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.7 } }, text)
    const startButton = (label: string, run: () => void): ReturnType<typeof createElement> =>
      createElement('button', {
        onClick: run,
        style: {
          border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', cursor: 'pointer',
          fontSize: '13px', color: MARK_TEAL, padding: '6px 16px', borderRadius: '6px', alignSelf: 'flex-start',
        },
      }, label)

    if (!hasDesk) {
      // Day-0: the arc, the promise, and the start.
      return shell([
        heading('第一次来？说一句话，它先问你。'),
        body('你开了口，它会先问你最近要拍板、还要跟进的一件事——然后三个短问（什么逼出了决定、当时知道什么、哪里没底）。'),
        body('答完，你的桌面就有了第一份决策简报：带代价的选项、还缺的数、一个复查日期。之后每次来，先看桌面——要你拍的、在跟的、缺的，一目了然。'),
        createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
          '例：「这个月签单为什么慢」「我在想要不要给老客户涨价」'),
        startButton('开始第一件事', () => {
          if (session?.id !== undefined) { askStart(session.id) }
        }),
      ])
    }

    // Has a desk: compact summary — the first screen IS the working surface.
    const data = walk.data
    const decisions = (data?.decisions ?? []).filter(item => item.kind === 'business' || ((item.options ?? []).length > 0))
    const gaps = data?.gaps ?? []
    const actions = (data?.actions ?? []).filter(item => item.status !== 'done')
    return shell([
      heading('这是你的一把手桌面'),
      decisions.length > 0
        ? body(`要你拍的 ${decisions.length} 件——最新：「${String(decisions[0]?.question ?? '').slice(0, 40)}」`)
        : body('没有等你拍板的事。'),
      actions.length > 0
        ? body(`在跟的 ${actions.length} 件——最近到期：「${String(actions[0]?.what ?? '').slice(0, 30)}」（${String(actions[0]?.due ?? '')}）`)
        : undefined,
      gaps.length > 0
        ? body(`缺的数 ${gaps.length} 个——最挡路的：「${String(gaps[0]?.what ?? '').slice(0, 30)}」`)
        : undefined,
      createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        startButton('打开桌面全景', () => { openRoom?.('desk') }),
        createElement('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
          '· 有新的事，直接在下面说'),
      ),
    ])
  }

  /**
   * The pending-approval banner above the composer. The desk already points at the drafts (S4),
   * but that pointer sits one room deep — the second naive-CEO reading (first-open UX card,
   * 2026-10-04) named the depth itself as the friction: pages wait for an approval only the
   * principal can give, and nothing on the first screen says so (before-evidence 2026-10-05:
   * 3 drafts on the desk, zero approval words in the first-open DOM). This banner is the
   * shallow twin of the desk pointer: it shows wherever the principal already is — blank
   * session or not — and disappears once the drafts are approved.
   *
   * Data rides the walk view (the primary slice), not the dock session's own slice: on the
   * first screen the session is brand new and has no desk yet, while the drafts live in the
   * workspace the last desk-refresh served. In the shipped composition every session shares
   * the one default workspace, so the click-through's own read finds the same file; a session
   * on a different workspace lands on the knowledge room's honest empty state instead of a
   * foreign desk (tabBody withholds other sessions' data by design — this banner does not
   * override that, it only points).
   * @param props - the injected opener.
   * @returns the banner element, or null when nothing is waiting for approval.
   */
  function ApprovalDockBanner({ openRoom }: {
    openRoom?: (kind: RoomKind) => void
  }): ReturnType<typeof createElement> | null {
    const store = useDesk()
    const pages = store.data?.knowledge
    // Count what the click-through will show: the knowledge room's 待你审批 section counts ROWS
    // with status draft. Desk files that carry no rows fall back to the model's own count — a
    // banner number the room cannot reproduce would break the promise the click makes.
    const draftCount = pages !== undefined
      ? pages.filter(page => page.status === 'draft').length
      : (store.data?.counts?.knowledgeDraft ?? 0)
    if (draftCount === 0) return null
    return createElement('div', {
      style: {
        display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start',
        // Same card width rule as the first-mile strip: follow the composer's card, not a
        // fixed pixel cap that drifts at every breakpoint.
        width: 'min(var(--dsh-composer-card-max-width, 952px), 100%)',
        margin: '0 auto 8px', padding: '10px 16px',
        border: '1px solid var(--dsha-warn)', borderRadius: '10px', background: 'var(--dsha-warn-tint)',
      },
    },
    createElement('div', { style: { fontSize: '13px', color: 'var(--dsha-warn)' } },
      `⚠ ${String(draftCount)} 页知识草稿在等你审批——批准后才会成为它的判断依据`),
    createElement('button', {
      onClick: () => {
        // Same routing as the desk pointer (S4): the room opens with the drafts highlighted
        // and scrolled into view. openBeside is total — it reports its own failure — so no
        // guard here; the banner never swallows a click silently.
        patchDesk({ focusKnowledge: 'drafts' })
        openRoom?.('knowledgeRoom')
      },
      style: {
        border: '1px solid var(--dsha-warn)', background: 'transparent', cursor: 'pointer',
        fontSize: '12px', color: 'var(--dsha-warn)', padding: '3px 10px', borderRadius: '6px',
      },
    }, '点这里去审批'),
    )
  }

  /**
   * A stat cell; with a room kind it becomes the way to the room tab that explains the number.
   * The rooms live as right-sidebar tabs (user steer, 2026-09-28), so the jump opens the tab
   * beside the conversation instead of navigating the retired left main panels.
   */
  function cell(label: string, value: string, target?: RoomKind): ReturnType<typeof createElement> {
    const jump = (): void => {
      if (target === undefined) return
      patchDesk({ jumpError: undefined })
      try {
        openBeside(target)
      } catch {
        // R9 (self-review, 2026-09-27): swallowing this left an underlined, pointer-cursor number that
        // did nothing at all. The stale target still must not break the panel — but the failure is
        // now visible where the click happened.
        patchDesk({ jumpError: `「${label}」这次没能打开——刷新页面通常能恢复` })
      }
    }
    const inner = [
      createElement('div', { key: 'v', style: { fontSize: '26px', fontWeight: 700, color: MARK_TEAL } }, value),
      createElement('div', {
        key: 'l',
        style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', textDecoration: target === undefined ? 'none' : 'underline' },
      }, label),
    ]
    const style: Record<string, unknown> = {
      display: 'inline-block', margin: '8px 16px', textAlign: 'center' as const,
    }
    if (target === undefined) return createElement('div', { style }, ...inner)
    // A real button when it acts: the count used to be an onClick div with no role and no tab stop,
    // i.e. mouse-only (R9).
    return createElement('button', {
      type: 'button',
      onClick: jump,
      title: '打开这个面板',
      style: { ...style, border: 'none', background: 'transparent', font: 'inherit', padding: 0, cursor: 'pointer' },
    }, ...inner)
  }

  /**
   * The lines every panel shows at its foot: a failed read or a file that is not a desk at all, then
   * the loader's own note. `readError` used to render only in the right-pane tab, so a main-area panel
   * showed an empty-looking desk with no explanation (2026-09-27).
   * @param store - the shared desk store.
   * @returns the alert elements, in severity order.
   */
  function panelAlerts(store: typeof deskStore): ReturnType<typeof createElement>[] {
    const alerts: ReturnType<typeof createElement>[] = []
    if (store.readError !== undefined) {
      alerts.push(createElement('div', { key: 'read-error', style: { fontSize: '12px', color: 'var(--dsha-warn)', margin: '6px 0 0' } },
        store.readError))
    }
    if (store.note !== undefined) alerts.push(createElement('div', { key: 'note' }, muted(store.note)))
    return alerts
  }

  /** A section heading. */
  function sectionTitle(text: string): ReturnType<typeof createElement> {
    return createElement('h3', { style: { margin: '20px 0 8px', fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 600 } }, text)
  }

  /** Muted one-liner. */
  function muted(text: string): ReturnType<typeof createElement> {
    return createElement('p', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', margin: 0 } }, text)
  }

  /** One quick-action button in the shared row. */
  function quickButton(label: string, hint: string, run: () => void): ReturnType<typeof createElement> {
    return createElement('button', {
      onClick: run,
      title: hint,
      style: {
        marginRight: '8px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '6px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
      },
    }, label)
  }

  /** The quick actions every panel carries: the whole-point-of-a-desk prompts, one click each. */
  function quickActions(session?: string): ReturnType<typeof createElement> {
    return createElement('div', { style: { marginTop: '8px' } },
      quickButton('回顾一下', '让助手回顾最近的决定、在跟的事与它新学到的东西',
        () => { sendPrompt('回顾一下：我们最近决定了什么、还有什么在跟、你新学到了什么？', '回顾', 'desk', session) }),
      quickButton('体检', '让助手跑一次 curate，报告家的现状与需要你处理的事',
        () => { sendPrompt('跑一次 curate，报告家的现状与需要我处理的事。', '体检', 'desk', session) }))
  }

  /** The refresh button plus its status line, and — where the room can — the jump to the beside-conversation tab. */
  function refreshRow(store: typeof deskStore, session?: string): ReturnType<typeof createElement> {
    // Used for the status line only. The button itself is deliberately NOT disabled while an action
    // is in flight: it is the escape hatch when the assistant does not rewrite the desk file
    // (self-review R1, 2026-09-27). It re-reads the file; reading is always safe, and a frozen
    // surface with a dead escape hatch is not.
    // (2026-09-28) The "在对话旁打开" button is gone with the left main panels: rooms render only
    // inside right-sidebar tabs now, so that opener opened the very tab it sat in — a no-op the
    // principal rightly read as broken (real use, same day as the move). The openers that remain
    // are the "+" guide, the Session-header chip, and the first-mile dock.
    const inFlight = pendingInFlight(store)
    return createElement('div', { style: { margin: '8px 0 0' } },
      createElement('button', {
        onClick: () => { askRefresh(session) },
        style: {
          padding: '6px 14px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px',
          border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)',
          color: MARK_TEAL,
        },
      }, '刷新桌面'),
      inFlight === false
        ? null
        : createElement('span', { style: { marginLeft: '10px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
            `已交给助手 · ${shortTime(new Date(store.pending?.at ?? Date.now()).toISOString())} · ${String(store.pending?.action ?? '')}——回复出现在对话里，桌面更新后自动跟上`),
      // A7: freshness belongs to every room, not only the desk — the room the principal is
      // reading in is exactly where "this snapshot is stale" must be said out loud.
      staleWarning(store) === undefined
        ? null
        : createElement('div', { style: { fontSize: '12px', color: 'var(--dsha-warn)', marginTop: '4px' } },
            `⚠ ${String(staleWarning(store))}`))
  }

  /** Calendar glyph for the desk panel entry. */
  function DeskIcon({ size }: { size: number }): unknown {
    return createElement('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    createElement('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
    createElement('line', { x1: 3, y1: 9, x2: 21, y2: 9 }),
    createElement('line', { x1: 9, y1: 21, x2: 9, y2: 9 }),
    )
  }

  /** Book glyph for the knowledge panel entry. */
  function KnowledgeIcon({ size }: { size: number }): unknown {
    return createElement('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    createElement('path', { d: 'M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4Z' }),
    createElement('path', { d: 'M20 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20Z' }),
    )
  }

  /** Lightbulb glyph for the memory panel entry. */
  function MemoryIcon({ size }: { size: number }): unknown {
    return createElement('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: MARK_TEAL, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    createElement('path', { d: 'M9 18h6' }),
    createElement('path', { d: 'M10 22h4' }),
    createElement('path', { d: 'M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z' }),
    )
  }

  /** Panel 1 — the desk: what is being tracked, what changed, and the working-folder counts. */
  function DeskPanel(props?: { sessionId?: string }): unknown {
    const session = props?.sessionId
    const store = useDesk(session)
    const data = store.data
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '我的桌面'),
      // The three rooms are three QUESTIONS, not three data containers (user ruling 2026-09-26:
      // keep the familiar entries, make the navigation MEAN something).
      // The rhythm line (real-user walk finding, 2026-10-06): the desk answered "what now"
      // per row but never the standing loop — one line states the working rhythm so the
      // principal knows what coming back here means.
      createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 6px' } },
        '这里是你的起点：来了先看「要你拍的」，拍完就走。'),
      createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '现在要采取什么行动？'),
      refreshRow(store, session),
      // S6 landing: the principal's real first reaction (2026-09-26 trial) was "不知所措——
      // 不知道怎么落脚，不知道要干什么". When no desk file exists yet, say what this surface
      // is and give the three-step way in — before any content can.
      store.data === undefined
        ? createElement('div', {
            style: {
              border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '8px', background: 'var(--dsw-alias-bg-layer-1)',
              padding: '10px 14px', margin: '8px 0', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.8,
            },
          },
          createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-secondary)' } }, '第一次来这里？'),
          // Corrected 2026-10-06 (real-user walk finding): the assistant's opening question
          // fires INSIDE the first conversation, in reply to the principal's first message —
          // it does not exist before anyone speaks. The earlier rewrite claimed "the assistant
          // has already opened" and pointed at an empty conversation; the true Day-0 start is
          // the principal saying anything at all (the assistant then takes over the asking).
          '① 跟它说一句话就行——说什么都行，它会先问你：最近要你拍板、还要跟进的一件事',
          createElement('br'),
          '② 这里是你的仪表盘，不是要你配置的东西',
          createElement('br'),
          '③ 之后这里一直显示：等你拍板的事、在办的事、它缺什么。每一条都能就地处置')
        : null,
      quickActions(session),

      // The principal's first question is "what NOW?" — real-use feedback (2026-09-26) was that a
      // pile of equal-weight rows never says where to start. So the desk answers with ONE lead
      // item (the first decision, enlarged, actions at hand) and the rest wait collapsed behind
      // an explicit toggle: nothing is hidden, but nothing competes with the one thing first.
      // The principal's first question is "what NOW?" — and the answer must be THEIR business, not the
      // assistant's upkeep. Two independent reviews (2026-09-26) found the lead card showing "should I
      // keep building this panel?": with no kind field it took decisions[0], i.e. whatever the model
      // wrote first. Contract: kind = "business" | "upkeep"; business leads, and when none is waiting
      // the desk says so honestly instead of promoting housekeeping.
      //
      // R4 (self-review, 2026-09-27): `kind` alone is not the whole gate. A decision already carrying
      // `options[]` is a concrete choice the assistant prepared FOR the principal — the live desk had
      // "two draft pages: approve, or comment? only you can finalize them" filed as upkeep with two
      // one-click options, while the lead card claimed nothing needed a call. So: business first,
      // then the first options-bearing decision whatever its kind says.
      sectionTitle('从这开始'),
      (() => {
        const { useState } = require('react') as typeof import('react')
        const decisions = data?.decisions ?? []
        const [showRest, setShowRest] = useState(false)
        const [showUpkeep, setShowUpkeep] = useState(false)
        const byRank = (left: DeskDecision, right: DeskDecision): number =>
          Number(left.rank ?? 0) - Number(right.rank ?? 0)
        const business = decisions.filter(item => item.kind === 'business').slice().sort(byRank)
        const rowIdOf = (item: DeskDecision): string => String(item.id ?? item.question)
        const waiting = decisions
          .filter(item => item.kind !== 'business' && (item.options ?? []).length > 0)
          .slice()
          .sort(byRank)
        const draftCount = data?.counts?.knowledgeDraft ?? 0
        const lead = business[0] ?? waiting[0]
        const rest = business.slice(1)
        // Whatever leads leaves the fold: the same row must not appear twice.
        const upkeep = decisions.filter(item =>
          item.kind !== 'business' && (lead === undefined || rowIdOf(item) !== rowIdOf(lead)))
        // Options the assistant presented become one-click answers on the row — the principal
        // picks instead of copying the answer back from the conversation.
        const optionButtons = (item: DeskDecision, rowId: string): ReturnType<typeof createElement> | null =>
          (item.options ?? []).length === 0
            ? null
            : createElement('div', { style: { marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                ...(item.options ?? []).map(option => createElement('button', {
                  key: String(option.label),
                  title: [option.cost === undefined || option.cost === '' ? undefined : `代价：${option.cost}`,
                    option.irreversible === true ? '不可逆' : undefined]
                    .filter(part => part !== undefined).join(' · ') || undefined,
                  onClick: () => { answerDecision(String(item.question ?? ''), String(option.label ?? ''), rowId, session) },
                  style: {
                    padding: '4px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px',
                    border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
                  },
                }, String(option.label ?? ''))))
        // S7: once THIS row has been ANSWERED it stops looking answerable — a real trial answered
        // one decision three times because the row kept its buttons through the assistant's
        // multi-step rewrite window.
        //
        // R2 (self-review, 2026-09-27): "answered" must mean the 回答 action, not "any action
        // touched this row". The row used to go read-only on ANY receipt — including the one from
        // 看选项, which is a READ: the principal asked to see the options and lost both the options
        // and the ability to answer, with a false "已回答" line on top. Only 回答 closes a row; a
        // receipt from 看选项/修改 leaves it live, and options always render for a live decision.
        const answered = (item: DeskDecision): boolean => {
          const rowId = rowIdOf(item)
          const inFlight = store.pending?.rowId === rowId ? store.pending.action : undefined
          const settled = store.lastReceipt?.rowId === rowId ? store.lastReceipt.action : undefined
          return inFlight === '回答' || (inFlight === undefined && settled === '回答')
        }
        const row = (item: DeskDecision, compact: boolean): ReturnType<typeof createElement> => {
          const rowId = rowIdOf(item)
          return createElement(CorrectableRow, {
            key: rowId,
            rowId,
            readOnly: answered(item),
            primary: createElement('span', null,
              createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.question ?? '')),
              compact || item.context === undefined || item.context === ''
                ? null
                : createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, String(item.context)),
              item.reply === undefined || item.reply === ''
                ? null
                : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '4px' } }, `它说：${item.reply}`),
              // Options hide once answered — the trial's second click came exactly from here.
              answered(item) ? null : optionButtons(item, rowId)),
            actionLabel: '回答',
            placeholder: '你的决定是什么？',
            deskSession: session,
            onSubmit: (text: string) => { answerDecision(String(item.question ?? ''), text, rowId, session) },
            actions: [{ label: '看选项', run: () => { askAboutDecision(String(item.question ?? ''), rowId, session) } }],
          })
        }
        const fold = (label: string, toggle: () => void): ReturnType<typeof createElement> =>
          createElement('button', {
            onClick: toggle,
            style: {
              padding: '5px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
              border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
            },
          }, label)
        return createElement('div', null,
          lead === undefined
            ? muted('目前没有需要你拍板的经营事项')
            : createElement('div', {
                style: {
                  border: `2px solid ${MARK_TEAL}`, borderRadius: '8px', background: 'var(--dsha-accent-tint)',
                  padding: '12px 14px', margin: '8px 0',
                },
              },
              createElement('div', { style: { fontSize: '11px', fontWeight: 700, color: MARK_TEAL, letterSpacing: '1px' } }, '先办这件'),
              createElement(CorrectableRow, {
                lead: true,
                rowId: rowIdOf(lead),
                readOnly: answered(lead),
                primary: createElement('span', null,
                  createElement('span', { style: { fontSize: '16px', fontWeight: 700, color: 'var(--dsw-alias-label-primary)' } }, String(lead.question ?? '')),
                  lead.context === undefined || lead.context === ''
                    ? null
                    : createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400, marginTop: '4px' } }, String(lead.context)),
                  lead.reply === undefined || lead.reply === ''
                    ? null
                    : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '4px' } }, `它说：${lead.reply}`),
                  answered(lead) ? null : optionButtons(lead, rowIdOf(lead))),
                actionLabel: '回答',
                placeholder: '你的决定是什么？',
                deskSession: session,
                onSubmit: (text: string) => { answerDecision(String(lead.question ?? ''), text, rowIdOf(lead), session) },
                actions: [{ label: '看选项', run: () => { askAboutDecision(String(lead.question ?? ''), rowIdOf(lead), session) } }],
              })),
          rest.length === 0
            ? null
            : createElement('div', { style: { marginTop: '8px' } },
                fold(showRest ? `收起其余 ${rest.length} 条` : `等你决定（还有 ${rest.length} 条）`, () => { setShowRest(!showRest) }),
                showRest === false ? null : createElement('div', null, ...rest.map(item => row(item, false)))),
          draftCount === 0
            ? null
            : createElement('div', {
                // S4: the pointer lands on the drafts themselves — openBeside opens only a room
                // tab, so the room reads focusKnowledge and highlights + scrolls to the drafts.
                onClick: () => {
                  patchDesk({ focusKnowledge: 'drafts' })
                  try { openBeside('knowledgeRoom') } catch { /* right sidebar missing */ }
                },
                style: { fontSize: '13px', color: 'var(--dsha-warn)', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' },
              }, `⚠ ${String(draftCount)} 页知识在等你审批（点这里去审批）`),
          upkeep.length === 0
            ? null
            : createElement('div', { style: { marginTop: '8px' } },
                fold(showUpkeep ? `收起 ${upkeep.length} 条` : `助手自己的事（${upkeep.length}）`, () => { setShowUpkeep(!showUpkeep) }),
                showUpkeep === false ? null : createElement('div', null, ...upkeep.map(item => row(item, true)))))
      })(),

      // Actions split by state: the open ones are the working surface (each row carries its
      // correction and close-out actions); the done ones move to their own dimmed group — a plan
      // tracker that hides finished work hides the assistant's follow-through, which is the trust
      // question "did what you planned actually happen?" Dropped ones get a folded dimmed group of
      // their own (R9, self-review 2026-09-27): the earlier choice was to keep them off the panel
      // because the plan page records them, but the principal who clicked 不办了 had no durable trace
      // ON THE SURFACE HE ACTED ON — the "submitted is not done" rule applies to a close-out too.
      sectionTitle(`在办的事（${(data?.actions ?? []).filter(action => action.status !== 'done' && action.status !== 'dropped').length}）`),
      (data?.actions ?? []).filter(action => action.status !== 'done' && action.status !== 'dropped').length === 0
        ? muted('（没有在办的动作）')
        : createElement('div', null, ...(data?.actions ?? [])
            .filter(action => action.status !== 'done' && action.status !== 'dropped')
            .map(action => createElement(CorrectableRow, {
              key: String(action.id ?? action.what),
              rowId: String(action.id ?? action.what),
              primary: createElement('span', null,
                createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(action.what ?? '')),
                // R9: only `open` belongs here (done/dropped have their own groups), so anything else
                // is a status this surface does not know — say so instead of rendering it as in-flight.
                action.status === 'open' || action.status === undefined
                  ? null
                  : createElement('span', { style: { fontSize: '11px', color: 'var(--dsha-warn)', marginLeft: '6px' } },
                      `（状态「${String(action.status)}」不在面板认识的集合里）`),
                createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } },
                  [action.owner === undefined ? '' : `负责人：${action.owner}`,
                    action.due === undefined ? '' : `时点：${action.due}`].filter(part => part !== '').join(' · ')),
                action.metric === undefined || action.metric === ''
                  ? null
                  : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, `度量：${action.metric}`),
                action.stop === undefined || action.stop === ''
                  ? null
                  : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, `停止条件：${action.stop}`),
                action.note === undefined || action.note === ''
                  ? null
                  // R7's deferred half: the assistant's own reconciliation log runs long (up to 53 px on
                  // the live desk) and it stays orange on purpose — it is the trust line where the
                  // assistant says what it changed. Clamped, so it cannot push the row off-screen.
                  : createElement(ClampedText, {
                      text: `它记：${action.note}`,
                      maxLines: 3,
                      style: { fontSize: '11px', color: 'var(--dsha-warn)', fontWeight: 400, marginTop: '4px' },
                    })),
              actionLabel: '改这条',
              placeholder: '哪里要改？',
              deskSession: session,
              onSubmit: (text: string) => {
                sendPrompt(`行动「${String(action.what ?? '')}」要改：${text}。${DESK_REFRESH_STEP}`, '修改', String(action.id ?? action.what), session)
              },
              actions: [
                // Completing is a positive move: confirming it (R3, self-review 2026-09-27) made
                // the most common action two clicks inside a small window on an 18px button.
                { label: '办完了', run: () => { finishAction(String(action.what ?? ''), String(action.id ?? action.what), session) } },
                { label: '不办了', run: () => { dropAction(String(action.what ?? ''), String(action.id ?? action.what), session) }, destructive: true },
              ],
            }))),
      (data?.actions ?? []).some(action => action.status === 'done')
        ? createElement('div', null,
            sectionTitle(`已办（${(data?.actions ?? []).filter(action => action.status === 'done').length}）`),
            createElement('div', null, ...(data?.actions ?? [])
              .filter(action => action.status === 'done')
              .map(action => createElement('div', {
                key: `done-${String(action.id ?? action.what)}`,
                style: { marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid var(--dsw-alias-border-l2)' },
              },
              createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, `✓ ${String(action.what ?? '')}`),
              [action.owner === undefined ? '' : String(action.owner),
                action.due === undefined ? '' : String(action.due)].filter(part => part !== '').length === 0
                ? null
                : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } },
                    [action.owner === undefined ? '' : `负责人：${action.owner}`,
                      action.due === undefined ? '' : `时点：${action.due}`].filter(part => part !== '').join(' · ')),
              action.note === undefined || action.note === ''
                ? null
                : createElement(ClampedText, {
                    text: `它记：${action.note}`,
                    maxLines: 2,
                    style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' },
                  })))))
        : null,

      // R9: dropped actions are a decision the principal made here; they fold away rather than vanish.
      (data?.actions ?? []).some(action => action.status === 'dropped')
        ? createElement('div', null,
            sectionTitle(`已撤（${(data?.actions ?? []).filter(action => action.status === 'dropped').length}）`),
            createElement('div', null, ...(data?.actions ?? [])
              .filter(action => action.status === 'dropped')
              .map(action => createElement('div', {
                key: `dropped-${String(action.id ?? action.what)}`,
                style: { marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid var(--dsw-alias-border-l2)' },
              },
              createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, `✕ ${String(action.what ?? '')}`),
              action.note === undefined || action.note === ''
                ? null
                : createElement(ClampedText, {
                    text: `它记：${action.note}`,
                    maxLines: 2,
                    style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' },
                  })))))
        : null,

      sectionTitle('缺什么'),
      // R5 (self-review, 2026-09-27): a gap names the thing that blocks everything and says only the
      // principal can supply it — and then offered no way to supply it ("想补只需回一句" = back to
      // chat). Every judgement on this surface is actionable in place; a gap is a judgement too.
      (data?.gaps ?? []).length === 0
        ? muted('（没有卡住的事）')
        : createElement('div', null, ...(data?.gaps ?? []).map(item => createElement(CorrectableRow, {
            key: String(item.id ?? item.what),
            rowId: String(item.id ?? item.what),
            primary: createElement('span', null,
              createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.what ?? '')),
              item.why === undefined || item.why === ''
                ? null
                : createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, String(item.why))),
            actionLabel: '补上',
            placeholder: '它缺的那个读数／台账／参数是什么？',
            deskSession: session,
            onSubmit: (text: string) => {
              fillGap(String(item.what ?? ''), text, String(item.id ?? item.what), session)
            },
          }))),

      sectionTitle('在跟的事'),
      data?.threads === undefined || data.threads.length === 0
        ? muted('（暂时没有在跟的事）')
        : createElement('div', null, ...data.threads.map(thread => createElement(CorrectableRow, {
            key: String(thread.id ?? thread.title),
            rowId: String(thread.id ?? thread.title),
            primary: createElement('span', null,
              createElement('div', { style: { fontSize: '13px', fontWeight: 600, lineHeight: 1.5 } },
                String(thread.title ?? thread.id ?? ''),
                // R9: a parked or closed thread used to return to 在跟的事 looking exactly like a live
                // one, with the same three controls.
                thread.status === undefined || thread.status === 'open'
                  ? null
                  : createElement('span', { style: { fontSize: '11px', color: 'var(--dsha-warn)', marginLeft: '6px', fontWeight: 400 } },
                      `（状态：${String(thread.status)}）`)),
              // The lean is the field that measured 345 px on the live desk (R7): both free-text
              // lines clamp with an expander instead of pushing the room off-screen.
              createElement(ClampedText, {
                text: `当前倾向：${String(thread.lean ?? '（未定）')}`,
                maxLines: 3,
                style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 },
              }),
              thread.why === undefined || thread.why === ''
                ? null
                : createElement(ClampedText, {
                    text: String(thread.why),
                    maxLines: 2,
                    style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400, lineHeight: 1.5 },
                  })),
            actionLabel: '问进展',
            placeholder: '你想问这件事的什么？',
            deskSession: session,
            onSubmit: (text: string) => {
              sendPrompt(`关于在跟的事「${String(thread.title ?? thread.id ?? '')}」：${text}`, '问进展', String(thread.id), session)
            },
            actions: [
              { label: '先放放', run: () => { parkThread(String(thread.title ?? thread.id ?? ''), String(thread.id), session) } },
              { label: '收了', run: () => { closeThread(String(thread.title ?? thread.id ?? ''), String(thread.id), session) }, destructive: true },
            ],
          }))),

      sectionTitle('它最近做了什么'),
      (data?.recentActivity ?? []).length === 0
        ? muted('（还没有可讲的变动）')
        : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.8 } },
            ...(data?.recentActivity ?? []).map((item, index) => createElement('li', { key: `${String(item.at)}-${index}` },
              // Round 3 (2026-09-27): the live desk's longest activity row measured 173px — the
              // clamp-and-expand treatment R7 gave lean/why/它记, extended here after real data
              // showed this section carries long rows too. The timestamp rides inside the clamped
              // line so it stays visible at the head of the first line.
              createElement(ClampedText, {
                text: `${item.at === undefined || item.at === '' ? '' : `${shortTime(item.at)} `}${String(item.what ?? '')}`,
                maxLines: 3,
              })))),

      // R7: the counts carried no date of their own, while the desk's staleness line sits screens
      // above them in the narrow pane. The number and the moment it was counted travel together.
      sectionTitle(`我记住的规模${data?.generatedAt === undefined ? '' : ` · ${shortTime(String(data.generatedAt))}`}`),
      // R9: a count that could not open its panel says so, right under the numbers it belongs to.
      store.jumpError === undefined
        ? null
        : createElement('div', { style: { fontSize: '11px', color: 'var(--dsha-warn)', margin: '0 16px 6px' } }, store.jumpError),
      createElement('div', null,
        cell('记忆', data?.counts?.memories === undefined ? '—' : String(data.counts.memories), 'memoryRoom'),
        cell('知识', data?.counts?.knowledgeStable === undefined ? '—' : String(data.counts.knowledgeStable), 'knowledgeRoom'),
        cell('技能', data?.counts?.skills === undefined ? '—' : String(data.counts.skills), 'knowledgeRoom'),
        cell('在跟的事', data?.counts?.threads === undefined ? '—' : String(data.counts.threads))),
      ...panelAlerts(store),
      createElement('div', null,
        createElement('div', {
          title: `桌面跟随你当前对话的工作区${store.source === undefined || store.source === '' ? '' : `：${store.source}`}——换一个对话，这里显示的就是那一个的桌面。`,
          style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', margin: 0 },
        }, `桌面跟随当前对话的工作区`
          + (store.data?.generatedAt === undefined ? '' : `，更新于 ${shortTime(store.data.generatedAt)}`)
          + '（换一个对话，桌面跟着换）')))
  }

  /** Panel 2 — the knowledge room: what the assistant knows, and what is waiting for review. */
  function KnowledgePanel(props?: { sessionId?: string }): unknown {
    const session = props?.sessionId
    const store = useDesk(session)
    const { useEffect, useRef } = require('react') as typeof import('react')
    const draftsAnchor = useRef<{ current?: { scrollIntoView?: (options?: unknown) => void } | null } | null>(null)
    useEffect(() => {
      if (store.focusKnowledge !== 'drafts') return
      try {
        const node = draftsAnchor.current as { scrollIntoView?: (options?: unknown) => void } | null | undefined
        node?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
      } catch {
        // No DOM (tests) or scroll refused: the highlight still marks the block.
      }
      const timer = setTimeout(() => { patchDesk({ focusKnowledge: undefined }) }, 4000)
      return () => { clearTimeout(timer) }
    }, [store.focusKnowledge])
    const pages = store.data?.knowledge ?? []
    const drafts = pages.filter(page => page.status === 'draft')
    const stable = pages.filter(page => page.status === 'stable')
    // Deprecated pages are their own group: they stay in place so links resolve, and they are not
    // "confirmed" — lumping them in with stable pages would overstate what the assistant knows.
    const deprecated = pages.filter(page => page.status === 'deprecated')
    const row = (page: typeof pages[number], mark: string): ReturnType<typeof createElement> =>
      createElement(CorrectableRow, {
        key: String(page.id),
        rowId: String(page.id ?? page.title),
        primary: createElement('span', null, mark, String(page.title ?? page.id ?? '')),
        // The excerpt rides only on draft rows: that is where the approve decision happens, and
        // the excerpt is what turns a blind approval into an informed one (CEO friction #2).
        meta: [page.type === undefined ? '' : String(page.type), shortTime(page.updated)].filter(part => part !== '').join(' · '),
        excerpt: page.status === 'draft' ? page.excerpt : undefined,
        actionLabel: '有问题',
        placeholder: '哪里不对？',
        deskSession: session,
        source: (page.sources ?? []).join(' · '),
        onSubmit: (text: string) => { flagKnowledgePage(String(page.title ?? page.id ?? ''), text, String(page.id ?? page.title), session) },
        actions: page.status === 'draft'
          ? [{ label: '批准', run: () => { approveKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title), session) } }]
          : page.status === 'stable'
            ? [{ label: '过时了', run: () => { deprecateKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title), session) }, destructive: true }]
            : undefined,
      })
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '知识室'),
      createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '你凭什么这样判断？——依据、来源、待确认的草稿'),
      refreshRow(store),
      pages.length === 0
        ? muted('（还没有知识页，或桌面文件尚未刷新）')
        : createElement('div', null,
            sectionTitle(`待你审批（${drafts.length}）`),
            drafts.length === 0
              ? muted('（没有草稿在等）')
              : createElement('div', {
                  ref: store.focusKnowledge === 'drafts' ? draftsAnchor : undefined,
                  style: store.focusKnowledge === 'drafts'
                    ? { background: 'var(--dsha-warn-tint)', borderRadius: '6px', padding: '6px 8px', margin: '0 -8px' }
                    : undefined,
                },
                store.focusKnowledge === 'drafts'
                  // Surface-neutral on purpose: the pointer now has two senders (the desk's
                  // draft line and the composer's approval banner), so the text must not
                  // claim the principal came from the desk.
                  ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsha-warn)', marginBottom: '4px' } }, '↑ 你刚点过来的那批')
                  : null,
                createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsha-warn)' } },
                  ...drafts.map(page => row(page, '⚠ ')))),
            // Inline skill proposals (B2, 2026-10-06): the review inbox rides the same panel as
            // the knowledge drafts — one-click approve/reject in place, no separate chore. The
            // proposals come from the desk file's `knowledge` section (drafts the assistant
            // proposes as skills, not pages); each row carries CorrectableRow for the reject
            // reason and one-click approve, same shape as the knowledge draft rows above.
            (store.data?.knowledge ?? []).some(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed')
              ? createElement('div', null,
                  sectionTitle(`技能提案（${(store.data?.knowledge ?? []).filter(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed').length}）`),
                  ...(store.data?.knowledge ?? [])
                    .filter(item => (item as { kind?: string, status?: string }).kind === 'skill-proposal' && (item as { status?: string }).status === 'proposed')
                    .map(item => createElement(CorrectableRow, {
                      key: String(item.id ?? item.title),
                      rowId: `proposal-${String(item.id ?? item.title)}`,
                      primary: createElement('span', null,
                        createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.title ?? item.id ?? '')),
                        (item as { description?: string }).description !== undefined
                          ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 400 } }, String((item as { description?: string }).description))
                          : null),
                      actionLabel: '批准',
                      placeholder: '不批准的理由（可选，会记进提案文件）',
                      deskSession: session,
                      onSubmit: (text: string) => {
                        if (text.trim() === '') {
                          askApproveProposal(String(item.title ?? item.id ?? ''), session)
                        } else {
                          askRejectProposal(String(item.title ?? item.id ?? ''), text, session)
                        }
                      },
                      actions: [{ label: '批准', run: () => { askApproveProposal(String(item.title ?? item.id ?? ''), session) } }],
                    })))
              : null,
            sectionTitle(`已确认（${stable.length}）`),
            stable.length === 0
              ? muted('（还没有已确认的知识页）')
              : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)' } },
                  ...stable.map(page => row(page, '✓ '))),
            deprecated.length === 0
              ? null
              : createElement('div', null,
                  sectionTitle(`已退役（${deprecated.length}）`),
                  createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)' } },
                    ...deprecated.map(page => row(page, '— '))))),
      sectionTitle('技能'),
      (store.data?.skills ?? []).length === 0
        ? muted('（还没有技能）')
        // A count, not a list: the principal cannot judge `repo-to-knowledge`, and the descriptions
        // are model-facing English (repository rule), so a 71-line English list is noise on their
        // surface — content eligibility before layout (2026-09-26 reviews).
        : muted(`共 ${String((store.data?.skills ?? []).length)} 件（随包 ${String((store.data?.skills ?? []).filter(skill => skill.kind !== 'learned').length)} · 学来的 ${String((store.data?.skills ?? []).filter(skill => skill.kind === 'learned').length)}）——哪一件不想要了，在对话里说一声即可下掉`),
      ...panelAlerts(store))
  }

  /**
   * The memory room, grouped by what the record is about — the split a digital twin lives on:
   * how the principal works (preferences and their decisions) versus the world it learned (facts).
   * One flat list hides that; a kind label per row is not enough to scan by.
   * @param memories - Every active record the desk file carries.
   * @returns Section headings and rows, as an element array to spread.
   */
  function memoryGroups(memories: NonNullable<DeskData['memories']>, session?: string): ReturnType<typeof createElement>[] {
    const groups: { key: string, label: string }[] = [
      { key: 'preference', label: '你的偏好' },
      { key: 'decision', label: '你的决定' },
      { key: 'fact', label: '事实' },
    ]
    const known = new Set(groups.map(group => group.key))
    const rest = memories.filter(memory => !known.has(String(memory.kind ?? '')))
    const out: ReturnType<typeof createElement>[] = []
    for (const group of [...groups, { key: '__rest', label: '其它' }]) {
      const items = group.key === '__rest'
        ? rest
        : memories.filter(memory => String(memory.kind ?? '') === group.key)
      if (items.length === 0) continue
      out.push(sectionTitle(`${group.label}（${items.length}）`))
      out.push(createElement('ul', { key: group.key, style: { margin: 0, padding: 0 } },
        ...items.map(memory => createElement(CorrectableRow, {
          key: String(memory.id),
          rowId: String(memory.id),
          primary: String(memory.text ?? ''),
          meta: shortTime(memory.updated),
          actionLabel: '这条记错了',
          placeholder: '正确的是什么？',
          deskSession: session,
          source: memory.source,
          onSubmit: (text: string) => { correctMemory(String(memory.text ?? ''), text, String(memory.id), session) },
        }))))
    }
    return out
  }

  /** Panel 3 — the memory room: what the assistant has written down about the principal. */
  function MemoryPanel(props?: { sessionId?: string }): unknown {
    const session = props?.sessionId
    const store = useDesk(session)
    const memories = store.data?.memories ?? []
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '记忆室'),
      createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' } }, '你把我理解成什么？——偏好、决定、事实，每条可纠错'),
      refreshRow(store, session),
      memories.length === 0
        ? muted('（还没有记忆，或桌面文件尚未刷新）')
        : createElement('div', null, ...memoryGroups(memories, session)),
      sectionTitle('规模'),
      createElement('div', null,
        cell('记忆', store.data?.counts?.memories === undefined ? '—' : String(store.data.counts.memories)),
        cell('在跟的事', store.data?.counts?.threads === undefined ? '—' : String(store.data.counts.threads))),
      ...panelAlerts(store))
  }

  /** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
  const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote', 'remote.agentPresets', 'remote.workspaceFiles', 'remote.session']

  /**
   * Build the typert contribution the client mounts for the knowledge-approve direct-call lane.
   * Hand-written (the vendor generator targets tsdown builds; this package builds with tsc), and
   * using the `src-json` codec mode — TypertCodec's union offers a no-schema shape exactly so a
   * plain-JSON caller does not need a materialized zod schema, which a classic-script
   * contribution cannot reach.
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
   * Register the brand occupants as one declaration-aware set.
   * @param ctx - Browser root context.
   */
  /** The remote layer captured in apply; DeskPanel reads manifested namespaces through it. */
  let deskRemote: Record<string, unknown> | undefined
  /** The client Session store; its list snapshot is already synced and needs no Remote call. */
  let deskSessions: { list?: { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void } } | undefined
  /** The right-sidebar controller, so a page can open a room tab beside the conversation. */
  let deskSidebarRight: { openTab: (kind: string, options?: { params?: unknown }) => void } | undefined

  function apply(ctx: ClientContext): void {
    deskRemote = (ctx as { remote?: Record<string, unknown> }).remote
    deskSessions = (ctx as { sessions?: typeof deskSessions }).sessions
    deskSidebarRight = ctx.sidebarRight
    ensureThemeVars()

    // The knowledge-approve direct-call lane (approve-direct-call): mount our contribution so
    // `remote.assistantKnowledge.approvePage` reaches the host service without a model round
    // trip. Failure degrades approveKnowledgePage to the legacy prompt path, announced in-panel.
    // This pin deterministically rejects the mount (strict codec vs classic-script contribution,
    // 261004-approve-direct-call) — the designed state until upstream moves, so the diagnostic
    // stays at info level: an error here would pollute every first open and trip the web-face
    // scenes' empty-console contract (first-open-draft-banner caught this on 2026-10-05).
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
    const store = deskSessions?.list
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
          if (deskStore.boundSessions.size === 0) loadDesk()
          for (const bound of deskStore.boundSessions) loadDeskFor(bound)
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
        inject: () => ({ openRoom: openBeside }),
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
  }

  // The occupants, the three panels, and the shared store are exposed for tests: the store is the
  // panels' only input, so a test that fills it can render every section without a browser.
  // `roomCommands` is exposed the same way — its contributions are pure values, so a test can
  // assert names, copy, and the room each one opens without a browser context. The first-mile
  // components are exposed because their copy and their button are the deliverable.
  return {
    inject, apply, AssistantBrandMark, AssistantBrandName,
    DeskPanel, KnowledgePanel, MemoryPanel, deskStore, deskSlice,
    DeskTabBody, DeskViewBody, KnowledgeTabBody, MemoryTabBody, AssistantDeskChip, roomTabTitle,
    roomCommands, AssistantHeroMark, FirstMileDock, ApprovalDockBanner, expirePending, settlePending, loadDeskFor, retireStaleReceipt, looksLikeDesk,
  }
}

const facade = (globalThis as { __ModuleLoader__?: ModuleLoaderFacade }).__ModuleLoader__
if (facade !== undefined) {
  facade.load({ id: 'dsh-smart-assistant', factory: clientFactory })
}
