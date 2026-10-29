// @vitest-environment happy-dom
/**
 * One real-DOM interaction spec for the desk's capture row. The other client specs render the
 * component tree with an inert React shim; this one mounts through react-dom and gives the
 * `useStore` prop a real `useSyncExternalStore` subscription, so a broken store subscription or a
 * controlled-input wiring regression turns red here.
 *
 * It is deliberately a `.mjs` spec: React DOM's type surface is not part of the shipped app and
 * this layer does not need a TS compile to prove the browser behavior.
 */
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { initUiModeStore } from '../../src/client/chrome/ui-mode'
import { ProjectionPanel } from '../../src/client/projection/projection-panel'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { deskEn } from '../../src/client/chrome/locales'

const { act, createElement, useSyncExternalStore } = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
bindClientRequire(() => React)
initUiModeStore({ getItem: () => null, setItem: () => {} })

const cleanups = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  document.body.innerHTML = ''
})

function value(receipts = []) {
  return {
    status: 'ready',
    data: {
      schemaVersion: 2,
      ledgerId: 'dom-test',
      revision: 1,
      receipts,
      unclaimed: [],
      matters: [{
        id: 'm-1',
        title: '回款 A',
        status: 'active',
        summary: '等凭证',
        responsible: '财务',
        revision: 1,
        times: {},
        proposals: [{ id: 'p-1', kind: 'reschedule', status: 'pending', proposedAt: '2026-10-28T00:00:00.000Z', source: { sessionId: 's-proposal' } }],
        evidence: [],
      }],
    },
  }
}

function propsFor(view, onCapture, loadOlderReceipts, projection = value()) {
  return {
    t: (key, params) => Object.entries(params ?? {}).reduce((label, [name, value]) => label.replaceAll(`{${name}}`, String(value)), deskEn[key]),
    surface: {
      lanes: {
        refreshProjection: vi.fn(),
        onAsk: vi.fn(),
        onCapture,
        onOpenSession: vi.fn(),
        onProcess: vi.fn(),
        onClaim: vi.fn(),
        onDiscard: vi.fn(),
        onWake: vi.fn(),
      },
    },
    useProjection: select => select(projection),
    // The real subscription under test: a store change must re-render the panel.
    useStore: select => select(useSyncExternalStore(view.subscribe, () => view.getSnapshot())),
    useSessionStatus: select => select(new Map()),
    actions: view.actions,
    ...(loadOlderReceipts === undefined ? {} : { loadOlderReceipts }),
  }
}

