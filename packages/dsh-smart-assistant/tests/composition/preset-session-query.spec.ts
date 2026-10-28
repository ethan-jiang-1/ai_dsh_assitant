/**
 * The first-search window is a contract: the FTS index is built on the first `session_search`
 * call, and the vendor default (30s) aborts that build on a long history, so every retry starts
 * over (live probe 2026-10-28: four timeouts, a 36 KiB index, raw-log fallback). The row must keep
 * a window generous enough for the build; this test pins the wiring, not the vendor behavior.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

interface Entry {
  id?: string
  config?: Record<string, unknown>
  insert?: Entry[]
}

const jsTag = { tag: 'tag:yaml.org,2002:js', resolve: (value: unknown) => ({ __jsExpr: String(value) }) }

describe('session-query row', () => {
  it('keeps a first-build window on tool-session-query', () => {
    const patches = parse(readFileSync(join(packageRoot, 'cordis.patch.yml'), 'utf8'), { customTags: [jsTag] }) as { insert?: Entry[] }[]
    const preset = patches.flatMap(patch => patch.insert ?? []).find(entry => entry.id === 'preset-assistant')
    const rows = (preset?.config as { plugins?: Entry[] } | undefined)?.plugins ?? []
    const row = rows.find(entry => entry.id === 'tool-session-query')
    const timeout = row?.config?.searchTimeoutMs
    expect(typeof timeout).toBe('number')
    expect(timeout).toBeGreaterThanOrEqual(60_000)
  })
})
