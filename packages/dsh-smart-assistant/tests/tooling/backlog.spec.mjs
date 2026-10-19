/**
 * Fixtures for the _backlog/ governance cores
 * (scripts/checks/gates/backlog.mjs): card liveness, graduation, and the graduated-status
 * vocabulary.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  GRADUATED_STATUS,
  graduatedProposalProblems,
  backlogGraduationProblems,
  backlogLivenessProblems,
} from '../../../../scripts/checks/gates/backlog.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('backlogLivenessProblems', () => {
  function bootBacklog(dir) {
    for (const sub of ['issues', 'bugs', 'research', 'methods', join('_archive', 'settled_issues'), join('_archive', 'suspended_issues'), join('_archive', 'fixed_bugs'), join('_archive', 'suspended_bugs'), join('_archive', 'research')]) {
      mkdirSync(join(dir, sub), { recursive: true })
    }
    writeFileSync(join(dir, 'issues', 'README.md'), '# issues\n\n| 卡 | 一句话 | 倾向 |\n|---|---|---|\n', 'utf8')
    writeFileSync(join(dir, 'bugs', 'README.md'), '# bugs\n\n| Bug | 标题 | 严重级 | 发现 |\n|---|---|---|---|\n', 'utf8')
    writeFileSync(join(dir, 'research', 'README.md'), '# research\n', 'utf8')
    writeFileSync(join(dir, 'methods', 'README.md'), '# methods\n', 'utf8')
    for (const pool of ['settled_issues', 'suspended_issues', 'fixed_bugs', 'suspended_bugs', 'research']) {
      writeFileSync(join(dir, '_archive', pool, 'README.md'), `# ${pool}\n`, 'utf8')
    }
    writeFileSync(join(dir, '_archive', 'README.md'), '# _archive\n', 'utf8')
  }

  it('accepts a live backlog: hukou lines present, every card indexed', () => {
    const backlog = temp('backlog-ok-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'issues', '260928-demo.md'),
      '---\nstatus: 推敲中\nopened: 2026-09-28\n---\n\n# 推敲：demo\n\n> 立卡：2026-09-28 ｜ 状态：推敲中｜下一步 = 想清楚\n', 'utf8')
    writeFileSync(join(backlog, 'issues', 'README.md'),
      '| 卡 |\n|---|\n| [260928-demo.md](260928-demo.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('rejects a dead draft (no status line) and an unindexed card, and a missing pool', () => {
    const backlog = temp('backlog-red-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'issues', '260928-dead.md'), '# 推敲：死稿\n\n没有状态行。\n', 'utf8')
    writeFileSync(join(backlog, 'issues', '260928-live.md'),
      '# 推敲：活卡\n\n> 状态：推敲中\n', 'utf8')
    writeFileSync(join(backlog, 'bugs', 'BUG-008-unlisted.md'),
      '# BUG-008：漏登\n\n> 状态：排查中\n', 'utf8')
    const problems = backlogLivenessProblems(backlog)
    expect(problems.some(p => p.includes('260928-dead.md') && p.includes('frontmatter'))).toBe(true)
    expect(problems.some(p => p.includes('260928-live.md') && p.includes('index'))).toBe(true)
    expect(problems.some(p => p.includes('bugs/BUG-008-unlisted.md') && p.includes('bugs/README.md'))).toBe(true)

    rmSync(join(backlog, '_archive', 'suspended_issues'), { recursive: true, force: true })
    expect(backlogLivenessProblems(backlog).some(p => p.includes('_archive/suspended_issues'))).toBe(true)
  })

  it('rejects research material missing from its index', () => {
    const backlog = temp('backlog-ref-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'research', '260928-survey.md'),
      '---\ntopic: 定位\nintent: "补一条还没进索引的调研"\n---\n\n# 调研材料\n', 'utf8')
    expect(backlogLivenessProblems(backlog).some(p => p.includes('260928-survey.md') && p.includes('index'))).toBe(true)
    writeFileSync(join(backlog, 'research', 'README.md'), '# research\n\n| 文件 |\n|---|\n| [260928-survey.md](260928-survey.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('walks topic subdirectories: subdir material must be named by its subpath, else red', () => {
    const backlog = temp('backlog-refsub-')
    bootBacklog(backlog)
    mkdirSync(join(backlog, 'research', 'tech-exploration'), { recursive: true })
    writeFileSync(join(backlog, 'research', 'tech-exploration', '261005-case.md'),
      '---\ntopic: 技术\nintent: "先看 DSH 自己已经有的能力"\n---\n\n# 技术定调\n', 'utf8')
    expect(backlogLivenessProblems(backlog).some(p => p.includes('tech-exploration/261005-case.md') && p.includes('index'))).toBe(true)
    writeFileSync(join(backlog, 'research', 'README.md'), '# research\n\n| 文件 |\n|---|\n| [261005-case.md](tech-exploration/261005-case.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('rejects a theme subdirectory whose topic word disagrees with the registered directory name', () => {
    const backlog = temp('backlog-topic-')
    bootBacklog(backlog)
    mkdirSync(join(backlog, 'research', 'self-update'), { recursive: true })
    writeFileSync(join(backlog, 'research', 'self-update', '261019-lanes.md'),
      '---\ntopic: 技术\nintent: "写错了主题词"\n---\n\n# 自更新\n', 'utf8')
    writeFileSync(join(backlog, 'research', 'README.md'), '# research\n\n| 文件 |\n|---|\n| [261019-lanes.md](self-update/261019-lanes.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog).some(p => p.includes('self-update/261019-lanes.md') && p.includes('自更新'))).toBe(true)
    writeFileSync(join(backlog, 'research', 'self-update', '261019-lanes.md'),
      '---\ntopic: 自更新\nintent: "写对了主题词"\n---\n\n# 自更新\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('rejects an archived card missing from its pool index', () => {
    const backlog = temp('backlog-arch-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, '_archive', 'settled_issues', '260928-gone.md'),
      '# 推敲：已毕业\n\n> 状态：已关闭\n', 'utf8')
    writeFileSync(join(backlog, '_archive', 'fixed_bugs', 'BUG-008-gone.md'),
      '# BUG-008：已修\n\n> 状态：fixed\n', 'utf8')
    expect(backlogLivenessProblems(backlog).some(p => p.includes('260928-gone.md') && p.includes('_archive/settled_issues/README.md'))).toBe(true)
    expect(backlogLivenessProblems(backlog).some(p => p.includes('BUG-008-gone.md') && p.includes('_archive/fixed_bugs/README.md'))).toBe(true)
  })

  // ── 2026-10-12 backlog-process-made-explicit：bug 四值生命周期 + 镜像法 + 「毕业：」闭头 ──

  it('accepts the bug lifecycle vocabulary mirroring frontmatter (排查中/修复就绪/修复落地/等人拍板)', () => {
    const backlog = temp('backlog-lifecycle-')
    bootBacklog(backlog)
    const statuses = ['排查中', '修复就绪', '修复落地', '等人拍板']
    const rows = []
    for (const [i, status] of statuses.entries()) {
      writeFileSync(join(backlog, 'bugs', `BUG-01${i}-lane.md`),
        `---\nstatus: ${status}\nseverity: P1\nopened: 2026-10-12\n---\n\n# BUG-01${i}：车道\n\n> 严重级别：P1｜发现：2026-10-12｜状态：${status}｜下一步 = 按翻转表走\n`, 'utf8')
      rows.push(`| [BUG-01${i}-lane.md](BUG-01${i}-lane.md) |`)
    }
    writeFileSync(join(backlog, 'bugs', 'README.md'),
      `# bugs\n\n| Bug |\n|---|\n${rows.join('\n')}\n`, 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('rejects the retired 活跃 value, a status line that forks from the frontmatter, and a head with no 状态 line', () => {
    const backlog = temp('backlog-mirror-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'bugs', 'BUG-012-retired.md'),
      '---\nstatus: 活跃\nseverity: P2\nopened: 2026-10-12\n---\n\n# BUG-012：旧词\n\n> 严重级别：P2｜发现：2026-10-12｜状态：活跃\n', 'utf8')
    writeFileSync(join(backlog, 'issues', '260928-fork.md'),
      '---\nstatus: 推敲中\nopened: 2026-09-28\n---\n\n# 推敲：分叉\n\n> 立卡：2026-09-28 ｜ 状态：等人拍板\n', 'utf8')
    writeFileSync(join(backlog, 'issues', '260928-bare.md'),
      '---\nstatus: 推敲中\nopened: 2026-09-28\n---\n\n# 推敲：无行\n\n没有状态行。\n', 'utf8')
    const problems = backlogLivenessProblems(backlog)
    expect(problems.some(p => p.includes('BUG-012-retired.md') && p.includes('not a status of this shelf'))).toBe(true)
    expect(problems.some(p => p.includes('260928-fork.md') && p.includes('mirrors'))).toBe(true)
    expect(problems.some(p => p.includes('260928-bare.md') && p.includes('no 状态： line'))).toBe(true)
  })

  it('accepts a closed 毕业 head, rejects a wild one, and leaves archived heads exempt', () => {
    const backlog = temp('backlog-leaning-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'issues', '260928-head-ok.md'),
      '---\nstatus: 推敲中\nopened: 2026-09-28\n---\n\n# 推敲：好头\n\n> 立卡：2026-09-28 ｜ 状态：推敲中 ｜ 毕业：做现在（等终验）\n', 'utf8')
    writeFileSync(join(backlog, 'issues', '260928-head-wild.md'),
      '---\nstatus: 推敲中\nopened: 2026-09-28\n---\n\n# 推敲：野头\n\n> 立卡：2026-09-28 ｜ 状态：推敲中 ｜ 毕业：尽快\n', 'utf8')
    // The archive's dated 毕业 record predates the closed head; the mirror law and the
    // closed-head check must not reach it (shelf + frontmatter already pin it).
    writeFileSync(join(backlog, '_archive', 'settled_issues', '260928-old.md'),
      '---\nstatus: 已结\nopened: 2026-09-28\n---\n\n# 推敲：旧毕业\n\n> 状态：已毕业 ｜ 毕业：2026-09-29 用户拍板 A\n', 'utf8')
    writeFileSync(join(backlog, 'issues', 'README.md'),
      '| 卡 |\n|---|\n| [260928-head-ok.md](260928-head-ok.md) |\n| [260928-head-wild.md](260928-head-wild.md) |\n', 'utf8')
    writeFileSync(join(backlog, '_archive', 'settled_issues', 'README.md'),
      '# settled_issues\n\n| 卡 |\n|---|\n| [260928-old.md](260928-old.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([expect.stringContaining('260928-head-wild.md')])
  })
})

describe('backlogGraduationProblems', () => {
  function bootPlans(dir) {
    mkdirSync(join(dir, 'issues'), { recursive: true })
    writeFileSync(join(dir, 'issues', 'README.md'), '# issues\n\n| 卡 |\n|---|\n', 'utf8')
  }
  const card = (dir, name, statusLine) =>
    writeFileSync(join(dir, 'issues', name), `# 推敲：demo\n\n> ${statusLine}\n`, 'utf8')

  it('accepts cards whose gate is still open, including the honest human-pending shape', () => {
    const backlog = temp('grad-ok-')
    bootPlans(backlog)
    card(backlog, '261007-waiting.md', '立卡：2026-10-07 ｜ 状态：推敲中｜毕业门判断 = **该做，四片全交付**｜**剩毕业门最后一环：用户终验**')
    card(backlog, '261007-input.md', '立卡：2026-10-07 ｜ 状态：推敲中｜毕业门判断 = 待定｜下一步 = 合成诉求')
    card(backlog, '261007-trigger.md', '立卡：2026-10-07 ｜ 状态：推敲中｜毕业门判断 = 待触发（30 天判据）')
    card(backlog, '261007-reserved.md', '立卡：2026-10-07 ｜ 状态：推敲中｜毕业门判断 = 待用户判触发（🔒）')
    card(backlog, '261007-dropped.md', '立卡：2026-10-07 ｜ 状态：推敲中｜毕业门判断 = 倾向放弃')
    expect(backlogGraduationProblems(backlog)).toEqual([])
  })

  it('rejects a card that declares its gate passed (毕业门 = 已过) but stays on the active shelf', () => {
    const backlog = temp('grad-gate-')
    bootPlans(backlog)
    card(backlog, '261007-split.md', '立卡：2026-10-07 ｜ 状态：**S1+S2 已交付**｜毕业门 = 已过（S2 活体门有一项如实阻断）｜下一步 = 另立修复')
    const problems = backlogGraduationProblems(backlog)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('261007-split.md')
    expect(problems[0]).toContain('_archive/settled_issues')
  })

  it.each(['可关闭：是', '**可关闭：** 是', '关闭条件 = 已满足', '关闭条件判断 = 已通过'])(
    'rejects an active issue declaring closure in common wording: %s', (closure) => {
      const backlog = temp('closure-done-')
      bootPlans(backlog)
      card(backlog, '261010-ready.md', `立卡：2026-10-10 ｜ 状态：推敲中 ｜ ${closure}`)
      expect(backlogGraduationProblems(backlog)).toHaveLength(1)
    },
  )

  it.each(['可关闭：否', '可关闭：是非未定', '可关闭：是否取决于用户', '关闭条件 = 待确认', '可关闭：否 ｜ 关闭条件 = 尚未满足'])(
    'accepts unresolved closure wording: %s', (closure) => {
      const backlog = temp('closure-open-')
      bootPlans(backlog)
      card(backlog, '261010-open.md', `立卡：2026-10-10 ｜ 状态：推敲中 ｜ ${closure}`)
      expect(backlogGraduationProblems(backlog)).toEqual([])
    },
  )

  it('ignores closure declarations quoted in the discussion below the header', () => {
    const backlog = temp('closure-quote-')
    bootPlans(backlog)
    writeFileSync(join(backlog, 'issues', '261010-quote.md'),
      `# 推敲：demo\n\n> 立卡：2026-10-10 ｜ 状态：推敲中 ｜ 可关闭：否\n${'\n'.repeat(12)}## 历史讨论\n\n旧记录写“可关闭：是”，本轮证据不足。\n`, 'utf8')
    expect(backlogGraduationProblems(backlog)).toEqual([])
  })

  it('rejects a status field that is itself a completion word', () => {
    const backlog = temp('grad-status-')
    bootPlans(backlog)
    card(backlog, '261007-done.md', '立卡：2026-10-07 ｜ 状态：**已毕业**｜下一步 = 归档')
    expect(backlogGraduationProblems(backlog).some(p => p.includes('261007-done.md'))).toBe(true)
  })

  it('does not red-line partial delivery: 已交付 must terminate the status field to count', () => {
    const backlog = temp('grad-partial-')
    bootPlans(backlog)
    // S1 落地、S2 未动——这是活跃卡，不是毕业卡。旧写法（[^｜]*已交付）会误杀它。
    card(backlog, '261007-half.md', '立卡：2026-10-07 ｜ 状态：**S1 已交付，S2 进行中**｜毕业门判断 = 待定')
    expect(backlogGraduationProblems(backlog)).toEqual([])
  })

  it('reports the active-index residue and ignores completion talk below the hukou band', () => {
    const backlog = temp('grad-band-')
    bootPlans(backlog)
    card(backlog, '261007-indexed.md', '立卡：2026-10-07 ｜ 状态：**已毕业**｜下一步 = 归档')
    writeFileSync(join(backlog, 'issues', 'README.md'),
      '# issues\n\n| 卡 |\n|---|\n| [261007-indexed.md](261007-indexed.md) |\n', 'utf8')
    expect(backlogGraduationProblems(backlog)[0]).toContain('active list')

    // 正文深处引用一个"已过"的门不构成毕业：只读 hukou 段（前 12 行）。
    const deep = temp('grad-deep-')
    bootPlans(deep)
    writeFileSync(join(deep, 'issues', '261007-deep.md'),
      `# 推敲：demo\n\n> 立卡：2026-10-07 ｜ 状态：推敲中｜毕业门判断 = 待定\n${'\n'.repeat(12)}## 证据面\n\nS1 的毕业门 = 已过，S2 待定。\n`, 'utf8')
    expect(backlogGraduationProblems(deep)).toEqual([])
  })
})

describe('graduatedProposalProblems', () => {
  it('accepts notes still on the shelf and flags one that already says it is done', () => {
    expect(graduatedProposalProblems({
      files: [{ where: 'notes/proposed/a.md', text: '日期：2026-10-16 · 状态：**proposed**（等点头）' }],
    })).toEqual([])
    const problems = graduatedProposalProblems({
      files: [{ where: 'notes/proposed/b.md', text: '日期：2026-10-16 · 状态：**implemented**' }],
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('notes/proposed/b.md says it is done')
    expect(problems[0]).toContain('graduate it to notes/implemented/')
  })

  it('reads the status through the same words as the shelf gate, and reports every offender', () => {
    const problems = graduatedProposalProblems({
      files: [
        { where: 'notes/proposed/c.md', text: '日期：2026-10-16 · 状态：**已毕业**' },
        { where: 'notes/proposed/d.md', text: '日期：2026-10-16 · 状态：**rejected**（原因）' },
        { where: 'notes/proposed/e.md', text: '日期：2026-10-16 · 状态：**proposed**' },
      ],
    })
    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('notes/proposed/c.md')
    expect(problems[1]).toContain('notes/proposed/d.md')
  })
})

describe('GRADUATED_STATUS', () => {
  it('matches every known completion word and no in-progress wording', () => {
    for (const done of ['状态：**已全部实施', '状态：**已消化', '状态：**已毕业', '状态：**已完成', '状态：**已实施', '状态：**implemented', '状态：**rejected', '状态：**archived']) {
      expect(GRADUATED_STATUS.test(done)).toBe(true)
    }
    for (const pending of ['状态：**待接手实施', '状态：**部分实施', '状态：**proposed', '状态：**调研中', '待接手实施']) {
      expect(GRADUATED_STATUS.test(pending)).toBe(false)
    }
  })
})
