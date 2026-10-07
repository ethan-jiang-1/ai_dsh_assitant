/**
 * The panel color contract, injected once per page.
 *
 * Neutral roles consume the vendor theme aliases (`--dsw-alias-*`) directly; the warn and
 * accent roles ride these `dsha-` variables because the vendor amber scale has no step
 * meeting the AA bar this package committed to on light surfaces (R8: ≥4.5:1) and the teal
 * is this assistant's own brand identity (the vendor palette has no teal). Dark values
 * reference vendor statics where one fits. The AA contract is held by
 * `tests/client/client-theme.spec.ts` (component zero literal colour + contract light
 * values each ≥4.5:1).
 *
 * @module dsh-smart-assistant/client/theme
 */

/** Panel accent (brand teal) as a theme variable; the favicon in `src/host/web-branding.ts` keeps the
 * literal hex — favicons are fixed images and cannot resolve CSS variables. */
export const MARK_TEAL = 'var(--dsha-accent)'

/**
 * Inject the `--dsha-*` contract block once per page.
 */
export function ensureThemeVars(): void {
  // Headless compositions (tests, no DOM) skip the injection: the variables only matter
  // when something renders, and the panels already treat "no document" as no-op elsewhere.
  if (typeof document === 'undefined') return
  if (document.getElementById('dsha-theme-vars') !== null) return
  const style = document.createElement('style')
  style.id = 'dsha-theme-vars'
  style.textContent = [
    'body{--dsha-warn:#92400e;--dsha-warn-tint:#fff7e6;'
      + '--dsha-accent:#0f766e;--dsha-accent-tint:#f0fdfa}',
    'body[data-ds-dark-theme]{--dsha-warn:var(--dsw-static-amber-400);'
      + '--dsha-warn-tint:var(--dsw-static-amber-900);'
      + '--dsha-accent:#2dd4bf;--dsha-accent-tint:rgba(45,212,191,0.12)}',
  ].join('')
  document.head.appendChild(style)
}
