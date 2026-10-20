/**
 * Pure core of the authoritative operating ledger (the operating desk's ledger contract,
 * [desk-operating-entry](../../../../../notes/implemented/2026-10-06-desk-operating-entry.md)).
 *
 * Owns the ledger state vocabulary and the operation reducer — every state change is an
 * operation with a caller-supplied identity, and every operation yields a receipt. The Host
 * service (`src/host/operating-ledger/`) owns persistence, the single-writer claim, and the
 * clock; this module is deterministic and side-effect free.
 *
 * Business semantics follow the settled CEO operating-loop card (V1–V5/V7): materials are
 * always retained with their source; confirmed state changes conflict on observed revision;
 * matter identity is explicit, never title-derived.
 */
import type { LedgerOperation, LedgerSource, LedgerState, MatterRecord, MatterTimes, OperationOutcome, OperationReceipt, ProposalRecord, RejectionReason, UnclaimedMaterial } from './types.ts'

// The vocabulary moved to ./types.ts; re-exported here so every existing importer of this module
// keeps working (the reducer and the persisted-state helpers stay the reason to import it).
export type {
  LedgerSource, MatterTimes, MaterialRecord, MatterRecord, ProposedChange, ProposalRecord,
  OperationOutcome, RejectionReason, OperationReceipt, OperationRecord, UnclaimedMaterial,
  LedgerOperation, LedgerState,
} from './types.ts'

/** A ledger with no matters and no operations yet. */
export const EMPTY_LEDGER: LedgerState = { version: 1, matters: {}, operations: {}, unclaimed: {}, nextMatterSeq: 1, nextUnclaimedSeq: 1 }

/**
 * Revive a persisted ledger state: validate the version and backfill fields added after the
 * first slices (no released ledgers predate them).
 * @param parsed - The parsed `ledger.json` content.
 * @returns The complete state.
 * @throws When the value is not a v1 ledger state.
 */
export function reviveLedgerState(parsed: unknown): LedgerState {
  if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== 1) {
    throw new Error('not a v1 operating ledger state')
  }
  const state = parsed as LedgerState
  const matters = Object.fromEntries(Object.entries(state.matters).map(([id, matter]) => [id, { ...matter, proposals: matter.proposals ?? [] }]))
  return { ...state, matters, unclaimed: state.unclaimed ?? {}, nextUnclaimedSeq: state.nextUnclaimedSeq ?? 1 }
}

/**
 * Canonical JSON with recursively sorted object keys, so retry comparison is key-order-blind.
 * @param value - JSON-compatible value.
 * @returns Its canonical serialization.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/** The result of applying one operation: the next state plus the receipt the caller echoes back. */
interface AppliedOperation {
  readonly state: LedgerState
  readonly receipt: OperationReceipt
}

/** Record one operation and its receipt in the ledger's history; every outcome is recorded. */
function recordOperation(state: LedgerState, operation: LedgerOperation, receipt: OperationReceipt): LedgerState {
  return { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } }
}

/**
 * Refuse one operation and record the refusal: the same identity must replay it, and nothing
 * else in the state moves.
 * @param state - Ledger state before the operation.
 * @param operation - The refused operation.
 * @param submittedAt - Submission instant (ISO).
 * @param matterId - The matter the receipt names (the caller's id, or the resolved matter's).
 * @param reason - Why the operation was refused.
 * @returns The state carrying the recorded refusal and its receipt.
 */
function rejectWith(
  state: LedgerState,
  operation: LedgerOperation,
  submittedAt: string,
  matterId: string,
  reason: RejectionReason,
): AppliedOperation {
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId,
    submittedAt,
    outcome: { status: 'rejected', reason },
  }
  return { state: recordOperation(state, operation, receipt), receipt }
}

