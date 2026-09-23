/**
 * Browser half of the plugin: occupies the sidebar's generic brand slots.
 *
 * The sidebar declares `sidebar.brand.mark` and `sidebar.brand.name` as single-occupant
 * slots and falls back to the whale mark plus "DSH Local Build" copy when nothing registers
 * (the official brand package only registers under the 'official' build profile, so local
 * builds leave both slots empty). This face claims them for this deployment: the house mark
 * that also serves as the tab favicon, and the deployment's name.
 *
 * @module dsh-smart-assistant/client
 */

import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/** Slots this face occupies (single-occupant, root-scope, declared by the sidebar). */
export const inject = ['slots']

/**
 * Brand mark: the house from the tab favicon — teal square, white silhouette, teal door.
 * @param props - Geometry supplied by the sidebar.
 * @returns the mark element.
 */
export function AssistantBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    'aria-hidden': true,
  },
  createElement('rect', { width: 64, height: 64, rx: 14, fill: '#0d9488' }),
  createElement('path', { d: 'M32 11 57 33h-8v18H15V33H7Z', fill: '#ffffff' }),
  createElement('rect', { x: 26, y: 38, width: 12, height: 13, fill: '#0d9488' }),
  )
}

/**
 * Brand name: the deployment's identity, sized like the sidebar's fallback brand copy.
 * @returns the name element.
 */
export function AssistantBrandName() {
  return createElement(
    'span',
    { style: { fontSize: '17px', whiteSpace: 'nowrap' } },
    'DSH local assistant',
  )
}

/**
 * Register the brand occupants as one declaration-aware set.
 * @param ctx - Browser root context.
 */
export function apply(ctx: Context): void {
  // The official build's brand package occupies these slots under its own build profile;
  // step aside there. A browser has no `process`, so the guard reads false and we register.
  if (typeof process !== 'undefined' && process.env?.DSH_CLIENT_BUILD_PROFILE === 'official') {
    return
  }
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark' }, AssistantBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name' }, AssistantBrandName)
    }))
}
