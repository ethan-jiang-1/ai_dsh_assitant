/**
 * `ov-shield`: policy enforcement over a co-installed OpenViking memory plugin.
 *
 * The OpenViking plugin (installed as-is when a deployment adopts it) unconditionally mounts an
 * MCP tool surface and a second skill-provider catalog — its 0.5.x config knobs for both are dead
 * (zero consumers). This row is the governance seam the DSH-native surfaces provide: it denies the
 * entire `mcp__openviking__*` tool prefix for every agent joined to this preset, and it shadows the
 * two OpenViking skill names with non-invocable same-name entries, so the model-visible surface
 * keeps exactly the five house tools and the curated skill catalog. The recall block is what the
 * denied read tools would have expanded: it inlines leaf content when the recall path is forced to
 * `find` (`recallContextTimeoutMs`), and under the default context path it can carry directory
 * overviews plus an upstream "use search/read" hint that this row has just hidden. That dangling
 * hint is a seam-level gap tracked in the OpenViking retrieval card, not a reason to open the prefix.
 *
 * Enforcement is fail-closed and incremental. Each pass restricts only the visible prefix-matching
 * names absent from the per-instance ledger — denied names vanish from `schemas()`, so the ledger
 * is the only memory of what was denied. Every pass is wrapped: an enforcement error must never
 * fail the mount, because this row ships in every deployment, OpenViking or not. The
 * `tools/change` listener is synchronous; its own restrict re-emits into a delta that is now
 * empty, so the re-entrant pass is a no-op. MCP resync cycles dispose and re-register tool
 * generations, but a restriction is a name-based entry on the mount's scope layer — it outlives
 * tool generations, so the ledger correctly skips re-restriction and entries never accumulate.
 *
 * With OpenViking absent the row is model-invisible-inert: no name matches the prefix, and the two
 * shadow entries carry an explicit non-invocable policy (the registry default is invocable —
 * omission would publish both names as fake skills). They do appear as ghost entries in the
 * invocation-neutral `ctx.skills.list()` view; that residue is accounted and harmless, because
 * every model-facing consumer filters through `isModelInvocable`.
 *
 * @module dsh-smart-assistant/ov-shield
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-skill'

export const name = 'assistant-ov-shield'

export const inject = ['tools', 'skills']

export interface OvShieldConfig {
  /** Global-tool name prefix denied for every agent under this mount. */
  denyToolPrefix: string
  /** MCP server name whose resources the generic resource tools must not reach (the read bridge). */
  denyServerResources: string
  /** Skill names shadowed with a non-invocable same-name entry at this (nearer) layer. */
  shadowSkills: string[]
}

export const Config: Schema<OvShieldConfig> = z.object({
  denyToolPrefix: z.string().required().pattern(/\S/u),
  /** MCP server name whose resources the generic resource tools must not reach. */
  denyServerResources: z.string().required(),
  shadowSkills: z.array(z.string()).required(),
})

/** The OpenViking skill-surface names this policy shadows, for diagnostics and tests. */
export const SHADOW_DESCRIPTION_PREFIX = 'Policy shadow (ov-shield)'

/**
 * Pure delta: visible names matching the prefix that the ledger has not recorded.
 *
 * @param visibleNames - Tool names visible to the enforcing scope right now.
 * @param prefix - Denied tool-name prefix.
 * @param ledger - Names this instance has already restricted.
 * @returns Names to restrict in this pass, in visible order.
 */
export function denyDelta(visibleNames: readonly string[], prefix: string, ledger: ReadonlySet<string>): string[] {
  const delta: string[] = []
  for (const name of visibleNames) {
    if (name.startsWith(prefix) && !ledger.has(name)) delta.push(name)
  }
  return delta
}

/**
 * Mount the shield: shadow the configured skill names and keep the denied tool prefix out of
 * every scope view this mount covers.
 *
 * @param ctx - Mount context. Restriction placement requires a scoped context: on an unscoped
 *   mount the passes warn loudly and stay open (the preset tree always mounts scoped).
 * @param config - Validated shield configuration.
 */
export function apply(ctx: Context, config: OvShieldConfig): void {
  // Skill shadowing: the explicit non-invocable policy is load-bearing — the registry default is
  // `{modelInvocable: true, userInvocable: true}`, so omission would publish fake skills. The
  // cross-layer shadow is silent by registry design (warns only on same-layer duplicates).
  for (const skillName of config.shadowSkills) {
    ctx.skills.register({
      name: skillName,
      description: `${SHADOW_DESCRIPTION_PREFIX}: the OpenViking "${skillName}" skill surface is disabled by assistant policy; its body stays with the openviking provider.`,
      content: `This skill is disabled by assistant policy (ov-shield). The OpenViking skill surface is not part of this assistant's model-visible catalog.`,
      source: 'runtime',
      invocation: { modelInvocable: false, userInvocable: false },
    })
  }

  const scope = scopeOf(ctx)
  const ledger = new Set<string>()

  const enforce = (): void => {
    try {
      const visible = ctx.tools.schemas(scope).map(tool => tool.name)
      const delta = denyDelta(visible, config.denyToolPrefix, ledger)
      if (delta.length === 0) return
      ctx.tools.restrict({ deny: delta })
      for (const denied of delta) ledger.add(denied)
    } catch (error) {
      // Never fail the mount or a turn on enforcement: the next tools/change re-runs the pass.
      // The warn itself is guarded — during scope teardown the logger access throws too.
      const message = error instanceof Error ? error.message : String(error)
      try {
        ctx.logger.warn(`ov-shield: enforcement pass skipped (${message})`)
      } catch {
        // Fiber already disposing; the next mount re-enforces from an empty ledger.
      }
    }
  }

  // Two paths, one delta: the mount pass catches tools registered before this row (a stable
  // surface may never emit again), the listener catches late connects and resyncs.
  enforce()
  ctx.on('tools/change', enforce)

  // The read bridge: the MCP client's GENERIC resource tools (list_mcp_resources,
  // read_mcp_resource, list_mcp_resource_templates) address any server by URI argument, so a
  // prefix deny on the server's own tool namespace does not reach them — a live session read
  // viking:// entities through read_mcp_resource while every mcp__openviking__* call stayed
  // absent (observed 2026-10-04, dev-home four-measure run). Deny resource calls whose `server`
  // names this deployment's OpenViking and let every other server's resources pass through —
  // the per-server guard seam the browser-use MCP integration established.
  ctx.on('tools/execute', async (exec, next) => {
    if (typeof exec.arguments === 'object' && exec.arguments !== null
      && (exec.arguments as { server?: unknown }).server === config.denyServerResources
      && (exec.name === 'list_mcp_resources' || exec.name === 'read_mcp_resource' || exec.name === 'list_mcp_resource_templates')) {
      throw new Error(`ov-shield: OpenViking resources are not part of this assistant's tool surface (recall blocks inline what the model needs; see the openviking integration card)`)
    }
    return next()
  }, { global: true })
}
