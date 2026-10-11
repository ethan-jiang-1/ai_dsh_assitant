/**
 * `assistant_operating`: the model-facing tool over the authoritative operating ledger.
 *
 * One tool with twelve actions, because they share one vocabulary (matters, operations,
 * revisions) and the catalog is a context cost the model pays on every request. The tool is a
 * thin adapter: it stamps every submission with the real session id (the model cannot fake
 * provenance), enforces the cross-field rules the schema cannot express (evidence for
 * completion, a change payload for proposals), and returns the ledger's canonical receipts.
 *
 * Permission split (confirmed business choice, settled CEO operating-loop card): ordinary
 * progress (`report`, `note`) always retains; confirmed changes (`revise`, `complete`,
 * `reopen`, `confirm`) ride explicit principal instructions only; major inferred changes go
 * through `propose` and never apply directly; the principal may explicitly confirm or reject a
 * pending proposal. Attribution is never guessed: ambiguous
 * fragments enter the unclaimed lane and only an explicit `claim` attaches them.
 *
 * @module dsh-smart-assistant/tool-operating
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { LedgerOperation, LedgerSource, MatterRecord, ProposedChange } from '../../domain/operating/ledger.ts'

export const name = 'assistant-operating-tool'

export const inject = ['assistantOperatingLedger', 'tools']

const ACTIONS = ['desk', 'read', 'entrust', 'report', 'revise', 'propose', 'confirm', 'reject', 'note', 'claim', 'complete', 'reopen'] as const

type Action = (typeof ACTIONS)[number]

const CHANGE_KINDS = ['reschedule', 'checkpoint', 'complete', 'abandon'] as const

const DESCRIPTION = [
  'Read and update the operating ledger: the cross-session matters the principal entrusted',
  '(payments, commitments, risks) with their sources, revisions, and durable receipts.',
  'Actions:',
  '- desk: list every matter (id, title, status, revision, times) and unclaimed fragments.',
  '- read: one matter in full (materials, proposals) by matter_id, or one receipt by',
  '  operation_id.',
  '- entrust: the principal designates a new matter; quote them verbatim.',
  '- report: ordinary progress on a known matter (a material note and/or a forecast). Always',
  '  safe: it retains the material and never moves the promised deadline or checkpoint.',
  '- revise: a confirmed change (title, summary, responsible, promised deadline, checkpoint).',
  '  ONLY on the principal\'s explicit instruction; requires the observed revision.',
  '- propose: hold a major inferred change (reschedule, checkpoint, complete, abandon) for the',
  '  principal\'s confirmation. Use this whenever you inferred the change yourself; it never',
  '  applies anything.',
  '- confirm: apply one pending proposal. ONLY when the principal explicitly confirmed it.',
  '- reject: permanently decline one pending proposal. ONLY when the principal explicitly rejected it;',
  '  the confirmed matter and its dates stay unchanged. The rejection receipt retains its source.',
  '- note: retain a fragment that names no explicit matter (never guess attribution by title).',
  '- claim: attach an unclaimed fragment to a matter, only with an explicit basis.',
  '- complete: mark a matter completed. Requires verbatim arrival evidence; "should have',
  '  paid" is not evidence.',
  '- reopen: correct a mis-associated completion; state the reason.',
  'Every mutating action takes operation_id and quote. One operation_id per submission intent;',
  'reuse the same id (and content) to retry after a failure — the ledger replays the original',
  'receipt instead of applying twice. Conflicts report the current revision: re-read, then',
  'express the new judgment as a NEW operation id.',
].join('\n')

interface DeskItem {
  id: string
  title: string
  status: string
  revision: number
  promised_deadline?: string
  forecast_at?: string
  next_checkpoint?: string
}

export interface OperatingOutput {
  action: string
  summary: string
  receipt?: { operationId: string; matterId: string; submittedAt: string; outcome: { status: string; revision?: number; unclaimedId?: string; proposalId?: string; observedRevision?: number; currentRevision?: number; reason?: string } }
  source?: LedgerSource
  matters?: DeskItem[]
  unclaimed?: { id: string; note: string; sessionId: string }[]
  materials?: { id: string; note: string; sessionId: string; quote?: string }[]
  proposals?: { id: string; kind: string; status: string; proposed_at: string; source: LedgerSource; resolution_operation_id?: string }[]
}

function deskItem(matter: MatterRecord): DeskItem {
  return {
    id: matter.id,
    title: matter.title,
    status: matter.status,
    revision: matter.revision,
    ...(matter.times.promisedDeadline !== undefined ? { promised_deadline: matter.times.promisedDeadline } : {}),
    ...(matter.times.forecastAt !== undefined ? { forecast_at: matter.times.forecastAt } : {}),
    ...(matter.times.nextCheckpoint !== undefined ? { next_checkpoint: matter.times.nextCheckpoint } : {}),
  }
}

function render(_args: { action: Action }, value: OperatingOutput): { type: 'text', text: string }[] {
  const lines = [value.summary]
  for (const item of value.matters ?? []) {
    const times = [
      item.promised_deadline !== undefined ? `promised ${item.promised_deadline}` : '',
      item.forecast_at !== undefined ? `forecast ${item.forecast_at}` : '',
      item.next_checkpoint !== undefined ? `checkpoint ${item.next_checkpoint}` : '',
    ].filter(part => part.length > 0).join(', ')
    lines.push(`- [${item.status}] ${item.title} (${item.id}, revision ${item.revision}${times.length > 0 ? `; ${times}` : ''})`)
  }
  for (const fragment of value.unclaimed ?? []) {
    lines.push(`- unclaimed ${fragment.id} (${fragment.sessionId}): ${fragment.note}`)
  }
  for (const material of value.materials ?? []) {
    lines.push(`- material ${material.id} (${material.sessionId}): ${material.note}`)
  }
  for (const proposal of value.proposals ?? []) {
    lines.push(`- proposal ${proposal.id} ${proposal.kind} [${proposal.status}] (proposed ${proposal.proposed_at}; source ${proposal.source.sessionId}${proposal.source.quote !== undefined ? `: ${proposal.source.quote}` : ''}${proposal.resolution_operation_id !== undefined ? `; resolution ${proposal.resolution_operation_id}` : ''})`)
  }
  if (value.source !== undefined) {
    lines.push(`- source ${value.source.sessionId}${value.source.quote !== undefined ? `: ${value.source.quote}` : ''}`)
  }
  if (value.receipt !== undefined) {
    lines.push(`- receipt ${value.receipt.operationId} on ${value.receipt.matterId || 'no matter'}: ${JSON.stringify(value.receipt.outcome)}`)
  }
  return [{ type: 'text', text: lines.join('\n') }]
}

/**
 * Build the operating tool bound to one agent-plane context.
 * @param ctx - Context carrying `assistantOperatingLedger` and `tools`.
 * @returns The tool definition; `apply` registers it.
 */
