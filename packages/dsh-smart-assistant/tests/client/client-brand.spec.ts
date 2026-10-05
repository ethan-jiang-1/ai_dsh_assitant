import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

// The browser half is deliberately a classic script (zero imports/exports — see its file
// header for why), so TS refuses it as a module import; the harness evaluates it exactly
// the way the shell does, after installing the page-global facade.
const registration = await loadClientRegistration()

function materialize(): Record<string, (unknown extends never ? never : unknown)> {
  // The inert shim, not bare createElement: the desk chip reads the store through useState/useEffect.
  return materializeClient(registration, inertReactShim())
}

describe('client-module registration', () => {
  it('registers the package under its name', () => {
    // The harness fails the load when the script submits anything other than exactly one
    // registration, so reaching this line already proves the count; the name is the claim.
    expect(registration.id).toBe('dsh-smart-assistant')
  })

  it('renders the house mark at the requested size', () => {
    const exports = materialize()
    const mark = exports.AssistantBrandMark as (props: { size: number }) => {
      type: string
      props: { width: number, height: number, viewBox: string, children: unknown[] }
    }
    const svg = mark({ size: 24 })
    expect(svg.type).toBe('svg')
    expect(svg.props.width).toBe(24)
    expect(svg.props.height).toBe(24)
    expect(svg.props.viewBox).toBe('0 0 64 64')
    // Background square, house silhouette, door: three shapes, same as the tab favicon.
    expect(svg.props.children).toHaveLength(3)
  })

  it('names the deployment in the fallback-brand size', () => {
    const exports = materialize()
    const name = exports.AssistantBrandName as () => {
      type: string
      props: { children: unknown, style: { fontSize: string, whiteSpace: string } }
    }
    const span = name()
    expect(span.type).toBe('span')
    // 2026-10-04 delegated review: the brand is 智能助手 (zh-first product; the mixed-language
    // sidebar read as garbage to the CEO first-reading).
    expect(span.props.children).toBe('智能助手')
    expect(span.props.style.fontSize).toBe('17px')
    expect(span.props.style.whiteSpace).toBe('nowrap')
  })

  it('opens the beside-conversation tab through the controller — a detached openTab loses the receiver', () => {
    // Runtime-proven failure (2026-09-26): the opener used to detach `openTab` into a bare function;
    // the vendor's implementation starts with `this.require()`, so every real click threw
    // "Cannot read properties of undefined (reading 'require')" and the approved right-tab form
    // never opened. This fixture mirrors that contract: the fake requires its receiver.
    const exports = materialize()
    const components = new Map<string, (props: unknown) => { props?: { onClick?: () => void } }>()
    const opened: string[] = []
    const sidebarRight = {
      opened,
      openTab(kind: string): void {
        const self = this as { opened?: string[] } | undefined
        if (self?.opened === undefined) throw new TypeError("Cannot read properties of undefined (reading 'require')")
        self.opened.push(kind)
      },
    }
    const ctx = {
      slots: {
        inject: (_slot: string, make: () => unknown) => {
          const contribution = make()
          if (contribution !== null && typeof contribution === 'object'
            && Symbol.iterator in (contribution as object)) {
            for (const _entry of contribution as Iterable<unknown>) void _entry
          }
        },
        register: (declaration: { name: string, key?: string, id?: string }, component: unknown) => {
          if (typeof component === 'function') {
            components.set(declaration.key ?? declaration.id ?? declaration.name, component as never)
          }
        },
      },
      sidebarRightTabs: { register: () => {} },
      sidebarRight,
    }
    ;(exports.apply as (ctx: unknown) => void)(ctx)
    const chip = components.get('assistant-desk-chip')
    expect(chip).toBeDefined()
    const element = chip!({})
    expect(() => { element.props?.onClick?.() }).not.toThrow()
    expect(opened).toEqual(['desk'])
  })

  it('declares every service the rooms need, and wires both sidebar brand slots', () => {
    const exports = materialize()
    // The list is the client half's whole dependency contract: slots and the tab registry for
    // the brand mark and the three rooms, sidebarRight to open the beside-conversation room
    // tabs, the Session store for the conversation list and the desk file's workspace, and the
    // three manifested Remote namespaces (a namespace the browser-side manifest does not list
    // leaves the entry pending forever). The left-panel era's `layout` is gone: the rooms live
    // as right-sidebar tabs (user steer, 2026-09-28), so panel jumps open tabs, not panels.
    expect(exports.inject).toEqual([
      'slots', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote',
      'remote.agentPresets', 'remote.workspaceFiles', 'remote.session',
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
      'sidebar.brand.mark', 'sidebar.brand.name',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title',
      'conversation.view',
      'conversation.session.header.utilities',
      'conversation.hero.brand.mark', 'conversation.input.dock', 'conversation.input.dock',
    ])
    // Each room registers its tab type, its keyed body, and its keyed tab title (the glyph chip);
    // the chip, the first-mile strip, and the approval banner close the set.
    expect(registered).toEqual([
      'sidebar.brand.mark', 'sidebar.brand.name',
      'tab:desk', 'dsh-smart-assistant-desk', 'dsh-smart-assistant-desk',
      'tab:knowledgeRoom', 'dsh-smart-assistant-knowledge', 'dsh-smart-assistant-knowledge',
      'tab:memoryRoom', 'dsh-smart-assistant-memory', 'dsh-smart-assistant-memory',
      'dsh-smart-assistant-desk-view',
      'assistant-desk-chip',
      'conversation.hero.brand.mark', 'assistant-first-mile', 'assistant-approval-banner',
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
