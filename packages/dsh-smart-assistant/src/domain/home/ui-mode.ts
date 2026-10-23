/**
 * The three interface densities, shared by the Host config schema and the browser store.
 *
 * The value is presentation only: the Host stores the preference and the client renders it.
 * Keeping the vocabulary here means the settings schema and the mode store cannot disagree on
 * the accepted strings.
 *
 * @module dsh-smart-assistant/domain/home/ui-mode
 */

/** From the least to the most surface. */
export const UI_MODES = ['simple', 'standard', 'expert'] as const

/** One interface density. */
export type UiMode = (typeof UI_MODES)[number]

/** Whether a value is one of the three modes. */
export function isUiMode(value: unknown): value is UiMode {
  return typeof value === 'string' && (UI_MODES as readonly string[]).includes(value)
}
