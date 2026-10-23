/**
 * The rooms payload projection (`src/domain/rooms/projection.ts`): one wire contract for the host
 * route and the client guard, plus the shared counts arithmetic.
 *
 * Acceptance points:
 * - `projectRooms` maps every room row, joins skill usage, and stamps the latest room/ledger time.
 * - The knowledge body is excerpted at the panel's 200-char boundary.
 * - `parseRooms` accepts the projected payload and rejects a wrong version, a missing revision,
 *   a missing row list, and a non-numeric count.
 * - `countsOf` is the one arithmetic the host and the client's optimistic recount share.
 */
import { describe, expect, it } from 'vitest'
import type { KnowledgePage } from '../../src/domain/knowledge/page.ts'
import type { ApprovalLine } from '../../src/domain/maintenance/receipt.ts'
import type { MemoryRecord } from '../../src/domain/memory/record.ts'
import type { ResearchThread } from '../../src/domain/research/thread.ts'
import type { LearnedSkillInfo } from '../../src/domain/home/health.ts'
import { countsOf, parseRooms, projectRooms } from '../../src/domain/rooms/projection.ts'

const memory: MemoryRecord = {
  id: 'm1', kind: 'fact', status: 'active', created: '2026-10-01T00:00:00.000Z',
  updated: '2026-10-20T00:00:00.000Z', text: '客户偏好周五对账', tags: ['billing'], importance: 3,
  source: 'user',
}
const thread: ResearchThread = {
  id: 't1', status: 'open', question: '要不要换供应商', why: '价格在涨',
  lean: '先比价', evidence: ['报价单'], created: '2026-10-01T00:00:00.000Z',
  updated: '2026-10-19T00:00:00.000Z',
}
const page: KnowledgePage = {
  id: 'k1', status: 'stable', type: 'concept', title: '对账节奏',
  generated: { by: 'agent:spec', at: '2026-10-21T00:00:00.000Z' },
  sources: [{ resource: 'memory/m1' }], tags: [], body: 'x'.repeat(210), links: [],
}
const skill: LearnedSkillInfo = {
  dirName: 'billing', name: 'billing-check', description: 'check the bill', origin: 'learned',
  source: 'demo', learnedAt: '2026-10-18T00:00:00.000Z',
}
const ledger: ApprovalLine[] = [{ at: '2026-10-23T00:00:00.000Z', kind: 'approve', id: 'audit-1' }]
const usage = { usage: { 'billing-check': { count: 2, lastUsedAt: '2026-10-22T00:00:00.000Z' } } }

const input = {
  memories: { entries: [memory], failures: [{ path: '/home/assistant/memory/bad.md', reason: 'no frontmatter' }] },
  threads: { entries: [thread], failures: [] },
  knowledge: { entries: [page], failures: [] },
  skills: { entries: [skill], failures: [] },
  usage,
  ledger,
} as const

describe('projectRooms', () => {
  it('maps every room row and stamps the latest room or ledger time', () => {
    const payload = projectRooms(input)
    expect(payload.schemaVersion).toBe(1)
    expect(payload.revision).toBe('')
    expect(payload.generatedAt).toBe('2026-10-23T00:00:00.000Z')
    expect(payload.counts).toEqual({ memories: 1, threads: 1, skills: 1, knowledgeStable: 1, knowledgeDraft: 0 })
    expect(payload.memories[0]).toEqual({
      id: 'm1', kind: 'fact', text: '客户偏好周五对账', updated: '2026-10-20T00:00:00.000Z', source: 'user',
    })
    expect(payload.research[0]).toMatchObject({ id: 't1', title: '要不要换供应商', lean: '先比价' })
    expect(payload.skills[0]).toMatchObject({ name: 'billing-check', count: 2, source: 'demo', origin: 'learned' })
    expect(payload.knowledge[0]).toMatchObject({ id: 'k1', status: 'stable', sources: ['memory/m1'] })
    expect(payload.problems).toEqual([{ room: 'memory', file: 'bad.md', reason: 'no frontmatter' }])
  })

  it('excerpts the knowledge body at the panel boundary', () => {
    const payload = projectRooms(input)
    expect(payload.knowledge[0]?.excerpt).toHaveLength(200)
  })
})

describe('parseRooms', () => {
  const payload = projectRooms(input)

  it('accepts the projected payload', () => {
    expect(parseRooms({ ...payload, revision: 'rev-1' })).toMatchObject({ schemaVersion: 1, revision: 'rev-1' })
  })

  it('rejects a wrong version, a missing revision, a missing row list, and a non-numeric count', () => {
    expect(parseRooms({ ...payload, schemaVersion: 2 })).toBeUndefined()
    expect(parseRooms({ ...payload, revision: undefined })).toBeUndefined()
    expect(parseRooms({ ...payload, ledger: undefined })).toBeUndefined()
    expect(parseRooms({ ...payload, counts: { ...payload.counts, memories: 'many' } })).toBeUndefined()
    expect(parseRooms(null)).toBeUndefined()
  })
})

describe('countsOf', () => {
  it('counts a partial payload without inventing rooms', () => {
    expect(countsOf({ memories: [{}, {}], knowledge: [{ status: 'stable' }, { status: 'draft' }, {}] }))
      .toEqual({ memories: 2, threads: 0, skills: 0, knowledgeStable: 1, knowledgeDraft: 1 })
    expect(countsOf({})).toEqual({ memories: 0, threads: 0, skills: 0, knowledgeStable: 0, knowledgeDraft: 0 })
  })
})
