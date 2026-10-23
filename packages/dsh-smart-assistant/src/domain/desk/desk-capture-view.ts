/**
 * The desk's capture-row view: the phase of a delivered line, whether its session is still
 * waiting, and which *other* sessions are waiting on the principal.
 *
 * The rules used to live inside the 630-line panel, so the only way to verify "when does the
 * row stop showing" or "which question belongs to the row" was to render and join strings. They
 * are pure inputs (a receipt, the projection revision, the platform status map) and one result.
 *
 * @module dsh-smart-assistant/domain/desk/desk-capture-view
 */

import { capturePhase, type CapturePhase, type CaptureStatus } from './desk-process.ts'

/** The delivery receipt fields the view reads (structural; the client type is broader). */
export interface CaptureReceiptView {
  readonly sessionId: string
  readonly observedRevision: number
  readonly lane?: string
}

/** Everything the capture row's state depends on. */
export interface CaptureViewInput {
  readonly receipt: CaptureReceiptView | null
  /** The projection's current revision; a move past the receipt resolves the row. */
  readonly revision: number
  readonly statuses: ReadonlyMap<string, CaptureStatus>
}

/** The derived capture-row state. */
export interface CaptureView {
  readonly phase?: CapturePhase
  /** The row is in flight: the desk's own input stays shut. */
  readonly pending: boolean
  /** A no-ledger action lane (trial / watch) settled by the turn ending, not by a revision. */
  readonly isActionLane: boolean
  /** The session the row speaks for; its own pending question is the row's, not a second one. */
  readonly ownsSession?: string
  /** Sessions waiting on the principal that the capture row does not already own. */
  readonly questionSessions: readonly string[]
  readonly openQuestions: number
}

/**
 * Derive the capture row's state from the platform's own session facts.
 * @param input - The receipt, the current projection revision, and the per-session status map.
 * @returns The phase, pending flag, action-lane flag, owned session, and the other waiting sessions.
 */
export function deriveCaptureView(input: CaptureViewInput): CaptureView {
  const { receipt, revision, statuses } = input
  const phase = receipt === null ? undefined : capturePhase(receipt.observedRevision, revision, statuses.get(receipt.sessionId))
  const pending = phase === 'running' || phase === 'queued'
  const ownsSession = receipt !== null && phase !== undefined && phase !== 'resolved' ? receipt.sessionId : undefined
  const questionSessions = [...statuses]
    .filter(([id, status]) => status.pendingInteraction !== undefined && id !== ownsSession)
    .map(([id]) => id)
  return {
    ...(phase !== undefined ? { phase } : {}),
    pending,
    isActionLane: receipt?.lane === 'action',
    ...(ownsSession !== undefined ? { ownsSession } : {}),
    questionSessions,
    openQuestions: questionSessions.length,
  }
}
