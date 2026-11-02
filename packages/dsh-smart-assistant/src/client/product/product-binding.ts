/**
 * The product binding's pure vocabulary: the route payload the client accepts, the surface
 * each state asks for, and the copy the gate shares with the conversation dock and the
 * composer block.
 *
 * No React, no browser API, no store — the gate panel, the dock and the block applier all
 * branch on these functions, and the client specs exercise them directly.
 *
 * @module dsh-smart-assistant/client/product/product-binding
 */

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

/** Browser capabilities the product face needs; the entry binds them once per materialization. */
export interface ProductGateRuntime {
  readonly fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  readonly baseURI: () => string
  /** DSH directory picker; absent when the composition has no picker capability. */
  readonly pickDirectory?: () => Promise<string | null>
  /** Create and select a session in the workspace; `startSession` does both. */
  readonly startSession?: (workspaceId: string) => void
}

const STATUSES: ReadonlySet<string> = new Set([
  'not-configured', 'pending', 'ready', 'workspace-missing', 'invalid',
])

/**
 * Validate the route payload. Anything unexpected is `undefined`, which the face treats as
 * "no product gate" rather than rendering a guessed state.
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

/**
 * The one sentence the dock and the composer block both show. Absent for `ready` and
 * `legacy`: those surfaces must stay exactly as they were.
 * @param view - Where the binding stands.
 * @param binding - Validated payload, when one is known.
 * @returns the reason copy, or undefined when the product gate is not up.
 */
export function productGateReason(view: ProductGateView, binding: ProductBinding | undefined): string | undefined {
  if (view === 'onboarding') return '先选择一个项目目录，助手才会在这个项目里工作。'
  if (view === 'recovery') {
    return binding?.status === 'workspace-missing'
      ? '上次的项目目录不在了；选一个可用的目录再继续。'
      : '这个项目目录不可用；换一个目录再继续。'
  }
  return undefined
}

/**
 * Whether the product withholds input while this view is up. `legacy` and `ready` never
 * block; the platform's own no-workspace posture and this gate must not stack.
 * @param view - Where the binding stands.
 * @returns true when every conversation's composer must be inert.
 */
export function productGateBlocks(view: ProductGateView): boolean {
  return view === 'onboarding' || view === 'recovery'
}

/** Last path segment, for a readable project label without importing node:path into the browser. */
export function workspaceLabel(dir: string | undefined): string {
  if (dir === undefined || dir === '') return '未绑定项目'
  const parts = dir.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? dir
}

/** Readable message for a failed POST; the route keeps stable codes, the client explains them. */
export function failureMessage(code: string | undefined): string {
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
