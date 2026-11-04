/**
 * Fixtures for the code-shape reading (`dev/reports/code-shape.mjs`). The report is an instrument,
 * not a gate: these pin that it counts what it says it counts and that its self-check still
 * detects a known long function and a known decision-heavy function.
 */
import { describe, expect, it } from 'vitest'
import { analyzeSources, renderReport, selfCheck } from '../../../../dev/reports/code-shape.mjs'

const simple = [
  'export function simple(x: number) {',
  '  if (x > 0) return 1',
  '  if (x < 0) return -1',
  '  return 0',
  '}',
].join('\n')

const longBody = Array.from({ length: 70 }, (_, index) => `  const value${index} = ${index}`).join('\n')
const long = `export function longOne() {\n${longBody}\n  return value0\n}`

const sources = [
  { fileName: 'simple.ts', text: simple },
  { fileName: 'long.ts', text: long },
]

describe('analyzeSources', () => {
  it('counts functions, line spans and decision points', () => {
    const result = analyzeSources(sources)
    const simpleRow = result.functions.find(row => row.name === 'simple')
    const longRow = result.functions.find(row => row.name === 'longOne')

    expect(simpleRow?.decisions).toBe(3)
    expect(simpleRow?.lines).toBe(5)
    expect(longRow?.lines).toBeGreaterThan(60)
    expect(result.functions).toHaveLength(2)
  })

  it('keeps a nested function out of its parent decision count', () => {
    const nested = 'export function outer() {\n  function inner(x: number) {\n    if (x > 0) return 1\n    if (x < 0) return -1\n    return 0\n  }\n  return 0\n}'
    const result = analyzeSources([{ fileName: 'nested.ts', text: nested }])

    expect(result.functions.find(row => row.name === 'outer')?.decisions).toBe(1)
    expect(result.functions.find(row => row.name === 'inner')?.decisions).toBe(3)
  })
})

describe('renderReport', () => {
  it('prints counts and rankings without a grade', () => {
    const text = renderReport(analyzeSources(sources), { top: 3 })

    expect(text).toContain('function-like nodes')
    expect(text).toContain('>10 decisions')
    expect(text).toContain('读数不是门禁')
    expect(text).not.toContain('PASS')
    expect(text).not.toContain('FAIL')
  })
})

describe('selfCheck', () => {
  it('accepts the synthetic fixture', () => {
    expect(selfCheck(() => {})).toBe(0)
  })
})
