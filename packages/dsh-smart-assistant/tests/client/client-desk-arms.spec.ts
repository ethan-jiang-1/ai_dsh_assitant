/**
 * The desk→conversation arms through the entry (structure-paydown slice 5b: characterization
 * before the orchestration moves out of `index.ts`): a ready projection, a fake remote and a
 * recording context drive the four arms' launches and re-entries, the notes they seed, and the
 * return dispatch that clears the path.
 *
 * The projections are pinned built store/declarations (build prerequisite), the network is the
 * external seam: nothing here needs a DOM beyond the `document` the entry's own browser guard
 * reads.
 *
 * Acceptance points (each `it` is one, red before green):
 * 1. 处理 on a readable matter creates a session in the designated workspace, opens it, seeds the
 *    processing note, and binds the path (proved by the re-entry in point 2).
 * 2. Re-entering the same matter from the desk (Q11) opens the BOUND session and seeds the resume
 *    note — no second session is created.
 * 3. 认领 owns its session (never the current conversation) and seeds the claim note.
 * 4. 唤醒 seeds the wake note for a SETTLED matter and does nothing for an active one.
 * 5. The return dispatch clears the path, selects the desk, and hands the landed matter to the
 *    view actions once the bound session's receipt has landed.
 * 6. 桌面受理位 (261018 片 1): the principal's words reach the intake conversation as a
 *    `[桌面]`-marked queued line WITHOUT creating or opening a session when one is current, and
 *    the delivery receipt records the projection revision the row will wait on.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { createSnapshotStore } from '../../../../vendor/dsh/packages/client/store/lib/types/index.js'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

/** A v2 envelope the client parser accepts: two matters, one unclaimed fragment, no receipts yet. */
function envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 2,
    ledgerId: 'assistant-operating',
    revision: 1,
    generatedAt: '2026-10-16T00:00:00.000Z',
    matters: [
      {
        id: 'm-1', title: '回款 A', status: 'active', summary: '等客户回款', responsible: '财务', revision: 1, times: {},
        evidence: [{ id: 'mat-m-1-1', sessionId: 'session-a', note: '到账回单' }],
        proposals: [],
      },
      {
        id: 'm-2', title: '对账单核对', status: 'completed', summary: '九月对账已了结', responsible: '财务', revision: 2, times: {},
        evidence: [{ id: 'mat-m-2-1', sessionId: 'session-a', note: '对账单已核' }],
        proposals: [],
      },
    ],
    receipts: [],
    reminders: [],
    unclaimed: [{ id: 'u-1', note: '有一笔二期款已经付了', sessionId: 'session-src', receivedAt: '2026-10-15T00:00:00.000Z' }],
    ...overrides,
  }
}

interface Fixture {
  ctx: Record<string, unknown>
  opened: string[]
  created: (string | undefined)[]
  panels: (string | null)[]
  prompts: { requestId: string, sessionId: string, text: string }[]
  selected: string[]
  /** Capture receipts the entry's view actions recorded (261018 片 1). */
  receipts: ({ requestId: string, sessionId: string, text: string, observedRevision: number } | null)[]
  /** Fire one panel-info notification, the way a layout change would. */
  notifyPanel: () => void
  /** Bring the connection up so the reader performs its first fetch and the projection turns ready. */
  connect: () => void
  /** The face the render machinery injects into the main registration. */
  armFaces: () => {
    onEntrust?: () => void
    onProcess?: (id: string) => void
    onClaim?: (id: string) => void
    onDiscard?: (id: string) => void
    onCapture?: (text: string) => void
    onWake?: (id: string) => void
    hooks?: { projection?: { getSnapshot(): { status?: string } } }
  }
}

/**
 * A browser-shaped context whose projection answers with `payload`, plus the arm faces the main
 * registration exposes. Only the pieces the arms read are present; anything else stays absent so
 * a new dependency shows up as a failure rather than a silent stand-in.
 */
