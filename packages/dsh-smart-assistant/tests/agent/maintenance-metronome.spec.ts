/**
 * Layer: agent (agent-loop turn contract). Counting/dedup/reset state lives in the host
 * service (src/host/index.ts); service-plane contracts live in tests/host/.
 * The maintenance metronome (tri-line proposal 2026-09-24, slice 1e; I14): every N goal rounds a
 * maintenance turn takes the slot the round driver's yield barrier reserves. These tests pin the
 * interval predicate and the constructor's install of the slots; the listener behavior (counting,
 * dedup, per-goal reset, disabled) lives at the function seam in `self-turns.spec.ts`.
 */

import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'
import { dirPool } from '../support/host-harness.ts'
import { isMaintenanceRound, renderMaintenancePrompt } from '../../src/domain/home/metronome.ts'

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

  it('renders the instruction with the interval, the skill pointer, and the resume promise', () => {
    const text = renderMaintenancePrompt(5, 5)
    expect(text).toContain('every 5 rounds')
    // 2026-10-06 (SDLC audit follow-up): the maintenance slot names the home-curation skill so
    // auto-maintenance turns follow the taught finding-by-finding discipline instead of
    // improvising (the audit found the skill idle while metronome turns ran curate cold).
    expect(text).toContain('Load the `home-curation` skill')
    expect(text).toContain('assistant_memory action=curate')
    expect(text).toContain('resumes right')
  })
})

describe('maintenance metronome (service wiring)', () => {
  // The service is bound to the spec's own context (the fake agent rides it), so the pool
  // stops at the directory and boot stays local.
  const mkDir = dirPool('assistant-metronome-')

  interface Captured { text: string, source: unknown }

  function boot(maintenanceEveryRounds: number): { ctx: Context, agent: Agent, calls: Captured[] } {
    const dir = mkDir()
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

  it('the service constructor installs the maintenance slot', () => {
    const { ctx, agent, calls } = boot(2)
    emit(ctx, agent, goalRound(2))
    expect(calls).toHaveLength(1)
    expect(calls[0]?.text).toContain('[Maintenance slot]')
    expect(calls[0]?.source).toEqual({ kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' })
  })
})
