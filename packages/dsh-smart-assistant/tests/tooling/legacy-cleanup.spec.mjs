/**
 * `bootstrap.mjs --cleanup-legacy`: the asset-only path for a pre-0.2.0 home whose package was
 * already removed. The profile patch is the only input; the command must run without a package,
 * strip exactly the block the old installer wrote, preserve every other byte, and refuse an
 * edited block instead of guessing.
 *
 * Acceptance points: exact block removed with a user comment preserved; edited marker exits 1
 * and leaves the file byte-identical; no marker exits 0 unchanged; missing patch exits 2.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

const bootstrap = new URL('../../bootstrap.mjs', import.meta.url).pathname
const block = '# Written by dsh-smart-assistant bootstrap.mjs\n- id: agent-preset-registry\n  config:\n    default: assistant\n'

function fixture(patch) {
  const home = temp('legacy-cleanup-')
  mkdirSync(join(home, 'profiles', 'assistant'), { recursive: true })
  const path = join(home, 'profiles', 'assistant', 'cordis.patch.yml')
  if (patch !== undefined) writeFileSync(path, patch, 'utf8')
  return { home, path }
}

function run(home, extra = []) {
  return spawnSync(process.execPath, [bootstrap, '--cleanup-legacy', '--home', home, '--profile', 'assistant', ...extra], { encoding: 'utf8' })
}

describe('bootstrap --cleanup-legacy', () => {
  it('removes exactly the old block and keeps the user comment', () => {
    const { home, path } = fixture(`${block}# keep-me\n`)
    const result = run(home)
    expect(result.status).toBe(0)
    const text = readFileSync(path, 'utf8')
    expect(text).toBe('# keep-me\n[]\n')
  })

  it('refuses an edited marker and leaves the bytes untouched', () => {
    const edited = block.replace('default: assistant', 'default: standard')
    const { home, path } = fixture(edited)
    const result = run(home)
    expect(result.status).toBe(1)
    expect(readFileSync(path, 'utf8')).toBe(edited)
  })

  it('removes the "assistant" preset selection and keeps every other row', () => {
    const patch = '- id: keep-me\n  disabled: true\n- id: agent-preset-registry\n  config:\n    selectedDefault: assistant\n'
    const { home, path } = fixture(patch)
    const result = run(home)
    expect(result.status).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe('- id: keep-me\n  disabled: true\n')
    // Idempotent: a second run finds nothing to remove and leaves the bytes alone.
    expect(run(home).status).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe('- id: keep-me\n  disabled: true\n')
  })

  it('removes the realistic row shape (default + selectedDefault, both assistant)', () => {
    // What Settings actually persists: the whole effective config, not just the volatile field.
    const patch = '- id: agent-preset-registry\n  config:\n    default: assistant\n    selectedDefault: assistant\n- id: keep-me\n  disabled: true\n'
    const { home, path } = fixture(patch)
    expect(run(home).status).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe('- id: keep-me\n  disabled: true\n')
  })

  it('keeps a valid default and other config keys and a different selection', () => {
    const withSibling = fixture('- id: agent-preset-registry\n  config:\n    default: standard\n    selectedDefault: assistant\n    modeSelectionEnabled: false\n')
    expect(run(withSibling.home).status).toBe(0)
    expect(readFileSync(withSibling.path, 'utf8')).toBe('- id: agent-preset-registry\n  config:\n    default: standard\n    modeSelectionEnabled: false\n')

    const other = '- id: agent-preset-registry\n  config:\n    selectedDefault: standard\n'
    const untouched = fixture(other)
    expect(run(untouched.home).status).toBe(0)
    expect(readFileSync(untouched.path, 'utf8')).toBe(other)
  })

  it('removes the legacy block and the selection in one pass, leaving an explicit empty patch', () => {
    const { home, path } = fixture(`${block}- id: agent-preset-registry\n  config:\n    selectedDefault: assistant\n`)
    expect(run(home).status).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe('[]\n')
  })

  it('reports a missing marker and a missing patch without changing anything', () => {
    const { home, path } = fixture('- id: something\n')
    const none = run(home)
    expect(none.status).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe('- id: something\n')

    const missing = fixture(undefined)
    expect(run(missing.home).status).toBe(2)
  })
})

import { afterEach } from 'vitest'
afterEach(disposeTempDirs)
