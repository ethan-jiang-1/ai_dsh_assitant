/**
 * C2 "记下来": one assistant-message action. The client sends only the durable ids; the host reads
 * the message text through `ctx.sessionQuery` and saves it verbatim with
 * `source: panel:message:<sessionId>/<messageId>`. One click is the confirmation; no prompt, no
 * model turn, no candidate state.
 *
 * @module dsh-smart-assistant/client/message-action
 */
import { postRoomsAction } from './room-data-io'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'

/** Props the assistant-actions slot passes (structural mirror; only these two matter). */
export interface RememberActionProps {
  readonly messageId?: string | undefined
  readonly sessionId?: string | undefined
}

/** Render the button; nothing is shown when the slot lacks a bound message/session. */
export function RememberAction(props: RememberActionProps): ReturnType<typeof createElement> | null {
  const { useState } = reactSurface()
  const [note, setNote] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const messageId = props.messageId
  const sessionId = props.sessionId
  if (messageId === undefined || sessionId === undefined) return null
  const click = (): void => {
    if (busy) return
    setBusy(true)
    void postRoomsAction('memory.remember', { sessionId, messageId }).then(result => {
      setBusy(false)
      setNote(result.ok ? '已记下来' : `没记下：${result.reason}`)
    })
  }
  return createElement('button', {
    onClick: click,
    title: '把这条消息逐字存进记忆（来源=消息 id）',
    style: {
      padding: '2px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '5px',
      border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
    },
  }, busy ? '记录中…' : note ?? '记下来')
}
