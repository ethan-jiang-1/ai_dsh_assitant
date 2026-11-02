/**
 * The simple density face: one next thing, one action, one way out. Extracted from the panel so
 * its urgent/pending/matter/fragment precedence reads as one component.
 *
 * @module dsh-smart-assistant/client/simple-face
 */
import { createElement as ce } from '../chrome/runtime'
import { setUiMode } from '../chrome/ui-mode'
import type { DeskSurface } from './desk-surface'
import type { DeskData } from './panel-shared'
import { STATUS_LABEL } from './panel-shared'

export function SimpleFace(props: {
  data: DeskData
  simpleMatter: DeskData['matters'][number] | undefined
  simpleFragment: DeskData['unclaimed'][number] | undefined
  simpleQuestion: string | undefined
  lanes: DeskSurface['lanes']
}): ReturnType<typeof ce> {
  const { data, simpleMatter, simpleFragment, simpleQuestion, lanes } = props
  const matters = data.matters
  const unclaimed = data.unclaimed ?? []
  return ce('section', { className: 'dsha-simple', 'data-ui-simple': true },
    ce('div', { className: 'dsha-simple-card' },
      simpleQuestion !== undefined ? ce('p', { className: 'dsha-simple-kicker' }, '它在等你') : null,
      ce('h2', { className: 'dsha-simple-title' },
        simpleQuestion !== undefined ? '它在等你回答'
          : simpleMatter !== undefined ? simpleMatter.title
            : simpleFragment !== undefined ? '有一条还没归户的事'
              : '看板上没有在办的事'),
      simpleMatter !== undefined && simpleMatter.summary !== '' ? ce('p', { className: 'dsha-simple-summary' }, simpleMatter.summary) : null,
      simpleMatter === undefined && simpleFragment !== undefined ? ce('p', { className: 'dsha-simple-summary' }, simpleFragment.note) : null,
      simpleMatter !== undefined ? ce('p', { className: 'dsha-simple-meta' },
        `${STATUS_LABEL[simpleMatter.status] ?? simpleMatter.status}${simpleMatter.times.nextCheckpoint !== undefined ? ` · 核对点 ${simpleMatter.times.nextCheckpoint}` : ''}`) : null,
      ce('div', { className: 'dsha-simple-actions' },
        simpleQuestion !== undefined
          ? ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => { lanes.onOpenSession(simpleQuestion) } }, '去会话回答')
          : simpleMatter !== undefined
            ? ce('button', {
              className: 'dsha-btn dsha-btn-primary', type: 'button',
              onClick: () => { if (simpleMatter.status === 'active') lanes.onProcess(simpleMatter.id); else lanes.onWake(simpleMatter.id) },
            }, simpleMatter.status === 'active' ? '处理这件事' : '唤醒这件事')
            : simpleFragment !== undefined
              ? ce('button', { className: 'dsha-btn dsha-btn-primary', type: 'button', onClick: () => { lanes.onClaim(simpleFragment.id) } }, '认领这件事')
              : null)),
    ce('div', { className: 'dsha-simple-more' },
      ce('span', { className: 'dsha-note' }, [
        matters.length > 1 ? `还有 ${String(matters.length - 1)} 件在账上` : '',
        unclaimed.length > 0 && simpleMatter !== undefined ? `${String(unclaimed.length)} 条待认领` : '',
      ].filter(Boolean).join(' · ')),
      ce('button', { className: 'dsha-btn', type: 'button', onClick: () => { setUiMode('standard') } }, '显示更多 · 切到标准')))
}
