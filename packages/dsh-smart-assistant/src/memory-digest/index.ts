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
 * Placement between the deployment persona (0) and plan policy (500): what is known about the person
 * and the work belongs next to identity, ahead of tool documentation and mode policy.
 */
const DIGEST_SECTION_ORDER = 400

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
