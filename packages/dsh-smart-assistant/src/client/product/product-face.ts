/**
 * The product face's browser state: one route read per page materialization, shared by the
 * dashboard gate and the conversation dock, plus the composer-block applier that withholds
 * input while the product has no usable project.
 *
 * Why a shared store instead of the gate's old component-local fetch: the conversation is the
 * only surface every chat path traverses, so the block must know the same binding the panel
 * knows. One read, two consumers, no second poll.
 *
 * The block is an affordance, exactly as the platform documents its own registry: the host
 * still accepts a prompt it can route. The product's promise ("sessions land in your project")
 * is kept on every product-owned surface, not by refusing packets at the host.
 *
 * @module dsh-smart-assistant/client/product/product-face
 */

import { createSnapshotStore, type SnapshotStore } from '../chrome/store'
import { reactSurface } from '../chrome/runtime'
import {
  failureMessage,
  parseProductBinding,
  productGateBlocks,
  productGateReason,
  productGateView,
  type ProductBinding,
  type ProductGateRuntime,
  type ProductGateView,
} from './product-binding'

/** The product face's observable state; one store per page materialization. */
export interface ProductFaceState {
  /** Validated route payload; undefined until the read resolves or when no product face exists. */
  readonly binding: ProductBinding | undefined
  /** A directory pick/POST is in flight. */
  readonly busy: boolean
  /** The last readable operation error, shown wherever the face is rendered. */
  readonly error: string | undefined
}

const INITIAL: ProductFaceState = { binding: undefined, busy: false, error: undefined }

let store: SnapshotStore<ProductFaceState> = createSnapshotStore(INITIAL)
let runtime: ProductGateRuntime | undefined
let generation = 0

/**
 * Reset the face store for one materialization. A late response from the previous store is
 * dropped by the generation check, the same discipline the ui-mode store uses.
 * @param next - Runtime capabilities for this materialization.
 * @returns the fresh store (tests read it directly).
 */
export function initProductFaceStore(next?: ProductGateRuntime): SnapshotStore<ProductFaceState> {
  generation += 1
  store = createSnapshotStore(INITIAL)
  runtime = next
  return store
}

/** Bind (or clear) the runtime after the store exists; the entry calls this once per materialization. */
export function bindProductFaceRuntime(next: ProductGateRuntime | undefined): void {
  runtime = next
}

/** The live store; the entry hands it to the block applier. */
export function productFaceStore(): SnapshotStore<ProductFaceState> {
  return store
}

/** The current snapshot without subscribing. */
export function productFaceState(): ProductFaceState {
  return store.getSnapshot()
}

/**
 * Replace fields of the current snapshot. Used by the operations below and by specs that need
 * a known face before rendering (the inert React shim does not replay subscriptions).
 * @param next - Fields to merge.
 */
export function setProductFace(next: Partial<ProductFaceState>): void {
  store.set({ ...store.getSnapshot(), ...next })
}

/**
 * Subscribe a component to the face store. The inert test shim renders one snapshot; the real
 * client re-renders on every change.
 * @returns the current state, re-read on change.
 */
export function useProductFace(): ProductFaceState {
  const { useEffect, useState } = reactSurface()
  const [face, setFace] = useState(store.getSnapshot())
  useEffect(() => {
    const update = (): void => setFace(store.getSnapshot())
    const dispose = store.subscribe(update)
    update()
    return dispose
  }, [])
  return face
}

/**
 * Read `api/assistant/product` once. A 404, a transport failure or an unexpected payload leaves
 * the face at `undefined` (legacy): the gate never becomes a second failure source.
 */
export async function loadProductFace(): Promise<void> {
  const face = runtime
  if (face === undefined) return
  const current = generation
  const settle = (next: Partial<ProductFaceState>): void => {
    if (current !== generation) return
    setProductFace(next)
  }
  try {
    const url = new URL('api/assistant/product', face.baseURI())
    const response = await face.fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
    })
    if (!response.ok) return
    const parsed = parseProductBinding(await response.json())
    if (parsed !== undefined) settle({ binding: parsed })
  } catch { /* legacy face on any transport failure */ }
}

/**
 * Pick a directory, register and persist it through the product route, then hand the ready
 * binding to the calling surface. The dashboard stays on the desk after a bind; the
 * conversation dock starts a Session in the new project (the blocked one is not the project).
 * @param after - Called with the ready binding on success.
 */
