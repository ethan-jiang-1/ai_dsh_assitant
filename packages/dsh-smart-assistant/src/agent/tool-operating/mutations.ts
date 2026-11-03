/**
 * The eleven mutating actions, in family order: progress (`entrust`/`report`/`revise`/`note`),
 * proposals (`propose`/`confirm`/`reject`), and the claim lane (`claim`/`discard`/`complete`/
 * `reopen`). Each case only maps arguments and renders the receipt — the ledger owns the rules.
 *
 * @module dsh-smart-assistant/tool-operating/mutations
 */

import type { Context } from '@deepseek-ai/cordis'
import type { LedgerOperation, LedgerSource, ProposedChange } from '../../domain/operating/ledger.ts'
import type { OperatingOutput } from './view.ts'
import type { Action, OperatingArgs } from './vocabulary.ts'

export interface MutationDeps {
  readonly action: Action
  readonly ledger: Context['assistantOperatingLedger']
  readonly args: OperatingArgs
  readonly quote: string
  readonly operationId: string | undefined
  readonly source: (quote: string) => LedgerSource
  readonly submit: (operation: LedgerOperation, summary: string) => Promise<OperatingOutput>
}

/** Dispatch one mutating action; every other value is a schema violation. */
export async function submitMutation(deps: MutationDeps): Promise<OperatingOutput> {
  const { action, args, ledger, quote, operationId, source, submit } = deps
  switch (action) {
    case 'entrust': {
      if (typeof args.title !== 'string' || args.title.trim().length === 0) {
        throw new Error('assistant_operating entrust requires title')
      }
      return submit({
        kind: 'create',
        operationId: operationId!,
        title: args.title,
        ...(args.summary !== undefined ? { summary: args.summary } : {}),
        ...(args.responsible !== undefined ? { responsible: args.responsible } : {}),
        ...((args.promised_deadline !== undefined || args.next_checkpoint !== undefined) ? {
          times: {
            ...(args.promised_deadline !== undefined ? { promisedDeadline: args.promised_deadline } : {}),
            ...(args.next_checkpoint !== undefined ? { nextCheckpoint: args.next_checkpoint } : {}),
          },
        } : {}),
        source: source(quote),
      }, `Entrusted "${args.title}".`)
    }
    case 'report': {
      if (typeof args.matter_id !== 'string' || args.matter_id.trim().length === 0) {
        throw new Error('assistant_operating report requires matter_id')
      }
      if ((args.note === undefined || args.note.trim().length === 0) && args.forecast_at === undefined) {
        throw new Error('assistant_operating report requires note, forecast_at, or both')
      }
      const matter = await ledger.readMatter(args.matter_id)
      if (matter === undefined) throw new Error(`no operating matter "${args.matter_id}"`)
      return submit({
        kind: 'update',
        operationId: operationId!,
        matterId: matter.id,
        observedRevision: matter.revision,
        ...(args.forecast_at !== undefined ? { forecast: { at: args.forecast_at, source: source(quote) } } : {}),
        ...(args.note !== undefined && args.note.trim().length > 0 ? { materials: [{ note: args.note, source: source(quote) }] } : {}),
        source: source(quote),
      }, `Reported on ${matter.id} (revision ${matter.revision} stands).`)
    }
    case 'revise': {
      if (typeof args.matter_id !== 'string' || typeof args.observed_revision !== 'number') {
        throw new Error('assistant_operating revise requires matter_id and observed_revision')
      }
      const hasField = args.title !== undefined || args.summary !== undefined || args.responsible !== undefined
        || args.promised_deadline !== undefined || args.next_checkpoint !== undefined
      if (!hasField) throw new Error('assistant_operating revise requires at least one field to change')
      return submit({
        kind: 'update',
        operationId: operationId!,
        matterId: args.matter_id,
        observedRevision: args.observed_revision,
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.summary !== undefined ? { summary: args.summary } : {}),
        ...(args.responsible !== undefined ? { responsible: args.responsible } : {}),
        ...((args.promised_deadline !== undefined || args.next_checkpoint !== undefined) ? {
          times: {
            ...(args.promised_deadline !== undefined ? { promisedDeadline: args.promised_deadline } : {}),
            ...(args.next_checkpoint !== undefined ? { nextCheckpoint: args.next_checkpoint } : {}),
          },
        } : {}),
        source: source(quote),
      }, `Revised ${args.matter_id} on explicit instruction.`)
    }
    case 'propose': {
      if (typeof args.matter_id !== 'string' || args.matter_id.trim().length === 0) {
        throw new Error('assistant_operating propose requires matter_id')
      }
      if (typeof args.change_kind !== 'string') throw new Error('assistant_operating propose requires change_kind')
      let change: ProposedChange
      if (args.change_kind === 'reschedule' || args.change_kind === 'checkpoint') {
        if (typeof args.change_deadline !== 'string' || args.change_deadline.trim().length === 0) {
          throw new Error(`assistant_operating propose ${args.change_kind} requires change_deadline`)
        }
        change = args.change_kind === 'reschedule'
          ? { kind: 'reschedule', promisedDeadline: args.change_deadline }
          : { kind: 'checkpoint', nextCheckpoint: args.change_deadline }
      } else if (args.change_kind === 'complete') {
        if (typeof args.evidence_quote !== 'string' || args.evidence_quote.trim().length === 0) {
          throw new Error('assistant_operating propose complete requires evidence_quote')
        }
        change = { kind: 'complete', evidence: { note: args.note ?? 'arrival evidence', source: source(args.evidence_quote) } }
      } else {
        change = { kind: 'abandon' }
      }
      return submit({ kind: 'propose', operationId: operationId!, matterId: args.matter_id, change, source: source(quote) },
        `Proposed ${args.change_kind} on ${args.matter_id}; it stays pending until the principal confirms.`)
    }
    case 'confirm': {
      if (typeof args.matter_id !== 'string' || typeof args.proposal_id !== 'string') {
        throw new Error('assistant_operating confirm requires matter_id and proposal_id')
      }
      return submit({ kind: 'confirm', operationId: operationId!, matterId: args.matter_id, proposalId: args.proposal_id, source: source(quote) },
        `Confirmed ${args.proposal_id} on ${args.matter_id} on the principal's explicit instruction.`)
    }
    case 'reject': {
      if (typeof args.matter_id !== 'string' || typeof args.proposal_id !== 'string') {
        throw new Error('assistant_operating reject requires matter_id and proposal_id')
      }
      return submit({ kind: 'reject', operationId: operationId!, matterId: args.matter_id, proposalId: args.proposal_id, source: source(quote) },
        `Rejected ${args.proposal_id} on ${args.matter_id} on the principal's explicit instruction.`)
    }
    case 'note': {
      if (typeof args.note !== 'string' || args.note.trim().length === 0) {
        throw new Error('assistant_operating note requires note')
      }
      return submit({ kind: 'note', operationId: operationId!, note: args.note, source: source(quote) },
        'Retained the fragment as unclaimed; attribution was not guessed.')
    }
    case 'claim': {
      if (typeof args.unclaimed_id !== 'string' || typeof args.matter_id !== 'string') {
        throw new Error('assistant_operating claim requires unclaimed_id and matter_id')
      }
      return submit({ kind: 'claim', operationId: operationId!, unclaimedId: args.unclaimed_id, matterId: args.matter_id, source: source(quote) },
        `Attached ${args.unclaimed_id} to ${args.matter_id}.`)
    }
    case 'discard': {
      if (typeof args.unclaimed_id !== 'string') {
        throw new Error('assistant_operating discard requires unclaimed_id')
      }
      if (typeof args.reason !== 'string' || args.reason.trim().length === 0) {
        throw new Error('assistant_operating discard requires reason (why the fragment is noise; no reason, no removal)')
      }
      return submit({ kind: 'discard', operationId: operationId!, unclaimedId: args.unclaimed_id, reason: args.reason, source: source(quote) },
        `Discarded ${args.unclaimed_id} as noise: ${args.reason}`)
    }
    case 'complete': {
      if (typeof args.matter_id !== 'string' || typeof args.observed_revision !== 'number') {
        throw new Error('assistant_operating complete requires matter_id and observed_revision')
      }
      if (typeof args.evidence_quote !== 'string' || args.evidence_quote.trim().length === 0) {
        throw new Error('assistant_operating complete requires evidence_quote (verbatim arrival evidence; "should have paid" is not evidence)')
      }
      return submit({
        kind: 'complete',
        operationId: operationId!,
        matterId: args.matter_id,
        observedRevision: args.observed_revision,
        evidence: { note: args.note ?? 'arrival evidence', source: source(args.evidence_quote) },
        source: source(quote),
      }, `Completed ${args.matter_id} on arrival evidence.`)
    }
    case 'reopen': {
      if (typeof args.matter_id !== 'string' || typeof args.observed_revision !== 'number') {
        throw new Error('assistant_operating reopen requires matter_id and observed_revision')
      }
      if (typeof args.reason !== 'string' || args.reason.trim().length === 0) {
        throw new Error('assistant_operating reopen requires reason')
      }
      return submit({ kind: 'reopen', operationId: operationId!, matterId: args.matter_id, observedRevision: args.observed_revision, reason: args.reason, source: source(quote) },
        `Reopened ${args.matter_id}: ${args.reason}`)
    }
    /* v8 ignore next 2 -- the enum in the parameter schema admits only mutating actions */
    default:
      throw new Error(`unsupported action ${String(action)}`)
  }
}
