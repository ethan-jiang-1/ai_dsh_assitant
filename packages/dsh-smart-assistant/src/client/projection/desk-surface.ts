/**
 * The desk's lane surface: the callbacks the projection panel exposes to the principal,
 * detached from the panel's own props.
 *
 * Why: the panel carried 20 top-level props (four framework-bound hooks, the view store and
 * its actions, and a dozen callbacks) and every test constructed the whole shape by hand. The
 * framework-bound hooks and the declared store must stay top-level — the renderer binds them
 * from `hooks` and `store` — but the callbacks are one entry-owned concern. This module is
 * their factory, so adding a lane touches one place instead of every render fixture.
 *
 * @module dsh-smart-assistant/client/projection/desk-surface
 */
import type { ClientContext } from '../chrome/contracts'
import { returnToConversation } from '../chrome/navigation'
import type { DeskArms } from '../desk/desk-arms'
import type { ProactiveHandlers } from '../proactive/proactive-handlers'

/** The panel-facing callbacks; every one is wired by the entry's apply world. */
export interface DeskLanes {
  readonly refreshProjection: () => void
  readonly onAsk: () => void
  readonly onEntrust?: () => void
  readonly onCapture: (text: string, options?: { lane?: 'capture' | 'action', label?: string, source?: 'desk' | 'home' | 'page-action' }) => void
  readonly onOpenSession: (sessionId: string) => void
  readonly onOpenRecords?: () => void
  readonly onOpenTasks?: () => void
  readonly onProcess: (matterId: string) => void
  readonly onClaim: (fragmentId: string) => void
  readonly onDiscard: (fragmentId: string) => void
  readonly onWake: (matterId: string) => void
  readonly onSuggestAction?: (kind: 'trial' | 'watch', id: string) => void
  readonly onSuggestDismiss?: (id: string) => void
  readonly onWatchForget?: (title: string) => void
  readonly onSuggestCollapse?: (collapsed: boolean) => void
}

/** The entry-owned half of the projection panel's props. */
export interface DeskSurface {
  readonly lanes: DeskLanes
}

/** What the surface factory reads from the apply world. */
export interface DeskSurfaceInput {
  readonly ctx: ClientContext
  /** The slot's session, resolved at injection time; absent on the root `main` seat. */
  readonly sessionId: string | undefined
  readonly reader: { refresh(): void } | undefined
  readonly arms: DeskArms
  readonly handlers: ProactiveHandlers
  /** Opens the "它记下的" drawer (the knowledge room's human view); absent = the link is hidden. */
  readonly openRecords?: () => void
}

/**
 * Build one materialization's lane surface. The reading hooks stay in the entry's `hooks`
 * object (the renderer binds them); this object owns only what the panel calls.
 * @param input - The apply world's faces.
 * @returns The lane surface the panel receives as `surface`.
 */
export function createDeskSurface(input: DeskSurfaceInput): DeskSurface {
  const { ctx, sessionId, reader, arms, handlers } = input
  return {
    lanes: {
      refreshProjection: () => { reader?.refresh() },
      onAsk: () => returnToConversation(ctx, sessionId, typeof document === 'undefined' ? {} : { document }),
      onEntrust: arms.startIntake,
      onCapture: arms.captureFromDesk,
      onOpenSession: (id: string) => { ctx.uiWorkspace?.openSession(id) },
      ...(input.openRecords !== undefined ? { onOpenRecords: input.openRecords } : {}),
      onOpenTasks: () => { ctx.layout?.selectPanel('schedules') },
      onProcess: arms.processMatter,
      onClaim: arms.claimFragment,
      onDiscard: arms.discardFragment,
      onWake: arms.wakeMatter,
      onSuggestAction: handlers.onSuggestAction,
      onSuggestDismiss: handlers.onSuggestDismiss,
      onWatchForget: handlers.onWatchForget,
      onSuggestCollapse: handlers.onSuggestCollapse,
    },
  }
}
