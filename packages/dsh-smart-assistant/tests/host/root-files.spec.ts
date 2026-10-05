/**
 * The home's root files (SOUL.md identity, AGENTS.md manual) as the prompt sections consume
 * them: seed equals fallback (day 0 the voice is exactly the shipped one), hand edits rule,
 * absence degrades to always-current fallbacks, and curate reports a manual whose scaffold
 * version marker predates the current one without fighting hand edits.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import { DEFAULT_SOUL } from '../../src/domain/home/soul.ts'
import { HOME_MANUAL_VERSION } from '../../src/domain/home/home-map.ts'

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function boot(): AssistantMemory {
  const dir = mkdtempSync(join(tmpdir(), 'assistant-root-files-'))
  dirs.push(dir)
  return new AssistantMemory(new Context(), { dataDir: dir })
}

describe('soulSnapshot (identity)', () => {
  it('seeds the built-in default, so day 0 the voice is exactly the shipped one', async () => {
    const service = boot()
    await service.ensureHome()
    expect(service.soulSnapshot()).toBe(DEFAULT_SOUL)
  })

  it('returns a hand-edited voice verbatim', async () => {
    const service = boot()
    await service.ensureHome()
    writeFileSync(service.paths.soulFile, 'my own voice — terse and calm\n', 'utf8')
    expect(service.soulSnapshot()).toBe('my own voice — terse and calm')
  })

  it('falls back to the default when the file is empty or deleted', async () => {
    const service = boot()
    await service.ensureHome()
    writeFileSync(service.paths.soulFile, '   \n', 'utf8')
    expect(service.soulSnapshot()).toBe(DEFAULT_SOUL)
  })
})

describe('manualSnapshot (guidance)', () => {
  it('seeds the generated manual with the current version marker', async () => {
    const service = boot()
    await service.ensureHome()
    const manual = service.manualSnapshot()
    expect(manual).toContain('# Your working folder — operating manual')
    expect(manual).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
    // R13: the manual carries the desk panel's minimum contract, so a refresh that never loaded the
    // `desk-refresh` skill still writes a shaped file (live reading: 13 of 23 panel actions skipped the
    // skill while still writing the file). Pinned here because the manual is the surface that always
    // rides in the prompt — dropping this section silently re-opens "a shapeless desk renders as an
    // empty one", and only a package-level assertion catches it before a principal does.
    expect(manual).toContain('### The desk file')
    expect(manual).toContain('generatedAt')
    expect(manual).toContain('`decisions`')
    expect(manual).toContain('desk-refresh')
  })

  it('returns a hand-edited manual verbatim, and the prompt never names the dataDir path', async () => {
    const service = boot()
    await service.ensureHome()
    writeFileSync(service.paths.agentsFile, '# my own manual\n', 'utf8')
    // The manual text is the owner's and rides verbatim. NO prompt section carries the machine's
    // dataDir path: all home access is tool-mediated, and a prompt-level path goes stale when a
    // home moves and primes raw file-access bypass (both observed 2026-10-01).
    expect(service.manualSnapshot()).toBe('# my own manual')
    expect(service.manualSnapshot()).not.toContain(service.paths.root)
    expect(service.digestSnapshot()).not.toContain(service.paths.root)
  })

  it('renders a current manual when the file is absent — the fallback cannot go stale', async () => {
    const service = boot()
    await service.ensureHome()
    rmSync(service.paths.agentsFile)
    expect(service.manualSnapshot()).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })
})

describe('curate reports manual scaffold drift', () => {
  it('flags a manual that predates the current scaffold version', async () => {
    const service = boot()
    await service.ensureHome()
    // A hand-written or old manual carries no marker (or an old one): version 0.
    writeFileSync(service.paths.agentsFile, '# my own manual\n', 'utf8')

    const brief = await service.curate()
    const drift = brief.findings.find(finding => finding.code === 'manual-stale-scaffold')
    expect(drift?.severity).toBe('info')
    expect(drift?.message).toContain('predates the current scaffold')
  })

  it('stays quiet when the manual carries the current marker', async () => {
    const service = boot()
    await service.ensureHome()

    const brief = await service.curate()
    expect(brief.findings.find(finding => finding.code === 'manual-stale-scaffold')).toBeUndefined()
  })
})
