/**
 * Behavior of the expert assembly shared by `pnpm expert-setup` and the shipped bin.
 *
 * Locks the data-side contract: fresh default soul, legacy migration only for the exact old
 * seed, owner edits untouched, seed pages as drafts with deterministic ids/provenance, and
 * re-imports preserving stable/deprecated status. Runs against temp dirs; no DSH runtime.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assembleExpertHome } from '../../src/cli/expert-setup.ts'
import { parseFrontmatterDocument } from '../../src/domain/home/frontmatter.ts'
import { DEFAULT_SOUL, LEGACY_GENERIC_SOUL } from '../../src/domain/home/soul.ts'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

const NOW = new Date('2026-01-02T03:04:05.000Z')

function seedFixture(body = '# Lens\n\nFacts need provenance.\n') {
  const seedDir = join(temp('expert-seeds-'), 'management')
  mkdirSync(seedDir, { recursive: true })
  writeFileSync(join(seedDir, 'lens.md'), `<!-- sources: handbook -->\n${body}`, 'utf8')
  return seedDir
}

function pageOf(path) {
  const document = parseFrontmatterDocument(readFileSync(path, 'utf8'))
  if (document === undefined) throw new Error(`not a frontmatter page: ${path}`)
  return document
}

describe('assembleExpertHome', () => {
  it('seeds the management soul, imports seeds as drafts, and records deterministic provenance', async () => {
    const dataDir = temp('expert-data-')
    const seedsDir = seedFixture()
    const result = await assembleExpertHome({ dataDir, seedsDir, now: NOW })

    expect(result.soul).toBe('seeded')
    expect(result.imported).toHaveLength(1)
    expect(readFileSync(join(dataDir, 'SOUL.md'), 'utf8')).toBe(`${DEFAULT_SOUL}\n`)
    expect(readFileSync(join(dataDir, 'MANUAL.md'), 'utf8')).toContain('# Your working folder — operating manual')
    expect(readFileSync(join(dataDir, 'AGENTS.md'), 'utf8')).toContain('# Working-folder notes')

    const page = pageOf(result.imported[0].path)
    expect(page.data.status).toBe('draft')
    expect(page.data.type).toBe('source')
    expect(page.data.generated).toEqual({ by: 'process:expert-setup', at: NOW.toISOString() })
    expect(page.data.sources).toEqual([
      { resource: 'seeds/management/lens.md' },
      { resource: 'handbook' },
    ])
    expect(page.body).toContain('Facts need provenance.')
  })

  it('is idempotent and preserves stable/deprecated status on re-import', async () => {
    const dataDir = temp('expert-data-')
    const seedsDir = seedFixture()
    const first = await assembleExpertHome({ dataDir, seedsDir, now: NOW })
    expect(first.preserved).toEqual([])

    writeFileSync(first.imported[0].path, readFileSync(first.imported[0].path, 'utf8').replace('status: draft', 'status: stable'), 'utf8')
    const second = await assembleExpertHome({ dataDir, seedsDir, now: NOW })
    expect(second.soul).toBe('kept')
    expect(second.preserved).toEqual([first.imported[0].id])
    expect(pageOf(first.imported[0].path).data.status).toBe('stable')
  })

  it('refuses a seed that carries a live-secret shape', async () => {
    const dataDir = temp('expert-data-')
    const seedsDir = seedFixture(`# Lens\n\ntoken sk-${'a'.repeat(20)}\n`)
    await expect(assembleExpertHome({ dataDir, seedsDir, now: NOW })).rejects.toThrow('credential audit')
  })

  it('migrates the exact legacy generic seed but never an edited soul', async () => {
    const legacyDir = temp('expert-legacy-')
    writeFileSync(join(legacyDir, 'SOUL.md'), `${LEGACY_GENERIC_SOUL}\n`, 'utf8')
    const migrated = await assembleExpertHome({ dataDir: legacyDir, seedsDir: seedFixture(), now: NOW })
    expect(migrated.soul).toBe('migrated')
    expect(readFileSync(join(legacyDir, 'SOUL.md'), 'utf8')).toBe(`${DEFAULT_SOUL}\n`)

    const editedDir = temp('expert-edited-')
    mkdirSync(editedDir, { recursive: true })
    writeFileSync(join(editedDir, 'SOUL.md'), 'my own voice\n', 'utf8')
    const kept = await assembleExpertHome({ dataDir: editedDir, seedsDir: seedFixture(), now: NOW })
    expect(kept.soul).toBe('kept')
    expect(readFileSync(join(editedDir, 'SOUL.md'), 'utf8')).toBe('my own voice\n')
  })
})
