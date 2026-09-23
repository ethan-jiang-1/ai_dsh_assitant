/**
 * `assistant_reflect`: the learning flow, plus the skill provider that makes its output live.
 *
 * Two halves that belong together:
 *
 * 1. The `assistant_reflect` tool gathers evidence for a reflection (`brief`) and writes a validated,
 *    provenance-stamped skill (`save_skill`). The distillation itself stays the model's judgement —
 *    the tool never decides what is worth keeping, because that is exactly the judgement a
 *    reflection is supposed to exercise.
 * 2. Mounting the harness skill provider over the home's `skills/` room. It is mounted from *here*
 *    rather than configured in the preset because this module injects `assistantMemory` and can read
 *    the resolved path directly: no duplicated home resolution, no config interpolation that breaks
 *    when the service is absent. The provider gets its own `providerName`, so a learned skill and a
 *    curated one are distinguishable by origin without moving files into a root the provider would
 *    not scan.
 *
 * @module dsh-smart-assistant/learn
 */

import type { Context } from '@deepseek-ai/cordis'
import * as skillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scanLearnedSkills } from '../skills/scan.ts'
import { skillLoadFromResult, skillUsageLines } from '../skills/usage.ts'
import { callCard, presentationMeta, resultCard } from '../tool-support/presentation.ts'

export const name = 'assistant-learn'

export const inject = ['assistantMemory', 'skills', 'tools']

/** Provider name for the learned-skills root, distinct from the curated provider's default. */
const LEARNED_PROVIDER_NAME = 'assistant-learned'

const MAX_ASKS = 5
const MAX_TOOL_KINDS = 12
const MAX_TEXT_CHARS = 240
const MAX_SKILL_USAGE = 8

const DESCRIPTION = [
  'Turn an experience into durable knowledge: gather the evidence, then write what is reusable.',
  'Actions:',
  '- brief: a compact view of this session (what was asked, what tools were used) plus the memory',
  '  records, open threads, and learned-skill usage counts that relate to it. Read it before',
  '  deciding anything — do not reflect from your recollection of the conversation.',
  '- save_skill: write a validated skill into your home\'s skills/ room, where it becomes loadable',
  '  immediately. Use it for a procedure you would otherwise re-derive, not for a one-off.',
  '"Nothing durable came out of this session" is a correct result. Load the `self-reflection` skill',
  'before reflecting.',
].join('\n')

const OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    session_id: { type: 'string', required: true },
    asks: { type: 'array', required: true, items: { type: 'string' } },
    tool_calls: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          count: { type: 'integer', required: true },
        },
      },
    },
    related_memories: { type: 'array', required: true, items: { type: 'string' } },
    open_threads: { type: 'array', required: true, items: { type: 'string' } },
    skill_usage: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          count: { type: 'integer', required: true },
          last_used: { type: 'string' },
        },
      },
    },
    skill_path: { type: 'string', required: true },
  },
} as const

interface ReflectOutput {
  action: string
  summary: string
  session_id: string
  asks: string[]
  tool_calls: { name: string, count: number }[]
  related_memories: string[]
  open_threads: string[]
  skill_usage: { name: string, count: number, last_used?: string }[]
  skill_path: string
}

function flatten(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= MAX_TEXT_CHARS ? flat : `${flat.slice(0, MAX_TEXT_CHARS - 1)}…`
}

function render(_args: unknown, value: ReflectOutput): { type: 'text', text: string }[] {
  const lines = [value.summary]
  if (value.asks.length > 0) {
    lines.push('Asked:', ...value.asks.map(ask => `- ${ask}`))
  }
  if (value.tool_calls.length > 0) {
    lines.push(`Tool activity: ${value.tool_calls.map(call => `${call.name}×${call.count}`).join(', ')}`)
  }
  if (value.related_memories.length > 0) {
    lines.push('Already known:', ...value.related_memories.map(memory => `- ${memory}`))
  }
  if (value.open_threads.length > 0) {
    lines.push('Open threads:', ...value.open_threads.map(thread => `- ${thread}`))
  }
  if (value.skill_usage.length > 0) {
    const parts = value.skill_usage.map(skill =>
      skill.count === 0 ? `${skill.name} never loaded` : `${skill.name}×${skill.count}`)
    lines.push(`Skill usage: ${parts.join(', ')}.`)
  }
  if (value.skill_path.length > 0) lines.push(`Written: ${value.skill_path}`)
  return [{ type: 'text', text: lines.join('\n') }]
}

/**
 * Register the reflection tool and the learned-skills provider.
 * @param ctx - Agent-plane context.
 */
