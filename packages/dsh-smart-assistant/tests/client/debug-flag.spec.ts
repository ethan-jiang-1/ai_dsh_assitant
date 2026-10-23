/**
 * The developer-surface flag (`src/client/chrome/debug-flag.ts`). It gates the debug tab's
 * registration; the two exits are the URL fragment (survives the launch-token redirect) and the
 * localStorage key (a dev home keeps it across reloads). Off is the customer default.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { debugEnabled } from '../../src/client/chrome/debug-flag'

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

function setEnv(options: { search?: string, hash?: string, storage?: string }): void {
  Object.defineProperty(globalThis, 'location', {
    value: { search: options.search ?? '', hash: options.hash ?? '' },
    configurable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key: string): string | null => key === 'dsh-assistant-debug' ? options.storage ?? null : null },
    configurable: true,
  })
}

afterEach(() => {
  if (originalLocation === undefined) delete (globalThis as { location?: unknown }).location
  else Object.defineProperty(globalThis, 'location', originalLocation)
  if (originalStorage === undefined) delete (globalThis as { localStorage?: unknown }).localStorage
  else Object.defineProperty(globalThis, 'localStorage', originalStorage)
})

describe('debugEnabled', () => {
  it('is off by default (no query, no fragment, no storage key)', () => {
    setEnv({})
    expect(debugEnabled()).toBe(false)
  })

  it('turns on from the query string (?debug=1)', () => {
    setEnv({ search: '?debug=1' })
    expect(debugEnabled()).toBe(true)
  })

  it('turns on from the fragment (#debug=1), which survives the token redirect', () => {
    setEnv({ hash: '#debug=1' })
    expect(debugEnabled()).toBe(true)
  })

  it('turns on from the localStorage key', () => {
    setEnv({ storage: '1' })
    expect(debugEnabled()).toBe(true)
  })
})
