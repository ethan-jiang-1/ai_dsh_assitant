/**
 * The desk capture-row view (`src/domain/desk/desk-capture-view.ts`): phase, pending, ownership,
 * and the other sessions waiting on the principal.
 *
 * Acceptance points:
 * - no receipt: the view has no phase and counts every pending interaction as a question;
 * - a running receipt owns its session and keeps the desk input shut;
 * - a settled receipt stops owning the row's status; another session's question still counts;
 * - a revision move resolves the row and releases its session's question back to the desk;
 * - the action lane is marked from the receipt, not inferred from the phase.
 */
import { describe, expect, it } from 'vitest'
import { deriveCaptureView } from '../../src/domain/desk/desk-capture-view.ts'

const statuses = (entries: [string, { pendingInteraction?: { kind?: string }, running?: boolean, completionUnread?: boolean, seenRunning?: boolean }][]) =>
  new Map(entries)

describe('deriveCaptureView', () => {
  it('counts every pending interaction when there is no receipt', () => {
    const view = deriveCaptureView({
      receipt: null,
      revision: 3,
      statuses: statuses([['s1', { pendingInteraction: { kind: 'approval' } }], ['s2', { pendingInteraction: {} }]]),
    })
    expect(view.phase).toBeUndefined()
    expect(view.pending).toBe(false)
    expect(view.ownsSession).toBeUndefined()
    expect(view.questionSessions).toEqual(['s1', 's2'])
    expect(view.openQuestions).toBe(2)
  })

  it('keeps the desk input shut while the receipt session is running and owns its question', () => {
    const view = deriveCaptureView({
      receipt: { sessionId: 's1', observedRevision: 2 },
      revision: 2,
      statuses: statuses([['s1', { running: true }], ['s2', { pendingInteraction: {} }]]),
    })
    expect(view.phase).toBe('running')
    expect(view.pending).toBe(true)
    expect(view.ownsSession).toBe('s1')
    expect(view.questionSessions).toEqual(['s2'])
  })

  it('marks a pending interaction on the receipt session as suspended, never as a second question', () => {
    const view = deriveCaptureView({
      receipt: { sessionId: 's1', observedRevision: 2 },
      revision: 2,
      statuses: statuses([['s1', { running: true, pendingInteraction: { kind: 'approval' } }]]),
    })
    expect(view.phase).toBe('suspended')
    expect(view.pending).toBe(false)
    expect(view.ownsSession).toBe('s1')
    expect(view.questionSessions).toEqual([])
  })

  it('stops owning the row when the turn has settled and keeps counting other sessions', () => {
    const view = deriveCaptureView({
      receipt: { sessionId: 's1', observedRevision: 2 },
      revision: 2,
      statuses: statuses([['s1', { completionUnread: true }], ['s2', { pendingInteraction: { kind: 'approval' } }]]),
    })
    expect(view.phase).toBe('settled')
    expect(view.pending).toBe(false)
    expect(view.ownsSession).toBe('s1')
    expect(view.questionSessions).toEqual(['s2'])
  })

  it('releases the receipt session question once a revision move resolves the row', () => {
    const view = deriveCaptureView({
      receipt: { sessionId: 's1', observedRevision: 2 },
      revision: 3,
      statuses: statuses([['s1', { pendingInteraction: { kind: 'approval' } }]]),
    })
    expect(view.phase).toBe('resolved')
    expect(view.pending).toBe(false)
    expect(view.ownsSession).toBeUndefined()
    expect(view.questionSessions).toEqual(['s1'])
  })

  it('marks the action lane from the receipt', () => {
    const view = deriveCaptureView({
      receipt: { sessionId: 's1', observedRevision: 2, lane: 'action' },
      revision: 2,
      statuses: statuses([['s1', { completionUnread: true }]]),
    })
    expect(view.isActionLane).toBe(true)
    expect(view.phase).toBe('settled')
  })
})
