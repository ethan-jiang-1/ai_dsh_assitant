/**
 * The desk presentation vocabulary shared by the panel orchestration and its faces: the
 * projection data alias and the matter-status label table.
 *
 * @module dsh-smart-assistant/client/panel-shared
 */
import type { ProjectionDownload } from './projection-reader'
import type { OperatingReceipt } from './operating-projection'
import type { ProjectionView } from './projection-view'

/** The non-empty projection data the faces consume. */
export type DeskData = NonNullable<ProjectionDownload['data']>

/** Matter status → display label (one table for every face). */
export const STATUS_LABEL: Record<string, string> = { active: '在办', completed: '已完成', abandoned: '已放弃' }

/** One receipt-archive page as the desk views consume it. */
export type OperatingReceiptPage = { readonly receipts: readonly OperatingReceipt[], readonly nextBefore: string | null }

/** Which desk view the workspace remembers when returning from a matter. */
export const RETURN_VIEW_KEY: Record<ProjectionView['mode'], 'desk.view.attention' | 'desk.view.matters' | 'desk.view.activity'> = {
  attention: 'desk.view.attention',
  board: 'desk.view.matters',
  activity: 'desk.view.activity',
}
