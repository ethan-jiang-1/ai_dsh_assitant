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
import type {} from '@deepseek-ai/dsh-skill'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { MEMORY_KINDS, IMPORTANCE_RANGE, type MemoryRecord } from '../../memory/record.ts'
import type { RecallHit } from '../../memory/recall.ts'
import { LEARNED_PROVIDER_NAME } from '../learn/index.ts'
import { shadowedLearnedSkills } from '../../skills/shadow.ts'
import { callCard, presentationMeta, resultCard } from '../tool-support/presentation.ts'
import { usageWindowNote } from '../../skills/usage.ts'

export const name = 'assistant-memory-tool'

export const inject = ['assistantMemory', 'skills', 'tools']

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
  '  digest budget, stalled threads, skills the loader would ignore, learned skills shadowed by',
  '  a same-named curated skill, skills past their use-by date) plus the per-skill usage ledger',
  '  and headline counts, including the skills-archive scale (retired bundles, snapshots).',
  '  Scope: it is a pure function over the working folder — it cannot see git state, uncommitted',
  '  changes, or another session working in the same tree, so "clean" never means the whole',
  '  situation is clean. Say so when that difference matters.',
  '  Run this before tidying.',
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

const SKILL_USAGE_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true },
    count: { type: 'integer', required: true },
    last_used: { type: 'string' },
    days_since_last_use: { type: 'integer' },
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
    skill_usage: { type: 'array', items: SKILL_USAGE_ITEM },
    skill_usage_window: { type: 'string' },
    counts: {
      type: 'object',
      additionalProperties: false,
      properties: {
        memories: { type: 'integer', required: true },
        activeMemories: { type: 'integer', required: true },
        threads: { type: 'integer', required: true },
        openThreads: { type: 'integer', required: true },
        parkedThreads: { type: 'integer', required: true },
        learnedSkills: { type: 'integer', required: true },
        knowledgePages: { type: 'integer', required: true },
        retiredSkillBundles: { type: 'integer', required: true },
        skillSnapshots: { type: 'integer', required: true },
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
  /** Set by `curate` only — the home's headline numbers, so the model can cite them. */
  counts?: {
    memories: number
    activeMemories: number
    threads: number
    openThreads: number
    parkedThreads: number
    learnedSkills: number
    knowledgePages: number
    retiredSkillBundles: number
    skillSnapshots: number
    digestBytes: number
    digestMaxBytes: number
  }
  /** Set by `curate` only — per-skill load counts, least-used first (retirement candidates first). */
  skill_usage?: { name: string, count: number, last_used?: string, days_since_last_use?: number }[]
  /**
   * Which window the counts cover ("since 2026-09-24" / "ledger window unknown"). A bare `0` reads
   * as "never used", and a skill loaded before the ledger began is not evidence of disuse.
   */
  skill_usage_window?: string
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
  if (value.counts !== undefined) {
    const counts = value.counts
    lines.push(
      `- counts: ${counts.activeMemories}/${counts.memories} active memories,`
      + ` ${counts.openThreads}/${counts.threads} threads open (${counts.parkedThreads} parked),`
      + ` ${counts.learnedSkills} learned skills,`
      + ` ${counts.knowledgePages} knowledge pages,`
      + ` digest ${counts.digestBytes}/${counts.digestMaxBytes} bytes.`,
    )
    // The skills archive only grows (retirement and snapshotting never delete), so its scale is
    // the one number the home cannot observe by reading a room — report it every time.
    lines.push(`- skills archive: ${counts.retiredSkillBundles} retired bundles, ${counts.skillSnapshots} snapshots.`)
  }
  if (value.skill_usage !== undefined && value.skill_usage.length > 0) {
    const parts = value.skill_usage.map(skill => skill.count === 0
      ? `${skill.name} not loaded`
      : `${skill.name}×${skill.count} (${skill.days_since_last_use ?? 0}d ago)`)
    const window = value.skill_usage_window ?? 'ledger window unknown'
    lines.push(`- skill usage (${window}): ${parts.join(', ')}.`)
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
      source: { type: 'string', description: 'save: where the claim came from (a person, a session, a tool).' },
      id: { type: 'string', description: 'forget: id of the record to retire.' },
      limit: { type: 'number', description: 'recall | list: maximum records returned.' },
    },
    output: {
      schema: OUTPUT,
      render,
      presentationMeta: (_args, value) => presentationMeta(value.summary),
    },
    async execute(args, exec): Promise<MemoryOutput> {
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
            ...(args.source !== undefined ? { source: args.source } : {}),
          })
          const superseded = args.supersedes !== undefined ? `, superseding ${args.supersedes}` : ''
          return {
            action,
            summary: `Saved ${record.kind} ${record.id}${superseded}.`,
            memories: [item(record)],
            findings: [],
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
          }
        }
        case 'curate': {
          // Shadow probe (slice 1b): the registry resolves names per layer chain, so it must be
          // asked from this agent's context. Without an agent (tests, headless maintenance) or on
          // an incomplete catalog read, no shadows are reported rather than guessed.
          const agent = exec.agent
          let shadowedBy: Readonly<Record<string, string>> | undefined
          if (agent !== undefined) {
            const snapshot = await ctx.skills.snapshot({
              cwd: agent.session.header.cwd,
              signal: exec.signal,
              scope: agent,
            })
            const winners = new Map(snapshot.skills.map(skill => [skill.name, skill.provider] as const))
            const learned = await ctx.assistantMemory.learnedSkillNames()
            shadowedBy = shadowedLearnedSkills(winners, snapshot.complete, learned, LEARNED_PROVIDER_NAME)
          }
          const brief = await ctx.assistantMemory.curate(shadowedBy)
          const warns = brief.findings.filter(finding => finding.severity === 'warn').length
          return {
            action,
            summary: brief.findings.length === 0
              ? 'Working folder is clean: no findings (working-folder scope only — git state is invisible to this check).'
              : `${brief.findings.length} finding(s), ${warns} of them losing signal now:`,
            memories: [],
            findings: brief.findings.map(finding => ({
              code: finding.code,
              severity: finding.severity,
              message: finding.message,
              refs: [...finding.refs],
            })),
            counts: brief.counts,
            skill_usage_window: usageWindowNote(brief.skillUsageSince),
            skill_usage: brief.skillUsage.map(line => ({
              name: line.name,
              count: line.count,
              ...(line.lastUsedAt !== undefined ? { last_used: line.lastUsedAt } : {}),
              ...(line.daysSinceLastUse !== undefined ? { days_since_last_use: line.daysSinceLastUse } : {}),
            })),
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
