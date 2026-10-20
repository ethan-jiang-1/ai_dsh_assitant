/**
 * The assistant's brand occupants: the house mark (sidebar, hero, and the same shapes as the
 * tab favicon), the deployment name, and the blank-session hero mark.
 *
 * @module dsh-smart-assistant/client/brand
 */

import type { BrandMarkProps } from './contracts'
import { createElement } from './runtime'
import { MARK_TEAL } from './theme'

/** The deployment's sidebar identity. */
const BRAND_NAME = '章鱼管家'

/**
 * The octopus silhouette: round head, two eyes, five tentacles — many arms tracking many
 * matters at once. Shared by the sidebar mark and the hero mark so both stay one brand.
 * @returns The silhouette elements over the teal tile (drawn by the caller).
 */
function octopusSilhouette() {
  return [
    createElement('circle', { cx: 32, cy: 24, r: 13, fill: '#ffffff' }),
    createElement('circle', { cx: 27, cy: 23, r: 2.2, fill: MARK_TEAL }),
    createElement('circle', { cx: 37, cy: 23, r: 2.2, fill: MARK_TEAL }),
    createElement('path', {
      d: 'M21 31q-6 6-9 9M27 35q-3 9-8 12M37 35q3 9 8 12M43 31q6 6 9 9M32 37q0 7-2 12',
      stroke: '#ffffff',
      'stroke-width': 4.5,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
  ]
}

/**
 * Brand mark: the octopus steward on the teal tile — many arms, one keeper.
 * @param props - Geometry supplied by the sidebar.
 * @returns the mark element.
 */
export function AssistantBrandMark({ size }: BrandMarkProps) {
  return createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    'aria-hidden': true,
  },
  createElement('rect', { width: 64, height: 64, rx: 14, fill: MARK_TEAL }),
  ...octopusSilhouette(),
  )
}

/**
 * Brand name: the deployment's identity, sized like the sidebar's fallback brand copy.
 * @returns the name element.
 */
export function AssistantBrandName() {
  return createElement('span', { style: { fontSize: '17px', whiteSpace: 'nowrap' } }, BRAND_NAME)
}

/**
 * The blank-session hero mark: the deployment's own house mark, where the shell would
 * otherwise show its official one. First impressions should say whose assistant this is
 * — the first-mile walkthrough (2026-09-26) found the product's only identity on the
 * opening screen was a line in the sidebar.
 * @param props - the hero seat's owner props (requested edge, surrounding geometry class).
 * @returns the mark element.
 */
export function AssistantHeroMark({ size, className }: { size: number, className?: string }): ReturnType<typeof createElement> {
  return createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    className,
    'aria-hidden': true,
  },
  createElement('rect', { width: 64, height: 64, rx: 14, fill: MARK_TEAL }),
  ...octopusSilhouette(),
  )
}
