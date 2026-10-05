/**
 * The home's prompt preamble: the identity and operating-manual sections that ride in every
 * model request, ahead of the digest.
 *
 * Order tells the story the model reads: who you are (`SOUL.md`, next to the persona stub) →
 * how this home works (`AGENTS.md`) → what is in it right now (the digest section). Identity
 * and manual are the home's own root files — data the owner edits, not preset code — and this
 * row exists separately so a deployment can tune or drop either without touching the tools.
 *
 * @module dsh-smart-assistant/home-preamble
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'assistant-home-preamble'

export const inject = ['assistantMemory', 'systemPrompt']

/** Right after the persona stub: identity is the base everything else builds on. */
const SOUL_SECTION_ORDER = 100

/** Before the digest (400): the manual says how the home works, the digest says what is in it. */
const MANUAL_SECTION_ORDER = 300

/**
 * Register the identity and manual sections.
 * @param ctx - Agent-plane context; the sections cover every agent joined to this preset.
 */
export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: 'assistant:soul',
    order: SOUL_SECTION_ORDER,
    text: () => ctx.assistantMemory.soulSnapshot(),
  })
  ctx.systemPrompt.section({
    name: 'assistant:home-manual',
    order: MANUAL_SECTION_ORDER,
    text: () => ctx.assistantMemory.manualSnapshot(),
  })
}
