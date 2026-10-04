/**
 * Real-composition regression (development-foundation remediation slice G, 2026-09-24).
 *
 * The known failure this guards: the first live preset turn (2026-09-23) crashed with
 * "Cannot read private member #digestCache from an object whose class did not declare it" —
 * a bug invisible to every suite that constructs the service by hand, because only the real
 * composition consumes `ctx.assistantMemory` through the cordis property proxy inside a
 * preset standing scope (notes/implemented/2026-09-23-service-shadow-private-fields.md).
 * tests/service-shadow-access.spec.ts covers the proxy in isolation; this suite covers the
 * combination: the real Loader, the vendor registries, the agent-presets roster with a
 * standing mount, and a real Agent joining it — then the production paths themselves
 * (system-prompt assembly, which is where the digest section made the live turn crash, and
 * the tool schemas the agent's scope sees).
 *
 * The preset rows mounted here are this package's own agent-plane faces, loaded from the
 * *built* lib/ exactly the way a deployment loads them — so the suite needs `pnpm build` to
 * have run and self-skips (loudly) on a fresh clone before the first build. The full shipped
 * preset also rows vendor plugins (persona, fs, shell, web…); those are their own packages'
 * tested surface, and pulling them in would drag host-plane services this harness does not
 * carry. What this composition proves is our slice of the combination.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import AgentRegistry, { assembleContextFor } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import AgentPresetRegistry from '@deepseek-ai/dsh-agent-preset-registry'
import AgentPreset from '@deepseek-ai/dsh-agent-preset'
import SessionPersistenceJsonl from '@deepseek-ai/dsh-session-persistence-jsonl'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import { DIGEST_SECTION_ORDER } from '../src/memory-digest/index.ts'
import { afterEach, describe, expect, it } from 'vitest'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const built = existsSync(join(packageRoot, 'lib', 'index.js'))
if (!built) {
  console.warn('[preset-composition] lib/ is not built yet — run `pnpm build`; the real-composition suite is skipped (fresh clones before the first build)')
}

/** This package's agent-plane rows, verbatim ids and names from cordis.patch.yml's preset row. */
const OWN_ROWS = [
  { id: 'assistant-home-preamble', name: 'dsh-smart-assistant/home-preamble' },
  { id: 'assistant-memory-digest', name: 'dsh-smart-assistant/memory-digest' },
  { id: 'assistant-memory-tool', name: 'dsh-smart-assistant/tool-memory' },
  { id: 'assistant-research-tool', name: 'dsh-smart-assistant/tool-research' },
  { id: 'assistant-knowledge-tool', name: 'dsh-smart-assistant/tool-knowledge' },
  { id: 'assistant-learn', name: 'dsh-smart-assistant/learn' },
  {
    id: 'assistant-ov-shield',
    name: 'dsh-smart-assistant/ov-shield',
    config: { denyToolPrefix: 'mcp__openviking__', denyServerResources: 'openviking', shadowSkills: ['openviking-memory', 'openviking-skills'] },
  },
]

const contexts: Context[] = []
const dirs: string[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Boot the real harness: loader, vendor registries, the preset definition row, host row. */
async function harness(): Promise<Context> {
  const ctx = new Context()
  contexts.push(ctx)
  // Package names in a preset resolve from the harness base (ctx.baseUrl) — with the same
  // node_modules walk a real install provides. Emulate the install shape `dsh plugin add`
  // produces: the package linked into a node_modules. Both the discovery health check
  // (an on-disk walk) and the mount's import resolve through this link.
  const installBase = mkdtempSync(join(tmpdir(), 'assistant-preset-install-'))
  dirs.push(installBase)
  mkdirSync(join(installBase, 'node_modules'), { recursive: true })
  symlinkSync(packageRoot, join(installBase, 'node_modules', 'dsh-smart-assistant'), 'dir')
  ctx.baseUrl = pathToFileURL(installBase).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  // The knowledge-approve companion row audits into the session log: persistence and the
  // Typert registry are its injects, exactly as the shipped host composition provides them.
  const persistenceHome = mkdtempSync(join(tmpdir(), 'assistant-preset-persist-'))
  dirs.push(persistenceHome)
  await ctx.plugin(SessionPersistenceJsonl, { root: persistenceHome, compression: 'none' })
  await ctx.plugin(TypertRegistry)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SystemPrompt, { personaPrefix: '' })
  await ctx.plugin(ToolRuntime)
  // The skill registry normally comes from the host composition; the tool-memory and learn
  // rows wait for it. Config points the user-side lookups away from any real home.
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(AgentRegistry)
  // agents.create requires the loop's creation transaction (the "agent factory").
  await ctx.plugin(AgentLoop, { agents: [] })
  // The host row first, exactly as `cordis.patch.yml` orders it: the preset's tool rows inject
  // `assistantMemory`, so composing the definition before its service leaves them "never started"
  // (the registry reports exactly that, which is how this ordering constraint was found).
  const host = await import(pathToFileURL(join(packageRoot, 'lib', 'index.js')).href)
  const home = mkdtempSync(join(tmpdir(), 'assistant-preset-home-'))
  dirs.push(home)
  await ctx.plugin(host.default, {
    dataDir: home,
    digestMaxBytes: 4096,
    recallLimit: 20,
    staleResearchDays: 30,
  })
  // The knowledge-approve companion row (approve-direct-call): direct-call lane for the
  // knowledge-room approve button, audited into the session log. Mounted from built lib/
  // exactly like the deployment loads it.
  const approveRemote = await import(pathToFileURL(join(packageRoot, 'lib', 'knowledge-approve-remote', 'index.js')).href)
  await ctx.plugin(approveRemote.default)
  // 0.1.7: preset = registry row (default) + definition row (plugins). No directory, no roots.
  await ctx.plugin(AgentPresetRegistry, { default: 'assistant' })
  await ctx.plugin(AgentPreset, { id: 'assistant', plugins: OWN_ROWS })
  return ctx
}

