/**
 * Fixtures for the handoff scan core: clean agent shapes pass; user data, credentials, host
 * paths and live-secret shapes fail. No filesystem or tarball here — the script owns extraction.
 */
import { describe, expect, it, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handoffPathProblems, handoffProblems, handoffTextProblems } from '../../../../scripts/release/handoff-core.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

const cleanEntries = [
  'package.json',
  'cordis.patch.yml',
  'lib/index.js',
  'bin/expert-setup.mjs',
  'presets/assistant/skills/memory-hygiene/SKILL.md',
  'seeds/management/management-lens-ceo.md',
  'README.md',
]

describe('handoff scan core', () => {
  it('passes a clean agent artifact and symbolic home references', () => {
    const files = cleanEntries.map(path => ({ path, text: 'See ~/.dsh/assistant for the working folder.\n' }))
    expect(handoffProblems({ entries: cleanEntries, files })).toEqual([])
  })

  it('rejects user data, credentials and harness-home directories', () => {
    for (const path of [
      '.env',
      '.env.local',
      '.credentials.yaml',
      'auth.json',
      'id_rsa',
      'server.pem',
      'assistant/memory/m1.md',
      'assistant-operating/ledger.json',
      'data/assistant/SOUL.md',
      'sessions/s1/session.v4.jsonl.zstd',
      'deliverables/plan.md',
      'profiles/web/package.json',
      'storages/settings.json',
      'dev/harness-home/assistant/SOUL.md',
      'dev/trial-home-30d/assistant/SOUL.md',
      '.tmp/probe/x',
      '_dist/dsh-smart-assistant-0.1.0.tgz',
      'node_modules/yaml/index.js',
    ]) {
      expect(handoffPathProblems(path), path).not.toEqual([])
    }
  })

  it('rejects machine-local paths and obvious live secrets without echoing them', () => {
    const host = handoffTextProblems({ path: 'notes.md', text: 'root lives at /Users/alice/secret\n' })
    expect(host).toEqual(['notes.md carries a machine-local absolute path'])
    const secret = handoffTextProblems({ path: 'config.md', text: `token sk-${'a'.repeat(20)}\n` })
    expect(secret).toEqual(['config.md carries what looks like a live secret'])
    expect(handoffTextProblems({ path: 'config.md', text: 'sk-test-not-a-key\n' })).toEqual([])
  })

  it('the scanner rejects a symlink (the core owns paths/text; the script owns the filesystem shape)', () => {
    const dir = temp('handoff-symlink-')
    writeFileSync(join(dir, 'clean.txt'), 'ok\n', 'utf8')
    symlinkSync(join(dir, 'clean.txt'), join(dir, 'link.txt'))
    const scanner = fileURLToPath(new URL('../../../../scripts/release/handoff-scan.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [scanner, dir], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('symlink')
  })
})
