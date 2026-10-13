/**
 * Gate cores about resolution and gate self-wiring: project reference shape and the
 * rule that every exported core must actually be invoked by verify.mjs.
 */
import { join, resolve } from 'node:path'


/** Accept an owning project or its explicit pinned compiler face, not an arbitrary JSON file. */
export function projectReferenceMatches(projectDir, references) {
  const owner = resolve(projectDir)
  return [...references].some(reference => reference === owner
    || reference === join(owner, 'tsconfig.host.json')
    || reference === join(owner, 'tsconfig.client.json'))
}

// ── gate wiring ──────────────────────────────────────────────────────────────────────────────

/**
 * A check core that exists in verify-checks.mjs but is never invoked by verify.mjs is a script,
 * not a gate — the top-level command would never run it, so no invalid case could reach a real
 * acceptance path. The import statement itself proves nothing about invocation (and neither does
 * a bare name in a comment), so import lines are stripped and the core must be *called* at least
 * once in the runner's body — named import or namespace call both count as wired. Functions only:
 * shared constants (e.g. a status regex) are data for cores and specs, not gates.
 *
 * @param {{ exportedCores: Record<string, unknown>, verifySource: string }} inputs
 */
export function gateWiringProblems({ exportedCores, verifySource }) {
  const problems = []
  const functions = Object.entries(exportedCores).filter(([, value]) => typeof value === 'function')
  if (functions.length === 0) return ['the core module exports no functions — the wiring check has nothing to see']
  const body = verifySource.split('\n').filter(line => !/^\s*import\b/.test(line)).join('\n')
  for (const [name] of functions) {
    if (!body.includes(name)) {
      problems.push(`${name} is exported by verify-checks.mjs but never invoked in the body of verify.mjs (the import line does not count) — a script that exists is not a gate that runs; wire the call or drop the export`)
    }
  }
  return problems
}
