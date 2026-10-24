/**
 * The client entry (`src/client/index.ts`): the facade registration and the `apply` seat
 * wiring that lives in the entry module.
 *
 * Acceptance points:
 * - Exactly one registration under the package name, submitted through `__ModuleLoader__`.
 * - The `inject` list is the client half's whole dependency contract (slots, tab registry,
 *   sidebarRight, sessions, remote namespaces, layout).
 * - The dashboard's panellist/main pair, both sidebar brand slots, and the desk primary
 *   view's `conversation.view` claim are wired by apply with their exact ids/orders.
 * - Dashboard defaults once per Client root and never reopens after explicit navigation/remount.
 * - The desk activity command selects the dashboard immediately and its deferred mode intent is consumed once.
 *
 * The browser half is multi-module source (relative imports, tsdown-inlined into one
 * classic script), so the harness evaluates the entry through vitest after installing the
 * page-global facade — same as every other client spec.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface EntryExports {
  inject: string[]
  apply: (ctx: unknown) => void
}

function materialize(): EntryExports {
  // The inert shim, not bare createElement: the desk chip reads the store through useState/useEffect.
  return materializeClient(registration, inertReactShim()) as unknown as EntryExports
}

describe('client-module registration', () => {
  it('registers the package under its name', () => {
    // The harness fails the load when the script submits anything other than exactly one
    // registration, so reaching this line already proves the count; the name is the claim.
    expect(registration.id).toBe('dsh-smart-assistant')
  })

  it('declares every service the rooms need, and wires both sidebar brand slots', () => {
    const exports = materialize()
    // The list is the client half's whole dependency contract: slots and the tab registry for
    // the brand mark and the three rooms, sidebarRight to open the beside-conversation room
    // tabs, the Session store for the conversation list and the desk file's workspace, and the
    // three manifested Remote namespaces (a namespace the browser-side manifest does not list
    // leaves the entry pending forever). Layout owns the initial dashboard default and
    // the dashboard's 「有问题？」 return to Conversation via selectPanel(null). uiWorkspace
    // owns the processing path's openSession — the shell's own session-selection action
    // (retaining alone leaves the selection on the already-mainView-retained session).
    expect(exports.inject).toEqual([
      'slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote',
      'remote.agentPresets', 'remote.workspaceFiles', 'remote.session', 'remote.schedule', 'layout', 'connection', 'uiSession', 'workspaces', 'uiWorkspace', 'locale',
    ])
    const calls: string[] = []
    const registered: string[] = []
    const guideEntries: string[] = []
    const ctx = {
      effect: (install: () => () => void) => { install() },
      slots: {
        // The real registry consumes the contribution callback — including a generator
        // contribution, whose `yield` is where the nested registration happens. A recorder that
        // merely called the callback would miss it.
        inject: (slot: string, make: () => unknown) => {
          calls.push(slot)
          const contribution = make()
          if (contribution !== null && typeof contribution === 'object'
            && Symbol.iterator in (contribution as object)) {
            for (const _entry of contribution as Iterable<unknown>) void _entry
          }
        },
        register: (declaration: { name: string, key?: string, id?: string }) => {
          registered.push(declaration.key ?? declaration.id ?? declaration.name)
        },
      },
      // The right-sidebar tab type: registering a type alone produces no visible entry — the
      // guide ("+") page lists only what the definition's guide entries contribute.
      sidebarRightTabs: {
        register: (definition: { kind: string, guide?: { id: string }[] }) => {
          registered.push(`tab:${definition.kind}`)
          for (const entry of definition.guide ?? []) guideEntries.push(entry.id)
        },
      },
    }
    ;(exports.apply as (ctx: unknown) => void)(ctx)
    // Brand slots first, then each room's tab body and tab title in loop order, then the
    // first-mile strip and the approval banner (two dock seats). The session desk is retired
    // (principal decision, 2026-10-11): no desk room tab, no desk view, no header chip, no
    // summary dock — the main-panel ledger desk is the only "桌面".
    expect(calls).toEqual([
      'conversation.view', 'sidebar.panellist', 'main', 'conversation.view',
      'sidebar.brand.mark', 'sidebar.brand.name',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'settings.general.item',
      'conversation.hero.brand.mark', 'conversation.chat.assistant-actions', 'conversation.input.dock', 'conversation.input.dock',
    ])
    // The tab types register first (the three product rooms; Viki is debug-only, so this
    // default boot carries none), then each room's keyed body and keyed tab title (the glyph
    // chip); the first-mile strip and the approval banner close the set.
    expect(registered).toEqual([
      'assistant-tasks',
      'dsh-smart-assistant-dashboard', 'dsh-smart-assistant-dashboard', 'assistant-desk',
      'sidebar.brand.mark', 'sidebar.brand.name',
      'tab:knowledgeRoom', 'tab:memoryRoom', 'tab:skillsRoom',
      'dsh-smart-assistant-knowledge', 'dsh-smart-assistant-knowledge',
      'dsh-smart-assistant-memory', 'dsh-smart-assistant-memory',
      'dsh-smart-assistant-skills', 'dsh-smart-assistant-skills',
      'assistant-ui-mode',
      'conversation.hero.brand.mark',
      'dsh-smart-assistant-remember', 'assistant-first-mile', 'assistant-approval-banner',
    ])
    // The default boot lists the three product rooms; Viki is debug-only and absent.
    expect(guideEntries).toEqual([
      'dsh-smart-assistant-knowledge-guide',
      'dsh-smart-assistant-memory-guide',
      'dsh-smart-assistant-skills-guide',
    ])
  })
})

interface ActivityCommand {
  name: string
  ui: { run: () => void }
}

function activityHandoffContext() {
  const selected: (string | null)[] = []
  const modes: string[] = []
  const commands: ActivityCommand[] = []
  const declarations: Record<string, unknown>[] = []
  const ctx = {
    root: {},
    effect: (install: () => () => void) => { install() },
    slots: {
      inject: (_name: string, contribute: () => unknown) => { contribute() },
      register: (declaration: Record<string, unknown>) => { declarations.push(declaration); return undefined },
    },
    sidebarRightTabs: { register: () => undefined },
    sidebarRight: { openTab: () => {} },
    inject: (_deps: string[], callback: (scope: { get: () => unknown }) => void) => {
      callback({ get: () => ({ register: (command: ActivityCommand) => { commands.push(command) } }) })
      return undefined
    },
    layout: {
      panelInfo: { getSnapshot: () => ({ activePanelId: 'settings' }) },
      selectPanel: (id: string | null) => { selected.push(id) },
    },
  }
  return { ctx, selected, modes, commands, declarations }
}

describe('desk activity command handoff', () => {
  it('selects the dashboard immediately and applies activity once when main actions arrive', () => {
    const { ctx, selected, modes, commands, declarations } = activityHandoffContext()
    materialize().apply(ctx)

    commands.find(command => command.name === 'desk-activity')?.ui.run()
    expect(selected).toEqual(['dsh-smart-assistant-dashboard'])
    expect(modes).toEqual([])

    const main = declarations.find(declaration => declaration.name === 'main')
    const inject = main?.inject as ((actions: { selectMatter(id: string): void, setMode(mode: 'activity'): void }) => unknown) | undefined
    const actions = { selectMatter: (_id: string) => {}, setMode: (mode: 'activity') => { modes.push(mode) } }
    inject?.(actions)
    expect(modes).toEqual(['activity'])

    inject?.(actions)
    expect(modes).toEqual(['activity'])
  })

  it('waits for the next main injection when actions were already available', () => {
    const { ctx, selected, modes, commands, declarations } = activityHandoffContext()
    materialize().apply(ctx)
    const main = declarations.find(declaration => declaration.name === 'main')
    const inject = main?.inject as ((actions: { selectMatter(id: string): void, setMode(mode: 'activity'): void }) => unknown) | undefined
    const actions = { selectMatter: (_id: string) => {}, setMode: (mode: 'activity') => { modes.push(mode) } }
    inject?.(actions)
    expect(modes).toEqual([])

    commands.find(command => command.name === 'desk-activity')?.ui.run()
    expect(selected).toEqual(['dsh-smart-assistant-dashboard'])
    expect(modes).toEqual([])

    inject?.(actions)
    expect(modes).toEqual(['activity'])
    inject?.(actions)
    expect(modes).toEqual(['activity'])
  })
})

/** A browser context that runs every inject callback, recording slot registrations. */
function recordingContext(): {
  ctx: unknown
  registered: { name: string, declaration: Record<string, unknown> }[]
} {
  const registered: { name: string, declaration: Record<string, unknown> }[] = []
  const ctx = {
    root: {},
    effect: (install: () => () => void) => { install() },
    slots: {
      inject: (_name: string, contribute: () => unknown) => { contribute() },
      register: (declaration: { name: string }) => {
        registered.push({ name: declaration.name, declaration })
        return undefined
      },
    },
    sidebarRightTabs: { register: () => undefined },
    sidebarRight: { openTab: () => {} },
    inject: () => undefined,
  }
  return { ctx, registered }
}

