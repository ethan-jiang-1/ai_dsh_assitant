/**
 * Shared harness for the host-side service specs.
 *
 * Every service spec needs the same three things: a throwaway home directory, a
 * service instance over it, and cleanup after the test. The pool functions below
 * register that cleanup themselves, so a spec keeps only what makes it different:
 * the config it passes, the extra services it opens over one home (durability), or
 * the context it drives itself. Pools own the cleanup order internally (a ledger's
 * `stop()` runs before its directory is removed), so specs never re-implement it.
 *
 * Specs whose setup is *not* the common shape keep their local scaffolding on
 * purpose: contexts that must be disposed (registry-lifecycle, preset-composition),
 * async fixture styles (desk-projection-download), and module-scope singletons
 * (preset-skill-root) order their teardown differently and do not fit a pool.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach } from 'vitest'
import AssistantMemory, { type Config } from '../../src/index.ts'
import { AssistantOperatingLedger } from '../../src/host/operating-ledger/index.ts'

/** A pooled throwaway directory: every call makes a fresh one, all removed after the suite. */
export function dirPool(prefix: string): () => string {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })
  return () => {
    const dir = mkdtempSync(join(tmpdir(), prefix))
    dirs.push(dir)
    return dir
  }
}

/**
 * A pooled memory service: every call is a fresh home plus one service instance
 * over it (own context, exactly the shape the service specs boot today). The
 * pooled `dataDir` always wins over anything in `config`.
 */
export function memoryPool(prefix: string): (config?: Partial<Config>) => { service: AssistantMemory, dataDir: string } {
  const mkDir = dirPool(prefix)
  return (config?: Partial<Config>) => {
    const dataDir = mkDir()
    const service = new AssistantMemory(new Context(), { ...config, dataDir })
    return { service, dataDir }
  }
}

/**
 * A pooled operating ledger: the single-writer service over a fresh (or reused)
 * home, with `stop()` tracked so teardown stops the writer before removing the
 * directory. Reusing a home across calls is the multi-writer/restart shape the
 * ledger contract pins.
 */
export function ledgerPool(prefix: string): (dataDir?: string) => {
  service: AssistantOperatingLedger
  dataDir: string
  ctx: Context
} {
  const dirs: string[] = []
  const services: AssistantOperatingLedger[] = []
  afterEach(async () => {
    for (const service of services.splice(0)) await service.stop()
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })
  return (dataDir?: string) => {
    const home = dataDir ?? mkdtempSync(join(tmpdir(), prefix))
    if (!dirs.includes(home)) dirs.push(home)
    const ctx = new Context()
    const service = new AssistantOperatingLedger(ctx, { dataDir: home })
    services.push(service)
    return { service, dataDir: home, ctx }
  }
}
