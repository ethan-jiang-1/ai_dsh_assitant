/**
 * Web shell branding: one `webserver/index-inject` row that renames the tab and
 * swaps the favicon, so a browser full of DSH tabs tells this deployment apart.
 *
 * This is skin, not identity (`docs/identity.md` §二): the title is display copy,
 * browser-only, and never reaches the model or the session log. The row is built
 * here as a pure function (same pattern as the vendored `ui-theme` bootstrap),
 * and the host service pushes it whenever a webserver collects its table; in
 * headless compositions no webserver exists and the listener simply idles.
 *
 * @module dsh-smart-assistant
 */

import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'

/** The `IndexInjection` member this module returns: an inline script row. */
export type ScriptInjection = Extract<IndexInjection, { kind: 'script' }>

/** Default tab title: names the assistant, keeps the local-build marker. */
export const DEFAULT_WEB_TITLE = '聪明助手 · DSH Local Build'

/** Inline favicon: a white house on a teal rounded square — the assistant's home. */
const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
  + '<rect width="64" height="64" rx="14" fill="#0d9488"/>'
  + '<path d="M32 11 57 33h-8v18H15V33H7Z" fill="#ffffff"/>'
  + '<rect x="26" y="38" width="12" height="13" fill="#0d9488"/>'
  + '</svg>'

/**
 * Build the inline boot script for one title. The script runs right after the
 * opening body tag, so the head's title and icon links are already parsed: it
 * rewrites the title's text and replaces the favicon immediately, without
 * waiting for DOMContentLoaded (no flash of the unbranded tab).
 * @param title - Tab title, embedded as a JSON literal.
 * @returns the script body.
 */
function brandingScript(title: string): string {
  // Every `<` in the title is escaped in the JSON literal, so no title can close
  // the script element early — the same rule the webserver applies to `global` rows.
  const titleLiteral = JSON.stringify(title).replaceAll('<', '\\u003c')
  return `(() => {
  const title = ${titleLiteral}
  document.title = title
  document.querySelectorAll('link[rel~="icon"]').forEach((link) => { link.remove() })
  const icon = document.createElement('link')
  icon.rel = 'icon'
  icon.type = 'image/svg+xml'
  icon.href = 'data:image/svg+xml,' + encodeURIComponent(${JSON.stringify(FAVICON_SVG)})
  document.head.appendChild(icon)
})()`
}

/**
 * The branding as one index injection row: an inline script after the opening
 * body tag that renames the tab and replaces the favicon.
 * @param title - Tab title; defaults to the assistant branding.
 * @returns the body script row.
 */
export function webBrandingInjection(title: string = DEFAULT_WEB_TITLE): ScriptInjection {
  return { kind: 'script', placement: 'body', text: brandingScript(title) }
}
