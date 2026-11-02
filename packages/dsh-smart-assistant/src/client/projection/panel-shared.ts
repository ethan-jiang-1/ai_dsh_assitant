/**
 * The desk presentation vocabulary shared by the panel orchestration and its faces: the
 * projection data alias and the matter-status label table.
 *
 * @module dsh-smart-assistant/client/panel-shared
 */
import type { ProjectionDownload } from './projection-reader'

/** The non-empty projection data the faces consume. */
export type DeskData = NonNullable<ProjectionDownload['data']>

/** Matter status → display label (one table for every face). */
export const STATUS_LABEL: Record<string, string> = { active: '在办', completed: '已完成', abandoned: '已放弃' }
