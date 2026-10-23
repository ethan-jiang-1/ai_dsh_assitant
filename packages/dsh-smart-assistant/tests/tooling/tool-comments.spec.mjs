/**
 * Fixtures for the tool-comment gate core (scripts/checks/gates/tool-comments.mjs):
 * comment names must exist in the catalog; row ids and prose are out of scope.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { describe, expect, it } from 'vitest'
import { toolCommentNameProblems } from '../../../../scripts/checks/gates/tool-comments.mjs'

const catalog = [
  '| `assistant_memory` | `save` | src/agent/tool-memory/index.ts |',
  '| `assistant_operating` | `desk` | src/agent/tool-operating/index.ts |',
].join('\n')

describe('toolCommentNameProblems', () => {
  it('accepts a comment that names a catalog tool', () => {
    expect(toolCommentNameProblems({
      yamlText: '# 经营事项必须走 assistant_operating',
      catalogText: catalog,
    })).toEqual([])
  })

  it('rejects a comment that names a tool the catalog does not have (the class the 2026-10-23 audit found)', () => {
    const problems = toolCommentNameProblems({
      yamlText: '# 经营事项必须走 assistant_operations',
      catalogText: catalog,
    })
    expect(problems.join(' ')).toContain('assistant_operations')
    expect(problems.join(' ')).toContain('outlived the tool')
  })

  it('ignores non-comment YAML lines (row ids and prose are not a second list)', () => {
    expect(toolCommentNameProblems({
      yamlText: [
        '  - id: assistant-memory-tool',
        '    name: dsh-smart-assistant/tool-memory',
        '    description: assistant_unknown is prose, not a list',
      ].join('\n'),
      catalogText: catalog,
    })).toEqual([])
  })

  it('reports an unreadable catalog shape instead of passing silently', () => {
    expect(toolCommentNameProblems({
      yamlText: '# assistant_memory',
      catalogText: 'no table here',
    })).toHaveLength(1)
  })
})
