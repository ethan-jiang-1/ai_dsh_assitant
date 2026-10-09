/** View store only: selection and return survive remounts; no business projection in state. */
import { defineStore } from '../../../../vendor/dsh/packages/client/store/lib/types/index.js'
import { describe, expect, it } from 'vitest'
import { createProjectionViewStore } from '../../src/client/projection-view'

describe('projection viewing state', () => {
  it('selects an arbitrary matter, returns without losing selection and retains list position', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.rememberListPosition(230)
    view.actions.selectMatter('unknown-g')
    expect(view.getSnapshot()).toEqual({ selectedId: 'unknown-g', pane: 'detail', listScrollTop: 230 })
    view.actions.showList()
    expect(view.getSnapshot()).toEqual({ selectedId: 'unknown-g', pane: 'list', listScrollTop: 230 })
  })
})
