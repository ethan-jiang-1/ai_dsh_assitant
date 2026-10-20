/** Host-only read-only operating projection download, independent of assistantMemory. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { expandHomePath, resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { join } from 'node:path'
import { createDeskProjectionRoute } from './download.ts'

export const name = 'assistant-desk-projection'
export const inject = ['connection']

/** Deployment-owned independent operating directory; this reader creates no files. */
export interface Config {
  readonly dataDir?: string
  /** Complete emitted file byte limit; default 1 MiB. */
  readonly maxProjectionBytes?: number
}

export const Config: Schema<Config> = z.object({
  dataDir: z.string(),
  maxProjectionBytes: z.natural().min(1).default(1024 * 1024),
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
    : expandHomePath(config.dataDir)
  ctx.effect(() => ctx.connection.fetch.register(createDeskProjectionRoute(dataDir, config.maxProjectionBytes ?? 1024 * 1024)))
}
