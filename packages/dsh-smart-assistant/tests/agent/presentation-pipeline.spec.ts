/**
 * Presenter pipeline contract for the shared presentation seam in
 * `src/agent/tool-support/presentation.ts`: project → persist → narrow read-back.
 *
 * A completed card cannot read a tool's canonical return value — the durable `ToolResult`
 * carries only the model-facing content, the error flag, and the `meta` payload its
 * `output.presentationMeta` projector produced. The four wired tools (tool-memory,
 * tool-knowledge, tool-research, learn) project a one-line `summary` into that payload and
 * their `presentResult` narrows it back out. Before this spec the seam had zero assertions:
 * a narrowing regression would silently drop summaries.
 *
 * The seam runs on the real ToolRuntime over a real host service on a throwaway home
 * (fixture posture copied from `tool-adapters.spec.ts`). Assertions read back rendered text
 * and card titles — what the model and a replaying presenter would see — not internals.
 * `summaryFrom` is additionally exercised directly: it is the seam's own public read-back
 * rule, and the malformed shapes it rejects cannot be produced by a successful real call.
 *
 * Acceptance points:
 * - a real `assistant_memory save` persists exactly the `{ summary }` projection and the
 *   completed card reads the same one-liner back, record id included;
 * - every wired tool (memory, research, knowledge, reflect) persists a one-line summary its
 *   completed card reads back verbatim;
 * - the completed card rebuilds its title from the durable triple alone (content + isError +
 *   meta — the replay shape) and the narrowed summary keeps the locating id;
 * - a failed call persists no payload; the card degrades to the fallback title, never empty;
 * - `summaryFrom` narrows exactly: a valid summary passes through unchanged, every malformed
 *   shape (null, non-object, array, wrong-typed or empty summary) reads as absent;
 * - a failing projector is an explicit tool error and a schema-valid empty summary degrades
 *   readably at read-back — the pipeline never loses a summary silently.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import ToolRuntime, { defineTool, type ToolExecutionResult, type ToolResult, type ToolResultView } from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import * as ToolMemory from '../../src/agent/tool-memory/index.ts'
import * as ToolResearch from '../../src/agent/tool-research/index.ts'
import * as ToolKnowledge from '../../src/agent/tool-knowledge/index.ts'
import * as Learn from '../../src/agent/learn/index.ts'
import { presentationMeta, resultCard, summaryFrom } from '../../src/agent/tool-support/presentation.ts'

const contexts: Context[] = []
const dirs: string[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/**
 * Boot the runtime stack plus every agent tool wired through the presentation seam on one
 * throwaway home, so each wiring is exercised against the same real services.
 */
async function boot(): Promise<{ ctx: Context, service: AssistantMemory }> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SkillRegistry)
  const dataDir = mkdtempSync(join(tmpdir(), 'assistant-presentation-'))
  dirs.push(dataDir)
  await ctx.plugin(AssistantMemory, { dataDir })
  await ctx.plugin(ToolMemory)
  await ctx.plugin(ToolResearch)
  await ctx.plugin(ToolKnowledge)
  await ctx.plugin(Learn)
  return { ctx, service: ctx.assistantMemory }
}

const testSignal = new AbortController().signal
const agent = { session: { id: 'spec-session', header: { cwd: process.cwd() } } }

let callSeq = 0

/** Execute one tool call through the real runtime, keeping the full result (content + meta). */
async function executeTool(ctx: Context, name: string, args: unknown): Promise<ToolExecutionResult> {
  return await ctx.tools.execute({
    signal: testSignal,
    callId: ToolCallId(`presentation-${String(callSeq++)}-${name}`),
    name,
    arguments: args,
    agent: agent as never,
  })
}

/** First text block of a result; every wired tool renders text. */
function textOf(result: ToolExecutionResult): string {
  const first = result.content[0]
  if (first?.type !== 'text') throw new Error(`rendered no text: ${JSON.stringify(result.content)}`)
  return first.text
}

/**
 * Narrow an execution result to the durable triple a replaying presenter receives: the
 * canonical value never rides the session log, only content + isError + meta.
 */
function durable(result: ToolExecutionResult): ToolResult {
  return {
    content: result.content,
    isError: result.isError,
    ...result.meta !== undefined ? { meta: result.meta } : {},
  }
}

/**
 * The result a replaying presenter would reconstruct for a logged call carrying `meta`:
 * the durable triple, nothing else.
 */
function replayed(meta: ToolResult['meta']): ToolResult {
  return { content: [], isError: false, ...meta !== undefined ? { meta } : {} }
}

