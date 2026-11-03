/**
 * Tool-adapter contracts for the four model-facing tools that had registration coverage
 * but no execution coverage: `assistant_memory`, `assistant_research`, `assistant_knowledge`,
 * and `assistant_reflect`.
 *
 * The seam is the real tool runtime over a real host service on a throwaway home; assertions
 * read the rendered text the model would receive. This is deliberately not a service test —
 * the service contract lives in `tests/host/`; here the question is whether the adapter maps
 * arguments, calls the right service method, and renders the result without the model in the loop.
 *
 * Acceptance points:
 * - memory save/recall/forget/curate execute and render the service result;
 * - research open/update/list execute; a blank drop reason is refused at the tool boundary;
 * - knowledge search/get read a page written through the host service; a missing id is an error;
 * - reflect save_page writes a draft and save_skill writes a skill, both through the tool;
 * - reflect promote/deprecate/retire/propose/land and the no-agent brief branch map to the
 *   service and report refusal in model-facing text.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import * as ToolMemory from '../../src/agent/tool-memory/index.ts'
import * as ToolResearch from '../../src/agent/tool-research/index.ts'
import * as ToolKnowledge from '../../src/agent/tool-knowledge/index.ts'
import * as Learn from '../../src/agent/learn/index.ts'

const contexts: Context[] = []
const dirs: string[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function boot(plugin: Parameters<Context['plugin']>[0]): Promise<{ ctx: Context, service: AssistantMemory }> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SkillRegistry)
  const dataDir = mkdtempSync(join(tmpdir(), 'assistant-tool-adapters-'))
  dirs.push(dataDir)
  await ctx.plugin(AssistantMemory, { dataDir })
  await ctx.plugin(plugin)
  return { ctx, service: ctx.assistantMemory }
}

const testSignal = new AbortController().signal
const agent = { session: { id: 'spec-session', header: { cwd: process.cwd() } } }

async function run(ctx: Context, name: string, args: unknown): Promise<string> {
  const result = await ctx.tools.execute({
    signal: testSignal,
    callId: ToolCallId(`adapter-${name}`),
    name,
    arguments: args,
    agent: agent as never,
  })
  const first = result.content[0]
  if (first?.type !== 'text') throw new Error(`tool ${name} rendered no text: ${JSON.stringify(result.content)}`)
  return first.text
}

describe('assistant_memory execute', () => {
  it('saves, recalls, forgets, and curates through the adapter', async () => {
    const { ctx } = await boot(ToolMemory)
    const saved = await run(ctx, 'assistant_memory', { action: 'save', text: '客户把付款推迟到 10/20。' })
    expect(saved).toContain('Saved fact')
    const recalled = await run(ctx, 'assistant_memory', { action: 'recall', query: '付款' })
    expect(recalled).toContain('客户把付款推迟到 10/20。')
    const listed = await run(ctx, 'assistant_memory', { action: 'list' })
    expect(listed).toContain('客户把付款推迟到 10/20。')
    const curated = await run(ctx, 'assistant_memory', { action: 'curate' })
    expect(curated.length).toBeGreaterThan(0)
  })

  it('refuses save without text at the adapter boundary', async () => {
    const { ctx } = await boot(ToolMemory)
    // The tool runtime normalizes a thrown adapter error into the model-facing result.
    expect(await run(ctx, 'assistant_memory', { action: 'save' })).toContain('Error: assistant_memory save requires text')
  })
})

describe('assistant_research execute', () => {
  it('opens, updates, and lists a thread', async () => {
    const { ctx } = await boot(ToolResearch)
    const opened = await run(ctx, 'assistant_research', {
      action: 'open',
      question: '续费合同是否值得重谈？',
      why: '下季度成本会压到毛利。',
      lean: '先拿用量再谈。',
    })
    expect(opened).toContain('Opened thread')
    const updated = await run(ctx, 'assistant_research', {
      action: 'update',
      id: opened.match(/thread ([A-Za-z0-9-]+)/)?.[1],
      lean: '用量已经拿到，下一步谈阶梯价。',
    })
    expect(updated).toContain('Updated thread')
    const listed = await run(ctx, 'assistant_research', { action: 'list' })
    expect(listed).toContain('续费合同是否值得重谈？')
  })

  it('parks a thread out of the digest and promotes it into a named answer', async () => {
    const { ctx } = await boot(ToolResearch)
    const opened = await run(ctx, 'assistant_research', {
      action: 'open',
      question: '渠道返利要不要改成年结？',
      why: '季度结占用现金流。',
    })
    const id = opened.match(/thread ([A-Za-z0-9-]+)/)?.[1]
    expect(id).toBeTruthy()

    const parked = await run(ctx, 'assistant_research', { action: 'park', id })
    expect(parked).toContain('Parked')
    expect(parked).toContain('leaves the digest')

    // Promotion without the answer pointer is refused: "promoted" alone loses the destination.
    expect(await run(ctx, 'assistant_research', { action: 'promote', id }))
      .toContain('Error: assistant_research promote requires promoted_to')

    // Promotion must name a real destination: the service resolves the pointer, so seed one.
    const record = await ctx.assistantMemory.saveMemory({ text: '返利按年结，季度不再预提', kind: 'fact' })
    const promoted = await run(ctx, 'assistant_research', {
      action: 'promote', id, promoted_to: record.id,
    })
    expect(promoted).toContain('Promoted')
    expect(promoted).toContain(record.id)
  })

  it('refuses a drop without a reason', async () => {
    const { ctx } = await boot(ToolResearch)
    const opened = await run(ctx, 'assistant_research', {
      action: 'open',
      question: '临时问题',
      why: '测试',
    })
    const id = opened.match(/thread ([A-Za-z0-9-]+)/)?.[1]
    expect(await run(ctx, 'assistant_research', { action: 'drop', id })).toContain('Error: assistant_research drop requires a reason')
  })
})

describe('assistant_knowledge execute', () => {
  it('gets a page written through the host service, and refuses a missing id', async () => {
    const { ctx, service } = await boot(ToolKnowledge)
    const written = await service.writePage({
      id: 'adapter-page',
      type: 'concept',
      title: '适配器页',
      body: '这是知识页正文。',
      sources: ['memory:spec'],
    })
    const got = await run(ctx, 'assistant_knowledge', { action: 'get', id: written.id })
    expect(got).toContain('适配器页')
    expect(got).toContain('这是知识页正文。')
    expect(await run(ctx, 'assistant_knowledge', { action: 'get', id: 'missing-page' })).toContain('Error: no knowledge page')
  })
})

async function runWithAgent(ctx: Context, name: string, args: unknown, agentLike: unknown): Promise<string> {
  const result = await ctx.tools.execute({
    signal: testSignal,
    callId: ToolCallId(`adapter-${name}`),
    name,
    arguments: args,
    agent: agentLike as never,
  })
  const first = result.content[0]
  if (first?.type !== 'text') throw new Error(`tool ${name} rendered no text: ${JSON.stringify(result.content)}`)
  return first.text
}

async function runWithoutAgent(ctx: Context, name: string, args: unknown): Promise<string> {
  const result = await ctx.tools.execute({
    signal: testSignal,
    callId: ToolCallId(`adapter-${name}`),
    name,
    arguments: args,
  })
  const first = result.content[0]
  if (first?.type !== 'text') throw new Error(`tool ${name} rendered no text: ${JSON.stringify(result.content)}`)
  return first.text
}

describe('assistant_reflect execute', () => {
  it('writes a draft page and a learned skill through the adapter', async () => {
    const { ctx } = await boot(Learn)
    const page = await run(ctx, 'assistant_reflect', {
      action: 'save_page',
      type: 'concept',
      title: '适配器草稿',
      body: '正文',
      sources: ['memory:spec'],
    })
    expect(page).toContain('Written draft page')
    const skill = await run(ctx, 'assistant_reflect', {
      action: 'save_skill',
      name: 'adapter-skill',
      description: 'A skill written by the adapter spec.',
      body: '# Adapter skill\n\nDo the thing.\n',
    })
    expect(skill).toContain('adapter-skill')
  })

  it('promotes and deprecates a draft page through the adapter', async () => {
    const { ctx } = await boot(Learn)
    const page = await run(ctx, 'assistant_reflect', {
      action: 'save_page',
      type: 'concept',
      title: '治理页',
      body: '正文',
      sources: ['memory:spec'],
    })
    const pageId = page.match(/Wrote draft page "([^"]+)"/)?.[1]
    expect(pageId).toBeDefined()
    const promoted = await run(ctx, 'assistant_reflect', { action: 'promote_page', page_id: pageId })
    expect(promoted).toContain('Promoted')
    const deprecated = await run(ctx, 'assistant_reflect', { action: 'deprecate_page', page_id: pageId })
    expect(deprecated).toContain('Deprecated')
  })

  it('retires a learned skill and reports an unknown name as an error', async () => {
    const { ctx } = await boot(Learn)
    await run(ctx, 'assistant_reflect', {
      action: 'save_skill',
      name: 'retire-me',
      description: 'A skill that will be retired.',
      body: '# Retire me\n',
    })
    const retired = await run(ctx, 'assistant_reflect', { action: 'retire_skill', name: 'retire-me', reason: 'spec' })
    expect(retired).toContain('Retired skill')
    expect(await run(ctx, 'assistant_reflect', { action: 'retire_skill', name: 'missing-skill' }))
      .toMatch(/Error:/)
  })

  it('proposes a skill and refuses to land it before approval', async () => {
    const { ctx } = await boot(Learn)
    const proposed = await run(ctx, 'assistant_reflect', {
      action: 'propose_skill',
      name: 'adapter-proposal',
      description: 'A proposal that needs a human approval.',
      body: '# Proposal\n',
    })
    expect(proposed).toContain('Proposed skill')
    expect(await run(ctx, 'assistant_reflect', { action: 'land_skill', name: 'adapter-proposal' }))
      .toContain('not approved')
  })

  it('refuses save_page without sources at the adapter boundary', async () => {
    const { ctx } = await boot(Learn)
    expect(await run(ctx, 'assistant_reflect', { action: 'save_page', type: 'concept', body: '正文' }))
      .toContain('Error: assistant_reflect save_page requires type, body, and sources')
  })

  it('briefs from a real session surface and counts the user asks and tool calls', async () => {
    const { ctx } = await boot(Learn)
    const events = new Map<number, unknown>([
      [1, { type: 'user/message', data: { content: [{ type: 'text', text: '客户回款怎么盯？' }] } }],
      [2, { type: 'tool/call', data: { name: 'assistant_memory' } }],
      [3, { type: 'tool/call', data: { name: 'assistant_memory' } }],
    ])
    const sessionAgent = {
      session: {
        id: 'brief-session',
        header: { cwd: process.cwd() },
        surface: { nodes: [1, 2, 3] },
        eventAt: (seq: number) => events.get(seq),
      },
    }
    const brief = await runWithAgent(ctx, 'assistant_reflect', { action: 'brief' }, sessionAgent)
    expect(brief).toContain('Evidence for this reflection')
    expect(brief).toContain('客户回款怎么盯？')
    expect(brief).toContain('assistant_memory')
  })

  it('reports no session evidence for brief when the caller has no agent', async () => {
    const { ctx } = await boot(Learn)
    const brief = await runWithoutAgent(ctx, 'assistant_reflect', { action: 'brief' })
    expect(brief).toContain('No session evidence available')
  })
})
