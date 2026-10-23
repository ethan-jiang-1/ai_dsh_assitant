/**
 * Room registration split (`src/client/rooms/mount-rooms.ts`): bodies/titles live once, tab
 * types carry the mode-filtered guide list.
 *
 * Acceptance points:
 * - bodies and titles are registered once for all four rooms and disposed together;
 * - simple lists no room in the guide; standard hides only Viki; expert lists all four;
 * - disposing a mode's types removes exactly those four registrations.
 */
import { describe, expect, it } from 'vitest'
import type { ClientContext } from '../../src/client/chrome/contracts'
import type { SidebarRightTabDefinition } from '../../src/client/chrome/contracts'
import { mountRoomBodies, mountRoomGuides } from '../../src/client/rooms/mount-rooms'
import { roomTabs } from '../../src/client/rooms/room-tabs'

function harness() {
  const tabs: SidebarRightTabDefinition[] = []
  const registers: string[] = []
  const disposed: string[] = []
  const ctx = {
    sidebarRightTabs: {
      register: (definition: SidebarRightTabDefinition) => {
        tabs.push(definition)
        return () => { disposed.push(`tab:${definition.id}`) }
      },
    },
    slots: {
      inject: (name: string, contribute: () => unknown) => {
        registers.push(`inject:${name}`)
        contribute()
        return () => { disposed.push(`inject:${name}`) }
      },
      register: (declaration: { name: string, key?: string }) => {
        registers.push(`register:${declaration.name}:${declaration.key ?? ''}`)
        return () => { disposed.push(`register:${declaration.name}:${declaration.key ?? ''}`) }
      },
    },
  } as unknown as ClientContext
  return { ctx, tabs, registers, disposed }
}

describe('mountRoomBodies', () => {
  it('registers one body and one title for every room and disposes them', () => {
    const { ctx, registers, disposed } = harness()
    const dispose = mountRoomBodies(ctx)
    expect(registers.filter(entry => entry.startsWith('register:sidebar.right.pane.tab:'))).toHaveLength(roomTabs.length)
    expect(registers.filter(entry => entry.startsWith('register:sidebar.right.pane.tab.title:'))).toHaveLength(roomTabs.length)
    dispose()
    expect(disposed.length).toBe(2 * roomTabs.length)
  })
})

describe('mountRoomGuides', () => {
  const guideKinds = (tabs: SidebarRightTabDefinition[]) => tabs.map(tab => [tab.kind, tab.guide?.length ?? 0])

  it('lists no room in simple', () => {
    const { ctx, tabs } = harness()
    mountRoomGuides(ctx, 'simple')
    expect(guideKinds(tabs)).toEqual(roomTabs.map(room => [room.kind, 0]))
  })

  it('hides only Viki in standard', () => {
    const { ctx, tabs } = harness()
    mountRoomGuides(ctx, 'standard')
    expect(guideKinds(tabs)).toEqual(roomTabs.map(room => [room.kind, room.kind === 'vikiRoom' ? 0 : 1]))
  })

  it('lists every room in expert and disposes exactly the registered types', () => {
    const { ctx, tabs, disposed } = harness()
    const dispose = mountRoomGuides(ctx, 'expert')
    expect(guideKinds(tabs)).toEqual(roomTabs.map(room => [room.kind, 1]))
    dispose()
    expect(disposed).toEqual(roomTabs.map(room => `tab:${room.id}`).reverse())
  })
})
