/**
 * `assistant_research`: the model-facing tool over the home's research room.
 *
 * The three exits are the whole design: a thread that can only stay open is a slow kind of
 * forgetting. `drop` requires a reason and `promote` requires an existing destination, so a closed
 * thread always carries evidence of *why* it closed — which is what stops a future session from
 * reopening it.
 *
 * @module dsh-smart-assistant/tool-research
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ResearchThread } from '../research/thread.ts'
import { callCard, presentationMeta, resultCard } from '../tool-support/presentation.ts'

export const name = 'assistant-research-tool'

export const inject = ['assistantMemory', 'tools']

const ACTIONS = ['open', 'update', 'park', 'drop', 'promote', 'list'] as const

const DESCRIPTION = [
  'Keep a backlog of threads you have not resolved: a question, why it matters, and your current lean.',
  'A thread is not a task — it is a question with a lean, kept so a later session can continue instead',
  'of restarting. Every thread ends one of three ways:',
  '- promote: the question got answered. Save the answer first (assistant_memory or assistant_reflect),',
  '  then promote with `promoted_to` naming it. The thread is archived with the link.',
  '- park: still valid, not now. It stays in the room but leaves the digest.',
  '- drop: wrong, moot, or not worth it. `reason` is required — it is what stops the next session',
  '  from reopening the same question.',
  'Load the `research-backlog` skill before opening or closing a thread.',
].join('\n')

const THREAD_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    status: { type: 'string', required: true },
    question: { type: 'string', required: true },
    why: { type: 'string', required: true },
    lean: { type: 'string', required: true },
    evidence: { type: 'array', required: true, items: { type: 'string' } },
    updated: { type: 'string', required: true },
  },
} as const

const OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    threads: { type: 'array', required: true, items: THREAD_ITEM },
  },
} as const

interface ThreadItem {
  id: string
  status: string
  question: string
  why: string
  lean: string
  evidence: string[]
  updated: string
}

interface ResearchOutput {
  action: string
  summary: string
  threads: ThreadItem[]
}

function item(thread: ResearchThread): ThreadItem {
  return {
    id: thread.id,
    status: thread.status,
    question: thread.question,
    why: thread.why,
    lean: thread.lean ?? '',
    evidence: [...thread.evidence],
    updated: thread.updated,
  }
}

function render(_args: unknown, value: ResearchOutput): { type: 'text', text: string }[] {
  const lines = [value.summary]
  for (const thread of value.threads) {
    const lean = thread.lean.length > 0 ? `\n  lean: ${thread.lean}` : ''
    lines.push(`- (${thread.status}) ${thread.question} (${thread.id})${lean}`)
    for (const entry of thread.evidence) lines.push(`  · ${entry}`)
  }
  return [{ type: 'text', text: lines.join('\n') }]
}

/**
 * Register the research tool.
 * @param ctx - Agent-plane context.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'assistant_research',
    description: DESCRIPTION,
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ACTIONS,
        description: 'open | update | park | drop | promote | list',
      },
      question: { type: 'string', description: 'open: what is not known yet. update: replacement question.' },
      why: { type: 'string', description: 'open: why it deserves attention. update: replacement rationale.' },
      lean: { type: 'string', description: 'open | update: current best answer and its weakness.' },
      evidence: {
        type: 'array',
        items: { type: 'string' },
        description: 'open | update: what is already known; entries are appended on update.',
      },
      id: { type: 'string', description: 'update | park | drop | promote: thread id.' },
      reason: { type: 'string', description: 'drop: why it was dropped. Required.' },
      promoted_to: { type: 'string', description: 'promote: id of the memory record or skill carrying the answer.' },
    },
    output: {
      schema: OUTPUT,
      render,
      presentationMeta: (_args, value) => presentationMeta(value.summary),
    },
    async execute(args): Promise<ResearchOutput> {
      const action = args.action
      switch (action) {
        case 'open': {
          if (args.question === undefined || args.question.trim().length === 0) {
            throw new Error('assistant_research open requires a question')
          }
          if (args.why === undefined || args.why.trim().length === 0) {
            throw new Error('assistant_research open requires why the thread deserves attention')
          }
          const thread = await ctx.assistantMemory.openThread({
            question: args.question,
            why: args.why,
            ...(args.lean !== undefined ? { lean: args.lean } : {}),
            ...(args.evidence !== undefined ? { evidence: args.evidence } : {}),
          })
          return { action, summary: `Opened thread ${thread.id}.`, threads: [item(thread)] }
        }
        case 'update': {
          const id = args.id
          if (id === undefined) throw new Error('assistant_research update requires id')
          const thread = await ctx.assistantMemory.updateThread(id, {
            ...(args.question !== undefined ? { question: args.question } : {}),
            ...(args.why !== undefined ? { why: args.why } : {}),
            ...(args.lean !== undefined ? { lean: args.lean } : {}),
            ...(args.evidence !== undefined ? { evidence: args.evidence } : {}),
          })
          return { action, summary: `Updated thread ${thread.id}.`, threads: [item(thread)] }
        }
        case 'park': {
          const id = args.id
          if (id === undefined) throw new Error('assistant_research park requires id')
          const thread = await ctx.assistantMemory.parkThread(id)
          return {
            action,
            summary: `Parked ${thread.id}: it stays in research/ but leaves the digest.`,
            threads: [item(thread)],
          }
        }
        case 'drop': {
          const id = args.id
          if (id === undefined) throw new Error('assistant_research drop requires id')
          if (args.reason === undefined || args.reason.trim().length === 0) {
            throw new Error('assistant_research drop requires a reason: a thread dropped without one gets reopened')
          }
          const thread = await ctx.assistantMemory.dropThread(id, args.reason)
          return { action, summary: `Dropped ${thread.id}: ${thread.reason ?? ''}`, threads: [item(thread)] }
        }
        case 'promote': {
          const id = args.id
          if (id === undefined) throw new Error('assistant_research promote requires id')
          if (args.promoted_to === undefined) {
            throw new Error('assistant_research promote requires promoted_to naming the answer')
          }
          const thread = await ctx.assistantMemory.promoteThread(id, { promotedTo: args.promoted_to })
          return {
            action,
            summary: `Promoted ${thread.id} into ${thread.promotedTo ?? ''}.`,
            threads: [item(thread)],
          }
        }
        case 'list': {
          const listing = await ctx.assistantMemory.listThreads()
          const open = listing.entries.filter(thread => thread.status === 'open')
          const parked = listing.entries.filter(thread => thread.status === 'parked')
          return {
            action,
            summary: `${open.length} open, ${parked.length} parked:`,
            threads: [...open, ...parked].map(thread => item(thread)),
          }
        }
        /* v8 ignore next 2 -- the enum in the parameter schema admits only the cases above */
        default:
          throw new Error(`unsupported action ${String(action)}`)
      }
    },
    presentCall: args => callCard(`Research ${args.action}`, args.question ?? args.id ?? args.action),
    presentResult: (_args, result) => resultCard(result.meta, 'Research'),
  }))
}
