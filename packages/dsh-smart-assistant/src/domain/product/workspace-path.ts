/**
 * Workspace path policy for the product: what the launcher and the product row may bind.
 *
 * The session's immutable `header.cwd` becomes the file-tool and sandbox root, so this check is
 * deliberately stricter than "the directory exists": it refuses the filesystem root, the user's
 * home directory, the product home and the installed package directory. A symlink is resolved
 * first, so a link into a forbidden place is judged by its target.
 *
 * @module dsh-smart-assistant/product/workspace-path
 */

import { constants } from 'node:fs'
import { access, realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, parse, relative, resolve } from 'node:path'

/** Machine-readable reasons a workspace path was refused. */
export type WorkspacePathErrorCode =
  | 'workspace-not-absolute'
  | 'workspace-missing'
  | 'workspace-not-directory'
  | 'workspace-not-writable'
  | 'workspace-forbidden'
  | 'workspace-unavailable'

/** A refused workspace path; the code is safe to return over the product route. */
export class WorkspacePathError extends Error {
  readonly code: WorkspacePathErrorCode

  /**
   * @param code - Stable failure reason.
   * @param message - Owner-readable detail (not returned verbatim to the model).
   */
  constructor(code: WorkspacePathErrorCode, message: string) {
    super(message)
    this.name = 'WorkspacePathError'
    this.code = code
  }
}

/** Deployment facts the policy compares against. */
export interface WorkspacePathOptions {
  /** The product's own `DSH_HOME`; a workspace inside it would mix data planes. */
  readonly home: string
  /** The OS user's home; a workspace equal to it is too broad to bind. */
  readonly userHome?: string
  /** The installed package directory; an install replaces it. */
  readonly packageRoot: string
}

/**
 * Validate and canonicalize a workspace directory.
 * @param input - User-supplied path; relative paths are refused rather than resolved.
 * @param options - Product home, user home and package root.
 * @returns the canonical absolute directory.
 * @throws {WorkspacePathError} when the path is missing, not a writable directory, or forbidden.
 */
export async function resolveWorkspaceDir(
  input: string,
  options: WorkspacePathOptions,
): Promise<string> {
  const requested = input.trim()
  if (requested === '' || !isAbsolute(requested)) {
    throw new WorkspacePathError('workspace-not-absolute', `workspace path must be absolute: ${input}`)
  }
  const info = await stat(requested).catch(error => {
    if (isNodeError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
      throw new WorkspacePathError('workspace-missing', `workspace directory does not exist: ${requested}`)
    }
    throw new WorkspacePathError('workspace-unavailable', `cannot inspect workspace ${requested}: ${String(error)}`)
  })
  if (!info.isDirectory()) {
    throw new WorkspacePathError('workspace-not-directory', `workspace path is not a directory: ${requested}`)
  }
  const canonical = await realpath(requested).catch(error => {
    throw new WorkspacePathError('workspace-unavailable', `cannot resolve workspace ${requested}: ${String(error)}`)
  })
  if (canonical === parse(canonical).root) {
    throw new WorkspacePathError('workspace-forbidden', 'the filesystem root is not a product workspace')
  }
  const userHome = await canonicalOrUndefined(options.userHome ?? homedir())
  if (userHome !== undefined && canonical === userHome) {
    throw new WorkspacePathError('workspace-forbidden', 'the user home directory is not a product workspace')
  }
  const productHome = await canonicalOrUndefined(options.home)
  if (productHome !== undefined && isInsideOrEqual(productHome, canonical)) {
    throw new WorkspacePathError('workspace-forbidden', 'a workspace inside the product home would mix data planes')
  }
  const packageRoot = await canonicalOrUndefined(options.packageRoot)
  if (packageRoot !== undefined && isInsideOrEqual(packageRoot, canonical)) {
    throw new WorkspacePathError('workspace-forbidden', 'the installed package directory is not a product workspace')
  }
  try {
    await access(requested, constants.R_OK | constants.W_OK)
  } catch {
    throw new WorkspacePathError('workspace-not-writable', `workspace directory is not readable and writable: ${requested}`)
  }
  return canonical
}

/** True when `child` equals `parent` or sits beneath it. */
function isInsideOrEqual(parent: string, child: string): boolean {
  const nested = relative(parent, child)
  return nested === '' || (!nested.startsWith('..') && !isAbsolute(nested))
}

/** Canonicalize an existing path; undefined when it does not exist yet. */
async function canonicalOrUndefined(path: string): Promise<string | undefined> {
  try {
    return await realpath(resolve(path))
  } catch {
    return undefined
  }
}

/** Narrow an unknown caught value to a Node error with a string code. */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
