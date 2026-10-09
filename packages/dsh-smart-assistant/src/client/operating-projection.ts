/** Versioned Web read projection, separate from ledger writes and operation receipts. */
export interface OperatingEvidence {
  readonly id: string
  readonly sessionId: string
  readonly eventId: string
  readonly quote: string
}
export interface OperatingMatter {
  readonly id: string
  readonly title: string
  readonly status: 'active' | 'completed'
  readonly summary: string
  readonly evidence: readonly OperatingEvidence[]
}
export interface OperatingProjection {
  readonly schemaVersion: 1
  readonly ledgerId: string
  readonly revision: number
  readonly matters: readonly OperatingMatter[]
  readonly fixture?: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
function evidence(value: unknown): value is OperatingEvidence {
  return record(value) && text(value.id) && text(value.sessionId) && text(value.eventId) && text(value.quote)
}
function matter(value: unknown): value is OperatingMatter {
  return record(value) && text(value.id) && text(value.title)
    && (value.status === 'active' || value.status === 'completed') && typeof value.summary === 'string'
    && Array.isArray(value.evidence) && value.evidence.every(evidence)
    && new Set(value.evidence.map(item => item.id)).size === value.evidence.length
}

/**
 * Validate downloaded JSON before publishing it as a matter collection. No implicit migration,
 * generated identities or status inference. Evidence locations are claims, not verified existence.
 * @param input - Untrusted fixed-download JSON.
 * @returns Valid v1 projection; throws on incompatible version or malformed identities/evidence.
 */
export function parseOperatingProjection(input: unknown): OperatingProjection {
  if (!record(input) || input.schemaVersion !== 1 || !text(input.ledgerId)
    || typeof input.revision !== 'number' || !Number.isSafeInteger(input.revision) || input.revision < 0
    || !Array.isArray(input.matters) || !input.matters.every(matter)
    || new Set(input.matters.map(item => item.id)).size !== input.matters.length
    || (input.fixture !== undefined && typeof input.fixture !== 'boolean')) {
    throw new Error('invalid operating projection')
  }
  const matters = Object.freeze(input.matters.map(item => Object.freeze({
    id: item.id, title: item.title, status: item.status, summary: item.summary,
    evidence: Object.freeze(item.evidence.map(source => Object.freeze({
      id: source.id, sessionId: source.sessionId, eventId: source.eventId, quote: source.quote,
    }))),
  })))
  return Object.freeze({ schemaVersion: 1, ledgerId: input.ledgerId, revision: input.revision,
    matters, ...(input.fixture === undefined ? {} : { fixture: input.fixture }) })
}
