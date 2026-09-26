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

  /**
   * Experiment 1b: the desk icon for the left sidebar's panel list (same slot shape
   * ui-schedule uses — a calendar glyph, sized by the sidebar's PropsRuntime).
   */
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

  /**
   * Experiment 1b: the My Desk panel body — four static numbers proving the panel path.
   * Rendered with createElement only (no JSX in the script-format client bundle).
   */
  function DeskPanel(): unknown {
    const { createElement: h, useEffect, useState } = require('react') as typeof import('react')
    const [presets, setPresets] = useState<{ id: string, name: string }[] | undefined>(undefined)
    const [error, setError] = useState<string | undefined>(undefined)

    useEffect(() => {
      // Live data through a namespace the Remote manifest already lists. `agentPresets.list`
      // takes no arguments and returns the deployment's roster — the first real content in this
      // panel, and the proof that the client → Remote → host path works from here.
      const timer = setTimeout(() => {
        const api = deskRemote?.['agentPresets'] as { list?: () => Promise<unknown> } | undefined
        if (api?.list === undefined) {
          setError('remote.agentPresets did not materialize')
          return
        }
        void api.list().then((data: unknown) => {
          const roster = data as { presets?: unknown[], entries?: unknown[] } | unknown[]
          const raw = Array.isArray(roster) ? roster : (roster?.presets ?? roster?.entries ?? [])
          setPresets((raw as { id?: unknown, name?: unknown }[]).map(item => ({
            id: String(item?.id ?? '?'),
            name: String(item?.name ?? item?.id ?? '?'),
          })))
        }).catch((reason: unknown) => setError(String(reason)))
      }, 300)
      return () => clearTimeout(timer)
    }, [])

    const cell = (label: string, value: string): ReturnType<typeof h> =>
      h('div', { style: { display: 'inline-block', margin: '8px 16px', textAlign: 'center' as const } },
        h('div', { style: { fontSize: '26px', fontWeight: 700, color: MARK_TEAL } }, value),
        h('div', { style: { fontSize: '12px', color: '#666' } }, label))
    const sectionTitle = (text: string): ReturnType<typeof h> =>
      h('h3', { style: { margin: '20px 0 8px', fontSize: '13px', color: '#888', fontWeight: 600 } }, text)

    const roster = presets === undefined
      ? h('p', { style: { fontSize: '12px', color: '#999', margin: 0 } }, '读取中…')
      : presets.length === 0
        ? h('p', { style: { fontSize: '12px', color: '#999', margin: 0 } }, '（这个部署没有注册助手预设）')
        : h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.7 } },
            ...presets.map(preset => h('li', { key: preset.id },
              preset.name, h('span', { style: { color: '#aaa', fontSize: '11px' } }, ` · ${preset.id}`))))

    return h('div', { style: { padding: '24px', maxWidth: '560px' } },
      h('h2', { style: { margin: '0 0 4px', fontSize: '18px' } }, 'My Desk'),
      h('p', { style: { margin: '0 0 8px', fontSize: '12px', color: '#999' } },
        'This deployment\'s assistants (live, via the agentPresets Remote namespace):'),
      roster,
      error === undefined ? null : h('p', { style: { fontSize: '12px', color: '#c66', marginTop: '8px' } }, `⚠ ${error}`),
      sectionTitle('Working-folder counts'),
      h('div', null,
        cell('Memories', '—'),
        cell('Knowledge', '—'),
        cell('Skills', '—'),
        cell('Threads', '—')),
      h('p', { style: { fontSize: '12px', color: '#999', marginTop: '4px' } },
        'Pending a host-data channel: an out-of-tree package cannot open a new Remote namespace '
        + '(the browser-side manifest is generated from the vendor workspace). Next path: a desk '
        + 'file the assistant maintains in the workspace, read through workspaceFiles.'))
  }

  /** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
  const inject = ['slots', 'sidebarRightTabs', 'remote', 'remote.agentPresets']

  /**
   * Register the brand occupants as one declaration-aware set.
   * @param ctx - Browser root context.
   */
  /** The remote layer captured in apply; DeskPanel reads manifested namespaces through it. */
  let deskRemote: Record<string, unknown> | undefined

  function apply(ctx: ClientContext): void {
    deskRemote = (ctx as { remote?: Record<string, unknown> }).remote

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
    ctx.slots.inject('sidebar.panellist', () =>
      ctx.slots.register({
        name: 'sidebar.panellist',
        id: 'assistant-desk',
        order: 10,
        label: 'My Desk',
      }, DeskIcon))
    ctx.slots.inject('main', () =>
      ctx.slots.register({
        name: 'main',
        key: 'assistant-desk',
      }, DeskPanel))

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

  return { inject, apply, AssistantBrandMark, AssistantBrandName }
}

const facade = (globalThis as { __ModuleLoader__?: ModuleLoaderFacade }).__ModuleLoader__
if (facade !== undefined) {
  facade.load({ id: 'dsh-smart-assistant', factory: clientFactory })
}