/** Entrust a new matter: it opens active at revision 1 with the instruction as its first material. */
function applyCreate(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'create' }>,
  submittedAt: string,
): AppliedOperation {
  const id = `m-${state.nextMatterSeq}`
  const summary = operation.summary ?? ''
  const matter: MatterRecord = {
    id,
    title: operation.title,
    status: 'active',
    summary,
    responsible: operation.responsible ?? '',
    revision: 1,
    times: operation.times ?? {},
    materials: [{ id: `mat-${id}-1`, source: operation.source, note: summary || operation.title, receivedAt: submittedAt }],
    proposals: [],
    createdAt: submittedAt,
    updatedAt: submittedAt,
  }
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: id,
    submittedAt,
    outcome: { status: 'committed', revision: 1 },
  }
  return {
    state: recordOperation(
      { ...state, nextMatterSeq: state.nextMatterSeq + 1, matters: { ...state.matters, [id]: matter } },
      operation,
      receipt,
    ),
    receipt,
  }
}

/**
 * Progress on an existing matter. Materials always auto-retain (ordinary material is never lost
 * to a conflict); they are not confirmed state, so retention alone does not consume a revision.
 * A forecast rides the same lane: it records the current estimate and never moves the other times.
 */
function applyUpdate(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'update' }>,
  submittedAt: string,
): AppliedOperation {
  const matter = state.matters[operation.matterId]
  if (matter === undefined) return rejectWith(state, operation, submittedAt, operation.matterId, 'unknown-matter')
  const withMaterials = appendMaterials(matter, operation.materials ?? [], submittedAt)
  const withForecast = operation.forecast === undefined
    ? withMaterials
    : {
        ...withMaterials,
        times: { ...withMaterials.times, forecastAt: operation.forecast.at, forecastSource: operation.forecast.source },
        updatedAt: submittedAt,
      }
  const confirmedTimeChange = operation.times?.promisedDeadline !== undefined || operation.times?.nextCheckpoint !== undefined
  const changesState = operation.title !== undefined || operation.summary !== undefined || operation.responsible !== undefined || confirmedTimeChange
  const conflict = changesState && matter.revision !== operation.observedRevision
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: matter.id,
    submittedAt,
    outcome: conflict
      ? { status: 'conflict', observedRevision: operation.observedRevision, currentRevision: matter.revision }
      : { status: 'committed', revision: matter.revision + (changesState ? 1 : 0) },
  }
  const confirmedTimes: MatterTimes = {
    ...withForecast.times,
    ...(operation.times?.promisedDeadline !== undefined ? { promisedDeadline: operation.times.promisedDeadline } : {}),
    ...(operation.times?.nextCheckpoint !== undefined ? { nextCheckpoint: operation.times.nextCheckpoint } : {}),
  }
  const nextMatter = conflict
    ? withForecast
    : changesState
      ? {
          ...withForecast,
          title: operation.title ?? withForecast.title,
          summary: operation.summary ?? withForecast.summary,
          responsible: operation.responsible ?? withForecast.responsible,
          times: confirmedTimes,
          revision: matter.revision + 1,
          updatedAt: submittedAt,
        }
      : withForecast
  return {
    state: recordOperation({ ...state, matters: { ...state.matters, [matter.id]: nextMatter } }, operation, receipt),
    receipt,
  }
}

/** Retain a fragment with no explicit matter reference in the unclaimed lane — never matched by title. */
function applyNote(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'note' }>,
  submittedAt: string,
): AppliedOperation {
  const id = `u-${state.nextUnclaimedSeq}`
  const material: UnclaimedMaterial = { id, note: operation.note, source: operation.source, receivedAt: submittedAt }
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: '',
    submittedAt,
    outcome: { status: 'retained', unclaimedId: id },
  }
  return {
    state: recordOperation(
      { ...state, nextUnclaimedSeq: state.nextUnclaimedSeq + 1, unclaimed: { ...state.unclaimed, [id]: material } },
      operation,
      receipt,
    ),
    receipt,
  }
}

/**
 * Attach one retained fragment to a matter. Attribution is not a confirmed-state change: the
 * original source and retention time move with it, and the matter's revision stands.
 */
