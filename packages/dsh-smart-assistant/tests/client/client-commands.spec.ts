/**
 * The room commands: the discovery surface the first-mile walkthrough (2026-09-26) found
 * missing — the product had no presence in the composer's `/` and `+` menus.
 *
 * The browser half is a classic script (zero imports/exports — see its file header), so the
 * test installs the page-global facade, evaluates the script, and materializes the factory
 * with a module-table require stub, the same harness as client-panels.spec.ts.
 */
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { loadClientRegistration, materializeClient } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface CommandContribution {
  name: string
  label?: () => string
  description?: () => string
  available: (session: unknown) => boolean
  ui: { kind: string, run: (session: unknown) => void }
}

interface ClientExports {
  inject: string[]
  apply: (ctx: unknown) => void
  roomCommands: (open: (kind: string) => void) => CommandContribution[]
}

function materialize(): ClientExports {
  return materializeClient(registration, { createElement }) as unknown as ClientExports
}

/** A browser context that records slot/tab/command registrations and nothing else. */
function fakeContext(onCommand?: (contribution: CommandContribution) => void) {
  const slots = { inject: () => undefined, register: () => undefined }
  return {
    slots,
    sidebarRightTabs: { register: () => undefined },
    sidebarRight: { openTab: () => {} },
    inject: (deps: string[], callback: (scope: { get: (name: string) => unknown }) => void) => {
      // The command registry is reached through scoped injection so the rooms do not wait
      // on it; a composition without one simply gets no commands.
      callback({ get: () => (onCommand === undefined ? undefined : { register: onCommand }) })
      return deps
    },
  }
}

describe('room commands', () => {
  it('offers one command per room, each opening that room and submitting nothing', () => {
    const opened: string[] = []
    const commands = materialize().roomCommands(kind => { opened.push(kind) })

    expect(commands.map(command => command.name)).toEqual(['knowledge', 'memory'])
    for (const command of commands) {
      // `action` is the kind that consumes the trigger token without sending a message.
      expect(command.ui.kind).toBe('action')
      expect(command.available({})).toBe(true)
      expect(command.label?.()).toBeTruthy()
      expect(command.description?.()).toBeTruthy()
      command.ui.run({})
    }
    expect(opened).toEqual(['knowledgeRoom', 'memoryRoom'])
  })

  it('registers every command with the client command registry from apply', () => {
    const registered: string[] = []
    materialize().apply(fakeContext(contribution => { registered.push(contribution.name) }))
    // The desk's history feed joins the discovery surface (history views ③): its run only
    // parks the mode intent and opens the main panel — the desk's next render consumes it.
    expect(registered).toEqual(['knowledge', 'memory', 'desk-activity'])
  })

  it('keeps the rooms independent of the command registry being composed', () => {
    const exports = materialize()
    // The decision under test: discovery is additive, so the command surface is reached by
    // scoped injection and never by the plugin's own inject list — otherwise a composition
    // without ui-commands would leave the rooms pending too.
    expect(exports.inject).not.toContain('commandUi')
    expect(() => { exports.apply(fakeContext()) }).not.toThrow()
  })
})
