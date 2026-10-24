/**
 * The settings row for the full-board density: three explicit choices, always visible in every
 * mode (the way out of compact must never be hidden).
 *
 * The row is a `settings.general.item` contribution; it reads and writes the same mode store the
 * full board reads. It does not touch the home, the list, the rooms or the debug flag.
 *
 * @module dsh-smart-assistant/client/ui-mode-row
 */
import { createElement } from './runtime'
import { MARK_TEAL } from './theme'
import { UI_MODES, setUiMode, useUiMode, type UiMode } from './ui-mode'

const LABEL: Record<UiMode, string> = { simple: '紧凑', standard: '标准', expert: '完整' }

/** One settings row: title, one-line explanation, and the three choices. */
export function UiModeRow(): ReturnType<typeof createElement> {
  const mode = useUiMode()
  return createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 0',
      borderBottom: '1px solid var(--dsw-alias-separator, #3a3a3a)',
    },
  },
  createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-primary, #f2f2f2)' } }, '完整看板密度（只影响完整看板）'),
  createElement('div', { style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary, #a8a8a8)' } },
    '首页、全部、它记下的、房间与调试都不随它变。紧凑收起完整看板的流水与主动建议；标准与完整只影响看板内部。审批、错误与发送/停止永不隐藏。'),
  createElement('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
    ...UI_MODES.map(candidate => createElement('button', {
      key: candidate,
      type: 'button',
      'data-ui-mode': candidate,
      'aria-pressed': String(mode === candidate),
      onClick: () => { setUiMode(candidate) },
      style: {
        padding: '4px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
        border: mode === candidate ? `1px solid ${MARK_TEAL}` : '1px solid var(--dsw-alias-separator, #3a3a3a)',
        color: mode === candidate ? MARK_TEAL : 'var(--dsw-alias-label-primary, #f2f2f2)',
        background: 'transparent',
      },
    }, LABEL[candidate]))))
}