describe('the desk「＋ 交代新事项」 door', () => {
  it('opens a conversation even when no projection is readable (a fresh home has no ledger)', async () => {
    // The Day-0 case: nothing on disk yet, so the projection download answers 404 (`missing`) or
    // the store module is absent. The door must still open — the loop probe caught it doing
    // nothing at all on a fresh home (2026-10-11), which reads to the principal as a dead button.
    const opened: string[] = []
    const asked: string[] = []
    const { ctx, registered } = recordingContext()
    ;(ctx as { sessions?: unknown }).sessions = { create: async () => 'session-day0' }
    ;(ctx as { uiWorkspace?: unknown }).uiWorkspace = { openSession: (id: string) => { opened.push(id) } }
    ;(ctx as { uiSession?: unknown }).uiSession = {
      current: { value: {} },
      sessionStatus: { getSnapshot: () => new Map(), subscribe: () => () => {} },
    }
    ;(ctx as { layout?: unknown }).layout = {
      panelInfo: { getSnapshot: () => ({ activePanelId: 'dsh-smart-assistant-dashboard' }) },
      selectPanel: (id: string | null) => { asked.push(String(id)) },
    }

    materialize().apply(ctx)

    const main = registered.find(entry => entry.name === 'main')
    const inject = main?.declaration.inject as (() => { surface?: { lanes: { onEntrust?: () => void, onClaim?: (id: string) => void } } }) | undefined
    const lanes = inject?.().surface?.lanes
    expect(typeof lanes?.onEntrust).toBe('function')
    lanes?.onEntrust?.()
    // The claim arm rides the same surface: the fragment detail's button must be wired.
    expect(typeof lanes?.onClaim).toBe('function')
    // The launch is async (session creation); one macrotask turn is enough for the fake.
    await new Promise(resolve => { setTimeout(resolve, 0) })
    expect(opened).toEqual(['session-day0'])
  })
})

