/**
 * Room registration split (`src/client/rooms/mount-rooms.ts`): the three product rooms are
 * always available; Viki(调试) exists only when the debug flag is on. Density is a full-board
 * preference and never touches this surface.
 */
import { describe, expect, it } from 'vitest'
import type { ClientContext } from '../../src/client/chrome/contracts'
import type { SidebarRightTabDefinition } from '../../src/client/chrome/contracts'
import { mountRoomBodies, mountRoomGuides } from '../../src/client/rooms/mount-rooms'
import { roomTabs } from '../../src/client/rooms/room-tabs'

const productRooms = roomTabs.filter(room => room.kind !== 'vikiRoom')

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
  it('registers one body and one title for the three product rooms by default', () => {
    const { ctx, registers, disposed } = harness()
    const dispose = mountRoomBodies(ctx, false)
    expect(registers.filter(entry => entry.startsWith('register:sidebar.right.pane.tab:'))).toHaveLength(productRooms.length)
    expect(registers.filter(entry => entry.startsWith('register:sidebar.right.pane.tab.title:'))).toHaveLength(productRooms.length)
    expect(registers.some(entry => entry.includes('viki'))).toBe(false)
    dispose()
    expect(disposed.length).toBe(2 * productRooms.length)
  })

  it('adds Viki body and title only when the debug flag is on', () => {
    const { ctx, registers } = harness()
    mountRoomBodies(ctx, true)
    expect(registers.filter(entry => entry.startsWith('register:sidebar.right.pane.tab:'))).toHaveLength(roomTabs.length)
    expect(registers.some(entry => entry.includes('viki'))).toBe(true)
  })
})

describe('mountRoomGuides', () => {
  const guideKinds = (tabs: SidebarRightTabDefinition[]) => tabs.map(tab => [tab.kind, tab.guide?.length ?? 0])

  it('guides the three product rooms and no Viki by default', () => {
    const { ctx, tabs } = harness()
    mountRoomGuides(ctx, false)
    expect(guideKinds(tabs)).toEqual(productRooms.map(room => [room.kind, 1]))
  })

  it('adds the Viki guide only when debug is on, and disposes exactly the registered types', () => {
    const { ctx, tabs, disposed } = harness()
    const dispose = mountRoomGuides(ctx, true)
    expect(guideKinds(tabs)).toEqual(roomTabs.map(room => [room.kind, 1]))
    dispose()
    expect(disposed).toEqual(roomTabs.map(room => `tab:${room.id}`).reverse())
  })
})
