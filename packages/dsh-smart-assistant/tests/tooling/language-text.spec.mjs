/**
 * Fixtures for the language and text-hygiene cores
 * (scripts/checks/gates/language-text.mjs).
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  languageGuardProblems,
  textHygieneProblems,
} from '../../../../scripts/checks/gates/language-text.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('languageGuardProblems', () => {
  it('flags CJK outside comments, exempts comment lines, and passes English sources', () => {
    const dir = temp('language-')
    const good = join(dir, 'good.ts')
    writeFileSync(good, "// 中文注释随文件现状（允许）\nexport const message = 'Load the skill first.'\n", 'utf8')
    const bad = join(dir, 'bad.ts')
    writeFileSync(bad, "export const message = '先加载技能'\n", 'utf8')
    const skill = join(dir, 'SKILL.md')
    writeFileSync(skill, '# Title\n\nLoad this before saving.\n', 'utf8')

    const problems = languageGuardProblems([good, bad, skill])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('bad.ts')
    expect(problems[0]).toContain('English')
  })

  it('exempts an HTML-comment vocabulary line in a skill body, but not CJK prose beside it', () => {
    const dir = temp('language-md-')
    const skill = join(dir, 'SKILL.md')
    writeFileSync(skill, [
      '# Title',
      '',
      '<!-- 词汇（用户可见散文）：threads 一律称「在跟的事」 -->',
      'Call threads 「在跟的事」 in prose.',
      '',
    ].join('\n'), 'utf8')
    const problems = languageGuardProblems([skill])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('SKILL.md:4')
    expect(problems[0]).toContain('English')
  })
})

describe('textHygieneProblems', () => {
  it('accepts exact UTF-8 + one newline and rejects missing, doubled, or invalid endings', () => {
    const dir = temp('text-')
    const clean = join(dir, 'clean.md')
    writeFileSync(clean, '# ok\n', 'utf8')
    const noNewline = join(dir, 'no-newline.md')
    writeFileSync(noNewline, '# ok', 'utf8')
    const doubleNewline = join(dir, 'double.md')
    writeFileSync(doubleNewline, '# ok\n\n', 'utf8')
    const invalid = join(dir, 'invalid.md')
    writeFileSync(invalid, Buffer.from([0xff, 0xfe, 0x0a]))

    expect(textHygieneProblems([clean])).toEqual([])
    const problems = textHygieneProblems([noNewline, doubleNewline, invalid])
    expect(problems.some(p => p.includes('no-newline.md') && p.includes('no trailing newline'))).toBe(true)
    expect(problems.some(p => p.includes('double.md') && p.includes('more than one newline'))).toBe(true)
    expect(problems.some(p => p.includes('invalid.md') && p.includes('not valid UTF-8'))).toBe(true)
  })
})