describe('desk primary view', () => {
  it('opens the dashboard by default when no main panel is selected', () => {
    const selected: (string | null)[] = []
    const { ctx, registered } = recordingContext()
    ;(ctx as { layout?: unknown }).layout = {
      panelInfo: { getSnapshot: () => ({ activePanelId: null }), subscribe: () => () => {} },
      selectPanel: (id: string | null) => selected.push(id),
    }

    materialize().apply(ctx)

    expect(registered.some(entry => entry.name === 'main' && entry.declaration.key === 'dsh-smart-assistant-dashboard')).toBe(true)
    expect(selected).toEqual(['dsh-smart-assistant-dashboard'])
  })

  it('preserves an explicit main-panel selection during plugin initialization', () => {
    const selected: (string | null)[] = []
    const { ctx } = recordingContext()
    ;(ctx as { layout?: unknown }).layout = {
      panelInfo: { getSnapshot: () => ({ activePanelId: 'settings' }) },
      selectPanel: (id: string | null) => selected.push(id),
    }

    materialize().apply(ctx)

    expect(selected).toEqual([])
  })

  it('consumes the default opportunity once across main-slot remounts', () => {
    const selected: (string | null)[] = []
    let activePanelId: string | null = null
    let remountMain: (() => unknown) | undefined
    const { ctx } = recordingContext()
    Object.assign(ctx as object, {
      layout: {
        panelInfo: { getSnapshot: () => ({ activePanelId }) },
        selectPanel: (id: string | null) => {
          selected.push(id)
          activePanelId = id
        },
      },
      slots: {
        inject: (name: string, contribute: () => unknown) => {
          if (name === 'main') remountMain = contribute
          contribute()
        },
        register: () => undefined,
      },
    })

    materialize().apply(ctx)
    activePanelId = null
    remountMain?.()

    expect(selected).toEqual(['dsh-smart-assistant-dashboard'])
  })

  it('does not reopen the desk when the layout and plugin rematerialize on the same page', () => {
    const selected: (string | null)[] = []
    const { ctx } = recordingContext()
    const root = {}
    const setLayout = () => {
      Object.assign(ctx as object, {
        root,
        layout: {
          panelInfo: { getSnapshot: () => ({ activePanelId: null }), subscribe: () => () => {} },
          selectPanel: (id: string | null) => selected.push(id),
        },
      })
    }

    setLayout()
    materialize().apply(ctx)
    setLayout()
    materialize().apply(ctx)

    expect(selected).toEqual(['dsh-smart-assistant-dashboard'])
  })

  it('registers desk and automation tasks as workbench view tabs', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)

    const views = registered.filter(entry => entry.name === 'conversation.view')
    expect(views.map(entry => entry.declaration['id']))
      .toEqual(['assistant-tasks', 'assistant-desk'])
    expect(views.map(entry => (entry.declaration['label'] as () => string)()))
      .toEqual(['自动化任务', '桌面'])
  })
})