/**
 * Render the completed card the way a presenter does: the definition from the registry (as
 * the executing agent sees it) and the replay-shaped result.
 */
function completedCard(ctx: Context, name: string, args: unknown, result: ToolResult): ToolResultView | undefined {
  const tool = ctx.tools.get(name, agent as never)
  if (tool?.presentResult === undefined) throw new Error(`tool ${name} registered no presenter`)
  return tool.presentResult(args, result)
}

/** The title of a generic card; fails loudly on any other view shape. */
function titleOf(view: ToolResultView | undefined): string {
  if (view?.card !== 'generic' || typeof view.title !== 'string') {
    throw new Error(`expected a generic card with a title, got ${JSON.stringify(view)}`)
  }
  return view.title
}

describe('presenter pipeline: project → persist → read back', () => {
  it('persists the projected summary of a real save and the completed card reads it back', async () => {
    const { ctx } = await boot()
    const args = { action: 'save', text: '客户把付款推迟到 10/20。' }
    const result = await executeTool(ctx, 'assistant_memory', args)
    expect(result.isError).toBe(false)
    // The model-facing content leads with the one-liner the projector was handed.
    const summaryLine = textOf(result).split('\n')[0] ?? ''
    expect(summaryLine).toMatch(/^Saved fact \S+\.$/)
    // The persisted payload is exactly the projection: one `summary` field, nothing else.
    expect(result.meta).toEqual({ summary: summaryLine })
    // The completed card reads the same line back as its title.
    const card = completedCard(ctx, 'assistant_memory', args, durable(result))
    expect(card).toEqual({ card: 'generic', title: summaryLine })
    // The locating id — what a person needs to find the record — survives the round trip.
    const recordId = summaryLine.match(/^Saved fact (\S+)\.$/)?.[1] ?? ''
    expect(recordId.length).toBeGreaterThan(0)
    expect(titleOf(card)).toContain(recordId)
  })

  it('every wired tool persists a one-line summary its completed card reads back verbatim', async () => {
    const { ctx, service } = await boot()
    await service.writePage({
      id: 'presentation-page',
      type: 'concept',
      title: '管道页',
      body: '这是知识页正文。',
      sources: ['memory:spec'],
    })
    const wired = [
      {
        tool: 'assistant_memory',
        args: { action: 'save', text: '客户把付款推迟到 10/20。' },
        summary: /^Saved fact \S+\.$/,
      },
      {
        tool: 'assistant_research',
        args: { action: 'open', question: '续约谈判是否值得重开？', why: '下季度预算需要依据。' },
        summary: /^Opened thread \S+\.$/,
      },
      {
        tool: 'assistant_knowledge',
        args: { action: 'get', id: 'presentation-page' },
        summary: /^Page "presentation-page" \([^)]*\)/,
      },
      {
        tool: 'assistant_reflect',
        args: {
          action: 'save_skill',
          name: 'presentation-skill',
          description: 'A skill written by the presentation spec.',
          body: '# Presentation skill\n\nDo the thing.\n',
        },
        summary: /^Wrote skill "presentation-skill"/,
      },
    ]
    for (const tool of wired) {
      const result = await executeTool(ctx, tool.tool, tool.args)
      expect(result.isError, `${tool.tool} should succeed`).toBe(false)
      const summary = summaryFrom(result.meta)
      expect(summary, `${tool.tool} should persist a one-line summary`).toMatch(tool.summary)
      expect(titleOf(completedCard(ctx, tool.tool, tool.args, durable(result))), `${tool.tool} card reads the summary back`).toBe(summary)
    }
  })

  it('the completed card rebuilds its title from the persisted payload alone, locating id kept', async () => {
    const { ctx } = await boot()
    const args = { action: 'open', question: '续约谈判是否值得重开？', why: '下季度预算需要依据。' }
    const result = await executeTool(ctx, 'assistant_research', args)
    expect(result.isError).toBe(false)
    const summary = summaryFrom(result.meta)
    expect(summary).toMatch(/^Opened thread \S+\.$/)
    const threadId = summary?.match(/^Opened thread (\S+)\.$/)?.[1] ?? ''
    expect(threadId.length).toBeGreaterThan(0)
    // The pending card derives from the call args…
    const pending = ctx.tools.get('assistant_research', agent as never)?.presentCall?.(args)
    expect(pending).toEqual({ card: 'generic', title: 'Research open', kind: 'other', rawInput: '续约谈判是否值得重开？' })
    // …while the completed card gets only the durable triple — no canonical value, no args —
    // and still names the thread, which is the one token a person needs to find it again.
    const card = completedCard(ctx, 'assistant_research', args, durable(result))
    expect(titleOf(card)).toBe(summary)
    expect(titleOf(card)).toContain(threadId)
  })
})

