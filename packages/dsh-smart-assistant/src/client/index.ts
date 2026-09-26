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
 * equivalent keeps the tsc-only build. scripts/verify.mjs gates both the source and the
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
const BRAND_NAME = 'DSH local assistant'

/** Mark color, shared with the tab favicon injected by `src/web-branding.ts`. */
const MARK_TEAL = '#0d9488'

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
       * anything else (including a missing field) is the assistant's own upkeep and never reaches
       * the lead card. Contract rule: at most one business decision leads.
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
    knowledge?: { id?: string, title?: string, status?: string, type?: string, updated?: string, sources?: string[] }[]
    skills?: { name?: string, description?: string, kind?: string }[]
  }

  /**
   * One desk decision as the file carries it.
   * @see DeskData.decisions for the `kind` rule that keeps upkeep off the lead card.
   */
  type DeskDecision = NonNullable<DeskData['decisions']>[number]

  /**
   * Shared desk state: one loader, three panels. The panels are separate sidebar entries, so
   * they must not each re-fetch; the store is the single owner and notifies its subscribers.
   */
  const deskStore: {
    data?: DeskData | undefined
    note?: string | undefined
    source?: string | undefined
    /** The action in flight: which row, when it left, what it was. The DATA GATE — buttons stay
     *  frozen until the desk file is rewritten past `at`. The prompt promise resolving only means
     *  the queue accepted the message; the assistant then works for tens of seconds, and a freeze
     *  that lifts at acceptance invites repeat clicks (real use queued one decision three times
     *  and left an action with seven contradictory orders — reviews, 2026-09-26). */
    pending?: { rowId: string, at: number, action: string } | undefined
    /** Receipt of the last action the desk file confirmed, shown on its row. */
    lastReceipt?: { rowId: string, action: string, at: number } | undefined
    /** The newest Session's updatedAt, so the panels can say when they are behind the conversation. */
    sessionUpdatedAt?: number | undefined
    /** The Session whose workspace answered the last load — a tab bound to another session withholds this data. */
    sourceSession?: string | undefined
    /** The Session a tab bound actions to; set while a tab is mounted, so sends land in its own conversation. */
    sendSession?: string | undefined
    listeners: Set<() => void>
  } = { listeners: new Set() }
  const patchDesk = (next: Partial<typeof deskStore>): void => {
    Object.assign(deskStore, next)
    for (const listener of [...deskStore.listeners]) listener()
  }

  /** Monotonic load sequence: a newer load invalidates every attempt of the older one. */
  let deskLoadSeq = 0
  /** Sessions whose workspace is known to have no desk file, so a bound tab can say so instead of spinning. */
  const deskMisses = new Set<string>()

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
    const attempt = async (index: number): Promise<void> => {
      if (seq !== deskLoadSeq) return
      if (index >= ordered.length) {
        patchDesk({ note: '最近 5 个会话的工作区里都没有 .desk/state.json——点「刷新桌面」让助手写一份' })
        return
      }
      const sessionId = ordered[index] as string
      try {
        const result = await read(sessionId, '.desk/state.json', {})
        const wrapped = result as { ok?: boolean, value?: { text?: string } }
        const text = wrapped?.ok === false ? undefined : wrapped?.value?.text
        if (typeof text !== 'string' || text.trim() === '') {
          await attempt(index + 1)
          return
        }
        const parsed = JSON.parse(text) as DeskData
        patchDesk({ data: parsed, note: undefined, source: byId[sessionId]?.cwd ?? '', sourceSession: sessionId })
        deskMisses.delete(sessionId)
        settlePending(parsed.generatedAt)
      } catch {
        await attempt(index + 1)
      }
    }
    void attempt(0)
  }

  /** Subscribe one panel to the shared desk store. */
  function useDesk(): typeof deskStore {
    const { useEffect, useState } = require('react') as typeof import('react')
    const [snapshot, setSnapshot] = useState({ ...deskStore })
    useEffect(() => {
      const update = (): void => setSnapshot({ ...deskStore })
      deskStore.listeners.add(update)
      update()
      return () => { deskStore.listeners.delete(update) }
    }, [])
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

  /** A finished load settles the pending action: the file moving past `at` is the completion signal. */
  function settlePending(generatedAt: string | undefined): void {
    const pending = deskStore.pending
    if (pending === undefined) return
    const generated = deskGeneratedAtMs({ generatedAt } as DeskData)
    if (generated === undefined || generated <= pending.at) return
    patchDesk({ pending: undefined, lastReceipt: { rowId: pending.rowId, action: pending.action, at: Date.now() } })
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
  function sendPrompt(text: string, action: string, rowId: string): void {
    const prompt = (deskRemote?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
    // A tab bound to session X must send to X: a correction typed beside one conversation that
    // lands in another would read as the assistant ignoring what was just pointed at.
    const sessionId = deskStore.sendSession ?? newestSessionId()
    if (sessionId === undefined) {
      patchDesk({ note: '还没有会话——先和助手说句话' })
      return
    }
    if (prompt === undefined) {
      patchDesk({ note: 'remote.session did not materialize' })
      return
    }
    patchDesk({ pending: { rowId, at: Date.now(), action }, lastReceipt: undefined })
    void prompt({
      requestId: `desk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text }],
    }).then((result: unknown) => {
      const wrapped = result as { ok?: boolean, error?: { message?: string } }
      if (wrapped?.ok === false) {
        patchDesk({ pending: undefined, note: wrapped.error?.message ?? 'prompt failed' })
      }
    }).catch((reason: unknown) => {
      patchDesk({ pending: undefined, note: String(reason) })
    })
    let tries = 0
    const tick = (): void => {
      if (deskStore.pending === undefined || tries >= 15) return
      tries += 1
      reloadDesk()
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
  function askRefresh(): void {
    sendPrompt('刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。', '刷新桌面', 'desk')
  }

  /**
   * Answer one open decision. The mirror of a correction: there the principal says a record is
   * wrong, here they say what they have decided — and the assistant records the call and moves.
   */
  function answerDecision(question: string, answer: string, rowId: string): void {
    sendPrompt(
      `关于这个待决事项：「${question}」——我的决定是：${answer}。请记住它、据此更新你的判断。${DESK_REFRESH_STEP}`,
      '回答', rowId,
    )
  }

  /** Put one open decision to the assistant and ask for options with their costs. */
  function askAboutDecision(question: string, rowId: string): void {
    sendPrompt(`关于这个待决事项：「${question}」——请给我两三个选项，每个选项的代价与不可逆程度，以及你的建议。`,
      '看选项', rowId)
  }

  /**
   * Close one action: the principal reports it is done, and the assistant records the outcome
   * rather than leaving a finished item sitting in flight.
   */
  function finishAction(what: string, rowId: string): void {
    sendPrompt(
      `行动「${what}」已经办完了。请记录结果（度量上发生了什么）。${DESK_REFRESH_STEP}`,
      '办完了', rowId,
    )
  }

  /** Drop one action: no longer worth doing — the assistant records why and takes it off the list. */
  function dropAction(what: string, rowId: string): void {
    sendPrompt(
      `行动「${what}」不办了：请记一行原因（写进相应线索或记忆）。${DESK_REFRESH_STEP}`,
      '不办了', rowId,
    )
  }

  /**
   * Park one thread: still valid, not now. The research room's middle exit, offered where the
   * principal sees the thread rather than only in chat.
   */
  function parkThread(title: string, rowId: string): void {
    sendPrompt(
      `线索「${title}」先放一放（park）：现在不推，但别丢。${DESK_REFRESH_STEP}`,
      '先放放', rowId,
    )
  }

  /** Close one thread: answered, moot, or not worth it — the assistant promotes or drops it. */
  function closeThread(title: string, rowId: string): void {
    sendPrompt(
      `线索「${title}」可以收了：请判断该 promote（变成记忆/知识页/技能）还是 drop（写一行原因），`
      + `做完告诉我你归到了哪里。${DESK_REFRESH_STEP}`,
      '收了', rowId,
    )
  }

  /**
   * Correct one memory record. This is the cultivation loop: the principal says which line is
   * wrong and what is right, and the assistant rewrites the record and refreshes the desk.
   */
  function correctMemory(text: string, correction: string, rowId: string): void {
    sendPrompt(
      `请更正这条记忆。原记录：「${text}」。正确的是：${correction}。${DESK_REFRESH_STEP}`,
      '更正', rowId,
    )
  }

  /**
   * Approve one draft knowledge page. The counterpart of a correction: the principal says the page
   * is right, and the assistant promotes it so it starts counting in retrieval and the digest.
   */
  function approveKnowledgePage(title: string, rowId: string): void {
    sendPrompt(
      `我批准知识页「${title}」。请把它从 draft 翻成 stable。${DESK_REFRESH_STEP}`,
      '批准', rowId,
    )
  }

  /**
   * Mark one stable knowledge page past its use-by date. The page stays in place (links resolve)
   * but stops counting as current — the third lifecycle step beside approval and correction.
   */
  function deprecateKnowledgePage(title: string, rowId: string): void {
    sendPrompt(
      `知识页「${title}」过时了，请把它标记为 deprecated（保留在原处以便链接解析）。${DESK_REFRESH_STEP}`,
      '过时了', rowId,
    )
  }

  /** Tell the assistant what is wrong with one knowledge page. */
  function flagKnowledgePage(title: string, problem: string, rowId: string): void {
    sendPrompt(
      `知识页「${title}」有问题：${problem}。请核对并更正这一页。${DESK_REFRESH_STEP}`,
      '提意见', rowId,
    )
  }

  /**
   * One row the principal can correct in place: the content, a small action, and — once opened —
   * an input plus send. Inline on purpose: pointing at the wrong line and typing the fix is one
   * gesture, which is what "cultivating the assistant" actually costs.
   */
  function CorrectableRow(props: {
    primary: ReturnType<typeof createElement> | string
    meta?: string | undefined
    actionLabel: string
    placeholder: string
    onSubmit: (text: string) => void
    actions?: { label: string, run: () => void, destructive?: boolean }[] | undefined
    source?: string | undefined
    /** Lead variant: the one item the desk points at first, rendered larger. */
    lead?: boolean
    /** This row's identity: the in-flight receipt and the settled receipt land on the row acted on. */
    rowId?: string | undefined
  }): ReturnType<typeof createElement> {
    const { useState } = require('react') as typeof import('react')
    const store = useDesk()
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [armed, setArmed] = useState<string | undefined>(undefined)
    // The DATA GATE: buttons freeze until the desk file is rewritten past the send — not until the
    // queue accepts it (acceptance is milliseconds; the work is tens of seconds. Real use queued a
    // decision three times and left an action with seven contradictory orders).
    const frozen = pendingInFlight(store)
    const inflight = store.pending?.rowId === props.rowId && store.pending !== undefined && frozen
    const receipt = store.lastReceipt?.rowId === props.rowId ? store.lastReceipt : undefined
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
    return createElement('li', { style: { marginBottom: '10px', listStyle: 'none' } },
      createElement('div', { style: { fontSize: props.lead === true ? '16px' : '13px', lineHeight: 1.6, color: props.lead === true ? '#111' : '#555' } }, props.primary),
      source === undefined
        ? null
        : createElement('div', {
            title: source,
            style: {
              fontSize: '11px', color: '#9a9a9a', marginTop: '2px', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '540px',
            },
          }, `来源：${source.length > 110 ? `${source.slice(0, 110)}…` : source}`),
      createElement('div', { style: { fontSize: '11px', color: '#aaa', marginTop: '2px' } },
        props.meta === undefined || props.meta === '' ? null : props.meta,
        ...(props.actions ?? []).map(action => {
          // A destructive move asks twice: one click arms it for three seconds ("确认…？"), the
          // second click sends. The record itself is recoverable (history/archives), and the
          // confirm label says so — reversibility the principal can see.
          const fire = (): void => {
            if (action.destructive === true && armed !== action.label) {
              setArmed(action.label)
              setTimeout(() => { setArmed(current => current === action.label ? undefined : current) }, 3000)
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
              marginLeft: '8px', padding: '0 8px', fontSize: '11px',
              cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
              border: `1px solid ${armed === action.label ? '#b26a00' : MARK_TEAL}`,
              borderRadius: '4px', background: '#fff', color: armed === action.label ? '#b26a00' : MARK_TEAL,
            },
          }, label)
        }),
        createElement('button', {
          onClick: () => { setOpen(!open) },
          disabled: frozen,
          style: {
            marginLeft: '8px', padding: '0 6px', fontSize: '11px',
            cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
            border: '1px solid #ddd', borderRadius: '4px', background: '#fff', color: '#888',
          },
        }, open ? '取消' : props.actionLabel)),
      inflight === false ? null : createElement('div', {
        style: { fontSize: '12px', color: '#888', marginTop: '4px' },
      }, `已交给助手 · ${shortTime(new Date(store.pending?.at ?? Date.now()).toISOString())} · ${String(store.pending?.action ?? '')}——正在处理，回复出现在对话里`),
      receipt === undefined ? null : createElement('div', {
        style: { fontSize: '12px', color: MARK_TEAL, marginTop: '4px' },
      }, `✓ 已更新 · ${shortTime(new Date(receipt.at).toISOString())}`),
      open
        ? createElement('div', { style: { marginTop: '6px', display: 'flex', gap: '6px' } },
            createElement('input', {
              value: text,
              onChange: (event: { target: { value: string } }) => { setText(event.target.value) },
              onKeyDown: (event: { key: string }) => { if (event.key === 'Enter') submit() },
              placeholder: props.placeholder,
              style: {
                flex: '1', padding: '5px 8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px',
              },
            }),
            createElement('button', {
              onClick: submit,
              disabled: frozen,
              style: {
                padding: '5px 12px', fontSize: '12px',
                cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
                borderRadius: '4px', border: `1px solid ${MARK_TEAL}`, background: '#fff', color: MARK_TEAL,
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

  /** Re-read the desk for whoever is bound: a tab reloads its own session, the pages walk the newest five. */
  function reloadDesk(): void {
    if (deskStore.sendSession === undefined) loadDesk()
    else loadDeskFor(deskStore.sendSession)
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
    const seq = ++deskLoadSeq
    void (async (): Promise<void> => {
      const state = deskSessions?.list?.getSnapshot() as { byId?: Record<string, { cwd?: string }> } | undefined
      const cwd = state?.byId?.[sessionId]?.cwd ?? ''
      try {
        const result = await read(sessionId, '.desk/state.json', {})
        if (seq !== deskLoadSeq) return
        const wrapped = result as { ok?: boolean, value?: { text?: string } }
        const text = wrapped?.ok === false ? undefined : wrapped?.value?.text
        if (typeof text !== 'string' || text.trim() === '') {
          deskMisses.add(sessionId)
          return
        }
        deskMisses.delete(sessionId)
        const parsed = JSON.parse(text) as DeskData
        patchDesk({ data: parsed, note: undefined, source: cwd, sourceSession: sessionId })
        settlePending(parsed.generatedAt)
      } catch {
        // Keep the previous data; a failed read must not blank the room. The bound tab's guard
        // keeps showing "reading" rather than another session's desk.
        if (seq === deskLoadSeq) patchDesk({ note: `读桌面文件失败（${cwd === '' ? '本会话工作区' : cwd}）` })
      }
    })()
  }

  /** Open one room as a right-sidebar tab beside the conversation (the approved form). */
  function openBeside(kind: string): void {
    const controller = deskSidebarRight
    if (controller === undefined || controller.openTab === undefined) {
      patchDesk({ note: 'sidebarRight 服务没有物化，开不了对话旁的 tab' })
      return
    }
    // Call THROUGH the controller, never through a detached reference: the vendor's openTab starts
    // with `this.require()`, so a bare function call loses the receiver and throws. Runtime-proven
    // 2026-09-26 (独立体验反馈): "Cannot read properties of undefined (reading 'require')" — the
    // approved right-tab form never opened for a real click.
    controller.openTab(kind)
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
  function tabBody(props: TabBodyProps, Panel: () => unknown): ReturnType<typeof createElement> {
    const { useEffect } = require('react') as typeof import('react')
    const store = useDesk()
    const sessionId = props.sessionId ?? props.useTabInfo?.()?.tab?.navigation?.params?.sessionId
    useEffect(() => {
      if (sessionId === undefined) return
      if (store.sourceSession !== sessionId) loadDeskFor(sessionId)
      // Bind this tab's actions to the session it lives in — and unbind on unmount, so a later
      // main-page send falls back to the newest session instead of a dead tab's target.
      deskStore.sendSession = sessionId
      return () => {
        if (deskStore.sendSession === sessionId) deskStore.sendSession = undefined
      }
    }, [sessionId, store.sourceSession])
    if (sessionId === undefined) return muted('这个 tab 没有落在任何会话里，读不到它的工作区')
    if (deskMisses.has(sessionId)) return muted('这个会话的工作区还没有 .desk/state.json——回到对话说一声「刷新我的桌面」')
    if (store.sourceSession !== sessionId) return muted('正在读这个会话的桌面…')
    return createElement(Panel as unknown as import('react').FunctionComponent)
  }

  /** Tab bodies: the same three rooms the main pages render, bound to their own session. */
  function DeskTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
    return tabBody(props, DeskPanel)
  }
  function KnowledgeTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
    return tabBody(props, KnowledgePanel)
  }
  function MemoryTabBody(props: TabBodyProps): ReturnType<typeof createElement> {
    return tabBody(props, MemoryPanel)
  }

  /** The opener where the principal already is: a chip in the Session header beside the conversation. */
  function AssistantDeskChip(): ReturnType<typeof createElement> {
    return createElement('button', {
      onClick: () => { openBeside('desk') },
      title: '在对话旁打开我的桌面',
      style: {
        border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: '12px', color: MARK_TEAL, padding: '2px 6px',
      },
    }, '桌面')
  }

  /** A stat cell; with a target it becomes the way to the panel that explains the number. */
  function cell(label: string, value: string, target?: string): ReturnType<typeof createElement> {
    const jump = (): void => {
      if (target === undefined) return
      try {
        deskLayout?.selectPanel?.(target)
      } catch {
        // selectPanel throws for an unregistered panel; a stale target must not break the panel.
      }
    }
    const style: Record<string, unknown> = {
      display: 'inline-block', margin: '8px 16px', textAlign: 'center' as const,
    }
    if (target !== undefined) Object.assign(style, { cursor: 'pointer' })
    return createElement('div', { style, onClick: jump, title: target === undefined ? undefined : '打开这个面板' },
      createElement('div', { style: { fontSize: '26px', fontWeight: 700, color: MARK_TEAL } }, value),
      createElement('div', { style: { fontSize: '12px', color: '#666', textDecoration: target === undefined ? 'none' : 'underline' } }, label))
  }

  /** A section heading. */
  function sectionTitle(text: string): ReturnType<typeof createElement> {
    return createElement('h3', { style: { margin: '20px 0 8px', fontSize: '13px', color: '#888', fontWeight: 600 } }, text)
  }

  /** Muted one-liner. */
  function muted(text: string): ReturnType<typeof createElement> {
    return createElement('p', { style: { fontSize: '12px', color: '#999', margin: 0 } }, text)
  }

  /** One quick-action button in the shared row. */
  function quickButton(label: string, hint: string, run: () => void): ReturnType<typeof createElement> {
    return createElement('button', {
      onClick: run,
      title: hint,
      style: {
        marginRight: '8px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
        border: '1px solid #ddd', borderRadius: '6px', background: '#fff', color: '#555',
      },
    }, label)
  }

  /** The quick actions every panel carries: the whole-point-of-a-desk prompts, one click each. */
  function quickActions(): ReturnType<typeof createElement> {
    return createElement('div', { style: { marginTop: '8px' } },
      quickButton('回顾一下', '让助手回顾最近的决定、在跟的事与它新学到的东西',
        () => { sendPrompt('回顾一下：我们最近决定了什么、还有什么在跟、你新学到了什么？', '回顾', 'desk') }),
      quickButton('体检', '让助手跑一次 curate，报告家的现状与需要你处理的事',
        () => { sendPrompt('跑一次 curate，报告家的现状与需要我处理的事。', '体检', 'desk') }))
  }

  /** The refresh button plus its status line, and — where the room can — the jump to the beside-conversation tab. */
  function refreshRow(store: typeof deskStore, tabKind?: string): ReturnType<typeof createElement> {
    const inFlight = pendingInFlight(store)
    return createElement('div', { style: { margin: '8px 0 0' } },
      createElement('button', {
        onClick: askRefresh,
        disabled: inFlight,
        style: {
          padding: '6px 14px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px',
          border: `1px solid ${MARK_TEAL}`, background: inFlight ? '#f2f2f2' : '#fff',
          color: MARK_TEAL,
        },
      }, '刷新桌面'),
      tabKind === undefined
        ? null
        : createElement('button', {
            onClick: () => { openBeside(tabKind) },
            title: '把这一室开到对话旁边的右侧栏（绑定当前会话）',
            style: {
              marginLeft: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
              borderRadius: '6px', border: '1px solid #ddd', background: '#fff', color: '#555',
            },
          }, '在对话旁打开'),
      inFlight === false
        ? null
        : createElement('span', { style: { marginLeft: '10px', fontSize: '12px', color: '#888' } },
            `已交给助手 · ${shortTime(new Date(store.pending?.at ?? Date.now()).toISOString())} · ${String(store.pending?.action ?? '')}——回复出现在对话里，桌面更新后自动跟上`))
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
  function DeskPanel(): unknown {
    const store = useDesk()
    const data = store.data
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '我的桌面'),
      refreshRow(store, 'desk'),
      quickActions(),

      // The principal's first question is "what NOW?" — real-use feedback (2026-09-26) was that a
      // pile of equal-weight rows never says where to start. So the desk answers with ONE lead
      // item (the first decision, enlarged, actions at hand) and the rest wait collapsed behind
      // an explicit toggle: nothing is hidden, but nothing competes with the one thing first.
      // The principal's first question is "what NOW?" — and the answer must be THEIR business, not the
      // assistant's upkeep. Two independent reviews (2026-09-26) found the lead card showing "should I
      // keep building this panel?": with no kind field it took decisions[0], i.e. whatever the model
      // wrote first. Contract: kind = "business" | "upkeep"; only business reaches the lead card, and
      // when there is none the desk says so honestly instead of promoting housekeeping.
      sectionTitle('从这开始'),
      (() => {
        const { useState } = require('react') as typeof import('react')
        const decisions = data?.decisions ?? []
        const [showRest, setShowRest] = useState(false)
        const [showUpkeep, setShowUpkeep] = useState(false)
        const business = decisions
          .filter(item => item.kind === 'business')
          .slice()
          .sort((left, right) => Number(left.rank ?? 0) - Number(right.rank ?? 0))
        const upkeep = decisions.filter(item => item.kind !== 'business')
        const draftCount = data?.counts?.knowledgeDraft ?? 0
        const lead = business[0]
        const rest = business.slice(1)
        const rowIdOf = (item: DeskDecision): string => String(item.id ?? item.question)
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
                  onClick: () => { answerDecision(String(item.question ?? ''), String(option.label ?? ''), rowId) },
                  style: {
                    padding: '4px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px',
                    border: `1px solid ${MARK_TEAL}`, background: '#fff', color: MARK_TEAL,
                  },
                }, String(option.label ?? ''))))
        const row = (item: DeskDecision, compact: boolean): ReturnType<typeof createElement> => {
          const rowId = rowIdOf(item)
          return createElement(CorrectableRow, {
            key: rowId,
            rowId,
            primary: createElement('span', null,
              createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.question ?? '')),
              compact || item.context === undefined || item.context === ''
                ? null
                : createElement('div', { style: { fontSize: '12px', color: '#888', fontWeight: 400 } }, String(item.context)),
              item.reply === undefined || item.reply === ''
                ? null
                : createElement('div', { style: { fontSize: '11px', color: '#999', marginTop: '4px' } }, `它说：${item.reply}`),
              optionButtons(item, rowId)),
            actionLabel: '回答',
            placeholder: '你的决定是什么？',
            onSubmit: (text: string) => { answerDecision(String(item.question ?? ''), text, rowId) },
            actions: [{ label: '看选项', run: () => { askAboutDecision(String(item.question ?? ''), rowId) } }],
          })
        }
        const fold = (label: string, toggle: () => void): ReturnType<typeof createElement> =>
          createElement('button', {
            onClick: toggle,
            style: {
              padding: '5px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
              border: '1px solid #ddd', background: '#fff', color: '#555',
            },
          }, label)
        return createElement('div', null,
          lead === undefined
            ? muted('目前没有需要你拍板的经营事项')
            : createElement('div', {
                style: {
                  border: `2px solid ${MARK_TEAL}`, borderRadius: '8px', background: '#f0fdfa',
                  padding: '12px 14px', margin: '8px 0',
                },
              },
              createElement('div', { style: { fontSize: '11px', fontWeight: 700, color: MARK_TEAL, letterSpacing: '1px' } }, '先办这件'),
              createElement(CorrectableRow, {
                lead: true,
                rowId: rowIdOf(lead),
                primary: createElement('span', null,
                  createElement('span', { style: { fontSize: '16px', fontWeight: 700, color: '#111' } }, String(lead.question ?? '')),
                  lead.context === undefined || lead.context === ''
                    ? null
                    : createElement('div', { style: { fontSize: '12px', color: '#666', fontWeight: 400, marginTop: '4px' } }, String(lead.context)),
                  lead.reply === undefined || lead.reply === ''
                    ? null
                    : createElement('div', { style: { fontSize: '11px', color: '#999', marginTop: '4px' } }, `它说：${lead.reply}`),
                  optionButtons(lead, rowIdOf(lead))),
                actionLabel: '回答',
                placeholder: '你的决定是什么？',
                onSubmit: (text: string) => { answerDecision(String(lead.question ?? ''), text, rowIdOf(lead)) },
                actions: [{ label: '看选项', run: () => { askAboutDecision(String(lead.question ?? ''), rowIdOf(lead)) } }],
              })),
          rest.length === 0
            ? null
            : createElement('div', { style: { marginTop: '8px' } },
                fold(showRest ? `收起其余 ${rest.length} 条` : `等你决定（还有 ${rest.length} 条）`, () => { setShowRest(!showRest) }),
                showRest === false ? null : createElement('div', null, ...rest.map(item => row(item, false)))),
          draftCount === 0
            ? null
            : createElement('div', {
                onClick: () => { try { deskLayout?.selectPanel?.('assistant-knowledge') } catch { /* stale target */ } },
                style: { fontSize: '13px', color: '#b26a00', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' },
              }, `⚠ ${String(draftCount)} 页知识在等你审批（点这里打开知识室）`),
          upkeep.length === 0
            ? null
            : createElement('div', { style: { marginTop: '8px' } },
                fold(showUpkeep ? `收起 ${upkeep.length} 条` : `助手自己的事（${upkeep.length}）`, () => { setShowUpkeep(!showUpkeep) }),
                showUpkeep === false ? null : createElement('div', null, ...upkeep.map(item => row(item, true)))))
      })(),

      // Actions split by state: the open ones are the working surface (each row carries its
      // correction and close-out actions); the done ones move to their own dimmed group — a plan
      // tracker that hides finished work hides the assistant's follow-through, which is the trust
      // question "did what you planned actually happen?" Dropped ones stay off the panel (recorded
      // on the plan page); they are a decision that was made, not work to look at.
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
                createElement('div', { style: { fontSize: '12px', color: '#666', fontWeight: 400 } },
                  [action.owner === undefined ? '' : `负责人：${action.owner}`,
                    action.due === undefined ? '' : `时点：${action.due}`].filter(part => part !== '').join(' · ')),
                action.metric === undefined || action.metric === ''
                  ? null
                  : createElement('div', { style: { fontSize: '11px', color: '#999', fontWeight: 400 } }, `度量：${action.metric}`),
                action.stop === undefined || action.stop === ''
                  ? null
                  : createElement('div', { style: { fontSize: '11px', color: '#999', fontWeight: 400 } }, `停止条件：${action.stop}`),
                action.note === undefined || action.note === ''
                  ? null
                  : createElement('div', { style: { fontSize: '11px', color: '#b26a00', fontWeight: 400, marginTop: '4px' } }, `它记：${action.note}`)),
              actionLabel: '改这条',
              placeholder: '哪里要改？',
              onSubmit: (text: string) => {
                sendPrompt(`行动「${String(action.what ?? '')}」要改：${text}。${DESK_REFRESH_STEP}`, '修改', String(action.id ?? action.what))
              },
              actions: [
                { label: '办完了', run: () => { finishAction(String(action.what ?? ''), String(action.id ?? action.what)) }, destructive: true },
                { label: '不办了', run: () => { dropAction(String(action.what ?? ''), String(action.id ?? action.what)) }, destructive: true },
              ],
            }))),
      (data?.actions ?? []).some(action => action.status === 'done')
        ? createElement('div', null,
            sectionTitle(`已办（${(data?.actions ?? []).filter(action => action.status === 'done').length}）`),
            createElement('div', null, ...(data?.actions ?? [])
              .filter(action => action.status === 'done')
              .map(action => createElement('div', {
                key: `done-${String(action.id ?? action.what)}`,
                style: { marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid #ddd' },
              },
              createElement('div', { style: { fontSize: '13px', color: '#888' } }, `✓ ${String(action.what ?? '')}`),
              [action.owner === undefined ? '' : String(action.owner),
                action.due === undefined ? '' : String(action.due)].filter(part => part !== '').length === 0
                ? null
                : createElement('div', { style: { fontSize: '11px', color: '#bbb' } },
                    [action.owner === undefined ? '' : `负责人：${action.owner}`,
                      action.due === undefined ? '' : `时点：${action.due}`].filter(part => part !== '').join(' · ')),
              action.note === undefined || action.note === ''
                ? null
                : createElement('div', { style: { fontSize: '11px', color: '#bbb', marginTop: '2px' } }, `它记：${action.note}`)))))
        : null,

      sectionTitle('缺什么'),
      (data?.gaps ?? []).length === 0
        ? muted('（没有卡住的事）')
        : createElement('div', null, ...(data?.gaps ?? []).map(item => createElement('div', {
            key: String(item.id),
            style: { marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid #999' },
          },
          createElement('div', { style: { fontSize: '13px' } }, String(item.what ?? '')),
          item.why === undefined || item.why === ''
            ? null
            : createElement('div', { style: { fontSize: '11px', color: '#999' } }, String(item.why))))),

      sectionTitle('在跟的事'),
      data?.threads === undefined || data.threads.length === 0
        ? muted('（暂时没有未决线索）')
        : createElement('div', null, ...data.threads.map(thread => createElement(CorrectableRow, {
            key: String(thread.id),
            rowId: String(thread.id),
            primary: createElement('span', null,
              createElement('div', { style: { fontSize: '13px', fontWeight: 600, lineHeight: 1.5 } },
                String(thread.title ?? thread.id ?? '')),
              createElement('div', { style: { fontSize: '12px', color: '#666', fontWeight: 400 } },
                '当前倾向：', String(thread.lean ?? '（未定）')),
              thread.why === undefined || thread.why === ''
                ? null
                : createElement('div', { style: { fontSize: '11px', color: '#aaa', fontWeight: 400, lineHeight: 1.5 } },
                    String(thread.why))),
            actionLabel: '问进展',
            placeholder: '你想问这条线索的什么？',
            onSubmit: (text: string) => {
              sendPrompt(`关于线索「${String(thread.title ?? thread.id ?? '')}」：${text}`, '问进展', String(thread.id))
            },
            actions: [
              { label: '先放放', run: () => { parkThread(String(thread.title ?? thread.id ?? ''), String(thread.id)) } },
              { label: '收了', run: () => { closeThread(String(thread.title ?? thread.id ?? ''), String(thread.id)) }, destructive: true },
            ],
          }))),

      sectionTitle('它最近做了什么'),
      (data?.recentActivity ?? []).length === 0
        ? muted('（还没有可讲的变动）')
        : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#666', lineHeight: 1.8 } },
            ...(data?.recentActivity ?? []).map((item, index) => createElement('li', { key: `${String(item.at)}-${index}` },
              item.at === undefined || item.at === ''
                ? null
                : createElement('span', { style: { color: '#aaa' } }, `${shortTime(item.at)} `),
              String(item.what ?? '')))),

      sectionTitle('我记住的规模'),
      createElement('div', null,
        cell('记忆', data?.counts?.memories === undefined ? '—' : String(data.counts.memories), 'assistant-memory'),
        cell('知识', data?.counts?.knowledgeStable === undefined ? '—' : String(data.counts.knowledgeStable), 'assistant-knowledge'),
        cell('技能', data?.counts?.skills === undefined ? '—' : String(data.counts.skills), 'assistant-knowledge'),
        cell('线索', data?.counts?.threads === undefined ? '—' : String(data.counts.threads))),
      store.note !== undefined
        ? muted(store.note)
        : createElement('div', null,
            muted(`读自 ${store.source === undefined || store.source === '' ? '会话工作区' : store.source} 的 .desk/state.json`
              + (store.data?.generatedAt === undefined ? '' : `（更新于 ${shortTime(store.data.generatedAt)}）`)),
            staleWarning(store) === undefined
              ? null
              : createElement('p', { style: { fontSize: '12px', color: '#b26a00', marginTop: '4px' } },
                  `⚠ ${staleWarning(store)}`)))
  }

  /** Panel 2 — the knowledge room: what the assistant knows, and what is waiting for review. */
  function KnowledgePanel(): unknown {
    const store = useDesk()
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
        meta: [page.type === undefined ? '' : String(page.type), shortTime(page.updated)].filter(part => part !== '').join(' · '),
        actionLabel: '有问题',
        placeholder: '哪里不对？',
        source: (page.sources ?? []).join(' · '),
        onSubmit: (text: string) => { flagKnowledgePage(String(page.title ?? page.id ?? ''), text, String(page.id ?? page.title)) },
        actions: page.status === 'draft'
          ? [{ label: '批准', run: () => { approveKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title)) } }]
          : page.status === 'stable'
            ? [{ label: '过时了', run: () => { deprecateKnowledgePage(String(page.title ?? page.id ?? ''), String(page.id ?? page.title)) }, destructive: true }]
            : undefined,
      })
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '知识室'),
      refreshRow(store, 'knowledgeRoom'),
      pages.length === 0
        ? muted('（还没有知识页，或桌面文件尚未刷新）')
        : createElement('div', null,
            sectionTitle(`待你审批（${drafts.length}）`),
            drafts.length === 0
              ? muted('（没有草稿在等）')
              : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: '#b26a00' } },
                  ...drafts.map(page => row(page, '⚠ '))),
            sectionTitle(`已确认（${stable.length}）`),
            stable.length === 0
              ? muted('（还没有已确认的知识页）')
              : createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: '#555' } },
                  ...stable.map(page => row(page, '✓ '))),
            deprecated.length === 0
              ? null
              : createElement('div', null,
                  sectionTitle(`已退役（${deprecated.length}）`),
                  createElement('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: '#aaa' } },
                    ...deprecated.map(page => row(page, '— '))))),
      sectionTitle('技能'),
      (store.data?.skills ?? []).length === 0
        ? muted('（还没有技能）')
        // A count, not a list: the principal cannot judge `repo-to-knowledge`, and the descriptions
        // are model-facing English (repository rule), so a 71-line English list is noise on their
        // surface — content eligibility before layout (2026-09-26 reviews).
        : muted(`共 ${String((store.data?.skills ?? []).length)} 件（随包 ${String((store.data?.skills ?? []).filter(skill => skill.kind !== 'learned').length)} · 学来的 ${String((store.data?.skills ?? []).filter(skill => skill.kind === 'learned').length)}）——要退役哪一件，在对话里说一声即可`),
      store.note === undefined ? null : muted(store.note))
  }

  /**
   * The memory room, grouped by what the record is about — the split a digital twin lives on:
   * how the principal works (preferences and their decisions) versus the world it learned (facts).
   * One flat list hides that; a kind label per row is not enough to scan by.
   * @param memories - Every active record the desk file carries.
   * @returns Section headings and rows, as an element array to spread.
   */
  function memoryGroups(memories: NonNullable<DeskData['memories']>): ReturnType<typeof createElement>[] {
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
          source: memory.source,
          onSubmit: (text: string) => { correctMemory(String(memory.text ?? ''), text, String(memory.id)) },
        }))))
    }
    return out
  }

  /** Panel 3 — the memory room: what the assistant has written down about the principal. */
  function MemoryPanel(): unknown {
    const store = useDesk()
    const memories = store.data?.memories ?? []
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '记忆室'),
      refreshRow(store, 'memoryRoom'),
      memories.length === 0
        ? muted('（还没有记忆，或桌面文件尚未刷新）')
        : createElement('div', null, ...memoryGroups(memories)),
      sectionTitle('规模'),
      createElement('div', null,
        cell('记忆', store.data?.counts?.memories === undefined ? '—' : String(store.data.counts.memories)),
        cell('线索', store.data?.counts?.threads === undefined ? '—' : String(store.data.counts.threads))),
      store.note === undefined ? null : muted(store.note))
  }

  /** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
  const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'layout', 'remote', 'remote.agentPresets', 'remote.workspaceFiles', 'remote.session']

  /**
   * Register the brand occupants as one declaration-aware set.
   * @param ctx - Browser root context.
   */
  /** The remote layer captured in apply; DeskPanel reads manifested namespaces through it. */
  let deskRemote: Record<string, unknown> | undefined
  /** The client Session store; its list snapshot is already synced and needs no Remote call. */
  let deskSessions: { list?: { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void } } | undefined
  /** Main-panel navigation, so a count can jump to the panel that explains it. */
  let deskLayout: { selectPanel?: (panelId: string) => void } | undefined
  /** The right-sidebar controller, so a page can open a room tab beside the conversation. */
  let deskSidebarRight: { openTab: (kind: string, options?: { params?: unknown }) => void } | undefined

  function apply(ctx: ClientContext): void {
    deskRemote = (ctx as { remote?: Record<string, unknown> }).remote
    deskSessions = (ctx as { sessions?: typeof deskSessions }).sessions
    deskLayout = (ctx as { layout?: typeof deskLayout }).layout
    deskSidebarRight = ctx.sidebarRight

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

    // Experiment 1b (corrected shape, learned from ui-schedule's registration):
    // panellist entries use inject + register with id/order/label in the declaration,
    // and the panel body registers in the 'main' keyed slot under the same id.
    const panels = [
      { id: 'assistant-desk', order: 10, label: '我的桌面', icon: DeskIcon, body: DeskPanel },
      { id: 'assistant-knowledge', order: 11, label: '知识室', icon: KnowledgeIcon, body: KnowledgePanel },
      { id: 'assistant-memory', order: 12, label: '记忆室', icon: MemoryIcon, body: MemoryPanel },
    ] as const
    for (const panel of panels) {
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register({
          name: 'sidebar.panellist',
          id: panel.id,
          order: panel.order,
          label: panel.label,
        }, panel.icon))
      ctx.slots.inject('main', () =>
        ctx.slots.register({
          name: 'main',
          key: panel.id,
        }, panel.body))
    }
    // One load feeds all three panels; the store notifies them as it settles.
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
        pending = setTimeout(() => { reloadDesk() }, 4000)
      })
    }

    // The approved form (2026-09-26): the rooms live beside the conversation as right-sidebar
    // tabs, each bound to the session whose sidebar holds it — the body reads that session's
    // workspace desk file directly, no more newest-five walk. Two-stage like ui-schedule: the
    // definition into `sidebarRightTabs`, the body into the keyed `sidebar.right.pane.tab` seat
    // under the definition's id. The chip title is the constant the definition captures; these
    // are kind-opened pages (no resource address), reached from the Session-header chip or a
    // room's "在对话旁打开" button.
    const roomTabs = [
      { id: 'dsh-smart-assistant-desk', kind: 'desk', title: '我的桌面', body: DeskTabBody },
      { id: 'dsh-smart-assistant-knowledge', kind: 'knowledgeRoom', title: '知识室', body: KnowledgeTabBody },
      { id: 'dsh-smart-assistant-memory', kind: 'memoryRoom', title: '记忆室', body: MemoryTabBody },
    ] as const
    for (const room of roomTabs) {
      ctx.sidebarRightTabs.register({
        id: room.id,
        kind: room.kind,
        priority: 'fallback',
        title: () => room.title,
      })
      ctx.slots.inject('sidebar.right.pane.tab', () =>
        ctx.slots.register({ name: 'sidebar.right.pane.tab', key: room.id }, room.body))
    }
    // The opener the principal sees where they already are: a chip in the Session header.
    ctx.slots.inject('conversation.session.header.utilities', () =>
      ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'assistant-desk-chip',
        order: -6,
      }, AssistantDeskChip))
  }

  // The occupants, the three panels, and the shared store are exposed for tests: the store is the
  // panels' only input, so a test that fills it can render every section without a browser.
  return {
    inject, apply, AssistantBrandMark, AssistantBrandName,
    DeskPanel, KnowledgePanel, MemoryPanel, deskStore,
    DeskTabBody, KnowledgeTabBody, MemoryTabBody, AssistantDeskChip,
  }
}

const facade = (globalThis as { __ModuleLoader__?: ModuleLoaderFacade }).__ModuleLoader__
if (facade !== undefined) {
  facade.load({ id: 'dsh-smart-assistant', factory: clientFactory })
}
