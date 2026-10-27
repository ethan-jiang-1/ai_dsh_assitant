/**
 * The manual refresh escape hatch: a generated manual older than the migration table can be
 * replaced with the current render, but only with explicit confirmation and after a backup.
 * Hand edits are recoverable from the backup; a symlinked manual is refused.
 */

import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { refreshManual } from '../../src/cli/assistant-data.ts'
import { HOME_MANUAL_VERSION } from '../../src/domain/home/home-map.ts'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

const POSIX = process.platform !== 'win32'

describe('assistant-data refresh-manual', () => {
  it('backs up an older generated manual and writes the current generation', async () => {
    const assistant = temp('data-manual-')
    writeFileSync(join(assistant, 'AGENTS.md'), '<!-- home-manual v18 -->\n# old manual\n\nHand line.\n', 'utf8')

    const result = await refreshManual({ assistantDir: assistant, confirm: true, now: new Date('2026-10-27T00:00:00.000Z') })

    expect(result.previousVersion).toBe(18)
    expect(result.backup).toBeDefined()
    expect(readFileSync(result.backup, 'utf8')).toContain('Hand line.')
    const current = readFileSync(join(assistant, 'AGENTS.md'), 'utf8')
    expect(current).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
    expect(current).not.toContain('Hand line.')
    if (POSIX) expect(statSync(result.backup).mode & 0o777).toBe(0o600)
  })

  it('writes a current manual when none exists and requires confirmation', async () => {
    const assistant = temp('data-manual-')
    await expect(refreshManual({ assistantDir: assistant, confirm: false })).rejects.toThrow('confirmation')
    const result = await refreshManual({ assistantDir: assistant, confirm: true })
    expect(result.backup).toBeUndefined()
    expect(existsSync(join(assistant, 'AGENTS.md'))).toBe(true)
    expect(readFileSync(join(assistant, 'AGENTS.md'), 'utf8')).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
  })

  it('refuses a symlinked manual', async () => {
    if (!POSIX) return
    const assistant = temp('data-manual-')
    mkdirSync(assistant, { recursive: true })
    symlinkSync('/etc/hosts', join(assistant, 'AGENTS.md'))
    await expect(refreshManual({ assistantDir: assistant, confirm: true })).rejects.toThrow('symlinked manual')
  })
})
