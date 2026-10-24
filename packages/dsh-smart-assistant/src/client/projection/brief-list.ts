/**
 * "全部": the human list behind the one-page home.
 *
 * Why (2026-10-23): "全部" used to open the old board — filters, activity, suggestions and a
 * 39-control dashboard. That is the deep view for power users, not the first step behind a page.
 * This list answers one question ("what else is on the desk?") with one row per matter: title,
 * status, review date, the first line of the page. Selecting a row returns to the one-page home
 * with that matter selected. The old board survives behind "完整看板" for the cases that need it.
 *
 * @module dsh-smart-assistant/client/projection/brief-list
 */

import { createElement as ce } from '../chrome/runtime'
import { humanTime } from '../chrome/format'
import type { ProactiveCatalogEntry } from '../proactive/proactive-face'
import type { ProjectionPanelProps } from './projection-panel'
import type { OperatingMatter } from './operating-projection'

const STATUS_LABEL: Record<string, string> = { active: '在办', completed: '已完成', abandoned: '已放弃' }

const STYLES = [
  '.dsha-list{display:flex;flex-direction:column;gap:14px;padding:28px clamp(20px,6vw,72px) 40px;height:100%;overflow-y:auto;box-sizing:border-box;}',
  '.dsha-list-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}',
  '.dsha-list-title{margin:0;font-size:22px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-list-sub{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-list-links{margin-left:auto;display:flex;gap:14px;align-items:baseline;}',
  '.dsha-list-link{border:0;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;padding:2px 0;}',
  '.dsha-list-link:hover{color:var(--dsw-alias-label-primary);}',
  '.dsha-list-body{width:min(780px,100%);margin:0 auto;display:flex;flex-direction:column;gap:8px;}',
  '.dsha-list-row{display:flex;flex-direction:column;gap:4px;width:100%;text-align:left;border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:12px 14px;cursor:pointer;font:inherit;}',
  '.dsha-list-row:hover{background:var(--dsw-alias-bg-layer-2);}',
  '.dsha-list-row-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}',
  '.dsha-list-row-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-list-row-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-list-row-line{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-list-empty{margin:12vh auto 0;width:min(680px,100%);font-size:14px;color:var(--dsw-alias-label-secondary);text-align:center;}',
  '.dsha-list-foot{width:min(780px,100%);margin:4px auto 0;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-list-section{display:flex;flex-direction:column;gap:6px;margin-top:18px;border-top:0.5px solid var(--dsw-alias-border-l2);padding-top:12px;}',
  '.dsha-list-section-head{display:flex;align-items:baseline;gap:8px;}',
  '.dsha-list-section-title{margin:0;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-list-section-note{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-list-schedule{display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:0.5px solid var(--dsw-alias-border-l1);}',
  '.dsha-list-schedule-title{font-size:14px;color:var(--dsw-alias-label-primary);}',
  '.dsha-list-schedule-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);margin-left:auto;}',
].join('')

function firstLine(text: string): string {
  const line = text.split('\n').map(part => part.trim()).find(part => part !== '')
  return line ?? ''
}

function reviewLine(matter: OperatingMatter): string {
  if (matter.times.nextCheckpoint !== undefined) return `复查 ${humanTime(matter.times.nextCheckpoint)}`
  if (matter.times.promisedDeadline !== undefined) return `承诺 ${humanTime(matter.times.promisedDeadline)}`
  return ''
}

/**
 * The list: every matter as one row, plus the unclaimed fragments and a board door.
 * @param props - The same injected contract as the home, plus the two exits.
 * @returns The list surface.
 */
