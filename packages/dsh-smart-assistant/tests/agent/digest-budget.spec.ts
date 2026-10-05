/**
 * Layer: agent (prompt-section contract). The gate is enforced on the host service's
 * write path (src/host/index.ts); service-plane contracts live in tests/host/.
 * Budget enforcement (tri-line proposal 2026-09-24, slice 1h; keying fixed 2026-10-02): a pure
 * memory addition is refused when memory lines are being squeezed off the desktop
 * (`omittedMemories > 0`) — the budget stops being advisory for the section actually under
 * pressure. Superseding and retiring writes stay open.
 *
 * The keying fix's regression: the original `truncated` keying misfired once the fourth room
 * landed — the knowledge signpost tree truncating (a state no memory write can remediate)
 * closed the memory gate, so distilled facts stopped landing (G2 batch evidence 2026-10-02:
 * multiple sessions self-reported "cannot save"). The second test pins the exact misfire shape.
 *
 * The pressure signal itself was a latent bug before slice 1h: `DigestResult.bytes` counts the
 * post-truncation text, so it can never exceed the budget and the old `bytes > max` finding was
 * dead code. `truncated` is the truth, and these tests pin both halves.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../../src/index.ts'

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

  it('refuses pure additions once memory lines are squeezed off, keeps replacing writes open', async () => {
    // A budget small enough that a few records overflow it.
    const service = boot(900)
    const first = await service.saveMemory({ text: 'first claim that fits', importance: 5 })
    let omitted = 0
    for (let index = 0; index < 20 && omitted === 0; index += 1) {
      await service.saveMemory({ text: `filler claim number ${index} with some wording to spend bytes` })
      omitted = (await service.digest()).omittedMemories
    }
    expect(omitted).toBeGreaterThan(0)

    // A pure addition is refused with the reason and the way out.
    await expect(service.saveMemory({ text: 'one claim too many' }))
      .rejects.toThrow('active memory record(s) off the desktop')

    // Superseding replaces — allowed even under pressure.
    const replacement = await service.saveMemory({
      text: 'first claim, rephrased tighter',
      supersedes: first.id,
    })
    expect(replacement.supersedes).toBe(first.id)

    // While the pressure is present, the curate brief names it — with the memory-directed cure.
    const brief = await service.curate()
    const finding = brief.findings.find(entry => entry.code === 'digest-over-budget')
    expect(finding).toBeDefined()
    expect(finding?.message).toContain('invisible in every session')

    // Retiring reduces — allowed; keep retiring until the pressure actually clears (the map
    // blurb itself spends budget, so one forget is not guaranteed to be enough).
    const active = (await service.listMemories()).entries
    for (const record of active) {
      await service.forgetMemory(record.id)
      if ((await service.digest()).omittedMemories === 0) break
    }
    const after = await service.curate()
    expect(after.findings.map(entry => entry.code)).not.toContain('digest-over-budget')
  })

  it('knowledge-signpost truncation does NOT close the memory gate (the 2026-10-02 misfire shape)', async () => {
    // A home where every memory rides the desktop but the knowledge tree is cut short: the
    // digest is truncated (knowledge lines omitted) while omittedMemories === 0.
    const service = boot(1100)
    await service.saveMemory({ text: 'a claim that rides the desktop', importance: 5 })
    // Stable pages via the sanctioned review path: writePage stages a draft, a hand edit of the
    // status field is the human review (docs/home.md governance write path).
    for (let index = 0; index < 20; index += 1) {
      const { path } = await service.writePage({
        type: 'concept',
        title: `signpost page ${String(index)}`,
        body: `Body of page ${String(index)}.`,
        sources: ['research:some-thread'],
      })
      writeFileSync(path, readFileSync(path, 'utf8').replace('status: draft', 'status: stable'))
    }
    const digest = await service.digest()
    expect(digest.truncated).toBe(true)
    expect(digest.omittedMemories).toBe(0)
    expect(digest.memoryIds.length).toBe(1)

    // The misfire: this exact state used to refuse pure additions. It must not.
    const saved = await service.saveMemory({ text: 'a distilled fact that must still land' })
    expect(saved.status).toBe('active')

    // The curate finding reports the truncation without directing the model at memory
    // retirement — the cure for signpost truncation is not forgetting memories.
    const brief = await service.curate()
    const finding = brief.findings.find(entry => entry.code === 'digest-over-budget')
    expect(finding).toBeDefined()
    expect(finding?.message).toContain('memory writes remain open')
    expect(finding?.message).not.toContain('retire the weakest')
  })

  it('saves freely while the digest fits', async () => {
    const service = boot(6144)
    await service.saveMemory({ text: 'a normal claim' })
    expect((await service.digest()).truncated).toBe(false)
    await service.saveMemory({ text: 'another normal claim' })
    expect((await service.curate()).findings.map(entry => entry.code))
      .not.toContain('digest-over-budget')
  })
})
