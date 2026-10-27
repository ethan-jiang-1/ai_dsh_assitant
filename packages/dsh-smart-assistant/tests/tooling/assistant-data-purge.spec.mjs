/**
 * Explicit erasure: purge removes active, archived and snapshot copies of one room record,
 * writes an owner-only audit before and after, and refuses anything ambiguous (no confirmation,
 * no reason, unsafe id, symlink, unknown record). Ledger history and sessions are out of scope.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { purgeData } from '../../src/cli/assistant-data.ts'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

const POSIX = process.platform !== 'win32'

function fixture() {
  const assistant = temp('data-purge-')
  for (const dir of [
    'memory/archive',
    'research/archive',
    'knowledge',
    'skills/old-skill',
    'skills/archive/old-skill',
    'skills/archive/snapshots/old-skill',
    'skill-proposals/archive',
    'audit',
  ]) {
    mkdirSync(join(assistant, dir), { recursive: true })
  }
  writeFileSync(join(assistant, 'memory', '20260101-fact-aaaa.md'), 'fact\n', 'utf8')
  writeFileSync(join(assistant, 'memory', 'archive', '20260101-fact-aaaa.md'), 'fact\n', 'utf8')
  writeFileSync(join(assistant, 'memory', '20260101-other-bbbb.md'), 'other\n', 'utf8')
  writeFileSync(join(assistant, 'research', '20260102-thread-cccc.md'), 'thread\n', 'utf8')
  writeFileSync(join(assistant, 'knowledge', 'old-page.md'), 'page\n', 'utf8')
  writeFileSync(join(assistant, 'skills', 'old-skill', 'SKILL.md'), 'skill\n', 'utf8')
  writeFileSync(join(assistant, 'skills', 'archive', 'old-skill', 'SKILL.md'), 'old skill\n', 'utf8')
  writeFileSync(join(assistant, 'skills', 'archive', 'snapshots', 'old-skill', '2026-01-01.md'), 'snapshot\n', 'utf8')
  writeFileSync(join(assistant, 'skill-proposals', 'old-proposal.md'), 'proposal\n', 'utf8')
  return assistant
}

function auditLines(path) {
  return readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line))
}

describe('assistant-data purge', () => {
  it('erases active, archived and snapshot copies and records the audit', async () => {
    const assistant = fixture()
    const result = await purgeData({
      assistantDir: assistant,
      kind: 'memory',
      id: '20260101-fact-aaaa',
      reason: 'owner asked to erase this fact',
      confirm: true,
      now: new Date('2026-10-27T00:00:00.000Z'),
    })
    expect(result.removed).toHaveLength(2)
    expect(existsSync(join(assistant, 'memory', '20260101-fact-aaaa.md'))).toBe(false)
    expect(existsSync(join(assistant, 'memory', 'archive', '20260101-fact-aaaa.md'))).toBe(false)
    expect(existsSync(join(assistant, 'memory', '20260101-other-bbbb.md'))).toBe(true)

    const lines = auditLines(result.audit)
    expect(lines.map(line => line.status)).toEqual(['requested', 'deleted'])
    expect(lines[0]?.reason).toContain('erase this fact')
    if (POSIX) expect(statSync(result.audit).mode & 0o777).toBe(0o600)
  })

  it('erases a skill bundle, its archive and its snapshots', async () => {
    const assistant = fixture()
    const result = await purgeData({
      assistantDir: assistant,
      kind: 'skill',
      id: 'old-skill',
      reason: 'retired procedure should not remain',
      confirm: true,
    })
    expect(result.removed).toHaveLength(3)
    expect(existsSync(join(assistant, 'skills', 'old-skill'))).toBe(false)
    expect(existsSync(join(assistant, 'skills', 'archive', 'old-skill'))).toBe(false)
    expect(existsSync(join(assistant, 'skills', 'archive', 'snapshots', 'old-skill'))).toBe(false)
  })

  it('refuses missing confirmation, missing reason, unsafe ids, unknown kinds and absent records', async () => {
    const assistant = fixture()
    await expect(purgeData({ assistantDir: assistant, kind: 'memory', id: '20260101-other-bbbb', reason: 'why', confirm: false }))
      .rejects.toThrow('confirmation')
    await expect(purgeData({ assistantDir: assistant, kind: 'memory', id: '20260101-other-bbbb', reason: '   ', confirm: true }))
      .rejects.toThrow('reason')
    await expect(purgeData({ assistantDir: assistant, kind: 'memory', id: '../escape', reason: 'why', confirm: true }))
      .rejects.toThrow('safe record id')
    await expect(purgeData({ assistantDir: assistant, kind: 'ledger', id: 'x', reason: 'why', confirm: true }))
      .rejects.toThrow('unknown purge kind')
    await expect(purgeData({ assistantDir: assistant, kind: 'memory', id: '20260101-missing-dddd', reason: 'why', confirm: true }))
      .rejects.toThrow('nothing to purge')
  })

  it.skipIf(!POSIX)('records a failed purge when the record cannot be removed', async () => {
    const assistant = fixture()
    mkdirSync(join(assistant, 'skills', 'blocked', 'SKILL.md'), { recursive: true })
    writeFileSync(join(assistant, 'skills', 'blocked', 'SKILL.md', 'x.md'), 'x\n', 'utf8')
    chmodSync(join(assistant, 'skills', 'blocked'), 0o500)
    try {
      await expect(purgeData({ assistantDir: assistant, kind: 'skill', id: 'blocked', reason: 'blocked directory', confirm: true }))
        .rejects.toThrow()
      const lines = auditLines(join(assistant, 'audit', 'purges.jsonl'))
      expect(lines.map(line => line.status)).toEqual(['requested', 'failed'])
    } finally {
      chmodSync(join(assistant, 'skills', 'blocked'), 0o700)
    }
  })

  it.skipIf(!POSIX)('refuses to purge a symbolic link', async () => {
    const assistant = fixture()
    symlinkSync('/etc/hosts', join(assistant, 'memory', '20260103-link-eeee.md'))
    await expect(purgeData({
      assistantDir: assistant,
      kind: 'memory',
      id: '20260103-link-eeee',
      reason: 'why',
      confirm: true,
    })).rejects.toThrow('symbolic link')
  })
})
