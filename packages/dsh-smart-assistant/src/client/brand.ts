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
const BRAND_NAME = '智能助手'

/**
 * Brand mark: the house from the tab favicon — teal square, white silhouette, teal door.
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
  createElement('path', { d: 'M32 11 57 33h-8v18H15V33H7Z', fill: '#ffffff' }),
  createElement('rect', { x: 26, y: 38, width: 12, height: 13, fill: MARK_TEAL }),
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
  createElement('path', { d: 'M32 11 57 33h-8v18H15V33H7Z', fill: '#ffffff' }),
  createElement('rect', { x: 26, y: 38, width: 12, height: 13, fill: MARK_TEAL }),
  )
}
