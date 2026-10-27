/**
 * Behavior of the portable data bundle: narrow contents, schema manifest, empty-target import,
 * and refusal paths. Temp dirs only; no DSH runtime.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DATA_SCHEMA_VERSION,
  checkData,
  exportData,
  importData,
  readDataManifest,
  statusData,
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
    expect(imported).toEqual({ assistantFiles: 2, operatingFiles: 1, backups: [] })
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
    await expect(importData({ inDir: cleanOut, assistantDir: occupied, operatingDir: join(temp('data-target-op-'), 'operating') }))
      .rejects.toThrow('not empty')
  })

  it('refuses a truncated or incomplete bundle and a target with a writer lock', async () => {
    const source = sourceFixture()
    const outDir = join(temp('data-out-'), 'bundle')
    await exportData({ ...source, outDir })
    const manifestPath = join(outDir, 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const target = temp('data-import-')

    writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, files: 99 }, null, 2)}\n`, 'utf8')
    await expect(importData({
      inDir: outDir,
      assistantDir: join(target, 'assistant'),
      operatingDir: join(target, 'assistant-operating'),
    })).rejects.toThrow('bundle is incomplete')

    writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, bytes: manifest.bytes + 1024 }, null, 2)}\n`, 'utf8')
    await expect(importData({
      inDir: outDir,
      assistantDir: join(target, 'assistant'),
      operatingDir: join(target, 'assistant-operating'),
    })).rejects.toThrow('bundle is truncated')

    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    mkdirSync(join(target, 'assistant-operating'), { recursive: true })
    writeFileSync(join(target, 'assistant-operating', 'writer.lock'), '{"hostname":"live","pid":1,"acquiredAt":"2026-01-01T00:00:00.000Z"}\n', 'utf8')
    await expect(importData({
      inDir: outDir,
      assistantDir: join(target, 'assistant'),
      operatingDir: join(target, 'assistant-operating'),
      replace: true,
    })).rejects.toThrow('stop the instance')

    const nested = temp('data-nested-')
    await expect(importData({
      inDir: outDir,
      assistantDir: join(nested, 'assistant'),
      operatingDir: join(nested, 'assistant', 'operating'),
    })).rejects.toThrow('must not nest')
  })

  it('dry run reports what replace would stash and writes nothing', async () => {
    const source = sourceFixture()
    const outDir = join(temp('data-out-'), 'bundle')
    await exportData({ ...source, outDir })
    const target = temp('data-dry-')
    const assistantDir = join(target, 'assistant')
    const operatingDir = join(target, 'assistant-operating')
    mkdirSync(assistantDir, { recursive: true })
    mkdirSync(operatingDir, { recursive: true })
    writeFileSync(join(assistantDir, 'existing.md'), 'keep\n', 'utf8')
    writeFileSync(join(operatingDir, 'ledger.json'), '{}\n', 'utf8')

    const plan = await importData({ inDir: outDir, assistantDir, operatingDir, replace: true, dryRun: true })
    expect(plan).toMatchObject({ dryRun: true, assistantFiles: 2, operatingFiles: 1, backups: [] })
    expect(plan.wouldStash).toEqual([assistantDir, operatingDir])
    expect(readFileSync(join(assistantDir, 'existing.md'), 'utf8')).toBe('keep\n')
    expect(readFileSync(join(operatingDir, 'ledger.json'), 'utf8')).toBe('{}\n')

    await expect(importData({ inDir: outDir, assistantDir, operatingDir, dryRun: true })).rejects.toThrow('not empty')
  })

  it('restores over a scaffolded home with replace and keeps the old directories beside it', async () => {
    const source = sourceFixture()
    const outDir = join(temp('data-out-'), 'bundle')
    await exportData({ ...source, outDir })

    const target = temp('data-import-')
    const assistantDir = join(target, 'assistant')
    const operatingDir = join(target, 'assistant-operating')
    mkdirSync(join(assistantDir, 'memory'), { recursive: true })
    mkdirSync(operatingDir, { recursive: true })
    writeFileSync(join(assistantDir, 'memory', 'old.md'), 'old fact\n', 'utf8')
    writeFileSync(join(operatingDir, 'ledger.json'), '{"version":1}\n', 'utf8')

    const imported = await importData({ inDir: outDir, assistantDir, operatingDir, replace: true })
    expect(imported.assistantFiles).toBe(2)
    expect(imported.operatingFiles).toBe(1)
    expect(imported.backups).toHaveLength(2)
    expect(readFileSync(join(assistantDir, 'SOUL.md'), 'utf8')).toBe('the owner voice\n')
    expect(existsSync(join(assistantDir, 'memory', 'old.md'))).toBe(false)
    expect(readFileSync(join(operatingDir, 'ledger.json'), 'utf8')).toBe('{"revision":1}\n')

    const assistantBackup = readdirSync(target).find(name => name.startsWith('assistant.pre-import-'))
    expect(assistantBackup).toBeDefined()
    expect(readFileSync(join(target, assistantBackup, 'memory', 'old.md'), 'utf8')).toBe('old fact\n')
  })

  it('reports paths, manual generation and ledger health without writing', async () => {
    const target = temp('data-status-')
    const assistantDir = join(target, 'assistant')
    const operatingDir = join(target, 'assistant-operating')
    mkdirSync(assistantDir, { recursive: true })
    mkdirSync(operatingDir, { recursive: true })
    writeFileSync(join(assistantDir, 'AGENTS.md'), '<!-- home-manual v20 -->\n# manual\n', 'utf8')
    writeFileSync(join(assistantDir, 'SOUL.md'), 'soul\n', 'utf8')
    writeFileSync(join(operatingDir, 'ledger.json'), JSON.stringify({
      version: 1,
      matters: {},
      operations: { op1: {}, op2: {} },
      unclaimed: {},
    }), 'utf8')

    const status = await statusData({ assistantDir, operatingDir })
    expect(status.assistant.manualVersion).toBe(20)
    expect(status.assistant.files).toBe(2)
    expect(status.ledger).toMatchObject({ exists: true, state: 'ok', version: 1, operations: 2 })

    // A corrupt ledger is a status value, not a thrown error: the support command must still
    // be able to tell the operator where the file is and what is wrong.
    writeFileSync(join(operatingDir, 'ledger.json'), '{nope', 'utf8')
    const corrupt = await statusData({ assistantDir, operatingDir })
    expect(corrupt.ledger.state).toBe('invalid')

    const missing = await statusData({ assistantDir: join(target, 'absent'), operatingDir: join(target, 'absent-operating') })
    expect(missing.assistant.exists).toBe(false)
    expect(missing.ledger.state).toBe('missing')
  })

  it('check names relative paths, a stale manual, a corrupt ledger and symlinks', async () => {
    const target = temp('data-check-')
    const assistantDir = join(target, 'assistant')
    const operatingDir = join(target, 'assistant-operating')
    mkdirSync(assistantDir, { recursive: true })
    mkdirSync(operatingDir, { recursive: true })
    writeFileSync(join(assistantDir, 'AGENTS.md'), '<!-- home-manual v19 -->\n# manual\n', 'utf8')
    writeFileSync(join(operatingDir, 'ledger.json'), '{broken', 'utf8')

    const relative = await checkData({ assistantDir: 'relative/assistant', operatingDir: 'relative/operating' })
    expect(relative.problems.join('\n')).toContain('path is relative')

    const absolute = await checkData({ assistantDir, operatingDir })
    const text = absolute.problems.join('\n')
    expect(text).toContain('manual is v19; current is v20')
    expect(text).toContain('ledger.json is unreadable')

    writeFileSync(join(operatingDir, 'desk-projection.json'), '{"schemaVersion":2}\n', 'utf8')
    const withFixture = await checkData({ assistantDir, operatingDir })
    expect(withFixture.problems.join('\n')).toContain('fixture is present')

    if (POSIX) {
      symlinkSync('/etc/hosts', join(assistantDir, 'leak.md'))
      const linked = await checkData({ assistantDir, operatingDir })
      expect(linked.problems.join('\n')).toContain('symbolic link in owned data')
    }
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
