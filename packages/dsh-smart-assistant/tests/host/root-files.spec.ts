/**
 * The home's root files (SOUL.md identity, AGENTS.md manual) as the prompt sections consume
 * them: seed equals fallback (day 0 the voice is exactly the shipped one), hand edits rule,
 * absence degrades to always-current fallbacks, and curate reports a manual whose scaffold
 * version marker predates the current one without fighting hand edits.
 */

import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'
import { DEFAULT_SOUL } from '../../src/domain/home/soul.ts'
import { HOME_MANUAL_VERSION, RETIRED_ROOM_DATA_SECTION } from '../../src/domain/home/home-map.ts'

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

describe('manualSnapshot (guidance)', () => {
  it('seeds the generated manual with the current version marker', async () => {
    const { service } = boot()
    await service.ensureHome()
    const manual = service.manualSnapshot()
    expect(manual).toContain('# Your working folder — operating manual')
    expect(manual).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
    // A1b: the per-session room-data copy and its skill are retired; the manual still teaches the
    // four rooms and the ledger, and must not resurrect either retired surface.
    expect(manual).toContain('| Room | Holds | Lifecycle |')
    expect(manual).not.toContain('.desk/state.json')
    expect(manual).not.toContain('desk-refresh')
    expect(manual).not.toContain('The desk file')
  })

  it('returns a hand-edited manual verbatim, and the prompt never names the dataDir path', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.agentsFile, '# my own manual\n', 'utf8')
    // The manual text is the owner's and rides verbatim. NO prompt section carries the machine's
    // dataDir path: all home access is tool-mediated, and a prompt-level path goes stale when a
    // home moves and primes raw file-access bypass (both observed 2026-10-01).
    expect(service.manualSnapshot()).toBe('# my own manual')
    expect(service.manualSnapshot()).not.toContain(service.paths.root)
    expect(service.digestSnapshot()).not.toContain(service.paths.root)
  })

  it('migrates an existing generated manual and keeps hand edits', async () => {
    const { service } = boot()
    await service.ensureHome()
    const current = service.manualSnapshot()
    const legacy = current
      .replace('# Your working folder — operating manual', '# Your working folder — operating manual\n\nHand line: keep me.')
      .replace('| Room | Holds | Lifecycle |', `${RETIRED_ROOM_DATA_SECTION}| Room | Holds | Lifecycle |`)
      .replace(`<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`, '<!-- home-manual v15 -->')
    writeFileSync(service.paths.agentsFile, legacy, 'utf8')
    await service.ensureHome()
    const migrated = service.manualSnapshot()
    expect(migrated).not.toContain('### Room data (`.desk/state.json`)')
    expect(migrated).not.toContain('desk-refresh')
    expect(migrated).toContain('Hand line: keep me.')
    expect(migrated).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
    // A hand-written manual without the exact retired block is never reflowed.
    writeFileSync(service.paths.agentsFile, '# my own manual\n\nno room data here\n', 'utf8')
    await service.ensureHome()
    expect(readFileSync(service.paths.agentsFile, 'utf8')).toBe('# my own manual\n\nno room data here\n')
  })

  it('renders a current manual when the file is absent — the fallback cannot go stale', async () => {
    const { service } = boot()
    await service.ensureHome()
    rmSync(service.paths.agentsFile)
    expect(service.manualSnapshot()).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })
})

describe('curate reports manual scaffold drift', () => {
  it('flags a manual that predates the current scaffold version', async () => {
    const { service } = boot()
    await service.ensureHome()
    // A hand-written or old manual carries no marker (or an old one): version 0.
    writeFileSync(service.paths.agentsFile, '# my own manual\n', 'utf8')

    const brief = await service.curate()
    const drift = brief.findings.find(finding => finding.code === 'manual-stale-scaffold')
    expect(drift?.severity).toBe('info')
    expect(drift?.message).toContain('predates the current scaffold')
  })

  it('stays quiet when the manual carries the current marker', async () => {
    const { service } = boot()
    await service.ensureHome()

    const brief = await service.curate()
    expect(brief.findings.find(finding => finding.code === 'manual-stale-scaffold')).toBeUndefined()
  })
})
