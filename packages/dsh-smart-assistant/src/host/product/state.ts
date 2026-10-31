/**
 * Product state: the one binding between this installation and a user workspace.
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
  productSettingsPath,
  readProductSettings,
  writeProductSettings,
  PRODUCT_SETTINGS_VERSION,
} from '../../domain/product/settings.ts'
import {
  resolveWorkspaceDir,
  WorkspacePathError,
  type WorkspacePathErrorCode,
} from '../../domain/product/workspace-path.ts'

/** Product binding states the client gate can render. */
export type ProductStatus =
  | 'not-configured'
  | 'pending'
  | 'ready'
  | 'workspace-missing'
  | 'invalid'

/** The value the product route returns. */
export interface ProductSnapshot {
  readonly version: typeof PRODUCT_SETTINGS_VERSION
  /** Whether a settings file exists (even when it is unusable). */
  readonly configured: boolean
  readonly status: ProductStatus
  /** Stored or canonical workspace path, when one is known. */
  readonly workspaceDir?: string
  /** Workspace registration id once the path is registered. */
  readonly workspaceId?: string
  /** Stable failure reason for `workspace-missing` / `invalid`. */
  readonly error?: WorkspacePathErrorCode | 'settings-invalid' | 'workspace-unavailable'
}

/** The slice of the workspace registry the product row needs. */
export interface ProductRegistry {
  create(path: string): Promise<{ readonly id: string, readonly path: string }>
}

/** Construction facts; the row supplies the live registry, tests can inject a fake. */
export interface ProductStateOptions {
  readonly registry: ProductRegistry
  /** Product `DSH_HOME`; alias of `resolveDshHome()` by default. */
  readonly home?: string
  /** Absolute settings path; defaults to `<home>/assistant-product/settings.json`. */
  readonly settingsPath?: string
  /** OS user home; a workspace equal to it is refused. */
  readonly userHome?: string
  /** Installed package directory; a workspace inside it is refused. */
  readonly packageRoot?: string
  /** Clock injection for tests. */
  readonly now?: () => Date
}

/** The product row's state machine. */
export interface ProductState {
  /** Wait for the initial settings read/registration, then return the current snapshot. */
  ready(): Promise<ProductSnapshot>
  /** Current snapshot without waiting. */
  snapshot(): ProductSnapshot
  /** Validate, register and persist a new workspace, then return the snapshot. */
  setWorkspace(workspaceDir: string): Promise<ProductSnapshot>
}

/**
 * Build the state machine. The initial refresh starts immediately; the route awaits
 * {@link ProductState.ready} so the client never sees a half-initialized binding.
 * @param options - Registry, paths and clock.
 * @returns the state machine.
 */
export function createProductState(options: ProductStateOptions): ProductState {
  const home = options.home ?? resolveDshHome()
  const settingsPath = options.settingsPath ?? productSettingsPath(home)
  const userHome = options.userHome ?? homedir()
  const packageRoot = options.packageRoot ?? PACKAGE_ROOT
  const now = options.now ?? (() => new Date())
  let current: ProductSnapshot = { version: PRODUCT_SETTINGS_VERSION, configured: false, status: 'pending' }
  let queue: Promise<unknown> = Promise.resolve()

  /** Serialize refresh/set operations so two POSTs cannot interleave their reads and writes. */
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task)
    queue = next.then(() => undefined, () => undefined)
    return next
  }

  const refresh = (): Promise<ProductSnapshot> => enqueue(async () => {
    const read = await readProductSettings(settingsPath)
    if (read.kind === 'missing') {
      current = { version: PRODUCT_SETTINGS_VERSION, configured: false, status: 'not-configured' }
      return current
    }
    if (read.kind === 'invalid') {
      current = {
        version: PRODUCT_SETTINGS_VERSION,
        configured: true,
        status: 'invalid',
        error: 'settings-invalid',
      }
      return current
    }
    const stored = read.settings.workspaceDir
    current = {
      version: PRODUCT_SETTINGS_VERSION,
      configured: true,
      status: 'pending',
      workspaceDir: stored,
    }
    try {
      const canonical = await resolveWorkspaceDir(stored, { home, userHome, packageRoot })
      const workspace = await options.registry.create(canonical)
      current = {
        version: PRODUCT_SETTINGS_VERSION,
        configured: true,
        status: 'ready',
        workspaceDir: canonical,
        workspaceId: workspace.id,
      }
    } catch (error) {
      current = {
        version: PRODUCT_SETTINGS_VERSION,
        configured: true,
        status: error instanceof WorkspacePathError && error.code === 'workspace-missing'
          ? 'workspace-missing'
          : 'invalid',
        workspaceDir: stored,
        error: error instanceof WorkspacePathError ? error.code : 'workspace-unavailable',
      }
    }
    return current
  })

  const initial = refresh()

  const setWorkspace = (workspaceDir: string): Promise<ProductSnapshot> => enqueue(async () => {
    const canonical = await resolveWorkspaceDir(workspaceDir, { home, userHome, packageRoot })
    const workspace = await options.registry.create(canonical)
    await writeProductSettings(settingsPath, canonical, now())
    current = {
      version: PRODUCT_SETTINGS_VERSION,
      configured: true,
      status: 'ready',
      workspaceDir: canonical,
      workspaceId: workspace.id,
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