export function apply(ctx: Context): void {
  ctx.plugin(skillFilesystem, {
    providerName: LEARNED_PROVIDER_NAME,
    includeDefaultRoots: false,
    customSkillDirs: [ctx.assistantMemory.paths.skillsDir],
    watch: true,
  })

  // Usage ledger (tri-line proposal 2026-09-24, slice 1a): every successful `skill`-tool load in
  // a session running this preset is counted into the home's shared ledger — the data plane for
  // retirement decisions and the deferred auto-distill criterion. The user's `/<name>` slash
  // invocation injects skill content without a tool call and is deliberately not counted here.
  // The subscription rides this session's scope and dies with it; concurrent sessions may lose a
  // race on a single increment (last writer wins), which advisory counts tolerate.
  ctx.on('tools/result', (exec, result): undefined => {
    const name = skillLoadFromResult(exec.name, exec.arguments, result.isError)
    if (name === undefined) return undefined
    void ctx.assistantMemory.recordSkillLoad(name).catch((error: unknown) => {
      ctx.logger.warn(`skill usage record failed for "${name}": ${String(error)}`)
    })
    return undefined
  })

  ctx.tools.register(defineTool({
    name: 'assistant_reflect',
    description: DESCRIPTION,
    parameters: {
      action: { type: 'string', required: true, enum: ['brief', 'save_skill'], description: 'brief | save_skill' },
      name: { type: 'string', description: 'save_skill: kebab-case skill name; also its directory name.' },
      description: { type: 'string', description: 'save_skill: when to load it — the only text a future session sees first.' },
      when_to_use: { type: 'string', description: 'save_skill: extra trigger guidance.' },
      body: { type: 'string', description: 'save_skill: the procedure, written for a session without your context.' },
    },
    output: {
      schema: OUTPUT,
      render,
      presentationMeta: (_args, value) => presentationMeta(value.summary),
    },
    async execute(args, exec): Promise<ReflectOutput> {
      const action = args.action
      const empty: ReflectOutput = {
        action,
        summary: '',
        session_id: '',
        asks: [],
        tool_calls: [],
        related_memories: [],
        open_threads: [],
        skill_usage: [],
        skill_path: '',
      }
      switch (action) {
        case 'brief': {
          const agent = exec.agent
          const asks: string[] = []
          const counts = new Map<string, number>()
          let sessionId = ''
          if (agent !== undefined) {
            sessionId = String(agent.session.id)
            for (const seq of agent.session.surface.nodes) {
              const event = agent.session.eventAt(seq)
              if (event === undefined) continue
              if (event.type === 'user/message' && asks.length < MAX_ASKS) {
                const text = event.data.content
                  .filter(block => block.type === 'text')
                  .map(block => block.text)
                  .join(' ')
                if (text.trim().length > 0) asks.push(flatten(text))
              } else if (event.type === 'tool/call') {
                const callName = event.data.name
                counts.set(callName, (counts.get(callName) ?? 0) + 1)
              }
            }
          }
          const toolCalls = [...counts.entries()]
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
            .slice(0, MAX_TOOL_KINDS)
            .map(([callName, count]) => ({ name: callName, count }))
          const query = asks.join(' ').trim()
          const related = query.length === 0
            ? []
            : await ctx.assistantMemory.recall({ query, limit: 8 })
          const threads = await ctx.assistantMemory.listThreads()
          const openThreads = threads.entries.filter(thread => thread.status === 'open').slice(0, 5)
          const learned = await scanLearnedSkills(ctx.assistantMemory.paths.skillsDir)
          const usage = await ctx.assistantMemory.skillUsage()
          const usageItems = skillUsageLines(
            usage.usage,
            learned.skills.flatMap(skill => skill.name !== undefined ? [skill.name] : []),
            new Date(),
            'most-used',
            MAX_SKILL_USAGE,
          ).map(line => ({
            name: line.name,
            count: line.count,
            ...(line.lastUsedAt !== undefined ? { last_used: line.lastUsedAt } : {}),
          }))
          return {
            ...empty,
            summary: asks.length === 0 && toolCalls.length === 0
              ? 'No session evidence available; reflect from what you can verify.'
              : 'Evidence for this reflection, plus what your home already relates to it:',
            session_id: sessionId,
            asks,
            tool_calls: toolCalls,
            related_memories: related.map(hit => `${hit.record.text} (${hit.record.id}; ${hit.why.join(', ')})`),
            open_threads: openThreads.map(thread => `${thread.question} (${thread.id})`),
            skill_usage: usageItems,
          }
        }
        case 'save_skill': {
          if (args.name === undefined || args.description === undefined || args.body === undefined) {
            throw new Error('assistant_reflect save_skill requires name, description, and body')
          }
          const written = await ctx.assistantMemory.writeSkill({
            name: args.name,
            description: args.description,
            ...(args.when_to_use !== undefined ? { whenToUse: args.when_to_use } : {}),
            body: args.body,
            ...(exec.agent !== undefined ? { source: String(exec.agent.session.id) } : {}),
          })
          return {
            ...empty,
            summary: `Wrote skill "${written.name}"; it is loadable now.`,
            skill_path: written.path,
          }
        }
        /* v8 ignore next 2 -- the enum in the parameter schema admits only the cases above */
        default:
          throw new Error(`unsupported action ${String(action)}`)
      }
    },
    presentCall: args => callCard(
      args.action === 'save_skill' ? `Learn skill ${args.name ?? ''}`.trim() : 'Reflect',
      args.name ?? args.action,
    ),
    presentResult: (_args, result) => resultCard(result.meta, 'Reflect'),
  }))
}
