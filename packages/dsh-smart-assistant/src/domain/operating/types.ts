/**
 * The ledger state vocabulary: matters, materials, proposals, operations, receipts, and the
 * operation union the reducer dispatches on. Types only — the reducer and its helpers live in
 * `./ledger.ts`.
 *
 * @module dsh-smart-assistant/domain/operating/types
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
      /**
       * The fragment's terminal state (desk-side capture, 2026-10-18): the principal judged it noise, so it leaves
       * the unclaimed lane — with the reason kept as durable history, the same shape `abandon`
       * gives a matter. Never a silent delete: the fragment's own words stay in the `note` that
       * entered them, and a blank reason is refused.
       */
      readonly kind: 'discard'
      readonly operationId: string
      readonly unclaimedId: string
      readonly reason: string
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
