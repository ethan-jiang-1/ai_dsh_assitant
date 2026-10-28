/**
 * The package-directory guard for every data root the plugin resolves.
 *
 * `dataDir` is deployment configuration, so a careless profile/home patch can point it at the
 * installed package. An install or upgrade replaces that directory and `files` trims it, so user
 * data written there has no persistence contract (DSH R1: the package directory is not a data
 * directory). The default roots are already outside it; this guard turns the misconfiguration into
 * a loud activation failure instead of silently losing the agent's home on the next upgrade.
 *
 * @module dsh-smart-assistant/host/package-root
 */

import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The package directory that ships this code (source and built layouts are both two levels up). */
export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Throw when a resolved data directory sits inside the package tree.
 * @param dataDir - Absolute data root resolved from Config (the caller resolves first).
 * @param packageRoot - Package directory to compare against; injectable for the unit test.
 * @throws When `dataDir` is the package root or any directory beneath it.
 */
export function assertDataDirOutsidePackage(dataDir: string, packageRoot: string = PACKAGE_ROOT): void {
  const inside = relative(packageRoot, dataDir)
  if (inside === '' || (!inside.startsWith('..') && !isAbsolute(inside))) {
    throw new Error(
      `dataDir ${dataDir} resolves inside the package directory (${packageRoot}); `
      + 'an install or upgrade replaces that directory, so user data written there would be lost. '
      + 'Point dataDir at a user-owned path (the default is <DSH_HOME>/assistant).',
    )
  }
}
