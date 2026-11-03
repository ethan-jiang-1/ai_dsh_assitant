/**
 * The panel color contract, injected once per page.
 *
 * Neutral roles consume the vendor theme aliases (`--dsw-alias-*`) directly; the warn, accent,
 * and success roles ride these `dsha-` variables because the vendor scales offer no readable
 * chip pairing on light surfaces (AA, ≥4.5:1) — vendor success pairs green-500 text onto a
 * green-400 fill (1.2:1) and even its tertiary tint tops out at 2.1:1. Dark values reference
 * vendor statics where one fits. The AA contract is held by
 * `tests/client/theme.spec.ts` (component zero literal colour + contract light
 * values each ≥4.5:1).
 *
 * @module dsh-smart-assistant/client/theme
 */

/** Panel accent (brand teal) as a theme variable; the favicon in `src/host/web-branding.ts` keeps the
 * literal hex — favicons are fixed images and cannot resolve CSS variables. */
export const MARK_TEAL = 'var(--dsha-accent)'

/** The owning client plugin id (also the `data-plugin` marker the vendor theme uses). */
const PLUGIN_ID = 'dsh-smart-assistant'

/**
 * Inject the `--dsha-*` contract block for exactly the owning plugin lifetime.
 *
 * This is a global stylesheet, so it follows the vendor rule (`ui-theme/src/client/styles.ts`):
 * one `ctx.effect` per sheet, `data-plugin`/`data-plugin-css` markers, and a disposer that
 * removes the tag. Appending once with no owner would leave the variables behind after a
 * hot reload or a disable.
 * @param ctx - Client context that owns the effect.
 */
export function installThemeVars(ctx: { effect: (run: () => () => void, label?: string) => void }): void {
  // Headless compositions (tests, no DOM) skip the injection: the variables only matter
  // when something renders, and the panels already treat "no document" as no-op elsewhere.
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    const style = document.createElement('style')
    style.id = 'dsha-theme-vars'
    style.dataset.plugin = PLUGIN_ID
    style.dataset.pluginCss = `${PLUGIN_ID}/theme-vars`
    style.textContent = [
      'body{--dsha-warn:#92400e;--dsha-warn-tint:#fff7e6;'
        + '--dsha-accent:#0f766e;--dsha-accent-tint:#f0fdfa;--dsha-on-accent:#ffffff;'
        + '--dsha-success:#15803d;--dsha-success-tint:var(--dsw-alias-state-success-tertiary)}',
      'body[data-ds-dark-theme]{--dsha-warn:var(--dsw-static-amber-400);'
        + '--dsha-warn-tint:var(--dsw-static-amber-900);'
        + '--dsha-accent:#2dd4bf;--dsha-accent-tint:rgba(45,212,191,0.12);--dsha-on-accent:#ffffff;'
        + '--dsha-success:var(--dsw-static-green-400);--dsha-success-tint:rgba(34,197,94,0.14)}',
    ].join('')
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'assistant-theme: vars')
}
