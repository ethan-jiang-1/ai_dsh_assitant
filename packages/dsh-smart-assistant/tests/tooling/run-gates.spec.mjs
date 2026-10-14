/**
 * The ordered verify runner reports every check, contains check exceptions, and returns the
 * CLI exit code without changing output order or summary wording.
 */
import { describe, expect, it } from 'vitest'
import { runChecks } from '../../../../scripts/checks/run-gates.mjs'

describe('verify gate runner', () => {
  it('runs every check in declaration order and reports a clean summary', () => {
    const visited = []
    const output = []
    const exitCode = runChecks([
      { name: 'first', run: () => { visited.push('first'); return [] } },
      { name: 'second', run: () => { visited.push('second'); return [] } },
    ], line => output.push(line))

    expect(visited).toEqual(['first', 'second'])
    expect(exitCode).toBe(0)
    expect(output).toEqual([
      '  ok   first',
      '  ok   second',
      '',
      'verify: 2 checks passed',
    ])
  })

  it('reports returned problems and thrown checks, continues, and exits nonzero', () => {
    const visited = []
    const output = []
    const exitCode = runChecks([
      { name: 'bad', run: () => { visited.push('bad'); return ['first problem', 'second problem'] } },
      { name: 'throws', run: () => { visited.push('throws'); throw new Error('broken check') } },
      { name: 'last', run: () => { visited.push('last'); return [] } },
    ], line => output.push(line))

    expect(visited).toEqual(['bad', 'throws', 'last'])
    expect(exitCode).toBe(1)
    expect(output).toEqual([
      '  FAIL bad',
      '         first problem',
      '         second problem',
      '  FAIL throws',
      '         check threw: broken check',
      '  ok   last',
      '',
      'verify: 2 of 3 checks failed',
    ])
  })
})
