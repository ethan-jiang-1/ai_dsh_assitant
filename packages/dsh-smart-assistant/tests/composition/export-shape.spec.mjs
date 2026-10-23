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
 * The runner patch id and plugin `name` are separate compatibility surfaces: both are pinned
 * explicitly below because existing dev patch identities must remain stable. The four dev
 * runner patches are parsed with the same js-yaml schema as Include, so nested `insert` rows
 * and inert `!!js` expressions retain their production structure.
 *
 * Planes: preset sub-rows are function plugins — named name/inject/apply, NO default.
 * The host row is a service plugin — default-exports the Service class with static
 * Config, the legal service shape. Every dev runner patch gets the same function-plugin
 * assertions, including replay: provider/model rows are not Loader entry rows. The two
 * legacy probe rows intentionally keep `preset-runner`; the main and replay patches use
 * `assistant-preset-runner`.
 *
 * Deliberately plain .mjs (like the tooling specs): it imports the untyped
 * gen-catalog script module, and `tsc -p tsconfig.test.json` does not include non-TS
 * files, so the type gate pays nothing for that import.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { Service } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { parseRows } from '../../../../scripts/generate/gen-catalog.mjs'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ownRows = parseRows(readFileSync(join(packageRoot, 'cordis.patch.yml'), 'utf8'))
  .filter(row => row.name !== undefined && row.name.startsWith('dsh-smart-assistant'))
const runnerPatches = {
  'expert-probe.patch.yml': 'preset-runner',
  'recall-probe.patch.yml': 'preset-runner',
  'preset-runner.patch.yml': 'assistant-preset-runner',
  'preset-runner-replay.patch.yml': 'assistant-preset-runner',
}

function insertedRows(patches) {
  if (!Array.isArray(patches)) throw new Error('runner patch must be an array')
  return patches.flatMap(patch => {
    const rows = patch.insert ?? []
    return rows.flatMap(row => [row, ...(row.group ? insertedRows([{ insert: row.config }]) : [])])
  })
}

const PREFIX = 'dsh-smart-assistant'
const hostRow = ownRows.find(row => row.name === PREFIX)
const presetSubRows = ownRows.filter(row => row.name !== PREFIX)

/** Layer directory each subpath row's implementation lives in: `src/<layer><sub>/index.ts`.
 * Rows absent from the map still sit at the src root; the package-root row resolves to the
 * thin stable entry `src/index.ts`, which re-exports the same class identity. */
const SOURCE_LAYER = {
  'knowledge-approve-remote': 'host/', 'desk-projection': 'host/', 'ui-mode': 'host/', 'rooms-route': 'host/', 'viki': 'host/', 'operating-ledger': 'host/',
  'tool-memory': 'agent/', 'tool-research': 'agent/', 'tool-knowledge': 'agent/', 'tool-operating': 'agent/', 'tool-recall': 'agent/',
  'memory-digest': 'agent/', 'home-preamble': 'agent/', 'operating-brief': 'agent/', 'learn': 'agent/', 'ov-shield': 'agent/', 'preset-runner': 'dev/',
}

/** Relative source-module path for a patch row name (package root row → thin src/index.ts). */
function sourceOf(rowName) {
  const sub = rowName.slice(PREFIX.length).replace(/^\//, '')
  if (sub === '') return '../../src/index.ts'
  return `../../src/${SOURCE_LAYER[sub] ?? ''}${sub}/index.ts`
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

describe('every actual dev preset-runner patch rides the same guard', () => {
  for (const [file, expectedId] of Object.entries(runnerPatches)) {
    it(file, async () => {
      const patches = yaml.load(readFileSync(join(packageRoot, '..', '..', 'dev', 'probes', 'session', file), 'utf8'), { schema: entryListSchema })
      const rows = insertedRows(patches).filter(row => row.name === 'dsh-smart-assistant/preset-runner')
      expect(rows, `${file} must contain exactly one preset runner`).toHaveLength(1)
      const row = rows[0]
      expect(row.config.task).toEqual({ __jsExpr: 'ctx.headlessStartup.task' })
      const mod = await import(sourceOf(row.name))
      expect('default' in mod, `${row.name} must not default-export`).toBe(false)
      const unwrapped = loader.unwrapExports(mod)
      expect(unwrapped).toBe(mod)
      expect(row.id, 'runner row id must remain the documented patch identity').toBe(expectedId)
      expect(unwrapped.name, 'plugin export name must remain stable').toBe('assistant-preset-runner')
      expect(unwrapped.inject).toEqual(expect.arrayContaining([expect.any(String)]))
      expect(typeof unwrapped.apply).toBe('function')
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
