/**
 * Threshold retirement (tri-line proposal 2026-09-24, slice 1c; D4: 30d stale / 90d archived,
 * configurable): the usage ledger from slice 1a becomes an exit. Curate names the candidates and
 * `retire_skill` is the door — the bundle moves out of the provider's scan into `skills/archive/`,
 * stamped with when and why it died, and nothing is deleted.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../src/index.ts'
import { scaffoldHome, homePaths } from '../src/home/layout.ts'
import { scanLearnedSkills, scanSkillArchiveScale } from '../src/skills/scan.ts'
import { SNAPSHOTS_DIRECTORY_NAME } from '../src/skills/snapshot.ts'

const OLD_LEARNED_AT = '2026-06-15T00:00:00.000Z'

describe('skills scanner over an archived room', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  it('skips the archive directory and reads metadata.learnedAt', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-retire-scan-'))
    dirs.push(dir)
    const paths = homePaths(dir)
    await scaffoldHome(paths)
    // An archived bundle: retired stamp, no SKILL.md directly under skills/archive/.
    const { mkdirSync, writeFileSync } = await import('node:fs')
    mkdirSync(join(paths.skillsArchiveDir, 'dead-skill'), { recursive: true })
    writeFileSync(join(paths.skillsArchiveDir, 'dead-skill', 'SKILL.md'), [
      '---',
      'name: dead-skill',
      'description: gone',
      'metadata:',
      '  origin: learned',
      `  learnedAt: ${OLD_LEARNED_AT}`,
      '  retiredAt: 2026-09-24T00:00:00.000Z',
      '---',
      '',
      'body',
      '',
    ].join('\n'), 'utf8')

    const scan = await scanLearnedSkills(paths.skillsDir)
    expect(scan.skills).toEqual([])
    expect(scan.failures).toEqual([])

    // The scaffold created the archive directory, and the layout owns its path.
    expect(existsSync(paths.skillsArchiveDir)).toBe(true)
  })

  it('counts retired bundles and snapshot files, ignoring layout and stray files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-archive-scale-'))
    dirs.push(dir)
    const paths = homePaths(dir)
    await scaffoldHome(paths)
    const { mkdirSync, writeFileSync } = await import('node:fs')
    // One retired bundle, one retired flat skill, one snapshot file (plus a non-snapshot stray).
    mkdirSync(join(paths.skillsArchiveDir, 'dead-skill'), { recursive: true })
    writeFileSync(join(paths.skillsArchiveDir, 'dead-skill', 'SKILL.md'), 'body', 'utf8')
    writeFileSync(join(paths.skillsArchiveDir, 'flat-skill.md'), 'body', 'utf8')
    mkdirSync(join(paths.skillsArchiveDir, SNAPSHOTS_DIRECTORY_NAME, 'dead-skill'), { recursive: true })
    writeFileSync(
      join(paths.skillsArchiveDir, SNAPSHOTS_DIRECTORY_NAME, 'dead-skill', '2026-09-24T00-00-00-000Z.md'),
      'old wording',
      'utf8',
    )
    writeFileSync(
      join(paths.skillsArchiveDir, SNAPSHOTS_DIRECTORY_NAME, 'dead-skill', 'notes.txt'),
      'not a snapshot',
      'utf8',
    )

    expect(await scanSkillArchiveScale(paths.skillsArchiveDir)).toEqual({ retiredBundles: 2, snapshots: 1 })
    // An empty archive (a fresh scaffold, nothing retired yet) reports zero scale.
    expect(await scanSkillArchiveScale(join(dir, 'nowhere'))).toEqual({ retiredBundles: 0, snapshots: 0 })
  })
})

describe('retireSkill (service)', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function boot(): AssistantMemory {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-retire-'))
    dirs.push(dir)
    return new AssistantMemory(new Context(), { dataDir: dir })
  }

  it('moves a bundle to the archive, stamps the corpse, and drops it from the room', async () => {
    const service = boot()
    await service.writeSkill({ name: 'dead-skill', description: 'gone soon', body: 'steps' })
    await service.recordSkillLoad('dead-skill')

    const retired = await service.retireSkill('dead-skill', 'test retirement')

    expect(existsSync(retired.path)).toBe(true)
    expect(retired.path).toContain(join('skills', 'archive', 'dead-skill'))
    const stamped = readFileSync(retired.path, 'utf8')
    expect(stamped).toContain('retiredAt:')
    expect(stamped).toContain('retireReason: test retirement')
    expect(stamped).toContain('learnedAt:')

    // Out of the room, out of the scan — and nothing was deleted.
    expect(await service.learnedSkillNames()).toEqual([])
    expect((await scanLearnedSkills(service.paths.skillsDir)).failures).toEqual([])
    expect(existsSync(join(service.paths.skillsDir, 'dead-skill'))).toBe(false)
  })

  it('rejects unknown names, invalid names, and double retirement', async () => {
    const service = boot()
    await service.writeSkill({ name: 'once-only', description: 'x', body: 'steps' })

    await expect(service.retireSkill('missing-skill')).rejects.toThrow('no learned skill')
    await expect(service.retireSkill('Not A Name')).rejects.toThrow('not a valid skill name')
    await service.retireSkill('once-only')
    await expect(service.retireSkill('once-only')).rejects.toThrow('already archived')
  })

  it('reports the archive scale in the curation brief', async () => {
    const service = boot()
    // A fresh home: nothing retired, nothing snapshotted.
    expect(await service.curate()).toMatchObject({ counts: { retiredSkillBundles: 0, skillSnapshots: 0 } })

    // Two writes of one name: the second snapshots the first wording; retirement archives the bundle.
    await service.writeSkill({ name: 'dead-skill', description: 'gone soon', body: 'first wording' })
    await service.writeSkill({ name: 'dead-skill', description: 'gone soon', body: 'second wording' })
    await service.retireSkill('dead-skill', 'test retirement')

    expect(await service.curate()).toMatchObject({ counts: { retiredSkillBundles: 1, skillSnapshots: 1 } })
  })

  it('retires a flat-file skill to a flat archive copy', async () => {
    const service = boot()
    await service.ensureHome()
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(service.paths.skillsDir, 'flat-skill.md'), [
      '---',
      'name: flat-skill',
      'description: flat shape',
      'metadata:',
      '  origin: learned',
      `  learnedAt: ${OLD_LEARNED_AT}`,
      '---',
      '',
      'flat body',
      '',
    ].join('\n'), 'utf8')

    const retired = await service.retireSkill('flat-skill')
    expect(retired.path).toBe(join(service.paths.skillsArchiveDir, 'flat-skill.md'))
    expect(existsSync(join(service.paths.skillsDir, 'flat-skill.md'))).toBe(false)
    expect(readFileSync(retired.path, 'utf8')).toContain('retiredAt:')
  })
})
