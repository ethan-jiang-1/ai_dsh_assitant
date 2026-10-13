/**
 * The post-write audit (tri-line proposal 2026-09-24, slice 1d): a well-formed skill can still
 * fail a future session — by pointing at a file that is not there, or by carrying a live
 * credential. These tests pin the detection shapes (conservative on prose), the immediate
 * `save_skill` injection, and the curation merge.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dirPool, memoryPool } from '../support/host-harness.ts'
import { auditSkillCredentials, auditSkillReferences } from '../../src/domain/skills/audit.ts'

describe('auditSkillCredentials (pure)', () => {
  it('names credential shapes', () => {
    const cases: readonly [string, string][] = [
      ['private key', '-----BEGIN RSA PRIVATE KEY-----\nMIIE...'],
      ['aws key', 'use AKIAIOSFODNN7EXAMPLE for tests'],
      ['sk key', 'set the key to sk-proj-abcdefghijklmnopqrstuvwxyz12'],
      ['github token', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'],
      ['assignment', 'api_key: abcdefghijklmnopqrst'],
    ]
    for (const [label, text] of cases) {
      const findings = auditSkillCredentials('x-skill', text)
      expect(findings.map(finding => finding.code), label).toEqual(['skill-credential-leak'])
      expect(findings[0]?.severity).toBe('warn')
    }
  })

  it('does not trip on prose that merely mentions the words', () => {
    const prose = [
      'Keep the token cost of the digest in mind: 821/4096 bytes.',
      'Password: use a strong one, never reuse it across services.',
      'The secret to good skills is one accurate procedure, not three vague ones.',
    ].join('\n')
    expect(auditSkillCredentials('x-skill', prose)).toEqual([])
  })
})

describe('auditSkillReferences (relative pointers)', () => {
  const mkBundleDir = dirPool('assistant-audit-')

  function bundle(body: string, extraFiles: readonly string[] = []): string {
    const dir = mkBundleDir()
    mkdirSync(join(dir, 'x-skill'), { recursive: true })
    writeFileSync(join(dir, 'x-skill', 'SKILL.md'), `---\nname: x-skill\ndescription: x\n---\n\n${body}\n`, 'utf8')
    for (const file of extraFiles) {
      mkdirSync(join(dir, 'x-skill', file.slice(0, file.lastIndexOf('/'))), { recursive: true })
      writeFileSync(join(dir, 'x-skill', file), 'content', 'utf8')
    }
    return join(dir, 'x-skill')
  }

  it('reports a markdown link and a references/ backtick that do not resolve', async () => {
    const body = 'See [the notes](references/notes.md) and `references/steps.md` for details.'
    const baseDir = bundle(body)
    const findings = await auditSkillReferences('x-skill', baseDir, body)
    expect(findings.map(finding => finding.code)).toEqual(['skill-broken-reference', 'skill-broken-reference'])
    expect(findings[0]?.refs).toEqual(['x-skill', 'references/notes.md'])
    expect(findings[0]?.severity).toBe('warn')
  })

  it('passes when the files exist, and ignores URLs, anchors, and absolute paths', async () => {
    const body = [
      'Read [the overview](references/overview.md), [the site](https://example.com/docs),',
      '[the section](#setup), and [/etc/hosts](/etc/hosts). Also `references/overview.md`.',
    ].join('\n')
    const baseDir = bundle(body, ['references/overview.md'])
    expect(await auditSkillReferences('x-skill', baseDir, body)).toEqual([])
  })
})

describe('post-write audit (service)', () => {
  const boot = memoryPool('assistant-audit-svc-')

  it('rides the save_skill result immediately and joins the curate brief', async () => {
    const { service } = boot()
    const written = await service.writeSkill({
      name: 'pointer-skill',
      description: 'points somewhere missing',
      body: 'Follow [the checklist](references/checklist.md) and keep the api_key: abcdefghijklmnopqrst out.',
    })

    // Immediate: the same turn that wrote the skill learns both problems.
    expect(written.findings.map(finding => finding.code).sort()).toEqual([
      'skill-broken-reference',
      'skill-credential-leak',
    ])

    // Durable: the curation brief carries the same findings, warns first.
    const brief = await service.curate()
    const codes = brief.findings.map(finding => finding.code)
    expect(codes).toContain('skill-broken-reference')
    expect(codes).toContain('skill-credential-leak')
    expect(brief.findings[0]?.severity).toBe('warn')
  })

  it('stays silent for a clean skill', async () => {
    const { service } = boot()
    const clean = await service.writeSkill({
      name: 'clean-skill',
      description: 'no pointers, no secrets',
      body: 'Run the checks in order and write down what was observed.',
    })
    expect(clean.findings).toEqual([])
    expect((await service.curate()).findings.filter(finding => finding.code.startsWith('skill-'))).toEqual([])
  })
})
