/**
 * The rooms as discoverable commands.
 *
 * Why this exists: the first-mile walkthrough (2026-09-26) found the product had zero
 * presence in the composer's `/` and `+` menus — "what can this thing do" depended on the
 * principal guessing. These rows are the discovery surface; each opens its room beside the
 * conversation and submits nothing.
 *
 * @module dsh-smart-assistant/client/commands
 */

import type { CommandContribution, RoomKind } from './contracts'
import { setUiMode } from './ui-mode'

/**
 * The three full-board densities as commands: the same switch as the settings row, reachable
 * from `/` when the settings page is not open. The names are literals so the generated package
 * catalog lists them.
 * @returns one contribution per density.
 */
export function uiModeCommands(): CommandContribution[] {
  return [
    {
      name: 'mode-simple',
      label: () => '看板：紧凑',
      description: () => '完整看板收起流水与主动建议；首页/房间/调试不变',
      available: () => true,
      ui: { kind: 'action', run: () => { setUiMode('simple') } },
    },
    {
      name: 'mode-standard',
      label: () => '看板：标准',
      description: () => '完整看板的标准密度；房间与调试不随它变',
      available: () => true,
      ui: { kind: 'action', run: () => { setUiMode('standard') } },
    },
    {
      name: 'mode-expert',
      label: () => '看板：完整',
      description: () => '完整看板显示全部；Viki 与开发调试由 debug flag 决定',
      available: () => true,
      ui: { kind: 'action', run: () => { setUiMode('expert') } },
    },
  ]
}

/**
 * The rooms as discoverable commands.
 * @param open - opens one room's right-sidebar tab by kind.
 * @returns the contributions, in menu order. The desk room has no command: the session desk
 * is retired (principal decision, 2026-10-11) and the one "桌面" is the main-panel ledger desk.
 */
export function roomCommands(open: (kind: RoomKind) => void): CommandContribution[] {
  const commands: CommandContribution[] = [
    {
      name: 'knowledge',
      label: () => '打开知识室',
      description: () => '它凭什么这样判断：知识页、出处与适用范围',
      available: () => true,
      ui: { kind: 'action', run: () => { open('knowledgeRoom') } },
    },
    {
      name: 'memory',
      label: () => '打开记忆室',
      description: () => '它把你理解成什么：记住的偏好、决定与事实',
      available: () => true,
      ui: { kind: 'action', run: () => { open('memoryRoom') } },
    },
  ]
  return commands
}

/**
 * The desk's history view as a discoverable command (history views ③, card 261012): the
 * operations feed is the retrieval surface for "what has been done" — reachable without
 * remembering to open the desk first.
 * @param openActivity - opens the desk main panel switched to the activity feed.
 * @returns the contribution.
 */
export function deskCommands(openActivity: () => void): CommandContribution[] {
  const commands: CommandContribution[] = [
    {
      name: 'desk-activity',
      label: () => '打开完整看板·流水',
      description: () => '做过的每一件事：账本操作的倒序流水，点条目跳到那件事',
      available: () => true,
      ui: { kind: 'action', run: openActivity },
    },
  ]
  return commands
}
