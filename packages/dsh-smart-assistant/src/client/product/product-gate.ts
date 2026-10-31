/**
 * The product gate in front of the `main` dashboard: it shows which project the product is bound
 * to, offers one way to start a session there, and turns a missing/invalid binding into a
 * readable recovery screen instead of an empty chat.
 *
 * The gate is deliberately transparent on every other state: a 404 (manual install / older
 * profile), a transient fetch error, `not-configured`, or `pending` all render the existing
 * dashboard unchanged. That keeps the standalone/dev surfaces and the existing web-face scenes
 * exactly as they were; only a real product home with a settings file changes the first screen.
 *
 * @module dsh-smart-assistant/client/product/product-gate
 */

import type { ComponentType } from 'react'
import { createElement as ce, reactSurface } from '../chrome/runtime'
import type { ProjectionPanelProps } from '../projection/projection-panel'

/** The binding states the host route may return. */
export type ProductBindingStatus = 'not-configured' | 'pending' | 'ready' | 'workspace-missing' | 'invalid'

/** The client's validated view of the product route. */
export interface ProductBinding {
  readonly version: 1
  readonly configured: boolean
  readonly status: ProductBindingStatus
  readonly workspaceDir?: string
  readonly workspaceId?: string
  readonly error?: string
}

/** Browser capabilities the gate needs; the entry binds them once. */
export interface ProductGateRuntime {
  readonly fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  readonly baseURI: () => string
  readonly startSession?: (workspaceId: string) => void
}

/** The gate wraps one of the existing dashboard components. */
export interface ProductGateProps extends ProjectionPanelProps {
  readonly base: ComponentType<ProjectionPanelProps>
  readonly runtime: ProductGateRuntime
}

const STATUSES: ReadonlySet<string> = new Set([
  'not-configured', 'pending', 'ready', 'workspace-missing', 'invalid',
])

/**
 * Validate the route payload. Anything unexpected is `undefined`, which the gate treats as
 * "no product face" rather than rendering a guessed state.
 * @param value - Parsed JSON value.
 * @returns the validated binding, or undefined.
 */
export function parseProductBinding(value: unknown): ProductBinding | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (record['version'] !== 1) return undefined
  if (typeof record['configured'] !== 'boolean') return undefined
  const status = record['status']
  if (typeof status !== 'string' || !STATUSES.has(status)) return undefined
  const workspaceDir = record['workspaceDir']
  const workspaceId = record['workspaceId']
  const error = record['error']
  if (workspaceDir !== undefined && typeof workspaceDir !== 'string') return undefined
  if (workspaceId !== undefined && typeof workspaceId !== 'string') return undefined
  if (error !== undefined && typeof error !== 'string') return undefined
  return {
    version: 1,
    configured: record['configured'],
    status: status as ProductBindingStatus,
    ...(workspaceDir === undefined ? {} : { workspaceDir }),
    ...(workspaceId === undefined ? {} : { workspaceId }),
    ...(error === undefined ? {} : { error }),
  }
}

/** Which surface a binding asks for: the unchanged dashboard, or the recovery screen. */
export type ProductGateView = 'legacy' | 'ready' | 'recovery'

/**
 * @param binding - Validated route payload, or undefined before/without a product face.
 * @returns the surface to render.
 */
export function productGateView(binding: ProductBinding | undefined): ProductGateView {
  if (binding === undefined) return 'legacy'
  if (binding.status === 'ready') return 'ready'
  if (binding.status === 'workspace-missing' || binding.status === 'invalid') return 'recovery'
  return 'legacy'
}

/** Last path segment, for a readable project label without importing node:path into the browser. */
function workspaceLabel(dir: string | undefined): string {
  if (dir === undefined || dir === '') return '未绑定项目'
  const parts = dir.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? dir
}

const STYLES = [
  '.dsha-product{display:flex;flex-direction:column;height:100%;min-height:0;}',
  '.dsha-product-bar{display:flex;align-items:center;gap:12px;padding:9px clamp(20px,6vw,72px);border-bottom:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);flex:none;}',
  '.dsha-product-label{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
  '.dsha-product-start{margin-left:auto;border:0;border-radius:8px;padding:6px 14px;background:var(--dsha-accent);color:var(--dsha-on-accent);font:inherit;font-size:13px;font-weight:600;cursor:pointer;flex:none;}',
  '.dsha-product-start:hover{filter:brightness(.96);}',
  '.dsha-product-body{flex:1;min-height:0;overflow:hidden;}',
  '.dsha-product-recovery{display:flex;flex-direction:column;gap:12px;align-items:flex-start;padding:28px clamp(20px,6vw,72px);}',
  '.dsha-product-recovery h2{margin:0;font-size:20px;line-height:1.45;color:var(--dsw-alias-label-primary);}',
  '.dsha-product-recovery p{margin:0;font-size:14px;line-height:1.75;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-product-recovery code{font-size:13px;color:var(--dsw-alias-label-primary);}',
].join('')

/** Render the recovery screen; the dashboard is withheld until the binding is usable. */
function recovery(binding: ProductBinding): ReturnType<typeof ce> {
  const title = binding.status === 'workspace-missing'
    ? '上次的项目目录不在了'
    : '这个产品还没有可用的项目目录'
  const detail = binding.status === 'workspace-missing'
    ? `目录：${binding.workspaceDir ?? '（未记录）'}`
    : `原因：${binding.error ?? '项目目录不可用'}`
  return ce('div', { className: 'dsha-product-recovery' },
    ce('style', {}, STYLES),
    ce('h2', {}, title),
    ce('p', {}, detail),
    ce('p', {}, '用 ', ce('code', {}, '--workspace <目录>'), ' 重新启动产品；产品会重新登记这个目录，不会自动创建空目录。'),
  )
}

/**
 * Render the product gate. The fetch runs once per materialization; any non-product response
 * falls through to the base dashboard so this component never becomes a second failure source.
 * @param props - Base dashboard, runtime capabilities and the dashboard props.
 * @returns the gated dashboard.
 */
export function ProductGate(props: ProductGateProps): ReturnType<typeof ce> {
  const { base: Base, runtime, ...rest } = props
  const { useEffect, useState } = reactSurface()
  const [binding, setBinding] = useState<ProductBinding | undefined>(undefined)

  useEffect(() => {
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      try {
        const url = new URL('api/assistant/product', runtime.baseURI())
        const response = await runtime.fetch(url, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          redirect: 'error',
          signal: controller.signal,
        })
        if (!response.ok) return
        const parsed = parseProductBinding(await response.json())
        if (!controller.signal.aborted && parsed !== undefined) setBinding(parsed)
      } catch { /* legacy dashboard on any transport failure */ }
    }
    void load()
    return () => controller.abort()
  }, [])

  const view = productGateView(binding)
  if (view === 'recovery') return recovery(binding as ProductBinding)
  if (view !== 'ready') return ce(Base, rest)
  return ce('div', { className: 'dsha-product' },
    ce('style', {}, STYLES),
    ce('div', { className: 'dsha-product-bar' },
      ce('span', { className: 'dsha-product-label' }, `工作区 · ${workspaceLabel(binding?.workspaceDir)}`),
      binding?.workspaceId !== undefined && runtime.startSession !== undefined
        ? ce('button', {
            className: 'dsha-product-start',
            type: 'button',
            onClick: () => { if (binding?.workspaceId !== undefined) runtime.startSession?.(binding.workspaceId) },
          }, '开始一件事')
        : null,
    ),
    ce('div', { className: 'dsha-product-body' }, ce(Base, rest)),
  )
}
