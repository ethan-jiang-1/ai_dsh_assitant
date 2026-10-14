/** Versioned Web read projection, separate from ledger writes and operation receipts. */
import type { ProjectionReceipt } from '../domain/operating/projection.ts'

export interface OperatingEvidence {
  readonly id: string
  readonly sessionId: string
  readonly eventId?: string
  readonly quote?: string
  readonly note: string
  readonly receivedAt?: string
}
export interface OperatingProposal {
  readonly id: string
  readonly kind: string
  readonly status: 'pending' | 'confirmed' | 'rejected'
  readonly proposedAt?: string
  readonly source?: { readonly sessionId: string; readonly eventId?: string; readonly quote?: string }
  readonly resolutionOperationId?: string
}
export interface OperatingMatter {
  readonly id: string
  readonly title: string
  readonly status: 'active' | 'completed' | 'abandoned'
  readonly summary: string
  readonly responsible: string
  readonly revision: number
  readonly times: { readonly promisedDeadline?: string; readonly forecastAt?: string; readonly nextCheckpoint?: string; readonly completedAt?: string }
  readonly evidence: readonly OperatingEvidence[]
  readonly proposals: readonly OperatingProposal[]
}

/** Client receipt view: additive v2 biography fields may be absent in earlier envelopes. */
export type OperatingReceipt = Omit<ProjectionReceipt, 'kind'> & { readonly kind?: string }

