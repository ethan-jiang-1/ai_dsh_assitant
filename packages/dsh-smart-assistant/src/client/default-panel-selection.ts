/** Root-scoped default dashboard selection, independent of the client composition entry. */
interface DefaultPanelSelectionContext {
  readonly root: object
  readonly layout?: {
    readonly panelInfo: { getSnapshot(): { readonly activePanelId: string | null } }
    selectPanel(panelId: string | null): void
  }
}

/**
 * Select the dashboard once per Client root, and only when the first available panel is unselected.
 * Weak root identities survive slot/layout remounts and client HMR; a document reload gets a new root.
 * @param ctx - The Client root and its optional layout state.
 */
export function selectDashboardByDefault(ctx: DefaultPanelSelectionContext): void {
  const layout = ctx.layout
  const panelInfo = layout?.panelInfo
  if (layout === undefined || panelInfo === undefined) return
  const pageState = globalThis as typeof globalThis & {
    __DSH_SMART_ASSISTANT_DEFAULT_PANEL_ROOTS__?: WeakSet<object>
  }
  const defaultPanelRoots = pageState.__DSH_SMART_ASSISTANT_DEFAULT_PANEL_ROOTS__ ??= new WeakSet<object>()
  if (defaultPanelRoots.has(ctx.root)) return
  defaultPanelRoots.add(ctx.root)
  if (panelInfo.getSnapshot().activePanelId === null) {
    layout.selectPanel('dsh-smart-assistant-dashboard')
  }
}
