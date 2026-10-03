/**
 * Service-level contract for the ov-shield row, on real cordis services (ToolRuntime + SkillRegistry).
 *
 * The failure classes this pins (adversarial design review 2026-10-04): a hardcoded restrict list
 * would fail the whole mount when OpenViking is absent (unknown names are all-or-nothing); a
 * visibility-only delta would re-restrict on every resync event (denied names vanish from
 * `schemas()`, so the ledger is the only memory); an omitted invocation policy publishes fake
 * skills as model-invocable (the registry default is invocable — fail-deadly); a module-level
 * ledger would silently fail open across remounts. The harness mirrors the production layering:
 * the "OpenViking" registrations sit at the global layer, the shield mounts on a child scope (the
 * preset standing scope's role), and assertions read that scope's view through the parent's
 * service references (a raw scope ctx has no inject grant — loader semantics).
 */
import { Context } from '@deepseek-ai/cordis'
import { createScope } from '@deepseek-ai/dsh-scope'
import type { ScopeKey } from '@deepseek-ai/dsh-scope'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { afterEach, describe, expect, it } from 'vitest'
import * as OvShield from '../src/ov-shield/index.ts'
import { denyDelta, SHADOW_DESCRIPTION_PREFIX } from '../src/ov-shield/index.ts'
import { ToolCallId } from '@deepseek-ai/dsh-llm'

const testSignal = new AbortController().signal

const contexts: Context[] = []
const disposers: Array<() => Promise<void> | void> = []