function fixture(payload: Record<string, unknown> = envelope()): Fixture {
  const opened: string[] = []
  const created: (string | undefined)[] = []
  const panels: (string | null)[] = []
  const selected: string[] = []
  const receipts: Fixture['receipts'] = []
  const prompts: Fixture['prompts'] = []
  const panelListeners: (() => void)[] = []
  const registrations: { name: string, declaration: Record<string, unknown> }[] = []
  const generation = createSnapshotStore<{ readonly id: number } | undefined>(undefined)
  const connectionState = createSnapshotStore<'connected' | 'connecting' | 'disconnected' | undefined>(undefined)
  const current: { key: string | undefined } = { key: undefined }
  const fetchCalls: number[] = []
  const fetch: typeof globalThis.fetch = () => {
    fetchCalls.push(1)
    return Promise.resolve(new Response(JSON.stringify(payload)))
  }
  ;(globalThis as Record<string, unknown>).document = {
    baseURI: 'http://localhost/mount/',
    visibilityState: 'visible',
    // The theme bootstrap is the only other thing the entry touches on the page: it looks the
    // style element up, builds one, and appends it to the head.
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '' }),
    head: { appendChild: () => {} },
  }
  ;(globalThis as Record<string, unknown>).location = { origin: 'http://localhost' }
  ;(globalThis as Record<string, unknown>).fetch = fetch
  const ctx: Record<string, unknown> = {
    root: {},
    connection: { generation, state: connectionState },
    effect: (install: () => () => void) => { install(); return () => {} },
    remote: {
      session: {
        prompt: (request: { requestId: string, sessionId: string, content: { text: string }[] }) => {
          prompts.push({ requestId: request.requestId, sessionId: request.sessionId, text: request.content[0]?.text ?? '' })
          return Promise.resolve({ ok: true })
        },
      },
    },
    sessions: {
      create: async (options?: { workspaceId?: string }) => { created.push(options?.workspaceId); return 'session-new' },
      list: { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => () => {} },
    },
    uiSession: {
      current: { value: current },
      sessionStatus: { getSnapshot: () => new Map([['session-new', { running: false }]]), subscribe: () => () => {} },
    },
    layout: {
      panelInfo: { getSnapshot: () => ({ activePanelId: null }), subscribe: (listener: () => void) => { panelListeners.push(listener); return () => {} } },
      selectPanel: (id: string | null) => { panels.push(id) },
    },
    workspaces: { list: { getSnapshot: () => ({ items: [{ workspaceId: 'ws-1', sessionIds: [] }] }) } },
    uiWorkspace: { openSession: (id: string) => { opened.push(id) } },
    slots: {
      inject: (_name: string, contribute: () => unknown) => { contribute() },
      register: (declaration: { name: string }) => { registrations.push({ name: declaration.name, declaration }); return undefined },
    },
    sidebarRightTabs: { register: () => undefined },
    sidebarRight: { openTab: () => {} },
    inject: () => undefined,
  }
  return {
    ctx,
    opened,
    created,
    panels,
    prompts,
    selected,
    receipts,
    notifyPanel: () => { for (const listener of panelListeners) listener() },
    connect: () => { generation.set({ id: 1 }); connectionState.set('connected') },
    armFaces: () => {
      const main = registrations.find(entry => entry.name === 'main')
      const inject = main?.declaration.inject as ((actions: { selectMatter(id: string): void, setMode(mode: 'string'): void, setCaptureDraft(text: string): void, setCaptureReceipt(receipt: { requestId: string, sessionId: string, text: string, observedRevision: number } | null): void }) => ReturnType<Fixture['armFaces']>) | undefined
      return inject?.({
        selectMatter: (id: string) => { selected.push(id) }, setMode: () => {},
        setCaptureDraft: () => {}, setCaptureReceipt: receipt => { receipts.push(receipt) },
      }) ?? {}
    },
  }
}

/** Apply the client to a fixture context, bring the connection up, and hand back the arm faces. */
async function mount(f: Fixture): Promise<ReturnType<Fixture['armFaces']>> {
  const client = materializeClient(registration, inertReactShim()) as unknown as { apply: (ctx: unknown) => void }
  client.apply(f.ctx)
  f.connect()
  await flush()
  const faces = f.armFaces()
  // Precondition: every arm reads a READY projection. Without one they all stay shut, and the
  // assertions below would pass for the wrong reason.
  expect(faces.hooks?.projection?.getSnapshot().status).toBe('ready')
  return faces
}

/** Let the reader's fetch chain settle (fetch → body → parse → publish) before an arm runs. */
const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 8; turn += 1) {
    await new Promise<void>(resolve => setImmediate(() => { resolve(undefined) }))
  }
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).document
  delete (globalThis as Record<string, unknown>).location
  delete (globalThis as Record<string, unknown>).fetch
})

