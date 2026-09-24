/**
 * The maintenance metronome (I14, tri-line proposal 2026-09-24, slice 1e): after every N goal
 * rounds, a maintenance turn takes the slot between processing rounds. The design is the
 * iteration-rhythm note's layer (b) — the round driver's own yield barrier (a non-goal message
 * in nextTurn defers the next round until it is consumed) is what makes the slot safe, so the
 * metronome only has to count and speak.
 *
 * The pure parts live here so tests can pin them; the event wiring lives in the service, where
 * the config row and the plugin context already are.
 *
 * @module dsh-smart-assistant/home/metronome
 */

/** Default maintenance interval, in goal rounds. */
export const DEFAULT_MAINTENANCE_EVERY_ROUNDS = 5

/**
 * Whether a round number lands on the maintenance interval.
 * @param round - The round the driver just queued (1-based).
 * @param every - Maintenance interval in rounds; values below 1 never fire.
 * @returns Whether this round gets a maintenance slot.
 */
export function isMaintenanceRound(round: number, every: number): boolean {
  return every >= 1 && round >= 1 && round % every === 0
}

/**
 * Render the maintenance turn's instruction.
 * @param round - The round that triggered the slot.
 * @param every - The configured interval.
 * @returns The message text, model-facing English.
 */
export function renderMaintenancePrompt(round: number, every: number): string {
  return [
    `[Maintenance slot] Round ${round} of this goal just queued, and that is your scheduled`,
    `maintenance interval (every ${every} rounds). Run \`assistant_memory action=curate\` now and`,
    'process what it reports: retire dead skills, rename or retire shadowed ones, fix broken',
    'pointers, merge near-duplicates, or defer each finding with a one-line reason. If the working',
    'folder is clean, say so in one line. Keep this turn short — the paused goal work resumes right',
    'after this turn.',
  ].join('\n')
}
