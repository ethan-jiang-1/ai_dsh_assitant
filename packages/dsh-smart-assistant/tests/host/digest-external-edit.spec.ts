/**
 * The working folder is user-editable; the digest cache must notice a file changed outside the
 * tools. The fingerprint makes the next prompt schedule a refresh; the assertion waits for the
 * fresh render rather than pinning the one-request-old fallback.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'
import { renderFrontmatterDocument } from '../../src/domain/home/frontmatter.ts'

const boot = memoryPool('assistant-digest-external-')

describe('digest cache and hand edits', () => {
  it('refreshes after a room file is written outside the tools', async () => {
    const { service } = boot()
    await service.ensureHome()
    await service.digest()

    const id = '20261027-external-fact-aaaa'
    writeFileSync(join(service.paths.memoryDir, `${id}.md`), renderFrontmatterDocument({
      id,
      kind: 'fact',
      status: 'active',
      created: '2026-10-27T00:00:00.000Z',
      updated: '2026-10-27T00:00:00.000Z',
      tags: ['external'],
      importance: 5,
    }, 'External edit fact that must reach the desktop.'), 'utf8')

    // The first snapshot may still be the pre-edit cache; it must schedule the refresh.
    expect(service.digestSnapshot()).not.toContain('External edit fact')
    await vi.waitFor(() => {
      expect(service.digestSnapshot()).toContain('External edit fact')
    })
  })
})
