/**
 * The developer debug panel. It exists for us, not for the principal.
 *
 * Why (2026-10-23): the previous version mixed machine facts (projection, revisions, sessions,
 * tool calls) into the product surface because there was nowhere else to put them. This panel is a
 * separate conversation-view tab, registered only when the debug flag is on (`#debug=1` or the
 * `dsh-assistant-debug` localStorage key), titled「开发调试」and read-only. It shows what the
 * browser actually holds: the parsed projection, the lifecycle status, the selected matter, the
 * capture phase and the session the panel is bound to. It deliberately does not invent host facts
 * the client cannot see (ledger file path, tool-call timings); those stay in the session log.
 *
 * The flag is checked once at apply time: enabling it is a reload, which is fine for a dev tool.
 *
 * @module dsh-smart-assistant/client/debug/debug-panel
 */

import { createElement as ce } from '../chrome/runtime'
import type { ProjectionPanelProps } from '../projection/projection-panel'

const STYLES = [
  '.dsha-debug{display:flex;flex-direction:column;gap:12px;padding:20px 24px;height:100%;overflow-y:auto;box-sizing:border-box;background:var(--dsw-alias-bg-base);}',
  '.dsha-debug-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}',
  '.dsha-debug-title{margin:0;font-size:20px;font-weight:600;color:var(--dsha-warn);}',
  '.dsha-debug-badge{font-size:11px;color:var(--dsha-warn);border:1px solid var(--dsha-warn);border-radius:999px;padding:1px 8px;}',
  '.dsha-debug-note{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-debug-actions{display:flex;gap:8px;flex-wrap:wrap;}',
  '.dsha-debug-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;}',
  '.dsha-debug-fact{border:0.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);overflow-wrap:anywhere;}',
  '.dsha-debug-fact b{display:block;color:var(--dsw-alias-label-tertiary);font-weight:500;font-size:11px;margin-bottom:2px;}',
  '.dsha-debug-json{margin:0;border:0.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:10px 12px;font-size:11px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary);max-height:52vh;overflow-y:auto;}',
  '.dsha-debug-btn{border:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;}',
].join('')

/** The debug entry's icon: a small terminal/monitor glyph. */
export function DebugPanelIcon(): ReturnType<typeof ce> {
  return ce('svg', { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', style: { display: 'block' } },
    ce('rect', { x: 2, y: 4, width: 16, height: 12, rx: 2, stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }),
    ce('path', { d: 'M6 8l2 2-2 2M10 12h4', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }))
}

/**
 * The debug panel: parsed projection, lifecycle and the client's own state, read-only.
 * @param props - The same injected hook/surface contract the home receives, plus the session id.
 * @returns The debug surface.
 */
export function DebugPanel(props: ProjectionPanelProps & { sessionId?: string }): ReturnType<typeof ce> {
  const download = props.useProjection(value => value)
  const view = props.useStore(value => value)
  const statuses = props.useSessionStatus(value => value)
  const data = download.data
  const statusList = [...statuses.entries()].map(([id, status]) => `${id}:${status.running === true ? 'running' : 'idle'}`)
  const facts: { label: string, value: string }[] = [
    { label: 'projection.status', value: download.status },
    { label: 'projection.revision', value: data === undefined ? '—' : String(data.revision) },
    { label: 'ledgerId', value: data?.ledgerId ?? '—' },
    { label: 'stale', value: download.stale === true ? 'true' : 'false' },
    { label: 'error', value: download.error ?? '—' },
    { label: 'matters', value: data === undefined ? '—' : String(data.matters.length) },
    { label: 'unclaimed', value: data === undefined ? '—' : String(data.unclaimed.length) },
    { label: 'receipts', value: data === undefined ? '—' : String(data.receipts.length) },
    { label: 'selected', value: view.selected === null ? '—' : `${view.selected.kind}:${view.selected.id}` },
    { label: 'capture.receipt', value: view.captureReceipt === null ? '—' : `${view.captureReceipt.requestId} · ${view.captureReceipt.sessionId}` },
    { label: 'session', value: props.sessionId ?? '—' },
    { label: 'sessionStatuses', value: statusList.length === 0 ? '—' : statusList.join(' · ') },
    { label: 'debugFlag', value: 'on' },
  ]
  const diagnostics = JSON.stringify({
    projection: { status: download.status, revision: data?.revision, stale: download.stale, error: download.error },
    selected: view.selected,
    capture: view.captureReceipt,
    sessionId: props.sessionId,
  }, null, 2)
  return ce('main', { className: 'dsha-debug', 'data-assistant-debug-panel': true },
    ce('style', {}, STYLES),
    ce('header', { className: 'dsha-debug-head' },
      ce('h1', { className: 'dsha-debug-title' }, '开发调试'),
      ce('span', { className: 'dsha-debug-badge' }, '非产品面'),
      ce('span', { className: 'dsha-debug-note' }, '只读。开屏前加 #debug=1，或 localStorage 置 dsh-assistant-debug=1 后刷新。')),
    ce('div', { className: 'dsha-debug-actions' },
      props.onBackHome !== undefined
        ? ce('button', { className: 'dsha-debug-btn', type: 'button', onClick: () => { props.onBackHome?.() } }, '回到今天')
        : null,
      ce('button', { className: 'dsha-debug-btn', type: 'button', onClick: () => { props.surface.lanes.refreshProjection() } }, '重新读取'),
      ce('button', {
        className: 'dsha-debug-btn', type: 'button',
        onClick: () => { void navigator.clipboard?.writeText(diagnostics).catch(() => undefined) },
      }, '复制诊断')),
    ce('div', { className: 'dsha-debug-facts' },
      ...facts.map(fact => ce('div', { key: fact.label, className: 'dsha-debug-fact' },
        ce('b', {}, fact.label),
        fact.value))),
    ce('details', {},
      ce('summary', { className: 'dsha-debug-note' }, '投影 JSON（已解析，只读）'),
      ce('pre', { className: 'dsha-debug-json' }, data === undefined ? 'undefined' : JSON.stringify(data, null, 2))))
}
