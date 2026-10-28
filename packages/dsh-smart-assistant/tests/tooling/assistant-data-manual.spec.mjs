/**
 * The manual mirror refresh: `MANUAL.md` is the generated mirror of the plugin manual. Refreshing
 * it backs up the old mirror, requires explicit confirmation, and never touches the user's
 * `AGENTS.md` notes or a symlinked target.
 */

import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { refreshManual } from '../../src/cli/assistant-data.ts'
import { MANUAL_FILE_NAME, renderHomeManual } from '../../src/domain/home/home-map.ts'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

const POSIX = process.platform !== 'win32'

describe('assistant-data refresh-manual', () => {
  it('backs up the old MANUAL.md mirror and writes the current render without touching AGENTS.md', async () => {
    const assistant = temp('data-manual-')
    writeFileSync(join(assistant, MANUAL_FILE_NAME), '# old mirror\n\nHand line.\n', 'utf8')
    writeFileSync(join(assistant, 'AGENTS.md'), '# my notes\n\nkeep me\n', 'utf8')

    const result = await refreshManual({ assistantDir: assistant, confirm: true, now: new Date('2026-10-27T00:00:00.000Z') })

    expect(result.backup).toBeDefined()
    expect(readFileSync(result.backup, 'utf8')).toContain('Hand line.')
    expect(readFileSync(join(assistant, MANUAL_FILE_NAME), 'utf8').trim()).toBe(renderHomeManual().trim())
    expect(readFileSync(join(assistant, 'AGENTS.md'), 'utf8')).toBe('# my notes\n\nkeep me\n')
    if (POSIX) expect(statSync(result.backup).mode & 0o777).toBe(0o600)
  })

  it('writes a current mirror when none exists and requires confirmation', async () => {
    const assistant = temp('data-manual-')
    await expect(refreshManual({ assistantDir: assistant, confirm: false })).rejects.toThrow('confirmation')
    const result = await refreshManual({ assistantDir: assistant, confirm: true })
    expect(result.backup).toBeUndefined()
    expect(existsSync(join(assistant, MANUAL_FILE_NAME))).toBe(true)
    expect(readFileSync(join(assistant, MANUAL_FILE_NAME), 'utf8').trim()).toBe(renderHomeManual().trim())
  })

  it('refuses a symlinked mirror', async () => {
    if (!POSIX) return
    const assistant = temp('data-manual-')
    mkdirSync(assistant, { recursive: true })
    symlinkSync('/etc/hosts', join(assistant, MANUAL_FILE_NAME))
    await expect(refreshManual({ assistantDir: assistant, confirm: true })).rejects.toThrow('symlinked manual')
  })
})
