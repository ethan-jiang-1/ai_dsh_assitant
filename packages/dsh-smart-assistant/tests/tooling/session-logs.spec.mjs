/**
 * Fixtures for the session-log core (`dev/lib/session-logs.mjs`) — the reading judge the dashboard,
 * the eval runners and the live probes all share. Two facts are pinned here because both were
 * learned from real logs: a log NAME carries the writer generation (never pin one), and a
 * `user/message` is classified by its SOURCE STRUCTURE (with a text fallback for old shapes).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { classifyUserMessage, sessionLogs, sessionSnapshot, sessionsCreatedBetween, stripPreamble } from '../../../../dev/lib/session-logs.mjs'

const dirs = []

function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('classifyUserMessage', () => {
  it('classifies by source structure, and falls back to text for logs that carry none', () => {
    // 2026-10-11: two real shapes were being misread as the principal's own words.
    //  (a) the `time-context` preamble ("Time sampled while preparing turn 1, step 1: …") — a
    //      harness injection, one per turn, so it inflated the principal's side systematically;
    //  (b) the panel marker's first generation `[桌面] ` — panel-written prompts from before the
    //      2026-10-11 rename, which text matching on `[面板] ` alone counted as the principal's.
    // The robust judge is structural: `data.source.kind` (`'user'` means a person or the panel)
    // plus `rpcId` (`desk-…` = written by the panel over RPC). Both generations carry that.
    expect(classifyUserMessage({ data: { source: { kind: 'user', rpcId: 'desk-1791110465472-t4qtjt' }, content: [{ type: 'text', text: '[桌面] 刷新我的桌面' }] } })).toBe('panel')
    expect(classifyUserMessage({ data: { source: { kind: 'user', rpcId: '8ca67eea-ac48-4c90-969e-cd303f702e98' }, content: [{ type: 'text', text: '季末签单的事我想好了。' }] } })).toBe('principal')
    expect(classifyUserMessage({ data: { source: { kind: 'time-context', form: 'snapshot' }, content: [{ type: 'text', text: 'Time sampled while preparing turn 1, step 1: 2026-10-11T23:26:33+08:00' }] } })).toBe('injected')
    // Serialized-source logs (desk-loop's shape) parse the same way.
    expect(classifyUserMessage({ data: { source: '{"kind":"user","rpcId":"desk-1-abc"}' } })).toBe('panel')
    // No source at all: the text fallback still has to know both marker generations and the
    // time-sample preamble.
    expect(classifyUserMessage({ data: { content: [{ type: 'text', text: 'Time sampled while preparing turn 2, step 1: 2026-10-04T18:33:08+08:00' }] } })).toBe('injected')
    expect(classifyUserMessage({ data: { content: [{ type: 'text', text: '[桌面] 我批准知识页「管理视角 · 财务」。' }] } })).toBe('panel')
    expect(classifyUserMessage({ data: { content: [{ type: 'text', text: '大客户要求再让 5 个点。' }] } })).toBe('principal')
  })
})

describe('sessionSnapshot / sessionsCreatedBetween', () => {
  it('diffs what a run created — directory names, not log files, and a missing tree is empty', () => {
    const home = temp('home-')
    const project = join(home, 'sessions', '--tmp-probe--')
    mkdirSync(join(project, 'session-before-run'), { recursive: true })
    const before = sessionSnapshot(home)
    expect([...before]).toEqual(['session-before-run'])
    // A log-less new directory still counts: the session dir is mkdir'd at creation while the log
    // file lands later — the probes' before/after diff must not depend on log write-out timing
    // (audit 261020 #20: the "newest session dir" guess this replaces misattributes sessions).
    mkdirSync(join(project, 'session-created-mid-run'), { recursive: true })
    expect(sessionsCreatedBetween(before, sessionSnapshot(home))).toEqual(['session-created-mid-run'])
    // A home with no sessions tree snapshots as empty, not an error (fresh throwaway homes).
    expect([...sessionSnapshot(join(home, 'no-sessions-here'))]).toEqual([])
  })
})

describe('stripPreamble', () => {
  it('drops the collaboration boundary up to the first blank line, and keeps clean text as-is', () => {
    // The preamble arrives glued to the FIRST user message while `source.kind` stays 'user', so no
    // structural judge can see it — the strip is mechanical (originally desk-loop's, now shared
    // with the eval-session criterion: one judge, one home).
    expect(stripPreamble('[Collaboration boundary] You may change the working tree.\n\n季末签单的事我想好了。'))
      .toBe('季末签单的事我想好了。')
    // Preamble-only turn: nothing human left (an empty turn is no window at all).
    expect(stripPreamble('[Collaboration boundary] You may change the working tree.')).toBe('')
    expect(stripPreamble('你好，接着上次的说。')).toBe('你好，接着上次的说。')
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
