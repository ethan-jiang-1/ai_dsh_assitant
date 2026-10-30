/**
 * Fixtures for the dev-tree drawer and research-index cores
 * (scripts/checks/gates/dev-tree.mjs). Pure inputs, no fixtures on disk.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  devDrawerCoverageProblems,
  researchSubdirProblems,
} from '../../../../scripts/checks/gates/dev-tree.mjs'

describe('devDrawerCoverageProblems', () => {
  const drawerText = [
    '| `env/` | 启动器 |',
    '| `probes/session/` · `probes/web/` | 探针 |',
    '| `harness-home/` · `trial-home*/` | 忽略的运行数据 |',
  ].join('\n')

  it('flags a first-level dev/ entry the drawer map never names', () => {
    const problems = devDrawerCoverageProblems({ entries: ['env', 'mystery-tool'], drawerText })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('mystery-tool')
  })

  it('covers path-prefix rows, bare names and `<stem>*` globs, and exempts the doorplate itself', () => {
    const problems = devDrawerCoverageProblems({
      entries: ['env', 'probes', 'trial-home', 'trial-home-30d', 'harness-home', 'AGENTS.md', '.DS_Store'],
      drawerText,
    })
    expect(problems).toEqual([])
  })
})

describe('researchSubdirProblems', () => {
  it('flags a theme dir holding no tracked material (the claimed-active empty shell class)', () => {
    const problems = researchSubdirProblems({
      subdirs: ['positioning', 'tech-exploration'],
      readmeText: '当前在档 `positioning/`、`usage/`',
      trackedRelPaths: ['README.md', 'positioning/261008-ceo-value-review.md', 'usage/261011-input-observation.md'],
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('tech-exploration')
    expect(problems[0]).toContain('no tracked material')
  })

  it('flags a material-bearing theme dir the README never names', () => {
    const problems = researchSubdirProblems({
      subdirs: ['positioning', 'usage'],
      readmeText: '当前在档 `positioning/`',
      trackedRelPaths: ['positioning/261005-a.md', 'usage/261011-input-observation.md'],
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('usage')
    expect(problems[0]).toContain('does not name')
  })

  it('accepts the index matching the tree', () => {
    const problems = researchSubdirProblems({
      subdirs: ['positioning', 'usage'],
      readmeText: '当前在档 `positioning/`、`usage/`',
      trackedRelPaths: ['README.md', 'positioning/261005-a.md', 'usage/261011-input-observation.md'],
    })
    expect(problems).toEqual([])
  })

  // The same core runs on both shelves since 2026-10-30; the message must name the shelf it
  // actually read, or an archive drift would send the reader to the active index.
  it('names the shelf it checked, so the archive run points at the archive index', () => {
    const problems = researchSubdirProblems({
      subdirs: ['261019-self-update'],
      readmeText: '# 已归档的研究题\n',
      trackedRelPaths: ['261019-self-update/261019-self-update-lanes.md'],
      where: '_backlog/_archive/research/README.md',
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('_backlog/_archive/research/README.md')
    expect(problems[0]).toContain('261019-self-update')
  })
})
