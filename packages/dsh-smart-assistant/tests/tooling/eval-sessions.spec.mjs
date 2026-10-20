/**
 * Fixtures for the eval-session criterion core (`dev/lib/eval-sessions.mjs`) — the judge that
 * keeps machine-driven eval one-shots out of the three home-reading reports. The criterion moved
 * out of desk-loop-report.mjs (audit 261020 #21: usage and observe read the same dev home but
 * never excluded eval traffic, while desk-loop had excluded 101 eval sessions) — these fixtures
 * pin the three conditions where they can now drift for three consumers at once: exact prompt
 * match, single message window, and non-panel source (the BUG-002 discriminator).
 */
import { describe, expect, it } from 'vitest'
import { isEvalOneShot, isEvalSessionLog, TASK_PROMPTS } from '../../../../dev/lib/eval-sessions.mjs'
import { TASKS } from '../../../../dev/eval/tasks.mjs'

const PROMPT = TASKS[0]?.prompt ?? 'eval task'

/** A user/message in the real log shape: `source` serialized, blocks as content. */
const message = (text, source = { kind: 'user' }, type = 'user/message') =>
  ({ type, time: 1, data: { content: [{ type: 'text', text }], source: JSON.stringify(source) } })

describe('isEvalOneShot (window core — desk-loop consumes this shape)', () => {
  it('flags a single non-panel window whose message matches a task prompt exactly', () => {
    expect(isEvalOneShot([{ panel: false, message: PROMPT }])).toBe(true)
  })

  it('keeps the BUG-002 discriminator: a panel-sourced prompt copy is NOT an eval run', () => {
    // A real hit (2026-10-01): a task prompt doubled as panel copy, and a human session with one
    // panel click was misread as an eval session. Headless evals cannot carry rpcId desk-….
    expect(isEvalOneShot([{ panel: true, message: PROMPT }])).toBe(false)
  })

  it('rejects multi-window sessions and non-prompt messages', () => {
    expect(isEvalOneShot([{ panel: false, message: PROMPT }, { panel: false, message: '再问一句' }])).toBe(false)
    expect(isEvalOneShot([{ panel: false, message: `${PROMPT} 吗` }])).toBe(false)
    expect(isEvalOneShot([])).toBe(false)
  })
})

describe('isEvalSessionLog (events adapter — usage and observe consume this shape)', () => {
  it('recognizes a real eval one-shot: bare source, single prompt, no rpcId', () => {
    expect(isEvalSessionLog([message(PROMPT)])).toBe(true)
    // TASK_PROMPTS stays the single derived list of the task set.
    expect(TASK_PROMPTS).toContain(PROMPT)
  })

  it('strips the collaboration-boundary preamble before matching (eval prompts arrive behind it)', () => {
    const preamble = '[Collaboration boundary] You may change the working tree, but you do not commit.\n\n'
    expect(isEvalSessionLog([message(preamble + PROMPT)])).toBe(true)
  })

  it('ignores injected preambles when counting windows — they neither count nor disqualify', () => {
    // A turn's runtime-context / skill-catalog injections arrive as user messages with non-user
    // kinds; the eval criterion must see the same window count desk-loop's reactionWindows does.
    expect(isEvalSessionLog([
      message(PROMPT),
      message('Current runtime context. This snapshot supersedes earlier ones.', { kind: 'runtime-context' }),
      message('<system-reminder>\nA skill is a reusable set…', { kind: 'skill-catalog' }),
    ])).toBe(true)
    // A preamble-only turn is no window at all (desk-loop semantics): the prompt behind it still counts as the only one.
    expect(isEvalSessionLog([
      message('[Collaboration boundary] You may change the working tree, but you do not commit.'),
      message(PROMPT),
    ])).toBe(true)
  })

  it('rejects panel-sourced prompt copies and multi-turn human sessions', () => {
    expect(isEvalSessionLog([message(PROMPT, { kind: 'user', rpcId: 'desk-1791110465472-t4qtjt' })])).toBe(false)
    expect(isEvalSessionLog([message(PROMPT), message('那第二个问题是？')])).toBe(false)
  })
})
