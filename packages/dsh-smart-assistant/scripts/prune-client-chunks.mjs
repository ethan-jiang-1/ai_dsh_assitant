#!/usr/bin/env node
/**
 * Remove the per-module tsc artifacts under `lib/client/` after tsdown has inlined the whole
 * client tree into `lib/client/index.js`. `tsc -b` emits one .js/.d.ts per source module; only
 * the bundle and its declaration/map companions are reachable from the `./client` export, yet
 * `files: ["lib"]` ships the rest. The vendor client-bundle preset does the same pruning for its
 * own packages; this package rebuilds the preset locally because the preset is not published
 * (vendor docs: cookbook/adding-a-settings-card.md).
 *
 * The script is a build step, not a source transform: it runs only after tsdown succeeded, and
 * a missing index.js is a build failure rather than a silent empty directory.
 *
 * @module dsh-smart-assistant/scripts/prune-client-chunks
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEEP = new Set(['index.js', 'index.js.map', 'index.d.ts', 'index.d.ts.map'])

/**
 * Delete every file under `clientDir` that is not one of the four entry artifacts.
 * @param {string} clientDir - `lib/client` directory.
 * @returns {string[]} paths removed (for the test/build log).
 */
export function pruneClientChunks(clientDir) {
  const index = join(clientDir, 'index.js')
  if (!existsSync(index)) throw new Error(`prune-client-chunks: ${index} is missing — run tsdown before pruning`)
  const removed = []
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) { walk(path); continue }
      if (dir === clientDir && KEEP.has(name)) continue
      rmSync(path)
      removed.push(path)
    }
  }
  walk(clientDir)
  return removed
}

if (process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const dir = fileURLToPath(new URL('../lib/client/', import.meta.url))
  const removed = pruneClientChunks(dir)
  console.log(`prune-client-chunks: removed ${String(removed.length)} unreachable file(s) from lib/client`)
}
