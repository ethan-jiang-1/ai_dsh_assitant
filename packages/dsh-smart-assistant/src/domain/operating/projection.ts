/**
 * The ledger → projection renderer (desk-operating-entry K3, slice E): the read-only Web view
 * derived on demand from the authoritative ledger state. Nothing here persists — the Host
 * download route renders it per request, so there is never a second writable truth.
 *
 * The envelope revision counts persisted operations (every state change is one operation, so
 * the count is monotonic); per-matter revisions ride each matter for read-back confirmation.
 * The reminders lane is a fixed empty placeholder until V4/V5 reminder coordination lands.
 */

import type { LedgerSource, LedgerState, MatterRecord, MaterialRecord, OperationOutcome as OperationOutcomeWire } from './ledger.ts'

/** One read-only evidence entry; event positioning is a claim carried when present. */
export interface ProjectionEvidence {
  readonly id: string
  readonly sessionId: string
  readonly eventId?: string
  readonly quote?: string
  readonly note: string
  readonly receivedAt: string
}

/** One proposal on a matter, retained with its source and explicit resolution link. */
export interface ProjectionProposal {
  readonly id: string
  readonly kind: string
  readonly status: string
  readonly proposedAt: string
  readonly source: LedgerSource
  readonly resolutionOperationId?: string
}

/** One flattened operation receipt — the read-back unit: operation, matter, outcome, source session. */
export interface ProjectionReceipt {
  readonly operationId: string
  readonly matterId: string
  /** The session that submitted the operation (provenance for path matching). */
  readonly sessionId: string
  readonly submittedAt: string
  readonly status: string
  readonly revision?: number
  readonly unclaimedId?: string
  readonly proposalId?: string
  readonly observedRevision?: number
  readonly currentRevision?: number
  readonly reason?: string
}

/** One matter as the desk sees it: identity, revision, times, evidence, proposals. */
export interface ProjectionMatter {
  readonly id: string
  readonly title: string
  readonly status: 'active' | 'completed' | 'abandoned'
  readonly summary: string
  readonly responsible: string
  readonly revision: number
  readonly times: { readonly promisedDeadline?: string; readonly forecastAt?: string; readonly nextCheckpoint?: string; readonly completedAt?: string }
  readonly evidence: readonly ProjectionEvidence[]
  readonly proposals: readonly ProjectionProposal[]
}

/** The v2 read-only projection served to the Web client. */
export interface OperatingProjectionV2 {
  readonly schemaVersion: 2
  readonly ledgerId: string
  readonly revision: number
  readonly generatedAt: string
  readonly matters: readonly ProjectionMatter[]
  readonly receipts: readonly ProjectionReceipt[]
  readonly unclaimed: readonly { readonly id: string; readonly note: string; readonly sessionId: string }[]
  readonly reminders: readonly []
}

/**
 * Render the ledger state as the v2 Web projection.
 * @param state - The authoritative ledger state.
 * @param ledgerId - Deployment ledger identity (the operating directory name).
 * @param generatedAt - Render instant (ISO), supplied by the Host route.
 * @returns The frozen projection; no state is mutated or persisted.
 */
export function renderLedgerProjection(state: LedgerState, ledgerId: string, generatedAt: string): OperatingProjectionV2 {
  const evidence = (matter: MatterRecord): readonly ProjectionEvidence[] => matter.materials.map((material: MaterialRecord) => ({
    id: material.id,
    sessionId: material.source.sessionId,
    ...(material.source.eventId !== undefined ? { eventId: material.source.eventId } : {}),
    ...(material.source.quote !== undefined ? { quote: material.source.quote } : {}),
    note: material.note,
    receivedAt: material.receivedAt,
  }))
  const matters = Object.values(state.matters).map(matter => ({
    id: matter.id,
    title: matter.title,
    status: matter.status,
    summary: matter.summary,
    responsible: matter.responsible,
    revision: matter.revision,
    times: {
      ...(matter.times.promisedDeadline !== undefined ? { promisedDeadline: matter.times.promisedDeadline } : {}),
      ...(matter.times.forecastAt !== undefined ? { forecastAt: matter.times.forecastAt } : {}),
      ...(matter.times.nextCheckpoint !== undefined ? { nextCheckpoint: matter.times.nextCheckpoint } : {}),
      ...(matter.times.completedAt !== undefined ? { completedAt: matter.times.completedAt } : {}),
    },
    evidence: evidence(matter),
    proposals: matter.proposals.map(proposal => ({
      id: proposal.id,
      kind: proposal.change.kind,
      status: proposal.status,
      proposedAt: proposal.proposedAt,
      source: proposal.source,
      ...(proposal.resolutionOperationId !== undefined ? { resolutionOperationId: proposal.resolutionOperationId } : {}),
    })),
  }))
  const receipts = Object.values(state.operations).map(({ operation, receipt }) => {
    const outcome = receipt.outcome
    return {
      operationId: receipt.operationId,
      matterId: receipt.matterId,
      sessionId: operation.source.sessionId,
      submittedAt: receipt.submittedAt,
      ...flattenOutcome(outcome),
    }
  })
  return Object.freeze({
    schemaVersion: 2 as const,
    ledgerId,
    revision: Object.keys(state.operations).length,
    generatedAt,
    matters: Object.freeze(matters),
    receipts: Object.freeze(receipts),
    unclaimed: Object.freeze(Object.values(state.unclaimed).map(fragment => ({
      id: fragment.id, note: fragment.note, sessionId: fragment.source.sessionId,
    }))),
    reminders: Object.freeze([] as const),
  })
}

/**
 * Flatten one operation outcome into its wire shape.
 * @param outcome - The receipt outcome from the ledger.
 * @returns The discriminating status plus its fields, spread-ready.
 */
function flattenOutcome(outcome: OperationOutcomeWire): { status: string } & Record<string, string | number> {
  if (outcome.status === 'committed') {
    return {
      status: outcome.status,
      revision: outcome.revision,
      ...(outcome.proposalId !== undefined ? { proposalId: outcome.proposalId } : {}),
    }
  }
  if (outcome.status === 'proposal-rejected') {
    return { status: outcome.status, proposalId: outcome.proposalId, revision: outcome.revision }
  }
  if (outcome.status === 'retained') return { status: outcome.status, unclaimedId: outcome.unclaimedId }
  if (outcome.status === 'proposed') return { status: outcome.status, proposalId: outcome.proposalId }
  if (outcome.status === 'conflict') {
    return { status: outcome.status, observedRevision: outcome.observedRevision, currentRevision: outcome.currentRevision }
  }
  return { status: outcome.status, reason: outcome.reason }
}
