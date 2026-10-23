/**
 * The home surface selector: the one-page home (L0) and the full board behind "全部".
 *
 * Why this exists (2026-10-23): the desk's board is still the complete, tested view, but it is no
 * longer the default. The wrapper owns the one piece of local state that switches between them, so
 * `ProjectionPanel` stays a pure board and `OnePageHome` stays a pure page. Both receive the same
 * hooks, actions and lane surface the entry injects; no second data path is created.
 *
 * The switch is per materialization (not persisted): the principal returns to the page on the next
 * open, which is the point of a home.
 *
 * @module dsh-smart-assistant/client/projection/home-surface
 */

import { createElement as ce, reactSurface } from '../chrome/runtime'
import { OnePageHome } from './one-page-home'
import { ProjectionPanel } from './projection-panel'
import type { ProjectionPanelProps } from './projection-panel'

/**
 * Render the one-page home, or the full board after "全部".
 * @param props - The framework-bound hook/actions/surface contract both views share.
 * @returns The selected view.
 */
export function HomeSurface(props: ProjectionPanelProps): ReturnType<typeof ce> {
  const { useState } = reactSurface()
  const [all, setAll] = useState(false)
  return all
    ? ce(ProjectionPanel, { ...props, onBackHome: () => setAll(false) })
    : ce(OnePageHome, { ...props, onOpenAll: () => setAll(true) })
}
