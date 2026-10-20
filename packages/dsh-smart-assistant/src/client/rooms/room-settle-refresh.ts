/**
 * The follow-the-conversation refresh for the room data and the operating projection, mounted
 * once per client apply.
 *
 * Like every module of this face it stays free of bare-runtime imports (tsdown inlines the whole
 * `src/client` tree into one classic script, see `./index.ts`).
 *
 * @module dsh-smart-assistant/client/room-settle-refresh
 */

import type { ClientContext } from '../chrome/contracts'
import { getDeskStore } from './room-data-core'
import { loadDesk, loadDeskFor } from './room-data-io'

/**
 * Mount the session settle refresh for one apply.
 * @param ctx - the apply context's sessions list and effect owner.
 * @param reader - the projection reader to refresh alongside the room data; absent skips that half.
 */
export function mountSessionSettleRefresh(
  ctx: Pick<ClientContext, 'sessions' | 'effect'>,
  reader: { refresh(): void } | undefined,
): void {
  // Follow the conversation: when the newest Session settles a turn, re-read the desk file AND
  // the operating projection after a short settle delay. A refresh the assistant performed
  // during that turn then lands on its own — the principal should not have to click to see what
  // changed. The projection half is the processing readback (2026-10-10, desk-process-e2e
  // probe): without it the receipt committed by the processing turn never re-enters the client,
  // judgeReturn stays on 'receipt-not-read-back', and the auto-return to the desk never fires.
  // Room-data refresh also serves headless apply contexts, which may not expose effect. Keep
  // their historical direct subscription; browser Client fibers own teardown when available.
  const store = ctx.sessions?.list as { getSnapshot: () => unknown, subscribe: (fn: () => void) => () => void } | undefined
  if (store !== undefined) {
    const installSessionRefresh = (): (() => void) => {
      let lastStamp = 0
      let pending: ReturnType<typeof setTimeout> | undefined
      const unsubscribe = store.subscribe(() => {
        const state = store.getSnapshot() as { ids?: string[], byId?: Record<string, { updatedAt?: number }> }
        const ids = state?.ids ?? []
        const byId = state?.byId ?? {}
        const newest = ids.reduce((max, id) => Math.max(max, Number(byId[id]?.updatedAt ?? 0)), 0)
        if (newest === lastStamp) return
        lastStamp = newest
        if (pending !== undefined) clearTimeout(pending)
        // Refresh every bound session's own desk; with no bound tab, walk the newest five.
        pending = setTimeout(() => {
          pending = undefined
          if (getDeskStore().boundSessions.size === 0) loadDesk()
          for (const bound of getDeskStore().boundSessions) loadDeskFor(bound)
          reader?.refresh()
        }, 4000)
      })
      return () => {
        unsubscribe()
        if (pending !== undefined) clearTimeout(pending)
      }
    }
    if (typeof ctx.effect === 'function') ctx.effect(installSessionRefresh, 'assistant-client: Session settle refresh')
    else installSessionRefresh()
  }
}
