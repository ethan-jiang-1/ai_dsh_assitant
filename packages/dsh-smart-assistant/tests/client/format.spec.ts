/**
 * Local-time rendering contracts. The desk shows zone-bearing timestamps in the viewer's wall
 * time; these fixtures pin the exact shape and the wall-clock intent of zone-less values. The
 * vitest config pins TZ=Asia/Shanghai so the assertions mean the same thing on a UTC host.
 */
import { describe, expect, it } from 'vitest'
import { humanTime, localDateKey, localDateLabel, localTimeLabel, shortTime } from '../../src/client/chrome/format'

describe('local-time formatting', () => {
  const instant = '2026-10-28T16:30:00.000Z' // 2026-10-29 00:30 Asia/Shanghai

  it('renders a zone-bearing instant in the pinned local zone', () => {
    expect(localDateKey(instant)).toBe('2026-10-29')
    expect(localDateLabel(instant)).toBe('10月29日 周四')
    expect(localTimeLabel(instant)).toBe('00:30')
    expect(humanTime(instant)).toBe('2026-10-29 00:30')
    expect(shortTime(instant)).toBe('10-29 00:30')
  })

  it('keeps zone-less wall-clock intent and passes unparseable values through', () => {
    expect(humanTime('2026-10-29T09:05')).toBe('2026-10-29 09:05')
    expect(humanTime('not-a-time')).toBe('not-a-time')
    expect(localDateKey('not-a-date')).toBe('not-a-date')
    expect(localTimeLabel('')).toBe('')
    expect(shortTime(undefined)).toBe('')
  })
})