/** Create an agent that joins the preset — the one supported mount call site. */
async function agentOnPreset(ctx: Context, captured: Context[]) {
  return ctx.agents.create({
    sessionId: SessionId('session-composition-spec'),
    setup: async (agentCtx: Context) => {
      captured.push(agentCtx)
      await ctx.agentPresets.mount(agentCtx, 'assistant')
    },
  })
}

;(built ? describe : describe.skip)('real composition: loader + preset standing mount + joined agent', () => {
  it('mounts the knowledge-approve companion service alongside the host row (direct-call lane)', async () => {
    const ctx = await harness()
    const approve = ctx.get('knowledgeApproveRemote')
    expect(approve).toBeDefined()
  })

  it('renders the soul, manual, and digest sections through the joined preset (the live-turn crash path)', async () => {
    const ctx = await harness()
    const captured: Context[] = []
    const { agent } = await agentOnPreset(ctx, captured)

    // The exact production consumption that crashed in the first live turn: the mounted
    // digest section's plugin injects `assistantMemory` in the standing scope and its text
    // calls digestSnapshot() through the property proxy at assembly time. Assembling the
    // system prompt is what a real turn does before the first model request. The preamble
    // sections ride the same proxy path (soulSnapshot / manualSnapshot).
    const assembled = await ctx.systemPrompt.assemble(assembleContextFor(agent))
    const names = assembled.sections.map(section => section.name)
    expect(names).toContain('assistant:soul')
    expect(names).toContain('assistant:home-manual')
    expect(names).toContain('assistant:memory-digest')
    // The story order: who you are, how the home works, what is in it now.
    expect(names.indexOf('assistant:soul')).toBeLessThan(names.indexOf('assistant:home-manual'))
    expect(names.indexOf('assistant:home-manual')).toBeLessThan(names.indexOf('assistant:memory-digest'))
    // The digest rides in the tail band (>10000, after the environment facts, before the persona
    // suffix at 10200): its text changes on every memory write, so sitting ahead of the tool
    // sections would re-tokenize the shared prefix on every save (the KV-prefix discipline).
    expect(DIGEST_SECTION_ORDER).toBeGreaterThan(10_000)
    expect(DIGEST_SECTION_ORDER).toBeLessThan(10_200)
    const byName = new Map(assembled.sections.map(section => [section.name, section.text]))
    // A fresh home's seed equals the built-in default, so the identity section is the default
    // voice either way — the race between scaffold and first assembly is invisible by design.
    expect(byName.get('assistant:soul')).toContain('You are a long-lived assistant')
    expect(byName.get('assistant:home-manual')).toContain('# Your working folder — operating manual')
    expect(byName.get('assistant:memory-digest')).toContain('Live status of your working folder')

  })

  ;(built ? it : it.skip)('ov-shield denies fixture OpenViking tools and shadows the skill names through the joined preset', async () => {
    const ctx = await harness()
    // The co-installed OpenViking surface, as the host layer would present it: an MCP tool and a
    // second skill-provider entry, both at the global layer.
    ctx.tools.register({
      name: 'mcp__openviking__remember',
      description: 'fixture ov write tool',
      parameters: { type: 'object', properties: {} },
      output: { schema: { type: 'null' }, render: () => [] },
      async execute() { return null },
    } as never)
    ctx.skills.register({
      name: 'openviking-memory', description: 'OpenViking memory skill', provider: 'openviking',
      content: 'c', source: 'runtime',
    })
    const captured: Context[] = []
    await agentOnPreset(ctx, captured)
    const agentCtx = captured[0]
    if (agentCtx === undefined) throw new Error('agent context was not captured')
    const scopeKey = scopeOf(agentCtx)
    // The model-visible tool surface: the ov write tool is denied, the house tools are intact.
    const names = ctx.tools.schemas(scopeKey).map(tool => tool.name)
    expect(names).not.toContain('mcp__openviking__remember')
    expect(names).toContain('assistant_memory')
    expect(names).toContain('assistant_knowledge')
    // The skill catalog: the shadow wins the name, the model-facing filter drops it, and the
    // ghost entries stay in the invocation-neutral view (accounted residue, never model-visible).
    const listed = await ctx.skills.list({ scope: scopeKey })
    const shadow = listed.find(skill => skill.name === 'openviking-memory')
    expect(shadow?.invocation).toEqual({ modelInvocable: false, userInvocable: false })
    expect(listed.filter(skill => skill.invocation.modelInvocable).map(skill => skill.name))
      .not.toContain('openviking-memory')
  })

  it('registers this package\'s four tools on the joined agent, and only there', async () => {
    const ctx = await harness()
    const captured: Context[] = []
    const { agent } = await agentOnPreset(ctx, captured)

    const names = (target?: object): string[] => {
      const schemas = target === undefined ? ctx.tools.schemas() : ctx.tools.schemas(target)
      return schemas.map(schema => schema.name).sort()
    }
    expect(names(agent)).toEqual([
      'assistant_knowledge',
      'assistant_memory',
      'assistant_reflect',
      'assistant_research',
    ])
    // The standing mount is scoped: the root registry stays clean, so a second session
    // mounting another preset cannot collide with this one.
    expect(names()).toEqual([])
  })
})