function applyClaim(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'claim' }>,
  submittedAt: string,
): AppliedOperation {
  const matter = state.matters[operation.matterId]
  if (matter === undefined) return rejectWith(state, operation, submittedAt, operation.matterId, 'unknown-matter')
  const material = state.unclaimed[operation.unclaimedId]
  if (material === undefined) return rejectWith(state, operation, submittedAt, matter.id, 'unknown-material')
  const unclaimed = { ...state.unclaimed }
  delete unclaimed[material.id]
  const attached: MatterRecord = {
    ...matter,
    materials: [...matter.materials, {
      id: `mat-${matter.id}-${matter.materials.length + 1}`,
      source: material.source,
      note: material.note,
      receivedAt: material.receivedAt,
    }],
    updatedAt: submittedAt,
  }
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: matter.id,
    submittedAt,
    outcome: { status: 'committed', revision: matter.revision },
  }
  return {
    state: recordOperation({ ...state, matters: { ...state.matters, [matter.id]: attached }, unclaimed }, operation, receipt),
    receipt,
  }
}

/**
 * The fragment's terminal state (desk-side capture, 2026-10-18): judged noise, it leaves the unclaimed lane with the
 * reason kept in history. Mirrors `abandon` on a matter — a terminal outcome, not a delete — and
 * refuses a blank reason: "no reason, no removal" is what keeps this from becoming a silent drop.
 * The fragment's own words stay in the `note` operation that entered them.
 */
function applyDiscard(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'discard' }>,
  submittedAt: string,
): AppliedOperation {
  const material = state.unclaimed[operation.unclaimedId]
  if (material === undefined) return rejectWith(state, operation, submittedAt, '', 'unknown-material')
  if (operation.reason.trim() === '') return rejectWith(state, operation, submittedAt, '', 'operation-content-mismatch')
  const unclaimed = { ...state.unclaimed }
  delete unclaimed[material.id]
  // A fragment has no matter revision to confirm, so the receipt reports the revision the ledger
  // itself reaches with this operation — the same `committed` shape every state change carries,
  // and a real number rather than a placeholder (`projection.ts` stamps the envelope the same way).
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    // A fragment belongs to no matter; `''` is the same matterless receipt `note` carries.
    matterId: '',
    submittedAt,
    outcome: { status: 'committed', revision: Object.keys(state.operations).length + 1 },
  }
  return {
    state: recordOperation({ ...state, unclaimed }, operation, receipt),
    receipt,
  }
}

/**
 * Complete a matter or reopen a mis-associated completion. The evidence (or correction reason) is
 * retained material even when the change conflicts, and a conflict or an already-held status
 * leaves the matter otherwise untouched.
 */
function applyCompletion(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'complete' | 'reopen' }>,
  submittedAt: string,
): AppliedOperation {
  const matter = state.matters[operation.matterId]
  if (matter === undefined) return rejectWith(state, operation, submittedAt, operation.matterId, 'unknown-matter')
  const evidence = operation.kind === 'complete'
    ? { note: operation.evidence.note, source: operation.evidence.source }
    : { note: operation.reason, source: operation.source }
  const withEvidence = appendMaterials(matter, [evidence], submittedAt)
  const target = operation.kind === 'complete' ? 'completed' : 'active'
  if (matter.revision !== operation.observedRevision || matter.status === target) {
    const heldReceipt: OperationReceipt = {
      operationId: operation.operationId,
      matterId: matter.id,
      submittedAt,
      outcome: matter.revision !== operation.observedRevision
        ? { status: 'conflict', observedRevision: operation.observedRevision, currentRevision: matter.revision }
        : { status: 'committed', revision: matter.revision },
    }
    return {
      state: recordOperation({ ...state, matters: { ...state.matters, [matter.id]: withEvidence } }, operation, heldReceipt),
      receipt: heldReceipt,
    }
  }
  // The completion time rides the status: stamped by `complete`, cleared by `reopen` — a
  // correction must not leave the detail saying both "active" and "completed at …".
  const nextMatter: MatterRecord = {
    ...withEvidence,
    times: carryTimes(withEvidence.times, operation.kind === 'complete' ? submittedAt : undefined),
    status: target,
    revision: matter.revision + 1,
    updatedAt: submittedAt,
  }
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: matter.id,
    submittedAt,
    outcome: { status: 'committed', revision: matter.revision + 1 },
  }
  return {
    state: recordOperation({ ...state, matters: { ...state.matters, [matter.id]: nextMatter } }, operation, receipt),
    receipt,
  }
}

/**
 * Hold a major inferred change for the principal's confirmation. A proposal changes nothing
 * confirmed: no field moves and no revision is consumed.
 */
