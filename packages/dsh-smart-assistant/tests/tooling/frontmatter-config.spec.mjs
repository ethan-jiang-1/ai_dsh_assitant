/**
 * Fixtures for the frontmatter-contract and config-parse cores
 * (scripts/checks/gates/frontmatter-config.mjs).
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  configParseProblems,
  playbookFrontmatterProblems,
  skillFrontmatterProblems,
} from '../../../../scripts/checks/gates/frontmatter-config.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('skillFrontmatterProblems', () => {
  it('accepts a well-formed bundle and flags a name/directory mismatch, a missing description, and a missing file', () => {
    const dir = temp('skills-')
    mkdirSync(join(dir, 'good-skill'), { recursive: true })
    writeFileSync(join(dir, 'good-skill', 'SKILL.md'), '---\nname: good-skill\ndescription: does a thing\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'wrong-name'), { recursive: true })
    writeFileSync(join(dir, 'wrong-name', 'SKILL.md'), '---\nname: other-name\ndescription: x\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'no-description'), { recursive: true })
    writeFileSync(join(dir, 'no-description', 'SKILL.md'), '---\nname: no-description\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'empty-bundle'), { recursive: true })

    const problems = skillFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('good-skill'))).toBe(false)
    expect(problems.some(p => p.includes('declares name other-name'))).toBe(true)
    expect(problems.some(p => p.includes('has no description'))).toBe(true)
    expect(problems.some(p => p.includes('empty-bundle/ has no SKILL.md'))).toBe(true)
  })

  // The shape that hid two curated skills (2026-09-25): present on disk, absent from the catalog,
  // `skill <name>` answering "unknown" — a plain scalar with an inner `: ` is a YAML parse error,
  // which a line-scanning gate cannot see. The loader skips such a file with a warning only.
  it('rejects frontmatter the loader would silently skip, not just a wrong name', () => {
    const dir = temp('skills-')
    mkdirSync(join(dir, 'inner-colon'), { recursive: true })
    writeFileSync(join(dir, 'inner-colon', 'SKILL.md'),
      '---\nname: inner-colon\ndescription: ok\nwhenToUse: the execution shape: who does what by when\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'legacy-invocation'), { recursive: true })
    writeFileSync(join(dir, 'legacy-invocation', 'SKILL.md'),
      '---\nname: legacy-invocation\ndescription: ok\ndisableModelInvocation: true\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'non-boolean-invocation'), { recursive: true })
    writeFileSync(join(dir, 'non-boolean-invocation', 'SKILL.md'),
      '---\nname: non-boolean-invocation\ndescription: ok\nuser-invocable: maybe\n---\n\nbody\n', 'utf8')

    const problems = skillFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('inner-colon') && p.includes('not parsable YAML'))).toBe(true)
    expect(problems.some(p => p.includes('uses unsupported "disableModelInvocation"'))).toBe(true)
    expect(problems.some(p => p.includes('sets "user-invocable" to a non-boolean value'))).toBe(true)
  })
})

describe('playbookFrontmatterProblems', () => {
  // The staging area's shape is flat `<name>.md`, which the bundle-shaped core above cannot reach.
  // The area is this project's long-lived method home (not a serving skill home), so a draft's
  // frontmatter is checked where it lives — failing only "later" means failing when trusted.
  it('accepts a SKILL-shaped draft and flags a basename/name mismatch, missing description, and missing frontmatter', () => {
    const dir = temp('playbooks-')
    writeFileSync(join(dir, 'good-playbook.md'),
      '---\nname: good-playbook\ndescription: does a thing\nwhenToUse: when doing the thing\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'misnamed.md'),
      '---\nname: something-else\ndescription: x\nwhenToUse: y\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'no-description.md'),
      '---\nname: no-description\nwhenToUse: y\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'no-when-to-use.md'),
      '---\nname: no-when-to-use\ndescription: x\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'naked.md'), '# no frontmatter at all\n', 'utf8')
    // The area's own account book is not a playbook and must not be judged as one.
    writeFileSync(join(dir, 'README.md'), '# the area index\n', 'utf8')

    const problems = playbookFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('good-playbook'))).toBe(false)
    expect(problems.some(p => p.includes('README.md'))).toBe(false)
    expect(problems.some(p => p.includes('misnamed.md') && p.includes('declares name'))).toBe(true)
    expect(problems.some(p => p.includes('no-description.md') && p.includes('has no description'))).toBe(true)
    expect(problems.some(p => p.includes('no-when-to-use.md') && p.includes('has no whenToUse'))).toBe(true)
    expect(problems.some(p => p.includes('naked.md') && p.includes('does not start with frontmatter'))).toBe(true)
  })

  it('rejects YAML the loader would skip, the same way the serving homes do', () => {
    const dir = temp('playbooks-')
    writeFileSync(join(dir, 'inner-colon.md'),
      '---\nname: inner-colon\ndescription: ok\nwhenToUse: the execution shape: who does what\n---\n\nbody\n', 'utf8')

    const problems = playbookFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('inner-colon.md') && p.includes('not parsable YAML'))).toBe(true)
  })

  it('treats an absent staging directory as no problems (the area is optional)', () => {
    expect(playbookFrontmatterProblems(join(temp('playbooks-'), 'never-created'))).toEqual([])
  })
})

describe('configParseProblems', () => {
  it('accepts a resolvable !!js scalar and rejects a plain scalar starting with a backtick', () => {
    const dir = temp('config-')
    const good = join(dir, 'good.yml')
    writeFileSync(good, 'task: !!js ctx.headlessStartup.task\n', 'utf8')
    const bad = join(dir, 'bad.yml')
    writeFileSync(bad, 'task: !!js `prefix${ctx.headlessStartup.task}`\n', 'utf8')

    expect(configParseProblems([good])).toEqual([])
    const problems = configParseProblems([bad])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('does not parse as YAML')
  })
})
