/** Global projection presentation. Renderer supplies the sole live-data hook. */
import { createElement as ce } from './runtime'
import type { ProjectionDownload } from './projection-reader'

/** Structural mirror of the pinned PropsHooks snapshot selector (no component subscriptions). */
export interface ProjectionPanelProps {
  useProjection<S>(select: (value: ProjectionDownload) => S): S
  refreshProjection(): void
  onAsk(): void
}
const errors: Record<string, string> = {
  'authentication-required': '登录已失效，请重新登录后再读取。',
  'download-forbidden': '当前连接无法读取桌面。',
  'projection-invalid': '桌面资料损坏或版本不支持。',
  'projection-too-large': '桌面资料超过读取限额。',
  'download-failed': '桌面读取失败，请重试。',
}

/**
 * @param props - Framework-bound projection hook and plain action callbacks.
 * @returns Read-only complete collection and distinct loading/missing/error/stale states.
 */
export function ProjectionPanel(props: ProjectionPanelProps): ReturnType<typeof ce> {
  const download = props.useProjection(value => value)
  const data = download.data
  const message = download.status === 'disconnected' ? '连接已断开，恢复连接后重新读取。'
    : download.status === 'loading' ? '正在读取桌面…'
    : download.status === 'missing' ? '还没有经营事项资料。'
    : download.status === 'error' ? (errors[download.error ?? 'download-failed'] ?? errors['download-failed']) : undefined
  return ce('main', { style: { padding: '24px', overflowY: 'auto', minWidth: 0 }, 'data-assistant-operating-desk': true },
    ce('h1', {}, '你的桌面'),
    message === undefined ? null : ce('p', { role: download.status === 'error' ? 'alert' : 'status' }, message),
    download.stale ? ce('p', { role: 'status' }, '以下是上次读到的内容，尚未刷新。') : null,
    data?.fixture ? ce('p', {}, '模拟资料，仅供验证界面。') : null,
    ce('button', { onClick: props.refreshProjection }, '重新读取'),
    ce('button', { onClick: props.onAsk }, '有问题？跟助手说'),
    data === undefined ? null : data.matters.length === 0 ? ce('p', {}, '还没有经营事项。')
      : ce('ul', {}, ...data.matters.map(matter => ce('li', { key: matter.id, style: { overflowWrap: 'anywhere' } },
        ce('h2', {}, matter.title), ce('p', {}, matter.status === 'active' ? '在办' : '已完成'), ce('p', {}, matter.summary)))),
  )
}
