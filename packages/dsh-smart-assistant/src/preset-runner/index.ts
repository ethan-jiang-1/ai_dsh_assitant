/**
 * `assistant-preset-runner`: a one-shot task driver whose Agent joins a preset composition —
 * the scripted-verification counterpart of the shipped headless runner.
 *
 * The shipped one-shot runner creates a bare agent on purpose ("a deployment that DOES
 * configure a roster has to join it here first"); this runner joins the configured preset
 * through the roster service exactly the way the web session controller composes sessions
 * (`agentPresets.resolve` → `mount` inside the agent setup), so a scripted task runs with
 * the full preset surface — tools, digest, persona — and the session log records the
 * `agentPreset` header like a browser session does. It exists so live verification can
 * drive real preset conversations without a human at the browser.
 *
 * Mount it by replacing the `headless-runner` row (dev/preset-runner.patch.yml):
 *   pnpm dsh --profile dev-task --patch dev/preset-runner.patch.yml "<task>"
 *
 * @module dsh-smart-assistant/preset-runner
 */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { brandString } from '@deepseek-ai/dsh-brand'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import type { Agent, ModelSelectionRef } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-agent-presets'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionSeq } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent, SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'

/** Stable Cordis plugin name. */
export const name = 'assistant-preset-runner'

/** Core services required before the one-shot turn can start. */
export const inject = ['agentDefaultModel', 'agents', 'sessions', 'agentPresets']

/** Plugin config: the task text (the row patch interpolates it from headlessStartup). */
export interface Config {
  /** The prompt text for the single run. */
  task: string
  /** Preset to compose; omitted uses the roster's configured default. */
  preset?: string
}

export const Config: Schema<Config> = z.object({
  task: z.string().required(),
  preset: z.string(),
})

/** Outcome of the run, read back from the durable log. */
interface RunOutcome {
  text: string
  reason: SessionEvent<'turn/end'>['data']['reason'] | undefined
}

/** Bounded process-exit request the launcher provides (the cmdline `AppExit` contract). */
type AppExit = (code: number) => void

/** Poll quiet while waiting for driver-queued turns; small enough to feel instant. */
const DRIVE_POLL_MS = 250

/** No session-log movement for this long means nothing is driving the session anymore. */
const STALL_MS = 30_000

/** After the goal settles, wait this long for quiet before exiting — turns queued around the
 * completion boundary (the skill-proposal slot) get their turn inside this window. */
const QUIET_MS = 5_000

/** Upper bound on the post-settlement grace window. */
const GRACE_MS = 20_000

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * A goal extends a one-shot run: the round driver queues each next round only after the previous
 * turn settles (a durability checkpoint sits between), so agent quiescence is not the end of a
 * goal-driven session. Wait until the goal leaves the active phase, or until the session log
 * stops moving — a stall means nothing is driving the session and the run is over either way.
 * After settlement, a quiet window lets boundary turns (a completed goal queues the proposal
 * slot) run to completion before the process exits.
 * @param ctx - Plugin context, for the optional goal service.
 * @param agent - The run's agent.
 */
async function awaitGoalSettlement(ctx: Context, agent: Agent): Promise<void> {
  const goals = ctx.get('goals')
  if (goals === undefined) return
  let lastSeq = agent.session.seq
  let lastMove = Date.now()
  while (true) {
    let active = false
    try {
      const goal = goals.get(agent)
      active = goal !== undefined && goal.phase === 'active'
    } catch {
      return // the agent is no longer the registry's live instance — nothing to wait for
    }
    if (!active) break
    await agent.whenIdle()
    await delay(DRIVE_POLL_MS)
    const seq = agent.session.seq
    if (seq !== lastSeq) {
      lastSeq = seq
      lastMove = Date.now()
    } else if (Date.now() - lastMove > STALL_MS) {
      return
    }
  }
  // Grace: turns queued around the completion boundary still deserve their run.
  const deadline = Date.now() + GRACE_MS
  let quiet = Date.now()
  while (Date.now() < deadline) {
    await agent.whenIdle()
    await delay(DRIVE_POLL_MS)
    const seq = agent.session.seq
    if (seq !== lastSeq) {
      lastSeq = seq
      quiet = Date.now()
    } else if (Date.now() - quiet > QUIET_MS) {
      return
    }
  }
}

