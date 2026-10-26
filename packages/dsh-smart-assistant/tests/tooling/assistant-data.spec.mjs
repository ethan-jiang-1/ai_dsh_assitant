/**
 * Behavior of the portable data bundle: narrow contents, schema manifest, empty-target import,
 * and refusal paths. Temp dirs only; no DSH runtime.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
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

const POSIX = process.platform !== 'win32'

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

  it('omits writer.lock and atomic temp files from export and import', async () => {
    const source = sourceFixture()
    writeFileSync(join(source.operatingDir, 'writer.lock'), '{"hostname":"old-box","pid":1,"acquiredAt":"2026-01-01T00:00:00.000Z"}\n', 'utf8')
    writeFileSync(join(source.operatingDir, 'ledger.json.abc123.tmp'), '{"revision":\n', 'utf8')
    const outDir = join(temp('data-out-'), 'bundle')
    const exported = await exportData({ ...source, outDir })
    // SOUL.md + memory/m1.md + ledger.json; the live-looking claim and the torn temp are transient.
    expect(exported.manifest.files).toBe(3)
    expect(readdirSync(join(outDir, 'assistant-operating'))).toEqual(['ledger.json'])

    const target = temp('data-import-')
    await importData({
      inDir: outDir,
      assistantDir: join(target, 'assistant'),
      operatingDir: join(target, 'assistant-operating'),
    })
    expect(readdirSync(join(target, 'assistant-operating'))).toEqual(['ledger.json'])
  })

  it('drops transient files from a bundle written before the exclusion', async () => {
    // Backups produced by older builds carry the claim. Import must not plant a lock that names a
    // foreign host or a live PID: the ledger's first write would refuse until a manual lock move.
    const bundle = join(temp('data-bundle-'), 'bundle')
    mkdirSync(join(bundle, 'assistant'), { recursive: true })
    mkdirSync(join(bundle, 'assistant-operating'), { recursive: true })
    writeFileSync(join(bundle, 'manifest.json'), `${JSON.stringify({
      schemaVersion: DATA_SCHEMA_VERSION,
      createdAt: '2026-01-02T03:04:05.000Z',
      includes: ['assistant', 'assistant-operating'],
      files: 3,
      bytes: 1,
    })}\n`, 'utf8')
    writeFileSync(join(bundle, 'assistant', 'SOUL.md'), 'the owner voice\n', 'utf8')
    writeFileSync(join(bundle, 'assistant-operating', 'ledger.json'), '{"revision":1}\n', 'utf8')
    writeFileSync(join(bundle, 'assistant-operating', 'writer.lock'), '{"hostname":"old-box","pid":1,"acquiredAt":"2026-01-01T00:00:00.000Z"}\n', 'utf8')

    const target = temp('data-import-')
    await importData({
      inDir: bundle,
      assistantDir: join(target, 'assistant'),
      operatingDir: join(target, 'assistant-operating'),
    })
    expect(existsSync(join(target, 'assistant-operating', 'writer.lock'))).toBe(false)
    expect(readFileSync(join(target, 'assistant-operating', 'ledger.json'), 'utf8')).toBe('{"revision":1}\n')
  })

  it.skipIf(!POSIX)('leaves no destination behind when export fails', async () => {
    // A permission error used to leave a half-copied bundle with no manifest; the retry then
    // refused because the destination was non-empty. The destination must be absent or empty.
    const source = sourceFixture()
    const locked = join(source.assistantDir, 'locked')
    mkdirSync(locked, { recursive: true })
    writeFileSync(join(locked, 'entry.md'), 'hidden\n', 'utf8')
    chmodSync(locked, 0o000)
    const outDir = join(temp('data-out-'), 'bundle')
    try {
      await expect(exportData({ ...source, outDir })).rejects.toThrow()
    } finally {
      chmodSync(locked, 0o755)
    }
    expect(existsSync(outDir)).toBe(false)

    const retried = await exportData({ ...source, outDir })
    expect(retried.manifest.files).toBe(4)
    expect(existsSync(join(outDir, 'manifest.json'))).toBe(true)
  })

  it.skipIf(!POSIX)('refuses symbolic links in the working folder and in an import bundle', async () => {
    const source = sourceFixture()
    symlinkSync('/etc/hosts', join(source.assistantDir, 'leak.md'))
    await expect(exportData({ ...source, outDir: join(temp('data-out-'), 'bundle') }))
      .rejects.toThrow(/symbolic link/i)

    const bundle = join(temp('data-bundle-'), 'bundle')
    mkdirSync(join(bundle, 'assistant'), { recursive: true })
    mkdirSync(join(bundle, 'assistant-operating'), { recursive: true })
    writeFileSync(join(bundle, 'manifest.json'), `${JSON.stringify({
      schemaVersion: DATA_SCHEMA_VERSION,
      createdAt: '2026-01-02T03:04:05.000Z',
      includes: ['assistant', 'assistant-operating'],
      files: 2,
      bytes: 1,
    })}\n`, 'utf8')
    writeFileSync(join(bundle, 'assistant', 'SOUL.md'), 'the owner voice\n', 'utf8')
    symlinkSync('/etc/hosts', join(bundle, 'assistant', 'leak.md'))
    writeFileSync(join(bundle, 'assistant-operating', 'ledger.json'), '{"revision":1}\n', 'utf8')

    const target = temp('data-import-')
    await expect(importData({
      inDir: bundle,
      assistantDir: join(target, 'assistant'),
      operatingDir: join(target, 'assistant-operating'),
    })).rejects.toThrow(/symbolic link/i)
    expect(existsSync(join(target, 'assistant'))).toBe(false)
  })

  it('refuses an export destination inside a source directory', async () => {
    const source = sourceFixture()
    const outDir = join(source.assistantDir, 'backup')
    await expect(exportData({ ...source, outDir })).rejects.toThrow(/inside/i)
    expect(existsSync(outDir)).toBe(false)
  })
})
