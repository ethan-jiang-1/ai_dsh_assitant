/**
 * Product state: the one binding between this installation and a user workspace.
 *
 * The binding is a profile Config value (`assistant-product.workspaceDir`), not a private
 * settings file. The host row reads the effective Config at boot, registers the workspace, and
 * lets the authenticated client change it through `ctx.settings.update` (which persists the
 * current profile patch). A one-shot `ASSISTANT_WORKSPACE` environment value is accepted for the
 * installer/CI path; when it is used and the settings service is present, the value is persisted
 * so the next `--product` start does not ask again.
 *
 * The row is deliberately web-only: it needs `connection` (the authenticated route) and
 * `workspaceRegistry` (the durable registration), both of which only exist in a web composition.
 * Headless profiles disable the row in their patch, the same way `schedule` is disabled.
 *
 * @module dsh-smart-assistant/host/product/state
 */

import { homedir } from 'node:os'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { PACKAGE_ROOT } from '../package-root.ts'
import {
  resolveWorkspaceDir,
  WorkspacePathError,
  type WorkspacePathErrorCode,
} from '../../domain/product/workspace-path.ts'

/** Payload schema version the client parses. */
export const PRODUCT_SCHEMA_VERSION = 1 as const

/** Product binding states the client gate can render. */
export type ProductStatus =
  | 'not-configured'
  | 'pending'
  | 'ready'
  | 'workspace-missing'
  | 'invalid'

/** The value the product route returns. */
export interface ProductSnapshot {
  readonly version: typeof PRODUCT_SCHEMA_VERSION
  /** Whether a workspace value exists (even when it is unusable). */
  readonly configured: boolean
  readonly status: ProductStatus
  /** Stored or canonical workspace path, when one is known. */
  readonly workspaceDir?: string
  /** Workspace registration id once the path is registered. */
  readonly workspaceId?: string
  /** Whether the client should offer the first-run onboarding when unconfigured. */
  readonly onboarding: boolean
  /** Stable failure reason for `workspace-missing` / `invalid`. */
  readonly error?: ProductErrorCode
}

/** Stable failure reasons the client may branch on. */
export type ProductErrorCode =
  | WorkspacePathErrorCode
  | 'settings-unavailable'
  | 'settings-write-failed'
  | 'settings-conflict'
  | 'workspace-unavailable'

/** The slice of the workspace registry the product row needs. */
export interface ProductRegistry {
  create(path: string): Promise<{ readonly id: string, readonly path: string }>
}

/** The slice of the DSH settings service the product row needs. */
export interface ProductSettingsWriter {
  update(namespace: string, patch: object, expectedRevision?: number): Promise<void>
}

/** The effective row Config. */
export interface ProductConfig {
  /** Workspace directory from the profile/home/CLI patch stack. */
  readonly workspaceDir?: string | undefined
  /** Whether the first-run onboarding is enabled; deployment default. */
  readonly onboarding?: boolean | undefined
}

/** Construction facts; the row supplies the live services, tests can inject fakes. */
export interface ProductStateOptions {
  readonly registry: ProductRegistry
  readonly config?: ProductConfig
  /** Environment override, normally `process.env`; only `ASSISTANT_WORKSPACE` is read. */
  readonly env?: Readonly<Record<string, string | undefined>>
  /** Settings writer; absent in a composition without the settings service. */
  readonly settings?: ProductSettingsWriter
  /** Product `DSH_HOME`; alias of `resolveDshHome()` by default. */
  readonly home?: string
  /** OS user home; a workspace equal to it is refused. */
  readonly userHome?: string
  /** Installed package directory; a workspace inside it is refused. */
  readonly packageRoot?: string
}

/** Settings persistence failed; the route maps the code to an HTTP response. */
export class ProductSettingsError extends Error {
  readonly code: ProductErrorCode

  constructor(code: ProductErrorCode, message: string) {
    super(message)
    this.name = 'ProductSettingsError'
    this.code = code
  }
}

/** The product row's state machine. */
export interface ProductState {
  /** Wait for the initial Config read/registration, then return the current snapshot. */
  ready(): Promise<ProductSnapshot>
  /** Current snapshot without waiting. */
  snapshot(): ProductSnapshot
  /** Validate, register and persist a new workspace, then return the snapshot. */
  setWorkspace(workspaceDir: string): Promise<ProductSnapshot>
}

