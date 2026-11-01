/**
 * The product gate in front of the `main` dashboard: it shows which project the product is bound
 * to, offers one way to start a session there, asks for a project on first run, and turns a
 * missing/invalid binding into a readable recovery screen instead of an empty chat.
 *
 * The gate is deliberately transparent on every state that is not a product state: a 404 (manual
 * install / older profile), a transient fetch error, `pending`, or `not-configured` with
 * onboarding disabled all render the existing dashboard unchanged. Only a real product profile
 * changes the first screen.
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
  readonly onboarding?: boolean
  readonly error?: string
}

/** Browser capabilities the gate needs; the entry binds them once. */
export interface ProductGateRuntime {
  readonly fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  readonly baseURI: () => string
  /** DSH directory picker; absent when the composition has no picker capability. */
  readonly pickDirectory?: () => Promise<string | null>
  /** Create and select a session in the workspace; `startSession` does both. */
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
  const onboarding = record['onboarding']
  const error = record['error']
  if (workspaceDir !== undefined && typeof workspaceDir !== 'string') return undefined
  if (workspaceId !== undefined && typeof workspaceId !== 'string') return undefined
  if (onboarding !== undefined && typeof onboarding !== 'boolean') return undefined
  if (error !== undefined && typeof error !== 'string') return undefined
  return {
    version: 1,
    configured: record['configured'],
    status: status as ProductBindingStatus,
    ...(workspaceDir === undefined ? {} : { workspaceDir }),
    ...(workspaceId === undefined ? {} : { workspaceId }),
    ...(onboarding === undefined ? {} : { onboarding }),
    ...(error === undefined ? {} : { error }),
  }
}

/** Which surface a binding asks for: unchanged dashboard, onboarding, ready, or recovery. */
export type ProductGateView = 'legacy' | 'onboarding' | 'ready' | 'recovery'

/**
 * @param binding - Validated route payload, or undefined before/without a product face.
 * @returns the surface to render.
 */
export function productGateView(binding: ProductBinding | undefined): ProductGateView {
  if (binding === undefined) return 'legacy'
  if (binding.status === 'ready') return 'ready'
  if (binding.status === 'not-configured') return binding.onboarding === false ? 'legacy' : 'onboarding'
  if (binding.status === 'workspace-missing' || binding.status === 'invalid') return 'recovery'
  return 'legacy'
}

/** Last path segment, for a readable project label without importing node:path into the browser. */
function workspaceLabel(dir: string | undefined): string {
  if (dir === undefined || dir === '') return '未绑定项目'
  const parts = dir.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? dir
}

/** Readable message for a failed POST; the route keeps stable codes, the client explains them. */
function failureMessage(code: string | undefined): string {
  switch (code) {
    case 'workspace-not-absolute':
      return '请选择一个绝对路径的项目目录。'
    case 'workspace-missing':
      return '这个目录不存在；请重新选择，产品不会自动创建空目录。'
    case 'workspace-not-directory':
      return '这个路径不是目录。'
    case 'workspace-not-writable':
      return '这个目录不可写；请检查权限或换一个目录。'
    case 'workspace-forbidden':
      return '这个目录不能作为项目（系统根、用户 home、产品 home 或包目录）。'
    case 'settings-unavailable':
      return '当前组合没有设置服务，无法保存工作区；请在 profile patch 设置 assistant-product.workspaceDir。'
    case 'settings-conflict':
      return '设置刚被其他窗口改过；请重试。'
    case 'settings-write-failed':
      return '工作区已登记，但写入 profile 设置失败；请检查 profile 权限后重试。'
    default:
      return '项目目录没有登记成功；请重试或查看启动日志。'
  }
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

/** Render the first-run chooser; the dashboard is withheld until the user chooses or defers. */
function onboarding(
  binding: ProductBinding,
  busy: boolean,
  error: string | undefined,
  choose: () => void,
  later: () => void,
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
          onClick: choose,
        }, busy ? '正在登记…' : '选择项目目录'),
        ce('button', { className: 'dsha-product-secondary', type: 'button', onClick: later }, '稍后'),
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
  choose: () => void,
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
          onClick: choose,
        }, busy ? '正在登记…' : '选择另一个目录'),
      ),
      error === undefined ? null : ce('p', { className: 'dsha-product-error' }, error),
      ce('p', {}, '产品不会自动创建空目录；也可以从启动器用 ',
        ce('code', {}, '--workspace <目录>'), ' 重新启动。'),
    ),
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [dismissed, setDismissed] = useState(false)

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

  const choose = (): void => {
    if (busy) return
    const pick = runtime.pickDirectory
    if (pick === undefined) {
      setError('当前环境没有目录选择器；请在 profile patch 设置 assistant-product.workspaceDir。')
      return
    }
    setBusy(true)
    setError(undefined)
    const run = async (): Promise<void> => {
      try {
        const picked = await pick()
        if (picked === null) return
        const url = new URL('api/assistant/product', runtime.baseURI())
        const response = await runtime.fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          redirect: 'error',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workspaceDir: picked }),
        })
        const payload = await response.json().catch(() => undefined) as { error?: string } | undefined
        if (!response.ok) {
          setError(failureMessage(payload?.error))
          return
        }
        const parsed = parseProductBinding(payload)
        if (parsed !== undefined) {
          setBinding(parsed)
          setDismissed(false)
          setError(undefined)
        } else {
          setError(failureMessage(undefined))
        }
      } catch {
        setError(failureMessage(undefined))
      } finally {
        setBusy(false)
      }
    }
    void run()
  }

  const view = productGateView(binding)
  if (view === 'onboarding') {
    return dismissed
      ? ce(Base, rest)
      : onboarding(binding as ProductBinding, busy, error, choose, () => setDismissed(true))
  }
  if (view === 'recovery') return recovery(binding as ProductBinding, busy, error, choose)
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
      ce('button', {
        className: 'dsha-product-change',
        type: 'button',
        disabled: busy,
        onClick: choose,
      }, busy ? '正在登记…' : '换项目'),
    ),
    error === undefined ? null : ce('p', { className: 'dsha-product-error' }, error),
    ce('div', { className: 'dsha-product-body' }, ce(Base, rest)),
  )
}
