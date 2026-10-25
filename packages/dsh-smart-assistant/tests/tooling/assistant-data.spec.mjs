/**
 * Behavior of the portable data bundle: narrow contents, schema manifest, empty-target import,
 * and refusal paths. Temp dirs only; no DSH runtime.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DATA_SCHEMA_VERSION,
  exportData,
  importData,
  readDataManifest,
} from '../../src/cli/assistant-data.ts'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

function sourceFixture() {
  const root = temp('data-source-')
  const assistantDir = join(root, 'assistant')
  const operatingDir = join(root, 'assistant-operating')
  mkdirSync(join(assistantDir, 'memory'), { recursive: true })
  mkdirSync(operatingDir, { recursive: true })
  writeFileSync(join(assistantDir, 'SOUL.md'), 'the owner voice\n', 'utf8')
  writeFileSync(join(assistantDir, 'memory', 'm1.md'), 'fact\n', 'utf8')
  writeFileSync(join(operatingDir, 'ledger.json'), '{"revision":1}\n', 'utf8')
  return { assistantDir, operatingDir }
}

describe('assistant-data', () => {
  it('exports a narrow bundle with a schema manifest and imports it into empty targets', async () => {
    const source = sourceFixture()
    const outDir = join(temp('data-out-'), 'bundle')
    const exported = await exportData({ ...source, outDir, now: new Date('2026-01-02T03:04:05.000Z') })
    expect(exported.manifest).toEqual({
      schemaVersion: DATA_SCHEMA_VERSION,
      createdAt: '2026-01-02T03:04:05.000Z',
      includes: ['assistant', 'assistant-operating'],
      files: 3,
      bytes: expect.any(Number),
    })
    expect(JSON.stringify(exported.manifest)).not.toContain(process.cwd())
    expect(await readDataManifest(outDir)).toEqual(exported.manifest)

    const target = temp('data-import-')
    const imported = await importData({
      inDir: outDir,
      assistantDir: join(target, 'assistant'),
      operatingDir: join(target, 'assistant-operating'),
    })
    expect(imported).toEqual({ assistantFiles: 2, operatingFiles: 1 })
    expect(readFileSync(join(target, 'assistant', 'SOUL.md'), 'utf8')).toBe('the owner voice\n')
    expect(readFileSync(join(target, 'assistant', 'memory', 'm1.md'), 'utf8')).toBe('fact\n')
    expect(readFileSync(join(target, 'assistant-operating', 'ledger.json'), 'utf8')).toBe('{"revision":1}\n')
  })

  it('refuses a non-empty export destination and a non-empty import target', async () => {
    const source = sourceFixture()
    const outDir = temp('data-out-')
    writeFileSync(join(outDir, 'already-here'), 'x', 'utf8')
    await expect(exportData({ ...source, outDir })).rejects.toThrow('not empty')

    const cleanOut = join(temp('data-out-'), 'bundle')
    await exportData({ ...source, outDir: cleanOut })
    const occupied = temp('data-target-')
    writeFileSync(join(occupied, 'existing'), 'x', 'utf8')
    await expect(importData({ inDir: cleanOut, assistantDir: occupied, operatingDir: join(occupied, 'operating') }))
      .rejects.toThrow('not empty')
  })

  it('refuses an unsupported schema and a missing working folder', async () => {
    const source = sourceFixture()
    const outDir = join(temp('data-out-'), 'bundle')
    await exportData({ ...source, outDir })
    const manifestPath = join(outDir, 'manifest.json')
    writeFileSync(manifestPath, `${JSON.stringify({ ...JSON.parse(readFileSync(manifestPath, 'utf8')), schemaVersion: 2 }, null, 2)}\n`, 'utf8')
    await expect(readDataManifest(outDir)).rejects.toThrow('unsupported schemaVersion')

    const missing = join(temp('data-missing-'), 'assistant')
    await expect(exportData({ assistantDir: missing, operatingDir: source.operatingDir, outDir: join(temp('data-out-'), 'x') }))
      .rejects.toThrow('working folder not found')
  })
})
