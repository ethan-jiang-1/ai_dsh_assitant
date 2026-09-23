/**
 * The skill-usage ledger is the governance loop's data plane (tri-line proposal 2026-09-24,
 * slice 1a): retirement decisions and the deferred auto-distill criterion both read these counts.
 * These tests pin the ledger's roundtrip, its tolerance of bad files, the load-extraction filter
 * the tools/result subscription feeds, and the service's record/read behavior.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import AssistantMemory from '../src/index.ts'
import {
  parseSkillUsage,
  recordSkillLoad,
  renderSkillUsage,
  skillLoadFromResult,
  skillUsageLines,
  writeSkillUsage,
} from '../src/skills/usage.ts'

const NOW = new Date('2026-09-24T12:00:00.000Z')

describe('skill usage ledger (pure core)', () => {
  it('roundtrips render → parse with sorted names and stable text', () => {
    const usage = recordSkillLoad(
      recordSkillLoad({}, 'zeta-skill', NOW),
      'alpha-skill',
      new Date('2026-09-23T00:00:00.000Z'),
    )
    const text = renderSkillUsage(usage)

    expect(text.indexOf('"alpha-skill"')).toBeLessThan(text.indexOf('"zeta-skill"'))
    expect(parseSkillUsage(text)).toEqual(usage)
    expect(renderSkillUsage(parseSkillUsage(text) ?? {})).toBe(text)
  })

  it('rejects a corrupt, wrong-version, or wrong-shaped ledger', () => {
    expect(parseSkillUsage('{not json')).toBeUndefined()
    expect(parseSkillUsage(JSON.stringify({ version: 99, usage: {} }))).toBeUndefined()
    expect(parseSkillUsage(JSON.stringify({ version: 1, usage: [] }))).toBeUndefined()
    // Garbage entries are dropped; healthy siblings survive.
    const mixed = parseSkillUsage(JSON.stringify({
      version: 1,
      usage: {
        'good-skill': { count: 2, lastUsedAt: '2026-09-23T00:00:00.000Z' },
        'bad-count': { count: -1, lastUsedAt: '2026-09-23T00:00:00.000Z' },
        'bad-stamp': { count: 1, lastUsedAt: '' },
      },
    }))
    expect(mixed).toEqual({ 'good-skill': { count: 2, lastUsedAt: '2026-09-23T00:00:00.000Z' } })
  })

  it('increments counts and re-stamps lastUsedAt', () => {
    const first = recordSkillLoad({}, 'staging-reset', new Date('2026-09-20T00:00:00.000Z'))
    const second = recordSkillLoad(first, 'staging-reset', NOW)

    expect(second['staging-reset']).toEqual({ count: 2, lastUsedAt: NOW.toISOString() })
  })

  it('extracts skill names only from successful skill-tool loads with valid names', () => {
    expect(skillLoadFromResult('skill', { name: 'staging-reset' }, false)).toBe('staging-reset')
    expect(skillLoadFromResult('skill', { name: 'staging-reset' }, true)).toBeUndefined()
    expect(skillLoadFromResult('assistant_memory', { name: 'staging-reset' }, false)).toBeUndefined()
    expect(skillLoadFromResult('skill', { name: 'Not_A_Name' }, false)).toBeUndefined()
    expect(skillLoadFromResult('skill', 'not-an-object', false)).toBeUndefined()
    expect(skillLoadFromResult('skill', {}, false)).toBeUndefined()
  })

  it('orders joined lines by the requested direction and caps them', () => {
    const usage = {
      'a-skill': { count: 1, lastUsedAt: '2026-09-23T00:00:00.000Z' },
      'b-skill': { count: 5, lastUsedAt: '2026-09-24T00:00:00.000Z' },
    }
    const names = ['a-skill', 'b-skill', 'c-skill']

    expect(skillUsageLines(usage, names, NOW, 'least-used').map(line => [line.name, line.count]))
      .toEqual([['c-skill', 0], ['a-skill', 1], ['b-skill', 5]])
    expect(skillUsageLines(usage, names, NOW, 'most-used', 2).map(line => line.name))
      .toEqual(['b-skill', 'a-skill'])
    expect(skillUsageLines(usage, names, NOW, 'least-used')[0]?.daysSinceLastUse).toBeUndefined()
    expect(skillUsageLines(usage, names, NOW, 'most-used')[1]?.daysSinceLastUse).toBe(1)
  })
})

describe('skill usage ledger (service)', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  function bootDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'assistant-usage-'))
    dirs.push(dir)
    return dir
  }

  it('records loads durably across service instances and surfaces them in curate', async () => {
    const dir = bootDir()
    const first = new AssistantMemory(new Context(), { dataDir: dir })
    await first.writeSkill({ name: 'staging-reset', description: 'when resetting', body: 'steps' })
    await first.recordSkillLoad('staging-reset')
    await first.recordSkillLoad('staging-reset')

    // A fresh service over the same home sees the same counts: the ledger is a file, not memory.
    const second = new AssistantMemory(new Context(), { dataDir: dir })
    const read = await second.skillUsage()
    expect(read.usage['staging-reset']?.count).toBe(2)

    const brief = await second.curate()
    expect(brief.skillUsage).toEqual([
      { name: 'staging-reset', count: 2, lastUsedAt: read.usage['staging-reset']?.lastUsedAt, daysSinceLastUse: 0 },
    ])
    expect(brief.findings.map(finding => finding.code)).not.toContain('skill-usage-unreadable')
  })

  it('reports an unreadable ledger as a warn finding instead of reading silent zeros', async () => {
    const dir = bootDir()
    const service = new AssistantMemory(new Context(), { dataDir: dir })
    writeFileSync(join(dir, 'skill-usage.json'), '{ this is not json', 'utf8')

    const read = await service.skillUsage()
    expect(read.usage).toEqual({})
    expect(read.failure?.path).toBe(join(dir, 'skill-usage.json'))

    const brief = await service.curate()
    const finding = brief.findings.find(item => item.code === 'skill-usage-unreadable')
    expect(finding?.severity).toBe('warn')

    // Recording over a corrupt ledger resets it — the warn names exactly that risk.
    const entry = await service.recordSkillLoad('fresh-skill')
    expect(entry.count).toBe(1)
    expect(JSON.parse(readFileSync(join(dir, 'skill-usage.json'), 'utf8')).usage['fresh-skill'].count).toBe(1)
  })

  it('writes the ledger atomically and rejects invalid skill names', async () => {
    const dir = bootDir()
    const service = new AssistantMemory(new Context(), { dataDir: dir })
    await service.recordSkillLoad('valid-skill')
    await expect(service.recordSkillLoad('Invalid Name')).rejects.toThrow('not a valid skill name')

    const text = readFileSync(join(dir, 'skill-usage.json'), 'utf8')
    expect(parseSkillUsage(text)).toEqual({ 'valid-skill': { count: 1, lastUsedAt: expect.any(String) } })
    // writeSkillUsage leaves no temporary residue behind.
    await writeSkillUsage(join(dir, 'skill-usage.json'), {})
    expect(JSON.parse(readFileSync(join(dir, 'skill-usage.json'), 'utf8')).usage).toEqual({})
  })
})
