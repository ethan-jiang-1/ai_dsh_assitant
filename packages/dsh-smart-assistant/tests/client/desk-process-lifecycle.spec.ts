/** The processing path's session-settle refresh edge, isolated from the entry wiring.
 * The observer under test lives in `src/client/desk/desk-process-lifecycle.ts`; the path it
 * binds is the pure domain module `src/domain/desk/desk-process.ts`. */
import { describe, expect, it, vi } from 'vitest'
import { bindProcessPath } from '../../src/domain/desk/desk-process.ts'
import { createSettleRefreshObserver } from '../../src/client/desk/desk-process-lifecycle.ts'

describe('processing path settle refresh lifecycle', () => {
  it('refreshes once on each running-to-settled edge for the bound path', () => {
    const refresh = vi.fn()
    const observe = createSettleRefreshObserver(refresh)
    const path = bindProcessPath('matter-a', 'session-a', 3, '2026-10-10T12:00:00.000Z')

    observe(path, true)
    observe(path, true)
    expect(refresh).not.toHaveBeenCalled()

    observe(path, false)
    observe(path, false)
    expect(refresh).toHaveBeenCalledTimes(1)

    observe(path, true)
    observe(path, false)
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('treats a new binding as a new lifecycle and resets after the path is cleared', () => {
    const refresh = vi.fn()
    const observe = createSettleRefreshObserver(refresh)
    const first = bindProcessPath('matter-a', 'session-a', 3, '2026-10-10T12:00:00.000Z')
    const rebound = bindProcessPath('matter-a', 'session-a', 4, '2026-10-10T12:05:00.000Z')

    observe(first, false)
    observe(rebound, false)
    expect(refresh).toHaveBeenCalledTimes(2)

    observe(undefined, undefined)
    observe(first, false)
    expect(refresh).toHaveBeenCalledTimes(3)
  })
})