export interface OperatingProjection {
  readonly schemaVersion: 1 | 2
  readonly ledgerId: string
  readonly revision: number
  readonly matters: readonly OperatingMatter[]
  readonly receipts: readonly OperatingReceipt[]
  readonly unclaimed: readonly { readonly id: string; readonly note: string; readonly sessionId: string }[]
  readonly fixture?: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
function revision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function evidenceV1(value: unknown): value is { id: string, sessionId: string, eventId: string, quote: string } {
  return record(value) && text(value.id) && text(value.sessionId) && text(value.eventId) && text(value.quote)
}
function evidenceV2(value: unknown): value is OperatingEvidence {
  return record(value) && text(value.id) && text(value.sessionId) && text(value.note)
    && (value.eventId === undefined || text(value.eventId))
    && (value.quote === undefined || text(value.quote))
    && (value.receivedAt === undefined || text(value.receivedAt))
}
function proposalSource(value: unknown): value is NonNullable<OperatingProposal['source']> {
  return record(value) && text(value.sessionId)
    && (value.eventId === undefined || text(value.eventId))
    && (value.quote === undefined || text(value.quote))
}
function proposal(value: unknown): value is OperatingProposal {
  return record(value) && text(value.id) && text(value.kind)
    && (value.status === 'pending' || value.status === 'confirmed' || value.status === 'rejected')
    && (value.proposedAt === undefined || text(value.proposedAt))
    && (value.source === undefined || proposalSource(value.source))
    && (value.resolutionOperationId === undefined || text(value.resolutionOperationId))
}
function matterV1(value: unknown): value is { id: string, title: string, status: 'active' | 'completed', summary: string, evidence: { id: string, sessionId: string, eventId: string, quote: string }[] } {
  return record(value) && text(value.id) && text(value.title)
    && (value.status === 'active' || value.status === 'completed') && typeof value.summary === 'string'
    && Array.isArray(value.evidence) && value.evidence.every(evidenceV1)
    && new Set(value.evidence.map(item => (item as { id: string }).id)).size === value.evidence.length
}
function times(value: unknown): value is OperatingMatter['times'] {
  if (!record(value)) return false
  return (value.promisedDeadline === undefined || text(value.promisedDeadline))
    && (value.forecastAt === undefined || text(value.forecastAt))
    && (value.nextCheckpoint === undefined || text(value.nextCheckpoint))
    && (value.completedAt === undefined || text(value.completedAt))
}
function matterV2(value: unknown): value is OperatingMatter {
  return record(value) && text(value.id) && text(value.title)
    && (value.status === 'active' || value.status === 'completed' || value.status === 'abandoned')
    && typeof value.summary === 'string' && typeof value.responsible === 'string'
    && typeof value.revision === 'number' && Number.isSafeInteger(value.revision) && value.revision >= 1
    && times(value.times)
    && Array.isArray(value.evidence) && value.evidence.every(evidenceV2)
    && new Set(value.evidence.map(item => (item as { id: string }).id)).size === value.evidence.length
    && Array.isArray(value.proposals) && value.proposals.every(proposal)
    && new Set(value.proposals.map(item => (item as { id: string }).id)).size === value.proposals.length
}
function receipt(value: unknown): value is OperatingReceipt {
  return record(value) && text(value.operationId) && typeof value.matterId === 'string' && text(value.sessionId) && text(value.submittedAt) && text(value.status)
    && (value.revision === undefined || revision(value.revision))
    && (value.unclaimedId === undefined || text(value.unclaimedId))
    && (value.proposalId === undefined || text(value.proposalId))
    && (value.observedRevision === undefined || revision(value.observedRevision))
    && (value.currentRevision === undefined || revision(value.currentRevision))
    && (value.reason === undefined || text(value.reason))
    && (value.kind === undefined || text(value.kind))
    && (value.quote === undefined || text(value.quote))
}
function unclaimed(value: unknown): value is { id: string, note: string, sessionId: string } {
  return record(value) && text(value.id) && text(value.note) && text(value.sessionId)
}
function uniqueMatters(matters: unknown[]): boolean {
  return new Set(matters.map(item => (item as { id: string }).id)).size === matters.length
}

/**
 * Validate downloaded JSON before publishing it as a matter collection. No implicit migration,
 * generated identities or status inference — the one compatibility shim is the v1 branch, which
 * lifts the fixture envelope onto the v2 shape by filling v1's absent fields with fixed
 * defaults (`responsible: ''`, `revision: 1`, `note = quote`): a presentation upgrade of the
 * fixed simulation input, never an inference about real business state. Evidence locations are claims, not verified existence.
 * v1 is the fixed-fixture envelope (K1/K2); v2 is the live ledger render (K3) carrying
 * per-matter revisions, proposals, operation receipts, and unclaimed fragments.
 * @param input - Untrusted downloaded JSON.
 * @returns Valid v1 or v2 projection; throws on incompatible version or malformed identities/evidence.
 */
export function parseOperatingProjection(input: unknown): OperatingProjection {
  if (!record(input) || !text(input.ledgerId) || !revision(input.revision)
    || !Array.isArray(input.matters) || !uniqueMatters(input.matters)
    || (input.fixture !== undefined && typeof input.fixture !== 'boolean')) {
    throw new Error('invalid operating projection')
  }
  if (input.schemaVersion === 1) {
    if (!input.matters.every(matterV1)) throw new Error('invalid operating projection')
    return Object.freeze({
      schemaVersion: 1 as const,
      ledgerId: input.ledgerId,
      revision: input.revision,
      matters: Object.freeze(input.matters.map(item => Object.freeze({
        id: item.id, title: item.title, status: item.status, summary: item.summary, responsible: '', revision: 1,
        times: Object.freeze({}),
        evidence: Object.freeze(item.evidence.map(source => Object.freeze({
          id: source.id, sessionId: source.sessionId, eventId: source.eventId, quote: source.quote, note: source.quote,
        }))),
        proposals: Object.freeze([]),
      }))),
      receipts: Object.freeze([]),
      unclaimed: Object.freeze([]),
      ...(input.fixture === undefined ? {} : { fixture: input.fixture }),
    })
  }
  if (input.schemaVersion === 2) {
    if (!input.matters.every(matterV2) || !Array.isArray(input.receipts) || !input.receipts.every(receipt)
      || new Set(input.receipts.map(item => (item as { operationId: string }).operationId)).size !== input.receipts.length
      || !Array.isArray(input.unclaimed) || !input.unclaimed.every(unclaimed)
      || !Array.isArray(input.reminders) || input.reminders.length > 0
      || (input.generatedAt !== undefined && !text(input.generatedAt))) {
      throw new Error('invalid operating projection')
    }
    return Object.freeze({
      schemaVersion: 2 as const,
      ledgerId: input.ledgerId,
      revision: input.revision,
      matters: Object.freeze(input.matters.map(item => Object.freeze({
        id: item.id, title: item.title, status: item.status, summary: item.summary, responsible: item.responsible, revision: item.revision,
        times: Object.freeze({ ...item.times }),
        evidence: Object.freeze(item.evidence.map(source => Object.freeze({ ...source }))),
        proposals: Object.freeze(item.proposals.map(proposal => Object.freeze({ ...proposal }))),
      }))),
      receipts: Object.freeze(input.receipts.map(item => Object.freeze({ ...item }))),
      unclaimed: Object.freeze(input.unclaimed.map(item => Object.freeze({ ...item }))),
    })
  }
  throw new Error('invalid operating projection')
}