export async function chooseProductWorkspace(after?: (binding: ProductBinding) => void): Promise<void> {
  const face = runtime
  if (face === undefined || store.getSnapshot().busy) return
  const pick = face.pickDirectory
  if (pick === undefined) {
    setProductFace({ error: '当前环境没有目录选择器；请在 profile patch 设置 assistant-product.workspaceDir。' })
    return
  }
  const current = generation
  const settle = (next: Partial<ProductFaceState>): void => {
    if (current !== generation) return
    setProductFace(next)
  }
  setProductFace({ busy: true, error: undefined })
  try {
    const picked = await pick()
    if (picked === null) return
    const url = new URL('api/assistant/product', face.baseURI())
    const response = await face.fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceDir: picked }),
    })
    const payload = await response.json().catch(() => undefined) as { error?: string } | undefined
    if (!response.ok) {
      settle({ error: failureMessage(payload?.error) })
      return
    }
    const parsed = parseProductBinding(payload)
    if (parsed === undefined) {
      settle({ error: failureMessage(undefined) })
      return
    }
    settle({ binding: parsed, error: undefined })
    after?.(parsed)
  } catch {
    settle({ error: failureMessage(undefined) })
  } finally {
    settle({ busy: false })
  }
}

/** The composer registry slice this face needs (structural mirror of `ctx.conversation.blocks`). */
export interface ComposerBlockWriter {
  set(sessionId: string, block: { readonly reason: string } | undefined): void
}

/**
 * Open a Session in the just-bound project. The blank Session the gate blocked is not the
 * project, so the conversation dock moves the principal where the work belongs.
 * @param binding - The ready binding returned by the POST.
 */
export function startSessionInBinding(binding: ProductBinding): void {
  if (binding.workspaceId !== undefined) runtime?.startSession?.(binding.workspaceId)
}

/**
 * Reconcile every known Session's composer block with the current view. Pure apart from the
 * writer and the held set, so the decision is testable without a DOM.
 * @param writer - The conversation's block registry.
 * @param sessionIds - Every Session the client currently lists.
 * @param view - Where the binding stands.
 * @param reason - The reason the dock shows; required when blocking.
 * @param blocked - The set this applier maintained on the previous call.
 * @returns the updated set of blocked Sessions.
 */
export function applyProductInputGate(
  writer: ComposerBlockWriter,
  sessionIds: readonly string[],
  view: ProductGateView,
  reason: string | undefined,
  blocked: Set<string>,
): Set<string> {
  if (productGateBlocks(view) && reason !== undefined) {
    for (const sessionId of sessionIds) {
      writer.set(sessionId, { reason })
      blocked.add(sessionId)
    }
    return blocked
  }
  for (const sessionId of blocked) {
    writer.set(sessionId, undefined)
    blocked.delete(sessionId)
  }
  return blocked
}

/** The host slice the input gate needs; `sessions` may be absent in a partial composition. */
export interface ProductGateHost {
  readonly sessions?: {
    readonly list?: {
      getSnapshot(): { readonly ids: readonly string[] }
      subscribe(listener: () => void): () => void
    }
  } | undefined
  effect: (install: () => () => void, label?: string) => unknown
}

/**
 * Keep every Session's composer in step with the face: blocked while unbound, clear once a
 * project is bound (or the face is legacy). The store and the Session list both drive it — a
 * Session created while unbound must be blocked without waiting for its first render.
 * @param host - Session list + effect lifecycle.
 * @param writer - The conversation's block registry.
 */
export function mountProductInputGate(host: ProductGateHost, writer: ComposerBlockWriter): void {
  const blocked = new Set<string>()
  const sync = (): void => {
    const face = store.getSnapshot()
    const view = productGateView(face.binding)
    applyProductInputGate(
      writer,
      host.sessions?.list?.getSnapshot().ids ?? [],
      view,
      productGateReason(view, face.binding),
      blocked,
    )
  }
  host.effect(() => {
    const disposeStore = store.subscribe(sync)
    const disposeList = host.sessions?.list?.subscribe(sync)
    sync()
    return () => {
      disposeStore()
      disposeList?.()
      for (const sessionId of blocked) writer.set(sessionId, undefined)
      blocked.clear()
    }
  }, 'assistant: product input gate')
}