/** Read the one-shot env override without treating blank as a value. */
function envWorkspace(env: Readonly<Record<string, string | undefined>> | undefined): string | undefined {
  const value = env?.['ASSISTANT_WORKSPACE']
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Build the state machine. The initial refresh starts immediately; the route awaits
 * {@link ProductState.ready} so the client never sees a half-initialized binding.
 * @param options - Registry, Config, env, settings and paths.
 * @returns the state machine.
 */
export function createProductState(options: ProductStateOptions): ProductState {
  const home = options.home ?? resolveDshHome()
  const userHome = options.userHome ?? homedir()
  const packageRoot = options.packageRoot ?? PACKAGE_ROOT
  const onboarding = options.config?.onboarding ?? true
  const configuredValue = options.config?.workspaceDir?.trim()
  const envValue = envWorkspace(options.env)
  const candidate = envValue ?? (configuredValue === '' ? undefined : configuredValue)
  let current: ProductSnapshot = { version: PRODUCT_SCHEMA_VERSION, configured: candidate !== undefined, status: 'pending', onboarding }
  let queue: Promise<unknown> = Promise.resolve()

  /** Serialize refresh/set operations so two POSTs cannot interleave their reads and writes. */
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task)
    queue = next.then(() => undefined, () => undefined)
    return next
  }

  /** Persist the workspace into the current profile patch; surface every failure. */
  const persist = async (workspaceDir: string): Promise<ProductErrorCode | undefined> => {
    if (options.settings === undefined) return 'settings-unavailable'
    try {
      await options.settings.update('assistant-product', { workspaceDir })
      return undefined
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return /conflict|revision/i.test(message) ? 'settings-conflict' : 'settings-write-failed'
    }
  }

  const refresh = (): Promise<ProductSnapshot> => enqueue(async () => {
    if (candidate === undefined) {
      current = { version: PRODUCT_SCHEMA_VERSION, configured: false, status: 'not-configured', onboarding }
      return current
    }
    current = { version: PRODUCT_SCHEMA_VERSION, configured: true, status: 'pending', workspaceDir: candidate, onboarding }
    try {
      const canonical = await resolveWorkspaceDir(candidate, { home, userHome, packageRoot })
      const workspace = await options.registry.create(canonical)
      // A value chosen at startup (installer/CI) should survive a later `--product` start. A
      // value that came from Config is already persisted; do not write it again.
      const persistence = envValue === undefined ? undefined : await persist(canonical)
      current = {
        version: PRODUCT_SCHEMA_VERSION,
        configured: true,
        status: 'ready',
        workspaceDir: canonical,
        workspaceId: workspace.id,
        onboarding,
        ...(persistence === undefined ? {} : { error: persistence }),
      }
    } catch (error) {
      current = {
        version: PRODUCT_SCHEMA_VERSION,
        configured: true,
        status: error instanceof WorkspacePathError && error.code === 'workspace-missing'
          ? 'workspace-missing'
          : 'invalid',
        workspaceDir: candidate,
        onboarding,
        error: error instanceof WorkspacePathError ? error.code : 'workspace-unavailable',
      }
    }
    return current
  })

  const initial = refresh()

  const setWorkspace = (workspaceDir: string): Promise<ProductSnapshot> => enqueue(async () => {
    const canonical = await resolveWorkspaceDir(workspaceDir, { home, userHome, packageRoot })
    const workspace = await options.registry.create(canonical)
    const persistence = await persist(canonical)
    if (persistence !== undefined) {
      throw new ProductSettingsError(persistence, `could not persist the product workspace (${persistence})`)
    }
    current = {
      version: PRODUCT_SCHEMA_VERSION,
      configured: true,
      status: 'ready',
      workspaceDir: canonical,
      workspaceId: workspace.id,
      onboarding,
    }
    return current
  })

  return {
    async ready(): Promise<ProductSnapshot> {
      await initial
      return current
    },
    snapshot(): ProductSnapshot {
      return current
    },
    setWorkspace,
  }
}