/** Aggregate the last assistant text and turn outcome from the durable log. */
function summarize(session: Session, firstSeq: SessionLogOffset): RunOutcome {
  let started = false
  let text = ''
  let reason: SessionEvent<'turn/end'>['data']['reason'] | undefined
  const length = session.seq
  for (let seq = firstSeq; seq < length; seq++) {
    const event = session.eventAt(SessionSeq(seq))
    if (event === undefined) {
      throw new Error(`preset-runner summary cannot read seq ${String(seq)} below captured length ${String(length)}`)
    }
    if (event.type === 'turn/start') {
      started = true
      continue
    }
    if (!started) continue
    if (event.type === 'assistant/message') {
      const joined = event.data.message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
      if (joined !== '') text = joined
    }
    if (event.type === 'turn/end') reason = event.data.reason
  }
  return { text, reason }
}

/**
 * Run one task through a preset-joined Agent and request process exit.
 * @param ctx - Plugin context carrying the core registries and the roster.
 * @param config - Validated task config.
 */
async function run(ctx: Context, config: Config): Promise<void> {
  // Loader siblings mount concurrently. Await the complete application before creating an
  // Agent so its scoped tools and adapters are not half-composed.
  await ctx.get('loader')?.await()
  const agents = ctx.get('agents')
  const defaultModel = ctx.get('agentDefaultModel')
  const sessions = ctx.get('sessions')
  const presets = ctx.get('agentPresets')
  if (agents === undefined || defaultModel === undefined || sessions === undefined
    || presets === undefined) return
  const selection = defaultModel.currentSelection()
  const preset = await presets.resolve(config.preset)
  const { agent } = await agents.create({
    sessionId: brandString<SessionId>(`session-${randomUUID()}`),
    // The header mirrors a browser session's: the preset this agent runs.
    meta: { cwd: process.cwd(), agentPreset: preset.id },
    agentOptions: { provider: selection.provider, model: selection.model },
    setup: async (agentCtx: Context) => {
      const selected: ModelSelectionRef = { current: selection, assembled: undefined }
      installModelSelection(agentCtx, selected)
      // Join this agent's scope to the preset's standing mount — the same composition the
      // web session controller installs for a browser conversation.
      await presets.mount(agentCtx, preset.id)
    },
  })
  const firstSeq = agent.session.seq
  const task = createUserMessage({
    content: [{ type: 'text', text: config.task }],
    source: { kind: 'user' },
  })
  agent.followup(task)
  await agent.whenIdle()
  // A goal created by the task keeps driving turns after quiescence; wait for it to settle.
  await awaitGoalSettlement(ctx, agent)
  await sessions.flush(agent.session)
  const outcome = summarize(agent.session, firstSeq)
  process.stdout.write(outcome.text + '\n')
  if (outcome.reason?.kind === 'error') {
    process.stderr.write(`dsh: ${outcome.reason.error.code}: ${outcome.reason.error.message}\n`)
  }
  const exit = ctx.get('appExit') as AppExit | undefined
  if (exit === undefined) {
    throw new Error('assistant-preset-runner: the launcher must provide ctx.appExit before the tree mounts')
  }
  exit(outcome.reason?.kind === 'completed' ? 0 : 1)
}

/**
 * Mount the one-shot preset driver.
 * @param ctx - Plugin context carrying core services and the launcher-provided exit request.
 * @param config - Validated task config.
 */
export function apply(ctx: Context, config: Config): void {
  void run(ctx, config).catch((error: unknown) => {
    process.stderr.write(`dsh: ${error instanceof Error ? error.message : String(error)}\n`)
    const exit = ctx.get('appExit') as AppExit | undefined
    if (exit !== undefined) exit(1)
  })
}
