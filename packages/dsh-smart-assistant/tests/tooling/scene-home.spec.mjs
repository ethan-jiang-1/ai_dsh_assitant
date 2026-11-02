/**
 * Fixtures for `dev/probes/web/scene-home.mjs` — the one writer for scene profile patches.
 *
 * Acceptance points:
 * - a fresh profile patch (`header` + `[]`) becomes a parseable list with the row, not a
 *   flow sequence followed by block entries;
 * - a patch that already has entries appends a second list item;
 * - an invalid row throws before writing, so a bad scene seed cannot leave a broken profile;
 * - the result parses with the same `yaml` package the loader uses.
 *
 * The regression this file exists for: 2026-11-03 the seeded web-face lane was dark because
 * four scene seeds and `web-face-check` appended block entries after `[]`; the service died
 * before printing its URL and the runner showed only a stack tail.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'
import { afterEach, describe, expect, it } from 'vitest'
import { addProfileRows } from '../../../../dev/probes/web/scene-home.mjs'

const dirs = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function patchFile(initial) {
  const dir = mkdtempSync(join(tmpdir(), 'scene-home-'))
  dirs.push(dir)
  const file = join(dir, 'cordis.patch.yml')
  writeFileSync(file, initial, 'utf8')
  return file
}

describe('addProfileRows', () => {
  it('replaces the fresh profile [] placeholder with a parseable list', () => {
    const file = patchFile('# Your patch layer\n[]\n')
    addProfileRows(file, ['# scene row', '- id: assistant-product', '  config:', '    onboarding: false'])
    const text = readFileSync(file, 'utf8')
    expect(text).not.toMatch(/^\s*\[\]\s*$/m)
    expect(parse(text)).toEqual([{ id: 'assistant-product', config: { onboarding: false } }])
  })

  it('appends to a patch that already has entries', () => {
    const file = patchFile('# Your patch layer\n- id: a\n  config:\n    x: 1\n')
    addProfileRows(file, ['# second row', '- id: b', '  config:', '    y: 2'])
    expect(parse(readFileSync(file, 'utf8'))).toEqual([
      { id: 'a', config: { x: 1 } },
      { id: 'b', config: { y: 2 } },
    ])
  })

  it('leaves the file untouched when the row would make an unparseable stream', () => {
    const file = patchFile('# Your patch layer\n[]\n')
    const before = readFileSync(file, 'utf8')
    expect(() => addProfileRows(file, ['- id: broken', '  config: ['])).toThrow()
    expect(readFileSync(file, 'utf8')).toBe(before)
  })
})
