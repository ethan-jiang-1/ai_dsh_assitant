/**
 * The home layout is the contract every other module derives its paths from, so these tests pin the
 * path set and the scaffold guarantees: create what is missing, never overwrite a hand edit —
 * for both root files (the AGENTS.md manual and the SOUL.md identity).
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { homePaths, scaffoldHome } from '../../src/home/layout.ts'
import { DEFAULT_SOUL, SOUL_FILE_NAME } from '../../src/home/soul.ts'
import { AGENTS_FILE_NAME, HOME_MANUAL_VERSION } from '../../src/home/home-map.ts'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

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
    expect(manual).toContain('# Your working folder — operating manual')
    expect(manual).toContain('## Past conversations')
    expect(manual).toContain('knowledge-craft')
    expect(manual).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
    // The closing contract (eval-found 2026-09-28, Q8): bookkeeping must not eat the answer.
    expect(manual).toContain('Bookkeeping is not an answer')
    expect(manual).toContain('answers the principal\u0027s last question in full')
    expect(manual).toContain('research/')
    expect(manual).toContain('knowledge/')
    // The manual is owner data seeded once — it must stay portable: the layout tree roots at a
    // symbolic placeholder, and the machine's absolute path never gets baked in (a moved home
    // would otherwise leave the model reading and writing the old location; observed 2026-10-01).
    expect(manual).toContain('<working-folder>/')
    expect(manual).not.toContain(root)
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

  // Both faces that tell the assistant where its past sessions live ship in the model's context
  // (the manual section and the curated skill body). Naming one writer generation — `session.v3`
  // while the pinned harness wrote v4 — makes the assistant open a file that is not there, and a
  // missing log reads as "no logs", not as an error. The generation is not ours to pin.
  it('names the session-log file without pinning a writer generation, in both model-facing faces', async () => {
    const paths = homePaths(await fixtureHome())
    await scaffoldHome(paths)
    const manual = await readFile(paths.agentsFile, 'utf8')
    const recallSkill = await readFile(
      join(packageRoot, 'presets', 'assistant', 'skills', 'session-recall', 'SKILL.md'),
      'utf8',
    )

    for (const [face, text] of [['manual', manual], ['session-recall skill', recallSkill]] as const) {
      expect(text, `${face} must name the log as session.v<n>.jsonl.zstd`).toContain('session.v<n>.jsonl.zstd')
      expect(text, `${face} must not pin a writer generation`).not.toMatch(/session\.v\d+\.jsonl\.zstd/u)
    }
  })
})
