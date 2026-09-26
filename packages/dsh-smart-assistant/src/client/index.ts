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
}

/** Minimal structural mirror of the sidebar-right tab registration surface. */
interface SidebarRightTabDefinition {
  readonly id: string
  readonly kind: string
  readonly patterns: readonly string[]
  readonly priority: string
  readonly canOpen: (address: string) => boolean
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
    decisions?: { id?: string, question?: string, context?: string }[]
    gaps?: { id?: string, what?: string, why?: string }[]
    memories?: { id?: string, kind?: string, text?: string, updated?: string, source?: string }[]
    knowledge?: { id?: string, title?: string, status?: string, type?: string, sources?: string[] }[]
    skills?: { name?: string, description?: string }[]
  }

  /**
   * Shared desk state: one loader, three panels. The panels are separate sidebar entries, so
   * they must not each re-fetch; the store is the single owner and notifies its subscribers.
   */
  const deskStore: {
    data?: DeskData | undefined
    note?: string | undefined
    source?: string | undefined
    busy?: string | undefined
    listeners: Set<() => void>
  } = { listeners: new Set() }
  const patchDesk = (next: Partial<typeof deskStore>): void => {
    Object.assign(deskStore, next)
    for (const listener of [...deskStore.listeners]) listener()
  }

  /** Monotonic load sequence: a newer load invalidates every attempt of the older one. */
  let deskLoadSeq = 0

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
        patchDesk({ data: JSON.parse(text) as DeskData, note: undefined, source: byId[sessionId]?.cwd ?? '' })
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
   * @param text - the line to send.
   * @param busy - status line while the send is in flight.
   * @param onSettled - runs once the prompt is accepted.
   */
  function sendPrompt(text: string, busy: string, onSettled?: () => void): void {
    const prompt = (deskRemote?.['session'] as { prompt?: (request: unknown) => Promise<unknown> } | undefined)?.prompt
    const sessionId = newestSessionId()
    if (sessionId === undefined) {
      patchDesk({ note: '还没有会话——先和助手说句话' })
      return
    }
    if (prompt === undefined) {
      patchDesk({ note: 'remote.session did not materialize' })
      return
    }
    patchDesk({ busy })
    void prompt({
      requestId: `desk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text }],
    }).then((result: unknown) => {
      const wrapped = result as { ok?: boolean, error?: { message?: string } }
      if (wrapped?.ok === false) {
        patchDesk({ busy: undefined, note: wrapped.error?.message ?? 'prompt failed' })
        return
      }
      patchDesk({ busy: undefined })
      onSettled?.()
    }).catch((reason: unknown) => {
      patchDesk({ busy: undefined, note: String(reason) })
    })
  }

  /** Ask the assistant to refresh the desk file, then reload it after it has had time to work. */
  function askRefresh(): void {
    sendPrompt('刷新我的桌面。', '已请助手刷新桌面，稍后自动重读…', () => {
      setTimeout(() => { loadDesk() }, 12000)
    })
  }

  /** Put one open decision to the assistant and ask for options with their costs. */
  function askAboutDecision(question: string): void {
    sendPrompt(`关于这个待决事项：「${question}」——请给我两三个选项，每个选项的代价与不可逆程度，以及你的建议。`,
      '已把这条决定交给助手…')
  }

  /** Ask the assistant where one thread actually stands. */
  function askAboutThread(title: string): void {
    sendPrompt(`「${title}」这条线索现在到哪一步了？还缺什么才能往下走？`, '已请助手汇报这条线索…')
  }

  /**
   * Correct one memory record. This is the cultivation loop: the principal says which line is
   * wrong and what is right, and the assistant rewrites the record and refreshes the desk.
   */
  function correctMemory(text: string, correction: string): void {
    sendPrompt(
      `请更正这条记忆。原记录：「${text}」。正确的是：${correction}。改完请刷新我的桌面。`,
      '已把你的更正交给助手…',
      () => { setTimeout(() => { loadDesk() }, 15000) },
    )
  }

  /**
   * Approve one draft knowledge page. The counterpart of a correction: the principal says the page
   * is right, and the assistant promotes it so it starts counting in retrieval and the digest.
   */
  function approveKnowledgePage(title: string): void {
    sendPrompt(
      `我批准知识页「${title}」。请把它从 draft 翻成 stable，改完刷新我的桌面。`,
      '已把批准交给助手…',
      () => { setTimeout(() => { loadDesk() }, 15000) },
    )
  }

  /**
   * Retire one learned skill. The third audit line beside memories and pages: the principal says
   * a procedure is dead, and the assistant moves it out of the loading set (recoverable).
   */
  function retireSkill(name: string): void {
    sendPrompt(
      `技能「${name}」没用了，请退役它（assistant_reflect retire_skill）。改完刷新我的桌面。`,
      '已把退役请求交给助手…',
      () => { setTimeout(() => { loadDesk() }, 15000) },
    )
  }

  /** Tell the assistant what is wrong with one knowledge page. */
  function flagKnowledgePage(title: string, problem: string): void {
    sendPrompt(
      `知识页「${title}」有问题：${problem}。请核对并更正这一页，改完刷新我的桌面。`,
      '已把这条意见交给助手…',
      () => { setTimeout(() => { loadDesk() }, 15000) },
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
    actions?: { label: string, run: () => void }[] | undefined
    source?: string | undefined
  }): ReturnType<typeof createElement> {
    const { useState } = require('react') as typeof import('react')
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
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
      createElement('div', { style: { fontSize: '13px', lineHeight: 1.6, color: '#555' } }, props.primary),
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
        ...(props.actions ?? []).map(action => createElement('button', {
          key: action.label,
          onClick: action.run,
          style: {
            marginLeft: '8px', padding: '0 8px', fontSize: '11px', cursor: 'pointer',
            border: `1px solid ${MARK_TEAL}`, borderRadius: '4px', background: '#fff', color: MARK_TEAL,
          },
        }, action.label)),
        createElement('button', {
          onClick: () => { setOpen(!open) },
          style: {
            marginLeft: '8px', padding: '0 6px', fontSize: '11px', cursor: 'pointer',
            border: '1px solid #ddd', borderRadius: '4px', background: '#fff', color: '#888',
          },
        }, open ? '取消' : props.actionLabel)),
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
              style: {
                padding: '5px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px',
                border: `1px solid ${MARK_TEAL}`, background: '#fff', color: MARK_TEAL,
              },
            }, '发送'))
        : null)
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

  /** The refresh button plus its status line — shared by all three panels. */
  function refreshRow(store: typeof deskStore): ReturnType<typeof createElement> {
    return createElement('div', { style: { margin: '8px 0 0' } },
      createElement('button', {
        onClick: askRefresh,
        disabled: store.busy !== undefined,
        style: {
          padding: '6px 14px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px',
          border: `1px solid ${MARK_TEAL}`, background: store.busy === undefined ? '#fff' : '#f2f2f2',
          color: MARK_TEAL,
        },
      }, '刷新桌面'),
      store.busy === undefined
        ? null
        : createElement('span', { style: { marginLeft: '10px', fontSize: '12px', color: '#888' } }, store.busy))
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
      refreshRow(store),

      // The principal's first question is "what needs me?" — so it leads, and the drafts the
      // knowledge panel owns are counted here rather than duplicated.
      sectionTitle('等你决定'),
      (data?.decisions ?? []).length === 0 && (data?.counts?.knowledgeDraft ?? 0) === 0
        ? muted('（没有等你拍板的事）')
        : createElement('div', null,
            ...(data?.decisions ?? []).map(item => createElement('div', {
              key: String(item.id),
              onClick: () => { askAboutDecision(String(item.question ?? '')) },
              title: '点一下，让助手摆出选项与代价',
              style: {
                marginBottom: '8px', paddingLeft: '10px', borderLeft: '2px solid #d97706', cursor: 'pointer',
              },
            },
            createElement('div', { style: { fontSize: '13px', fontWeight: 600 } }, String(item.question ?? '')),
            item.context === undefined ? null : createElement('div', { style: { fontSize: '12px', color: '#888' } }, String(item.context)))),
            (data?.counts?.knowledgeDraft ?? 0) === 0
              ? null
              : createElement('div', {
                  onClick: () => { try { deskLayout?.selectPanel?.('assistant-knowledge') } catch { /* stale target */ } },
                  style: { fontSize: '13px', color: '#b26a00', cursor: 'pointer', textDecoration: 'underline' },
                }, `⚠ ${String(data?.counts?.knowledgeDraft)} 页知识在等你审批（点这里打开知识室）`)),

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
        : createElement('div', null, ...data.threads.map(thread => createElement('div', {
            key: String(thread.id),
            style: { marginBottom: '10px', paddingLeft: '10px', borderLeft: `2px solid ${MARK_TEAL}` },
          },
          createElement('div', {
            onClick: () => { askAboutThread(String(thread.title ?? thread.id ?? '')) },
            title: '点一下，问助手这条线索到哪一步了',
            style: { fontSize: '13px', fontWeight: 600, lineHeight: 1.5, cursor: 'pointer' },
          }, String(thread.title ?? thread.id ?? '')),
          createElement('div', { style: { fontSize: '12px', color: '#666', marginTop: '2px' } },
            '当前倾向：', String(thread.lean ?? '（未定）')),
          thread.why === undefined || thread.why === ''
            ? null
            : createElement('div', { style: { fontSize: '11px', color: '#aaa', marginTop: '2px', lineHeight: 1.5 } },
                String(thread.why))))),

      sectionTitle('我记住的规模'),
      createElement('div', null,
        cell('记忆', data?.counts?.memories === undefined ? '—' : String(data.counts.memories), 'assistant-memory'),
        cell('知识', data?.counts?.knowledgeStable === undefined ? '—' : String(data.counts.knowledgeStable), 'assistant-knowledge'),
        cell('技能', data?.counts?.skills === undefined ? '—' : String(data.counts.skills), 'assistant-knowledge'),
        cell('线索', data?.counts?.threads === undefined ? '—' : String(data.counts.threads))),
      store.note === undefined
        ? muted(`读自 ${store.source === undefined || store.source === '' ? '会话工作区' : store.source} 的 .desk/state.json`
            + (store.data?.generatedAt === undefined ? '' : `（更新于 ${store.data.generatedAt}）`))
        : muted(store.note))
  }

  /** Panel 2 — the knowledge room: what the assistant knows, and what is waiting for review. */
  function KnowledgePanel(): unknown {
    const store = useDesk()
    const pages = store.data?.knowledge ?? []
    const drafts = pages.filter(page => page.status === 'draft')
    const stable = pages.filter(page => page.status !== 'draft')
    const row = (page: typeof pages[number], mark: string): ReturnType<typeof createElement> =>
      createElement(CorrectableRow, {
        key: String(page.id),
        primary: createElement('span', null, mark, String(page.title ?? page.id ?? '')),
        meta: page.type === undefined || page.type === '' ? '' : String(page.type),
        actionLabel: '有问题',
        placeholder: '哪里不对？',
        source: (page.sources ?? []).join(' · '),
        onSubmit: (text: string) => { flagKnowledgePage(String(page.title ?? page.id ?? ''), text) },
        actions: page.status === 'draft'
          ? [{ label: '批准', run: () => { approveKnowledgePage(String(page.title ?? page.id ?? '')) } }]
          : undefined,
      })
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '知识室'),
      refreshRow(store),
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
                  ...stable.map(page => row(page, '✓ ')))),
      sectionTitle('技能'),
      (store.data?.skills ?? []).length === 0
        ? muted('（还没有技能）')
        : createElement('ul', { style: { margin: 0, padding: 0 } },
            ...(store.data?.skills ?? []).map(skill => createElement(CorrectableRow, {
              key: String(skill.name),
              primary: createElement('span', null,
                createElement('span', { style: { color: MARK_TEAL } }, String(skill.name ?? '')),
                skill.description === undefined ? null : createElement('span', { style: { color: '#666' } }, ` — ${skill.description}`)),
              actionLabel: '这技能有问题',
              placeholder: '哪里不对？',
              onSubmit: (text: string) => { flagKnowledgePage(String(skill.name ?? ''), text) },
              actions: [{ label: '没用了', run: () => { retireSkill(String(skill.name ?? '')) } }],
            }))),
      store.note === undefined ? null : muted(store.note))
  }

  /** Panel 3 — the memory room: what the assistant has written down about the principal. */
  function MemoryPanel(): unknown {
    const store = useDesk()
    const memories = store.data?.memories ?? []
    return createElement('div', { style: { padding: '24px', maxWidth: '620px' } },
      createElement('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, '记忆室'),
      refreshRow(store),
      memories.length === 0
        ? muted('（还没有记忆，或桌面文件尚未刷新）')
        : createElement('ul', { style: { margin: 0, padding: 0 } },
            ...memories.map(memory => createElement(CorrectableRow, {
              key: String(memory.id),
              primary: String(memory.text ?? ''),
              meta: [memory.kind, memory.updated].filter(part => part !== undefined && part !== '').join(' · '),
              actionLabel: '这条记错了',
              placeholder: '正确的是什么？',
              source: memory.source,
              onSubmit: (text: string) => { correctMemory(String(memory.text ?? ''), text) },
            }))),
      sectionTitle('规模'),
      createElement('div', null,
        cell('记忆', store.data?.counts?.memories === undefined ? '—' : String(store.data.counts.memories)),
        cell('线索', store.data?.counts?.threads === undefined ? '—' : String(store.data.counts.threads))),
      store.note === undefined ? null : muted(store.note))
  }

  /** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
  const inject = ['slots', 'sidebarRightTabs', 'sessions', 'layout', 'remote', 'remote.agentPresets', 'remote.workspaceFiles', 'remote.session']

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

  function apply(ctx: ClientContext): void {
    deskRemote = (ctx as { remote?: Record<string, unknown> }).remote
    deskSessions = (ctx as { sessions?: typeof deskSessions }).sessions
    deskLayout = (ctx as { layout?: typeof deskLayout }).layout

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
        pending = setTimeout(() => { loadDesk() }, 4000)
      })
    }

    // Experiment 1 (kept for reference): the right-sidebar tab type registration below
    // registers a TYPE (what this plugin can open), not a VISIBLE tab — lesson learned:
    // types are passive; visibility needs either an open action or a persistent panel.
    ctx.sidebarRightTabs.register({
      id: 'dsh-smart-assistant-desk',
      kind: 'desk',
      patterns: ['dsh-resource://assistant/desk'],
      priority: 'fallback',
      canOpen: address => address === 'dsh-resource://assistant/desk',
      title: () => 'My Desk',
    })
  }

  // The occupants, the three panels, and the shared store are exposed for tests: the store is the
  // panels' only input, so a test that fills it can render every section without a browser.
  return {
    inject, apply, AssistantBrandMark, AssistantBrandName,
    DeskPanel, KnowledgePanel, MemoryPanel, deskStore,
  }
}

const facade = (globalThis as { __ModuleLoader__?: ModuleLoaderFacade }).__ModuleLoader__
if (facade !== undefined) {
  facade.load({ id: 'dsh-smart-assistant', factory: clientFactory })
}
