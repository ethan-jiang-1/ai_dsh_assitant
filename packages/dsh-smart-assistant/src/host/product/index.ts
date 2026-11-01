/**
 * `assistant-product`: bind this installation to one user workspace.
 *
 * The binding is the row's own `workspaceDir` Config (a volatile field in the current profile
 * patch), plus a one-shot `ASSISTANT_WORKSPACE` environment override for the installer/CI path.
 * There is no private settings file. The row is web-only on purpose: it needs `connection` for
 * the authenticated client route and `workspaceRegistry` for the durable registration; a
 * headless composition has neither, so the headless profile patch disables the row (the
 * `schedule` precedent).
 *
 * @module dsh-smart-assistant/product
 */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-workspace'
import z from '@deepseek-ai/schemastery'
import { createProductRoute } from './route.ts'
import { createProductState, type ProductSettingsWriter } from './state.ts'

/** Row id in the bundle patch. */
export const name = 'assistant-product'

/** Both services exist only in a web composition; headless disables the row instead. */
export const inject = ['connection', 'workspaceRegistry'] as const

/** Row Config; `workspaceDir` is a volatile profile setting, `onboarding` a deployment flag. */
export interface Config {
  /** Absolute workspace directory; omit to let the first-run client choose one. */
  readonly workspaceDir?: Volatile<string | undefined>
  /** Whether the first-run onboarding is enabled; default true. */
  readonly onboarding?: boolean
}

export const Config = z.object({
  workspaceDir: z.string().description('Absolute directory the product works in; written by the first-run client or a profile patch.').volatile(),
  onboarding: z.boolean().default(true).description('Offer the first-run workspace chooser when no workspace is configured.'),
})

/**
 * Register the product route and start the initial Config/env read/registration.
 * @param ctx - Host context carrying `connection` and `workspaceRegistry`.
 * @param config - Effective row Config from the patch stack.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const settings = ctx.get('settings') as ProductSettingsWriter | undefined
  const workspaceDir = config.workspaceDir?.get()
  const onboarding = config.onboarding
  const state = createProductState({
    registry: ctx.workspaceRegistry,
    config: {
      ...(workspaceDir === undefined ? {} : { workspaceDir }),
      ...(onboarding === undefined ? {} : { onboarding }),
    },
    env: process.env,
    ...(settings === undefined ? {} : { settings }),
  })
  ctx.effect(() => ctx.connection.fetch.register(createProductRoute(state)))
}
