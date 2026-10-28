/**
 * The right-sidebar terminal is vendor tooling that this product's principal (a manager) never
 * uses. The bundle suppresses the row by id; this test pins the decision so a future patch rewrite
 * cannot silently bring the tab back.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jsTag = { tag: 'tag:yaml.org,2002:js', resolve: (value: unknown) => ({ __jsExpr: String(value) }) }

interface Entry {
  id?: string
  disabled?: unknown
  insert?: Entry[]
}

describe('right-sidebar terminal', () => {
  it('is suppressed by the bundle patch', () => {
    const patches = parse(readFileSync(join(packageRoot, 'cordis.patch.yml'), 'utf8'), { customTags: [jsTag] }) as Entry[]
    const row = patches.find(entry => entry.id === 'ui-sidebar-terminal')
    expect(row).toBeDefined()
    expect(row?.disabled).toBe(true)
  })
})
