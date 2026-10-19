/**
 * Shared read-only content drawer: the full body of one room entry, opened from a row.
 *
 * One component for knowledge, learned skills and Viki entries (A1a skeleton; C1/B reuse it)
 * so the three faces do not grow three different reading surfaces. It is presentation only:
 * the caller fetches the body and owns the open/close state.
 *
 * @module dsh-smart-assistant/client/content-drawer
 */
import { createElement, reactSurface } from './runtime'

/** Props one drawer instance receives. */
export interface ContentDrawerProps {
  /** Human title shown at the top; the page id when the page has no title. */
  readonly title: string
  /** Full prose body, rendered verbatim. */
  readonly body: string
  /** Close the drawer (backdrop click, Escape, or the button). */
  readonly onClose: () => void
}

/**
 * Render the drawer over the panel. No DOM access at module scope: the key listener is installed
 * only while mounted, so the classic-script test harness (no document) can render it.
 * @param props - title, body and close callback.
 * @returns The overlay element.
 */
export function ContentDrawer(props: ContentDrawerProps): ReturnType<typeof createElement> {
  const { useEffect } = reactSurface()
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onKey = (event: { key?: string }): void => { if (event.key === 'Escape') props.onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [props.onClose])
  return createElement('div', {
    role: 'dialog',
    'aria-modal': true,
    'aria-label': props.title,
    onClick: (event: { target?: unknown, currentTarget?: unknown }) => {
      if (event.target === event.currentTarget) props.onClose()
    },
    style: {
      position: 'fixed', inset: '0', zIndex: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px', background: 'rgba(0, 0, 0, 0.35)',
    },
  },
  createElement('div', {
    style: {
      width: 'min(760px, 100%)', maxHeight: '80vh', overflowY: 'auto', borderRadius: '10px',
      background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l3)',
      padding: '20px 22px', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
    },
  },
  createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' } },
    createElement('div', { style: { flex: '1', fontSize: '16px', fontWeight: 600, lineHeight: 1.4, color: 'var(--dsw-alias-label-primary)' } }, props.title),
    createElement('button', {
      onClick: () => { props.onClose() },
      'aria-label': '关闭',
      style: {
        flex: '0 0 auto', padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
        borderRadius: '6px', border: '1px solid var(--dsw-alias-border-l3)',
        background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-secondary)',
      },
    }, '关闭')),
  createElement('div', {
    style: {
      fontSize: '13px', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      color: 'var(--dsw-alias-label-primary)',
    },
  }, props.body)))
}
