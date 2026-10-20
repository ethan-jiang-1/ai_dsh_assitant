/**
 * Fixtures for the .tmp sweep core (`scripts/maintenance/sweep.mjs`) — the mechanism behind root
 * AGENTS.md hard rule 8's "清扫即回收". Until this sweep existed, cleaning was a manual act only:
 * .tmp piled up to 135 entries / 82 MB with no mechanism (audit 261020 #25), and the one manual
 * clean destroyed a parallel session's in-flight evidence — protection rule ① (open handles) is
 * that incident mechanized. Pinned here, per the slice's acceptance list:
 *   · dry-run deletes nothing; --apply deletes exactly the expired entries;
 *   · three protection negatives — fresh mtime / openviking name / --keep name stay on disk;
 *   · the lsof seam: an injected "open paths" set bypasses the system lsof (CI cannot mint real
 *     handles), protecting an entry exactly as a real handle would;
 *   · fail-closed: when the system lsof cannot run, --apply refuses rather than deleting blind.
 */
import { existsSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { collectOpenPaths, planSweep, runSweep } from '../../../../scripts/maintenance/sweep.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

/**
 * A throwaway entry with its mtime pushed past the protection window: files first, then the
 * utimes call (a write into the dir would bump the mtime right back). Times go in as Date
 * objects — raw numbers are read as SECONDS since epoch, so milliseconds would land the mtime
 * in the far future and break every age assertion below.
 */
function entry(root, name, ageMinutes) {
  const path = join(root, name)
  mkdirSync(join(path, 'inner'), { recursive: true })
  writeFileSync(join(path, 'inner', 'artifact.txt'), 'x'.repeat(2048))
  if (ageMinutes !== undefined) {
    const at = new Date(Date.now() - ageMinutes * 60_000)
    utimesSync(path, at, at)
  }
  return path
}

describe('planSweep / runSweep', () => {
  it('dry-run plans the expired entry with name+size+mtime and deletes nothing', () => {
    const root = temp('sweep-')
    entry(root, 'old-shots', 120)

    const plan = planSweep({ root, minAgeMinutes: 60, openPaths: [] })
    const old = plan.entries.find(candidate => candidate.name === 'old-shots')
    expect(old.action).toBe('delete')
    expect(old.bytes).toBeGreaterThan(0)
    expect(typeof old.mtimeMs).toBe('number')

    const result = runSweep({ root, minAgeMinutes: 60, openPaths: [] })
    expect(result.deleted).toEqual([])
    expect(existsSync(join(root, 'old-shots'))).toBe(true)
  })

  it('--apply deletes exactly the expired entries', () => {
    const root = temp('sweep-')
    entry(root, 'old-shots', 120)
    entry(root, 'fresh-shots', 5)

    const result = runSweep({ root, apply: true, minAgeMinutes: 60, openPaths: [] })
    expect(result.deleted).toContain('old-shots')
    expect(result.deleted).not.toContain('fresh-shots')
    expect(existsSync(join(root, 'old-shots'))).toBe(false)
    expect(existsSync(join(root, 'fresh-shots'))).toBe(true)
  })

  it('protects an entry whose mtime is younger than the min-age window', () => {
    const root = temp('sweep-')
    entry(root, 'fresh-shots', 5)

    const plan = planSweep({ root, minAgeMinutes: 60, openPaths: [] })
    expect(plan.entries.find(candidate => candidate.name === 'fresh-shots'))
      .toMatchObject({ action: 'keep', reason: 'min-age' })
  })

  it('protects openviking by name — the live-service workspace stays even when expired', () => {
    const root = temp('sweep-')
    entry(root, 'openviking', 600)

    const plan = planSweep({ root, minAgeMinutes: 60, openPaths: [] })
    expect(plan.entries.find(candidate => candidate.name === 'openviking'))
      .toMatchObject({ action: 'keep', reason: 'openviking' })
  })

  it('protects --keep names', () => {
    const root = temp('sweep-')
    entry(root, 'probe-home', 600)

    const plan = planSweep({ root, minAgeMinutes: 60, keep: ['probe-home'], openPaths: [] })
    expect(plan.entries.find(candidate => candidate.name === 'probe-home'))
      .toMatchObject({ action: 'keep', reason: 'keep' })
  })

  it('protects entries holding an open handle — the injected open-path set is the lsof seam', () => {
    const root = temp('sweep-')
    const inFlight = entry(root, 'in-flight', 600)
    const openFile = join(inFlight, 'inner', 'artifact.txt')

    // Injected instead of the system lsof: CI cannot mint a real open handle, and the judgment
    // (an open path at or under the entry protects it) is the same core either way.
    const plan = planSweep({ root, minAgeMinutes: 60, openPaths: [openFile] })
    expect(plan.entries.find(candidate => candidate.name === 'in-flight'))
      .toMatchObject({ action: 'keep', reason: 'open-handle' })
  })
})

describe('collectOpenPaths (fail-closed seam)', () => {
  it('throws when lsof cannot scan — the failure mode --apply must refuse on', () => {
    const root = temp('sweep-')
    expect(() => collectOpenPaths(join(root, 'missing'))).toThrow()
  })

  it('makes --apply refuse when the system lsof is unavailable (dry-run degrades with a warning)', () => {
    const root = temp('sweep-')
    entry(root, 'old-shots', 120)
    const missingRoot = join(root, 'no-such-root')

    const refused = runSweep({ root: missingRoot, apply: true, minAgeMinutes: 60 })
    expect(refused.refused).toBe('lsof-unavailable')
    expect(refused.deleted).toEqual([])

    const degraded = runSweep({ root: missingRoot, minAgeMinutes: 60 })
    expect(degraded.lsof).toBe('unavailable')
  })
})
