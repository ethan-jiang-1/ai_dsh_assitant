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
import type {} from '@deepseek-ai/dsh-skill'
import * as skillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scanLearnedSkills } from '../../skills/scan.ts'
import { shadowedLearnedSkills } from '../../skills/shadow.ts'
import { skillLoadFromResult, skillUsageLines } from '../../skills/usage.ts'
import { callCard, presentationMeta, resultCard } from '../tool-support/presentation.ts'

export const name = 'assistant-learn'

export const inject = ['assistantMemory', 'skills', 'tools']

/** Provider name for the learned-skills root, distinct from the curated provider's default. */
export const LEARNED_PROVIDER_NAME = 'assistant-learned'

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
  '- save_skill: write a validated skill into your working folder\'s skills/ room, where it becomes loadable',
  '  immediately. Use it for a procedure you would otherwise re-derive, not for a one-off.',
  '- retire_skill: move a learned skill out of the skills room into skills/archive/ — it stops',
  '  loading immediately but stays recoverable. Use it when curate reports the skill is past its',
  '  use-by date, or when it is shadowed and not worth renaming.',
  '- save_page: distill a domain page into the knowledge room as a DRAFT. Drafts stay out of',
  '  search and the digest until the principal approves them — you cannot approve your own page.',
  '  Sources are required — cite where the knowledge came from (memory:<id>, research:<id>, a',
  '  URL, a repo path). Link pages with [[wikilinks]]. Pinning a page into memory is',
  '  `assistant_memory save` with source knowledge:<page-id>; that is the whole bridge.',
  '- promote_page: flip one draft page to stable. Use it only when the principal has approved',
  '  that page (in so many words, or from their desk panel) — the approval is theirs, this is just',
  '  the edit. Say which page you promoted so they can check the knowledge room.',
  '- deprecate_page: mark one page past its use-by date. The page stays in place so links resolve',
  '  but stops counting as current knowledge. Use it when the principal says a page is wrong or',
  '  obsolete, or when curate reports it stale and they agree — never on your own judgement.',
  '- propose_skill: propose a skill into the review inbox (skill-proposals/) — it does NOT enter',
  '  your skills until a person approves the proposal by editing its status and you run land_skill.',
  '  Proposing an existing name revises it (revision bumps, text replaces).',
  '- land_skill: write an approved proposal into the skills room. Only after a person flipped',
  '  the proposal\'s status to approved — that edit is the review.',
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
    shadowed_skills: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          provider: { type: 'string', required: true },
        },
      },
    },
    pending_proposals: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          status: { type: 'string', required: true },
          revision: { type: 'integer', required: true },
        },
      },
    },
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
    audit_findings: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          code: { type: 'string', required: true },
          severity: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      },
    },
    skill_path: { type: 'string', required: true },
    snapshot_path: { type: 'string', required: true },
    page_id: { type: 'string', required: true },
    page_path: { type: 'string', required: true },
    proposal_status: { type: 'string', required: true },
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
  shadowed_skills: { name: string, provider: string }[]
  pending_proposals: { name: string, status: string, revision: number }[]
  skill_usage: { name: string, count: number, last_used?: string }[]
  audit_findings: { code: string, severity: string, message: string }[]
  skill_path: string
  snapshot_path: string
  page_id: string
  page_path: string
  proposal_status: string
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
  if (value.shadowed_skills.length > 0) {
    lines.push(
      'Shadowed skills (will never load — rename and retire them before saving a skill with '
      + 'one of these names):',
      ...value.shadowed_skills.map(skill => `- ${skill.name} (shadowed by provider ${skill.provider})`),
    )
  }
  if (value.pending_proposals.length > 0) {
    lines.push(
      'Pending skill proposals (in the review inbox — propose revisions by name, never save_skill over them):',
      ...value.pending_proposals.map(proposal =>
        `- ${proposal.name} (r${String(proposal.revision)}, ${proposal.status})`),
    )
  }
  if (value.skill_usage.length > 0) {
    const parts = value.skill_usage.map(skill =>
      skill.count === 0 ? `${skill.name} never loaded` : `${skill.name}×${skill.count}`)
    lines.push(`Skill usage: ${parts.join(', ')}.`)
  }
  if (value.audit_findings.length > 0) {
    lines.push(
      'Audit findings on what was just written (fix them in this turn, or the skill stays broken):',
      ...value.audit_findings.map(finding => `- ${finding.severity}: ${finding.message}`),
    )
  }
  if (value.skill_path.length > 0) lines.push(`Written: ${value.skill_path}`)
  if (value.snapshot_path.length > 0) {
    lines.push(`Previous version snapshotted at ${value.snapshot_path} (recoverable by copying it back).`)
  }
  if (value.page_path.length > 0) {
    // The page fields are set by both page actions, so the wording has to follow the action —
    // otherwise a promotion renders the draft notice and contradicts its own summary (found by a
    // live probe: the model read the file back and reported the receipt as self-contradictory).
    if (value.action === 'promote_page') {
      lines.push(`Promoted ${value.page_id} to stable: ${value.page_path}`)
      lines.push('It now counts in search and the digest.')
    } else if (value.action === 'deprecate_page') {
      lines.push(`Deprecated ${value.page_id}: ${value.page_path}`)
      lines.push('It stays in place so inbound links keep resolving, and stops counting as current.')
    } else {
      lines.push(`Written draft page ${value.page_id}: ${value.page_path}`)
      lines.push('It stays out of search and the digest until the principal approves it — you cannot approve your own page.')
    }
  }
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
      action: { type: 'string', required: true, enum: ['brief', 'save_skill', 'retire_skill', 'save_page', 'promote_page', 'deprecate_page', 'propose_skill', 'land_skill'], description: 'brief | save_skill | retire_skill | save_page | promote_page | deprecate_page | propose_skill | land_skill' },
      name: { type: 'string', description: 'save_skill | retire_skill: kebab-case skill name; also its directory name.' },
      description: { type: 'string', description: 'save_skill: when to load it — the only text a future session sees first. save_page: one-line page summary.' },
      when_to_use: { type: 'string', description: 'save_skill: extra trigger guidance.' },
      body: { type: 'string', description: 'save_skill | save_page: the content, written for a session without your context. Pages may use [[wikilinks]].' },
      reason: { type: 'string', description: 'retire_skill: why it is retiring (optional; the usage ledger already holds the facts).' },
      type: { type: 'string', description: 'save_page: free-form kind — concept, entity, source, how-it-works.' },
      title: { type: 'string', description: 'save_page: human-readable name; [[links]] may resolve against it.' },
      sources: { type: 'array', items: { type: 'string' }, description: 'save_page: where the knowledge came from (memory:<id>, research:<id>, a URL, a repo path). Required.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'save_page: retrieval tags.' },
      stale_after: { type: 'string', description: 'save_page: absolute ISO-8601 time after which the page is due for review.' },
      page_id: { type: 'string', description: 'promote_page | deprecate_page: the knowledge page id to change.' },
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
        shadowed_skills: [],
        pending_proposals: [],
        skill_usage: [],
        audit_findings: [],
        skill_path: '',
        snapshot_path: '',
        page_id: '',
        page_path: '',
        proposal_status: '',
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
          // Shadow probe (slice 1b): ask the registry who owns each learned name. The registry
          // resolves names per layer chain, so this must run from the agent's context; a missing
          // agent or an incomplete catalog read reports no shadows rather than guessing.
          const allLearnedNames = learned.skills.flatMap(skill => skill.name !== undefined ? [skill.name] : [])
          const shadowedItems: { name: string, provider: string }[] = []
          if (agent !== undefined) {
            const snapshot = await ctx.skills.snapshot({
              cwd: agent.session.header.cwd,
              signal: exec.signal,
              scope: agent,
            })
            const winners = new Map(snapshot.skills.map(skill => [skill.name, skill.provider] as const))
            for (const [name, provider] of Object.entries(
              shadowedLearnedSkills(winners, snapshot.complete, allLearnedNames, LEARNED_PROVIDER_NAME),
            )) {
              shadowedItems.push({ name, provider })
            }
          }
          // A shadowed name's loads belong to the winning provider's body — usage lines cover
          // loadable learned skills only.
          const shadowedNames = new Set(shadowedItems.map(item => item.name))
          const usageItems = skillUsageLines(
            usage.usage,
            allLearnedNames.filter(name => !shadowedNames.has(name)),
            new Date(),
            'most-used',
            MAX_SKILL_USAGE,
          ).map(line => ({
            name: line.name,
            count: line.count,
            ...(line.lastUsedAt !== undefined ? { last_used: line.lastUsedAt } : {}),
          }))
          // The proposal inbox belongs in the evidence: what is waiting on a person.
          const inbox = await ctx.assistantMemory.listProposals()
          const pending = inbox.entries
            .filter(proposal => proposal.status === 'proposed' || proposal.status === 'approved')
            .map(proposal => ({ name: proposal.id, status: proposal.status, revision: proposal.revision }))
          return {
            ...empty,
            summary: asks.length === 0 && toolCalls.length === 0
              ? 'No session evidence available; reflect from what you can verify.'
              : 'Evidence for this reflection, plus what your working folder already relates to it:',
            session_id: sessionId,
            asks,
            tool_calls: toolCalls,
            related_memories: related.map(hit => `${hit.record.text} (${hit.record.id}; ${hit.why.join(', ')})`),
            open_threads: openThreads.map(thread => `${thread.question} (${thread.id})`),
            shadowed_skills: shadowedItems,
            pending_proposals: pending,
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
            summary: written.findings.length > 0
              ? `Wrote skill "${written.name}"; the post-write audit found ${written.findings.length} problem(s):`
              : `Wrote skill "${written.name}"; it is loadable now.`,
            skill_path: written.path,
            snapshot_path: written.snapshot ?? '',
            audit_findings: written.findings.map(finding => ({
              code: finding.code,
              severity: finding.severity,
              message: finding.message,
            })),
          }
        }
        case 'retire_skill': {
          if (args.name === undefined || args.name.trim().length === 0) {
            throw new Error('assistant_reflect retire_skill requires name')
          }
          const retired = await ctx.assistantMemory.retireSkill(
            args.name,
            args.reason !== undefined ? args.reason : undefined,
          )
          return {
            ...empty,
            summary: `Retired skill "${retired.name}" to skills/archive/; it no longer loads and nothing was deleted — move the bundle back to restore it.`,
            skill_path: retired.path,
          }
        }
        case 'promote_page': {
          if (args.page_id === undefined) throw new Error('assistant_reflect promote_page requires page_id')
          const promoted = await ctx.assistantMemory.promotePage(args.page_id)
          return {
            ...empty,
            summary: `Promoted "${promoted.id}" to stable (${promoted.path}). It now counts in search and the digest.`,
            page_id: promoted.id,
            page_path: promoted.path,
          }
        }
        case 'deprecate_page': {
          if (args.page_id === undefined) throw new Error('assistant_reflect deprecate_page requires page_id')
          const deprecated = await ctx.assistantMemory.deprecatePage(args.page_id)
          return {
            ...empty,
            summary: `Deprecated "${deprecated.id}" (${deprecated.path}). The page stays in place so links resolve; it stops counting as current knowledge.`,
            page_id: deprecated.id,
            page_path: deprecated.path,
          }
        }
        case 'save_page': {
          if (args.type === undefined || args.body === undefined
            || args.sources === undefined || args.sources.length === 0) {
            throw new Error('assistant_reflect save_page requires type, body, and sources')
          }
          const written = await ctx.assistantMemory.writePage({
            type: args.type,
            ...(args.title !== undefined ? { title: args.title } : {}),
            ...(args.description !== undefined ? { description: args.description } : {}),
            body: args.body,
            sources: args.sources,
            ...(args.tags !== undefined ? { tags: args.tags } : {}),
            ...(args.stale_after !== undefined ? { staleAfter: args.stale_after } : {}),
          })
          return {
            ...empty,
            summary: written.findings.length > 0
              ? `Wrote draft page "${written.id}"; the audit found ${written.findings.length} problem(s):`
              : `Wrote draft page "${written.id}" — staged, awaiting review.`,
            page_id: written.id,
            page_path: written.path,
            audit_findings: written.findings.map(finding => ({
              code: finding.code,
              severity: finding.severity,
              message: finding.message,
            })),
          }
        }
        case 'propose_skill': {
          if (args.name === undefined || args.description === undefined || args.body === undefined) {
            throw new Error('assistant_reflect propose_skill requires name, description, and body')
          }
          const proposal = await ctx.assistantMemory.proposeSkill({
            name: args.name,
            description: args.description,
            ...(args.when_to_use !== undefined ? { whenToUse: args.when_to_use } : {}),
            body: args.body,
            ...(exec.agent !== undefined ? { source: String(exec.agent.session.id) } : {}),
          })
          return {
            ...empty,
            summary: `Proposed skill "${proposal.id}" (revision ${String(proposal.revision)}) into the review inbox — `
              + 'it does not load until a person approves the proposal and it is landed.',
            proposal_status: `proposed r${String(proposal.revision)}`,
          }
        }
        case 'land_skill': {
          if (args.name === undefined || args.name.trim().length === 0) {
            throw new Error('assistant_reflect land_skill requires name')
          }
          const landed = await ctx.assistantMemory.landSkill(args.name)
          return {
            ...empty,
            summary: `Landed approved proposal "${landed.name}" into the skills room; it is loadable now.`,
            skill_path: landed.path,
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
