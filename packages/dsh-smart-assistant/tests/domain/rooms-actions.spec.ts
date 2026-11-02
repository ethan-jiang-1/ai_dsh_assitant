/**
 * The controlled-write vocabulary (`src/domain/rooms/actions.ts`): the six verbs, per-action
 * required fields, and the wire-status classes. The host route and the client panel both read
 * this module; the fixtures pin the contract neither side may drift from.
 */
import { describe, expect, it } from 'vitest'
import { actionErrorStatus, parseRoomAction } from '../../src/domain/rooms/actions.ts'

describe('parseRoomAction', () => {
  it('accepts every controlled write verb with its required fields', () => {
    expect(parseRoomAction({ action: 'knowledge.approve', id: 'k-1', title: '页', sessionId: 's-1' })).toEqual({
      ok: true,
      request: { action: 'knowledge.approve', id: 'k-1', title: '页', sessionId: 's-1' },
    })
    expect(parseRoomAction({ action: 'knowledge.deprecate', id: 'k-1' })).toEqual({
      ok: true,
      request: { action: 'knowledge.deprecate', id: 'k-1' },
    })
    expect(parseRoomAction({ action: 'memory.correct', id: 'm-1', text: '改过的说法' })).toEqual({
      ok: true,
      request: { action: 'memory.correct', id: 'm-1', text: '改过的说法' },
    })
    expect(parseRoomAction({ action: 'memory.retire', id: 'm-1' })).toEqual({
      ok: true,
      request: { action: 'memory.retire', id: 'm-1' },
    })
    expect(parseRoomAction({ action: 'memory.remember', sessionId: 's-1', messageId: 'msg-1' })).toEqual({
      ok: true,
      request: { action: 'memory.remember', sessionId: 's-1', messageId: 'msg-1' },
    })
    expect(parseRoomAction({ action: 'skill.retire', name: 'my-skill', reason: '过期' })).toEqual({
      ok: true,
      request: { action: 'skill.retire', name: 'my-skill', reason: '过期' },
    })
  })

  it('rejects the wrong shape before any service is called', () => {
    expect(parseRoomAction(null)).toEqual({ ok: false, error: 'invalid-body' })
    expect(parseRoomAction({})).toEqual({ ok: false, error: 'missing-action' })
    expect(parseRoomAction({ action: 'knowledge.delete', id: 'k-1' })).toEqual({ ok: false, error: 'unknown-action' })
    expect(parseRoomAction({ action: 'knowledge.approve' })).toEqual({ ok: false, error: 'invalid-id' })
    expect(parseRoomAction({ action: 'knowledge.approve', id: '../escape' })).toEqual({ ok: false, error: 'invalid-id' })
    expect(parseRoomAction({ action: 'memory.correct', id: 'm-1', text: '   ' })).toEqual({ ok: false, error: 'missing-text' })
    expect(parseRoomAction({ action: 'memory.remember', sessionId: 's-1' })).toEqual({ ok: false, error: 'missing-message' })
    expect(parseRoomAction({ action: 'skill.retire', name: 'Not A Skill' })).toEqual({ ok: false, error: 'invalid-name' })
  })
})

describe('actionErrorStatus', () => {
  it('maps missing targets to 404 and state conflicts to 409', () => {
    expect(actionErrorStatus('knowledge page k-1 does not exist')).toBe(404)
    expect(actionErrorStatus('no learned skill named x')).toBe(404)
    expect(actionErrorStatus('only drafts may be approved')).toBe(409)
    expect(actionErrorStatus('already archived')).toBe(409)
    expect(actionErrorStatus('workspace write failed')).toBe(400)
  })
})
