/**
 * Pure core of the authoritative operating ledger (desk-operating-entry K3, slice A).
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

/** Source positioning of an instruction or material, retained verbatim. */
export interface LedgerSource {
  readonly sessionId: string
  readonly eventId?: string
  readonly quote?: string
}

/** The four business times, kept separate (V3): commitment, estimate, checkpoint, completion. */
export interface MatterTimes {
  /** 约定期限 — a promise made to or by the principal. */
  readonly promisedDeadline?: string
  /** 客户预测 — a current estimate, with the source that carried it. */
  readonly forecastAt?: string
  readonly forecastSource?: LedgerSource
  /** 下一核对点 — when the principal or an authorized rule looks again. */
  readonly nextCheckpoint?: string
  /** 完成时刻 — stamped when the matter is completed, cleared when a reopen corrects it.
   *  It is a business time, not bookkeeping: the detail pane shows it beside the other three, and
   *  a completed matter without it would be the only state the spec's "four times" could not show. */
  readonly completedAt?: string
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

/** A retained raw material on a matter; retention is not confirmation. */
export interface MaterialRecord {
  readonly id: string
  readonly source: LedgerSource
  readonly note: string
  readonly receivedAt: string
}

/** One operating matter: the unit the desk lists and a processing session binds to. */
export interface MatterRecord {
  readonly id: string
  readonly title: string
  readonly status: 'active' | 'completed' | 'abandoned'
  readonly summary: string
  readonly responsible: string
  readonly revision: number
  readonly times: MatterTimes
  readonly materials: readonly MaterialRecord[]
  readonly proposals: readonly ProposalRecord[]
  readonly createdAt: string
  readonly updatedAt: string
}

/** A major inferred change held for the principal's confirmation (the confirmed permission split). */
export type ProposedChange =
  | { readonly kind: 'reschedule'; readonly promisedDeadline: string }
  | { readonly kind: 'checkpoint'; readonly nextCheckpoint: string }
  | { readonly kind: 'complete'; readonly evidence: { readonly note: string; readonly source: LedgerSource } }
  | { readonly kind: 'abandon' }

/** One pending or resolved proposal on a matter; retained with its source and resolution link. */
export interface ProposalRecord {
  readonly id: string
  readonly change: ProposedChange
  readonly source: LedgerSource
  readonly proposedAt: string
  readonly status: 'pending' | 'confirmed' | 'rejected'
  readonly resolutionOperationId?: string
}

/** Outcome of one operation, as persisted in its receipt. */
export type OperationOutcome =
  | { readonly status: 'committed'; readonly revision: number; readonly proposalId?: string }
  | { readonly status: 'proposal-rejected'; readonly proposalId: string; readonly revision: number }
  | { readonly status: 'retained'; readonly unclaimedId: string }
  | { readonly status: 'proposed'; readonly proposalId: string }
  | { readonly status: 'conflict'; readonly observedRevision: number; readonly currentRevision: number }
  | { readonly status: 'rejected'; readonly reason: RejectionReason }

/** Why an operation was refused without changing confirmed state. */
export type RejectionReason = 'operation-content-mismatch' | 'unknown-matter' | 'unknown-material' | 'unknown-proposal' | 'proposal-not-pending'

/** Durable read-back record of one operation (V7: the unit of successful read-back). */
export interface OperationReceipt {
  readonly operationId: string
  /** The matter this operation touched; `''` when it touches none (an unclaimed note). */
  readonly matterId: string
  readonly submittedAt: string
  readonly outcome: OperationOutcome
}

/** The frozen submission and its receipt; the submission enables idempotent-retry comparison. */
export interface OperationRecord {
  readonly operation: LedgerOperation
  readonly receipt: OperationReceipt
}

/** A retained material with no explicit matter reference, waiting for an explicit claim (V1). */
export interface UnclaimedMaterial {
  readonly id: string
  readonly note: string
  readonly source: LedgerSource
  readonly receivedAt: string
}

/** A caller-submitted operation; `operationId` is the idempotency key. */
export type LedgerOperation =
  | {
      readonly kind: 'create'
      readonly operationId: string
      readonly title: string
      readonly summary?: string
      readonly responsible?: string
      readonly times?: MatterTimes
      readonly source: LedgerSource
    }
  | {
      readonly kind: 'update'
      readonly operationId: string
      readonly matterId: string
      readonly observedRevision: number
      readonly title?: string
      readonly summary?: string
      readonly responsible?: string
      /** Confirmed time changes (V3): commitment and checkpoint; they consume a revision. */
      readonly times?: { readonly promisedDeadline?: string; readonly nextCheckpoint?: string }
      /** Current estimate (V3): recorded like ordinary progress, never a confirmed change. */
      readonly forecast?: { readonly at: string; readonly source: LedgerSource }
      readonly materials?: readonly { readonly note: string; readonly source: LedgerSource }[]
      readonly source: LedgerSource
    }
  | {
      readonly kind: 'note'
      readonly operationId: string
      readonly note: string
      readonly source: LedgerSource
    }
  | {
      readonly kind: 'claim'
      readonly operationId: string
      readonly unclaimedId: string
      readonly matterId: string
      readonly source: LedgerSource
    }
  | {
      /** Complete with the arrival evidence attached (V3): no evidence, no completion. */
      readonly kind: 'complete'
      readonly operationId: string
      readonly matterId: string
      readonly observedRevision: number
      readonly evidence: { readonly note: string; readonly source: LedgerSource }
      readonly source: LedgerSource
    }
  | {
      /** Reopen a mis-associated completion (V3); the reason is retained as a material. */
      readonly kind: 'reopen'
      readonly operationId: string
      readonly matterId: string
      readonly observedRevision: number
      readonly reason: string
      readonly source: LedgerSource
    }
  | {
      /** Hold a major inferred change for the principal's confirmation; changes nothing confirmed. */
      readonly kind: 'propose'
      readonly operationId: string
      readonly matterId: string
      readonly change: ProposedChange
      readonly source: LedgerSource
    }
  | {
      /** Apply one pending proposal as an explicit instruction; consumes a revision. */
      readonly kind: 'confirm'
      readonly operationId: string
      readonly matterId: string
      readonly proposalId: string
      readonly source: LedgerSource
    }
  | {
      /** Record the principal's explicit rejection of one pending proposal; confirmed fields stand. */
      readonly kind: 'reject'
      readonly operationId: string
      readonly matterId: string
      readonly proposalId: string
      readonly source: LedgerSource
    }

/** Full ledger state, version 1. */
export interface LedgerState {
  readonly version: 1
  readonly matters: Readonly<Record<string, MatterRecord>>
  readonly operations: Readonly<Record<string, OperationRecord>>
  readonly unclaimed: Readonly<Record<string, UnclaimedMaterial>>
  readonly nextMatterSeq: number
  readonly nextUnclaimedSeq: number
}

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

/**
 * Apply one operation to the ledger state.
 *
 * `create` mints a fresh matter id and records the entrust instruction as its first retained
 * material; the receipt reports revision 1. A repeated `operationId` with identical content
 * replays the stored receipt without effect; the same key with different content is rejected
 * without touching the stored receipt.
 *
 * @param state - Ledger state before the operation.
 * @param operation - The caller-submitted operation.
 * @param submittedAt - Submission instant (ISO), supplied by the Host service.
 * @returns The next state and the receipt to return; a rejected retry keeps the state.
 */
export function applyOperation(
  state: LedgerState,
  operation: LedgerOperation,
  submittedAt: string,
): { readonly state: LedgerState; readonly receipt: OperationReceipt } {
  const stored = state.operations[operation.operationId]
  if (stored !== undefined) {
    if (canonicalJson(stored.operation) === canonicalJson(operation)) return { state, receipt: stored.receipt }
    return {
      state,
      receipt: {
        operationId: operation.operationId,
        matterId: stored.receipt.matterId,
        submittedAt,
        outcome: { status: 'rejected', reason: 'operation-content-mismatch' },
      },
    }
  }
  if (operation.kind === 'create') {
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
      state: {
        ...state,
        nextMatterSeq: state.nextMatterSeq + 1,
        matters: { ...state.matters, [id]: matter },
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
  }
  if (operation.kind === 'update') {
    const matter = state.matters[operation.matterId]
    if (matter === undefined) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: operation.matterId,
        submittedAt,
        outcome: { status: 'rejected', reason: 'unknown-matter' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
    }
    // Materials always auto-retain (ordinary material is never lost to a conflict); they are
    // not confirmed state, so retention alone does not consume a revision. A forecast rides
    // the same lane: it records the current estimate and never moves the other times.
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
      state: {
        ...state,
        matters: { ...state.matters, [matter.id]: nextMatter },
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
  }
  if (operation.kind === 'note') {
    // No explicit matter reference: retain in the unclaimed lane — never match by title.
    const id = `u-${state.nextUnclaimedSeq}`
    const material: UnclaimedMaterial = { id, note: operation.note, source: operation.source, receivedAt: submittedAt }
    const receipt: OperationReceipt = {
      operationId: operation.operationId,
      matterId: '',
      submittedAt,
      outcome: { status: 'retained', unclaimedId: id },
    }
    return {
      state: {
        ...state,
        nextUnclaimedSeq: state.nextUnclaimedSeq + 1,
        unclaimed: { ...state.unclaimed, [id]: material },
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
  }
  if (operation.kind === 'claim') {
    const matter = state.matters[operation.matterId]
    if (matter === undefined) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: operation.matterId,
        submittedAt,
        outcome: { status: 'rejected', reason: 'unknown-matter' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
    }
    const material = state.unclaimed[operation.unclaimedId]
    if (material === undefined) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: matter.id,
        submittedAt,
        outcome: { status: 'rejected', reason: 'unknown-material' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
    }
    // Attaching a retained material is attribution, not a confirmed-state change: the
    // original source and retention time move with it, and the matter's revision stands.
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
      state: {
        ...state,
        matters: { ...state.matters, [matter.id]: attached },
        unclaimed,
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
  }
  if (operation.kind === 'complete' || operation.kind === 'reopen') {
    const matter = state.matters[operation.matterId]
    if (matter === undefined) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: operation.matterId,
        submittedAt,
        outcome: { status: 'rejected', reason: 'unknown-matter' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
    }
    // The evidence (or correction reason) is retained material even when the change conflicts.
    const evidence = operation.kind === 'complete'
      ? { note: operation.evidence.note, source: operation.evidence.source }
      : { note: operation.reason, source: operation.source }
    const withEvidence = appendMaterials(matter, [evidence], submittedAt)
    const target = operation.kind === 'complete' ? 'completed' : 'active'
    if (matter.revision !== operation.observedRevision || matter.status === target) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: matter.id,
        submittedAt,
        outcome: matter.revision !== operation.observedRevision
          ? { status: 'conflict', observedRevision: operation.observedRevision, currentRevision: matter.revision }
          : { status: 'committed', revision: matter.revision },
      }
      return {
        state: {
          ...state,
          matters: { ...state.matters, [matter.id]: withEvidence },
          operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
        },
        receipt,
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
      state: {
        ...state,
        matters: { ...state.matters, [matter.id]: nextMatter },
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
  }
  if (operation.kind === 'propose') {
    const matter = state.matters[operation.matterId]
    if (matter === undefined) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: operation.matterId,
        submittedAt,
        outcome: { status: 'rejected', reason: 'unknown-matter' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
    }
    // A proposal changes nothing confirmed: no field moves and no revision is consumed.
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
      state: {
        ...state,
        matters: { ...state.matters, [matter.id]: { ...matter, proposals: [...matter.proposals, proposal] } },
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
  }
  if (operation.kind === 'confirm') {
    const matter = state.matters[operation.matterId]
    if (matter === undefined) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: operation.matterId,
        submittedAt,
        outcome: { status: 'rejected', reason: 'unknown-matter' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
    }
    const proposal = matter.proposals.find(proposal => proposal.id === operation.proposalId)
    if (proposal === undefined) {
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: matter.id,
        submittedAt,
        outcome: { status: 'rejected', reason: 'unknown-proposal' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
    }
    if (proposal.status !== 'pending') {
      if (proposal.status === 'confirmed') {
        // The principal's intent already holds; a repeated confirm is a committed no-op.
        const receipt: OperationReceipt = {
          operationId: operation.operationId,
          matterId: matter.id,
          submittedAt,
          outcome: { status: 'committed', revision: matter.revision, proposalId: proposal.id },
        }
        return {
          state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
          receipt,
        }
      }
      const receipt: OperationReceipt = {
        operationId: operation.operationId,
        matterId: matter.id,
        submittedAt,
        outcome: { status: 'rejected', reason: 'proposal-not-pending' },
      }
      return {
        state: { ...state, operations: { ...state.operations, [operation.operationId]: { operation, receipt } } },
        receipt,
      }
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
      state: {
        ...state,
        matters: {
          ...state.matters,
          [matter.id]: {
            ...next,
            revision: matter.revision + 1,
            updatedAt: submittedAt,
            proposals: matter.proposals.map(proposal => proposal.id === operation.proposalId
              ? { ...proposal, status: 'confirmed' as const, resolutionOperationId: operation.operationId }
              : proposal),
          },
        },
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
  }
  if (operation.kind === 'reject') {
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
    const nextState: LedgerState = {
      ...state,
      ...(proposal?.status === 'pending' && matter !== undefined ? {
        matters: {
          ...state.matters,
          [matter.id]: {
            ...matter,
            proposals: matter.proposals.map(candidate => candidate.id === proposal.id
              ? { ...candidate, status: 'rejected' as const, resolutionOperationId: operation.operationId }
              : candidate),
          },
        },
      } : {}),
      operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
    }
    return { state: nextState, receipt }
  }
  return assertNever(operation)
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
