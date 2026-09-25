/**
 * Fixtures for the intent-level dashboard (`dev/usage-report.mjs`). The dashboard is evidence, so
 * its parsing is pinned: the shapes it reads are the ones verified in real logs, and the report must
 * not invent a field a log does not carry.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { homeCounts, mergeSummaries, renderReport, summarizeEvents } from '../../../dev/usage-report.mjs'

const dirs = []

function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const events = [
  { type: 'session', data: null },
  { type: 'system/message', data: { turn: 1, step: 1, message: { role: 'system', content: [] } } },
  { type: 'user/message', data: { content: [{ type: 'text', text: 'hi' }] } },
  { type: 'turn/start', data: { turn: 1 } },
  { type: 'tool/call', data: { name: 'assistant_memory', arguments: {} } },
  { type: 'tool/call', data: { name: 'bash', arguments: {} } },
  { type: 'tool/call', data: { name: 'assistant_reflect', arguments: {} } },
  { type: 'assistant/message', data: { message: { role: 'assistant', content: [] } } },
  { type: 'request/context', data: { provider: 'p', model: 'm' } },
  { type: 'llm/retry', data: { retryId: 'r' } },
  { type: 'turn/end', data: { reason: { kind: 'completed' } } },
]

describe('summarizeEvents', () => {
  it('counts requests, tool mix, self-use, friction and models from the verified event shapes', () => {
    const summary = summarizeEvents(events)
    expect(summary.hasSession).toBe(true)
    expect(summary.requests).toBe(1)
    expect(summary.toolCalls).toEqual({ assistant_memory: 1, bash: 1, assistant_reflect: 1 })
    expect(summary.assistantToolSessions).toBe(1)
    expect(summary.retries).toBe(1)
    expect([...summary.models]).toEqual(['p/m'])
    expect(summary.reasons).toEqual({ completed: 1 })
    expect(summary.errorTurns).toBe(0)
  })

  it('marks a session without a home-room tool as not self-using, and counts non-completed turns as friction', () => {
    const summary = summarizeEvents([
      { type: 'session', data: null },
      { type: 'tool/call', data: { name: 'read', arguments: {} } },
      { type: 'turn/end', data: { reason: { kind: 'error' } } },
    ])
    expect(summary.assistantToolSessions).toBe(0)
    expect(summary.errorTurns).toBe(1)
  })

  it('never invents a field the log does not carry', () => {
    const text = renderReport(mergeSummaries([summarizeEvents(events)]), {
      memories: 1, archivedMemories: 0, threads: 0, archivedThreads: 0, skills: 0, archivedSkills: 0, pages: 2,
    })
    expect(text.split('\n').some(line => line.startsWith('- preset'))).toBe(false)
    expect(text).toContain('自用率：1/1')
    expect(text).toContain('知识页 2')
  })
})

describe('homeCounts', () => {
  it('tolerates a home that does not exist', () => {
    expect(homeCounts('/nonexistent-home-assistant')).toEqual({
      memories: 0, archivedMemories: 0, threads: 0, archivedThreads: 0, skills: 0, archivedSkills: 0, pages: 0,
    })
  })

  it('does not count the archive subdirectory as an entry, and counts skills by their bundle', () => {
    const home = temp('home-')
    mkdirSync(join(home, 'memory', 'archive'), { recursive: true })
    writeFileSync(join(home, 'memory', 'a.md'), 'x', 'utf8')
    writeFileSync(join(home, 'memory', 'archive', 'old.md'), 'x', 'utf8')
    mkdirSync(join(home, 'research', 'archive'), { recursive: true })
    mkdirSync(join(home, 'skills', 'archive'), { recursive: true })
    mkdirSync(join(home, 'skills', 'good-skill'), { recursive: true })
    writeFileSync(join(home, 'skills', 'good-skill', 'SKILL.md'), 'x', 'utf8')
    mkdirSync(join(home, 'skills', 'not-a-bundle'), { recursive: true })
    mkdirSync(join(home, 'knowledge'), { recursive: true })
    writeFileSync(join(home, 'knowledge', 'p.md'), 'x', 'utf8')

    expect(homeCounts(home)).toEqual({
      memories: 1, archivedMemories: 1, threads: 0, archivedThreads: 0, skills: 1, archivedSkills: 0, pages: 1,
    })
  })
})
