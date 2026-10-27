/**
 * Explicit archive rotation: dry-run by default, apply moves whole closed surfaces under
 * archive-maintenance/, and the audit names what moved. No automatic deletion.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rotateArchives } from '../../src/cli/assistant-data.ts'
import { temp } from './verify-gates-harness.mjs'

function fixture() {
  const root = temp('data-rotate-')
  const assistant = join(root, 'assistant')
  const operating = join(root, 'operating')
  mkdirSync(join(assistant, 'audit'), { recursive: true })
  mkdirSync(join(assistant, 'memory', 'archive'), { recursive: true })
  mkdirSync(operating, { recursive: true })
  const old = new Date('2026-01-01T00:00:00.000Z')
  const oldFile = (path) => {
    writeFileSync(path, 'old\n', 'utf8')
    utimesSync(path, old, old)
  }
  oldFile(join(assistant, 'audit', 'approvals.jsonl'))
  oldFile(join(assistant, 'memory', 'archive', 'old.md'))
  utimesSync(join(assistant, 'memory', 'archive'), old, old)
  oldFile(join(operating, 'operations-archive.jsonl'))
  writeFileSync(join(assistant, 'audit', 'fresh.jsonl'), 'new\n', 'utf8')
  return { assistant, operating }
}

describe('assistant-data rotate', () => {
  it('dry-runs by default and moves only old surfaces when applied', async () => {
    const { assistant, operating } = fixture()
    const plan = await rotateArchives({ assistantDir: assistant, operatingDir: operating, olderThanDays: 30, apply: false })
    expect(plan.dryRun).toBe(true)
    expect(plan.candidates).toHaveLength(3)
    expect(plan.moved).toEqual([])
    expect(existsSync(join(assistant, 'audit', 'approvals.jsonl'))).toBe(true)

    const applied = await rotateArchives({ assistantDir: assistant, operatingDir: operating, olderThanDays: 30, apply: true })
    expect(applied.moved).toHaveLength(3)
    expect(existsSync(join(assistant, 'audit', 'approvals.jsonl'))).toBe(false)
    expect(existsSync(join(assistant, 'memory', 'archive'))).toBe(false)
    expect(existsSync(join(operating, 'operations-archive.jsonl'))).toBe(false)
    expect(readFileSync(join(assistant, 'audit', 'maintenance.jsonl'), 'utf8')).toContain('"action":"rotate"')
  })

  it('rejects a non-positive age threshold', async () => {
    const { assistant, operating } = fixture()
    await expect(rotateArchives({ assistantDir: assistant, operatingDir: operating, olderThanDays: 0, apply: false }))
      .rejects.toThrow('positive whole number')
  })
})
