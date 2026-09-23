/**
 * The home layout is the contract every other module derives its paths from, so these tests pin the
 * path set and the two scaffold guarantees: create what is missing, never overwrite a hand edit.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { homePaths, scaffoldHome } from '../src/home/layout.ts'

const roots: string[] = []

async function fixtureHome(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'assistant-layout-'))
  roots.push(root)
  return join(root, 'assistant')
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('homePaths', () => {
  it('derives every room and archive from the root', () => {
    const paths = homePaths('/home/assistant')
    expect(paths.root).toBe('/home/assistant')
    expect(paths.mapFile).toBe('/home/assistant/HOME.md')
    expect(paths.memoryDir).toBe('/home/assistant/memory')
    expect(paths.memoryArchiveDir).toBe('/home/assistant/memory/archive')
    expect(paths.researchDir).toBe('/home/assistant/research')
    expect(paths.researchArchiveDir).toBe('/home/assistant/research/archive')
    expect(paths.skillsDir).toBe('/home/assistant/skills')
    expect(paths.skillsArchiveDir).toBe('/home/assistant/skills/archive')
    // The knowledge room has no archive on purpose: OKF deprecates in place so links resolve.
    expect(paths.knowledgeDir).toBe('/home/assistant/knowledge')
    expect(Object.keys(paths).includes('knowledgeArchiveDir')).toBe(false)
  })
})

describe('scaffoldHome', () => {
  it('creates every room, the archives, and the map', async () => {
    const root = await fixtureHome()
    const paths = homePaths(root)
    const result = await scaffoldHome(paths)

    expect(result.mapWritten).toBe(true)
    for (const directory of [
      paths.root,
      paths.memoryDir,
      paths.memoryArchiveDir,
      paths.researchDir,
      paths.researchArchiveDir,
      paths.skillsDir,
      paths.skillsArchiveDir,
      paths.knowledgeDir,
    ]) {
      expect(existsSync(directory)).toBe(true)
    }
    const map = await readFile(paths.mapFile, 'utf8')
    expect(map).toContain('# Your home')
    expect(map).toContain('research/')
    expect(map).toContain('knowledge/')
    expect(map).toContain(root)
  })

  it('is idempotent and reports nothing created on a second run', async () => {
    const paths = homePaths(await fixtureHome())
    await scaffoldHome(paths)
    const second = await scaffoldHome(paths)

    expect(second.createdDirectories).toEqual([])
    expect(second.mapWritten).toBe(false)
  })

  it('never overwrites a hand-edited map', async () => {
    const paths = homePaths(await fixtureHome())
    await scaffoldHome(paths)
    await writeFile(paths.mapFile, '# my own map\n', 'utf8')

    const result = await scaffoldHome(paths)

    expect(result.mapWritten).toBe(false)
    expect(await readFile(paths.mapFile, 'utf8')).toBe('# my own map\n')
  })
})
