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
 *
 * The browser half is multi-module source (relative imports, tsdown-inlined into one
 * classic script), so the harness evaluates the entry through vitest after installing the
 * page-global facade — same as every other client spec.
 */
import { describe, expect, it } from 'vitest'
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
    // the dashboard's 「有问题？」 return to Conversation via selectPanel(null).
    expect(exports.inject).toEqual([
      'slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote',
      'remote.agentPresets', 'remote.workspaceFiles', 'remote.session', 'layout', 'connection', 'uiSession', 'workspaces',
    ])
    const calls: string[] = []
    const registered: string[] = []
    const guideEntries: string[] = []
    const ctx = {
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
    // Session-header chip, then the desk primary view (conversation.view, 2026-10-06), then
    // the first-mile strip and the approval banner (two dock seats).
    // No panellist/main pairs: the left main panels are retired.
    expect(calls).toEqual([
      'sidebar.panellist', 'main',
      'sidebar.brand.mark', 'sidebar.brand.name',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'conversation.view',
      'conversation.session.header.utilities',
      'conversation.hero.brand.mark', 'conversation.input.dock', 'conversation.input.dock', 'conversation.input.dock',
    ])
    // Each room registers its tab type, its keyed body, and its keyed tab title (the glyph chip);
    // the chip, the first-mile strip, and the approval banner close the set.
    expect(registered).toEqual([
      'dsh-smart-assistant-dashboard', 'dsh-smart-assistant-dashboard',
      'sidebar.brand.mark', 'sidebar.brand.name',
      'tab:desk', 'dsh-smart-assistant-desk', 'dsh-smart-assistant-desk',
      'tab:knowledgeRoom', 'dsh-smart-assistant-knowledge', 'dsh-smart-assistant-knowledge',
      'tab:memoryRoom', 'dsh-smart-assistant-memory', 'dsh-smart-assistant-memory',
      'dsh-smart-assistant-desk-view',
      'assistant-desk-chip',
      'conversation.hero.brand.mark', 'assistant-first-mile', 'assistant-approval-banner', 'assistant-desk-summary',
    ])
    // The steer's whole point: each room contributes a guide entry, so the "+" picker lists
    // the rooms beside the browser and terminal tabs.
    expect(guideEntries).toEqual([
      'dsh-smart-assistant-desk-guide',
      'dsh-smart-assistant-knowledge-guide',
      'dsh-smart-assistant-memory-guide',
    ])
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

describe('desk primary view', () => {
  it('opens the dashboard by default when no main panel is selected', () => {
    const selected: (string | null)[] = []
    const { ctx, registered } = recordingContext()
    ;(ctx as { layout?: unknown }).layout = {
      panelInfo: { getSnapshot: () => ({ activePanelId: null }) },
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
          panelInfo: { getSnapshot: () => ({ activePanelId: null }) },
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

  it('claims exactly one conversation.view entry beside the room tabs', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)

    const views = registered.filter(entry => entry.name === 'conversation.view')
    expect(views).toHaveLength(1)
    const declaration = views[0]?.declaration
    expect(declaration?.id).toBe('dsh-smart-assistant-desk-view')
    expect(declaration?.order).toBe(5)
    expect(typeof declaration?.label).toBe('function')
    expect((declaration?.label as () => string)()).toBe('桌面')
  })

  it('supplies the body its session identity through the inject face, not a closure', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)
    const declaration = registered.find(entry => entry.name === 'conversation.view')?.declaration
    const inject = declaration?.inject as (sessionId: string) => { sessionId: string }
    expect(typeof inject).toBe('function')
    expect(inject('session-1')).toEqual({ sessionId: 'session-1' })
  })
})
