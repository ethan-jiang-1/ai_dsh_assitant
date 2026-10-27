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

const { act, createElement, useSyncExternalStore } = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
bindClientRequire(() => React)
initUiModeStore({ getItem: () => null, setItem: () => {} })

const cleanups = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  document.body.innerHTML = ''
})

function value() {
  return {
    status: 'ready',
    data: {
      schemaVersion: 2,
      ledgerId: 'dom-test',
      revision: 1,
      receipts: [],
      unclaimed: [],
      matters: [{
        id: 'm-1',
        title: '回款 A',
        status: 'active',
        summary: '等凭证',
        responsible: '财务',
        revision: 1,
        times: {},
        proposals: [],
        evidence: [],
      }],
    },
  }
}

function propsFor(view, onCapture) {
  return {
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
    useProjection: select => select(value()),
    // The real subscription under test: a store change must re-render the panel.
    useStore: select => select(useSyncExternalStore(view.subscribe, () => view.getSnapshot())),
    useSessionStatus: select => select(new Map()),
    actions: view.actions,
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
