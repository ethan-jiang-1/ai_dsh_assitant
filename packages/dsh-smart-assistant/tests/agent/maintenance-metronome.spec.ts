/**
 * Layer: agent (agent-loop turn contract). Counting/dedup/reset state lives in the host
 * service (src/index.ts); service-plane contracts live in tests/host/.
 * The maintenance metronome (tri-line proposal 2026-09-24, slice 1e; I14): every N goal rounds a
 * maintenance turn takes the slot the round driver's yield barrier reserves. These tests pin the
 * interval predicate and, with a fake agent, the counting, dedup, per-goal reset, and the
 * plugin-sourced followup message.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import { isMaintenanceRound, renderMaintenancePrompt } from '../../src/home/metronome.ts'

describe('isMaintenanceRound (pure)', () => {
  it('fires on the interval and nowhere else', () => {
    expect(isMaintenanceRound(5, 5)).toBe(true)
    expect(isMaintenanceRound(10, 5)).toBe(true)
    expect(isMaintenanceRound(4, 5)).toBe(false)
    expect(isMaintenanceRound(6, 5)).toBe(false)
    expect(isMaintenanceRound(0, 5)).toBe(false)
    expect(isMaintenanceRound(5, 0)).toBe(false)
    expect(isMaintenanceRound(5, 1)).toBe(true)
  })

  it('renders the instruction with the interval and the resume promise', () => {
    const text = renderMaintenancePrompt(5, 5)
    expect(text).toContain('every 5 rounds')
    expect(text).toContain('assistant_memory action=curate')
    expect(text).toContain('resumes right')
  })
})

describe('maintenance metronome (service wiring)', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  interface Captured { text: string, source: unknown }

  function boot(maintenanceEveryRounds: number): { ctx: Context, agent: Agent, calls: Captured[] } {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-metronome-'))
    dirs.push(dir)
    const ctx = new Context()
    const calls: Captured[] = []
    // A fake agent is enough: the metronome reads the inbox event and calls followup.
    const agent = {
      id: 'agent-1',
      followup: (message: { content: readonly { type: string, text?: string }[], source: unknown }): void => {
        calls.push({ text: message.content.map(block => block.text ?? '').join(''), source: message.source })
      },
    } as unknown as Agent
    new AssistantMemory(ctx, { dataDir: dir, maintenanceEveryRounds })
    return { ctx, agent, calls }
  }

  // The 'goal' source kind is declared by @deepseek-ai/dsh-goal, which this package does not
  // depend on; the metronome reads it through a widened view, so the test synthesizes the
  // payload through the same widening instead of importing the goal package.
  function goalRound(round: number, goalId = 'g-1'): Record<string, unknown> {
    return {
      ...createUserMessage({
        content: [{ type: 'text', text: `round ${round}` }],
        source: { kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' },
      }),
      source: { kind: 'goal', goalId, revision: 1, round },
    }
  }

  function emit(ctx: Context, agent: Agent, message: unknown): void {
    ;(ctx.emit as unknown as (event: string, payload: unknown) => void)
      .call(ctx, 'agent/inbox/inserted', { agent, message })
  }

  it('queues a plugin-sourced maintenance turn on interval rounds only', () => {
    const { ctx, agent, calls } = boot(2)

    emit(ctx, agent, goalRound(1))
    expect(calls).toHaveLength(0)

    emit(ctx, agent, goalRound(2))
    expect(calls).toHaveLength(1)
    expect(calls[0]?.text).toContain('[Maintenance slot]')
    expect(calls[0]?.text).toContain('every 2 rounds')
    expect(calls[0]?.source).toEqual({ kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' })

    // A re-queued round does not fire twice (dedup by goal id).
    emit(ctx, agent, goalRound(2))
    expect(calls).toHaveLength(1)

    // The next interval fires again.
    emit(ctx, agent, goalRound(4))
    expect(calls).toHaveLength(2)
  })

  it('resets per goal, ignores other message kinds, and can be disabled', () => {
    const { ctx, agent, calls } = boot(2)

    // A second goal starts its own round numbering.
    emit(ctx, agent, goalRound(2, 'g-2'))
    expect(calls).toHaveLength(1)

    // Non-goal messages never fire the metronome.
    emit(ctx, agent, createUserMessage({
      content: [{ type: 'text', text: 'a user turn' }],
      source: { kind: 'user' },
    }))
    expect(calls).toHaveLength(1)

    // A zero interval disables the metronome entirely.
    const off = boot(0)
    emit(off.ctx, off.agent, goalRound(2, 'g-3'))
    expect(off.calls).toHaveLength(0)
  })
})
