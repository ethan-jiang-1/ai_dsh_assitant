/**
 * The digest prompt section: the bounded view of the home that rides in every model request.
 *
 * This row exists separately from the tool row so a deployment can tune or drop the always-on view
 * without touching the agent's ability to recall on demand. That split is the point: context is the
 * scarce resource, so what is always in front of the model is a deliberate choice.
 *
 * @module dsh-smart-assistant/memory-digest
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'assistant-memory-digest'

export const inject = ['assistantMemory', 'systemPrompt']

/**
 * Placement in the tail band, after the environment facts (HARNESS_SOURCE 10000, WEB_SURFACE 10100)
 * and before the deployment persona suffix (10200): the digest text changes whenever the home
 * changes (every memory write touches the cache), so it must not sit ahead of the reusable
 * instruction band — a save would otherwise re-tokenize every tool and mode section after it.
 * Stable identity (soul 100, manual 300) stays near the front; only volatile per-user state rides
 * at the tail, mirroring how DSH itself keeps the shared prefix unforked. Exported for the
 * composition test, which pins the band so a future edit cannot silently move it back.
 */
export const DIGEST_SECTION_ORDER = 10150

/**
 * Register the digest section.
 * @param ctx - Agent-plane context; the section covers every agent joined to this preset.
 */
export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: 'assistant:memory-digest',
    order: DIGEST_SECTION_ORDER,
    text: () => ctx.assistantMemory.digestSnapshot(),
  })
}
