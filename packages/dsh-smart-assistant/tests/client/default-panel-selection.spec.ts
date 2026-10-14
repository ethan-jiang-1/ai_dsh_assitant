/** Root-scoped default dashboard selection: first attach only, no repeated focus steals. */
import { describe, expect, it } from 'vitest'
import { selectDashboardByDefault } from '../../src/client/default-panel-selection.ts'

function layoutContext(initialPanel: string | null) {
  const selected: (string | null)[] = []
  let activePanelId = initialPanel
  const ctx = {
    root: {},
    layout: {
      panelInfo: {
        getSnapshot: () => ({ activePanelId }),
        subscribe: () => () => {},
      },
      selectPanel: (id: string | null) => {
        selected.push(id)
        activePanelId = id
      },
    },
  }
  return { ctx, selected, setActive: (id: string | null) => { activePanelId = id } }
}

describe('default dashboard selection', () => {
  it('selects only for an unselected panel and consumes the opportunity for that root', () => {
    const { ctx, selected, setActive } = layoutContext(null)

    selectDashboardByDefault(ctx)
    setActive(null) // The person returns to Conversation after the initial default.
    selectDashboardByDefault(ctx)

    expect(selected).toEqual(['dsh-smart-assistant-dashboard'])
  })

  it('preserves a panel already selected before attach and does not retry on later null', () => {
    const { ctx, selected, setActive } = layoutContext('settings')

    selectDashboardByDefault(ctx)
    setActive(null)
    selectDashboardByDefault(ctx)

    expect(selected).toEqual([])
  })

  it('does not consume a root until layout state is available', () => {
    const root = {}
    selectDashboardByDefault({ root })
    const { ctx, selected } = layoutContext(null)
    selectDashboardByDefault({ root, layout: ctx.layout })

    expect(selected).toEqual(['dsh-smart-assistant-dashboard'])
  })

  it('tracks the default opportunity independently for each Client root', () => {
    const first = layoutContext(null)
    const second = layoutContext(null)

    selectDashboardByDefault(first.ctx)
    selectDashboardByDefault(second.ctx)

    expect(first.selected).toEqual(['dsh-smart-assistant-dashboard'])
    expect(second.selected).toEqual(['dsh-smart-assistant-dashboard'])
  })
})
