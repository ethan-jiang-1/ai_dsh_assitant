/**
 * The tool's action vocabulary, shared by the description, the parameter schema and the
 * dispatch so one list cannot drift from the other.
 *
 * @module dsh-smart-assistant/tool-operating/vocabulary
 */

export const ACTIONS = ['desk', 'read', 'entrust', 'report', 'revise', 'propose', 'confirm', 'reject', 'note', 'claim', 'discard', 'complete', 'reopen'] as const

export type Action = (typeof ACTIONS)[number]

export const CHANGE_KINDS = ['reschedule', 'checkpoint', 'complete', 'abandon'] as const

/** The parameter object the runtime hands `execute` (optional per action, validated in dispatch). */
export interface OperatingArgs {
  readonly action: Action
  readonly operation_id?: string
  readonly quote?: string
  readonly matter_id?: string
  readonly unclaimed_id?: string
  readonly proposal_id?: string
  readonly observed_revision?: number
  readonly title?: string
  readonly summary?: string
  readonly responsible?: string
  readonly promised_deadline?: string
  readonly next_checkpoint?: string
  readonly forecast_at?: string
  readonly note?: string
  readonly change_kind?: string
  readonly change_deadline?: string
  readonly evidence_quote?: string
  readonly reason?: string
}
