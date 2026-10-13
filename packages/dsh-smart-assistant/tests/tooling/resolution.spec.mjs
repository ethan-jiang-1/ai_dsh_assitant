/**
 * Fixtures for the resolution and gate-wiring cores
 * (scripts/checks/gates/resolution.mjs). The wiring fixture imports the verify-checks BARREL
 * on purpose: exportedCores must be the full wired surface — a family-only namespace would
 * weaken the every-core-is-invoked assertion it exists to make.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  gateWiringProblems,
  notesNamingProblems,
  notesStateProblems,
} from '../../../../scripts/checks/gates/resolution.mjs'
import * as gateCores from '../../../../scripts/checks/verify-checks.mjs'

describe('project references accept pinned face leaves only in their owning package', () => {
  it('accepts root/Host/Client references and rejects a sibling or arbitrary config', () => {
    const owner = '/fixture/vendor/connection'
    expect(gateCores.projectReferenceMatches(owner, [owner])).toBe(true)
    expect(gateCores.projectReferenceMatches(owner, [join(owner, 'tsconfig.host.json')])).toBe(true)
    expect(gateCores.projectReferenceMatches(owner, [join(owner, 'tsconfig.client.json')])).toBe(true)
    expect(gateCores.projectReferenceMatches(owner, ['/fixture/vendor/other/tsconfig.host.json'])).toBe(false)
    expect(gateCores.projectReferenceMatches(owner, [join(owner, 'unrelated.json')])).toBe(false)
    expect(gateCores.projectReferenceMatches(owner, [])).toBe(false)
  })
})

describe('gateWiringProblems', () => {
  const verifySource = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'scripts', 'checks', 'verify.mjs'), 'utf8')
  const functionCores = () => Object.entries(gateCores).filter(([, value]) => typeof value === 'function')

  it('accepts the real runner: every exported function core is invoked in the body', () => {
    expect(gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource })).toEqual([])
  })

  it('accepts namespace-style wiring: one body call per core, no named imports', () => {
    // The shape this gate must not false-positive (the first draft's occurrence-count rule did):
    // a core called once via the namespace runs — it is wired.
    const source = functionCores().map(([name]) => `checks.push(gateCores.${name}(...))`).join('\n')
    expect(gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource: source })).toEqual([])
  })

  it('flags a core reduced to its import line (call sites erased) as an unwired gate', () => {
    const name = 'notesNamingProblems'
    const first = verifySource.indexOf(name)
    const head = verifySource.slice(0, first + name.length)
    const tail = verifySource.slice(first + name.length).replaceAll(name, '')
    const problems = gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource: head + tail })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(name)
    expect(problems[0]).toContain('never invoked in the body')
  })

  it('flags a core named nowhere in the runner', () => {
    const name = 'notesStateProblems'
    const problems = gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource: verifySource.replaceAll(name, '') })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(name)
    expect(problems[0]).toContain('never invoked in the body')
  })

  it('reports an empty core module rather than passing silently', () => {
    expect(gateCores.gateWiringProblems({ exportedCores: {}, verifySource }).join(' ')).toContain('no functions')
  })
})
