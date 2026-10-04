/**
 * Registry-lifecycle guard: every contribution our preset rows make through a registry
 * disappears when the mounting scope is disposed (the repo's shape of the upstream
 * "every registry gets an HMR-safety test" rule), and the registries themselves keep
 * working afterwards.
 *
 * The risk this pins is not the framework's effect machinery (the vendor owns that); it
 * is OUR side of the contract — that each apply() registers through the ctx it is handed,
 * so the contribution lands on the mounting fiber rather than leaking to a longer-lived
 * context. A scope-keyed registration is invisible to the global view (ScopedLayers
 * merges by scope chain), so every assertion reads through the probe scope's key — the
 * same reference object createScope received, since scope keys compare by identity.
 *
 * Evidence basis, established by probe and kept honest here:
 * - tools.register / systemPrompt.section ride Cordis effects owned by the mounting
 *   fiber; scope.dispose() retracts them (first verified live in this file's first run).
 * - systemPrompt.assemble() takes an optional context, so section presence is asserted
 *   against the real assembled list without standing up an agent.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import type { ScopeKey } from '@deepseek-ai/dsh-scope'
import { createScope } from '@deepseek-ai/dsh-scope'
import { afterEach, describe, expect, it } from 'vitest'
import * as ToolMemory from '../src/tool-memory/index.ts'
import * as ToolResearch from '../src/tool-research/index.ts'
import * as ToolKnowledge from '../src/tool-knowledge/index.ts'
import * as Learn from '../src/learn/index.ts'
import * as HomePreamble from '../src/home-preamble/index.ts'
import * as MemoryDigest from '../src/memory-digest/index.ts'
import AssistantMemory from '../src/index.ts'

const dirs: string[] = []
const contexts: Context[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/**
 * Real registries plus the real host service (the tool rows consume it through the
 * scoped context). The service's dataDir goes to a throwaway directory — a test must
 * never touch a real home.
 */
async function harness(): Promise<{ ctx: Context; probeKey: ScopeKey }> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SkillRegistry)
  const home = mkdtempSync(join(tmpdir(), 'assistant-lifecycle-home-'))
  dirs.push(home)
  await ctx.plugin(AssistantMemory, { dataDir: home })
  const probeKey: ScopeKey = { agent: 'lifecycle-probe' }
  return { ctx, probeKey }
}

interface ToolFace {
  plugin: Parameters<Context['plugin']>[0]
  tools: string[]
}

const toolFaces: ToolFace[] = [
  { plugin: ToolMemory, tools: ['assistant_memory'] },
  { plugin: ToolResearch, tools: ['assistant_research'] },
  { plugin: ToolKnowledge, tools: ['assistant_knowledge'] },
  { plugin: Learn, tools: ['assistant_reflect'] },
]

describe('tool contributions vanish when the mounting scope is disposed', () => {
  for (const face of toolFaces) {
    it(`${face.tools.join('/')} (${(face.plugin as { name?: string }).name ?? 'plugin'})`, async () => {
      const { ctx, probeKey } = await harness()
      const scope = createScope(ctx, probeKey)
      await scope.ctx.plugin(face.plugin)
      const mounted = ctx.tools.schemas(probeKey).map(schema => schema.name)
      for (const tool of face.tools) expect(mounted, 'contribution must be mounted in the probe scope').toContain(tool)
      await scope.dispose()
      const after = ctx.tools.schemas(probeKey).map(schema => schema.name)
      for (const tool of face.tools) expect(after, 'contribution must be retracted after disposal').not.toContain(tool)
    })
  }

  it('the registry itself survives disposal: a fresh scope can register again', async () => {
    const { ctx, probeKey } = await harness()
    const first = createScope(ctx, probeKey)
    await first.ctx.plugin(ToolResearch)
    await first.dispose()
    // The ov-shield "no stale ledger" shape: re-mounting after disposal works, which is
    // what HMR or a retry actually does.
    const second = createScope(ctx, probeKey)
    await second.ctx.plugin(ToolResearch)
    expect(ctx.tools.schemas(probeKey).map(schema => schema.name)).toContain('assistant_research')
    await second.dispose()
    expect(ctx.tools.schemas(probeKey).map(schema => schema.name)).not.toContain('assistant_research')
  })
})

describe('prompt sections vanish from the assembled prompt when the mounting scope is disposed', () => {
  it('home-preamble registers soul and home-manual sections and disposal removes both', async () => {
    const { ctx, probeKey } = await harness()
    const scope = createScope(ctx, probeKey)
    await scope.ctx.plugin(HomePreamble)
    const mounted = (await ctx.systemPrompt.assemble({ scope: probeKey })).sections.map(section => section.name)
    expect(mounted).toContain('assistant:soul')
    expect(mounted).toContain('assistant:home-manual')
    await scope.dispose()
    const after = (await ctx.systemPrompt.assemble({ scope: probeKey })).sections.map(section => section.name)
    expect(after).not.toContain('assistant:soul')
    expect(after).not.toContain('assistant:home-manual')
  })

  it('memory-digest registers the digest section and disposal removes it', async () => {
    const { ctx, probeKey } = await harness()
    const scope = createScope(ctx, probeKey)
    await scope.ctx.plugin(MemoryDigest)
    const mounted = (await ctx.systemPrompt.assemble({ scope: probeKey })).sections.map(section => section.name)
    expect(mounted).toContain('assistant:memory-digest')
    await scope.dispose()
    const after = (await ctx.systemPrompt.assemble({ scope: probeKey })).sections.map(section => section.name)
    expect(after).not.toContain('assistant:memory-digest')
  })
})
