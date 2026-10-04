/**
 * Step-one guard of the plugin evidence ladder (test-strategy adoption, slice 3): the
 * export shape of every row this bundle declares, at the source plane, before any
 * composition runs.
 *
 * The failure class this pins is upstream postmortem 0001: one extra `export default` on
 * a function plugin made Loader's unwrapExports resolve the bare default and DROP the
 * whole module namespace ("178 green unit tests and 100% line coverage" still shipped a
 * dead bridge). The mechanism is in the vendored loader itself: `exports.default ?? exports`
 * takes the default whenever the key exists. Our own `#digestCache` incident (2026-09-23)
 * was the same combination-visibility class; the real-composition suite covers step four,
 * and this file is the cheapest step — one-line assertions that would have fenced it.
 *
 * Rows are parsed with the SAME parseRows gen-catalog uses (one parser, two consumers),
 * so a patch-shape change fails here the same way it fails the catalog. The plugin `name`
 * export must equal the patch row id: the id is what --dump-config and the composition
 * show, so a drifted name would orphan the row while everything stays green — the rule
 * fired for real on its first run, catching the dev patches' `preset-runner` id (the
 * plugin's name export had drifted to `assistant-preset-runner`).
 *
 * Planes: preset sub-rows are function plugins — named name/inject/apply, NO default.
 * The host row is a service plugin — default-exports the Service class with static
 * Config, the legal service shape. The dev-only preset-runner row (loaded by
 * dev/preset-runner.patch.yml) gets the same function-plugin assertions: it rides the
 * real Loader in development too. The replay sibling patch is not parsed here — its
 * nested provider rows are outside parseRows' shape contract (that fail-loud is
 * intentional), and its runner row is pinned to the main patch's shape by that file's
 * own header note ("相同的两行").
 *
 * Deliberately plain .mjs (like verify-gates.spec.mjs): it imports the untyped
 * gen-catalog script module, and `tsc -p tsconfig.test.json` does not include non-TS
 * files, so the type gate pays nothing for that import.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { Service } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { parseRows } from '../../../scripts/gen-catalog.mjs'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const ownRows = parseRows(readFileSync(join(packageRoot, 'cordis.patch.yml'), 'utf8'))
  .filter(row => row.name !== undefined && row.name.startsWith('dsh-smart-assistant'))
const devRows = parseRows(readFileSync(join(packageRoot, '..', '..', 'dev', 'preset-runner.patch.yml'), 'utf8'))
  .filter(row => row.name !== undefined && row.name.startsWith('dsh-smart-assistant/'))

const PREFIX = 'dsh-smart-assistant'
const hostRow = ownRows.find(row => row.name === PREFIX)
const presetSubRows = ownRows.filter(row => row.name !== PREFIX)

/** Relative source-module path for a patch row name (package root row → src/index.ts). */
function sourceOf(rowName) {
  const sub = rowName.slice(PREFIX.length).replace(/^\//, '')
  return sub === '' ? '../src/index.ts' : `../src/${sub}/index.ts`
}

if (hostRow === undefined || presetSubRows.length === 0) {
  throw new Error(`cordis.patch.yml shape unexpected: ${ownRows.length} own rows, host=${hostRow !== undefined}`)
}

const loader = Object.create(Loader.prototype)

/**
 * Shape self-consistency, not a hardcoded list of which row is which: a row whose module
 * default-exports must be a Service subclass (service plugin — the host/companion shape), and
 * a row without one must be a clean function plugin (named name/inject/apply). Either way the
 * namespace must survive `unwrapExports` and the plugin `name` export must equal the patch
 * row id. Adding a row of a NEW shape means extending this guard in the same diff.
 */
describe('every preset sub-row is shape-consistent (service default OR clean function plugin)', () => {
  for (const row of presetSubRows) {
    const modulePath = sourceOf(row.name)
    it(`${row.id} (${row.name})`, async () => {
      const mod = await import(modulePath)
      expect(mod, modulePath).toBeDefined()
      const unwrapped = loader.unwrapExports(mod)
      if ('default' in mod) {
        // Service plugin: unwrapExports intentionally resolves to the class itself.
        expect(mod.default.prototype, 'a default-exporting row must be a Service subclass').toBeInstanceOf(Service)
        expect(unwrapped, 'unwrap resolves the service class').toBe(mod.default)
      } else {
        expect(unwrapped, 'unwrapExports must return the namespace itself (round-trip)').toBe(mod)
        expect(unwrapped.name, 'plugin name must equal the patch row id (--dump-config identity)').toBe(row.id)
        expect(unwrapped.inject, 'inject must name the services this row consumes').toEqual(
          expect.arrayContaining([expect.any(String)]),
        )
        expect(typeof unwrapped.apply, 'apply must be a function').toBe('function')
      }
    })
  }
})

describe('the dev-only preset-runner rows ride the same guard', () => {
  for (const row of devRows) {
    it(`${row.id} (${row.name})`, async () => {
      const mod = await import(sourceOf(row.name))
      expect('default' in mod, `${row.name} must not default-export`).toBe(false)
      const unwrapped = loader.unwrapExports(mod)
      expect(unwrapped).toBe(mod)
      expect(unwrapped.name, 'plugin name must equal the patch row id').toBe(row.id)
    })
  }
})

describe('the host row is the legal service shape', () => {
  it(`default-exports the Service class with static Config (${hostRow.id})`, async () => {
    const mod = await import(sourceOf(PREFIX))
    expect(mod.default, 'service plugin default-exports the class').toBeDefined()
    expect(mod.default.prototype, 'the default export must extend Service').toBeInstanceOf(Service)
    expect(mod.default.Config, 'static Config schema must be present').toBeDefined()
    // The named namespace must survive too: the service class is reachable by name
    // (in-package imports) and is the same object the default hands over.
    expect(mod.AssistantMemory).toBe(mod.default)
  })
})
