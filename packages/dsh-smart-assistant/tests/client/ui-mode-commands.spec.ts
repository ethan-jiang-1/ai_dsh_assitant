/**
 * The interface-density commands (`src/client/chrome/commands.ts`): the same switch as the
 * settings row, reachable from `/` and the composer's `+` menu.
 */
import { describe, expect, it } from 'vitest'
import { uiModeCommands } from '../../src/client/chrome/commands'
import { getUiModeStore, initUiModeStore } from '../../src/client/chrome/ui-mode'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string): string | null => values.get(key) ?? null, setItem: (key: string, value: string): void => { values.set(key, value) } }
}

describe('uiModeCommands', () => {
  it('offers one command per mode and runs the switch', () => {
    initUiModeStore(storage())
    const commands = uiModeCommands()
    expect(commands.map(command => command.name)).toEqual(['mode-simple', 'mode-standard', 'mode-expert'])
    expect(commands.map(command => command.label?.())).toEqual(['界面：简洁', '界面：标准', '界面：专家'])
    const expert = commands.find(command => command.name === 'mode-expert')
    expert?.ui.run(undefined)
    expect(getUiModeStore().getSnapshot()).toBe('expert')
  })
})
