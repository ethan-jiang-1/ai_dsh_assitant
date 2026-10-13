/**
 * Fixtures for the identity and composition cores
 * (scripts/checks/gates/identity-composition.mjs). Uses the family namespace import;
 * every core it asserts lives in that one module.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as gateCores from '../../../../scripts/checks/gates/identity-composition.mjs'

describe('identity names: docs/identity.md and the code agree in both directions', () => {
  const patchText = [
    '- insert:',
    '    - id: assistant-memory',
    '      name: dsh-smart-assistant',
    '    - id: preset-assistant',
    "      name: '@deepseek-ai/dsh-agent-preset'",
    '      config:',
    '        plugins:',
    '          - id: assistant-learn',
    '            name: dsh-smart-assistant/learn',
  ].join('\n')
  const srcSources = { 'tool-memory/index.ts': "name: 'assistant_memory'" }

  it('accepts an identity page that names exactly the mounted rows and declared tools', () => {
    const identity = [
      '# 身份与命名',
      '| 2 | 插件行 id（前缀 `assistant-`） | `assistant-memory`（host）<br>`assistant-learn`（agent） | 无强制文法 | patch | overlay 落空 |',
      '| 3 | ctx 服务键 | `assistantMemory` |',
      '| 4 | 工具 wire 名 | `assistant_memory` |',
    ].join('\n')
    expect(gateCores.identityNameProblems({ patchText, avatars: srcSources, identityText: identity })).toEqual([])
  })

  it('goes red when a mounted row is absent from the identity page (the forward direction that already existed)', () => {
    const identity = [
      '| 2 | 插件行 id | `assistant-memory`（host） |',
      '| 3 | ctx 服务键 | `assistantMemory` |',
      '| 4 | 工具 wire 名 | `assistant_memory` |',
    ].join('\n')
    const problems = gateCores.identityNameProblems({ patchText, avatars: srcSources, identityText: identity })
    expect(problems.some(problem => problem.includes('assistant-learn') && problem.includes('not in docs/identity.md'))).toBe(true)
  })

  it('goes red when the identity page keeps a row id the patch no longer mounts (the reverse gap)', () => {
    const identity = [
      '| 2 | 插件行 id | `assistant-memory`（host）<br>`assistant-learn`（agent）<br>`assistant-dead-row`（agent；已改名，死 id 留存） |',
      '| 3 | ctx 服务键 | `assistantMemory` |',
      '| 4 | 工具 wire 名 | `assistant_memory` |',
    ].join('\n')
    const problems = gateCores.identityNameProblems({ patchText, avatars: srcSources, identityText: identity })
    expect(problems.some(problem => problem.includes('assistant-dead-row'))).toBe(true)
  })

  it('goes red for a tool wire name the sources no longer declare, and accepts prose inside the id cell', () => {
    const staleTool = [
      '| 2 | 插件行 id | `assistant-memory`（host）<br>`assistant-learn`（agent） |',
      '| 3 | ctx 服务键 | `assistantMemory` |',
      '| 4 | 工具 wire 名 | `assistant_memory`、`assistant_gone` |',
    ].join('\n')
    const problems = gateCores.identityNameProblems({ patchText, avatars: srcSources, identityText: staleTool })
    expect(problems.some(problem => problem.includes('assistant_gone'))).toBe(true)

    // The cell carries non-row vocabulary in backticks (prefix, dataDir, config keys) and an
    // unannotated counter-example; none of it is a claim, so none of it may red the check.
    const wordy = [
      '| 2 | 插件行 id（前缀 `assistant-`） | `assistant-memory`（host；独立 `assistant-operating` dataDir，`denyToolPrefix` 三 config 键）<br>`assistant-learn`（agent；工具与段落行，`inject` 无）——不要写成 `assistant-Memory` 或 `assistant-memory-tool` |',
      '| 3 | ctx 服务键 | `assistantMemory`（其他插件的 inject 都引用它） |',
      '| 4 | 工具 wire 名 | `assistant_memory`（唯一动词 recall/save/forget/list/curate） |',
    ].join('\n')
    expect(gateCores.identityNameProblems({ patchText, avatars: srcSources, identityText: wordy })).toEqual([])
  })

  it('fails loud when the identity page declares no row ids at all', () => {
    const empty = ['# 身份与命名', '| 2 | 插件行 id | （待补） |', '| 3 | ctx 服务键 | `assistantMemory` |', '| 4 | 工具 wire 名 | `assistant_memory` |'].join('\n')
    const problems = gateCores.identityNameProblems({ patchText, avatars: srcSources, identityText: empty })
    expect(problems.some(problem => problem.includes('declares no') && problem.includes('assistant-'))).toBe(true)
  })
})

describe('package subpaths: every patch that references our package names a real export', () => {
  const exported = { './tool-memory': {}, './preset-runner': {} }

  it('accepts dev and bundle patches that reference exported subpaths', () => {
    const sources = [
      { file: 'cordis.patch.yml', text: "          - id: assistant-memory-tool\n            name: dsh-smart-assistant/tool-memory\n" },
      { file: 'dev/probes/session/preset-runner.patch.yml', text: "    - id: assistant-preset-runner\n      name: dsh-smart-assistant/preset-runner\n" },
    ]
    expect(gateCores.packageSubpathProblems({ sources, exported })).toEqual([])
  })

  it('goes red when a DEV patch references a subpath package.json does not export', () => {
    // The audited gap: the exports check read only cordis.patch.yml, which never references
    // `preset-runner` — so renaming that export broke every dev runner with verify still green.
    const sources = [
      { file: 'cordis.patch.yml', text: "            name: dsh-smart-assistant/tool-memory\n" },
      { file: 'dev/probes/session/preset-runner.patch.yml', text: "      name: dsh-smart-assistant/preset-runner-gone\n" },
    ]
    const problems = gateCores.packageSubpathProblems({ sources, exported })
    expect(problems.some(problem => problem.includes('preset-runner-gone') && problem.includes('preset-runner.patch.yml'))).toBe(true)
  })

  it('goes red for the bundle patch too, and reads quoted and bare names alike', () => {
    const sources = [
      { file: 'cordis.patch.yml', text: "      name: 'dsh-smart-assistant/tool-ghost'\n" },
      { file: 'dev/probes/session/recall-probe.patch.yml', text: '      name: dsh-smart-assistant/tool-memory\n' },
    ]
    const problems = gateCores.packageSubpathProblems({ sources, exported })
    expect(problems.some(problem => problem.includes('tool-ghost') && problem.includes('cordis.patch.yml'))).toBe(true)
    expect(problems.filter(problem => problem.includes('tool-memory')).length).toBe(0)
  })

  it('does not mistake another package, a bare import or a doc path for our subpath', () => {
    const sources = [{
      file: 'cordis.patch.yml',
      text: [
        "      name: '@deepseek-ai/dsh-agent-preset'",
        "      name: 'other-package/tool-memory'",
        '      # see packages/dsh-smart-assistant/src/agent/tool-memory/index.ts',
        "      name: 'dsh-smart-assistant/tool-memory'",
      ].join('\n'),
    }]
    expect(gateCores.packageSubpathProblems({ sources, exported })).toEqual([])
  })

  it('fails loud when no patch references the package at all', () => {
    const problems = gateCores.packageSubpathProblems({ sources: [{ file: 'cordis.patch.yml', text: 'nothing here\n' }], exported })
    expect(problems.some(problem => problem.includes('no patch references'))).toBe(true)
  })
})

describe('composition rows: architecture §二 plane trees and the bundle patch agree', () => {
  /** A §二 slice with the tree lines given; §三 follows so the slice boundary is exercised. */
  const archWith = (...treeLines) =>
    [
      '# 架构（当前合同）',
      '## 二、两个平面（DSH 的组合纪律）',
      '```text',
      ...treeLines,
      '```',
      '## 三、部件与 owner 面',
      '（§三正文提到 assistant-memory 不算进树：树才是组合的picture。）',
    ].join('\n')

  const greenPatch = [
    '- insert:',
    '    - id: assistant-memory',
    '      name: dsh-smart-assistant',
    '    - id: preset-assistant',
    "      name: '@deepseek-ai/dsh-agent-preset'",
    '      config:',
    '        id: assistant',
    '        plugins:',
    '          - id: assistant-learn',
    '            name: dsh-smart-assistant/learn',
    '          - id: skill-filesystem',
    "            name: '@deepseek-ai/dsh-skill-filesystem'",
  ].join('\n')
  const growPatchWithDeskProjection = patch =>
    patch.replace(
      '    - id: preset-assistant',
      '    - id: assistant-desk-projection\n      name: dsh-smart-assistant/desk-projection\n    - id: preset-assistant',
    )
  const greenTrees = archWith(
    'HOST 面',
    '└── assistant-memory        服务：working folder',
    'AGENT 面',
    '├── assistant-learn            工具 assistant_reflect',
    '├── skill-filesystem           策展技能',
  )

  it('accepts a patch whose mounted rows are exactly the rows the §二 trees name', () => {
    expect(gateCores.compositionRowProblems({ patchText: greenPatch, architectureText: greenTrees })).toEqual([])
  })

  it('goes red when the composition grows and the hand-copied tree stays short (the audited drift class)', () => {
    const problems = gateCores.compositionRowProblems({
      patchText: growPatchWithDeskProjection(greenPatch),
      architectureText: greenTrees,
    })
    expect(problems.some(problem => problem.includes('assistant-desk-projection') && problem.includes('§二'))).toBe(true)
  })

  it('goes red when a tree names a row the patch no longer mounts, including vendor rows and an indented "+ row" line', () => {
    const ghost = archWith('HOST 面', '└── assistant-memory        服务', '+ assistant-ghost 行（不再存在）', 'AGENT 面', '├── assistant-learn            工具')
    expect(gateCores.compositionRowProblems({ patchText: greenPatch, architectureText: ghost }).some(problem => problem.includes('assistant-ghost'))).toBe(true)

    const phantom = archWith('HOST 面', '└── assistant-memory        服务', '    + tool-phantom 行（vendor 现货）', 'AGENT 面', '├── assistant-learn            工具')
    expect(gateCores.compositionRowProblems({ patchText: greenPatch, architectureText: phantom }).some(problem => problem.includes('tool-phantom'))).toBe(true)
  })

  it('counts the indented "+ row" continuation shape the real HOST tree uses', () => {
    const indented = archWith(
      'HOST 面',
      '└── assistant-memory        服务：working folder',
      '                            + assistant-desk-projection 行（固定只读投影）',
      'AGENT 面',
      '├── assistant-learn            工具 assistant_reflect',
      '├── skill-filesystem           策展技能',
    )
    expect(gateCores.compositionRowProblems({ patchText: growPatchWithDeskProjection(greenPatch), architectureText: indented })).toEqual([])
  })

  it('counts only the §二 fenced trees — mentions elsewhere are not the composition picture', () => {
    const mentionedOutside = [
      '# 架构（当前合同）',
      '## 一、判据',
      '```text',
      '└── assistant-memory        服务',
      '```',
      '## 二、两个平面（DSH 的组合纪律）',
      '```text',
      'HOST 面（正文提到 assistant-memory 不算进树）',
      '（树为空）',
      '```',
      '## 三、部件与 owner 面',
    ].join('\n')
    const problems = gateCores.compositionRowProblems({ patchText: greenPatch, architectureText: mentionedOutside })
    expect(problems.some(problem => problem.includes('assistant-memory'))).toBe(true)
    expect(problems.some(problem => problem.includes('assistant-learn'))).toBe(true)
  })

  it('fails loud when the §二/§三 slice cannot be found at all', () => {
    const renamed = '# 架构（当前合同）\n## 二 两个平面\n```text\n└── assistant-memory\n```\n## 三 部件\n'
    const problems = gateCores.compositionRowProblems({ patchText: greenPatch, architectureText: renamed })
    expect(problems.some(problem => problem.includes('§二') && problem.includes('§三'))).toBe(true)
  })
})