describe('desk arms through the entry', () => {
  it('处理 creates a session in the designated workspace, opens it and seeds the processing note', async () => {
    const f = fixture()
    const faces = await mount(f)
    await flush()

    faces.onProcess?.('m-1')
    await flush()

    expect(f.created).toEqual(['ws-1'])
    expect(f.opened).toEqual(['session-new'])
    expect(f.prompts.map(prompt => prompt.requestId.split('-')[0])).toEqual(['desk'])
    expect(f.prompts[0]?.sessionId).toBe('session-new')
    expect(f.prompts[0]?.text).toContain('[面板] 正在处理事项「回款 A」（m-1）')
    expect(f.prompts[0]?.text).toContain('assistant_operating read m-1')
  })

  it('re-entering the same matter opens the bound session and seeds the resume note, not a second session', async () => {
    const f = fixture()
    const faces = await mount(f)
    await flush()

    faces.onProcess?.('m-1')
    await flush()
    f.opened.length = 0
    faces.onProcess?.('m-1')
    await flush()

    expect(f.created).toEqual(['ws-1'])
    expect(f.opened).toEqual(['session-new'])
    const resume = f.prompts.at(-1)
    expect(resume?.requestId).toContain('desk-process-resume')
    expect(resume?.text).toContain('[面板] 继续处理事项「回款 A」（m-1）')
  })

  it('认领 owns its session and seeds the claim note naming the fragment', async () => {
    const f = fixture()
    const faces = await mount(f)
    await flush()

    faces.onClaim?.('u-1')
    await flush()

    expect(f.created).toEqual(['ws-1'])
    expect(f.opened).toEqual(['session-new'])
    const claim = f.prompts.at(-1)
    expect(claim?.requestId).toContain('desk-claim-context')
    expect(claim?.text).toContain('正在处理待认领片段（unclaimed u-1，来自 session-src）')
  })

  it('唤醒 seeds the wake note for a settled matter and stays shut for an active one', async () => {
    const f = fixture()
    const faces = await mount(f)
    await flush()

    faces.onWake?.('m-1')
    await flush()
    expect(f.created).toEqual([])
    expect(f.prompts).toEqual([])

    faces.onWake?.('m-2')
    await flush()
    expect(f.created).toEqual(['ws-1'])
    expect(f.prompts.at(-1)?.text).toContain('正在唤醒一件已完成的事项「对账单核对」（m-2）')
  })

  it('returns to the desk once the bound session reads back a committed receipt, selecting where it landed', async () => {
    const receipt = {
      operationId: 'op-create', matterId: 'm-1', sessionId: 'session-new',
      submittedAt: '2999-01-01T00:00:00.000Z', status: 'committed', revision: 1, kind: 'create',
    }
    const f = fixture(envelope({ receipts: [receipt] }))
    const faces = await mount(f)
    await flush()

    faces.onProcess?.('m-1')
    await flush()
    ;(f.ctx.uiSession as { current: { value: { key?: string } } }).current.value.key = 'session-new'
    // Clear the mount-time default selection: only the return dispatch may select the desk here.
    f.panels.length = 0
    f.notifyPanel()

    expect(f.panels).toEqual(['dsh-smart-assistant-dashboard'])
  })
  it('桌面受理位 delivers into the CURRENT session without creating or opening one, and receipts it', async () => {
    const f = fixture()
    const faces = await mount(f)
    await flush()
    // A conversation is already the principal's context; capturing must not disturb it.
    ;(f.ctx.uiSession as { current: { value: { key: string | undefined } } }).current.value.key = 'session-current'

    faces.onCapture?.('记得问一下小王那个报价到底批了没')
    await flush()

    expect(f.created).toEqual([])
    expect(f.opened).toEqual([])
    expect(f.prompts).toHaveLength(1)
    expect(f.prompts[0]?.sessionId).toBe('session-current')
    expect(f.prompts[0]?.text).toBe('[桌面] 记得问一下小王那个报价到底批了没')
    expect(f.receipts).toHaveLength(1)
    expect(f.receipts[0]).toMatchObject({
      sessionId: 'session-current', text: '记得问一下小王那个报价到底批了没', observedRevision: 1,
    })
    expect(f.receipts[0]?.requestId.startsWith('desk-capture-')).toBe(true)
  })

  it('桌面受理位 creates a session when none is current — and still does not open it', async () => {
    const f = fixture()
    const faces = await mount(f)
    await flush()

    faces.onCapture?.('十月供应商那笔运费差异要问一下')
    await flush()

    expect(f.created).toEqual(['ws-1'])
    expect(f.opened).toEqual([])
    expect(f.prompts[0]?.sessionId).toBe('session-new')
    expect(f.receipts[0]?.observedRevision).toBe(1)
  })

  it('桌面受理位 sends nothing for whitespace', async () => {
    const f = fixture()
    const faces = await mount(f)
    await flush()

    faces.onCapture?.('   ')
    await flush()

    expect(f.prompts).toEqual([])
    expect(f.receipts).toEqual([])
  })
})
