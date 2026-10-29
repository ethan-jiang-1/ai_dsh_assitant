/** View store only: selection and return survive remounts; no business projection in state. */
import { defineStore } from '@deepseek-ai/dsh-client-store'
import { describe, expect, it } from 'vitest'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import type { OperatingReceipt } from '../../src/client/projection/operating-projection'

describe('projection viewing state', () => {
  it('selects an arbitrary matter, returns without losing selection and retains list position', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.rememberListPosition(230)
    view.actions.selectMatter('unknown-g')
    expect(view.getSnapshot()).toEqual({ selected: { kind: 'matter', id: 'unknown-g' }, pane: 'detail', listScrollTop: 230, attentionScrollTop: 0, activityScrollTop: 0, filter: 'all', mode: 'board', activityLimit: 50, olderReceipts: [], archiveLoads: {}, captureDraft: '', query: '', captureReceipt: null })
    view.actions.showList()
    expect(view.getSnapshot()).toEqual({ selected: { kind: 'matter', id: 'unknown-g' }, pane: 'list', listScrollTop: 230, attentionScrollTop: 0, activityScrollTop: 0, filter: 'all', mode: 'board', activityLimit: 50, olderReceipts: [], archiveLoads: {}, captureDraft: '', query: '', captureReceipt: null })
  })
  it('keeps attention, matter-list, and activity scroll positions independent', () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.rememberListPosition(120)
    view.actions.rememberModePosition('attention', 340)
    view.actions.rememberModePosition('activity', 560)
    view.actions.setFilter('active')
    view.actions.setQuery('回款')
    view.actions.selectMatter('old-matter')
    view.actions.selectMode('attention')
    expect(view.getSnapshot()).toMatchObject({
      listScrollTop: 120, attentionScrollTop: 340, activityScrollTop: 560,
      filter: 'active', query: '回款', mode: 'attention',
      selected: { kind: 'matter', id: 'old-matter' }, pane: 'list',
    })
    view.actions.selectMatter('m-1')
    expect(view.getSnapshot()).toMatchObject({ mode: 'attention', selected: { kind: 'matter', id: 'm-1' }, pane: 'detail' })
  })

  it('pages archive receipts with one active request per feed and a monotonic retry cursor', () => {
    const view = createProjectionViewStore(defineStore).create()
    const receipt = (operationId: string, submittedAt: string): OperatingReceipt => ({
      operationId, matterId: 'm-1', sessionId: 's-1', submittedAt, status: 'committed', kind: 'update',
    })
    const first = receipt('op-new', '2026-10-20T00:00:00.000Z')
    const older = receipt('op-old', '2026-10-19T00:00:00.000Z')
    view.actions.beginArchiveLoad('activity', undefined)
    view.actions.beginArchiveLoad('activity', undefined)
    expect(view.getSnapshot().archiveLoads.activity?.status).toBe('loading')
    view.actions.completeArchiveLoad('activity', [first], '2026-10-20T00:00:00.000Z')
    expect(view.getSnapshot().archiveLoads.activity).toEqual({ status: 'ready', before: '2026-10-20T00:00:00.000Z' })
    view.actions.beginArchiveLoad('activity', view.getSnapshot().archiveLoads.activity?.before)
    view.actions.completeArchiveLoad('activity', [older, older, first], '2026-10-19T00:00:00.000Z')
    expect(view.getSnapshot().olderReceipts).toEqual([first, older])
    expect(view.getSnapshot().archiveLoads.activity).toEqual({ status: 'ready', before: '2026-10-19T00:00:00.000Z' })
    view.actions.beginArchiveLoad('activity', view.getSnapshot().archiveLoads.activity?.before)
    view.actions.failArchiveLoad('activity')
    expect(view.getSnapshot().archiveLoads.activity).toEqual({ status: 'error', before: '2026-10-19T00:00:00.000Z' })
    view.actions.beginArchiveLoad('activity', view.getSnapshot().archiveLoads.activity?.before)
    view.actions.completeArchiveLoad('activity', [], null)
    expect(view.getSnapshot().archiveLoads.activity).toEqual({ status: 'exhausted' })
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
