/**
 * Conservative bundle merge: dry-run by default, never deletes target-only files, keeps the
 * target on conflict, and overwrites only working-folder conflicts under --prefer incoming with a
 * `.merge-backup-*` copy. Ledger conflicts are never overwritten.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportData, mergeData } from '../../src/cli/assistant-data.ts'
import { temp } from './verify-gates-harness.mjs'

async function fixture() {
  const root = temp('data-merge-')
  const sourceAssistant = join(root, 'source-assistant')
  const sourceOperating = join(root, 'source-operating')
  mkdirSync(sourceAssistant, { recursive: true })
  mkdirSync(sourceOperating, { recursive: true })
  writeFileSync(join(sourceAssistant, 'SOUL.md'), 'incoming soul\n', 'utf8')
  writeFileSync(join(sourceAssistant, 'ADD.md'), 'incoming only\n', 'utf8')
  writeFileSync(join(sourceAssistant, 'SAME.md'), 'same\n', 'utf8')
  writeFileSync(join(sourceOperating, 'ledger.json'), '{"from":"incoming"}\n', 'utf8')
  const outDir = join(root, 'bundle')
  await exportData({ assistantDir: sourceAssistant, operatingDir: sourceOperating, outDir })
  const assistantDir = join(root, 'target-assistant')
  const operatingDir = join(root, 'target-operating')
  mkdirSync(assistantDir, { recursive: true })
  mkdirSync(operatingDir, { recursive: true })
  writeFileSync(join(assistantDir, 'SOUL.md'), 'current soul\n', 'utf8')
  writeFileSync(join(assistantDir, 'SAME.md'), 'same\n', 'utf8')
  writeFileSync(join(assistantDir, 'ONLY.md'), 'target only\n', 'utf8')
  writeFileSync(join(operatingDir, 'ledger.json'), '{"from":"current"}\n', 'utf8')
  return { outDir, assistantDir, operatingDir }
}

describe('assistant-data merge', () => {
  it('dry-runs, adds missing files, and keeps conflicts by default', async () => {
    const { outDir, assistantDir, operatingDir } = await fixture()
    const plan = await mergeData({ inDir: outDir, assistantDir, operatingDir })
    expect(plan.dryRun).toBe(true)
    expect(plan.added.map(entry => entry.path)).toEqual(['ADD.md'])
    expect(plan.conflicts.map(entry => entry.path).sort()).toEqual(['SOUL.md', 'ledger.json'])
    expect(existsSync(join(assistantDir, 'ADD.md'))).toBe(false)

    const applied = await mergeData({ inDir: outDir, assistantDir, operatingDir, apply: true })
    expect(applied.added).toHaveLength(1)
    expect(readFileSync(join(assistantDir, 'ADD.md'), 'utf8')).toBe('incoming only\n')
    expect(readFileSync(join(assistantDir, 'SOUL.md'), 'utf8')).toBe('current soul\n')
    expect(readFileSync(join(assistantDir, 'ONLY.md'), 'utf8')).toBe('target only\n')
    expect(readFileSync(join(operatingDir, 'ledger.json'), 'utf8')).toBe('{"from":"current"}\n')
    expect(readFileSync(join(assistantDir, 'audit', 'merge.jsonl'), 'utf8')).toContain('"action":"merge"')
  })

  it('overwrites working-folder conflicts under --prefer incoming with a backup', async () => {
    const { outDir, assistantDir, operatingDir } = await fixture()
    const applied = await mergeData({ inDir: outDir, assistantDir, operatingDir, apply: true, prefer: 'incoming' })
    expect(readFileSync(join(assistantDir, 'SOUL.md'), 'utf8')).toBe('incoming soul\n')
    expect(applied.backups.some(path => path.includes('SOUL.md.merge-backup-'))).toBe(true)
    expect(readFileSync(join(operatingDir, 'ledger.json'), 'utf8')).toBe('{"from":"current"}\n')
  })
})
