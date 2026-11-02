/**
 * The product gate's conversation strip: one row above the composer that says why the input is
 * inert and carries the only action that clears it (pick a project directory).
 *
 * The gate's enforcement lives in `product-face.ts` (the composer block). This component is the
 * affordance that explains it — the platform's own no-workspace state teaches the same shape
 * (disabled composer + one picker), and the product adds only the project picker that validates
 * and persists the binding.
 *
 * @module dsh-smart-assistant/client/product/product-dock
 */

import { createElement as ce } from '../chrome/runtime'
import { productGateReason, productGateView } from './product-binding'
import { chooseProductWorkspace, startSessionInBinding, useProductFace, type ProductFace } from './product-face'

const DOCK_STYLES = [
  '.dsha-gate-dock{display:flex;flex-direction:column;gap:6px;width:min(var(--dsh-composer-card-max-width, 952px), 100%);margin:0 auto 8px;padding:10px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);}',
  '.dsha-gate-dock-row{display:flex;align-items:center;gap:12px;}',
  '.dsha-gate-dock-label{flex:1;min-width:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-gate-dock-cta{flex:none;border:0;border-radius:8px;padding:7px 16px;background:var(--dsha-accent);color:var(--dsha-on-accent);font:inherit;font-size:13px;font-weight:600;cursor:pointer;}',
  '.dsha-gate-dock-cta:hover{filter:brightness(.96);}',
  '.dsha-gate-dock-cta:disabled{opacity:.55;cursor:default;}',
  '.dsha-gate-dock-error{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-error, var(--dsw-alias-label-primary));}',
].join('')

/**
 * Render the strip while the product has no usable project; render nothing otherwise.
 * @returns the strip, or null for ready/legacy faces.
 */
export interface ProductGateDockProps {
  /** The same per-materialization face the dashboard gate renders. */
  readonly face: ProductFace
}

export function ProductGateDock({ face: productFace }: ProductGateDockProps): ReturnType<typeof ce> | null {
  const state = useProductFace(productFace)
  const view = productGateView(state.binding)
  const reason = productGateReason(view, state.binding)
  if (reason === undefined) return null
  const recovery = view === 'recovery'
  return ce('div', { className: 'dsha-gate-dock' },
    ce('style', {}, DOCK_STYLES),
    ce('div', { className: 'dsha-gate-dock-row' },
      ce('span', { className: 'dsha-gate-dock-label' }, reason),
      ce('button', {
        className: 'dsha-gate-dock-cta',
        type: 'button',
        disabled: state.busy,
        onClick: () => { void chooseProductWorkspace(productFace, binding => { startSessionInBinding(productFace, binding) }) },
      }, state.busy ? '正在登记…' : recovery ? '选择另一个目录' : '选择项目目录'),
    ),
    state.error === undefined ? null : ce('p', { className: 'dsha-gate-dock-error' }, state.error),
  )
}
