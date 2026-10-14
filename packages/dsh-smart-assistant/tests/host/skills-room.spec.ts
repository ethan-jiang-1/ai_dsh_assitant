/**
 * The Host learned-skill name read path: use only the skills directory capability, preserve
 * scanner ordering, and keep retired bundles outside the active names.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { learnedSkillNames } from '../../src/host/skills-room.ts'
import { dirPool } from '../support/host-harness.ts'

const mkRoot = dirPool('assistant-skill-names-')

function writeSkill(path: string, name: string): void {
  mkdirSync(join(path, name), { recursive: true })
  writeFileSync(join(path, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name}\n---\n\n${name} instructions\n`, 'utf8')
}

describe('learnedSkillNames', () => {
  it('lists active bundle and flat names through the skills-directory-only reader', async () => {
    const skillsDir = join(mkRoot(), 'skills')
    writeSkill(skillsDir, 'zeta-bundle')
    writeFileSync(join(skillsDir, 'alpha-flat.md'), '---\nname: alpha-flat\ndescription: flat\n---\n\nFlat instructions\n', 'utf8')
    writeSkill(join(skillsDir, 'archive'), 'retired-skill')

    const names = await learnedSkillNames({ paths: { skillsDir } })

    expect(names).toEqual(['alpha-flat', 'zeta-bundle'])
  })
})
