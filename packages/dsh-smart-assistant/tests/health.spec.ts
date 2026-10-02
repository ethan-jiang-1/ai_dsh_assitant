/**
 * The curation brief is the home's "let code check it" surface, so these tests pin each finding kind
 * against a minimal input. If a check stops firing, the home rots silently — which is the failure
 * mode this whole module exists to prevent.
 */

import { describe, expect, it } from 'vitest'
import { curateHome } from '../src/home/health.ts'
import type { CurationInput } from '../src/home/health.ts'
import type { MemoryRecord } from '../src/memory/record.ts'
import type { ResearchThread } from '../src/research/thread.ts'

const now = new Date('2026-09-23T00:00:00.000Z')

function memory(overrides: Partial<MemoryRecord> & { id: string }): MemoryRecord {
  return {
    kind: 'fact',
    status: 'active',
    created: '2026-09-01T00:00:00.000Z',
    updated: '2026-09-01T00:00:00.000Z',
    tags: [],
    importance: 3,
    text: 'placeholder',
    ...overrides,
  }
}

function thread(overrides: Partial<ResearchThread> & { id: string }): ResearchThread {
  return {
    status: 'open',
    question: 'placeholder?',
    why: 'because it decides the layout',
    evidence: [],
    created: '2026-09-01T00:00:00.000Z',
    updated: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function input(overrides: Partial<CurationInput> = {}): CurationInput {
  return {
    memories: [],
    threads: [],
    memoryFailures: [],
    researchFailures: [],
    duplicatedIds: [],
    knownIds: [],
    skills: [],
    knowledgePages: 0,
    retiredSkillBundles: 0,
    skillSnapshots: 0,
    skillUsage: {},
    shadowedSkills: {},
    digestBytes: 100,
    digestMaxBytes: 4096,
    digestTruncated: false,
    digestOmittedMemories: 0,
    staleResearchDays: 30,
    staleSkillDays: 30,
    retireSkillDays: 90,
    now,
    ...overrides,
  }
}

function codes(value: CurationInput): string[] {
  return curateHome(value).findings.map(finding => finding.code)
}

describe('curateHome', () => {
  it('reports a clean home as clean and counts what it saw', () => {
    const brief = curateHome(input({
      memories: [memory({ id: 'a-1' })],
      threads: [thread({ id: 't-1' })],
      knownIds: ['a-1', 't-1'],
      skills: [{ dirName: 'staging-reset', name: 'staging-reset', description: 'when resetting', origin: 'learned' }],
      retiredSkillBundles: 2,
      skillSnapshots: 1,
    }))

    expect(brief.findings).toEqual([])
    expect(brief.counts).toMatchObject({
      activeMemories: 1,
      openThreads: 1,
      learnedSkills: 1,
      retiredSkillBundles: 2,
      skillSnapshots: 1,
    })
  })

  it('names unreadable files instead of letting them vanish from the digest', () => {
    expect(codes(input({ memoryFailures: [{ path: '/h/memory/bad.md', reason: 'no frontmatter' }] })))
      .toContain('unreadable-file')
  })

  it('reports a record whose supersede target is gone', () => {
    const findings = curateHome(input({
      memories: [memory({ id: 'a-1', supersedes: 'a-0' })],
      knownIds: ['a-1'],
    })).findings

    expect(findings.map(finding => finding.code)).toContain('dangling-reference')
    expect(findings[0]?.refs).toEqual(['a-1', 'a-0'])
  })

  it('reports a promoted thread whose destination is gone', () => {
    expect(codes(input({
      threads: [thread({ id: 't-1', status: 'promoted', promotedTo: 'a-9' })],
      knownIds: ['t-1'],
    }))).toContain('dangling-reference')
  })

  it('reports near-duplicate memories with the pair and the overlap', () => {
    const findings = curateHome(input({
      memories: [
        memory({ id: 'a-1', text: 'Deploys go through the staging gate before production.' }),
        memory({ id: 'a-2', text: 'Deploys go through the staging gate before production always.' }),
        memory({ id: 'a-3', text: 'The user prefers terse answers in Chinese.' }),
      ],
      knownIds: ['a-1', 'a-2', 'a-3'],
    })).findings.filter(finding => finding.code === 'near-duplicate')

    expect(findings).toHaveLength(1)
    expect(findings[0]?.refs).toEqual(['a-1', 'a-2'])
  })

  it('reports a thread that stopped moving', () => {
    expect(codes(input({
      threads: [thread({ id: 't-1', updated: '2026-07-01T00:00:00.000Z' })],
      knownIds: ['t-1'],
    }))).toContain('stale-thread')
  })

  it('does not report a parked thread as stalled', () => {
    expect(codes(input({
      threads: [thread({ id: 't-1', status: 'parked', updated: '2026-07-01T00:00:00.000Z' })],
      knownIds: ['t-1'],
    }))).not.toContain('stale-thread')
  })

  it('reports digest budget pressure and duplicate ids', () => {
    expect(codes(input({ digestTruncated: true }))).toContain('digest-over-budget')
    expect(codes(input({ duplicatedIds: ['a-1'] }))).toContain('duplicate-id')
  })

  it('names what the budget is squeezing — memory omission is actionable, signpost omission is not', () => {
    // Memory lines off the desktop: the cure is consolidation (retire / supersede).
    const memorySqueezed = curateHome(input({ digestTruncated: true, digestOmittedMemories: 2 }))
      .findings.find(finding => finding.code === 'digest-over-budget')
    expect(memorySqueezed?.message).toContain('invisible in every session')

    // Lower-section truncation (threads / knowledge signposts): memory writes stay open —
    // pointing the model at memory retirement here would misdirect the cure (2026-10-02 keying).
    const signpostsSqueezed = curateHome(input({ digestTruncated: true, digestOmittedMemories: 0 }))
      .findings.find(finding => finding.code === 'digest-over-budget')
    expect(signpostsSqueezed?.message).toContain('memory writes remain open')
    expect(signpostsSqueezed?.message).not.toContain('retire the weakest')
  })

  it('reports skills the loader would ignore', () => {
    const found = codes(input({
      skills: [
        { dirName: 'mismatch', name: 'other-name', description: 'x', origin: 'learned' },
        { dirName: 'Bad_Name', name: 'Bad_Name', description: 'x', origin: 'learned' },
        { dirName: 'no-description', name: 'no-description', origin: 'learned' },
        { dirName: 'hand-written', name: 'hand-written', description: 'x' },
        { dirName: 'unreadable' },
      ],
    }))

    expect(found).toContain('skill-name-mismatch')
    expect(found).toContain('skill-invalid-name')
    expect(found).toContain('skill-missing-description')
    expect(found).toContain('skill-without-provenance')
  })

  it('lists warns before infos', () => {
    const findings = curateHome(input({
      memoryFailures: [{ path: '/h/memory/bad.md', reason: 'no frontmatter' }],
      skills: [{ dirName: 'hand-written', name: 'hand-written', description: 'x' }],
    })).findings

    expect(findings[0]?.severity).toBe('warn')
    expect(findings.at(-1)?.severity).toBe('info')
  })

  it('joins the usage ledger into least-used-first lines, keeping never-loaded skills', () => {
    const brief = curateHome(input({
      skills: [
        { dirName: 'often-used', name: 'often-used', description: 'x', origin: 'learned' },
        { dirName: 'never-used', name: 'never-used', description: 'x', origin: 'learned' },
        { dirName: 'once-used', name: 'once-used', description: 'x', origin: 'learned' },
        { dirName: 'unreadable' },
      ],
      skillUsage: {
        'often-used': { count: 4, lastUsedAt: '2026-09-22T00:00:00.000Z' },
        'once-used': { count: 1, lastUsedAt: '2026-09-01T00:00:00.000Z' },
        'a-curated-skill': { count: 9, lastUsedAt: '2026-09-23T00:00:00.000Z' },
      },
      skillUsageSince: '2026-09-20T00:00:00.000Z',
    }))

    // Least-used first (retirement candidates first), never-loaded included, curated names excluded.
    expect(brief.skillUsage.map(line => [line.name, line.count])).toEqual([
      ['never-used', 0],
      ['once-used', 1],
      ['often-used', 4],
    ])
    expect(brief.skillUsage[0]?.lastUsedAt).toBeUndefined()
    expect(brief.skillUsage[1]?.daysSinceLastUse).toBe(22)
    expect(brief.skillUsage[2]?.daysSinceLastUse).toBe(1)
    // The window travels with the counts so a consumer can say "not loaded since <date>".
    expect(brief.skillUsageSince).toBe('2026-09-20T00:00:00.000Z')
  })

  it('warns when the usage ledger exists but is unreadable', () => {
    const findings = curateHome(input({
      skillUsageFailure: { path: '/h/skill-usage.json', reason: 'not a valid skill-usage ledger' },
    })).findings

    expect(findings.map(finding => finding.code)).toContain('skill-usage-unreadable')
    expect(findings[0]?.severity).toBe('warn')
    expect(findings[0]?.refs).toEqual(['/h/skill-usage.json'])
  })

  it('warns on a learned skill shadowed by another provider', () => {
    const findings = curateHome(input({
      skills: [{ dirName: 'home-curation', name: 'home-curation', description: 'x', origin: 'learned' }],
      shadowedSkills: { 'home-curation': 'skill-filesystem' },
    })).findings

    expect(findings.map(finding => finding.code)).toContain('skill-shadowed')
    expect(findings[0]?.severity).toBe('warn')
    expect(findings[0]?.refs).toEqual(['home-curation'])
    expect(findings[0]?.message).toContain('skill-filesystem')
    expect(findings[0]?.message).toContain('never load')
  })

  it('excludes shadowed names from the usage lines — their loads belong to the winner', () => {
    const brief = curateHome(input({
      skills: [
        { dirName: 'home-curation', name: 'home-curation', description: 'x', origin: 'learned' },
        { dirName: 'staging-reset', name: 'staging-reset', description: 'x', origin: 'learned' },
      ],
      skillUsage: {
        // The name was loaded — but the curated body served it, not the shadowed bundle.
        'home-curation': { count: 3, lastUsedAt: '2026-09-22T00:00:00.000Z' },
        'staging-reset': { count: 1, lastUsedAt: '2026-09-23T00:00:00.000Z' },
      },
      shadowedSkills: { 'home-curation': 'skill-filesystem' },
    }))

    expect(brief.skillUsage.map(line => line.name)).toEqual(['staging-reset'])
  })

  it('reports stale and retirement-ready skills by use-by date, anchored honestly', () => {
    const stale = curateHome(input({
      skills: [
        // 45 days since the last load: stale (info), not yet retirement-ready.
        { dirName: 'fading-skill', name: 'fading-skill', description: 'x', origin: 'learned', learnedAt: '2026-01-01T00:00:00.000Z' },
        // 100 days since it was learned, never loaded: retirement-ready (warn).
        { dirName: 'dead-skill', name: 'dead-skill', description: 'x', origin: 'learned', learnedAt: '2026-06-15T00:00:00.000Z' },
        // Neither ledger entry nor learnedAt: cannot be dated, no use-by finding.
        { dirName: 'hand-written', name: 'hand-written', description: 'x' },
        // Loaded today: alive.
        { dirName: 'alive-skill', name: 'alive-skill', description: 'x', origin: 'learned', learnedAt: '2026-06-15T00:00:00.000Z' },
      ],
      skillUsage: {
        'fading-skill': { count: 2, lastUsedAt: '2026-08-09T00:00:00.000Z' },
        'alive-skill': { count: 5, lastUsedAt: '2026-09-23T00:00:00.000Z' },
      },
    })).findings

    const codes = stale.map(finding => finding.code)
    expect(codes).toContain('skill-stale')
    expect(codes).toContain('skill-retirable')
    expect(stale.filter(finding => finding.code === 'skill-stale').map(finding => finding.refs[0]))
      .toEqual(['fading-skill'])
    const retriable = stale.find(finding => finding.code === 'skill-retirable')
    expect(retriable?.severity).toBe('warn')
    expect(retriable?.message).toContain('never loaded since it was learned 2026-06-15')
  })

  it('leaves a shadowed skill to the shadow finding, not a use-by date', () => {
    const findings = curateHome(input({
      skills: [{ dirName: 'dead-shadowed', name: 'dead-shadowed', description: 'x', origin: 'learned', learnedAt: '2026-01-01T00:00:00.000Z' }],
      shadowedSkills: { 'dead-shadowed': 'skill-filesystem' },
    })).findings

    expect(findings.map(finding => finding.code)).toEqual(['skill-shadowed'])
  })
})