/**
 * The L2 debug surface gate: the conversation-view tab must register only when the developer
 * flag is on. This is the entry-level counterpart of the flag's own spec: it names
 * `assistant-debug` and proves the default boot does not carry it.
 */
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

function installBrowser(hash: string): void {
  Object.defineProperty(globalThis, 'document', {
    value: {
      baseURI: 'http://localhost/',
      getElementById: () => null,
      createElement: () => ({ style: {} }),
      head: { appendChild: () => {} },
    },
    configurable: true,
  })
  Object.defineProperty(globalThis, 'location', {
    value: { origin: 'http://localhost', search: '', hash },
    configurable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null },
    configurable: true,
  })
}

function restoreBrowser(): void {
  for (const [key, descriptor] of [
    ['document', originalDocument],
    ['location', originalLocation],
    ['localStorage', originalStorage],
  ] as const) {
    if (descriptor === undefined) delete (globalThis as Record<string, unknown>)[key]
    else Object.defineProperty(globalThis, key, descriptor)
  }
}

function debugContext(registered: string[]): unknown {
  return {
    root: {},
    effect: (install: () => () => void) => { install() },
    slots: {
      inject: (_name: string, contribute: () => unknown) => { contribute() },
      register: (declaration: { name: string, key?: string, id?: string }) => {
        registered.push(declaration.id ?? declaration.key ?? declaration.name)
      },
    },
    sidebarRightTabs: { register: () => undefined },
    sidebarRight: { openTab: () => {} },
    inject: (_deps: string[], callback: (scope: { get: () => unknown }) => void) => {
      callback({ get: () => ({ register: () => {} }) })
    },
    layout: {
      panelInfo: { getSnapshot: () => ({ activePanelId: null }), subscribe: () => () => {} },
      selectPanel: () => {},
    },
    connection: {
      generation: { getSnapshot: () => ({ id: 1 }), subscribe: () => () => {} },
      state: { getSnapshot: () => 'connected', subscribe: () => () => {} },
    },
    locale: { register: () => () => {} },
    uiSession: {
      current: { value: { key: undefined } },
      sessionStatus: { getSnapshot: () => new Map(), subscribe: () => () => {} },
    },
    workspaces: { list: { getSnapshot: () => ({ items: [] }) } },
    sessions: { create: async () => undefined, list: { subscribe: () => () => {} } },
    uiWorkspace: { openSession: () => {} },
    remote: {},
  }
}

describe('debug surface registration', () => {
  afterEach(() => { restoreBrowser() })

  it('registers the assistant-debug conversation tab when the flag is on', () => {
    installBrowser('#debug=1')
    delete process.env.DSH_CLIENT_BUILD_PROFILE
    const registered: string[] = []
    materialize().apply(debugContext(registered))
    expect(registered).toContain('assistant-debug')
  })

  it('does not register it on the customer default boot', () => {
    installBrowser('')
    delete process.env.DSH_CLIENT_BUILD_PROFILE
    const registered: string[] = []
    materialize().apply(debugContext(registered))
    expect(registered).not.toContain('assistant-debug')
  })
})
