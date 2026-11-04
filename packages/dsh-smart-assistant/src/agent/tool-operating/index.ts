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
import type { LedgerOperation, LedgerSource } from '../../domain/operating/ledger.ts'
import { OPERATING_OUTPUT_SCHEMA } from './schema.ts'
import { submitMutation } from './mutations.ts'
import { deskItem, proposalSummary, render, type OperatingOutput } from './view.ts'
import { ACTIONS, CHANGE_KINDS, type Action } from './vocabulary.ts'

export type { OperatingOutput } from './view.ts'
export { render } from './view.ts'

export const name = 'assistant-operating-tool'

export const inject = ['assistantOperatingLedger', 'tools']

const DESCRIPTION = [
  'Read and update the operating ledger: the cross-session matters the principal entrusted',
  '(payments, commitments, risks) with their sources, revisions, and durable receipts.',
  'Actions:',
  '- desk: list every matter (id, title, status, revision, times), every PENDING proposal awaiting',
  '  the principal (id, matter, what it would change, when it was proposed), and unclaimed fragments.',
  '- read: one matter in full (current fields, entrust source, materials, complete proposals,',
  '  ordered operation outcomes and sources) by matter_id, or one receipt by operation_id.',
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
  '- discard: the principal judged a fragment to be noise; it leaves the unclaimed lane and the',
  '  reason stays in the ledger. ONLY on the principal\'s explicit instruction — a fragment you',
  '  cannot place is not noise, it is unplaced; never discard to tidy up on your own.',
  '- complete: mark a matter completed. Requires verbatim arrival evidence; "should have',
  '  paid" is not evidence.',
  '- reopen: correct a mis-associated completion; state the reason.',
  'Every mutating action takes operation_id and quote. One operation_id per submission intent;',
  'reuse the same id (and content) to retry after a failure — the ledger replays the original',
  'receipt instead of applying twice. Conflicts report the current revision: re-read, then',
  'express the new judgment as a NEW operation id.',
].join('\n')

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
      unclaimed_id: { type: 'string', description: 'claim | discard: the unclaimed fragment to attach or to drop as noise.' },
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
      reason: { type: 'string', description: 'reopen: why the completion was mis-associated. discard: why the fragment is noise (required — no reason, no removal).' },
    },
    output: {
      schema: OPERATING_OUTPUT_SCHEMA,
      render,
    },
    async execute(args, exec): Promise<OperatingOutput> {
      const action = args.action as Action
      const ledger = ctx.assistantOperatingLedger
      // Provenance is stamped here, not by the model: the session id is the real one.
      const sessionId = exec.agent !== undefined ? String(exec.agent.session.id) : 'outside-session'
      const source = (quote: string): LedgerSource => ({ sessionId, ...(quote.length > 0 ? { quote } : {}) })
      const operationId = args.operation_id
      const quote = args.quote ?? ''
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
            // Pending proposals ride the desk summary (261016 card): a pending proposal blocks the
            // matter's return and is the only ledger item that requires the principal's decision,
            // so a brief built from ONE desk read must be able to list them. Resolved proposals
            // stay on `read` (their full history belongs to the matter, not to the board).
            proposals: matters.flatMap(matter => matter.proposals
              .filter(proposal => proposal.status === 'pending')
              .map(proposal => ({ ...proposalSummary(proposal), matter_id: matter.id }))),
            unclaimed: unclaimed.map(fragment => ({ id: fragment.id, note: fragment.note, sessionId: fragment.source.sessionId })),
          }
        }
        case 'read': {
          if (args.matter_id !== undefined) {
            const snapshot = await ledger.readMatterSnapshot(args.matter_id)
            if (snapshot === undefined) throw new Error(`no operating matter "${args.matter_id}"`)
            const { matter, operations } = snapshot
            const entrustRecord = operations.find(record => record.operation.kind === 'create')
            return {
              action,
              summary: `${matter.title} (${matter.id}, revision ${matter.revision}, ${matter.status}); ${matter.materials.length} material(s), ${matter.proposals.filter(proposal => proposal.status === 'pending').length} pending proposal(s):`,
              matters: [deskItem(matter)],
              ...(entrustRecord?.operation.kind === 'create' ? { entrust: {
                operation_id: entrustRecord.operation.operationId,
                ...entrustRecord.operation.source,
              } } : {}),
              materials: matter.materials.map(material => ({
                id: material.id,
                note: material.note,
                sessionId: material.source.sessionId,
                ...(material.source.eventId !== undefined ? { eventId: material.source.eventId } : {}),
                ...(material.source.quote !== undefined ? { quote: material.source.quote } : {}),
              })),
              proposals: matter.proposals.map(proposalSummary),
              operations: operations.map(({ operation, receipt }) => ({
                operationId: receipt.operationId,
                kind: operation.kind,
                submittedAt: receipt.submittedAt,
                outcome: receipt.outcome,
                ...(operation.source !== undefined ? { source: operation.source } : {}),
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
              ...(operation.source !== undefined ? { source: operation.source } : {}),
              receipt: { operationId: receipt.operationId, matterId: receipt.matterId, submittedAt: receipt.submittedAt, outcome: receipt.outcome },
            }
          }
          throw new Error('assistant_operating read requires matter_id or operation_id')
        }
        default: {
          // Every mutating family lives in mutations.ts so the adapter file only owns wiring,
          // the two reads, and the one place both mutating preconditions are enforced.
          if (typeof operationId !== 'string' || operationId.trim().length === 0) {
            throw new Error(`assistant_operating ${action} requires operation_id`)
          }
          if (quote.trim().length === 0) {
            throw new Error(`assistant_operating ${action} requires quote (the principal's words or the material, verbatim)`)
          }
          return submitMutation({ action, args, ledger, quote, operationId, source, submit })
        }
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
