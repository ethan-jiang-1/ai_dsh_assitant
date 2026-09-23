/**
 * `assistant_memory`: the model-facing tool over the home's memory room.
 *
 * One tool with five actions instead of five tools, because the actions share one vocabulary
 * (records, tags, ids) and the catalog is a context cost the model pays on every request. The tool
 * is a thin adapter: it validates cross-field rules the schema cannot express and returns the
 * service's canonical values, so the same behavior is reachable from tests and from a future UI.
 *
 * @module dsh-smart-assistant/tool-memory
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { MEMORY_KINDS, IMPORTANCE_RANGE, type MemoryRecord } from '../memory/record.ts'
import type { RecallHit } from '../memory/recall.ts'
import { callCard, presentationMeta, resultCard } from '../tool-support/presentation.ts'

export const name = 'assistant-memory-tool'

export const inject = ['assistantMemory', 'tools']

const ACTIONS = ['recall', 'save', 'forget', 'list', 'curate'] as const

type Action = (typeof ACTIONS)[number]

const DESCRIPTION = [
  'Read and write durable memory: facts, preferences, and decisions that stay true across sessions.',
  'Actions:',
  '- recall: rank active records against a query; returns why each one matched.',
  '- save: write one claim. Use `supersedes` instead of saving a near-duplicate when a fact changed.',
  '- forget: retire a record out of the active set (it stays readable in the archive).',
  '- list: show the active room.',
  '- curate: run the machine check and return findings (near-duplicates, dangling references,',
  '  digest budget, stalled threads, skills the loader would ignore). Run this before tidying.',
  'Load the `memory-hygiene` skill before saving, and `home-curation` before curating.',
].join('\n')

const MEMORY_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    kind: { type: 'string', required: true },
    status: { type: 'string', required: true },
    text: { type: 'string', required: true },
    tags: { type: 'array', required: true, items: { type: 'string' } },
    importance: { type: 'integer', required: true },
    updated: { type: 'string', required: true },
    why: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const FINDING_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    code: { type: 'string', required: true },
    severity: { type: 'string', required: true },
    message: { type: 'string', required: true },
    refs: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    memories: { type: 'array', required: true, items: MEMORY_ITEM },
    findings: { type: 'array', required: true, items: FINDING_ITEM },
    counts: {
      type: 'object',
      additionalProperties: false,
      required: true,
      properties: {
        memories: { type: 'integer', required: true },
        activeMemories: { type: 'integer', required: true },
        threads: { type: 'integer', required: true },
        openThreads: { type: 'integer', required: true },
        parkedThreads: { type: 'integer', required: true },
        learnedSkills: { type: 'integer', required: true },
        digestBytes: { type: 'integer', required: true },
        digestMaxBytes: { type: 'integer', required: true },
      },
    },
  },
} as const

interface MemoryItem {
  id: string
  kind: string
  status: string
  text: string
  tags: string[]
  importance: number
  updated: string
  why: string[]
}

interface MemoryOutput {
  action: string
  summary: string
  memories: MemoryItem[]
  findings: { code: string, severity: string, message: string, refs: string[] }[]
  counts: {
    memories: number
    activeMemories: number
    threads: number
    openThreads: number
    parkedThreads: number
    learnedSkills: number
    digestBytes: number
    digestMaxBytes: number
  }
}

const EMPTY_COUNTS: MemoryOutput['counts'] = {
  memories: 0,
  activeMemories: 0,
  threads: 0,
  openThreads: 0,
  parkedThreads: 0,
  learnedSkills: 0,
  digestBytes: 0,
  digestMaxBytes: 0,
}

function item(record: MemoryRecord, why: readonly string[] = []): MemoryItem {
  return {
    id: record.id,
    kind: record.kind,
    status: record.status,
    text: record.text,
    tags: [...record.tags],
    importance: record.importance,
    updated: record.updated,
    why: [...why],
  }
}

function hitItem(hit: RecallHit): MemoryItem {
  return item(hit.record, hit.why)
}

function render(_args: { action: Action }, value: MemoryOutput): { type: 'text', text: string }[] {
  const lines = [value.summary]
  for (const memory of value.memories) {
    const why = memory.why.length > 0 ? ` — ${memory.why.join(', ')}` : ''
    lines.push(`- [${memory.kind}] ${memory.text} (${memory.id})${why}`)
  }
  for (const finding of value.findings) {
    lines.push(`- ${finding.severity}: ${finding.message}`)
  }
  return [{ type: 'text', text: lines.join('\n') }]
}

/**
 * Register the memory tool.
 * @param ctx - Agent-plane context.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'assistant_memory',
    description: DESCRIPTION,
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ACTIONS,
        description: 'recall | save | forget | list | curate',
      },
      text: { type: 'string', description: 'save: the claim, one sentence or two.' },
      query: { type: 'string', description: 'recall: free-text terms matched against text and id.' },
      kind: {
        type: 'string',
        enum: MEMORY_KINDS,
        description: 'recall: restrict to one kind. save: what the claim asserts (default fact).',
      },
      tags: { type: 'array', items: { type: 'string' }, description: 'recall: require these tags. save: tag the record.' },
      importance: {
        type: 'number',
        description: `save: ${IMPORTANCE_RANGE.min}–${IMPORTANCE_RANGE.max}; higher sorts earlier in the digest.`,
      },
      supersedes: { type: 'string', description: 'save: id of the record this replaces (it is archived).' },
      id: { type: 'string', description: 'forget: id of the record to retire.' },
      limit: { type: 'number', description: 'recall | list: maximum records returned.' },
    },
    output: {
      schema: OUTPUT,
      render,
      presentationMeta: (_args, value) => presentationMeta(value.summary),
    },
    async execute(args): Promise<MemoryOutput> {
      const action = args.action
      switch (action) {
        case 'save': {
          if (args.text === undefined || args.text.trim().length === 0) {
            throw new Error('assistant_memory save requires text')
          }
          const record = await ctx.assistantMemory.saveMemory({
            text: args.text,
            ...(args.kind !== undefined ? { kind: args.kind } : {}),
            ...(args.tags !== undefined ? { tags: args.tags } : {}),
            ...(args.importance !== undefined ? { importance: args.importance } : {}),
            ...(args.supersedes !== undefined ? { supersedes: args.supersedes } : {}),
          })
          const superseded = args.supersedes !== undefined ? `, superseding ${args.supersedes}` : ''
          return {
            action,
            summary: `Saved ${record.kind} ${record.id}${superseded}.`,
            memories: [item(record)],
            findings: [],
            counts: EMPTY_COUNTS,
          }
        }
        case 'recall': {
          const hits = await ctx.assistantMemory.recall({
            ...(args.query !== undefined ? { query: args.query } : {}),
            ...(args.kind !== undefined ? { kind: args.kind } : {}),
            ...(args.tags !== undefined ? { tags: args.tags } : {}),
            ...(args.limit !== undefined ? { limit: args.limit } : {}),
          })
          return {
            action,
            summary: hits.length === 0
              ? 'No active memory matched. Widen the query, or save what you just learned.'
              : `${hits.length} memory record(s), strongest first:`,
            memories: hits.map(hitItem),
            findings: [],
            counts: EMPTY_COUNTS,
          }
        }
        case 'list': {
          const listing = await ctx.assistantMemory.listMemories()
          const limit = args.limit ?? 50
          const shown = listing.entries.slice(0, Math.max(0, limit))
          const failures = listing.failures.length
          return {
            action,
            summary: `${listing.entries.length} active record(s)${failures > 0 ? `; ${failures} file(s) unreadable` : ''}:`,
            memories: shown.map(record => item(record)),
            findings: [],
            counts: EMPTY_COUNTS,
          }
        }
        case 'forget': {
          if (args.id === undefined || args.id.trim().length === 0) {
            throw new Error('assistant_memory forget requires id')
          }
          const archived = await ctx.assistantMemory.forgetMemory(args.id)
          if (!archived) throw new Error(`no active memory record "${args.id}"`)
          return {
            action,
            summary: `Retired ${args.id}; it stays readable in memory/archive/.`,
            memories: [],
            findings: [],
            counts: EMPTY_COUNTS,
          }
        }
        case 'curate': {
          const brief = await ctx.assistantMemory.curate()
          const warns = brief.findings.filter(finding => finding.severity === 'warn').length
          return {
            action,
            summary: brief.findings.length === 0
              ? 'Home is clean: no findings.'
              : `${brief.findings.length} finding(s), ${warns} of them losing signal now:`,
            memories: [],
            findings: brief.findings.map(finding => ({
              code: finding.code,
              severity: finding.severity,
              message: finding.message,
              refs: [...finding.refs],
            })),
            counts: brief.counts,
          }
        }
        /* v8 ignore next 2 -- the enum in the parameter schema admits only the cases above */
        default:
          throw new Error(`unsupported action ${String(action)}`)
      }
    },
    presentCall: args => callCard(`Memory ${args.action}`, args.query ?? args.text ?? args.id ?? args.action),
    presentResult: (_args, result) => resultCard(result.meta, 'Memory'),
  }))
}
