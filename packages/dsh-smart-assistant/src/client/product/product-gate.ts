/**
 * The product gate in front of the `main` dashboard: it shows which project the product is bound
 * to, offers one way to start a session there, asks for a project on first run, and turns a
 * missing/invalid binding into a readable recovery screen instead of an empty chat.
 *
 * The gate is deliberately transparent on every state that is not a product state: a 404 (manual
 * install / older profile), a transient fetch error, `pending`, or `not-configured` with
 * onboarding disabled all render the existing dashboard unchanged. Only a real product profile
 * changes a surface.
 *
 * The conversation's half of the gate is the dock + composer block (`product-dock.ts` /
 * `product-face.ts`): the dashboard gate covers the desk's own input lane, the block covers
 * every Session. One binding store feeds both.
 *
 * @module dsh-smart-assistant/client/product/product-gate
 */

import type { ComponentType } from 'react'
import { createElement as ce } from '../chrome/runtime'
import type { ProjectionPanelProps } from '../projection/projection-panel'
import { productGateView, workspaceLabel, type ProductBinding } from './product-binding'
import { chooseProductWorkspace, startSessionInBinding, useProductFace } from './product-face'

/** The gate wraps one of the existing dashboard components. */
export interface ProductGateProps extends ProjectionPanelProps {
  readonly base: ComponentType<ProjectionPanelProps>
}

const STYLES = [
  '.dsha-product{display:flex;flex-direction:column;height:100%;min-height:0;}',
  '.dsha-product-bar{display:flex;align-items:center;gap:12px;padding:9px clamp(20px,6vw,72px);border-bottom:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);flex:none;}',
  '.dsha-product-label{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
  '.dsha-product-start{margin-left:auto;border:0;border-radius:8px;padding:6px 14px;background:var(--dsha-accent);color:var(--dsha-on-accent);font:inherit;font-size:13px;font-weight:600;cursor:pointer;flex:none;}',
  '.dsha-product-start:hover{filter:brightness(.96);}',
  '.dsha-product-start:disabled{opacity:.55;cursor:default;}',
  '.dsha-product-change{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:6px;flex:none;}',
  '.dsha-product-change:hover{background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-product-body{flex:1;min-height:0;overflow:hidden;}',
  '.dsha-product-panel{display:flex;flex-direction:column;gap:12px;align-items:flex-start;padding:32px clamp(20px,6vw,72px);max-width:760px;}',
  '.dsha-product-panel h2{margin:0;font-size:22px;line-height:1.45;color:var(--dsw-alias-label-primary);}',
  '.dsha-product-panel p{margin:0;font-size:14px;line-height:1.75;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-product-panel code{font-size:13px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-product-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
  '.dsha-product-secondary{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;padding:7px 4px;}',
  '.dsha-product-secondary:hover{color:var(--dsw-alias-label-primary);}',
  '.dsha-product-error{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-error, var(--dsw-alias-label-primary));}',
].join('')

/** Render the first-run chooser; the dashboard is withheld until a project is bound. */
function onboarding(
  binding: ProductBinding,
  busy: boolean,
  error: string | undefined,
): ReturnType<typeof ce> {
  return ce('div', { className: 'dsha-product' },
    ce('style', {}, STYLES),
    ce('div', { className: 'dsha-product-panel' },
      ce('h2', {}, '选一个项目目录'),
      ce('p', {}, '助手会在这个项目里工作：会话落在这个目录，交付包写到 deliverables/，项目文件归你。'),
      ce('div', { className: 'dsha-product-actions' },
        ce('button', {
          className: 'dsha-product-start',
          type: 'button',
          disabled: busy,
          onClick: () => { void chooseProductWorkspace() },
        }, busy ? '正在登记…' : '选择项目目录'),
      ),
      error === undefined ? null : ce('p', { className: 'dsha-product-error' }, error),
      binding.onboarding === false ? null : ce('p', {}, '也可以先在 profile patch 里设置 ',
        ce('code', {}, 'assistant-product.workspaceDir'), '，再重启 profile。'),
    ),
  )
}

/** Render the recovery screen; the dashboard is withheld until the binding is usable. */
function recovery(
  binding: ProductBinding,
  busy: boolean,
  error: string | undefined,
): ReturnType<typeof ce> {
  const title = binding.status === 'workspace-missing'
    ? '上次的项目目录不在了'
    : '这个产品还没有可用的项目目录'
  const detail = binding.status === 'workspace-missing'
    ? `目录：${binding.workspaceDir ?? '（未记录）'}`
    : `原因：${binding.error ?? '项目目录不可用'}`
  return ce('div', { className: 'dsha-product' },
    ce('style', {}, STYLES),
    ce('div', { className: 'dsha-product-panel' },
      ce('h2', {}, title),
      ce('p', {}, detail),
      ce('div', { className: 'dsha-product-actions' },
        ce('button', {
          className: 'dsha-product-start',
          type: 'button',
          disabled: busy,
          onClick: () => { void chooseProductWorkspace() },
        }, busy ? '正在登记…' : '选择另一个目录'),
      ),
      error === undefined ? null : ce('p', { className: 'dsha-product-error' }, error),
      ce('p', {}, '产品不会自动创建空目录；也可以从启动器用 ',
        ce('code', {}, '--workspace <目录>'), ' 重新启动。'),
    ),
  )
}

/**
 * Render the gated dashboard. The route was read once by the face store; this component only
 * branches on that snapshot, so it never becomes a second fetch or a second failure source.
 * @param props - Base dashboard plus the dashboard props.
 * @returns the gated dashboard.
 */
export function ProductGate(props: ProductGateProps): ReturnType<typeof ce> {
  const { base: Base, ...rest } = props
  const face = useProductFace()
  const view = productGateView(face.binding)
  if (view === 'onboarding') return onboarding(face.binding as ProductBinding, face.busy, face.error)
  if (view === 'recovery') return recovery(face.binding as ProductBinding, face.busy, face.error)
  if (view !== 'ready') return ce(Base, rest)
  const binding = face.binding as ProductBinding
  return ce('div', { className: 'dsha-product' },
    ce('style', {}, STYLES),
    ce('div', { className: 'dsha-product-bar' },
      ce('span', { className: 'dsha-product-label' }, `工作区 · ${workspaceLabel(binding.workspaceDir)}`),
      binding.workspaceId !== undefined
        ? ce('button', {
            className: 'dsha-product-start',
            type: 'button',
            onClick: () => { startSessionInBinding(binding) },
          }, '开始一件事')
        : null,
      ce('button', {
        className: 'dsha-product-change',
        type: 'button',
        disabled: face.busy,
        onClick: () => { void chooseProductWorkspace() },
      }, face.busy ? '正在登记…' : '换项目'),
    ),
    face.error === undefined ? null : ce('p', { className: 'dsha-product-error' }, face.error),
    ce('div', { className: 'dsha-product-body' }, ce(Base, rest)),
  )
}
