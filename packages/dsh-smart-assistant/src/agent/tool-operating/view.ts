/**
 * The tool's read model: how one matter, one proposal and one receipt become the shape the model
 * reads. Pure mapping — no ledger access — so `desk` and `read` cannot spell the same field twice.
 *
 * @module dsh-smart-assistant/tool-operating/view
 */

import type { MatterRecord, ProposedChange, LedgerSource } from '../../domain/operating/ledger.ts'
import type { InferValue } from '@deepseek-ai/dsh-tools'
import type { OPERATING_OUTPUT_SCHEMA } from './schema.ts'
import type { Action } from './vocabulary.ts'

export type OperatingOutput = InferValue<typeof OPERATING_OUTPUT_SCHEMA>

interface DeskItem {
  id: string
  title: string
  status: string
  revision: number
  summary?: string
  responsible?: string
  promised_deadline?: string
  forecast_at?: string
  forecast_source?: LedgerSource
  next_checkpoint?: string
  completed_at?: string
}

interface MatterProposalSummary {
  id: string
  kind: string
  status: string
  proposed_at: string
  change: ProposedChange
  source?: LedgerSource
  resolution_operation_id?: string
  /** Set when the proposal rides a multi-matter list (the desk summary) so a line is attributable. */
  matter_id?: string
}

/**
 * One proposal as the model reads it. Shared by `read` (one matter's full list) and `desk`
 * (every pending proposal, each tagged with its matter) so the two spellings cannot drift.
 */
export function proposalSummary(proposal: MatterRecord['proposals'][number]): MatterProposalSummary {
  return {
    id: proposal.id,
    kind: proposal.change.kind,
    status: proposal.status,
    proposed_at: proposal.proposedAt,
    change: proposal.change,
    ...(proposal.source !== undefined ? { source: proposal.source } : {}),
    ...(proposal.resolutionOperationId !== undefined ? { resolution_operation_id: proposal.resolutionOperationId } : {}),
  }
}

export function deskItem(matter: MatterRecord): DeskItem {
  return {
    id: matter.id,
    title: matter.title,
    status: matter.status,
    revision: matter.revision,
    summary: matter.summary,
    responsible: matter.responsible,
    ...(matter.times.promisedDeadline !== undefined ? { promised_deadline: matter.times.promisedDeadline } : {}),
    ...(matter.times.forecastAt !== undefined ? { forecast_at: matter.times.forecastAt } : {}),
    ...(matter.times.forecastSource !== undefined ? { forecast_source: matter.times.forecastSource } : {}),
    ...(matter.times.nextCheckpoint !== undefined ? { next_checkpoint: matter.times.nextCheckpoint } : {}),
    ...(matter.times.completedAt !== undefined ? { completed_at: matter.times.completedAt } : {}),
  }
}

/** One source's render text; an old ledger may carry a record without one. */
function sourceText(source: { readonly sessionId: string, readonly eventId?: string, readonly quote?: string } | undefined): string {
  if (source === undefined) return 'unknown'
  return `${source.sessionId}${source.eventId !== undefined ? `/${source.eventId}` : ''}${source.quote !== undefined ? `: ${source.quote}` : ''}`
}

/**
 * The model-visible text of one result. Exported for the fixture: the wording of a pending
 * proposal line is a contract (a pending change must never read as effective), so a spec pins it
 * against the pure renderer instead of against a live session.
 */
export function render(_args: { action: Action }, value: OperatingOutput): { type: 'text', text: string }[] {
  const lines = [value.summary]
  for (const item of value.matters ?? []) {
    const times = [
      item.promised_deadline !== undefined ? `promised ${item.promised_deadline}` : '',
      item.forecast_at !== undefined ? `forecast ${item.forecast_at}${item.forecast_source !== undefined ? ` from ${item.forecast_source.sessionId}${item.forecast_source.eventId !== undefined ? `/${item.forecast_source.eventId}` : ''}${item.forecast_source.quote !== undefined ? `: ${item.forecast_source.quote}` : ''}` : ''}` : '',
      item.next_checkpoint !== undefined ? `checkpoint ${item.next_checkpoint}` : '',
      item.completed_at !== undefined ? `completed ${item.completed_at}` : '',
    ].filter(part => part.length > 0).join(', ')
    lines.push(`- [${item.status}] ${item.title} (${item.id}, revision ${item.revision}${times.length > 0 ? `; ${times}` : ''}${item.responsible !== undefined && item.responsible !== '' ? `; responsible ${item.responsible}` : ''}${item.summary !== undefined && item.summary !== '' ? `; ${item.summary}` : ''})`)
  }
  for (const fragment of value.unclaimed ?? []) {
    lines.push(`- unclaimed ${fragment.id} (${fragment.sessionId}): ${fragment.note}`)
  }
  for (const material of value.materials ?? []) {
    lines.push(`- material ${material.id} (${material.sessionId}${material.eventId !== undefined ? `/${material.eventId}` : ''}): ${material.note}${material.quote !== undefined ? `; quote: ${material.quote}` : ''}`)
  }
  if (value.entrust !== undefined) {
    lines.push(`- entrust ${value.entrust.operation_id} (${value.entrust.sessionId}${value.entrust.eventId !== undefined ? `/${value.entrust.eventId}` : ''}): ${value.entrust.quote ?? ''}`)
  }
  for (const operation of value.operations ?? []) {
    lines.push(`- operation ${operation.operationId} ${operation.kind} [${JSON.stringify(operation.outcome)}] (${operation.submittedAt}; ${sourceText(operation.source)})`)
  }
  for (const proposal of value.proposals ?? []) {
    // A pending proposal is NOT an effective change: the line says so in words, because the model
    // reads this text and must not report an unconfirmed reschedule as the promised deadline.
    const status = proposal.status === 'pending' ? 'pending — NOT in effect until the principal confirms' : proposal.status
    lines.push(`- proposal ${proposal.id}${proposal.matter_id !== undefined ? ` for ${proposal.matter_id}` : ''} ${proposal.kind} [${status}] (change ${JSON.stringify(proposal.change)}; proposed ${proposal.proposed_at}; source ${sourceText(proposal.source)}${proposal.resolution_operation_id !== undefined ? `; resolution ${proposal.resolution_operation_id}` : ''})`)
  }
  if (value.source !== undefined) {
    lines.push(`- source ${value.source.sessionId}${value.source.eventId !== undefined ? `/${value.source.eventId}` : ''}${value.source.quote !== undefined ? `: ${value.source.quote}` : ''}`)
  }
  if (value.receipt !== undefined) {
    lines.push(`- receipt ${value.receipt.operationId} on ${value.receipt.matterId || 'no matter'} (${value.receipt.submittedAt}): ${JSON.stringify(value.receipt.outcome)}`)
  }
  return [{ type: 'text', text: lines.join('\n') }]
}
