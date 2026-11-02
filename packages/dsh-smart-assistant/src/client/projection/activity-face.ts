/**
 * The activity face: the operation feed grouped by local day, with both the local reveal and
 * the archive page. Extracted from the panel so the feed's paging and grouping read as one
 * component.
 *
 * @module dsh-smart-assistant/client/activity-face
 */
import { createElement as ce } from '../chrome/runtime'
import { localTimeLabel } from '../chrome/format'
import type { DeskTranslate } from '../chrome/locales'
import type { ActivityView } from '../../domain/desk/desk-activity-view'
import type { ProjectionView, ProjectionViewBoundActions } from './projection-view'
import type { OperatingReceipt } from './operating-projection'
import type { DeskData, OperatingReceiptPage } from './panel-shared'
import { operationKindLabel, operationStatusLabel } from './matter-board'

/**
 * The activity face: the operation feed grouped by local day, with both the local reveal and
 * the archive page. Extracted from the panel for the same reason as SimpleFace.
 */
export function ActivityFace(props: {
  data: DeskData
  activityView: ActivityView<OperatingReceipt>
  oldestReceipt: string | undefined
  actions: ProjectionViewBoundActions
  t: DeskTranslate
  archiveState: ProjectionView['archiveLoads'][string] | undefined
  loadOlderReceipts?: (before: string | undefined, scope?: { readonly matterId?: string }) => Promise<OperatingReceiptPage>
  onLoadOlder: (key: string, before: string | undefined) => void
  onSelectMatter: (id: string, mode: ProjectionView['mode']) => void
}): ReturnType<typeof ce> {
  const { data, activityView, oldestReceipt, actions, t, archiveState, loadOlderReceipts, onLoadOlder, onSelectMatter } = props
  const activityEntries = activityView.entries
  const activityGroups = activityView.groups
  const titleOfMatter = (matterId: string): string => data.matters.find(matter => matter.id === matterId)?.title ?? matterId
  return ce('section', { className: 'dsha-activity' },
        activityEntries.length === 0 ? ce('p', { className: 'dsha-detail-hint' }, t('desk.activity.empty')) : null,
        ...activityGroups.map(group => ce('div', { key: group.key, className: 'dsha-activity-day' },
          ce('p', { className: 'dsha-activity-date' }, group.label),
          ...group.entries.map(receipt => {
            const known = receipt.matterId !== '' && data.matters.some(matter => matter.id === receipt.matterId)
            const entryLine = ce('span', { className: 'dsha-activity-line' },
              `${localTimeLabel(receipt.submittedAt)} ${operationKindLabel(receipt.kind, t)}${operationStatusLabel(receipt.status, t)}${known ? ` · ${titleOfMatter(receipt.matterId)}` : ''}`)
            const quote = receipt.quote !== undefined ? ce('p', { className: 'dsha-op-quote' }, `「${receipt.quote}」`) : null
            return known
              ? ce('button', { key: receipt.operationId, type: 'button', className: 'dsha-activity-entry',
                  onClick: () => onSelectMatter(receipt.matterId, 'board') }, entryLine, quote)
              : ce('div', { key: receipt.operationId, className: 'dsha-activity-entry' }, entryLine, quote)
          }))),
        activityView.hasMore
          ? ce('button', { type: 'button', className: 'dsha-btn dsha-activity-more', onClick: () => actions.revealMoreActivity() }, t('desk.activity.showMore'))
          : loadOlderReceipts !== undefined && archiveState?.status !== 'exhausted'
            ? ce('div', { className: 'dsha-archive-control' },
              archiveState?.status === 'error' ? ce('p', { className: 'dsha-banner', role: 'alert' }, t('desk.archive.error')) : null,
              ce('button', {
                type: 'button',
                className: 'dsha-btn dsha-activity-more',
                disabled: archiveState?.status === 'loading',
                onClick: () => onLoadOlder('activity', oldestReceipt),
              }, archiveState?.status === 'loading' ? t('desk.archive.loading') : archiveState?.status === 'error' ? t('desk.archive.retry') : t('desk.archive.more')))
            : null)
}
