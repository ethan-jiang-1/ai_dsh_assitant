/**
 * Structural mirrors of the vendor client contracts this face consumes.
 *
 * Type-only module: everything here is erased at emit, so importing it costs nothing at
 * runtime. Mirroring (instead of importing vendor types) is deliberate — the browser half
 * predates the bundler and its types must never pull the vendor tree into the client
 * graph; drift fails loudly at registration/compile time.
 *
 * @module dsh-smart-assistant/client/contracts
 */

/** Geometry the sidebar supplies to the brand-mark occupant (mirrors the sidebar contract). */
export interface BrandMarkProps {
  /** Requested square edge in pixels. */
  size: number
}

/** The slots-registry surface this face uses (structural mirror of the client renderer's). */
export interface SlotsRegistry {
  inject(name: string, contribute: () => unknown): unknown
  register(declaration: { name: string, [key: string]: unknown }, component: (props: never) => unknown): unknown
}

/** The browser root-context surface this face uses. */
export interface ClientContext {
  /** Stable Client application identity shared by every plugin scope. */
  readonly root: object
  effect: (install: () => () => void) => unknown
  connection: Parameters<typeof import('./projection-reader').createProjectionReader>[0]
  slots: SlotsRegistry
  sidebarRightTabs: SidebarRightTabsRegistry
  /** The right-sidebar controller, so a page can open a room tab beside the conversation. */
  sidebarRight?: { openTab: (kind: string, options?: { params?: unknown }) => void }
  /**
   * Root-scoped navigation face: panelInfo supplies the initial default decision;
   * selectPanel(null) returns the main area to Conversation without changing the Session.
   */
  layout?: {
    readonly panelInfo: {
      getSnapshot: () => { readonly activePanelId: string | null }
      subscribe(listener: () => void): () => void
    }
    selectPanel: (panelId: string | null) => void
  }
  /**
   * The session-controller client face: processing paths create or adopt a session, retain it
   * as the main view (the retained-by-mainView session is the current Conversation), and
   * observe the catalog for binding changes.
   */
  sessions?: {
    create(opts?: { readonly workspaceId?: string, readonly cwd?: string, readonly sessionId?: string }): Promise<string>
    retain(target: string, options: { readonly source: string }): { release(): void }
    readonly list: { subscribe(listener: () => void): () => void }
  }
  /** The workspace catalog face: processing sessions are created inside the designated workspace. */
  workspaces?: {
    readonly list: {
      getSnapshot(): { readonly items: readonly { readonly workspaceId: string, readonly sessionIds: readonly string[] }[] }
      subscribe(listener: () => void): () => void
    }
  }
  /**
   * The ui-session binding face: per-session status facts (running fails closed when absent,
   * a pending interaction is any non-undefined value) and the current main-view binding key.
   */
  uiSession?: {
    readonly sessionStatus: {
      getSnapshot(): ReadonlyMap<string, { readonly running?: boolean, readonly pendingInteraction?: unknown }>
      subscribe(listener: () => void): () => void
    }
    readonly current: { readonly value: { readonly key?: unknown } }
  }
  /**
   * The workspace navigation face: `openSession` is the shell's own "select a Session and
   * show its Conversation" action (retain + selection + previous-reference release + reveal).
   * The processing path must go through it — retaining alone leaves the selection on the
   * already-mainView-retained current session, and the principal would type into the OLD
   * conversation (probed, desk-process-e2e, 2026-10-10).
   */
  uiWorkspace?: {
    openSession(target: string): void
  }
  /**
   * Scoped dependency injection. The command registry is reached this way instead of
   * through the plugin's own `inject` list: the rooms must render whether or not the
   * composition carries a command surface, so the panels must not wait on it.
   */
  inject?: (deps: string[], callback: (scope: { get: (name: string) => unknown }) => void) => unknown
}

/** One client-owned command's UI behavior (mirrors the ui-commands contract). */
export interface CommandActionSpec {
  readonly kind: 'action'
  /** Runs for one session; consumes the trigger token and submits nothing. */
  run(session: unknown): void
}

/** A client-owned slash-menu command (mirrors the ui-commands contract). */
export interface CommandContribution {
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
export interface CommandUiRegistry {
  register(contribution: CommandContribution): unknown
}

/**
 * The three rooms as one vocabulary. A bare `string` here let a mistyped kind compile —
 * the card's own red-proof had to simulate exactly that bug — so the union makes it
 * unrepresentable instead.
 */
export type RoomKind = 'desk' | 'knowledgeRoom' | 'memoryRoom'

/** One capsule the right sidebar's guide ("+" picker) lists; picking it opens this type. */
export interface SidebarRightGuideEntry {
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
export interface SidebarRightTabDefinition {
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
export interface SidebarRightTabsRegistry {
  register(definition: SidebarRightTabDefinition): unknown
}

/** Synchronous module-table require handed to a client bundle factory. */
export type ClientRequire = (spec: string) => unknown

/** One client bundle's factory registration submitted through the page-global facade. */
export interface ClientBundleRegistration {
  /** Package name — the registration key; must match the graph row being executed. */
  readonly id: string
  /** Closure factory; runs once at materialization and returns the plugin surface. */
  readonly factory: (require: ClientRequire) => Record<string, unknown>
}

/** Stable page-global facade the served index preloads ahead of every combo script. */
export interface ModuleLoaderFacade {
  load(registration: ClientBundleRegistration): void
}
