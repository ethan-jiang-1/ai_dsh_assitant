/**
 * The controlled-write vocabulary of the maintenance panel.
 *
 * The host route and the client panel used to carry the six verb strings and their field
 * validation as two private copies (plus a regex-on-message status map in the route). This
 * module is the one owner of the verbs, the request shape, and the error-status classes; the
 * host still owns the state transitions and the client still owns the optimistic row patch.
 *
 * @module dsh-smart-assistant/domain/rooms/actions
 */
import { isEntryId } from '../home/room.ts'
import { isSkillName } from '../skills/skill-file.ts'

/** Every action the panel may send to `POST /api/assistant/rooms`. */
export const ROOM_ACTIONS = [
  'knowledge.approve',
  'knowledge.deprecate',
  'memory.correct',
  'memory.retire',
  'memory.remember',
  'skill.retire',
] as const

/** One controlled write verb. */
export type RoomAction = (typeof ROOM_ACTIONS)[number]

/** Fields the route accepts alongside `action`; per-action requiredness is enforced below. */
export interface RoomActionFields {
  readonly id?: string
  readonly name?: string
  readonly text?: string
  readonly title?: string
  readonly reason?: string
  readonly sessionId?: string
  readonly messageId?: string
}

/** A validated action request. */
export interface RoomActionRequest extends RoomActionFields {
  readonly action: RoomAction
}

/** Parse result: a validated request or a stable client-facing error code. */
export type RoomActionParse =
  | { readonly ok: true, readonly request: RoomActionRequest }
  | { readonly ok: false, readonly error: string }

/** @param value - unknown wire value. @returns whether it is one of the six verbs. */
export function isRoomAction(value: unknown): value is RoomAction {
  return typeof value === 'string' && (ROOM_ACTIONS as readonly string[]).includes(value)
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/**
 * Validate one POST body into a typed request. The per-action required fields live here so the
 * host and the client cannot drift on what "a correct request" means.
 * @param body - Parsed JSON body (untrusted).
 * @returns the typed request, or a stable error code.
 */
export function parseRoomAction(body: unknown): RoomActionParse {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'invalid-body' }
  const input = body as Record<string, unknown>
  if (!isRoomAction(input['action'])) {
    return { ok: false, error: input['action'] === undefined ? 'missing-action' : 'unknown-action' }
  }
  const action = input['action']
  const title = nonEmpty(input['title'])
  const sessionId = nonEmpty(input['sessionId'])
  const reason = nonEmpty(input['reason'])
  const base: RoomActionFields = {
    ...(title === undefined ? {} : { title }),
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(reason === undefined ? {} : { reason }),
  }

  if (action === 'knowledge.approve' || action === 'knowledge.deprecate' || action === 'memory.retire') {
    const id = nonEmpty(input['id'])
    if (id === undefined || !isEntryId(id)) return { ok: false, error: 'invalid-id' }
    return { ok: true, request: { ...base, action, id } }
  }
  if (action === 'memory.correct') {
    const id = nonEmpty(input['id'])
    if (id === undefined || !isEntryId(id)) return { ok: false, error: 'invalid-id' }
    const text = nonEmpty(input['text'])
    if (text === undefined) return { ok: false, error: 'missing-text' }
    return { ok: true, request: { ...base, action, id, text } }
  }
  if (action === 'memory.remember') {
    const messageId = nonEmpty(input['messageId'])
    if (sessionId === undefined || messageId === undefined) return { ok: false, error: 'missing-message' }
    return { ok: true, request: { ...base, action, sessionId, messageId } }
  }
  const name = nonEmpty(input['name'])
  if (name === undefined || !isSkillName(name)) return { ok: false, error: 'invalid-name' }
  return { ok: true, request: { ...base, action, name } }
}

/**
 * Map an action failure message to the HTTP status class the panel reads. The messages come
 * from the domain services; this is the one place that translates them to wire semantics.
 * @param message - error message from the service.
 * @returns 404 for missing targets, 409 for state conflicts, 400 otherwise.
 */
export function actionErrorStatus(message: string): 400 | 404 | 409 {
  if (/does not exist|not found|no learned skill|no knowledge page/.test(message)) return 404
  if (/only drafts|not a draft|already archived|is not active|supersedes names|is approved and waiting/.test(message)) return 409
  return 400
}
