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

/** The four business times, kept separate (V3): commitment, estimate, checkpoint. */
export interface MatterTimes {
  /** 约定期限 — a promise made to or by the principal. */
  readonly promisedDeadline?: string
  /** 客户预测 — a current estimate, with the source that carried it. */
  readonly forecastAt?: string
  readonly forecastSource?: LedgerSource
  /** 下一核对点 — when the principal or an authorized rule looks again. */
  readonly nextCheckpoint?: string
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
  readonly status: 'active' | 'completed'
  readonly summary: string
  readonly responsible: string
  readonly revision: number
  readonly times: MatterTimes
  readonly materials: readonly MaterialRecord[]
  readonly createdAt: string
  readonly updatedAt: string
}

/** Outcome of one operation, as persisted in its receipt. */
export type OperationOutcome =
  | { readonly status: 'committed'; readonly revision: number }
  | { readonly status: 'conflict'; readonly observedRevision: number; readonly currentRevision: number }
  | { readonly status: 'rejected'; readonly reason: RejectionReason }

/** Why an operation was refused without changing confirmed state. */
export type RejectionReason = 'operation-content-mismatch' | 'unknown-matter'

/** Durable read-back record of one operation (V7: the unit of successful read-back). */
export interface OperationReceipt {
  readonly operationId: string
  readonly matterId: string
  readonly submittedAt: string
  readonly outcome: OperationOutcome
}

/** The frozen submission and its receipt; the submission enables idempotent-retry comparison. */
export interface OperationRecord {
  readonly operation: LedgerOperation
  readonly receipt: OperationReceipt
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
      readonly materials?: readonly { readonly note: string; readonly source: LedgerSource }[]
      readonly source: LedgerSource
    }

/** Full ledger state, version 1. */
export interface LedgerState {
  readonly version: 1
  readonly matters: Readonly<Record<string, MatterRecord>>
  readonly operations: Readonly<Record<string, OperationRecord>>
  readonly nextMatterSeq: number
}

/** A ledger with no matters and no operations yet. */
export const EMPTY_LEDGER: LedgerState = { version: 1, matters: {}, operations: {}, nextMatterSeq: 1 }

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
    // not confirmed state, so retention alone does not consume a revision.
    const withMaterials = appendMaterials(matter, operation.materials ?? [], submittedAt)
    const changesState = operation.title !== undefined || operation.summary !== undefined || operation.responsible !== undefined
    const conflict = changesState && matter.revision !== operation.observedRevision
    const receipt: OperationReceipt = {
      operationId: operation.operationId,
      matterId: matter.id,
      submittedAt,
      outcome: conflict
        ? { status: 'conflict', observedRevision: operation.observedRevision, currentRevision: matter.revision }
        : { status: 'committed', revision: matter.revision + (changesState ? 1 : 0) },
    }
    const nextMatter = conflict
      ? withMaterials
      : changesState
        ? {
            ...withMaterials,
            title: operation.title ?? withMaterials.title,
            summary: operation.summary ?? withMaterials.summary,
            responsible: operation.responsible ?? withMaterials.responsible,
            revision: matter.revision + 1,
            updatedAt: submittedAt,
          }
        : withMaterials
    return {
      state: {
        ...state,
        matters: { ...state.matters, [matter.id]: nextMatter },
        operations: { ...state.operations, [operation.operationId]: { operation, receipt } },
      },
      receipt,
    }
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
