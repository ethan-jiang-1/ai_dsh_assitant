/**
 * Real-shape regression for the curated skill root the preset row points at (2026-09-25).
 *
 * The live failure this guards: after the 0.1.7 migration the row resolved its path against
 * `ctx.baseUrl`, which for a row declared *inside a bundle patch* is the **profile directory**, not
 * the directory the path was written for. Every curated skill silently left the catalog
 * (`skill management-breakdown` answered "unknown") while the row itself stayed in the composition
 * — nothing failed loudly, and no suite covered the path.
 *
 * This suite reads the shipped `cordis.patch.yml`, evaluates the row's own `!!js` expression with
 * the Loader's evaluator (the same one the runtime interpolates config with), and resolves it
 * against the live shape: a profile-like base whose `node_modules` holds this package, which is what
 * `dsh plugin add` and `dev/env/setup.sh` both produce. A path that leaves the package fails here.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { interpolate } from '@deepseek-ai/cordis-plugin-loader'
import { afterAll, describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageName = 'dsh-smart-assistant'

/** Loader dialect for `!!js` scalars: the loader interpolates the expression later, against a context. */
const jsTag = { tag: 'tag:yaml.org,2002:js', resolve: (value: unknown) => ({ __jsExpr: String(value) }) }

interface Entry {
  id?: string
  name?: string
  config?: Record<string, unknown>
  insert?: Entry[]
}

/** The `skill-filesystem` row this package's preset declares, read from the shipped patch. */
function curatedSkillDir(): unknown {
  const patches = parse(readFileSync(join(packageRoot, 'cordis.patch.yml'), 'utf8'), {
    customTags: [jsTag],
  }) as { insert?: Entry[] }[]
  const preset = patches.flatMap(patch => patch.insert ?? []).find(entry => entry.id === 'preset-assistant')
  const rows = (preset?.config as { plugins?: Entry[] } | undefined)?.plugins ?? []
  const row = rows.find(entry => entry.id === 'skill-filesystem')
  const dir = row?.config?.bundledSkillDir
  if (dir === undefined) {
    throw new Error('cordis.patch.yml: the preset must declare one skill-filesystem bundledSkillDir')
  }
  return dir
}

const installBase = mkdtempSync(join(tmpdir(), 'assistant-preset-base-'))
mkdirSync(join(installBase, 'node_modules'), { recursive: true })
symlinkSync(packageRoot, join(installBase, 'node_modules', packageName), 'dir')

afterAll(() => { rmSync(installBase, { recursive: true, force: true }) })

describe('preset curated skill root', () => {
  it('resolves inside this package, from a profile-like base, to a directory holding the curated skills', () => {
    // A bundle patch's rows inherit the profile directory as `baseUrl`; it has no `presets/` of its own.
    const baseUrl = pathToFileURL(installBase).href + '/'
    const resolved = interpolate({ baseUrl }, curatedSkillDir()) as string

    expect(resolved).toBe(join(packageRoot, 'presets', 'assistant', 'skills'))
    // The skill the live probe loads by name must be a bundle under the resolved root.
    expect(existsSync(join(resolved, 'management-breakdown', 'SKILL.md'))).toBe(true)
  })

  it('registers the curated root as the bundled (rank 600) band, so user skills can shadow it', () => {
    // `bundledSkillDir` is the provider's rank-600 root; `customSkillDirs` is rank 300 and would
    // outrank a user's own same-named skill. The field name is the only place the band is visible
    // from this package, so the row's shape is the contract.
    const patches = parse(readFileSync(join(packageRoot, 'cordis.patch.yml'), 'utf8'), {
      customTags: [jsTag],
    }) as { insert?: Entry[] }[]
    const preset = patches.flatMap(patch => patch.insert ?? []).find(entry => entry.id === 'preset-assistant')
    const rows = (preset?.config as { plugins?: Entry[] } | undefined)?.plugins ?? []
    const row = rows.find(entry => entry.id === 'skill-filesystem')
    expect(row?.config?.customSkillDirs).toBeUndefined()
    expect(row?.config?.bundledSkillDir).toBeDefined()
  })
})
