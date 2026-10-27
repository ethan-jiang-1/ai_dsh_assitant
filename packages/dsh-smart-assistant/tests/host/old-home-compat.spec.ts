/**
 * Old bytes, current code: boot the services against the frozen v19-era home and read every
 * surface back. This is the evidence the synthetic upgrade smoke cannot give — it never loads
 * the data it preserves.
 *
 * The fixture is copied into a throwaway home; `AGENTS.md.fixture` becomes `AGENTS.md` only at
 * test time (a literal manual under the repo would be picked up as developer instructions).
 */

import { cpSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import { AssistantOperatingLedger } from '../../src/host/operating-ledger/index.ts'
import { CURRENT_ONE_QUESTION_PARAGRAPH, HOME_MANUAL_VERSION, RETIRED_ONE_QUESTION_PARAGRAPH } from '../../src/domain/home/home-map.ts'
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

  it('migrates the v19 manual to the current generation without touching the other rooms', async () => {
    const home = copyFixture()
    const service = new AssistantMemory(new Context(), { dataDir: join(home, 'assistant') })
    await service.ensureHome()

    const manual = readFileSync(join(home, 'assistant', 'AGENTS.md'), 'utf8')
    expect(manual).toContain(`home-manual v${String(HOME_MANUAL_VERSION)}`)
    expect(manual).toContain(CURRENT_ONE_QUESTION_PARAGRAPH)
    expect(manual).not.toContain(RETIRED_ONE_QUESTION_PARAGRAPH)
    expect(service.manualSnapshot()).toContain(CURRENT_ONE_QUESTION_PARAGRAPH)
    expect(service.manualSnapshot()).not.toContain('generation v19')

    const brief = await service.curate()
    expect(brief.findings.find(finding => finding.code === 'unreadable-file')).toBeUndefined()
    expect(brief.findings.find(finding => finding.code === 'page-unreadable')).toBeUndefined()
    expect(brief.findings.find(finding => finding.code === 'manual-stale-scaffold')).toBeUndefined()
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
