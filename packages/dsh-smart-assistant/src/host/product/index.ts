/**
 * `assistant-product`: bind this installation to one user workspace.
 *
 * The row is web-only on purpose. It needs `connection` for the authenticated client route and
 * `workspaceRegistry` for the durable registration; a headless composition has neither, so the
 * headless profile patch disables the row (the `schedule` precedent). When no settings file
 * exists the row serves `not-configured` and changes nothing — a manual `dsh plugin add` install
 * keeps today's behavior.
 *
 * @module dsh-smart-assistant/product
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-workspace'
import { createProductRoute } from './route.ts'
import { createProductState } from './state.ts'

/** Row id in the bundle patch. */
export const name = 'assistant-product'

/** Both services exist only in a web composition; headless disables the row instead. */
export const inject = ['connection', 'workspaceRegistry']

/**
 * Register the product route and start the initial settings read/registration.
 * @param ctx - Host context carrying `connection` and `workspaceRegistry`.
 */
export function apply(ctx: Context): void {
  const state = createProductState({ registry: ctx.workspaceRegistry })
  ctx.effect(() => ctx.connection.fetch.register(createProductRoute(state)))
}
