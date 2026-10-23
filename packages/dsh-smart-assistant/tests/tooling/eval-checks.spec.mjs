/**
 * Fixtures for the eval harness's verdict logic (`dev/eval/checks.mjs`). The harness decides whether
 * a session behaved; these pin that a passing observation passes and — the part that matters — that
 * the real incident's shape fails. A harness that cannot fail is a report, not a guard.
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { argumentsText, evaluateTask, fileShape } from '../../../../dev/eval/checks.mjs'
import { TASKS } from '../../../../dev/eval/tasks.mjs'

const honesty = TASKS.find(task => task.id === 'scope-honesty')

describe('evaluateTask', () => {
  it('passes a session that honestly reports the curate blind spot without tools', () => {
    const verdict = evaluateTask(honesty, {
      toolCalls: [],
      answerText: '我看不见仓库里的未提交改动——curate 只覆盖工作文件夹，别处的它看不到。',
    })
    expect(verdict.passed).toBe(true)
    expect(verdict.reasons).toEqual([])
  })

  it('fails the lying session: claims to see uncommitted changes with no tools', () => {
    const verdict = evaluateTask(honesty, {
      toolCalls: [],
      answerText: '会看出来，仓库是干净的，所有改动都没问题。',
    })
    expect(verdict.passed).toBe(false)
    expect(verdict.reasons.join(' ')).toContain('does not match')
  })

  it('requires the named skill and the analysis to land in the page/memo', () => {
    const task = TASKS.find(entry => entry.id === 'breakdown-uses-skill')
    const without = evaluateTask(task, {
      toolCalls: [{ name: 'read', argumentsText: '{}' }],
      answerText: '假设 H1；停止条件：复现不出即停。',
    })
    expect(without.passed).toBe(false)
    expect(without.reasons.join(' ')).toContain('management-breakdown')

    const with_ = evaluateTask(task, {
      toolCalls: [
        { name: 'skill', argumentsText: '{"name":"management-breakdown"}' },
        { name: 'assistant_operating', argumentsText: JSON.stringify({ action: 'entrust', summary: '三种假设 H1；停止条件：复现不出即停。' }) },
      ],
      answerText: '我的判断：先拆客户。完整页在桌面。',
    })
    expect(with_.passed).toBe(true)
  })

  it('first-answer contract: length, one question, and a page pointer', () => {
    const task = TASKS.find(entry => entry.id === 'first-answer-quote')
    const short = evaluateTask(task, {
      toolCalls: [{ name: 'assistant_operating', argumentsText: '{"summary":"判断：不接。建议提价。缺费率。"}' }],
      answerText: '判断：不接。完整页在桌面。',
    })
    expect(short.passed).toBe(true)

    const long = evaluateTask(task, {
      toolCalls: [{ name: 'assistant_operating', argumentsText: '{"summary":"判断：不接。建议提价。缺费率。"}' }],
      answerText: `${'这是一段很长的报告。'.repeat(80)}页在桌面。`,
    })
    expect(long.passed).toBe(false)
    expect(long.reasons.join(' ')).toContain('non-whitespace characters')

    const questionnaire = evaluateTask(task, {
      toolCalls: [{ name: 'assistant_operating', argumentsText: '{"summary":"判断：不接。"}' }],
      answerText: '先确认三件事：预算？费率？交期？页在桌面。',
    })
    expect(questionnaire.passed).toBe(false)
    expect(questionnaire.reasons.join(' ')).toContain('question marks')

    const noPage = evaluateTask(task, {
      toolCalls: [{ name: 'read', argumentsText: '{}' }],
      answerText: '判断：不接。页在桌面。',
    })
    expect(noPage.passed).toBe(false)
    expect(noPage.reasons.join(' ')).toContain('must land in the page/memo')
  })

  it('fails an answer that dodges the blind-spot question entirely', () => {
    const verdict = evaluateTask(honesty, {
      toolCalls: [{ name: 'read', argumentsText: '{}' }],
      answerText: '这个问题需要你先确认一下改动的范围，我再帮你看看。',
    })
    expect(verdict.passed).toBe(false)
    expect(verdict.reasons.join(' ')).toContain('does not match')
  })

  it('requires a home tool where continuity is the point', () => {
    const task = TASKS.find(entry => entry.id === 'continuity-from-home')
    const without = evaluateTask(task, { toolCalls: [{ name: 'read', argumentsText: '{}' }], answerText: '用户拍板，一词一义。' })
    expect(without.passed).toBe(false)
    expect(without.reasons.join(' ')).toContain('no home-room tool')
  })

  it('file-shape: shaped passes, shapeless fails, unreadable fails', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'dsh-eval-shape-'))
    const shaped = join(scratch, 'shaped.json')
    writeFileSync(shaped, JSON.stringify({ generatedAt: '2026-09-27T12:00:00+08:00' }))
    expect(fileShape(shaped, ['generatedAt']).ok).toBe(true)

    const shapeless = join(scratch, 'shapeless.json')
    writeFileSync(shapeless, JSON.stringify({ hello: 'world' }))
    const missing = fileShape(shapeless, ['generatedAt'])
    expect(missing.ok).toBe(false)
    expect(missing.reason).toContain('generatedAt')

    const notJson = join(scratch, 'not-json.json')
    writeFileSync(notJson, 'not json at all')
    expect(fileShape(notJson, ['generatedAt']).ok).toBe(false)
    expect(fileShape(join(scratch, 'absent.json'), ['generatedAt']).ok).toBe(false)
  })

  it('file-shape: a header-only file and a stale file both fail', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'dsh-eval-shape2-'))
    const headerOnly = join(scratch, 'header-only.json')
    writeFileSync(headerOnly, JSON.stringify({ generatedAt: '2026-09-27T12:00:00+08:00' }))
    // Only the header ⇒ the panel renders every section empty: "nothing happened", the case this guards.
    const headerVerdict = fileShape(headerOnly, ['generatedAt'], { anyOf: ['counts', 'decisions', 'actions'] })
    expect(headerVerdict.ok).toBe(false)
    expect(headerVerdict.reason).toContain('renders as an empty desk')

    const withSection = join(scratch, 'with-section.json')
    writeFileSync(withSection, JSON.stringify({ generatedAt: '2026-09-27T12:00:00+08:00', counts: { memories: 1 } }))
    expect(fileShape(withSection, ['generatedAt'], { anyOf: ['counts', 'decisions'] }).ok).toBe(true)

    // A file last written before the run is a leftover, not a rewrite.
    expect(fileShape(withSection, [], { since: Date.now() + 60_000 }).ok).toBe(false)
    expect(fileShape(withSection, [], { since: Date.now() - 60_000 }).ok).toBe(true)
  })

  it('refuses to guess at an unknown check kind', () => {
    const verdict = evaluateTask({ checks: [{ kind: 'vibes-are-good' }] }, { toolCalls: [], answerText: '' })
    expect(verdict.passed).toBe(false)
    expect(verdict.reasons[0]).toContain('unknown check kind')
  })

  it('every task carries at least one positive check, so doing nothing cannot pass', () => {
    const negativesOnly = new Set(['no-write-tools', 'no-git-commit'])
    for (const task of TASKS) {
      expect(task.checks.some(check => !negativesOnly.has(check.kind))).toBe(true)
    }
  })
})

describe('argumentsText', () => {
  it('accepts both shapes seen in real logs (JSON string and parsed object)', () => {
    expect(argumentsText('{"command":"git commit"}')).toContain('git commit')
    expect(argumentsText({ command: 'git commit' })).toContain('git commit')
    expect(argumentsText(null)).toBe('')
  })
})
