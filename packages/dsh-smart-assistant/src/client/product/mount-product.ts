/**
 * Mount the product face for one client materialization: the route runtime (fetch, directory
 * picker, session starter), the shared binding store read, and the conversation composer block.
 *
 * The entry owns composition, not the product's transport or its two registrations. Keeping
 * this here also lets the product gate and the conversation dock share one store without the
 * entry knowing either.
 *
 * @module dsh-smart-assistant/client/product/mount-product
 */
import type { ClientContext } from '../chrome/contracts'
import type { ProductGateRuntime } from './product-binding'
import {
  createProductFace,
  loadProductFace,
  mountProductInputGate,
  type ComposerBlockWriter,
  type ProductFace,
} from './product-face'

/**
 * Mount the product face: one route read feeds the dashboard gate and the conversation block.
 * The entry keeps the two thin registrations (dashboard wrapper and dock) so their order in the
 * composition stays visible there.
 * @param ctx - The client apply context.
 */
export function mountProductFace(ctx: ClientContext): ProductFace {
  // The lifecycle tests materialize the factory in a page-like global that may not carry
  // `fetch`; the gate must never be the reason the client entry fails to register. The
  // fallback answers 404, which the gate treats as "no product face" (legacy dashboard).
  const gateFetch = typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : async (): Promise<Response> => ({ ok: false, status: 404, json: async () => undefined }) as unknown as Response
  // The directory picker is a Remote subface; absence is a readable onboarding error, not a
  // client-registration failure.
  const directoryPicker = (ctx.remote as {
    directoryPicker?: { pick(): Promise<{ ok: boolean, value?: string | null, error?: { message?: string } }> }
  } | undefined)?.directoryPicker
  const runtime: ProductGateRuntime = {
    fetch: gateFetch,
    baseURI: () => document.baseURI,
    ...(directoryPicker === undefined ? {} : {
      pickDirectory: async (): Promise<string | null> => {
        const result = await directoryPicker.pick()
        if (!result.ok) throw new Error(result.error?.message ?? 'directory picker failed')
        return result.value ?? null
      },
    }),
    ...(ctx.uiWorkspace?.startSession === undefined ? {} : {
      startSession: (workspaceId: string) => { ctx.uiWorkspace?.startSession?.(workspaceId, { agentPreset: 'assistant' }) },
    }),
  }
  const face = createProductFace(runtime)
  void loadProductFace(face)
  // The conversation's half of the gate: block every Session's composer while the product has
  // no usable project. Scoped inject (not the plugin's own list) so a composition without a
  // conversation service still registers the rest of the face.
  ctx.inject?.(['conversation'], (scope) => {
    const conversation = scope.get('conversation') as { readonly blocks?: ComposerBlockWriter } | undefined
    const blocks = conversation?.blocks
    if (blocks === undefined) return
    mountProductInputGate({ sessions: ctx.sessions, effect: ctx.effect }, blocks, face)
  })
  return face
}
