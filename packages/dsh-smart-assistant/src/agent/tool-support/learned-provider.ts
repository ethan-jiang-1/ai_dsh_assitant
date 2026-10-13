/**
 * The skill-filesystem provider name the learn row registers its learned-skills root under.
 *
 * A shared fact of the agent plane: the learn row mounts the provider with this name, and the
 * `assistant_reflect` curate probe (tool-memory) filters shadow findings by it, so the constant
 * lives here — the seam for facts more than one agent module needs — rather than inside either
 * consumer.
 *
 * @module dsh-smart-assistant/tool-support/learned-provider
 */

/** Provider name for the learned-skills root, distinct from the curated provider's default. */
export const LEARNED_PROVIDER_NAME = 'assistant-learned'