function applyPropose(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'propose' }>,
  submittedAt: string,
): AppliedOperation {
  const matter = state.matters[operation.matterId]
  if (matter === undefined) return rejectWith(state, operation, submittedAt, operation.matterId, 'unknown-matter')
  const proposal: ProposalRecord = {
    id: `p-${matter.proposals.length + 1}`,
    change: operation.change,
    source: operation.source,
    proposedAt: submittedAt,
    status: 'pending',
  }
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: matter.id,
    submittedAt,
    outcome: { status: 'proposed', proposalId: proposal.id },
  }
  return {
    state: recordOperation(
      { ...state, matters: { ...state.matters, [matter.id]: { ...matter, proposals: [...matter.proposals, proposal] } } },
      operation,
      receipt,
    ),
    receipt,
  }
}

/**
 * Apply one pending proposal as the principal's explicit instruction; it consumes a revision. A
 * repeated confirm of an already-confirmed proposal is a committed no-op, and a proposal the
 * principal already rejected can no longer be confirmed.
 */
function applyConfirm(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'confirm' }>,
  submittedAt: string,
): AppliedOperation {
  const matter = state.matters[operation.matterId]
  if (matter === undefined) return rejectWith(state, operation, submittedAt, operation.matterId, 'unknown-matter')
  const proposal = matter.proposals.find(candidate => candidate.id === operation.proposalId)
  if (proposal === undefined) return rejectWith(state, operation, submittedAt, matter.id, 'unknown-proposal')
  if (proposal.status !== 'pending') {
    if (proposal.status === 'confirmed') {
      // The principal's intent already holds; a repeated confirm is a committed no-op.
      const settled: OperationReceipt = {
        operationId: operation.operationId,
        matterId: matter.id,
        submittedAt,
        outcome: { status: 'committed', revision: matter.revision, proposalId: proposal.id },
      }
      return { state: recordOperation(state, operation, settled), receipt: settled }
    }
    return rejectWith(state, operation, submittedAt, matter.id, 'proposal-not-pending')
  }
  let next = { ...matter }
  if (proposal.change.kind === 'reschedule') {
    next = { ...next, times: { ...next.times, promisedDeadline: proposal.change.promisedDeadline } }
  } else if (proposal.change.kind === 'checkpoint') {
    next = { ...next, times: { ...next.times, nextCheckpoint: proposal.change.nextCheckpoint } }
  } else if (proposal.change.kind === 'complete') {
    next = { ...next, status: 'completed', times: carryTimes(next.times, submittedAt) }
    next = appendMaterials(next, [{ note: proposal.change.evidence.note, source: proposal.change.evidence.source }], submittedAt)
  } else if (proposal.change.kind === 'abandon') {
    next = { ...next, status: 'abandoned' }
  } else {
    return assertNever(proposal.change)
  }
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: matter.id,
    submittedAt,
    outcome: { status: 'committed', revision: matter.revision + 1, proposalId: proposal.id },
  }
  return {
    state: recordOperation({
      ...state,
      matters: {
        ...state.matters,
        [matter.id]: {
          ...next,
          revision: matter.revision + 1,
          updatedAt: submittedAt,
          proposals: matter.proposals.map(candidate => candidate.id === operation.proposalId
            ? { ...candidate, status: 'confirmed' as const, resolutionOperationId: operation.operationId }
            : candidate),
        },
      },
    }, operation, receipt),
    receipt,
  }
}

/** Record the principal's explicit rejection of one pending proposal; confirmed fields stand. */
function applyReject(
  state: LedgerState,
  operation: Extract<LedgerOperation, { readonly kind: 'reject' }>,
  submittedAt: string,
): AppliedOperation {
  const matter = state.matters[operation.matterId]
  const proposal = matter?.proposals.find(candidate => candidate.id === operation.proposalId)
  const outcome: OperationOutcome = matter === undefined
    ? { status: 'rejected', reason: 'unknown-matter' }
    : proposal === undefined
      ? { status: 'rejected', reason: 'unknown-proposal' }
      : proposal.status !== 'pending'
        ? { status: 'rejected', reason: 'proposal-not-pending' }
        : { status: 'proposal-rejected', proposalId: proposal.id, revision: matter.revision }
  const receipt: OperationReceipt = {
    operationId: operation.operationId,
    matterId: matter?.id ?? operation.matterId,
    submittedAt,
    outcome,
  }
  const resolved: LedgerState = proposal?.status === 'pending' && matter !== undefined
    ? {
        ...state,
        matters: {
          ...state.matters,
          [matter.id]: {
            ...matter,
            proposals: matter.proposals.map(candidate => candidate.id === proposal.id
              ? { ...candidate, status: 'rejected' as const, resolutionOperationId: operation.operationId }
              : candidate),
          },
        },
      }
    : state
  return { state: recordOperation(resolved, operation, receipt), receipt }
}

