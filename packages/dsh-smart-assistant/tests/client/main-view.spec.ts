/**
 * Remembered main view (`chrome/main-view.ts`).
 *
 * Acceptance points:
 * - Restore selects the desk only when the saved view is the desk (or nothing is saved) and the
 *   panel is unselected; a saved conversation leaves the shell's own restore in charge.
 * - The restore runs once per Client root (layout/plugin remounts do not reopen the desk).
 * - Tracking records desk/chat whenever the product panel or the conversation becomes visible,
 *   and ignores another plugin's panel.
 * - A storage that throws (private mode) degrades to the desk and never breaks the client.
 */
import { describe, expect, it } from 'vitest'
import {
  MAIN_VIEW_KEY,
  readMainView,
  restoreMainView,
  trackMainView,
  writeMainView,
  type MainViewStorage,
} from '../../src/client/chrome/main-view.ts'

const DASHBOARD = 'dsh-smart-assistant-dashboard'

function memoryStorage(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(MAIN_VIEW_KEY, initial)
  return {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => { data.set(key, value) },
    get saved(): string | null { return data.get(MAIN_VIEW_KEY) ?? null },
  } satisfies MainViewStorage & { readonly saved: string | null }
}

function layoutContext(initialPanel: string | null) {
  const selected: (string | null)[] = []
  const listeners = new Set<() => void>()
  let activePanelId = initialPanel
  const notify = (): void => { for (const listener of [...listeners]) listener() }
  const ctx = {
    root: {},
    effect: (install: () => () => void) => { install() },
    layout: {
      panelInfo: {
        getSnapshot: () => ({ activePanelId }),
        subscribe: (listener: () => void) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
      },
      selectPanel: (panelId: string | null) => {
        selected.push(panelId)
        activePanelId = panelId
        notify()
      },
    },
  }
  return {
    ctx,
    selected,
    setActive: (panelId: string | null) => { activePanelId = panelId; notify() },
  }
}

describe('main view preference', () => {
  it('defaults to the desk when nothing is saved', () => {
    expect(readMainView(memoryStorage())).toBe('desk')
    expect(readMainView(memoryStorage('desk'))).toBe('desk')
    expect(readMainView(memoryStorage('chat'))).toBe('chat')
  })

  it('degrades to the desk when storage throws, and never throws on write', () => {
    const broken: MainViewStorage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    }
    expect(readMainView(broken)).toBe('desk')
    expect(() => { writeMainView('chat', broken) }).not.toThrow()
  })

  it('restores the desk for a first visit or a saved desk', () => {
    for (const storage of [memoryStorage(), memoryStorage('desk')]) {
      const { ctx, selected } = layoutContext(null)
      restoreMainView(ctx, DASHBOARD, storage)
      expect(selected).toEqual([DASHBOARD])
    }
  })

  it('leaves the conversation alone when the saved view is the conversation', () => {
    const storage = memoryStorage('chat')
    const { ctx, selected } = layoutContext(null)
    restoreMainView(ctx, DASHBOARD, storage)
    expect(selected).toEqual([])
  })

  it('preserves a panel already selected before attach', () => {
    const { ctx, selected } = layoutContext('settings')
    restoreMainView(ctx, DASHBOARD, memoryStorage('desk'))
    expect(selected).toEqual([])
  })

  it('restores at most once for one Client root', () => {
    const storage = memoryStorage('desk')
    const { ctx, selected, setActive } = layoutContext(null)
    restoreMainView(ctx, DASHBOARD, storage)
    setActive(null)
    restoreMainView(ctx, DASHBOARD, storage)
    expect(selected).toEqual([DASHBOARD])
  })

  it('does not consume a root before layout state is available', () => {
    const root = {}
    restoreMainView({ root }, DASHBOARD, memoryStorage('desk'))
    const { ctx, selected } = layoutContext(null)
    restoreMainView({ ...ctx, root }, DASHBOARD, memoryStorage('desk'))
    expect(selected).toEqual([DASHBOARD])
  })

  it('tracks the decision independently for each Client root', () => {
    const first = layoutContext(null)
    const second = layoutContext(null)
    restoreMainView(first.ctx, DASHBOARD, memoryStorage('desk'))
    restoreMainView(second.ctx, DASHBOARD, memoryStorage('desk'))
    expect(first.selected).toEqual([DASHBOARD])
    expect(second.selected).toEqual([DASHBOARD])
  })

  it('records desk and conversation changes and ignores another plugin panel', () => {
    const storage = memoryStorage('desk')
    const { ctx, setActive } = layoutContext(DASHBOARD)
    trackMainView(ctx, DASHBOARD, storage)

    setActive(DASHBOARD)
    expect(storage.saved).toBe('desk')
    setActive('settings')
    expect(storage.saved).toBe('desk')
    setActive(null)
    expect(storage.saved).toBe('chat')
    setActive(DASHBOARD)
    expect(storage.saved).toBe('desk')
  })

  it('skips tracking when the layout face exposes no subscription', () => {
    const storage = memoryStorage('desk')
    const ctx = {
      root: {},
      effect: (install: () => () => void) => { install() },
      layout: {
        panelInfo: { getSnapshot: () => ({ activePanelId: null }) },
        selectPanel: () => {},
      },
    }
    expect(() => { trackMainView(ctx, DASHBOARD, storage) }).not.toThrow()
    expect(storage.saved).toBe('desk')
  })
})
