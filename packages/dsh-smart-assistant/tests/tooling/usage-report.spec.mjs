/**
 * Fixtures for the intent-level dashboard (`dev/reports/usage-report.mjs`). The dashboard is evidence, so
 * its parsing is pinned: the shapes it reads are the ones verified in real logs, and the report must
 * not invent a field a log does not carry.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { homeCounts, mergeSummaries, renderReport, sessionLogs, summarizeEvents } from '../../../../dev/reports/usage-report.mjs'

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
  { type: 'llm/retry', data: { retryId: 'r', turn: 1, step: 1, failure: { code: 'TRANSPORT', message: 'DeepSeek API stream failed' } } },
  { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
]

describe('summarizeEvents', () => {
  it('counts requests, tool mix, self-use, friction and models from the verified event shapes', () => {
    const summary = summarizeEvents(events)
    expect(summary.hasSession).toBe(true)
    expect(summary.requests).toBe(1)
    expect(summary.toolCalls).toEqual({ assistant_memory: 1, bash: 1, assistant_reflect: 1 })
    expect(summary.assistantToolSessions).toBe(1)
    expect(summary.retries).toBe(1)
    expect(summary.failureCodes).toEqual({ TRANSPORT: 1 })
    expect([...summary.models]).toEqual(['p/m'])
    expect(summary.reasons).toEqual({ completed: 1 })
    expect(summary.errorTurns).toBe(0)
    // A plain user message is the principal speaking.
    expect(summary.principalMessages).toBe(1)
    expect(summary.injectedUserMessages).toBe(0)
  })

  it('counts injected preambles separately from the principal — the meter measures real use', () => {
    // The real shapes (calibrated on live logs): the collaboration boundary, workspace
    // instructions, and the runtime context arrive as user messages. Counting them as the
    // principal's made a run of injected preambles read as "the principal tested the panel".
    const summary = summarizeEvents([
      { type: 'user/message', data: { content: [{ type: 'text', text: '[Collaboration boundary] You may change the working tree, but you do not commit' }] } },
      { type: 'user/message', data: { content: [{ type: 'text', text: '<system-reminder>\nAdditional instructions from: dev/AGENTS.md' }] } },
      { type: 'user/message', data: { content: [{ type: 'text', text: 'Current runtime context. This snapshot supersedes earlier snapshots.' }] } },
      { type: 'user/message', data: { content: [{ type: 'text', text: '季末签单的事我想好了。' }] } },
      { type: 'user/message', data: { content: [{ type: 'text', text: '[桌面] 行动「台账」已经办完了。请记录结果。' }] } },
    ])
    expect(summary.userMessages).toBe(5)
    expect(summary.injectedUserMessages).toBe(3)
    expect(summary.panelMessages).toBe(1)
    expect(summary.principalMessages).toBe(1)
  })

  it('separates API-transport error turns from unexplained ones — only the latter can be product defects', () => {
    // The classification IS the dig: 2026-09-27's manual investigation of 5 error turns found
    // every one preceded by TRANSPORT retries (API-side transients), which the turn/end reason
    // alone cannot say — it carries only the kind. Pin the rule so future reports answer it
    // themselves: an error turn with retries is API-side; one without is worth digging.
    const summary = summarizeEvents([
      { type: 'session', data: null },
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'llm/retry', data: { turn: 1, step: 1, failure: { code: 'TRANSPORT', message: 'stream failed' } } },
      { type: 'llm/retry', data: { turn: 1, step: 1, failure: { code: 'RATE_LIMIT', message: 'slow down' } } },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'error' } } },
      { type: 'turn/start', data: { turn: 2 } },
      { type: 'turn/end', data: { turn: 2, reason: { kind: 'error' } } },
    ])
    expect(summary.errorTurns).toBe(2)
    expect(summary.errorTurnsWithRetries).toBe(1)
    expect(summary.failureCodes).toEqual({ TRANSPORT: 1, RATE_LIMIT: 1 })
  })

  it('renders the failure-code breakdown and the transport correlation on the friction line', () => {
    const summary = summarizeEvents([
      { type: 'session', data: null },
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'llm/retry', data: { turn: 1, step: 1, failure: { code: 'TRANSPORT', message: 'stream failed' } } },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'error' } } },
    ])
    const text = renderReport(mergeSummaries([summary]), {
      memories: 0, archivedMemories: 0, threads: 0, archivedThreads: 0, skills: 0, archivedSkills: 0, pages: 0,
    })
    expect(text).toContain('LLM 重试 1（TRANSPORT×1）')
    expect(text).toContain('伴随重试 1/1')
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
    expect(text).toContain('真人 1')
    expect(text).toContain('注入前导 0 另计')
    expect(text).toContain('知识页 2')
  })
})

describe('sessionLogs', () => {
  it('finds every writer generation, and only session logs', () => {
    const home = temp('home-')
    const project = join(home, 'sessions', '--tmp-probe--')
    for (const [session, file] of [
      ['session-old', 'session.v3.jsonl.zstd'],
      ['session-new', 'session.v4.jsonl.zstd'],
      ['session-locked', 'session.lock'],
      ['session-junk', 'notes.txt'],
    ]) {
      mkdirSync(join(project, session), { recursive: true })
      writeFileSync(join(project, session, file), 'x', 'utf8')
    }

    // The log name carries the writer generation, which moves with the pinned DSH. A name pinned to
    // one generation made the dashboard and `pnpm eval` read no session at all after the 0.1.7 move
    // (symptom: "no session log was produced", with the launch itself succeeding).
    expect(sessionLogs(home).sort()).toEqual([
      join(project, 'session-new', 'session.v4.jsonl.zstd'),
      join(project, 'session-old', 'session.v3.jsonl.zstd'),
    ])
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
