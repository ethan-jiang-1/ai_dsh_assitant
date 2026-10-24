/**
 * The home surface selector: the one-page home (default), the brief list (deep view) and the full board.
 *
 * Why this exists (2026-10-23): the desk's board is still the complete, tested view, but it is no
 * longer the default and no longer the first step behind "全部". The wrapper owns the one piece of
 * local state that switches between three surfaces:
 *
 *   one-page home  --全部-->  brief list  --完整看板-->  full board
 *        ^                        |                         |
 *        +-------- 回到今天 ------+----------- 回到今天 ----+
 *
 * Both product views receive the same hooks, actions and lane surface the entry injects; no second
 * data path is created. The switch is per materialization (not persisted): the principal returns to
 * the page on the next open, which is the point of a home.
 *
 * @module dsh-smart-assistant/client/projection/home-surface
 */

import { createElement as ce, reactSurface } from '../chrome/runtime'
import { OnePageHome } from './one-page-home'
import { BriefList } from './brief-list'
import { ProjectionPanel } from './projection-panel'
import { RecordsSurface } from './records-surface'
import { DebugPanel } from '../debug/debug-panel'
import { debugEnabled } from '../chrome/debug-flag'
import type { ProjectionPanelProps } from './projection-panel'

type Surface = 'home' | 'list' | 'board' | 'records' | 'debug'

/**
 * Render one of the three surfaces. `全部` opens the list; `完整看板` opens the old board.
 * @param props - The framework-bound hook/actions/surface contract all views share.
 * @returns The selected view.
 */
export function HomeSurface(props: ProjectionPanelProps): ReturnType<typeof ce> {
  const { useState } = reactSurface()
  const [surface, setSurface] = useState<Surface>('home')
  const onOpenDebug = debugEnabled() ? () => setSurface('debug') : undefined
  if (surface === 'debug') return ce(DebugPanel, { ...props, onBackHome: () => setSurface('home') })
  if (surface === 'board') return ce(ProjectionPanel, { ...props, onBackHome: () => setSurface('home') })
  if (surface === 'records') return ce(RecordsSurface, { onBackHome: () => setSurface('home') })
  if (surface === 'list') {
    return ce(BriefList, {
      ...props,
      onBackHome: () => setSurface('home'),
      onOpenBoard: () => setSurface('board'),
      onOpenRecords: () => setSurface('records'),
      ...(onOpenDebug === undefined ? {} : { onOpenDebug }),
    })
  }
  return ce(OnePageHome, {
    ...props,
    onOpenAll: () => setSurface('list'),
    onOpenRecords: () => setSurface('records'),
    ...(onOpenDebug === undefined ? {} : { onOpenDebug }),
  })
}
