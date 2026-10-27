/**
 * Proposal rotation: only landed/rejected proposals leave the active inbox, and an explicit
 * confirmation is required. Proposed/approved decisions stay visible; archive is a move, not a
 * delete. Revision continuity after rotation is pinned in the host proposal spec.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveResolvedProposals } from '../../src/cli/assistant-data.ts'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

function fixture() {
  const assistant = temp('data-proposals-')
  const inbox = join(assistant, 'skill-proposals')
  mkdirSync(inbox, { recursive: true })
  const proposal = (name, status) => writeFileSync(join(inbox, `${name}.md`), [
    '---',
    `status: ${status}`,
    'revision: 1',
    'description: test proposal',
    'created: 2026-10-01T00:00:00.000Z',
    'updated: 2026-10-01T00:00:00.000Z',
    '---',
    '',
    'body',
    '',
  ].join('\n'), 'utf8')
  proposal('still-proposed', 'proposed')
  proposal('waiting-approval', 'approved')
  proposal('old-rejected', 'rejected')
  proposal('already-landed', 'landed')
  return { assistant, inbox }
}

describe('assistant-data archive-proposals', () => {
  it('moves only resolved proposals and requires confirmation', async () => {
    const { assistant, inbox } = fixture()
    await expect(archiveResolvedProposals({ assistantDir: assistant, confirm: false })).rejects.toThrow('confirmation')

    const result = await archiveResolvedProposals({ assistantDir: assistant, confirm: true })
    expect(result.moved.sort()).toEqual(['already-landed', 'old-rejected'])
    expect(result.kept.sort()).toEqual(['still-proposed', 'waiting-approval'])
    expect(existsSync(join(inbox, 'old-rejected.md'))).toBe(false)
    expect(existsSync(join(inbox, 'archive', 'old-rejected.md'))).toBe(true)
    expect(existsSync(join(inbox, 'archive', 'already-landed.md'))).toBe(true)
    expect(existsSync(join(inbox, 'still-proposed.md'))).toBe(true)
    expect(existsSync(join(inbox, 'waiting-approval.md'))).toBe(true)
  })

  it('treats a missing proposal inbox as empty', async () => {
    const assistant = temp('data-proposals-empty-')
    mkdirSync(assistant, { recursive: true })
    await expect(archiveResolvedProposals({ assistantDir: assistant, confirm: true }))
      .resolves.toEqual({ moved: [], kept: [] })
  })
})
