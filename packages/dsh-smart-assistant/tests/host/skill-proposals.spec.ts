/**
 * The skill-proposal inbox (tri-line proposal 2026-09-24, phase 3): propose-only entry, hand-edit
 * approval, and the land verb. The revision counter keeps an approval bound to the content in
 * the file at approval time — the run2skill chain's purpose without the file-per-revision weight.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'
import { proposalFromEntry, proposalToDocument, renderProposalPrompt, validateProposalData, type SkillProposal } from '../../src/domain/skills/proposal.ts'
import type { RoomListing } from '../../src/domain/home/room.ts'
import { listProposals } from '../../src/host/skills-room.ts'

const listedProposalEntry: RoomListing['entries'][number] = {
  id: 'staging-reset',
  path: '/home/skills/proposals/staging-reset.md',
  data: {
    description: 'how to reset staging safely',
    status: 'proposed',
    revision: 1,
    created: '2026-09-24T00:00:00.000Z',
    updated: '2026-09-24T00:00:00.000Z',
  },
  body: 'Stop the workers first.',
}
const invalidProposalEntry: RoomListing['entries'][number] = {
  id: 'invalid-proposal',
  path: '/home/skills/proposals/invalid-proposal.md',
  data: {},
  body: 'Missing required fields.',
}
const proposalReadFailure: RoomListing['failures'][number] = {
  path: '/home/skills/proposals/broken.md',
  reason: 'no frontmatter',
}
const proposalListing: RoomListing = {
  entries: [listedProposalEntry, invalidProposalEntry],
  failures: [proposalReadFailure],
}
const narrowProposalReader = {
  proposals: { list: async (): Promise<RoomListing> => proposalListing },
} satisfies Parameters<typeof listProposals>[0]

describe('listProposals narrow reader', () => {
  it('maps valid proposals, filters invalid entries, and preserves Room listing failures', async () => {
    const inbox = await listProposals(narrowProposalReader)
    expect(inbox.entries).toEqual([{
      id: 'staging-reset',
      status: 'proposed',
      revision: 1,
      description: 'how to reset staging safely',
      created: '2026-09-24T00:00:00.000Z',
      updated: '2026-09-24T00:00:00.000Z',
      body: 'Stop the workers first.',
    }])
    expect(inbox.failures).toEqual([proposalReadFailure])
  })
})

describe('proposal vocabulary (pure core)', () => {
  it('validates the required shape and renders the proposal slot prompt', () => {
    expect(validateProposalData({}).length).toBeGreaterThan(0)
    expect(validateProposalData({
      description: 'how to reset staging',
      status: 'proposed',
      revision: 1,
      created: '2026-09-24T00:00:00.000Z',
      updated: '2026-09-24T00:00:00.000Z',
    })).toEqual([])
    const prompt = renderProposalPrompt()
    expect(prompt).toContain('propose_skill')
    expect(prompt).toContain('NOT in your skills')
    expect(prompt).toContain('revision bumps')
  })
})

describe('the proposal inbox (service)', () => {
  const boot = memoryPool('assistant-proposals-')

  it('proposes without touching the skills room, revises by name, and never lands unapproved', async () => {
    const { service } = boot()
    const first = await service.proposeSkill({
      name: 'staging-reset',
      description: 'how to reset staging safely',
      body: 'Stop the workers first.',
      source: 'session-abc',
    })
    expect(first.status).toBe('proposed')
    expect(first.revision).toBe(1)
    // The inbox is not the skills room: nothing loadable, nothing in the scan.
    expect(await service.learnedSkillNames()).toEqual([])

    // Revising the same name bumps the revision and replaces the text.
    const revised = await service.proposeSkill({
      name: 'staging-reset',
      description: 'how to reset staging safely',
      body: 'Stop the workers first, then drain the queue.',
    })
    expect(revised.revision).toBe(2)
    expect(revised.created).toBe(first.created)

    // Landing requires the hand-edit approval.
    await expect(service.landSkill('staging-reset')).rejects.toThrow('not approved')

    // The hand review: a person edits the proposal file's status.
    const path = join(service.paths.skillProposalsDir, 'staging-reset.md')
    writeFileSync(path, readFileSync(path, 'utf8').replace('status: proposed', 'status: approved'), 'utf8')

    const landed = await service.landSkill('staging-reset')
    expect(landed.name).toBe('staging-reset')
    expect(await service.learnedSkillNames()).toEqual(['staging-reset'])

    // The landed skill carries proposal provenance; the proposal stays as a landed corpse.
    const skillText = readFileSync(join(service.paths.skillsDir, 'staging-reset', 'SKILL.md'), 'utf8')
    expect(skillText).toContain('proposal:staging-reset#r2')
    const inbox = await service.listProposals()
    expect(inbox.entries.find(item => item.id === 'staging-reset')?.status).toBe('landed')

    // A re-proposal after landing starts a fresh review cycle; an approved-but-unlanded name
    // refuses to be revised from under the pending approval.
    await expect(service.proposeSkill({
      name: 'staging-reset',
      description: 'x',
      body: 'y',
    })).resolves.toMatchObject({ revision: 3, status: 'proposed' })
    const approvedPath = join(service.paths.skillProposalsDir, 'staging-reset.md')
    writeFileSync(approvedPath, readFileSync(approvedPath, 'utf8').replace('status: proposed', 'status: approved'), 'utf8')
    await expect(service.proposeSkill({ name: 'staging-reset', description: 'x', body: 'z' }))
      .rejects.toThrow('approved and waiting to land')
  })

  it('rejects drafts the skill contract would reject', async () => {
    const { service } = boot()
    await expect(service.proposeSkill({ name: 'Bad Name', description: 'x', body: 'y' }))
      .rejects.toThrow('proposal rejected')
    await expect(service.proposeSkill({ name: 'ok-name', description: '', body: 'y' }))
      .rejects.toThrow('proposal rejected')
  })

  it('surfaces waiting decisions in the curate brief', async () => {
    const { service } = boot()
    await service.proposeSkill({ name: 'waiting-skill', description: 'x', body: 'y' })
    let brief = await service.curate()
    // Freshly proposed: not yet aging, not approved — no finding, just counts of the room's health.
    expect(brief.findings.map(finding => finding.code)).not.toContain('proposal-awaiting-land')

    // The approval edit turns it into a decision made and not executed.
    const path = join(service.paths.skillProposalsDir, 'waiting-skill.md')
    writeFileSync(path, readFileSync(path, 'utf8').replace('status: proposed', 'status: approved'), 'utf8')
    brief = await service.curate()
    const finding = brief.findings.find(item => item.code === 'proposal-awaiting-land')
    expect(finding?.severity).toBe('info')
    expect(finding?.message).toContain('land_skill')

    // Round-tripping the vocabulary: the landed corpse still parses.
    const proposal: SkillProposal = {
      id: 'corpse-skill', status: 'landed', revision: 1, description: 'x',
      created: '2026-09-24T00:00:00.000Z', updated: '2026-09-24T00:00:00.000Z', body: 'y',
    }
    const document = proposalToDocument(proposal)
    expect(proposalFromEntry({ id: 'corpse-skill', path: '/x', data: document.data, body: document.body }))
      .toMatchObject({ status: 'landed' })
  })

  it('continues the revision history after a resolved proposal was archived', async () => {
    const { service } = boot()
    const old: SkillProposal = {
      id: 'archived-skill',
      status: 'rejected',
      revision: 3,
      description: 'old proposal',
      created: '2026-09-24T00:00:00.000Z',
      updated: '2026-09-24T00:00:00.000Z',
      body: 'old body',
    }
    const document = proposalToDocument(old)
    await service.proposals.write(old.id, document.data, document.body)
    await service.proposals.archive(old.id, { status: 'rejected' })

    const next = await service.proposeSkill({ name: old.id, description: 'new proposal', body: 'new body' })
    expect(next.revision).toBe(4)
    expect(next.created).toBe(old.created)
  })
})
