/**
 * Fixtures for the notes/ lifecycle-governance cores
 * (scripts/checks/gates/notes-governance.mjs): naming, top-level shape, state lines,
 * AGENTS.md standing-orders stability, and the 输掉的方案 requirement.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  agentsMdStabilityProblems,
  implementedAlternativesProblems,
  notesNamingProblems,
  notesStateProblems,
  notesTopLevelProblems,
} from '../../../../scripts/checks/gates/notes-governance.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('notesNamingProblems', () => {
  it('accepts date-named notes and README/non-markdown exemptions; rejects other names', () => {
    const notes = temp('notes-')
    for (const sub of ['proposed', 'implemented', 'archived']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-24-a-proposal.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-23-a-decision.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'archived', 'README.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '.gitkeep'), '', 'utf8')
    writeFileSync(join(notes, 'implemented', 'random-jottings.md'), 'x', 'utf8')

    const problems = notesNamingProblems(notes)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('notes/implemented/random-jottings.md')
    expect(problems[0]).toContain('YYYY-MM-DD-topic.md')
  })
})

describe('notesStateProblems', () => {
  const line = (date, word) => `# t\n\n日期：${date} · 状态：**${word}**（说明）\n`

  it('accepts canonical lines whose word matches the directory and the filename date', () => {
    const notes = temp('notes-state-')
    for (const sub of ['proposed', 'implemented', 'archived', 'rejected']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-25-a.md'), line('2026-09-25', 'proposed'), 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-b.md'), line('2026-09-25', 'implemented'), 'utf8')
    writeFileSync(join(notes, 'archived', '2026-09-25-c.md'), line('2026-09-25', 'implemented') + '已归档：2026-09-25（冻结）\n', 'utf8')
    writeFileSync(join(notes, 'rejected', '2026-09-25-d.md'), line('2026-09-25', 'rejected'), 'utf8')

    expect(notesStateProblems(notes)).toEqual([])
  })

  it('rejects a missing line, a wrong directory word, a date mismatch, and an unfrozen archive', () => {
    const notes = temp('notes-state-')
    for (const sub of ['proposed', 'implemented', 'archived']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-25-no-line.md'), '# no state line\n', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-wrong-dir.md'), line('2026-09-25', 'proposed'), 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-date-drift.md'), line('2026-09-24', 'implemented'), 'utf8')
    writeFileSync(join(notes, 'archived', '2026-09-25-unfrozen.md'), line('2026-09-25', 'implemented'), 'utf8')

    const problems = notesStateProblems(notes)
    expect(problems.some(p => p.includes('no-line.md') && p.includes('unreadable'))).toBe(true)
    expect(problems.some(p => p.includes('wrong-dir.md') && p.includes('directory and status must agree'))).toBe(true)
    expect(problems.some(p => p.includes('date-drift.md') && p.includes('filename date'))).toBe(true)
    expect(problems.some(p => p.includes('unfrozen.md') && p.includes('已归档'))).toBe(true)
  })

  it('requires a rejection reason', () => {
    const notes = temp('notes-state-')
    mkdirSync(join(notes, 'rejected'), { recursive: true })
    writeFileSync(join(notes, 'rejected', '2026-09-25-bare.md'), '日期：2026-09-25 · 状态：**rejected**\n', 'utf8')

    const problems = notesStateProblems(notes)
    expect(problems.some(p => p.includes('bare.md') && p.includes('rejection reason'))).toBe(true)
  })
})

describe('notesTopLevelProblems', () => {
  it('accepts the documented lifecycle set and rejects an index, a survey directory, and an undocumented bucket', () => {
    const notes = temp('notes-top-')
    for (const sub of ['proposed', 'implemented', 'rejected', 'archived']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'README.md'), '# map\n', 'utf8')

    expect(notesTopLevelProblems(notes)).toEqual([])

    mkdirSync(join(notes, 'postmortem'), { recursive: true })
    writeFileSync(join(notes, 'scratch.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'INDEX.md'), '# index\n', 'utf8')
    mkdirSync(join(notes, 'archived', 'research'), { recursive: true })
    const problems = notesTopLevelProblems(notes)
    expect(problems.some(p => p.includes('notes/postmortem/'))).toBe(true)
    expect(problems.some(p => p.includes('notes/scratch.md'))).toBe(true)
    expect(problems.some(p => p.includes('notes/INDEX.md'))).toBe(true)
    expect(problems.some(p => p.includes('notes/archived/research/'))).toBe(true)
  })
})

describe('agentsMdStabilityProblems', () => {
  it('accepts standing orders and rejects dates and progress marks', () => {
    const dir = temp('agents-')
    const clean = join(dir, 'AGENTS.md')
    writeFileSync(clean, '## 规则\n- 永远不要碰日用的 ~/.dsh。\n', 'utf8')
    expect(agentsMdStabilityProblems(clean)).toEqual([])

    // A date inside a markdown link target is the sanctioned shape — the gate's own message sends
    // dated records into notes and asks for a link (found 2026-10-10: linking the 0.1.7 migration
    // note tripped the bare regex).
    const linked = join(dir, 'LINKED.md')
    writeFileSync(linked, '## 规则\n- 原始记录在 [迁移 note](notes/archived/2026-09-25-x.md)。\n', 'utf8')
    expect(agentsMdStabilityProblems(linked)).toEqual([])

    const dirty = join(dir, 'DIRTY.md')
    writeFileSync(dirty, '## 规则\n- （用户拍板 2026-09-24）开工即立卡。\n- 队列标记：▶ 可开工。\n', 'utf8')
    const problems = agentsMdStabilityProblems(dirty)
    expect(problems.some(p => p.includes('carries a date'))).toBe(true)
    expect(problems.some(p => p.includes('progress mark'))).toBe(true)
  })

  // The gate shipped as a date-and-emoji regex, so state written as prose walked straight
  // through: snapshots/AGENTS.md carried a whole "harness 状态" section reading "已建"/"仍未建"
  // and stayed green (found 2026-10-08 by a semantic-drift audit). These two fixtures pin both
  // halves of the widened boundary — what must now fail, and what must still pass, because the
  // words alone also appear in real standing orders ("无状态"、"桌面状态"、"TODO/FIXME 不立项").
  it('rejects prose-shaped state: a 状态 section heading, or 已建/未建 verbs', () => {
    const dir = temp('agents-state-')

    const sectionHeading = join(dir, 'section.md')
    writeFileSync(sectionHeading, '## 规则\n- 别碰 ~/.dsh。\n\n## harness 状态（诚实）\n- 都齐了。\n', 'utf8')
    expect(agentsMdStabilityProblems(sectionHeading).some(p => p.includes('state section'))).toBe(true)

    const builtVerb = join(dir, 'built.md')
    writeFileSync(builtVerb, '## 布局\n- harness 已建，比对器在旁边。\n', 'utf8')
    expect(agentsMdStabilityProblems(builtVerb).some(p => p.includes('progress prose'))).toBe(true)

    const unbuiltVerb = join(dir, 'unbuilt.md')
    writeFileSync(unbuiltVerb, '## 布局\n- session 回放仍未建。\n', 'utf8')
    expect(agentsMdStabilityProblems(unbuiltVerb).some(p => p.includes('progress prose'))).toBe(true)
  })

  it('still accepts the same words where they are standing orders, not state', () => {
    const dir = temp('agents-clean-')
    const clean = join(dir, 'AGENTS.md')
    writeFileSync(
      clean,
      [
        '## 一个事实一个家',
        '`AGENTS.md` 只拥有常设指令与路由（无状态、无日期、无进度）；',
        '`deliverables/` 是会话运行现场：桌面状态与临时产物都不提交。',
        '代码里的 `TODO/FIXME` 不立项，只在代码内。',
        '不要把 dev home 里的状态当仓库内容提交。',
        '',
      ].join('\n'),
      'utf8',
    )

    expect(agentsMdStabilityProblems(clean)).toEqual([])
  })
})

describe('implementedAlternativesProblems', () => {
  it('requires 输掉的方案 from the gate date on; grandfathers and English headings pass', () => {
    const implemented = temp('implemented-')
    // Gate date and later: must carry the section (Chinese or English heading both count).
    writeFileSync(join(implemented, '2026-09-25-with-alternatives.md'), '## 决定\n…\n## 输掉的方案\n- b) 慢而稳\n', 'utf8')
    writeFileSync(join(implemented, '2026-09-25-english-heading.md'), '## Decision\n…\n## Alternatives considered\n- b\n', 'utf8')
    writeFileSync(join(implemented, '2026-09-26-bare.md'), '## 决定\n只有决定，没记击败了什么。\n', 'utf8')
    // Before the gate date: grandfathered, shape untouched.
    writeFileSync(join(implemented, '2026-09-24-old-shape.md'), '## 决定\n没有备选节的旧 note。\n', 'utf8')

    const problems = implementedAlternativesProblems(implemented)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('2026-09-26-bare.md')
    expect(problems[0]).toContain('输掉的方案')
    expect(problems[0]).toContain('re-litigation')
  })
})
