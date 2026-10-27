/** View store only: selection and return survive remounts; no business projection in state. */
import { defineStore } from '@deepseek-ai/dsh-client-store'
import { describe, expect, it } from 'vitest'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'

describe('projection viewing state', () => {
  it('selects an arbitrary matter, returns without losing selection and retains list position', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.rememberListPosition(230)
    view.actions.selectMatter('unknown-g')
    expect(view.getSnapshot()).toEqual({ selected: { kind: 'matter', id: 'unknown-g' }, pane: 'detail', listScrollTop: 230, filter: 'all', mode: 'board', activityLimit: 50, olderReceipts: [], captureDraft: '', query: '', captureReceipt: null })
    view.actions.showList()
    expect(view.getSnapshot()).toEqual({ selected: { kind: 'matter', id: 'unknown-g' }, pane: 'list', listScrollTop: 230, filter: 'all', mode: 'board', activityLimit: 50, olderReceipts: [], captureDraft: '', query: '', captureReceipt: null })
  })
  it('holds the capture row\'s draft and delivery receipt as transient state (261018 片 1)', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.setCaptureDraft('记得问一下小王那个报价到底批了没')
    expect(view.getSnapshot().captureDraft).toBe('记得问一下小王那个报价到底批了没')
    const receipt = { requestId: 'desk-capture-1', sessionId: 's-1', text: '记得问一下小王那个报价到底批了没', observedRevision: 3 }
    view.actions.setCaptureReceipt(receipt)
    expect(view.getSnapshot().captureReceipt).toEqual(receipt)
    // A delivery receipt is not a business fact: clearing it leaves no trace in the store.
    view.actions.setCaptureReceipt(null)
    expect(view.getSnapshot().captureReceipt).toBeNull()
  })

  it('a delivery receipt survives a fresh store through sessionStorage, and clearing removes it (BUG-016)', () => {
    const stored = new Map<string, string>()
    const fake = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { stored.set(key, value) },
      removeItem: (key: string) => { stored.delete(key) },
    }
    ;(globalThis as unknown as { sessionStorage?: unknown }).sessionStorage = fake
    try {
      const receipt = { requestId: 'desk-capture-2', sessionId: 's-2', text: '刷新还在', observedRevision: 7, lane: 'action' as const, label: '先试跑「x」' }
      const first = createProjectionViewStore(defineStore).create()
      first.actions.setCaptureReceipt(receipt)
      // A fresh store is what a reload creates: the receipt (and its label) must still be there.
      const reloaded = createProjectionViewStore(defineStore).create()
      expect(reloaded.getSnapshot().captureReceipt).toEqual(receipt)
      reloaded.actions.setCaptureReceipt(null)
      const cleared = createProjectionViewStore(defineStore).create()
      expect(cleared.getSnapshot().captureReceipt).toBeNull()
    } finally {
      delete (globalThis as unknown as { sessionStorage?: unknown }).sessionStorage
    }
  })
})
