/**
 * Shared temp-directory registry for the gate-family specs: `temp()` mints a throwaway
 * directory, `dirs` is the registry (a fixture that creates its own root pushes into it —
 * the registry must be importable, not hidden in a closure), and every spec wires
 * `afterEach(disposeTempDirs)`. Plain .mjs on purpose (vitest runs it; the type gate does
 * not include it), and the *harness.mjs shape is the admitted shared-fixture form
 * (tests/AGENTS.md) — deliberately not matched by any test include.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Registry of throwaway directories created by {@link temp} (and pushed by fixtures). */
export const dirs = []

/** Dispose every registered directory; specs call this from afterEach. */
export function disposeTempDirs() {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
}

/** Mint a throwaway directory under the OS temp root and register it for disposal. */
export function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}