/**
 * Apply one operation to the ledger state.
 *
 * One handler per operation kind, dispatched on the operation's discriminant; the union is closed,
 * so the dispatch ends in `assertNever`. `create` mints a fresh matter id and records the entrust
 * instruction as its first retained material; the receipt reports revision 1. A repeated
 * `operationId` with identical content replays the stored receipt without effect; the same key
 * with different content is rejected without touching the stored receipt.
 *
 * @param state - Ledger state before the operation.
 * @param operation - The caller-submitted operation.
 * @param submittedAt - Submission instant (ISO), supplied by the Host service.
 * @returns The next state and the receipt to return; a rejected retry keeps the state.
 */
export function applyOperation(state: LedgerState, operation: LedgerOperation, submittedAt: string): AppliedOperation {
  const stored = state.operations[operation.operationId]
  if (stored !== undefined) {
    if (canonicalJson(stored.operation) === canonicalJson(operation)) return { state, receipt: stored.receipt }
    const receipt: OperationReceipt = {
      operationId: operation.operationId,
      matterId: stored.receipt.matterId,
      submittedAt,
      outcome: { status: 'rejected', reason: 'operation-content-mismatch' },
    }
    return { state, receipt }
  }
  switch (operation.kind) {
    case 'create': return applyCreate(state, operation, submittedAt)
    case 'update': return applyUpdate(state, operation, submittedAt)
    case 'note': return applyNote(state, operation, submittedAt)
    case 'claim': return applyClaim(state, operation, submittedAt)
    case 'discard': return applyDiscard(state, operation, submittedAt)
    case 'complete':
    case 'reopen': return applyCompletion(state, operation, submittedAt)
    case 'propose': return applyPropose(state, operation, submittedAt)
    case 'confirm': return applyConfirm(state, operation, submittedAt)
    case 'reject': return applyReject(state, operation, submittedAt)
    default: return assertNever(operation)
  }
}

/** Carry the business times forward, optionally stamping or clearing the completion time.
 *  @param times - the times to carry.
 *  @param completedAt - the completion stamp; `undefined` leaves the matter uncompleted.
 *  @returns a fresh times object holding only the fields that exist.
 */
function carryTimes(times: MatterTimes, completedAt?: string): MatterTimes {
  return {
    ...(times.promisedDeadline === undefined ? {} : { promisedDeadline: times.promisedDeadline }),
    ...(times.forecastAt === undefined ? {} : { forecastAt: times.forecastAt }),
    ...(times.forecastSource === undefined ? {} : { forecastSource: times.forecastSource }),
    ...(times.nextCheckpoint === undefined ? {} : { nextCheckpoint: times.nextCheckpoint }),
    ...(completedAt === undefined ? {} : { completedAt }),
  }
}

/**
 * Append retained materials to a matter with fresh sequential ids.
 * @param matter - Matter to append to.
 * @param materials - Materials from the submission.
 * @param receivedAt - Retention instant (ISO).
 * @returns The matter with the materials appended.
 */
function appendMaterials(
  matter: MatterRecord,
  materials: readonly { readonly note: string; readonly source: LedgerSource }[],
  receivedAt: string,
): MatterRecord {
  if (materials.length === 0) return matter
  const next = [...matter.materials]
  for (const material of materials) {
    next.push({ id: `mat-${matter.id}-${next.length + 1}`, source: material.source, note: material.note, receivedAt })
  }
  return { ...matter, materials: next }
}

function assertNever(operation: never): never {
  throw new Error(`unknown ledger operation kind: ${(operation as LedgerOperation).kind}`)
}
