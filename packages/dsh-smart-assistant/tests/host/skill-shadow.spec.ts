/**
 * Shadow visibility (tri-line proposal 2026-09-24, slice 1b): a learned skill that lost the
 * registry's name resolution exists on disk but will never load, and before this slice the only
 * trace was a provider logger warn. These tests pin the pure join (who lost, to whom) and the
 * service's plumbing of the probe result into the curation brief.
 */

import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'
import { shadowedLearnedSkills } from '../../src/domain/skills/shadow.ts'

const LEARNED = 'assistant-learned'

describe('shadowedLearnedSkills (pure join)', () => {
  it('names the learned skills another provider owns, and only those', () => {
    const winners = new Map([
      ['home-curation', 'skill-filesystem'],
      ['staging-reset', LEARNED],
      ['unrelated-curated', 'skill-filesystem'],
    ])

    expect(shadowedLearnedSkills(winners, true, ['home-curation', 'staging-reset', 'campaign-log'], LEARNED))
      .toEqual({ 'home-curation': 'skill-filesystem' })
  })

  it('reports nothing on an incomplete catalog read — a race is not a verdict', () => {
    const winners = new Map([['home-curation', 'skill-filesystem']])
    expect(shadowedLearnedSkills(winners, false, ['home-curation'], LEARNED)).toEqual({})
  })

  it('leaves names absent from the catalog to the scan findings, not the shadow check', () => {
    // 'campaign-log' exists in the room but resolves nowhere (broken bundle / disabled):
    // that is the loader-ignores-it class of failure, already reported by the scan.
    expect(shadowedLearnedSkills(new Map(), true, ['campaign-log'], LEARNED)).toEqual({})
  })
})

describe('shadow visibility (service plumbing)', () => {
  const boot = memoryPool('assistant-shadow-')

  it('surfaces probe results as warn findings, and reports none without a probe', async () => {
    const { service } = boot()
    await service.writeSkill({ name: 'home-curation', description: 'collides on purpose', body: 'steps' })

    // Without a registry probe (tests, host-side maintenance): no shadow findings.
    const plain = await service.curate()
    expect(plain.findings.map(finding => finding.code)).not.toContain('skill-shadowed')

    // With the probe's verdict: the silent loss becomes a named finding.
    const shadowed = await service.curate({ 'home-curation': 'skill-filesystem' })
    const finding = shadowed.findings.find(item => item.code === 'skill-shadowed')
    expect(finding?.severity).toBe('warn')
    expect(finding?.refs).toEqual(['home-curation'])

    // The learned-skill name list the probe joins against is the room scan.
    expect(await service.learnedSkillNames()).toEqual(['home-curation'])
  })
})
