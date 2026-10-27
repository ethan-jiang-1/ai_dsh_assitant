import { describe, expect, it } from 'vitest'
import { memoryPool } from '../support/host-harness.ts'

describe('memory credential scan', () => {
  const boot = memoryPool('assistant-credential-scan-')

  it('warns when a recorded memory looks like a live credential', async () => {
    const { service } = boot()
    await service.saveMemory({
      text: 'Use sk-abcdefghijklmnopqrstuvwx for the vendor API.',
      kind: 'fact',
      source: 'probe',
    })
    const brief = await service.curate()
    expect(brief.findings.find(finding => finding.code === 'credential-shaped-text')?.severity).toBe('warn')
  })
})
