/**
 * Budget enforcement (tri-line proposal 2026-09-24, slice 1h; R1 §6-1 borrowing, adapted): when
 * the digest is already cut short by its byte budget, a pure addition is refused at the write
 * primitive — the budget stops being advisory. Superseding and retiring writes stay open.
 *
 * The pressure signal itself was a latent bug before this slice: `DigestResult.bytes` counts the
 * post-truncation text, so it can never exceed the budget and the old `bytes > max` finding was
 * dead code. `truncated` is the truth, and these tests pin both halves.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../src/index.ts'

describe('digest budget enforcement (service)', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function boot(digestMaxBytes: number): AssistantMemory {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-budget-'))
    dirs.push(dir)
    return new AssistantMemory(new Context(), { dataDir: dir, digestMaxBytes })
  }

  it('refuses pure additions once the digest is cut short, keeps replacing writes open', async () => {
    // A budget small enough that a few records overflow it.
    const service = boot(900)
    const first = await service.saveMemory({ text: 'first claim that fits', importance: 5 })
    let truncated = false
    for (let index = 0; index < 20 && !truncated; index += 1) {
      await service.saveMemory({ text: `filler claim number ${index} with some wording to spend bytes` })
      truncated = (await service.digest()).truncated
    }
    expect(truncated).toBe(true)

    // A pure addition is refused with the reason and the way out.
    await expect(service.saveMemory({ text: 'one claim too many' }))
      .rejects.toThrow('cut short by its 900-byte budget')

    // Superseding replaces — allowed even under pressure.
    const replacement = await service.saveMemory({
      text: 'first claim, rephrased tighter',
      supersedes: first.id,
    })
    expect(replacement.supersedes).toBe(first.id)

    // While the pressure is present, the curate brief names it.
    const brief = await service.curate()
    expect(brief.findings.map(finding => finding.code)).toContain('digest-over-budget')

    // Retiring reduces — allowed, and once enough pressure is gone the finding clears.
    await expect(service.forgetMemory(replacement.id)).resolves.toBe(true)
    const after = await service.curate()
    expect(after.findings.map(finding => finding.code)).not.toContain('digest-over-budget')
  })

  it('saves freely while the digest fits', async () => {
    const service = boot(4096)
    await service.saveMemory({ text: 'a normal claim' })
    expect((await service.digest()).truncated).toBe(false)
    await service.saveMemory({ text: 'another normal claim' })
    expect((await service.curate()).findings.map(finding => finding.code))
      .not.toContain('digest-over-budget')
  })
})
