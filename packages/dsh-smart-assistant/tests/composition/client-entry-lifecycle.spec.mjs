/**
 * Built classic client entry + real Cordis Loader + renderer SlotRegistry lifecycle.
 * Requires `pnpm build`: evaluates lib/client/index.js through its page facade, never src.
 * Pins declaration-before-selection, one default per Client root, disposal, and HMR/remount.
 * Also pins Session-list observer and settle-timer cleanup to the Loader-managed plugin fiber.
 * The slot owner declares only main/panellist; unrelated slots remain pending. The pinned
 * LayoutController and layout store drive selection; other services are inert external inputs.
 * No DOM, browser navigation, authenticated transport, or Session/business completion is asserted.
 */
import { readFileSync } from 'node:fs'
import { createContext, Script } from 'node:vm'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import * as React from 'react'
import { createSnapshotStore } from '../../../../vendor/dsh/packages/client/store/src/index.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '../../../../vendor/dsh/packages/client/ui-renderer/src/client/registry.ts'
import { LayoutController } from '../../../../vendor/dsh/packages/client/ui-layout/src/client/service.ts'
import { createLayoutStore } from '../../../../vendor/dsh/packages/client/ui-layout/src/client/stores.ts'

const bundleUrl = new URL('../../lib/client/index.js', import.meta.url)
const builtScript = readFileSync(bundleUrl, 'utf8')
const dashboard = 'dsh-smart-assistant-dashboard'
const contexts = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  vi.restoreAllMocks()
})

/** One page realm survives HMR and can also receive a fresh Client root. */
function page(scriptText) {
  const registrations = []
  const realm = createContext({
    console: { info() {}, warn() {}, error: console.error },
    setTimeout,
    clearTimeout,
    __ModuleLoader__: { load: registration => registrations.push(registration) },
  })
  return {
    evaluate() {
      registrations.length = 0
      new Script(scriptText, { filename: bundleUrl.pathname }).runInContext(realm)
      expect(registrations).toHaveLength(1)
      expect(registrations[0].id).toBe('dsh-smart-assistant')
      return registrations[0].factory(specifier => {
        if (specifier === 'react') return React
        if (specifier === '@deepseek-ai/dsh-client-store') return { createSnapshotStore, defineStore }
        throw new Error(`unexpected classic client dependency: ${specifier}`)
      })
    },
  }
}

/** Instantiate the pinned layout store without a browser, restoring the sole window input. */
function layoutInstance() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 1280 } })
  try {
    return createLayoutStore().create()
  } finally {
    if (previous === undefined) delete globalThis.window
    else Object.defineProperty(globalThis, 'window', previous)
  }
}

/** Genuine Loader/slots and layout action/store lifecycle; no rendered shell. */
async function clientRoot(initialPanel = null, sessions = {}, remote = {}) {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Loader)
  await ctx.plugin(SlotRegistry)
  const slots = ctx.get('slots')
  const selections = []
  const instance = layoutInstance()
  instance.actions.selectPanel(initialPanel)
  const panelInfo = {
    getSnapshot: () => instance.getSnapshot().panelInfo,
    subscribe: listener => instance.subscribe(listener),
  }
  const layout = new LayoutController(instance.actions, id =>
    slots.entriesOfSlot('main').some(entry => entry.options.key === id), panelInfo)
  const selectPanel = layout.selectPanel.bind(layout)
  vi.spyOn(layout, 'selectPanel').mockImplementation(panelId => {
    selections.push({ panelId, mainKeys: slots.entriesOfSlot('main').map(entry => entry.options.key) })
    selectPanel(panelId)
  })
  ctx.effect(() => () => layout.dispose())
  ctx.provide('layout', layout)
  ctx.provide('sidebarRightTabs', { register: () => () => {} })
  ctx.provide('sidebarRight', {})
  ctx.provide('sessions', { ...sessions })
  ctx.provide('workspaces', { list: { getSnapshot: () => ({ items: [] }), subscribe: () => () => {} } })
  ctx.provide('uiSession', {
    sessionStatus: { getSnapshot: () => new Map(), subscribe: () => () => {} },
    current: { value: {} },
  })
  ctx.provide('connection', { generation: createSnapshotStore(undefined), state: createSnapshotStore(undefined) })
  // The entry declares these two as hard inject entries, so the plugin stays pending without
  // them: uiWorkspace owns the processing path's session navigation, locale backs the typed
  // `t` seat on the processing-context dock. Both are inert inputs here — this suite asserts
  // declaration-before-selection, not session navigation or copy.
  ctx.provide('uiWorkspace', { openSession: () => {} })
  ctx.provide('locale', { register: () => () => {} })
  ctx.provide('remote', { $mount: async () => null, ...remote })
  for (const namespace of ['agentPresets', 'workspaceFiles', 'session', 'schedule']) {
    ctx.provide(`remote.${namespace}`, {})
  }
  return {
    ctx, slots, selections, layout,
    declareSeats: () => slots.register({
      name: 'root',
      children: {
        main: { kind: 'keyed', scope: 'root' },
        'sidebar.panellist': { kind: 'list', scope: 'root' },
      },
    }, () => null),
    async mount(plugin) {
      ctx.loader.builtins['assistant-client'] = plugin
      await ctx.loader.root.update([{ id: 'assistant-client', name: 'cordis:assistant-client' }])
      await ctx.loader.await()

    },
    async unmount() {
      await ctx.loader.root.update([])
      await ctx.loader.await()
    },
  }
}

