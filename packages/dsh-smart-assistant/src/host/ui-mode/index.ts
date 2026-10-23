/** Host-only per-home interface-density preference route; owns one `ui-mode.json` file. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '../index.ts'
import { createUiModeRoute } from './route.ts'

export const name = 'assistant-ui-mode'
export const inject = ['connection', 'assistantMemory']

/**
 * Contribute the authenticated GET/POST route under the assistant home the ledger owns.
 * @param ctx - Host fiber owning the registration and its disposer.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.connection.fetch.register(createUiModeRoute(ctx.assistantMemory.paths.root)))
}
