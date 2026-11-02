/**
 * The product's remembered main view: the desk (`main` panel) or the conversation.
 *
 * The shell resets layout state on reload — the Conversation is what an unselected panel
 * shows, and the Session itself is restored by ui-workspace. That reset is right for a generic
 * plugin and wrong for a product with two homes: refresh pulled the principal out of the
 * conversation they were in (E5, measured 2026-11-02). Instead of selecting the desk on every
 * load, the product remembers which of its two views the principal left and restores only the
 * desk — the conversation is already the shell's default.
 *
 * The first visit has no preference and is the desk: that is the product's home, unchanged by
 * this module. Another plugin's panel never overwrites the preference (the product's fact is
 * only "desk or chat").
 *
 * @module dsh-smart-assistant/client/chrome/main-view
 */

/** The two product views the preference distinguishes. */
export type MainView = 'desk' | 'chat'

/** The localStorage key; one product fact, next to `dsha:receipt-since` and `dsha:ui-mode`. */
export const MAIN_VIEW_KEY = 'dsha:main-view'

/** The storage slice this module uses (tests pass a plain object). */
export interface MainViewStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** The context slice the restore/track pair needs. */
export interface MainViewContext {
  readonly layout?: {
    readonly panelInfo?: {
      getSnapshot(): { readonly activePanelId: string | null }
      subscribe?(listener: () => void): () => void
    }
    selectPanel(panelId: string | null): void
  }
  effect(install: () => () => void, label?: string): unknown
}

/**
 * The per-materialization restore gate. The entry owns one of these in its `apply` closure, so a
 * slot/layout remount on the same page does not reopen the desk; a fresh materialization (page
 * reload or HMR) gets a fresh one. HMR itself is safe because the user's remembered view already
 * says chat — this state only prevents a second decision inside one materialization.
 */
export interface MainViewRestoreState {
  restored: boolean
}

/**
 * Per-root restore state. A page root keeps its gate across plugin/slot rematerializations;
 * a new page root gets a new gate. This is a keyed association, not a page-global singleton:
 * the module re-evaluates on HMR, and the remembered `chat` preference is what keeps a reloaded
 * page in the conversation.
 */
const restoreStates = new WeakMap<object, MainViewRestoreState>()

/**
 * @param root - The stable Client root shared by every plugin scope; a test shim without one
 *   gets a fresh gate rather than a crash (the keyed association needs an object).
 * @returns the restore gate for this root.
 */
export function restoreStateFor(root: unknown): MainViewRestoreState {
  if (typeof root !== 'object' || root === null) return { restored: false }
  const existing = restoreStates.get(root)
  if (existing !== undefined) return existing
  const created: MainViewRestoreState = { restored: false }
  restoreStates.set(root, created)
  return created
}

/** Browser storage, or undefined in a page global without localStorage (tests, SSR-ish shims). */
function storageOrDefault(storage?: MainViewStorage): MainViewStorage | undefined {
  if (storage !== undefined) return storage
  try {
    return (globalThis as { localStorage?: MainViewStorage }).localStorage
  } catch {
    return undefined
  }
}

/**
 * Read the saved view. Anything unreadable or unexpected means "desk": the first visit's home.
 * @param storage - Storage slice; omitted reads the page's localStorage.
 * @returns the saved view, defaulting to the desk.
 */
export function readMainView(storage?: MainViewStorage): MainView {
  try {
    return storageOrDefault(storage)?.getItem(MAIN_VIEW_KEY) === 'chat' ? 'chat' : 'desk'
  } catch {
    return 'desk'
  }
}

/**
 * Persist one view. Storage failures (private mode, quota) leave the in-memory behavior alone:
 * the preference is an enhancement, never a reason the client fails to register.
 * @param view - The view to remember.
 * @param storage - Storage slice; omitted writes the page's localStorage.
 */
export function writeMainView(view: MainView, storage?: MainViewStorage): void {
  try {
    storageOrDefault(storage)?.setItem(MAIN_VIEW_KEY, view)
  } catch { /* the preference is best-effort */ }
}

/**
 * Restore the desk when the preference says so and nothing else has claimed the panel. A
 * saved conversation preference leaves the panel unselected — the shell's own restore then
 * shows the Session it reconnected.
 * @param ctx - The layout face (the entry's plugin context).
 * @param dashboardKey - The product panel's `main` key.
 * @param storage - Storage slice; omitted reads the page's localStorage.
 * @param state - Optional per-materialization gate; the entry creates one in its closure.
 */
export function restoreMainView(
  ctx: MainViewContext,
  dashboardKey: string,
  storage?: MainViewStorage,
  state?: MainViewRestoreState,
): void {
  const layout = ctx.layout
  const panelInfo = layout?.panelInfo
  if (layout === undefined || panelInfo === undefined) return
  if (state !== undefined) {
    if (state.restored) return
    state.restored = true
  }
  if (readMainView(storage) !== 'desk') return
  if (panelInfo.getSnapshot().activePanelId !== null) return
  layout.selectPanel(dashboardKey)
}

/**
 * Keep the preference in step with the visible product view. Only the product panel and the
 * conversation (`null`) are recorded; another plugin's panel leaves the saved view untouched.
 * The subscription lives with the plugin fiber.
 * @param ctx - Client root + layout face.
 * @param dashboardKey - The product panel's `main` key.
 * @param storage - Storage slice; omitted writes the page's localStorage.
 */
export function trackMainView(ctx: MainViewContext, dashboardKey: string, storage?: MainViewStorage): void {
  const layout = ctx.layout
  const panelInfo = layout?.panelInfo
  const subscribe = panelInfo?.subscribe
  if (layout === undefined || panelInfo === undefined || typeof subscribe !== 'function') return
  const target = storageOrDefault(storage)
  ctx.effect(() => subscribe.call(panelInfo, () => {
    const activePanelId = panelInfo.getSnapshot().activePanelId
    if (activePanelId === dashboardKey) writeMainView('desk', target)
    else if (activePanelId === null) writeMainView('chat', target)
  }), 'assistant: main view preference')
}