export function BriefList(props: ProjectionPanelProps & { onBackHome: () => void, onOpenBoard: () => void, onOpenRecords?: () => void }): ReturnType<typeof ce> {
  const download = props.useProjection(value => value)
  const data = download.data
  const matters = data?.matters ?? []
  const unclaimed = data?.unclaimed ?? []
  const catalog = props.useCatalog === undefined ? undefined : props.useCatalog(value => value)
  const schedules: readonly ProactiveCatalogEntry[] = catalog?.status === 'entries'
    ? catalog.entries.filter(entry => entry.status === 'active')
    : []
  const scheduleSection = props.useCatalog === undefined ? null : ce('section', { className: 'dsha-list-section' },
    ce('div', { className: 'dsha-list-section-head' },
      ce('h2', { className: 'dsha-list-section-title' }, '它在盯什么'),
      ce('span', { className: 'dsha-list-section-note' }, catalog?.status === 'entries' ? `${String(schedules.length)} 条` : '由平台调度')),
    catalog?.status === 'fetching' ? ce('p', { className: 'dsha-list-section-note' }, '正在读取自动化任务…') : null,
    catalog?.status === 'unavailable' ? ce('p', { className: 'dsha-list-section-note' }, '这个组合里读不到自动化任务。') : null,
    catalog?.status === 'entries' && schedules.length === 0 ? ce('p', { className: 'dsha-list-section-note' }, '还没有开启中的自动化任务。') : null,
    ...schedules.map(entry => ce('div', { key: entry.id, className: 'dsha-list-schedule' },
      ce('span', { className: 'dsha-list-schedule-title' }, entry.title),
      ce('span', { className: 'dsha-list-schedule-meta' }, `${entry.kind} · ${humanTime(entry.scheduledAt)}`))),
    ce('p', { className: 'dsha-list-section-note' }, '详情在「自动化任务」；这一页只报它在盯什么。'))
  const openRecords = (): void => {
    if (props.onOpenRecords !== undefined) props.onOpenRecords()
    else props.surface.lanes.onOpenRecords?.()
  }
  return ce('main', { className: 'dsha-list', 'data-assistant-brief-list': true },
    ce('style', {}, STYLES),
    ce('header', { className: 'dsha-list-head' },
      ce('h1', { className: 'dsha-list-title' }, '全部'),
      ce('span', { className: 'dsha-list-sub' }, `${String(matters.length)} 件在账上`),
      ce('div', { className: 'dsha-list-links' },
        ce('button', { className: 'dsha-list-link', type: 'button', onClick: () => props.onBackHome() }, '回到今天'),
        ce('button', { className: 'dsha-list-link', type: 'button', onClick: () => openRecords() }, '它记下的'),
        ce('button', { className: 'dsha-list-link', type: 'button', onClick: () => props.onOpenBoard() }, '完整看板'))),
    download.status === 'error'
      ? ce('p', { className: 'dsha-list-empty', role: 'alert' }, '桌面读取失败，回到今天重试或直接跟助手说。')
      : ce('div', { className: 'dsha-list-body' },
          matters.length === 0
            ? ce('p', { className: 'dsha-list-empty' }, '还没有事项。回到今天，跟助手说一件就行。')
            : matters.map(matter => ce('button', {
              key: matter.id,
              className: 'dsha-list-row',
              type: 'button',
              onClick: () => { props.actions.selectMatter(matter.id); props.onBackHome() },
            },
            ce('span', { className: 'dsha-list-row-head' },
              ce('span', { className: 'dsha-list-row-title' }, matter.title),
              ce('span', { className: 'dsha-list-row-meta' },
                [STATUS_LABEL[matter.status] ?? matter.status, reviewLine(matter)].filter(part => part !== '').join(' · '))),
            matter.summary.trim() === ''
              ? null
              : ce('p', { className: 'dsha-list-row-line' }, firstLine(matter.summary)))),
          scheduleSection),
    unclaimed.length === 0 ? null : ce('p', { className: 'dsha-list-foot' }, `还有 ${String(unclaimed.length)} 条待归户，在完整看板的后台；这一页只列事项。`),
    ce('p', { className: 'dsha-list-foot' }, '完整看板保留筛选、流水与后台；日常从这一页进，需要时再深入。'))
}
