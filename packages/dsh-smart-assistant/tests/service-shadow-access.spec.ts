import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../src/index.ts'

/**
 * Cordis resolves `ctx.assistantMemory` through caller-bound shadow receivers: a method called
 * via the property proxy executes with a forwarding overlay as `this`, not the instance
 * (vendor/dsh/vendor/cordis/src/utils.ts `createShadowMethod`). JS `#private` members brand-check
 * `this` and throw on such a receiver, so the service class must stick to TypeScript-private
 * members. This suite exercises the exact production path — the digest prompt section and the
 * three tools all call `ctx.assistantMemory.<method>()` — and is the regression test for the
 * "Cannot read private member #digestCache from an object whose class did not declare it" turn
 * failure (first live turn inside the assistant preset, 2026-09-23).
 */
describe('service access through the cordis property proxy', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function boot(): Context {
    const ctx = new Context()
    const dir = mkdtempSync(join(tmpdir(), 'assistant-shadow-'))
    dirs.push(dir)
    new AssistantMemory(ctx, { dataDir: dir })
    return ctx
  }

  it('answers digestSnapshot through the proxy — the prompt-section call', () => {
    const ctx = boot()
    // Exact production shape: the digest section is `() => ctx.assistantMemory.digestSnapshot()`.
    const text: string = ctx.assistantMemory.digestSnapshot()
    expect(text).toContain('Your home is a directory that outlives this session')
  })

  it('serves the tool verbs through the proxy and the digest reflects writes', async () => {
    const ctx = boot()
    const saved = await ctx.assistantMemory.saveMemory({ text: 'the proxy path works', kind: 'fact' })
    expect(saved.id).toContain('the-proxy-path-works')

    await ctx.assistantMemory.digest()
    expect(ctx.assistantMemory.digestSnapshot()).toContain('the proxy path works')

    const brief = await ctx.assistantMemory.curate()
    expect(brief.counts.activeMemories).toBe(1)
  })
})
