/**
 * The self-queued turn slots (`src/host/self-turns.ts`) at their own seam: two config facts and
 * a real Cordis context, with a fake agent. No home directory is booted.
 *
 * Acceptance points:
 * - the maintenance turn queues on interval rounds only, and a re-queued round does not fire twice;
 * - a new goal starts its own round numbering, non-goal messages are ignored, and a zero interval
 *   disables the metronome;
 * - the queued turn carries the plugin source.
 */
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { installSelfTurnSlots } from '../../src/host/self-turns.ts'

interface Captured { text: string, source: unknown }

function boot(maintenanceEveryRounds: number): { ctx: Context, agent: Agent, calls: Captured[] } {
  const ctx = new Context()
  const calls: Captured[] = []
  const agent = {
    id: 'agent-1',
    followup: (message: { content: readonly { type: string, text?: string }[], source: unknown }): void => {
      calls.push({ text: message.content.map(block => block.text ?? '').join(''), source: message.source })
    },
  } as unknown as Agent
  installSelfTurnSlots({ maintenanceEveryRounds, goalProposalTurns: false }, ctx)
  return { ctx, agent, calls }
}

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

describe('installSelfTurnSlots', () => {
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

    emit(ctx, agent, goalRound(2, 'g-2'))
    expect(calls).toHaveLength(1)

    emit(ctx, agent, createUserMessage({
      content: [{ type: 'text', text: 'a user turn' }],
      source: { kind: 'user' },
    }))
    expect(calls).toHaveLength(1)

    const off = boot(0)
    emit(off.ctx, off.agent, goalRound(2, 'g-3'))
    expect(off.calls).toHaveLength(0)
  })
})
