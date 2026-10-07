/**
 * Shared principal-facing building blocks: the row component every room reuses, clamping,
 * inline markdown, provenance formatting, and the panel chrome (headings, muted lines,
 * quick actions, refresh row, alert lines, jump cells).
 *
 * These are the pieces the three room panels (panels.ts) and the dashboard compose; the
 * actions they render all route through desk-io (sendPrompt / openBeside) and the store
 * (desk-core).
 *
 * @module dsh-smart-assistant/client/dom-utils
 */

import type { RoomKind } from './contracts'
import { patchDesk, pendingInFlight, shortTime, staleWarning, useDesk } from './desk-core'
import type { DeskStore } from './desk-core'
import { askRefresh, openBeside, sendPrompt } from './desk-io'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'

/**
 * Provenance shown to the principal speaks product language: repo-internal
 * seed paths are developer coordinates (the approval flow's source line is
 * the principal's surface — first-open UX card, 2026-10-01). Known internal
 * prefixes map to product words; every other source stays verbatim, because
 * workspace/external origins ARE the provenance the owner needs.
 */
export function friendlySource(source: string): string {
  return source.replace(/packages\/dsh-smart-assistant\/seeds\//g, '内置基座种子页/')
}

/**
 * Minimal inline markdown for principal-facing text: the live desk rendered `**已消解**` with the
 * asterisks visible (self-review R7, 2026-09-27). Only bold and inline code are recognised —
 * anything else stays verbatim, because guessing at the model's formatting is worse than showing it.
 * @param text - the raw string.
 * @returns the alternating text/element sequence React can render.
 */
export function inlineMarkdown(text: string): (string | ReturnType<typeof createElement>)[] {
  const parts: (string | ReturnType<typeof createElement>)[] = []
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(match[1] === undefined
      ? createElement('code', { key: `c${match.index}`, style: { fontSize: '11px' } }, match[2] ?? '')
      : createElement('strong', { key: `b${match.index}` }, match[1]))
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/**
 * Long free text clamps to a few lines with a one-click expander. Measured on the live desk: one
 * thread's `lean` rendered 345 px tall — 35% of the 530 px pane — and pushed the rest of the room
 * off-screen (self-review R7, 2026-09-27). Clamping, never deleting: every word stays one click away.
 * @param props - the text, the clamp height, and the style of the containing line.
 * @returns the clamped line with its expander when the text is long.
 */
export function ClampedText({ text, maxLines = 3, style }: {
  text: string
  maxLines?: number
  style?: Record<string, unknown>
}): ReturnType<typeof createElement> {
  const { useState } = reactSurface()
  const [open, setOpen] = useState(false)
  if (text.length <= 220) return createElement('div', { style }, ...inlineMarkdown(text))
  return createElement('div', { style },
    createElement('div', {
      style: {
        overflowWrap: 'anywhere',
        ...(open
          ? {}
          : { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
      },
    }, ...inlineMarkdown(text)),
    createElement('button', {
      onClick: () => { setOpen(!open) },
      style: {
        marginTop: '2px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
      },
    }, open ? '收起' : '展开全部'))
}

/**
 * One row the principal can correct in place: the content, a small action, and — once opened —
 * an input plus send. Inline on purpose: pointing at the wrong line and typing the fix is one
 * gesture, which is what "cultivating the assistant" actually costs.
 */
export function CorrectableRow(props: {
  primary: ReturnType<typeof createElement> | string
  meta?: string | undefined
  /** Content excerpt shown under the title — the approval card's answer to blind approval (CEO friction #2). */
  excerpt?: string | undefined
  actionLabel: string
  placeholder: string
  onSubmit: (text: string) => void
  actions?: { label: string, run: () => void, destructive?: boolean }[] | undefined
  source?: string | undefined
  /** Lead variant: the one item the desk points at first, rendered larger. */
  lead?: boolean
  /** This row's identity: the in-flight receipt and the settled receipt land on the row acted on. */
  rowId?: string | undefined
  /** Read-only: the row was acted on and its question is settled — no buttons, no input. */
  readOnly?: boolean
  /** The session this row's desk belongs to: the freeze, receipt and stall scoping (R11). */
  deskSession?: string | undefined
}): ReturnType<typeof createElement> {
  const { useState } = reactSurface()
  const store = useDesk(props.deskSession)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [armed, setArmed] = useState<string | undefined>(undefined)
  const [openSource, setOpenSource] = useState(false)
  // The DATA GATE: buttons freeze until the desk file is rewritten past the send — not until the
  // queue accepts it (acceptance is milliseconds; the work is tens of seconds. Real use queued a
  // decision three times and left an action with seven contradictory orders).
  const frozen = pendingInFlight(store)
  const inflight = store.pending?.rowId === props.rowId && store.pending !== undefined && frozen
  const receipt = store.lastReceipt?.rowId === props.rowId ? store.lastReceipt : undefined
  const stalled = store.stalled?.rowId === props.rowId ? store.stalled : undefined
  const submit = (): void => {
    const value = text.trim()
    if (value === '') return
    props.onSubmit(value)
    setText('')
    setOpen(false)
  }
  // Provenance is the trust line: where a claim came from is what lets the principal judge it —
  // and for a record they corrected, the source is the cultivation trace itself.
  const source = props.source === undefined || props.source.trim() === '' ? undefined : props.source.trim()
  // Hierarchy (P2, 2026-09-26): the actions ride the row's first line, right-aligned, with the
  // detail lines flowing underneath them. The narrow-pane measurement showed 6–9 lines per row
  // and the buttons at the very bottom, so acting meant reading the audit trail first. One
  // change here covers every row type that shares this component.
  const controls = createElement('div', {
    style: {
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
      flexWrap: 'wrap', justifyContent: 'flex-end',
    },
  },
  props.meta === undefined || props.meta === '' ? null : createElement('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, props.meta),
  ...(props.actions ?? []).map(action => {
        // A destructive move asks twice: one click arms it for three seconds ("确认…？"), the
        // second click sends. The record itself is recoverable (history/archives), and the
        // confirm label says so — reversibility the principal can see.
        const fire = (): void => {
          if (action.destructive === true && armed !== action.label) {
            setArmed(action.label)
            // Five seconds, not three: these are 18px buttons and a Chinese principal may be
            // mid-IME when the confirm appears (R3, self-review 2026-09-27).
            setTimeout(() => { setArmed(current => current === action.label ? undefined : current) }, 5000)
            return
          }
          action.run()
        }
        const label = armed === action.label ? `确认${action.label}？（可恢复）` : action.label
        return createElement('button', {
          key: action.label,
          onClick: fire,
          disabled: frozen,
          style: {
            padding: '4px 8px', fontSize: '12px',
            cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
            border: `1px solid ${armed === action.label ? 'var(--dsha-warn)' : MARK_TEAL}`,
            borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: armed === action.label ? 'var(--dsha-warn)' : MARK_TEAL,
          },
        }, label)
      }),
      createElement('button', {
        onClick: () => { setOpen(!open) },
        disabled: frozen,
        style: {
          padding: '4px 8px', fontSize: '12px',
          cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
          border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
        },
      }, open ? '取消' : props.actionLabel))

  return createElement('li', { style: { marginBottom: '10px', listStyle: 'none' } },
    createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '8px' } },
      createElement('div', { style: { flex: '1', minWidth: 0 } },
        createElement('div', { style: { fontSize: props.lead === true ? '16px' : '13px', lineHeight: 1.6, color: props.lead === true ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)' } }, props.primary),
        // The excerpt is what makes an approval informed: title + provenance alone had the
        // principal approving blind (CEO friction #2 — 「盲批全靠信任」).
        props.excerpt === undefined || props.excerpt.trim() === '' ? null : createElement('div', {
          style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)', marginTop: '4px' },
        }, props.excerpt),
        source === undefined
          ? null
          // R7 (self-review, 2026-09-27): the live page carried 11 sources / 945 characters and this
          // line showed ~12% of them, the rest reachable only by hovering a clipped element.
          // Provenance is the trust line — it gets a real expander.
          : createElement('div', {
              style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' },
            },
            openSource || source.length <= 110 ? `来源：${friendlySource(source)}` : `来源：${friendlySource(source).slice(0, 110)}…`,
            source.length <= 110
              ? null
              : createElement('button', {
                  onClick: () => { setOpenSource(!openSource) },
                  style: {
                    marginLeft: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
                  },
                }, openSource ? '收起来源' : `来源全文（${source.length} 字）`))),
      props.readOnly === true ? null : controls),
    // R11 (narrow review, 2026-09-27): this used to co-render with the in-flight line below, so a
    // just-answered row said "已回答" and "正在处理" at once. While the answer is in flight the row
    // says one thing; the settled line is what replaces it.
    props.readOnly === true && inflight === false
      ? createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px' } },
          '已回答——改主意？在对话里说一声，它会改回来')
      : null,
    inflight === false ? null : createElement('div', {
      style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', marginTop: '4px' },
    }, `已交给助手 · ${shortTime(new Date(store.pending?.at ?? Date.now()).toISOString())} · ${String(store.pending?.action ?? '')}——正在处理，回复出现在对话里`),
    // The poller gave up: the action left, the desk did not catch up. Durable on the row on
    // purpose — a row that looks untouched reads as "nothing happened" (R1).
    stalled === undefined ? null : createElement('div', {
      style: { fontSize: '12px', color: 'var(--dsha-warn)', marginTop: '4px' },
    }, `已发出 · ${shortTime(new Date(stalled.at).toISOString())} · ${stalled.action}——桌面还没跟上，点「刷新桌面」再试（动作不会被撤销）`),
    receipt === undefined ? null : createElement('div', {
      style: { fontSize: '12px', color: MARK_TEAL, marginTop: '4px' },
    }, `✓ 已更新 · ${shortTime(new Date(receipt.at).toISOString())}`),
    open && props.readOnly !== true
      ? createElement('div', { style: { marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start' } },
          // A textarea, not an input: corrections run one to three sentences. Enter still sends,
          // but guarded against IME composition — without the guard, a Chinese principal's
          // Enter-to-pick-a-candidate fires half a sentence (runtime-proven class, 2026-09-26).
          createElement('textarea', {
            value: text,
            rows: 2,
            onChange: (event: { target: { value: string } }) => { setText(event.target.value) },
            onKeyDown: (event: { key: string, shiftKey?: boolean, keyCode?: number, nativeEvent?: { isComposing?: boolean } }) => {
              if (event.nativeEvent?.isComposing === true || event.keyCode === 229) return
              if (event.key === 'Enter' && event.shiftKey !== true) submit()
            },
            placeholder: props.placeholder,
            style: {
              flex: '1', padding: '5px 8px', fontSize: '12px', border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '4px',
              resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
            },
          }),
          createElement('button', {
            onClick: submit,
            disabled: frozen,
            style: {
              padding: '5px 12px', fontSize: '12px',
              cursor: frozen ? 'default' : 'pointer', opacity: frozen ? 0.5 : 1,
              borderRadius: '4px', border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
            },
          }, '发送'))
      : null)
}

/** Muted one-liner. */
export function muted(text: string): ReturnType<typeof createElement> {
  return createElement('p', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', margin: 0 } }, text)
}

/** A section heading. */
export function sectionTitle(text: string): ReturnType<typeof createElement> {
  return createElement('h3', { style: { margin: '20px 0 8px', fontSize: '13px', color: 'var(--dsw-alias-label-secondary)', fontWeight: 600 } }, text)
}

/** One quick-action button in the shared row. */
export function quickButton(label: string, hint: string, run: () => void): ReturnType<typeof createElement> {
  return createElement('button', {
    onClick: run,
    title: hint,
    style: {
      marginRight: '8px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
      border: '1px solid var(--dsw-alias-border-l3)', borderRadius: '6px', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
    },
  }, label)
}

/** The quick actions every panel carries: the whole-point-of-a-desk prompts, one click each. */
export function quickActions(session?: string): ReturnType<typeof createElement> {
  return createElement('div', { style: { marginTop: '8px' } },
    quickButton('回顾一下', '让助手回顾最近的决定、在跟的事与它新学到的东西',
      () => { sendPrompt('回顾一下：我们最近决定了什么、还有什么在跟、你新学到了什么？', '回顾', 'desk', session) }),
    quickButton('体检', '让助手跑一次 curate，报告家的现状与需要你处理的事',
      () => { sendPrompt('跑一次 curate，报告家的现状与需要我处理的事。', '体检', 'desk', session) }))
}

/** The refresh button plus its status line, and — where the room can — the jump to the beside-conversation tab. */
export function refreshRow(store: DeskStore, session?: string): ReturnType<typeof createElement> {
  // Used for the status line only. The button itself is deliberately NOT disabled while an action
  // is in flight: it is the escape hatch when the assistant does not rewrite the desk file
  // (self-review R1, 2026-09-27). It re-reads the file; reading is always safe, and a frozen
  // surface with a dead escape hatch is not.
  // (2026-09-28) The "在对话旁打开" button is gone with the left main panels: rooms render only
  // inside right-sidebar tabs now, so that opener opened the very tab it sat in — a no-op the
  // principal rightly read as broken (real use, same day as the move). The openers that remain
  // are the "+" guide, the Session-header chip, and the first-mile dock.
  const inFlight = pendingInFlight(store)
  return createElement('div', { style: { margin: '8px 0 0' } },
    createElement('button', {
      onClick: () => { askRefresh(session) },
      style: {
        padding: '6px 14px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px',
        border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)',
        color: MARK_TEAL,
      },
    }, '刷新桌面'),
    inFlight === false
      ? null
      : createElement('span', { style: { marginLeft: '10px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
          `已交给助手 · ${shortTime(new Date(store.pending?.at ?? Date.now()).toISOString())} · ${String(store.pending?.action ?? '')}——回复出现在对话里，桌面更新后自动跟上`),
    // A7: freshness belongs to every room, not only the desk — the room the principal is
    // reading in is exactly where "this snapshot is stale" must be said out loud.
    staleWarning(store) === undefined
      ? null
      : createElement('div', { style: { fontSize: '12px', color: 'var(--dsha-warn)', marginTop: '4px' } },
          `⚠ ${String(staleWarning(store))}`))
}

/**
 * A stat cell; with a room kind it becomes the way to the room tab that explains the number.
 * The rooms live as right-sidebar tabs (user steer, 2026-09-28), so the jump opens the tab
 * beside the conversation instead of navigating the retired left main panels.
 */
export function cell(label: string, value: string, target?: RoomKind): ReturnType<typeof createElement> {
  const jump = (): void => {
    if (target === undefined) return
    patchDesk({ jumpError: undefined })
    try {
      openBeside(target)
    } catch {
      // R9 (self-review, 2026-09-27): swallowing this left an underlined, pointer-cursor number that
      // did nothing at all. The stale target still must not break the panel — but the failure is
      // now visible where the click happened.
      patchDesk({ jumpError: `「${label}」这次没能打开——刷新页面通常能恢复` })
    }
  }
  const inner = [
    createElement('div', { key: 'v', style: { fontSize: '26px', fontWeight: 700, color: MARK_TEAL } }, value),
    createElement('div', {
      key: 'l',
      style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', textDecoration: target === undefined ? 'none' : 'underline' },
    }, label),
  ]
  const style: Record<string, unknown> = {
    display: 'inline-block', margin: '8px 16px', textAlign: 'center' as const,
  }
  if (target === undefined) return createElement('div', { style }, ...inner)
  // A real button when it acts: the count used to be an onClick div with no role and no tab stop,
  // i.e. mouse-only (R9).
  return createElement('button', {
    type: 'button',
    onClick: jump,
    title: '打开这个面板',
    style: { ...style, border: 'none', background: 'transparent', font: 'inherit', padding: 0, cursor: 'pointer' },
  }, ...inner)
}

/**
 * The lines every panel shows at its foot: a failed read or a file that is not a desk at all, then
 * the loader's own note. `readError` used to render only in the right-pane tab, so a main-area panel
 * showed an empty-looking desk with no explanation (2026-09-27).
 * @param store - the shared desk store.
 * @returns the alert elements, in severity order.
 */
export function panelAlerts(store: DeskStore): ReturnType<typeof createElement>[] {
  const alerts: ReturnType<typeof createElement>[] = []
  if (store.readError !== undefined) {
    alerts.push(createElement('div', { key: 'read-error', style: { fontSize: '12px', color: 'var(--dsha-warn)', margin: '6px 0 0' } },
      store.readError))
  }
  if (store.note !== undefined) alerts.push(createElement('div', { key: 'note' }, muted(store.note)))
  return alerts
}
