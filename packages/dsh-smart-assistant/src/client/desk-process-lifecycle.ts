/** Per-apply observation of processing-session settlement edges. */
import type { DeskPath } from './desk-process'

/**
 * Create one settle observer for a client apply. A new binding starts a new edge history; clearing
 * the path resets it. Unknown running state is observed but does not trigger a projection refresh.
 * @param refresh - Refresh the operating projection after the bound session settles.
 * @returns The observer for the current path and its running state.
 */
export function createSettleRefreshObserver(
  refresh: () => void,
): (path: DeskPath | undefined, running: boolean | undefined) => void {
  let settlePathKey: string | undefined
  let lastRunning: boolean | undefined
  return (path, running): void => {
    if (path === undefined) {
      settlePathKey = undefined
      lastRunning = undefined
      return
    }
    const key = `${path.sessionId}@${path.boundAt}`
    if (key !== settlePathKey) {
      settlePathKey = key
      lastRunning = undefined
    }
    if (running === lastRunning) return
    lastRunning = running
    if (running === false) refresh()
  }
}