describe('presenter pipeline: explicit degradation, never a silent loss', () => {
  it('a failed call persists no payload and the card keeps the readable fallback title', async () => {
    const { ctx } = await boot()
    // Missing text is refused at the adapter boundary; the runtime normalizes the throw.
    const args = { action: 'save' }
    const result = await executeTool(ctx, 'assistant_memory', args)
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('Error: assistant_memory save requires text')
    expect(result.meta).toBeUndefined()
    const card = completedCard(ctx, 'assistant_memory', args, durable(result))
    expect(titleOf(card)).toBe('Memory')
    expect(titleOf(card).length).toBeGreaterThan(0)
  })

  it('summaryFrom passes a valid summary through unchanged and reads every malformed shape as absent', () => {
    const summary = 'Opened thread 20261021-renewal-talk-k3f9. It keeps its id.'
    // No truncation or reformatting: the read-back is the persisted string, id included.
    expect(summaryFrom({ summary })).toBe(summary)
    expect(summaryFrom({ summary, extra: 'ignored' })).toBe(summary)
    const malformed: unknown[] = [
      undefined, // no projector ran / payload absent
      null,
      'Saved fact 20261021-note-ab12.',
      42,
      [],
      [{ summary: 'x' }],
      {},
      { summary: 42 },
      { summary: null },
      { summary: '' },
    ]
    for (const meta of malformed) expect(summaryFrom(meta), `shape ${JSON.stringify(meta)}`).toBeUndefined()
  })

  it('malformed replayed payloads render the readable fallback card, never an empty title', async () => {
    const { ctx } = await boot()
    const args = { action: 'list' }
    // Absent payload (the projector never ran for this logged call).
    expect(titleOf(completedCard(ctx, 'assistant_memory', args, { content: [], isError: false }))).toBe('Memory')
    // Arbitrary persisted JSON the narrowing must refuse rather than misread.
    const malformed: ToolResult['meta'][] = [
      null,
      'Saved fact 20261021-note-ab12.',
      42,
      [],
      [{ summary: 'x' }],
      {},
      { summary: 42 },
      { summary: null },
      { summary: '' },
    ]
    for (const meta of malformed) {
      const card = completedCard(ctx, 'assistant_memory', args, replayed(meta))
      expect(titleOf(card), `payload ${JSON.stringify(meta)} should degrade to the fallback title`).toBe('Memory')
      expect(titleOf(card).length).toBeGreaterThan(0)
    }
  })

  it('a failing projector is an explicit tool error; an empty summary degrades readably', async () => {
    const { ctx } = await boot()
    // Two probes wired exactly like the four product tools: our projection, our read-back.
    ctx.tools.register(defineTool({
      name: 'presentation_probe_broken',
      description: 'Spec probe: the projector itself fails.',
      parameters: { text: { type: 'string', required: true } },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { summary: { type: 'string', required: true } } },
        render: (_args, value) => [{ type: 'text', text: value.summary }],
        presentationMeta: () => {
          throw new Error('projection exploded')
        },
      },
      async execute() {
        return { summary: 'probe ok' }
      },
    }))
    const failed = await executeTool(ctx, 'presentation_probe_broken', { text: 'x' })
    expect(failed.isError).toBe(true)
    expect(textOf(failed)).toContain('output.presentationMeta failed')
    expect(textOf(failed)).toContain('projection exploded')

    ctx.tools.register(defineTool({
      name: 'presentation_probe_empty',
      description: 'Spec probe: a schema-valid empty summary.',
      parameters: { text: { type: 'string', required: true } },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { summary: { type: 'string', required: true } } },
        render: (_args, value) => [{ type: 'text', text: value.summary.length > 0 ? value.summary : '(empty)' }],
        presentationMeta: (_args, value) => presentationMeta(value.summary),
      },
      async execute() {
        return { summary: '' }
      },
      presentResult: (_args, result) => resultCard(result.meta, 'Probe'),
    }))
    const emptied = await executeTool(ctx, 'presentation_probe_empty', { text: 'x' })
    expect(emptied.isError).toBe(false)
    // The empty summary is persisted as projected, not silently dropped…
    expect(emptied.meta).toEqual({ summary: '' })
    // …and the completed card degrades to the readable fallback title, not an empty one.
    expect(titleOf(completedCard(ctx, 'presentation_probe_empty', { text: 'x' }, durable(emptied)))).toBe('Probe')
  })
})
