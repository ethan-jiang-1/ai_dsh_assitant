/**
 * The rooms as right-sidebar surfaces, split by lifetime:
 *
 * - **bodies and titles** are registered once per materialization (a room tab that is already
 *   open keeps rendering across mode switches);
 * - **tab types** are re-registered when the mode changes, because their `guide` entries are
 *   what the "+" picker lists. Disposing only the type leaves the body/title seats alone, so no
 *   open tab becomes an empty shell.
 *
 * The mode itself is presentation only; the host routes and the room data never read it.
 *
 * @module dsh-smart-assistant/client/mount-rooms
 */
import type { ClientContext } from '../chrome/contracts'
import type { UiMode } from '../chrome/ui-mode'
import { roomTabTitle, roomTabs } from './room-tabs'

type RoomTab = (typeof roomTabs)[number]

function guideFor(room: RoomTab, mode: UiMode) {
  if (mode === 'simple') return []
  if (mode === 'standard' && room.kind === 'vikiRoom') return []
  return [{
    id: `${room.id}-guide`,
    order: room.order,
    title: () => ('tabTitle' in room ? room.tabTitle : room.title),
    description: () => room.description,
    icon: room.icon,
  }]
}

/**
 * Register every room's body and title seat once. These are independent of the mode: an open
 * tab must keep a body when the guide list changes.
 * @param ctx - The client apply context.
 * @returns The disposer for every body/title registration.
 */
export function mountRoomBodies(ctx: ClientContext): () => void {
  const disposers: (() => void)[] = []
  for (const room of roomTabs) {
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
 * Register every room's tab type with the guide entries the mode allows. Re-registering is the
 * mode switch: the type id/kind and the body/title seats stay stable.
 * @param ctx - The client apply context.
 * @param mode - The current interface density.
 * @returns The disposer for every type registration.
 */
export function mountRoomGuides(ctx: ClientContext, mode: UiMode): () => void {
  const disposers: (() => void)[] = []
  for (const room of roomTabs) {
    const dispose = ctx.sidebarRightTabs.register({
      id: room.id,
      kind: room.kind,
      priority: 'fallback',
      title: () => ('tabTitle' in room ? room.tabTitle : room.title),
      guide: guideFor(room, mode),
    }) as (() => void) | undefined
    if (typeof dispose === 'function') disposers.push(dispose)
  }
  return () => { for (const dispose of disposers.reverse()) dispose() }
}