describe('ProjectionPanel in a real DOM', () => {
  it('keeps the capture input controlled through the real store and submits the current draft', async () => {
    const view = createProjectionViewStore(defineStore).create()
    const onCapture = vi.fn()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    cleanups.push(async () => { await act(async () => root.unmount()) })

    await act(async () => { root.render(createElement(ProjectionPanel, propsFor(view, onCapture))) })

    const input = container.querySelector('input.dsha-capture-input')
    const submit = [...container.querySelectorAll('button')].find(button => button.textContent.trim() === '交给助手')
    expect(input).not.toBeNull()
    expect(submit).not.toBeNull()
    expect(submit.disabled).toBe(true)

    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setValue.call(input, '新事项')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(view.getSnapshot().captureDraft).toBe('新事项')
    const enabled = [...container.querySelectorAll('button')].find(button => button.textContent.trim() === '交给助手')
    expect(enabled.disabled).toBe(false)

    await act(async () => { enabled.click() })
    expect(onCapture).toHaveBeenCalledWith('新事项')
    expect(container.querySelector('input.dsha-capture-input').value).toBe('')
  })

  it('switches ledger views from the main panel tabs in the shared view store', async () => {
    const view = createProjectionViewStore(defineStore).create()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    cleanups.push(async () => { await act(async () => root.unmount()) })

    await act(async () => { root.render(createElement(ProjectionPanel, propsFor(view, vi.fn()))) })
    const tab = label => [...container.querySelectorAll('[role="tab"]')].find(button => button.textContent.includes(label))
    expect(tab('Attention')?.getAttribute('aria-selected')).toBe('false')
    await act(async () => { tab('Attention').click() })
    expect(view.getSnapshot().mode).toBe('attention')
    expect(container.textContent).toContain('Worth a look now')
    await act(async () => { tab('All matters').click() })
    expect(view.getSnapshot().mode).toBe('board')
    await act(async () => { tab('Activity').click() })
    expect(view.getSnapshot().mode).toBe('activity')
  })

  it('restores each list offset after detail scroll and mode changes', async () => {
    const view = createProjectionViewStore(defineStore).create()
    view.actions.rememberModePosition('board', 120)
    view.actions.rememberModePosition('attention', 240)
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    cleanups.push(async () => { await act(async () => root.unmount()) })

    await act(async () => { root.render(createElement(ProjectionPanel, propsFor(view, vi.fn()))) })
    const viewport = () => container.querySelector('.dsha-viewport')
    const tab = label => [...container.querySelectorAll('[role="tab"]')].find(button => button.textContent.includes(label))
    expect(viewport().scrollTop).toBe(120)
    await act(async () => { tab('Attention').click() })
    expect(viewport().scrollTop).toBe(240)

    await act(async () => { container.querySelector('.dsha-attention-card').click() })
    expect(view.getSnapshot()).toMatchObject({ mode: 'attention', pane: 'detail', attentionScrollTop: 240 })
    viewport().scrollTop = 0
    await act(async () => { viewport().dispatchEvent(new Event('scroll')) })
    expect(view.getSnapshot().attentionScrollTop).toBe(240)
    await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent.includes('Back to Attention')).click() })
    expect(viewport().scrollTop).toBe(240)

    await act(async () => { tab('All matters').click() })
    expect(viewport().scrollTop).toBe(120)
    await act(async () => { tab('Activity').click() })
    expect(viewport().scrollTop).toBe(0)
  })

  it('loads archive pages once per feed, advances the cursor, and stops on exhaustion', async () => {
    const local = { operationId: 'local', matterId: 'm-1', sessionId: 's-local', submittedAt: '2026-10-30T00:00:00.000Z', status: 'committed', kind: 'update' }
    const first = { operationId: 'archive-1', matterId: 'm-1', sessionId: 's-1', submittedAt: '2026-10-20T00:00:00.000Z', status: 'committed', kind: 'update' }
    const second = { operationId: 'archive-2', matterId: 'm-1', sessionId: 's-2', submittedAt: '2026-10-10T00:00:00.000Z', status: 'committed', kind: 'update' }
    const pages = [
      { receipts: [first], nextBefore: first.submittedAt },
      { receipts: [second], nextBefore: null },
    ]
    let release
    const loadOlderReceipts = vi.fn(() => new Promise(resolve => { release = resolve }))
    const view = createProjectionViewStore(defineStore).create()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    cleanups.push(async () => { await act(async () => root.unmount()) })

    await act(async () => { root.render(createElement(ProjectionPanel, propsFor(view, vi.fn(), loadOlderReceipts, value([local])))) })
    const tab = label => [...container.querySelectorAll('[role="tab"]')].find(button => button.textContent.includes(label))
    await act(async () => { tab('Activity').click() })
    const more = () => container.querySelector('.dsha-archive-control button')
    await act(async () => { more().click(); more().click() })
    expect(loadOlderReceipts).toHaveBeenCalledTimes(1)
    expect(loadOlderReceipts).toHaveBeenLastCalledWith(local.submittedAt)
    expect(more().disabled).toBe(true)

    await act(async () => { release(pages.shift()) })
    expect((container.textContent.match(/Matter updated/g) ?? []).length).toBe(2)
    await act(async () => { more().click() })
    expect(loadOlderReceipts).toHaveBeenLastCalledWith(first.submittedAt)
    await act(async () => { release(pages.shift()) })
    expect((container.textContent.match(/Matter updated/g) ?? []).length).toBe(3)
    expect(container.querySelector('.dsha-archive-control')).toBeNull()
  })

  it('shows archive failures for retry and treats an empty page as exhausted', async () => {
    const local = { operationId: 'local-retry', matterId: 'm-1', sessionId: 's-local', submittedAt: '2026-10-30T00:00:00.000Z', status: 'committed', kind: 'update' }
    const calls = []
    const loadOlderReceipts = vi.fn(async before => {
      calls.push(before)
      if (calls.length === 1) throw new Error('temporary archive failure')
      return { receipts: [], nextBefore: null }
    })
    const view = createProjectionViewStore(defineStore).create()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    cleanups.push(async () => { await act(async () => root.unmount()) })

    await act(async () => { root.render(createElement(ProjectionPanel, propsFor(view, vi.fn(), loadOlderReceipts, value([local])))) })
    const tab = label => [...container.querySelectorAll('[role="tab"]')].find(button => button.textContent.includes(label))
    await act(async () => { tab('Activity').click() })
    const more = () => container.querySelector('.dsha-archive-control button')
    await act(async () => { more().click() })
    expect(container.textContent).toContain('Could not load earlier records.')
    expect(more().textContent).toContain('Retry loading')
    await act(async () => { more().click() })
    expect(calls).toEqual([local.submittedAt, local.submittedAt])
    expect(container.textContent).not.toContain('Retry loading')
    expect(container.querySelector('.dsha-archive-control')).toBeNull()
  })

  it('re-renders on an external store change (the subscription is the point)', async () => {
    const view = createProjectionViewStore(defineStore).create()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    cleanups.push(async () => { await act(async () => root.unmount()) })

    await act(async () => { root.render(createElement(ProjectionPanel, propsFor(view, vi.fn()))) })
    expect(container.querySelector('input.dsha-capture-input').value).toBe('')

    await act(async () => { view.actions.setCaptureDraft('从 store 外部写入') })
    expect(container.querySelector('input.dsha-capture-input').value).toBe('从 store 外部写入')
  })
})
