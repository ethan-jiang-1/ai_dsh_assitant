/**
 * B4 fixture: the cleanup plan and receipt, proven on a mixed tree before the principal runs it
 * on real data. Protected files never enter the removable set; dry-run never writes.
 */
import { describe, expect, it, vi } from 'vitest'
import { planCleanup, runCleanup } from '../../../../dev/deploy/viki-cleanup.mjs'

const entries = [
  { uri: 'viking://user/default/peers/keep/memories/events/2026/10/19/a.md' },
  { uri: 'viking://user/default/peers/other/memories/events/2026/10/19/b.md' },
  { uri: 'viking://user/default/memories/identity.md' },
  { uri: 'viking://user/default/memories/soul.md' },
  { uri: 'viking://user/default/peers/other/memories/events/2026/10/19/.overview.md' },
]

describe('Viki cleanup (B4)', () => {
  it('keeps the allowlisted peer, removes other peers, always protects identity/soul/.overview', () => {
    const plan = planCleanup(entries, { keepPeers: ['keep'] })
    expect(plan.keep).toEqual([entries[0].uri])
    expect(plan.remove).toEqual([entries[1].uri])
    expect(plan.protectedFiles).toEqual([entries[2].uri, entries[3].uri, entries[4].uri])
    const empty = planCleanup(entries, { keepPeers: [] })
    expect(empty.keep).toEqual([])
    expect(empty.remove).toEqual([entries[0].uri, entries[1].uri])
  })

  it('dry-run touches nothing; apply snapshots the tree first and records the receipt', async () => {
    const plan = planCleanup(entries, { keepPeers: ['keep'] })
    const client = { commit: vi.fn(async () => 'commit-1'), remove: vi.fn(async () => undefined) }
    const dry = await runCleanup(client, plan, { space: 'default' })
    expect(dry.dryRun).toBe(true)
    expect(dry.removed).toEqual([])
    expect(client.commit).not.toHaveBeenCalled()
    expect(client.remove).not.toHaveBeenCalled()
    const applied = await runCleanup(client, plan, { space: 'default', apply: true })
    expect(applied.dryRun).toBe(false)
    expect(applied.commitId).toBe('commit-1')
    expect(client.commit).toHaveBeenCalledWith(['viking://user/default/memories'])
    expect(applied.removed).toEqual([entries[1].uri])
    expect(client.remove).toHaveBeenCalledTimes(1)
    expect(applied.protected).toHaveLength(3)
  })
})
