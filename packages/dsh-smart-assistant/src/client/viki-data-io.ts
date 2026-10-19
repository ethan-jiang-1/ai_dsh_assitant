/**
 * The Viki tab's data face: one GET for the list and one for a body, over the host
 * `assistant-viki` route. The 503 from the route is the honest "not connected" state (the
 * OpenViking server is an optional layer), never a boot failure and never a prompt.
 *
 * @module dsh-smart-assistant/client/viki-data-io
 */
import type { VikiEntry, VikiList } from '../host/viki/client.ts'
import { reactSurface } from './runtime'

/** One read of the Viki list. */
export interface VikiView {
  readonly status: 'loading' | 'ready' | 'unavailable' | 'error'
  readonly list?: VikiList
  readonly reason?: string
}

interface WebFace { readonly baseURI: string, readonly fetch: typeof fetch }
let vikiWeb: WebFace | undefined
let vikiView: VikiView = { status: 'loading' }
const vikiListeners = new Set<() => void>()

/** Current snapshot, for the component's initial state and the tests. */
export function getVikiView(): VikiView { return vikiView }

/** Reset to the loading state (tests / a fresh mount after an explicit reload). */
export function resetVikiView(): void {
  vikiView = { status: 'loading' }
  for (const listener of vikiListeners) listener()
}

/** Publish one read result to every mounted Viki panel. */
function publish(next: VikiView): void {
  vikiView = next
  for (const listener of vikiListeners) listener()
}

/** Subscribe one surface to the Viki store (the same pattern as `useDesk`). */
export function useVikiView(): VikiView {
  const { useEffect, useState } = reactSurface()
  const [snapshot, setSnapshot] = useState<VikiView>(vikiView)
  useEffect(() => {
    const update = (): void => setSnapshot(vikiView)
    vikiListeners.add(update)
    update()
    return () => { vikiListeners.delete(update) }
  }, [])
  return snapshot
}

/** Capture the page's web face (the bench's optional service is probed, never required). */
export function bindVikiEnv(ctx: unknown): void {
  try {
    const candidate = (ctx as { web?: WebFace } | undefined)?.web
    if (candidate !== undefined && typeof candidate.fetch === 'function') vikiWeb = candidate
  } catch { /* no injected web in the classic-script test harness */ }
}

/** Read the list; a missing server is `unavailable`, not an error. */
export async function loadViki(): Promise<VikiView> {
  let result: VikiView
  if (vikiWeb === undefined) {
    result = { status: 'error', reason: 'the web face is not available' }
  } else {
    try {
      const response = await vikiWeb.fetch(new URL('api/assistant/viki', vikiWeb.baseURI), {
        credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      })
      const body = await response.json().catch(() => ({})) as { message?: unknown, error?: unknown } & Partial<VikiList>
      if (response.status === 503) {
        result = { status: 'unavailable', reason: typeof body.message === 'string' ? body.message : 'OpenViking 未连接' }
      } else if (!response.ok) {
        result = { status: 'error', reason: typeof body.message === 'string' ? body.message : typeof body.error === 'string' ? body.error : `HTTP ${String(response.status)}` }
      } else {
        result = { status: 'ready', list: body as VikiList }
      }
    } catch (error) {
      result = { status: 'error', reason: String(error) }
    }
  }
  publish(result)
  return result
}

/** Read one body; the route only serves URIs inside the configured trees. */
export async function loadVikiBody(uri: string): Promise<{ ok: true, body: string } | { ok: false, reason: string }> {
  if (vikiWeb === undefined) return { ok: false, reason: 'the web face is not available' }
  try {
    const url = new URL('api/assistant/viki', vikiWeb.baseURI)
    url.searchParams.set('uri', uri)
    const response = await vikiWeb.fetch(url, { credentials: 'same-origin', cache: 'no-store', redirect: 'error' })
    const body = await response.json().catch(() => ({})) as { content?: unknown, message?: unknown, error?: unknown }
    if (!response.ok) {
      return { ok: false, reason: typeof body.message === 'string' ? body.message : typeof body.error === 'string' ? body.error : `HTTP ${String(response.status)}` }
    }
    return { ok: true, body: typeof body.content === 'string' ? body.content : '' }
  } catch (error) {
    return { ok: false, reason: String(error) }
  }
}

export type { VikiEntry }
