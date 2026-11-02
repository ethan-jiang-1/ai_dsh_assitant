/**
 * Fixtures for the distribution-surface cores (scripts/checks/gates/distribution.mjs): the retired
 * vocabulary gate and the release-charter shape gate.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it (same
 * contract as the other tooling specs). Each core gets a passing fixture and a failing one — the
 * guard only guards if the regression fails it.
 */
import { describe, expect, it } from 'vitest'
import { releaseCharterProblems, retiredTermProblems } from '../../../../scripts/checks/gates/distribution.mjs'

describe('retiredTermProblems', () => {
  it('accepts prose that names the objects in DSH vocabulary', () => {
    const files = [{ path: 'docs/x.md', text: 'bundle 装进 custom profile；专用 home 是部署选项；入口行 assistant-product。' }]
    expect(retiredTermProblems({ files })).toEqual([])
  })

  it('reports each retired compound with its line', () => {
    const files = [{ path: 'docs/x.md', text: '第一行\n产品 profile 与 产品行 都是退休词\n产品 home' }]
    const problems = retiredTermProblems({ files })
    expect(problems).toHaveLength(3)
    expect(problems[0]).toContain('docs/x.md:2')
    expect(problems[0]).toContain('产品 profile')
    expect(problems[2]).toContain('产品 home')
  })

  it('skips the registry row so the term list can name the terms it retires', () => {
    const files = [{ path: 'docs/release.md', text: '| 退役 | 产品 profile、产品 home <!-- term-policy: 登记行 --> |' }]
    expect(retiredTermProblems({ files })).toEqual([])
  })
})

const VALID_CHARTER = [
  '## 一、六轴 owner',
  '| **运行时** | x |',
  '| **profile** | x |',
  '| **patch 层** | x |',
  '| **app surface** | x |',
  '| **home 与数据** | x |',
  '| **生命周期** | x |',
  '## 七、生命周期十段（索引，不是展开）',
  '| 打包 | x |',
  '| 发布 | x |',
  '| 安装 | x |',
  '| 初始化 | x |',
  '| 特殊初始化 | x |',
  '| 配置 | x |',
  '| 启动 | x |',
  '| 更新 | x |',
  '| 卸载 | x |',
  '| 文档 | x |',
].join('\n')

describe('releaseCharterProblems', () => {
  it('accepts a charter that keeps both tables whole', () => {
    expect(releaseCharterProblems({ text: VALID_CHARTER })).toEqual([])
  })

  it('reports a lost axis and a lost stage', () => {
    const text = VALID_CHARTER.replace('| **app surface** | x |\n', '').replace('| 卸载 | x |\n', '')
    const problems = releaseCharterProblems({ text })
    expect(problems.some(problem => problem.includes('app surface'))).toBe(true)
    expect(problems.some(problem => problem.includes('卸载'))).toBe(true)
  })

  it('reports a charter that lost the sections entirely', () => {
    const problems = releaseCharterProblems({ text: '# 发布\n\n只有散文。' })
    expect(problems).toContain('docs/release.md lost its six-axis owner section')
    expect(problems).toContain('docs/release.md lost its lifecycle index section')
  })
})
