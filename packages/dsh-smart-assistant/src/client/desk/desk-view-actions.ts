/**
 * Apply-owned deferred mode handoff for the desk activity command.
 * The command may run before main Slot injection; the next injection consumes its mode once.
 */
export interface DeskActivityModeActions {
  setMode(mode: 'activity'): void
}

/**
 * Keep one deferred activity intent in the current apply until baked Slot actions arrive.
 * @returns Command and Slot-injection dispatches for one apply lifetime.
 */
export function createDeskActivityHandoff(): {
  requestActivity(): void
  receive(actions?: DeskActivityModeActions): void
} {
  let pendingActivity = false
  return {
    requestActivity() { pendingActivity = true },
    receive(actions) {
      if (actions === undefined || !pendingActivity) return
      actions.setMode('activity')
      pendingActivity = false
    },
  }
}
