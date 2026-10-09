/** Global projection presentation. Renderer supplies the sole live-data hook. */
import { createElement as ce } from './runtime'
import type { ProjectionDownload } from './projection-reader'
import type { ProjectionView } from './projection-view'

/** Structural mirror of the pinned PropsHooks snapshot selector (no component subscriptions). */
export interface ProjectionPanelProps {
  useProjection<S>(select: (value: ProjectionDownload) => S): S
  useStore<S>(select: (view: ProjectionView) => S): S
  actions: { selectMatter(id: string): void; showList(): void; rememberListPosition(position: number): void }
  refreshProjection(): void
  onAsk(): void
  /** Open the explicit processing path for one matter; absent until the wiring layer lands. */
  onProcess?(matterId: string): void
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
  const view = props.useStore(value => value)
  const selected = data?.matters.find(matter => matter.id === view.selectedId)
  const message = download.status === 'disconnected' ? '连接已断开，恢复连接后重新读取。'
    : download.status === 'loading' ? '正在读取桌面…'
    : download.status === 'missing' ? '还没有经营事项资料。'
    : download.status === 'error' ? (errors[download.error ?? 'download-failed'] ?? errors['download-failed']) : undefined
  return ce('main', { style: { padding: '24px', overflowY: 'auto', minWidth: 0, containerType: 'inline-size', height: '100%', boxSizing: 'border-box' }, 'data-assistant-operating-desk': true },
    ce('style', {}, `.dsha-matters { display:grid; grid-template-columns:minmax(240px, 1fr) minmax(0, 2fr); gap:24px; } .dsha-matter-list, .dsha-matter-detail { min-width:0; overflow-wrap:anywhere; } .dsha-back { display:none; } @container (max-width: 680px) { .dsha-matters { display:block; } .dsha-matters[data-pane="list"] .dsha-matter-detail { display:none; } .dsha-matters[data-pane="detail"] .dsha-matter-list { display:none; } .dsha-back { display:inline-block; } }`),
    ce('h1', {}, '你的桌面'),
    message === undefined ? null : ce('p', { role: download.status === 'error' ? 'alert' : 'status' }, message),
    download.stale ? ce('p', { role: 'status' }, '以下是上次读到的内容，尚未刷新。') : null,
    data?.fixture ? ce('p', {}, '模拟资料，仅供验证界面。') : null,
    ce('button', { onClick: props.refreshProjection }, '重新读取'),
    ce('button', { onClick: props.onAsk }, '有问题？跟助手说'),
    data === undefined ? null : data.matters.length === 0 ? ce('p', {}, '还没有经营事项。')
      : ce('section', { className: 'dsha-matters', 'data-pane': view.pane },
        ce('div', { className: 'dsha-matter-list', role: 'list', onScroll: (event: { currentTarget: { scrollTop: number } }) => props.actions.rememberListPosition(event.currentTarget.scrollTop) },
          ...data.matters.map(matter => ce('article', { key: matter.id, role: 'listitem' },
            ce('button', { type: 'button', onClick: () => props.actions.selectMatter(matter.id), style: { display: 'block', width: '100%', textAlign: 'left', overflowWrap: 'anywhere' } },
              ce('strong', {}, matter.title), ce('span', {}, ` · ${matter.status === 'active' ? '在办' : matter.status === 'completed' ? '已完成' : '已放弃'}`)),
            ce('p', {}, matter.summary))),
        ),
        ce('div', { className: 'dsha-matter-detail', 'aria-live': 'polite' }, selected === undefined
          ? view.selectedId === null ? ce('p', {}, '选择一项查看详情。') : ce('p', {}, '所选事项不在当前投影中。')
          : ce('article', {}, ce('button', { className: 'dsha-back', type: 'button', onClick: props.actions.showList }, '返回事项列表'),
            ce('button', { type: 'button', onClick: () => props.onProcess?.(selected.id) }, '处理这件事'),
            ce('h2', {}, selected.title), ce('p', {}, selected.summary), ce('p', {}, selected.status === 'active' ? '在办' : selected.status === 'completed' ? '已完成' : '已放弃'),
            selected.evidence.length === 0 ? ce('p', {}, '暂无可核对依据。') : ce('ul', {}, ...selected.evidence.map(evidence => ce('li', { key: evidence.id },
              ce('p', {}, evidence.note), ce('small', {}, `${evidence.sessionId} / ${evidence.eventId ?? '无事件定位'}`))))),
        )),
  )
}
