/**
 * Self-queued turns: the two constructor-installed listeners that put turns into an agent's
 * inbox with no user or model behind them — the maintenance metronome and the goal-completion
 * proposal slot. Both fire from goal-plane lifecycle events, both send through the
 * `assistant-plugin` message source, and both are propose-only: a person consumes the turn.
 * Moved here from the {@link AssistantMemory} constructor so the shell keeps only state
 * construction; the behavior and install order are unchanged.
 *
 * @module
 */
import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
// Type-only: the goal package declares the 'goal/changed' event and the 'goal' message source
// kind in the cordis Events / llm MessageSourceMap merges — the proposal slot listens to the
// event, so the augmentation must be in the program.
import type {} from '@deepseek-ai/dsh-goal'
import { isMaintenanceRound, renderMaintenancePrompt } from '../domain/home/metronome.ts'
import { renderProposalPrompt } from '../domain/skills/proposal.ts'

// 0.1.7: message sources became a merge-extensible map (`MessageSourceMap`); the generic
// `{ kind: 'plugin' }` shape was removed. DSH's own packages each declare their kinds, so this
// plugin declares the one kind it injects — a turn it queued on its own (maintenance metronome,
// proposal slot). Consumers switch on `kind` and fall through unknowns.
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /** A turn this plugin queued by itself, with no user or model behind it. */
    'assistant-plugin': { kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' }
  }
}

/**
 * The two resolved config facts the self-turn slots gate on. The service class satisfies this
 * structurally; a test can stand in the two fields without booting a home.
 */
export interface SelfTurnHost {
  readonly maintenanceEveryRounds: number
  readonly goalProposalTurns: boolean
}

/**
 * Install the metronome and proposal-slot listeners on the owning context, in the constructor's
 * original order (metronome first, proposal slot second).
 *
 * The maintenance metronome (I14, tri-line proposal slice 1e): every `maintenanceEveryRounds`
 * goal rounds, queue a maintenance turn ahead of the next round. The round driver's yield
 * barrier — a non-goal message in nextTurn defers the next round until it is consumed — is
 * what makes the slot safe (iteration-rhythm note: the native safe position). The round
 * number and goal id ride the goal-kind message source, so the metronome is stateless across
 * restarts and self-resets for a new goal; the fired-map only dedupes a re-queued round.
 * Non-goal sessions fall to the persona discipline instead (the note's layer (a)).
 *
 * The proposal slot (phase 3): a completed goal is a natural batch boundary, so it queues
 * one proposal turn — propose-only. The model proposes; a person approves by editing the
 * proposal file's status (the same review shape as knowledge drafts); nothing auto-lands.
 * @param host - The config facts the slots gate on; the service class is the production host.
 * @param ctx - The context whose agents receive the queued turns.
 */
export function installSelfTurnSlots(host: SelfTurnHost, ctx: Context): void {
  // The maintenance metronome (I14, tri-line proposal slice 1e): every `maintenanceEveryRounds`
  // goal rounds, queue a maintenance turn ahead of the next round.
  if (host.maintenanceEveryRounds >= 1) {
    const fired = new Map<string, number>()
    ctx.on('agent/inbox/inserted', ({ agent, message }): undefined => {
      // Widened on purpose: the 'goal' source kind is declared by @deepseek-ai/dsh-goal, which
      // this package does not depend on — the runtime check needs only the two fields.
      const source = message.source as { kind: string, goalId?: unknown, round?: number }
      if (source.kind !== 'goal' || source.round === undefined || source.goalId === undefined) {
        return undefined
      }
      const key = String(source.goalId)
      if (!isMaintenanceRound(source.round, host.maintenanceEveryRounds)) return undefined
      if ((fired.get(key) ?? 0) >= source.round) return undefined
      fired.set(key, source.round)
      const maintenance = createUserMessage({
        content: [{
          type: 'text',
          text: renderMaintenancePrompt(source.round, host.maintenanceEveryRounds),
        }],
        source: { kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' },
      })
      try {
        agent.followup(maintenance)
      } catch (error: unknown) {
        fired.delete(key)
        ctx.logger.warn(
          `maintenance metronome could not queue a slot for agent "${String(agent.id)}": ${String(error)}`,
        )
      }
      return undefined
    })
  }

  // The proposal slot (phase 3): a completed goal is a natural batch boundary, so it queues
  // one proposal turn — propose-only.
  if (host.goalProposalTurns) {
    ctx.on('goal/changed', ({ agent, change }): undefined => {
      if (change.operation !== 'complete') return undefined
      const proposal = createUserMessage({
        content: [{ type: 'text', text: renderProposalPrompt() }],
        source: { kind: 'assistant-plugin', plugin: 'dsh-smart-assistant' },
      })
      try {
        agent.followup(proposal)
      } catch (error: unknown) {
        ctx.logger.warn(
          `proposal slot could not queue for agent "${String(agent.id)}": ${String(error)}`,
        )
      }
      return undefined
    })
  }
}