afterEach(async () => {
  for (const dispose of disposers.splice(0).reverse()) await dispose()
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

function fakeTool(name: string): ToolDefinition {
  return {
    name,
    description: `fixture ${name}`,
    parameters: { type: 'object', properties: {} },
    output: { schema: { type: 'null' }, render: () => [] },
    async execute() { return null },
  } as unknown as ToolDefinition
}

const SHIELD_CONFIG: OvShield.OvShieldConfig = { denyToolPrefix: 'mcp__openviking__', denyServerResources: 'openviking', shadowSkills: ['openviking-memory', 'openviking-skills'] }

/** Scope keys are objects in production (agent identities) — the registries WeakMap them. */
const agentKey = (): ScopeKey => ({ agent: 'test-agent' })

/** Global layer with the OpenViking-shaped fixture surface plus one house tool that must survive. */
async function harness(): Promise<Context> {
  const parent = new Context()
  contexts.push(parent)
  await parent.plugin(SystemPrompt)
  await parent.plugin(ToolRuntime)
  await parent.plugin(SkillRegistry)
  parent.tools.register(fakeTool('mcp__openviking__remember'))
  parent.tools.register(fakeTool('mcp__openviking__search'))
  parent.tools.register(fakeTool('assistant_memory'))
  parent.tools.register(fakeTool('read_mcp_resource'))
  parent.skills.register({ name: 'openviking-memory', description: 'OpenViking memory skill', provider: 'openviking', content: 'c', source: 'runtime' })
  parent.skills.register({ name: 'management-breakdown', description: 'curated house skill', provider: 'curated', content: 'c', source: 'runtime' })
  return parent
}

async function mountShield(parent: Context, key: ScopeKey): Promise<void> {
  const scope = createScope(parent, key)
  disposers.push(() => scope.dispose())
  await scope.ctx.plugin(OvShield, { ...SHIELD_CONFIG })
}

const visibleNames = (parent: Context, key: ScopeKey): string[] => parent.tools.schemas(key).map(tool => tool.name)

describe('denyDelta', () => {
  it('selects prefix matches not yet ledgered, in visible order', () => {
    expect(denyDelta(['mcp__openviking__remember', 'assistant_memory', 'mcp__openviking__search'], 'mcp__openviking__', new Set(['mcp__openviking__remember'])))
      .toEqual(['mcp__openviking__search'])
    expect(denyDelta(['assistant_memory'], 'mcp__openviking__', new Set())).toEqual([])
  })
})

describe('ov-shield enforcement', () => {
  it('denies the whole prefix at mount while house tools and foreign tools stay visible', async () => {
    const parent = await harness()
    const key = agentKey()
    parent.tools.register(fakeTool('mcp__other__read'))
    await mountShield(parent, key)
    const names = visibleNames(parent, key)
    expect(names).not.toContain('mcp__openviking__remember')
    expect(names).not.toContain('mcp__openviking__search')
    expect(names).toContain('assistant_memory')
    expect(names).toContain('mcp__other__read')
  })

  it('catches late registrations through tools/change within one pass', async () => {
    const parent = await harness()
    const key = agentKey()
    await mountShield(parent, key)
    parent.tools.register(fakeTool('mcp__openviking__forget'))
    expect(visibleNames(parent, key)).not.toContain('mcp__openviking__forget')
  })

  it('keeps denial across an MCP resync cycle without accumulating passes', async () => {
    const parent = await harness()
    const key = agentKey()
    await mountShield(parent, key)
    const write = parent.tools.register(fakeTool('mcp__openviking__write'))
    expect(visibleNames(parent, key)).not.toContain('mcp__openviking__write')
    // Resync: the tool generation is disposed and re-registered under the same name. The
    // restriction is a name-based entry on the agent's layer — it outlives the generation, and
    // the ledger must keep the shield from stacking a second identical pass.
    write()
    parent.tools.register(fakeTool('mcp__openviking__write'))
    expect(visibleNames(parent, key)).not.toContain('mcp__openviking__write')
  })

  it('re-denies from a fresh instance after the previous mount is disposed (no stale ledger)', async () => {
    const parent = await harness()
    const firstKey = agentKey()
    const first = createScope(parent, firstKey)
    await first.ctx.plugin(OvShield, { ...SHIELD_CONFIG })
    expect(visibleNames(parent, firstKey)).not.toContain('mcp__openviking__remember')
    await first.dispose()
    expect(visibleNames(parent, firstKey)).toContain('mcp__openviking__remember')
    const secondKey = agentKey()
    const second = createScope(parent, secondKey)
    await second.ctx.plugin(OvShield, { ...SHIELD_CONFIG })
    expect(visibleNames(parent, secondKey)).not.toContain('mcp__openviking__remember')
  })

  it('never throws on a surface without OpenViking and stays inert', async () => {
    const parent = new Context()
    contexts.push(parent)
    await parent.plugin(SystemPrompt)
    await parent.plugin(ToolRuntime)
    await parent.plugin(SkillRegistry)
    parent.tools.register(fakeTool('assistant_memory'))
  parent.tools.register(fakeTool('read_mcp_resource'))
    const key = agentKey()
    await mountShield(parent, key)
    expect(visibleNames(parent, key)).toEqual(['assistant_memory', 'read_mcp_resource'])
  })
})

describe('ov-shield skill shadowing', () => {
  it('shadows the ov skill names with non-invocable entries; curated skills stay intact', async () => {
    const parent = await harness()
    const key = agentKey()
    await mountShield(parent, key)
    const listed = await parent.skills.list({ scope: key })
    const shadow = listed.find(skill => skill.name === 'openviking-memory')
    expect(shadow?.invocation).toEqual({ modelInvocable: false, userInvocable: false })
    expect(shadow?.description.startsWith(SHADOW_DESCRIPTION_PREFIX)).toBe(true)
    // The model-facing catalog filter drops the shadow; the curated skill survives.
    expect(listed.filter(skill => skill.invocation.modelInvocable).map(skill => skill.name))
      .toEqual(['management-breakdown'])
  })

  it('pins the fail-deadly registry default: an omitted invocation policy is model-invocable', async () => {
    const parent = await harness()
    parent.skills.register({ name: 'bare-skill', description: 'no invocation policy', provider: 'openviking', content: 'c', source: 'runtime' })
    const listed = await parent.skills.list()
    expect(listed.find(skill => skill.name === 'bare-skill')?.invocation).toEqual({ modelInvocable: true, userInvocable: true })
  })
})


describe('ov-shield resource guard', () => {
  // The read bridge (2026-10-04 live finding): generic MCP resource tools address any server by
  // URI argument, so the prefix deny misses them. The guard denies the openviking server's
  // resource calls and lets every other server pass through.
  type ToolService = { execute: (input: { signal: AbortSignal, callId: unknown, name: string, arguments: unknown }) => Promise<unknown> }
  const exec = (tools: ToolService, name: string, args: unknown) =>
    tools.execute({ signal: testSignal, callId: ToolCallId('g1'), name, arguments: args })

  it('denies resource reads naming the ov server, passes other servers and non-resource calls', async () => {
    const parent = await harness()
    const key = agentKey()
    await mountShield(parent, key)
    const tools = parent.tools as unknown as ToolService
    // The guard's throw is normalized by the tool runtime into an error RESULT (not a
    // rejected promise) — the model-friendly denial channel. Assert on that shape.
    const denied = await exec(tools, 'read_mcp_resource', { server: 'openviking', uri: 'viking://user/default/memories/x' }) as { isError: boolean, content: Array<{ text?: string }> }
    expect(denied.isError).toBe(true)
    expect(JSON.stringify(denied.content)).toContain('ov-shield: OpenViking resources')
    const deniedList = await exec(tools, 'list_mcp_resources', { server: 'openviking' }) as { isError: boolean }
    expect(deniedList.isError).toBe(true)
    const deniedTpl = await exec(tools, 'list_mcp_resource_templates', { server: 'openviking' }) as { isError: boolean }
    expect(deniedTpl.isError).toBe(true)
    // Other servers pass the guard; the tool itself executes cleanly.
    const passed = await exec(tools, 'read_mcp_resource', { server: 'some-other-server', uri: 'x://y' }) as { isError?: boolean }
    expect(passed.isError ?? false).toBe(false)
    // Non-resource tools are untouched.
    const untouched = await exec(tools, 'assistant_memory', {}) as { isError?: boolean }
    expect(untouched.isError ?? false).toBe(false)
  })
})
