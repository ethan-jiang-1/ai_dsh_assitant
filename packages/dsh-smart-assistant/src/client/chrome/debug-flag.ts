/**
 * The developer-surface flag. The debug tab is for us, not the principal; it registers only when
 * this returns true. Two exits: the URL fragment (`#debug=1`, handy for probes — it survives the
 * launch-token redirect where a query string does not) and the localStorage key (a dev home can
 * keep it on across reloads). The flag is read once at apply time: changing it is a reload.
 *
 * @module dsh-smart-assistant/client/chrome/debug-flag
 */

/**
 * Whether the developer surface is switched on.
 * @returns true when the L2 debug tab should register.
 */
export function debugEnabled(): boolean {
  try {
    if (typeof location !== 'undefined') {
      if (new URLSearchParams(location.search).get('debug') === '1') return true
      if (location.hash.includes('debug=1')) return true
    }
    return typeof localStorage !== 'undefined' && localStorage.getItem('dsh-assistant-debug') === '1'
  } catch {
    return false
  }
}
