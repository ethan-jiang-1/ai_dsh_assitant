/**
 * The rooms as right-sidebar surfaces, split by lifetime:
 *
 * - **bodies and titles** are registered once per materialization; an open tab keeps rendering.
 * - **tab types** carry the "+" guide entries. There is no density switch here: the three
 *   product rooms are always available, and Viki(调试) exists only when the debug flag is on
 *   (the same flag that registers the developer tab).
 *
 * The host routes and the room data never read the density preference.
 *
 * @module dsh-smart-assistant/client/mount-rooms
 */
import type { ClientContext } from '../chrome/contracts'
import { roomTabTitle, roomTabs } from './room-tabs'

type RoomTab = (typeof roomTabs)[number]

/** Viki is a debug surface; the other three rooms are product surfaces. */
function visibleRooms(debug: boolean): readonly RoomTab[] {
  return roomTabs.filter(room => room.kind !== 'vikiRoom' || debug)
}

/**
 * Register the visible rooms' bodies and titles once.
 * @param ctx - The client apply context.
 * @param debug - Whether the debug flag is on (Viki exists only then).
 * @returns The disposer for every body/title registration.
 */
export function mountRoomBodies(ctx: ClientContext, debug: boolean): () => void {
  const disposers: (() => void)[] = []
  for (const room of visibleRooms(debug)) {
    const body = ctx.slots.inject('sidebar.right.pane.tab', () =>
      ctx.slots.register({ name: 'sidebar.right.pane.tab', key: room.id }, room.body)) as (() => void) | undefined
    if (typeof body === 'function') disposers.push(body)
    const title = ctx.slots.inject('sidebar.right.pane.tab.title', () =>
      ctx.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: room.id },
        roomTabTitle(
          room.icon,
          'tabTitle' in room ? room.tabTitle : room.title,
          room.kind === 'vikiRoom' ? { icon: false, fontSize: '10px' } : {},
        ),
      )) as (() => void) | undefined
    if (typeof title === 'function') disposers.push(title)
  }
  return () => { for (const dispose of disposers.reverse()) dispose() }
}

/**
 * Register the visible rooms' tab types with one guide entry each.
 * @param ctx - The client apply context.
 * @param debug - Whether the debug flag is on (Viki exists only then).
 * @returns The disposer for every type registration.
 */
export function mountRoomGuides(ctx: ClientContext, debug: boolean): () => void {
  const disposers: (() => void)[] = []
  for (const room of visibleRooms(debug)) {
    const dispose = ctx.sidebarRightTabs.register({
      id: room.id,
      kind: room.kind,
      priority: 'fallback',
      title: () => ('tabTitle' in room ? room.tabTitle : room.title),
      guide: [{
        id: `${room.id}-guide`,
        order: room.order,
        title: () => ('tabTitle' in room ? room.tabTitle : room.title),
        description: () => room.description,
        icon: room.icon,
      }],
    }) as (() => void) | undefined
    if (typeof dispose === 'function') disposers.push(dispose)
  }
  return () => { for (const dispose of disposers.reverse()) dispose() }
}
