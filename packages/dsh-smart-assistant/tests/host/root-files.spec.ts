/**
 * The home's root files as the prompt sections consume them: SOUL.md is the owner's voice,
 * MANUAL.md is the plugin-owned render, AGENTS.md is the owner's notes appended after it, and
 * curate reports root files that outgrew their prompt budgets.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'
import { DEFAULT_SOUL } from '../../src/domain/home/soul.ts'
import { MANUAL_FILE_NAME, NOTES_HEADER, renderHomeManual } from '../../src/domain/home/home-map.ts'
import { MANUAL_BYTE_CAP } from '../../src/host/curate-digest.ts'

const boot = memoryPool('assistant-root-files-')

describe('soulSnapshot (identity)', () => {
  it('seeds the built-in default, so day 0 the voice is exactly the shipped one', async () => {
    const { service } = boot()
    await service.ensureHome()
    expect(service.soulSnapshot()).toBe(DEFAULT_SOUL)
  })

  it('returns a hand-edited voice verbatim', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.soulFile, 'my own voice — terse and calm\n', 'utf8')
    expect(service.soulSnapshot()).toBe('my own voice — terse and calm')
  })

  it('falls back to the default when the file is empty or deleted', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.soulFile, '   \n', 'utf8')
    expect(service.soulSnapshot()).toBe(DEFAULT_SOUL)
  })

  it('truncates by UTF-8 bytes, not code units — a CJK soul over cap keeps a byte-bounded head and an honest marker', async () => {
    const { service } = boot()
    await service.ensureHome()
    // BUG-006 F5 (2026-10-07): 3000 CJK chars = 9000 UTF-8 bytes against the 4096-byte soul
    // cap. The code-unit slice returned ALL 3000 chars (9000 bytes) plus a lying
    // "truncated 4904 bytes" marker — the byte-capped prompt contract silently failed for
    // every Chinese owner-written soul.
    writeFileSync(service.paths.soulFile, `${'好'.repeat(3000)}\n`, 'utf8')
    const snapshot = service.soulSnapshot()
    expect(Buffer.byteLength(snapshot, 'utf8')).toBeLessThanOrEqual(4096 + 120) // head ≤ cap + marker line
    expect((snapshot.match(/好/g) ?? []).length).toBeLessThan(1400) // a real cut (cap / 3 bytes per char), not the whole file
    expect(snapshot).toContain('truncated 4904 bytes')
  })
})

describe('manualSnapshot (manual + notes)', () => {
  it('seeds MANUAL.md from the current render and AGENTS.md as notes', async () => {
    const { service } = boot()
    await service.ensureHome()
    const manual = readFileSync(service.paths.manualFile, 'utf8')
    expect(manual.trim()).toBe(renderHomeManual().trim())
    expect(manual).not.toContain('<!-- home-manual')
    expect(readFileSync(service.paths.agentsFile, 'utf8')).toBe(NOTES_HEADER)
    const snapshot = service.manualSnapshot()
    expect(snapshot).toContain(renderHomeManual())
    expect(snapshot).toContain(NOTES_HEADER.trim())
  })

  it('appends hand-written notes verbatim after the manual and never names the dataDir', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.agentsFile, '# my notes\n\nremember the invoice\n', 'utf8')
    const snapshot = service.manualSnapshot()
    expect(snapshot).toContain('remember the invoice')
    expect(snapshot.indexOf(renderHomeManual())).toBeLessThan(snapshot.indexOf('remember the invoice'))
    expect(snapshot).not.toContain(service.paths.root)
  })

  it('moves a legacy generated manual to a backup and seeds the notes file', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.agentsFile, '<!-- home-manual v24 -->\n# Old generated manual\n\nOld rule.\n', 'utf8')
    const result = await service.ensureHome()
    expect(result.legacyManualBackup).toBeDefined()
    expect(readFileSync(result.legacyManualBackup!, 'utf8')).toContain('Old rule.')
    expect(readFileSync(service.paths.agentsFile, 'utf8')).toBe(NOTES_HEADER)
    expect(service.manualSnapshot()).not.toContain('Old rule.')
  })

  it('refreshes a drifted MANUAL.md mirror with a backup', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.manualFile, 'stale mirror\n', 'utf8')
    await service.ensureHome()
    expect(readFileSync(service.paths.manualFile, 'utf8').trim()).toBe(renderHomeManual().trim())
    const backups = readdirSync(service.paths.root).filter(name => name.startsWith(`${MANUAL_FILE_NAME}.bak-`))
    expect(backups.length).toBe(1)
  })

  it('keeps the generated manual inside its prompt budget', async () => {
    expect(Buffer.byteLength(renderHomeManual(), 'utf8')).toBeLessThanOrEqual(MANUAL_BYTE_CAP)
  })
})

describe('curate reports root-file budget pressure', () => {
  it('reports notes that outgrew the prompt budget', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.agentsFile, `${'x'.repeat(MANUAL_BYTE_CAP + 10)}\n`, 'utf8')

    const brief = await service.curate()
    const finding = brief.findings.find(item => item.code === 'notes-over-budget')
    expect(finding?.severity).toBe('warn')
    expect(finding?.message).toContain('the tail is cut from every request')
  })

  it('reports an identity file that outgrew its prompt budget', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.soulFile, `${'x'.repeat(5000)}\n`, 'utf8')

    const brief = await service.curate()
    const finding = brief.findings.find(item => item.code === 'soul-over-budget')
    expect(finding?.severity).toBe('warn')
    expect(finding?.message).toContain('the voice is cut from every request')
  })
})
