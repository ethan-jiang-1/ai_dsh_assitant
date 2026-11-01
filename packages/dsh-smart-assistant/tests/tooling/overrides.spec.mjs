/**
 * Fixtures for the override-ledger gate (`scripts/checks/gates/overrides.mjs`).
 *
 * Proven red on the shape it exists to refuse: a bare-id override (an override target that only
 * warns when missing) with no ledger entry, and a ledger row that no longer appears in the patch.
 * Green on the shipped pair.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { overrideLedgerProblems } from '../../../../scripts/checks/gates/overrides.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

const patch = (body) => body
const doc = (rows) => ['| 行 id | … |', '|---|---|', ...rows].join('\n')

describe('overrideLedgerProblems', () => {
  it('refuses a bare override that the ledger does not name', () => {
    const problems = overrideLedgerProblems({
      patchText: patch('- insert:\n    - id: ours\n      name: x\n\n- id: vendor-row\n  disabled: true\n'),
      docText: doc(['| `ours` | … |']),
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/overrides "vendor-row" by bare id/)
  })

  it('refuses a ledger row that the patch never declares', () => {
    const problems = overrideLedgerProblems({
      patchText: '- insert:\n    - id: ours\n      name: x\n',
      docText: doc(['| `ghost-row` | … |']),
    })
    expect(problems.join(' ')).toMatch(/lists "ghost-row" but cordis.patch.yml never declares it/)
  })

  it('accepts inserted rows without ledger entries and a covered bare override', () => {
    const problems = overrideLedgerProblems({
      patchText: '- insert:\n    - id: ours\n      name: x\n\n- id: vendor-row\n  disabled: true\n',
      docText: doc(['| `vendor-row` | … |', '| `ours` | … |']),
    })
    expect(problems).toEqual([])
  })

  it('passes on this repository\'s real patch and contract', () => {
    const problems = overrideLedgerProblems({
      patchText: readFileSync(join(repoRoot, 'packages', 'dsh-smart-assistant', 'cordis.patch.yml'), 'utf8'),
      docText: readFileSync(join(repoRoot, 'docs', 'product.md'), 'utf8'),
    })
    expect(problems).toEqual([])
  })
})
