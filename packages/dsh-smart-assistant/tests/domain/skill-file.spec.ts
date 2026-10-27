/**
 * The skill file contract decides whether a lesson is discoverable at all. The name grammar is copied
 * from the harness registry, so the first test is a parity guard: if the registry changes its rule,
 * this fails rather than silently producing skills the loader ignores.
 */

import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  LEARNED_ORIGIN,
  SKILL_NAME_PATTERN,
  isSkillName,
  renderSkillFile,
  validateSkillDraft,
  writeLearnedSkill,
} from '../../src/domain/skills/skill-file.ts'
import { parseFrontmatterDocument } from '../../src/domain/home/frontmatter.ts'
import { scanLearnedSkills } from '../../src/domain/skills/scan.ts'
import type { SkillDraft } from '../../src/domain/skills/skill-file.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function draft(overrides: Partial<SkillDraft> = {}): SkillDraft {
  return {
    name: 'staging-reset',
    description: 'Use when the staging database needs a reset before a deploy rehearsal.',
    body: '1. Announce in #staging.\n2. Run the reset script.\n3. Verify the seed data landed.',
    ...overrides,
  }
}

describe('skill name grammar', () => {
  it('matches the harness registry rule', () => {
    // Kept identical to SKILL_NAME in vendor/dsh/packages/skill/skill/src/index.ts.
    expect(SKILL_NAME_PATTERN.source).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$')
    expect(isSkillName('staging-reset')).toBe(true)
    expect(isSkillName('Staging_Reset')).toBe(false)
    expect(isSkillName('staging--reset')).toBe(false)
  })
})

describe('validateSkillDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateSkillDraft(draft())).toEqual([])
  })

  it('names the reason a draft would be ignored or useless', () => {
    expect(validateSkillDraft(draft({ name: 'Bad Name' })).join(' ')).toMatch(/kebab-case/)
    expect(validateSkillDraft(draft({ description: '  ' })).join(' ')).toMatch(/description is required/)
    expect(validateSkillDraft(draft({ body: '   ' })).join(' ')).toMatch(/body is required/)
  })
})

describe('renderSkillFile', () => {
  it('stamps provenance so a learned skill is distinguishable from a curated one', () => {
    const text = renderSkillFile(draft({ source: 'session-7', learnedAt: '2026-09-23T10:00:00.000Z' }))
    const parsed = parseFrontmatterDocument(text)

    expect(parsed?.data.name).toBe('staging-reset')
    expect(parsed?.data.metadata).toEqual({
      origin: LEARNED_ORIGIN,
      source: 'session-7',
      learnedAt: '2026-09-23T10:00:00.000Z',
    })
  })
})

describe('writeLearnedSkill', () => {
  it('writes a bundle the scanner reads back with its provenance', async () => {
    const skillsDir = await mkdtemp(join(tmpdir(), 'assistant-skills-'))
    roots.push(skillsDir)

    const written = await writeLearnedSkill(skillsDir, draft({ source: 'session-7' }))

    expect(written.path).toBe(join(skillsDir, 'staging-reset', 'SKILL.md'))
    expect(await readFile(written.path, 'utf8')).toContain('origin: learned')
    const scan = await scanLearnedSkills(skillsDir)
    expect(scan.failures).toEqual([])
    expect(scan.skills).toEqual([{ dirName: 'staging-reset', name: 'staging-reset', description: draft().description, origin: LEARNED_ORIGIN, source: 'session-7' }])
  })

  it('refuses a draft that would not be discovered', async () => {
    const skillsDir = await mkdtemp(join(tmpdir(), 'assistant-skills-'))
    roots.push(skillsDir)

    await expect(writeLearnedSkill(skillsDir, draft({ name: 'Not Valid' }))).rejects.toThrow(/kebab-case/)
  })

  it('replaces an existing skill atomically with an owner-only file', async () => {
    const skillsDir = await mkdtemp(join(tmpdir(), 'assistant-skills-'))
    roots.push(skillsDir)

    const first = await writeLearnedSkill(skillsDir, draft({ body: 'first procedure' }))
    const second = await writeLearnedSkill(skillsDir, draft({ body: 'second procedure' }))

    expect(second.path).toBe(first.path)
    expect(await readFile(second.path, 'utf8')).toContain('second procedure')
    expect((await stat(second.path)).mode & 0o777).toBe(0o600)
    // The atomic writer's sibling temp is gone after a successful rename; a leftover would mean
    // the next reader can see a half-written skill.
    expect((await readdir(join(skillsDir, 'staging-reset'))).filter(name => name.endsWith('.tmp'))).toEqual([])
  })
})

describe('scanLearnedSkills', () => {
  it('reports a bundle whose frontmatter the loader would ignore', async () => {
    const skillsDir = await mkdtemp(join(tmpdir(), 'assistant-skills-'))
    roots.push(skillsDir)
    await writeLearnedSkill(skillsDir, draft({ name: 'broken', body: 'x' }))
    await rm(join(skillsDir, 'broken', 'SKILL.md'))
    await rm(join(skillsDir, 'broken'), { recursive: true })

    const scan = await scanLearnedSkills(skillsDir)

    expect(scan.skills).toEqual([])
    expect(scan.failures).toEqual([])
  })
})
