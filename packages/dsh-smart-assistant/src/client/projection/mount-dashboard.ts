/**
 * Mount the desk's `main` panel for one materialization: the injection face (session-aware
 * hooks, the surface's lanes, receipt-archive paging), the keyed slot registration, and the
 * remembered-view restore/track pair.
 *
 * This is the entry's largest cohesive block. Keeping it next to the projection/desk surfaces
 * means a reader who asks "what does the desk panel receive?" opens one module, not the whole
 * client composition root.
 *
 * @module dsh-smart-assistant/client/mount-dashboard
 */
import type { ClientContext } from '../chrome/contracts'
import type { SnapshotStore } from '../chrome/store'
import { restoreMainView, restoreStateFor, trackMainView } from '../chrome/main-view'
import type { CaptureStatus } from '../../domain/desk/desk-process'
import type { DeskArms } from '../desk/desk-arms'
import type { ProactiveCatalogState } from '../proactive/proactive-face-source'
import type { ProactiveHandlers } from '../proactive/proactive-handlers'
import type { ProactiveUiState } from '../proactive/proactive-face'
import { createDeskSurface } from './desk-surface'
import type { ProjectionPanelProps } from './projection-panel'
import { fetchReceiptArchivePage, type ProjectionDownload } from './projection-reader'
import type { ProjectionViewHandle } from './projection-view'
import { returnToConversation } from '../chrome/navigation'

/** Desk actions the slot's render machinery hands back; only `selectMatter` is held. */
export interface DeskViewActions {
  selectMatter(id: string): void
  selectMode(mode: 'activity'): void
}

/** Everything the desk panel needs from the apply world. */
export interface DashboardMountDeps {
  readonly projection: SnapshotStore<ProjectionDownload> | undefined
  readonly viewStore: ProjectionViewHandle | undefined
  readonly reader: { refresh(): void } | undefined
  readonly arms: DeskArms
  readonly sessionStatuses: SnapshotStore<ReadonlyMap<string, CaptureStatus>> | undefined
  readonly proactiveCatalog: SnapshotStore<ProactiveCatalogState> | undefined
  readonly proactiveUi: SnapshotStore<ProactiveUiState> | undefined
  readonly handlers: ProactiveHandlers
  readonly dashboard: (props: ProjectionPanelProps) => unknown
  readonly openRecords: () => void
  readonly setDeskActions: (actions: DeskViewActions | undefined) => void
  readonly receiveActivity: (actions: DeskViewActions | undefined) => void
}

/** The inject face the entry also hands to the debug conversation view. */
export interface DashboardMount {
  injectDashboard(...args: unknown[]): unknown
}

/**
 * Register the dashboard on the `main` slot and the remembered-view subscription.
 * @param ctx - The client apply context.
 * @param deps - Stores, surface inputs, and the wrapper component.
 */
export function mountDashboard(ctx: ClientContext, deps: DashboardMountDeps): DashboardMount {
  const dashboardInject = (sessionId: string | undefined, ...args: unknown[]) => {
    const actions = args.find((argument): argument is DeskViewActions =>
      typeof argument === 'object' && argument !== null && typeof (argument as { selectMatter?: unknown }).selectMatter === 'function')
    deps.setDeskActions(actions)
    deps.receiveActivity(actions)
    const hooks = {
      ...(deps.projection === undefined ? {} : { projection: deps.projection }),
      ...(deps.sessionStatuses === undefined ? {} : { sessionStatus: deps.sessionStatuses }),
      ...(deps.proactiveCatalog === undefined ? {} : { catalog: deps.proactiveCatalog }),
      ...(deps.proactiveUi === undefined ? {} : { proactiveUi: deps.proactiveUi }),
    }
    const surface = createDeskSurface({
      ctx,
      sessionId,
      reader: deps.reader,
      arms: deps.arms,
      handlers: deps.handlers,
      openRecords: deps.openRecords,
    })
    const current = ctx.uiSession?.current.value.key
    const resolvedSession = sessionId ?? (current === undefined ? undefined : String(current))
    const loadOlderReceipts = (before: string | undefined, scope?: { readonly matterId?: string }) =>
      fetchReceiptArchivePage({ baseURI: document.baseURI, fetch }, before, scope?.matterId)
    return {
      surface,
      hooks,
      loadOlderReceipts,
      ...(resolvedSession === undefined ? {} : { sessionId: resolvedSession }),
      // The fallback panel (no projection store in this composition) reads only the return.
      ...(deps.projection === undefined
        ? { onAsk: () => returnToConversation(ctx, sessionId, typeof document === 'undefined' ? {} : { document }) }
        : {}),
    }
  }
  // The slot inject face is variadic and differs between `main` (no session) and
  // `conversation.view` (session first). Resolve the session once at injection.
  const injectDashboard = (...args: unknown[]) => dashboardInject(
    args.find((argument): argument is string => typeof argument === 'string'),
    ...args,
  )
  const mainViewRestore = restoreStateFor(ctx.root)
  ctx.slots.inject('main', () => {
    const registration = ctx.slots.register({
      name: 'main',
      key: 'dsh-smart-assistant-dashboard',
      locale: 'assistantDesk',
      ...(deps.viewStore === undefined ? {} : { store: deps.viewStore }),
      inject: injectDashboard,
    }, deps.dashboard)
    // The shell resets layout on reload; the product remembers which of its two views the
    // principal left (first visit = the desk) instead of forcing one on every load.
    restoreMainView(ctx, 'dsh-smart-assistant-dashboard', undefined, mainViewRestore)
    return registration
  })
  trackMainView(ctx, 'dsh-smart-assistant-dashboard')
  return { injectDashboard }
}
