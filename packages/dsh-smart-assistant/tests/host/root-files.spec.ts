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
import {
  CURRENT_DELIVERY_ANCHOR,
  CURRENT_FOUR_THINGS_PARAGRAPH,
  CURRENT_FOUR_THINGS_PARAGRAPH_V24,
  CURRENT_LAYOUT_TREE,
  CURRENT_ONE_QUESTION_PARAGRAPH,
  CURRENT_PAST_CONVERSATIONS,
  CURRENT_REPO_BOUNDARIES_HEADING,
  CURRENT_SHADOW_SENTENCE,
  HOME_MANUAL_VERSION,
  RETIRED_DELIVERY_ANCHOR,
  RETIRED_LAYOUT_TREE,
  RETIRED_ONE_QUESTION_PARAGRAPH,
  RETIRED_PAST_CONVERSATIONS,
  RETIRED_REPO_BOUNDARIES_HEADING,
  RETIRED_ROOM_DATA_SECTION,
  RETIRED_SHADOW_SENTENCE,
  RETIRED_THREE_THINGS_PARAGRAPH,
  renderHomeManual,
} from '../../src/domain/home/home-map.ts'
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
    // v22: the indexed session tools are the primary recall path; the raw zstd recipe is the
    // declared fallback, and project-bound facts belong to the repository.
    expect(manual).toContain('session_search')
    expect(manual).not.toContain('Nothing indexes them')
    expect(manual).toContain(CURRENT_REPO_BOUNDARIES_HEADING)
    expect(manual).toContain('five boundaries hold')
    // v23: four sections actually ride (identity, manual, operating brief, digest), and the layout
    // tree names every root entry the scaffold owns. v24 names the knowledge tree and the generic
    // shadow winner (curated skills sit at rank 600 and cannot shadow learned ones).
    expect(manual).toContain(CURRENT_FOUR_THINGS_PARAGRAPH_V24)
    expect(manual).toContain('Four things ride in every request')
    expect(manual).toContain('the knowledge tree')
    expect(manual).toContain(CURRENT_SHADOW_SENTENCE)
    expect(manual).not.toContain('same-named curated')
    expect(manual).toContain(CURRENT_LAYOUT_TREE)
    for (const entry of ['ui-mode.json', 'skill-proposals/', 'audit/', 'deliverables/']) {
      expect(manual).toContain(entry)
    }
  })

  it('keeps the generated manual inside its prompt budget', async () => {
    // D3 (2026-10-28): the render had grown to 11,033 bytes against an 8,192-byte cap, so every
    // request carried a manual cut in the middle — the collaboration boundaries and the layout
    // never reached the model. The budget is now above the render, and this test is the invariant:
    // growing the manual past the budget must be a deliberate cap change, not silent truncation.
    expect(Buffer.byteLength(renderHomeManual(), 'utf8')).toBeLessThanOrEqual(MANUAL_BYTE_CAP)
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
    // A v15 manual reaches the v20 text but is not allowed to claim the v21 delivery rule it
    // never received; the prompt marker keeps it visibly stale.
    expect(migrated).toContain('home-manual v20')
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

  it('migrates the v19 answer-contract and the v20 delivery anchor on the next scaffold', async () => {
    const { service } = boot()
    await service.ensureHome()
    const current = service.manualSnapshot()
    expect(current).toContain(CURRENT_ONE_QUESTION_PARAGRAPH)
    expect(current).toContain(CURRENT_DELIVERY_ANCHOR)
    const legacy = current
      .replace(CURRENT_DELIVERY_ANCHOR, RETIRED_DELIVERY_ANCHOR)
      .replace(CURRENT_ONE_QUESTION_PARAGRAPH, RETIRED_ONE_QUESTION_PARAGRAPH)
      .replace(`<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`, '<!-- home-manual v19 -->')
    writeFileSync(service.paths.agentsFile, legacy, 'utf8')

    await service.ensureHome()

    const migrated = readFileSync(service.paths.agentsFile, 'utf8')
    expect(migrated).toContain(CURRENT_ONE_QUESTION_PARAGRAPH)
    expect(migrated).not.toContain(RETIRED_ONE_QUESTION_PARAGRAPH)
    expect(migrated).toContain(CURRENT_DELIVERY_ANCHOR)
    expect(migrated).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })

  it('adds the delivery rule to a v20 manual', async () => {
    const { service } = boot()
    await service.ensureHome()
    const legacy = service.manualSnapshot()
      .replace(CURRENT_DELIVERY_ANCHOR, RETIRED_DELIVERY_ANCHOR)
      .replace(`<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`, '<!-- home-manual v20 -->')
    writeFileSync(service.paths.agentsFile, legacy, 'utf8')

    await service.ensureHome()

    const migrated = readFileSync(service.paths.agentsFile, 'utf8')
    expect(migrated).toContain(CURRENT_DELIVERY_ANCHOR)
    expect(migrated).toContain('Deliver files where the principal can take them.')
    expect(migrated).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })

  it('migrates a v22 manual through v23 to the v24 knowledge-tree count', async () => {
    const { service } = boot()
    await service.ensureHome()
    const legacy = `${service.manualSnapshot()
      .replace(CURRENT_FOUR_THINGS_PARAGRAPH_V24, RETIRED_THREE_THINGS_PARAGRAPH)
      .replace(CURRENT_LAYOUT_TREE, RETIRED_LAYOUT_TREE)
      .replace(`<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`, '<!-- home-manual v22 -->')}\n\nHand note: keep me.`
    writeFileSync(service.paths.agentsFile, legacy, 'utf8')

    await service.ensureHome()

    const migrated = readFileSync(service.paths.agentsFile, 'utf8')
    expect(migrated).toContain(CURRENT_FOUR_THINGS_PARAGRAPH_V24)
    expect(migrated).not.toContain('Three things ride in every request')
    expect(migrated).toContain(CURRENT_LAYOUT_TREE)
    expect(migrated).toContain('ui-mode.json')
    expect(migrated).toContain('skill-proposals/')
    expect(migrated).toContain('deliverables/')
    expect(migrated).toContain('Hand note: keep me.')
    expect(migrated).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })

  it('migrates a v23 manual to the v24 shadow wording and knowledge-tree count', async () => {
    const { service } = boot()
    await service.ensureHome()
    const legacy = `${service.manualSnapshot()
      .replace(CURRENT_FOUR_THINGS_PARAGRAPH_V24, CURRENT_FOUR_THINGS_PARAGRAPH)
      .replace(CURRENT_SHADOW_SENTENCE, RETIRED_SHADOW_SENTENCE)
      .replace(`<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`, '<!-- home-manual v23 -->')}\n\nHand note: keep me.`
    writeFileSync(service.paths.agentsFile, legacy, 'utf8')

    await service.ensureHome()

    const migrated = readFileSync(service.paths.agentsFile, 'utf8')
    expect(migrated).toContain(CURRENT_FOUR_THINGS_PARAGRAPH_V24)
    expect(migrated).toContain('the knowledge tree')
    expect(migrated).toContain(CURRENT_SHADOW_SENTENCE)
    expect(migrated).not.toContain(RETIRED_SHADOW_SENTENCE)
    expect(migrated).toContain('Hand note: keep me.')
    expect(migrated).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })

  it('migrates a v21 manual to the v22 recall policy and the project-facts boundary', async () => {
    const { service } = boot()
    await service.ensureHome()
    const legacy = `${service.manualSnapshot()
      .replace(CURRENT_PAST_CONVERSATIONS, RETIRED_PAST_CONVERSATIONS)
      .replace(CURRENT_REPO_BOUNDARIES_HEADING, RETIRED_REPO_BOUNDARIES_HEADING)
      .replace(`<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`, '<!-- home-manual v21 -->')}\n\nHand note: keep me.`
    writeFileSync(service.paths.agentsFile, legacy, 'utf8')

    await service.ensureHome()

    const migrated = readFileSync(service.paths.agentsFile, 'utf8')
    expect(migrated).toContain(CURRENT_PAST_CONVERSATIONS)
    expect(migrated).not.toContain('Nothing indexes them')
    expect(migrated).toContain(CURRENT_REPO_BOUNDARIES_HEADING)
    expect(migrated).not.toContain(RETIRED_REPO_BOUNDARIES_HEADING)
    expect(migrated).toContain('Hand note: keep me.')
    expect(migrated).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })

  it('flags an unrepairable older generated manual in the prompt without rewriting it', async () => {
    const { service } = boot()
    await service.ensureHome()
    const older = service.manualSnapshot()
      .replace(CURRENT_ONE_QUESTION_PARAGRAPH, 'Unrelated paragraph the migration table does not know.')
      .replace(`<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->`, '<!-- home-manual v18 -->')
    writeFileSync(service.paths.agentsFile, older, 'utf8')

    await service.ensureHome()
    const prompt = service.manualSnapshot()

    expect(prompt).toContain('generation v18')
    expect(prompt).toContain(`current scaffold is v${String(HOME_MANUAL_VERSION)}`)
    // The prompt warns; the owner's file is not rewritten behind their back.
    expect(readFileSync(service.paths.agentsFile, 'utf8')).toBe(older)
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

  it('reports a manual that outgrew the prompt budget instead of cutting it silently', async () => {
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(
      service.paths.agentsFile,
      `<!-- home-manual v${String(HOME_MANUAL_VERSION)} -->\n\n${'x'.repeat(MANUAL_BYTE_CAP + 10)}\n`,
      'utf8',
    )

    const brief = await service.curate()
    const finding = brief.findings.find(item => item.code === 'manual-over-budget')
    expect(finding?.severity).toBe('warn')
    expect(finding?.message).toContain('the tail is cut from every request')
  })

  it('reports an identity file that outgrew its prompt budget', async () => {
    // The manual has had a curate finding since 2026-10-28; the soul uses the same silent
    // truncation path (4 KiB), so an owner-grown identity was cut from every request with no
    // machine-visible report. Symmetry is the point.
    const { service } = boot()
    await service.ensureHome()
    writeFileSync(service.paths.soulFile, `${'x'.repeat(5000)}\n`, 'utf8')

    const brief = await service.curate()
    const finding = brief.findings.find(item => item.code === 'soul-over-budget')
    expect(finding?.severity).toBe('warn')
    expect(finding?.message).toContain('the voice is cut from every request')
  })
})