/** Exercise the same public lifecycle for both the artifact and its regression fixture. */
async function defaultLifecycle(scriptText) {
  const browserPage = page(scriptText)
  const firstPlugin = browserPage.evaluate()
  const first = await clientRoot()
  await first.mount(firstPlugin)
  expect(first.selections, 'undeclared main cannot trigger a default').toEqual([])
  expect(first.slots.entriesOfSlot('main')).toEqual([])
  const disposeSeats = first.declareSeats()
  expect(first.selections).toEqual([{ panelId: dashboard, mainKeys: [dashboard] }])
  expect(first.slots.entriesOfSlot('main').map(entry => entry.options.key)).toEqual([dashboard])

  // The user deliberately returns to Conversation. A declaration collapse/redeclaration
  // on this root, a Loader remount, and a newly evaluated HMR script must respect that.
  first.layout.selectPanel(null)
  disposeSeats()
  expect(first.slots.entriesOfSlot('main')).toEqual([])
  first.declareSeats()
  expect(first.selections, 'default is consumed once per Client root').toHaveLength(2)
  await first.unmount()
  expect(first.slots.entriesOfSlot('main')).toEqual([])
  await first.mount(firstPlugin)
  expect(first.slots.entriesOfSlot('main').map(entry => entry.options.key)).toEqual([dashboard])
  expect(first.selections, 'default is consumed once per Client root').toHaveLength(2)
  await first.unmount()
  await first.mount(browserPage.evaluate())
  expect(first.slots.entriesOfSlot('main').map(entry => entry.options.key)).toEqual([dashboard])
  expect(first.selections, 'HMR must not steal Conversation on the same root').toHaveLength(2)
  expect(first.layout.panelInfo.getSnapshot().activePanelId).toBeNull()

  const second = await clientRoot()
  second.declareSeats()
  await second.mount(browserPage.evaluate())
  expect(second.selections, 'a new Client root defaults again').toEqual([
    { panelId: dashboard, mainKeys: [dashboard] },
  ])
}

describe('built client default entry through Loader and real slots', () => {
  it('unsubscribes the Session list and cancels its pending settle refresh when unloaded', async () => {
    vi.useFakeTimers()
    try {
      let snapshot = { ids: [], byId: {} }
      let notify
      const unsubscribe = vi.fn()
      const read = vi.fn(async () => ({ ok: false }))
      const client = await clientRoot(null, {
        list: {
          getSnapshot: () => snapshot,
          subscribe: listener => { notify = listener; return unsubscribe },
        },
      }, { workspaceFiles: { read } })
      client.declareSeats()
      await client.mount(page(builtScript).evaluate())

      snapshot = { ids: ['session-1'], byId: { 'session-1': { updatedAt: 1, cwd: '.tmp/workspace' } } }
      notify()
      await vi.advanceTimersByTimeAsync(3999)
      const pendingTimersBeforeDispose = vi.getTimerCount()
      const readCallsBeforeSettle = read.mock.calls.length
      await client.unmount()
      const cleanup = { unsubscribed: unsubscribe.mock.calls.length, pendingTimers: vi.getTimerCount() }
      await vi.advanceTimersByTimeAsync(4000)

      expect({ pendingTimersBeforeDispose, readCallsBeforeSettle, cleanup, readCallsAfterDispose: read.mock.calls.length }).toEqual({
        pendingTimersBeforeDispose: 1,
        readCallsBeforeSettle: 0,
        cleanup: { unsubscribed: 1, pendingTimers: 0 },
        readCallsAfterDispose: 0,
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('defaults after main registration once per root and preserves manual navigation through remount/HMR', async () => {
    await defaultLifecycle(builtScript)
  })

  it('preserves a different panel selected before the client contribution loads', async () => {
    const client = await clientRoot('settings')
    client.declareSeats()
    await client.mount(page(builtScript).evaluate())
    expect(client.slots.entriesOfSlot('main').map(entry => entry.options.key)).toEqual([dashboard])
    expect(client.selections).toEqual([])
    expect(client.layout.panelInfo.getSnapshot().activePanelId).toBe('settings')
  })
})
