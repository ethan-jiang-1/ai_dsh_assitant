/**
 * Old bytes, current code: boot the services against the frozen v19-era home and read every
 * surface back. This is the evidence the synthetic upgrade smoke cannot give — it never loads
 * the data it preserves.
 *
 * The fixture is copied into a throwaway home; `AGENTS.md.fixture` becomes `AGENTS.md` only at
 * test time (a literal manual under the repo would be picked up as developer instructions).
 */

import { cpSync, readFileSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import { AssistantOperatingLedger } from '../../src/host/operating-ledger/index.ts'
import { NOTES_HEADER, renderHomeManual } from '../../src/domain/home/home-map.ts'
import { dirPool } from '../support/host-harness.ts'

const fixture = fileURLToPath(new URL('./fixtures/old-home-v19', import.meta.url))
const mkDir = dirPool('assistant-old-home-')

function copyFixture(): string {
  const home = mkDir()
  cpSync(join(fixture, 'assistant'), join(home, 'assistant'), { recursive: true })
  cpSync(join(fixture, 'assistant-operating'), join(home, 'assistant-operating'), { recursive: true })
  renameSync(join(home, 'assistant', 'AGENTS.md.fixture'), join(home, 'assistant', 'AGENTS.md'))
  return home
}

describe('old-home compatibility (v19 fixture)', () => {
  it('reads every room, skill, proposal and usage count from old bytes', async () => {
    const home = copyFixture()
    const service = new AssistantMemory(new Context(), { dataDir: join(home, 'assistant') })
    await service.ensureHome()

    const memories = await service.listMemories()
    expect(memories.failures).toEqual([])
    expect(memories.entries.map(record => record.id)).toContain('20260901-oldfact-aaaa')
    expect(memories.entries.find(record => record.id === '20260901-oldfact-aaaa')?.text).toContain('18 percent')

    const threads = await service.listThreads()
    expect(threads.failures).toEqual([])
    expect(threads.entries.map(thread => thread.id)).toContain('20260815-oldthread-bbbb')

    const knowledge = await service.listKnowledge()
    expect(knowledge.failures).toEqual([])
    expect(knowledge.entries.map(page => page.id)).toContain('old-pricing-page')

    expect(await service.learnedSkillNames()).toContain('old-skill')
    const skill = await service.readLearnedSkill('old-skill')
    expect(skill?.body).toContain('old reset script')
    expect((await service.listProposals()).entries.map(proposal => proposal.id)).toContain('old-proposal')
    expect((await service.skillUsage()).usage['old-skill']?.count).toBe(2)
  })

  it('splits the v19 manual: legacy bytes move to a backup, MANUAL.md and notes take over', async () => {
    const home = copyFixture()
    const service = new AssistantMemory(new Context(), { dataDir: join(home, 'assistant') })
    await service.ensureHome()

    // The constructor's prewarm and this call share one scaffold; whichever ran first did the
    // split, so the backup is asserted on disk rather than through this call's return value.
    const backups = readdirSync(join(home, 'assistant')).filter(name => name.startsWith('AGENTS.md.bak-'))
    expect(backups).toHaveLength(1)
    expect(readFileSync(join(home, 'assistant', backups[0]!), 'utf8')).toContain('A frozen v19-era manual')
    expect(readFileSync(join(home, 'assistant', 'AGENTS.md'), 'utf8')).toBe(NOTES_HEADER)
    expect(readFileSync(join(home, 'assistant', 'MANUAL.md'), 'utf8').trim()).toBe(renderHomeManual().trim())
    expect(service.manualSnapshot()).toContain(renderHomeManual())
    expect(service.manualSnapshot()).not.toContain('A frozen v19-era manual')

    const brief = await service.curate()
    expect(brief.findings.find(finding => finding.code === 'unreadable-file')).toBeUndefined()
    expect(brief.findings.find(finding => finding.code === 'page-unreadable')).toBeUndefined()
  })

  it('reads the old authoritative ledger and its receipt', async () => {
    const home = copyFixture()
    const ledger = new AssistantOperatingLedger(new Context(), { dataDir: join(home, 'assistant-operating') })
    try {
      const matter = await ledger.readMatter('m-1')
      expect(matter?.title).toBe('Old renewal')
      expect(matter?.times.promisedDeadline).toBe('2026-10-01')
      expect((await ledger.readOperation('op-old-create'))?.outcome).toEqual({ status: 'committed', revision: 1 })
      const snapshot = await ledger.readMatterSnapshot('m-1')
      expect(snapshot?.operations.map(record => record.receipt.operationId)).toEqual(['op-old-create'])
      expect((await ledger.listMatters()).map(entry => entry.id)).toEqual(['m-1'])
    } finally {
      await ledger.stop()
    }
  })
})
