/** Host-only read-only operating projection download, independent of assistantMemory. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { expandHomePath, resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { join, resolve } from 'node:path'
import { assertDataDirOutsidePackage } from '../package-root.ts'
import { createDeskProjectionRoute } from './download.ts'
import { createOperatingReceiptsRoute } from './receipts.ts'

export const name = 'assistant-desk-projection'
export const inject = ['connection']

/** Deployment-owned independent operating directory; this reader creates no files. */
export interface Config {
  readonly dataDir?: string
  /** Complete emitted file byte limit; default 8 MiB (the state is compacted; this bridges old homes). */
  readonly maxProjectionBytes?: number
  /** Serve `desk-projection.json` when no ledger exists; false by default (no fake desk). */
  readonly allowFixture?: boolean
}

export const Config: Schema<Config> = z.object({
  dataDir: z.string(),
  maxProjectionBytes: z.natural().min(1).default(8 * 1024 * 1024),
  allowFixture: z.boolean().default(false),
})

/**
 * Contribute the fixed GET route through the authenticated shared Connection carrier.
 * @param ctx - Host fiber owning the registration and its disposer.
 * @param config - Deployment directory; omission resolves to the separate assistant-operating home.
 */
export function apply(ctx: Context, config: Config = {}): void {
  if (config.dataDir !== undefined && config.dataDir.trim() === '') throw new Error('desk projection dataDir must not be blank')
  const dataDir = config.dataDir === undefined
    ? join(resolveDshHome(), 'assistant-operating')
    : resolve(expandHomePath(config.dataDir))
  assertDataDirOutsidePackage(dataDir)
  ctx.effect(() => ctx.connection.fetch.register(createDeskProjectionRoute(
    dataDir,
    config.maxProjectionBytes ?? 8 * 1024 * 1024,
    { allowFixture: config.allowFixture === true },
  )))
  ctx.effect(() => ctx.connection.fetch.register(createOperatingReceiptsRoute(dataDir)))
}
