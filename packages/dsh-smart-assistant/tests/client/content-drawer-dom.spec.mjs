// @vitest-environment happy-dom
/**
 * The shared content drawer through real React DOM. The inert-shim spec pins the tree; this one
 * pins the three ways a drawer closes (button, backdrop, Escape) and the listener cleanup — a
 * dropped `useEffect` teardown leaves Escape firing after the drawer is gone, which the shim
 * cannot see.
 */
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { ContentDrawer } from '../../src/client/rooms/content-drawer'

const { act, createElement } = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
bindClientRequire(() => React)

let container
let root

function mount(props) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(createElement(ContentDrawer, props)))
}

afterEach(async () => {
  if (root !== undefined) await act(async () => root.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('ContentDrawer (real DOM)', () => {
  it('closes from the button, the backdrop and Escape, and removes the key listener on unmount', async () => {
    const onClose = vi.fn()
    mount({ title: '知识页', body: '正文第一段\n第二段', onClose })

    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('知识页')
    expect(container.textContent).toContain('正文第一段')

    const button = container.querySelector('button[aria-label="关闭"]')
    expect(button).not.toBeNull()
    act(() => button.click())
    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => dialog.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onClose).toHaveBeenCalledTimes(2)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(onClose).toHaveBeenCalledTimes(3)

    await act(async () => root.unmount())
    root = undefined
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
