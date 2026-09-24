/**
 * The home layout is the contract every other module derives its paths from, so these tests pin the
 * path set and the scaffold guarantees: create what is missing, never overwrite a hand edit —
 * for both root files (the AGENTS.md manual and the SOUL.md identity).
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { homePaths, scaffoldHome } from '../src/home/layout.ts'
import { DEFAULT_SOUL, SOUL_FILE_NAME } from '../src/home/soul.ts'
import { AGENTS_FILE_NAME, HOME_MANUAL_VERSION } from '../src/home/home-map.ts'

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
    expect(paths.agentsFile).toBe(`/home/assistant/${AGENTS_FILE_NAME}`)
    expect(paths.soulFile).toBe(`/home/assistant/${SOUL_FILE_NAME}`)
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
  it('creates every room, the archives, the manual, and the identity file', async () => {
    const root = await fixtureHome()
    const paths = homePaths(root)
    const result = await scaffoldHome(paths)

    expect(result.manualWritten).toBe(true)
    expect(result.soulWritten).toBe(true)
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
    const manual = await readFile(paths.agentsFile, 'utf8')
    expect(manual).toContain('# Your home — operating manual')
    expect(manual).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
    expect(manual).toContain('research/')
    expect(manual).toContain('knowledge/')
    expect(manual).toContain(root)
    // The identity seed is the built-in default: day 0 the voice is exactly the shipped one.
    expect(await readFile(paths.soulFile, 'utf8')).toBe(`${DEFAULT_SOUL}\n`)
  })

  it('is idempotent and reports nothing created on a second run', async () => {
    const paths = homePaths(await fixtureHome())
    await scaffoldHome(paths)
    const second = await scaffoldHome(paths)

    expect(second.createdDirectories).toEqual([])
    expect(second.manualWritten).toBe(false)
    expect(second.soulWritten).toBe(false)
  })

  it('never overwrites a hand-edited manual or identity', async () => {
    const paths = homePaths(await fixtureHome())
    await scaffoldHome(paths)
    await writeFile(paths.agentsFile, '# my own manual\n', 'utf8')
    await writeFile(paths.soulFile, 'my own voice\n', 'utf8')

    const result = await scaffoldHome(paths)

    expect(result.manualWritten).toBe(false)
    expect(result.soulWritten).toBe(false)
    expect(await readFile(paths.agentsFile, 'utf8')).toBe('# my own manual\n')
    expect(await readFile(paths.soulFile, 'utf8')).toBe('my own voice\n')
  })
})
