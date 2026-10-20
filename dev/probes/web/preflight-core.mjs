/**
 * Pure extraction rules for the web preflight's Remote-namespace check.
 *
 * The check used to regex `namespace: "..."` against the remotes client bundle and always
 * parsed zero namespaces, so it printed `0 namespace(s)` and passed: a vacuum green. The
 * bundle actually carries one `createTypertRemoteInfo` table per contribution, whose method
 * keys are `<namespace>/<method>`; the namespace set is the distinct prefix. The bundle also
 * minifies the inject list with double quotes, while the source uses single quotes.
 *
 * Keeping the rules here (not in the probe shell) lets the gate pin both extraction shapes
 * and the "cannot parse" failures with a throwaway fixture, per scripts/AGENTS.md
 * (logic and checked corpus stay apart).
 */

/**
 * Distinct Remote namespaces from the generated remotes bundle.
 * Method keys look like `"session/list": {` / `"agentPresets/select": {`.
 * @param {string} text - the served remotes client bundle.
 * @returns {string[]} distinct namespace prefixes, sorted.
 */
export function remoteNamespacesFromBundle(text) {
  const namespaces = new Set()
  for (const match of String(text).matchAll(/"([A-Za-z][A-Za-z0-9]*)\/[A-Za-z0-9_.-]+"\s*:\s*\{/g)) {
    namespaces.add(match[1])
  }
  return [...namespaces].sort()
}

/**
 * Remote namespaces this package's client bundle injects.
 * The built classic script uses double quotes; the TypeScript source uses single quotes.
 * @param {string[]} bundleTexts - served client bundles belonging to this package.
 * @returns {string[]} distinct `remote.<ns>` suffixes, sorted.
 */
export function declaredRemoteNamespaces(bundleTexts) {
  const declared = new Set()
  for (const text of bundleTexts) {
    const literal = /const inject = \[([\s\S]*?)\]/.exec(String(text))?.[1]
    if (literal === undefined) continue
    for (const match of literal.matchAll(/["']remote\.([A-Za-z0-9_]+)["']/g)) declared.add(match[1])
  }
  return [...declared].sort()
}

/**
 * Decide whether the Remote-namespace check has enough evidence to pass.
 * An empty parse is a failure, never a green: a changed bundle shape must be visible.
 * @param {{ manifestText: string, bundleTexts: string[] }} input - served remotes bundle and our bundles.
 * @returns {{ namespaces: string[], declared: string[], problems: string[] }} parsed sets and failures.
 */
export function inspectRemoteNamespaces({ manifestText, bundleTexts }) {
  const namespaces = remoteNamespacesFromBundle(manifestText)
  const declared = declaredRemoteNamespaces(bundleTexts)
  const problems = []
  if (namespaces.length === 0) {
    problems.push('Remote manifest: parsed 0 namespaces from the remotes bundle — the extraction shape changed, so this check would pass vacuously')
  }
  if (declared.length === 0) {
    problems.push('our client bundle carries no remote.* injects — cannot compare against the Remote manifest')
  }
  for (const namespace of declared) {
    if (namespaces.length > 0 && !namespaces.includes(namespace)) {
      problems.push(`our bundle injects remote.${namespace}, but the Remote manifest has no such namespace — this entry will stay pending in the browser`)
    }
  }
  return { namespaces, declared, problems }
}
