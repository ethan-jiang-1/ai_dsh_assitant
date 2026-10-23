/**
 * The settings row for the interface density (`src/client/chrome/ui-mode-row.ts`): three
 * explicit choices, the current one pressed, and a click that writes the shared mode store.
 */
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { UiModeRow } from '../../src/client/chrome/ui-mode-row'
import { getUiModeStore, initUiModeStore } from '../../src/client/chrome/ui-mode'

const react = {
  createElement,
  useState: <T,>(initial: T | (() => T)): [T, (next: T) => void] => [typeof initial === 'function' ? (initial as () => T)() : initial, () => {}],
  useEffect: () => {},
  useRef: <T,>(value: T): { current: T } => ({ current: value }),
}
bindClientRequire(() => react)

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string): string | null => values.get(key) ?? null, setItem: (key: string, value: string): void => { values.set(key, value) } }
}

function buttons(node: unknown, found: { props: { 'data-ui-mode'?: string, 'aria-pressed'?: string, onClick?: () => void } }[] = []) {
  if (Array.isArray(node)) { for (const child of node) buttons(child, found); return found }
  if (node === null || typeof node !== 'object') return found
  const element = node as { type?: unknown, props?: { children?: unknown, 'data-ui-mode'?: string, 'aria-pressed'?: string, onClick?: () => void } }
  if (element.type === 'button' && element.props?.['data-ui-mode'] !== undefined) {
    found.push(element as { props: { 'data-ui-mode'?: string, 'aria-pressed'?: string, onClick?: () => void } })
  }
  return buttons(element.props?.children, found)
}

describe('UiModeRow', () => {
  it('marks the current mode and switches on click', () => {
    initUiModeStore(storage())
    const first = buttons(UiModeRow())
    expect(first.map(button => button.props['data-ui-mode'])).toEqual(['simple', 'standard', 'expert'])
    expect(first.find(button => button.props['data-ui-mode'] === 'standard')?.props['aria-pressed']).toBe('true')
    first.find(button => button.props['data-ui-mode'] === 'simple')?.props.onClick?.()
    expect(getUiModeStore().getSnapshot()).toBe('simple')
    const second = buttons(UiModeRow())
    expect(second.find(button => button.props['data-ui-mode'] === 'simple')?.props['aria-pressed']).toBe('true')
    expect(second.find(button => button.props['data-ui-mode'] === 'standard')?.props['aria-pressed']).toBe('false')
  })
})