export function operatingTool(ctx: Context) {
  return defineTool({
    name: 'assistant_operating',
    description: DESCRIPTION,
    parameters: {
      action: { type: 'string', required: true, enum: ACTIONS, description: ACTIONS.join(' | ') },
      operation_id: { type: 'string', description: 'mutating actions: one id per submission intent; reuse it to retry the same submission.' },
      quote: { type: 'string', description: 'mutating actions: the principal\'s words or the material, verbatim.' },
      matter_id: { type: 'string', description: 'read | report | revise | propose | confirm | reject | complete | reopen | claim: the matter.' },
      unclaimed_id: { type: 'string', description: 'claim: the unclaimed fragment to attach.' },
      proposal_id: { type: 'string', description: 'confirm | reject: the pending proposal to resolve.' },
      observed_revision: { type: 'number', description: 'revise | complete | reopen: the revision you last read.' },
      title: { type: 'string', description: 'entrust: the matter\'s title. revise: a rename.' },
      summary: { type: 'string', description: 'entrust | revise: what the matter is, one or two sentences.' },
      responsible: { type: 'string', description: 'entrust | revise: who owns it on the ground.' },
      promised_deadline: { type: 'string', description: 'entrust: the promise. revise: an explicitly re-agreed promise.' },
      next_checkpoint: { type: 'string', description: 'entrust: when to look again. revise: an explicitly moved checkpoint.' },
      forecast_at: { type: 'string', description: 'report: a new current estimate (does not move the promise).' },
      note: { type: 'string', description: 'report: the progress note. note: the fragment. complete: what the evidence is.' },
      change_kind: { type: 'string', enum: CHANGE_KINDS, description: 'propose: reschedule | checkpoint | complete | abandon.' },
      change_deadline: { type: 'string', description: 'propose reschedule/checkpoint: the proposed date.' },
      evidence_quote: { type: 'string', description: 'complete (action and propose): the arrival evidence, verbatim.' },
      reason: { type: 'string', description: 'reopen: why the completion was mis-associated.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', required: true },
          summary: { type: 'string', required: true },
           source: {
             type: 'object',
             additionalProperties: false,
             properties: {
               sessionId: { type: 'string', required: true },
               eventId: { type: 'string' },
               quote: { type: 'string' },
             },
           },
          receipt: {
            type: 'object',
            additionalProperties: false,
            properties: {
              operationId: { type: 'string', required: true },
              matterId: { type: 'string', required: true },
              submittedAt: { type: 'string', required: true },
             outcome: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                  status: { type: 'string', required: true },
                  revision: { type: 'integer' },
                  unclaimedId: { type: 'string' },
                  proposalId: { type: 'string' },
                  observedRevision: { type: 'integer' },
                  currentRevision: { type: 'integer' },
                  reason: { type: 'string' },
                },
              },
            },
          },
          matters: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                title: { type: 'string', required: true },
                status: { type: 'string', required: true },
                revision: { type: 'integer', required: true },
                promised_deadline: { type: 'string' },
                forecast_at: { type: 'string' },
                next_checkpoint: { type: 'string' },
              },
            },
          },
          unclaimed: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                note: { type: 'string', required: true },
                sessionId: { type: 'string', required: true },
              },
            },
          },
          materials: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                note: { type: 'string', required: true },
                sessionId: { type: 'string', required: true },
                quote: { type: 'string' },
              },
            },
          },
          proposals: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                kind: { type: 'string', required: true },
                 proposed_at: { type: 'string', required: true },
                 source: {
                   type: 'object', additionalProperties: false,
                   properties: { sessionId: { type: 'string', required: true }, eventId: { type: 'string' }, quote: { type: 'string' } },
                 },
                 resolution_operation_id: { type: 'string' },
                status: { type: 'string', required: true },
              },
            },
          },
        },
      } as const,
      render,
    },
    async execute(args, exec): Promise<OperatingOutput> {
      const action = args.action as Action
      const ledger = ctx.assistantOperatingLedger
      // Provenance is stamped here, not by the model: the session id is the real one.
      const sessionId = exec.agent !== undefined ? String(exec.agent.session.id) : 'outside-session'
      const source = (quote: string): LedgerSource => ({ sessionId, ...(quote.length > 0 ? { quote } : {}) })
      const mutating = action !== 'desk' && action !== 'read'
      const operationId = args.operation_id
      const quote = args.quote ?? ''
      if (mutating && (typeof operationId !== 'string' || operationId.trim().length === 0)) {
        throw new Error(`assistant_operating ${action} requires operation_id`)
      }
      if (mutating && quote.trim().length === 0) {
        throw new Error(`assistant_operating ${action} requires quote (the principal's words or the material, verbatim)`)
      }
      const submit = async (operation: LedgerOperation, summary: string): Promise<OperatingOutput> => {
        const receipt = await ledger.submitOperation(operation)
        return { action, summary, source: operation.source, receipt: { operationId: receipt.operationId, matterId: receipt.matterId, submittedAt: receipt.submittedAt, outcome: receipt.outcome } }
      }
      switch (action) {
        case 'desk': {
          const [matters, unclaimed] = await Promise.all([ledger.listMatters(), ledger.readUnclaimed()])
          return {
            action,
            summary: `${matters.length} matter(s), ${unclaimed.length} unclaimed fragment(s):`,
            matters: matters.map(deskItem),
            unclaimed: unclaimed.map(fragment => ({ id: fragment.id, note: fragment.note, sessionId: fragment.source.sessionId })),
          }
        }
        case 'read': {
          if (args.matter_id !== undefined) {
            const matter = await ledger.readMatter(args.matter_id)
            if (matter === undefined) throw new Error(`no operating matter "${args.matter_id}"`)
            return {
              action,
              summary: `${matter.title} (${matter.id}, revision ${matter.revision}, ${matter.status}); ${matter.materials.length} material(s), ${matter.proposals.filter(proposal => proposal.status === 'pending').length} pending proposal(s):`,
              matters: [deskItem(matter)],
              materials: matter.materials.map(material => ({
                id: material.id,
                note: material.note,
                sessionId: material.source.sessionId,
                ...(material.source.quote !== undefined ? { quote: material.source.quote } : {}),
              })),
              proposals: matter.proposals.map(proposal => ({
                 id: proposal.id,
                 kind: proposal.change.kind,
                 status: proposal.status,
                 proposed_at: proposal.proposedAt,
                 source: proposal.source,
                 ...(proposal.resolutionOperationId !== undefined ? { resolution_operation_id: proposal.resolutionOperationId } : {}),
               })),
            }
          }
          if (typeof args.operation_id === 'string' && args.operation_id.trim().length > 0) {
            const record = await ledger.readOperationRecord(args.operation_id)
            if (record === undefined) throw new Error(`no operation receipt "${args.operation_id}"`)
             const { operation, receipt } = record
            return {
              action,
              summary: `Receipt ${receipt.operationId} on ${receipt.matterId || 'no matter'}:`,
               source: operation.source,
              receipt: { operationId: receipt.operationId, matterId: receipt.matterId, submittedAt: receipt.submittedAt, outcome: receipt.outcome },
            }
          }
          throw new Error('assistant_operating read requires matter_id or operation_id')
        }
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
        /* v8 ignore next 2 -- the enum in the parameter schema admits only the cases above */
        default:
          throw new Error(`unsupported action ${String(action)}`)
      }
    },
  })
}

/**
 * Register the operating tool.
 * @param ctx - Agent-plane context carrying `assistantOperatingLedger` and `tools`.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(operatingTool(ctx))
}
