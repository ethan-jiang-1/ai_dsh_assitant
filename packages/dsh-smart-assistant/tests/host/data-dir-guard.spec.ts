/**
 * The package-directory guard (R1): a configured data root inside the installed package must fail
 * activation loudly instead of silently losing the agent's home when an install/upgrade replaces
 * that directory. Covers the pure helper, the memory service and the ledger service.
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { AssistantMemory } from '../../src/host/index.ts'
import { AssistantOperatingLedger } from '../../src/host/operating-ledger/index.ts'
import { PACKAGE_ROOT, assertDataDirOutsidePackage } from '../../src/host/package-root.ts'
import { memoryPool } from '../support/host-harness.ts'

const inside = join(PACKAGE_ROOT, 'assistant-data-guard-should-not-exist')
const sibling = `${PACKAGE_ROOT}-evil`

describe('assertDataDirOutsidePackage', () => {
  it('rejects the package root and anything beneath it', () => {
    expect(() => assertDataDirOutsidePackage(PACKAGE_ROOT)).toThrow(/inside the package directory/u)
    expect(() => assertDataDirOutsidePackage(inside)).toThrow(/inside the package directory/u)
  })

  it('accepts a sibling with the package path as a prefix, and an unrelated directory', () => {
    expect(() => assertDataDirOutsidePackage(sibling)).not.toThrow()
    expect(() => assertDataDirOutsidePackage('/tmp/assistant-home')).not.toThrow()
  })
})

describe('data roots', () => {
  it('refuses a package-internal memory dataDir without creating it', () => {
    rmSync(inside, { recursive: true, force: true })
    expect(() => new AssistantMemory(new Context(), { dataDir: inside })).toThrow(/inside the package directory/u)
    expect(existsSync(inside)).toBe(false)
  })

  it('refuses a package-internal ledger dataDir without creating it', () => {
    rmSync(inside, { recursive: true, force: true })
    expect(() => new AssistantOperatingLedger(new Context(), { dataDir: inside })).toThrow(/inside the package directory/u)
    expect(existsSync(inside)).toBe(false)
  })

  it('still accepts an ordinary user-owned dataDir', async () => {
    const { service } = memoryPool('assistant-data-dir-guard-')()
    await service.ensureHome()
    expect(service.paths.root.startsWith(PACKAGE_ROOT)).toBe(false)
    expect(existsSync(service.paths.root)).toBe(true)
  })
})
