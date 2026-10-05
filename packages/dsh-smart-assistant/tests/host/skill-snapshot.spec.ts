/**
 * Pre-overwrite snapshots (tri-line proposal 2026-09-24, slice 1f): replacing a learned skill
 * is the one mutation that can lose its previous wording, so the old file is copied aside
 * before the write, newest few kept, restorable by hand.
 */

import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import { SNAPSHOTS_DIRECTORY_NAME, SNAPSHOTS_KEPT, snapshotExistingSkill } from '../../src/skills/snapshot.ts'

describe('snapshotExistingSkill (pure core)', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function room(): { root: string, skillsDir: string, skillsArchiveDir: string } {
    const root = mkdtempSync(join(tmpdir(), 'assistant-snapshot-'))
    dirs.push(root)
    return { root, skillsDir: join(root, 'skills'), skillsArchiveDir: join(root, 'skills', 'archive') }
  }

  it('returns undefined for a skill that does not exist yet (first write overwrites nothing)', async () => {
    const { skillsDir, skillsArchiveDir } = room()
    expect(await snapshotExistingSkill(skillsDir, skillsArchiveDir, 'fresh-skill')).toBeUndefined()
  })

  it('snapshots an existing bundle before it is overwritten, keeping only the newest few', async () => {
    const { root, skillsDir, skillsArchiveDir } = room()
    const service = new AssistantMemory(new Context(), { dataDir: root })
    // Seed the room with one skill, then overwrite it SNAPSHOTS_KEPT + 1 times.
    await service.writeSkill({ name: 'evolving-skill', description: 'v0', body: 'version zero' })
    for (let version = 1; version <= SNAPSHOTS_KEPT + 1; version += 1) {
      await service.writeSkill({ name: 'evolving-skill', description: `v${version}`, body: `version ${version}` })
    }
    const snapshotDir = join(skillsArchiveDir, SNAPSHOTS_DIRECTORY_NAME, 'evolving-skill')
    const kept = readdirSync(snapshotDir).filter(name => name.endsWith('.md')).sort()
    expect(kept).toHaveLength(SNAPSHOTS_KEPT)

    // The written skill is the newest version; snapshots hold older wording, newest last.
    const current = readFileSync(join(skillsDir, 'evolving-skill', 'SKILL.md'), 'utf8')
    expect(current).toContain('version 4')
    const oldest = readFileSync(join(snapshotDir, kept[0] ?? ''), 'utf8')
    expect(oldest).toContain('version 1')
    expect(oldest).not.toContain('version 0') // pruned: only the newest few survive

    // The write result reports where the snapshot landed.
    const again = await service.writeSkill({ name: 'evolving-skill', description: 'v5', body: 'version 5' })
    expect(again.snapshot).toContain(join('archive', SNAPSHOTS_DIRECTORY_NAME, 'evolving-skill'))

    // The room scan stays clean: snapshots never surface as skills or failures.
    const names = await service.learnedSkillNames()
    expect(names).toEqual(['evolving-skill'])
    const clean = await service.curate()
    expect(clean.findings.filter(finding => finding.code.startsWith('skill-'))).toEqual([])
  })

  it('snapshots a flat-file skill too', async () => {
    const { skillsDir, skillsArchiveDir } = room()
    const { mkdirSync } = await import('node:fs')
    mkdirSync(skillsDir, { recursive: true })
    writeFileSync(join(skillsDir, 'flat-skill.md'), '---\nname: flat-skill\ndescription: x\n---\n\nflat body\n', 'utf8')
    const snapshot = await snapshotExistingSkill(skillsDir, skillsArchiveDir, 'flat-skill')
    expect(snapshot).toContain(join('archive', SNAPSHOTS_DIRECTORY_NAME, 'flat-skill'))
    expect(readFileSync(snapshot ?? '', 'utf8')).toContain('flat body')
  })
})
