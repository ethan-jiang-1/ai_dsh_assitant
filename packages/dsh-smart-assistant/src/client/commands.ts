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

/** The desk room's command/dock label, shared so the two surfaces cannot drift apart. */
export const DESK_LABEL = '打开我的桌面'

/**
 * The rooms as discoverable commands.
 * @param open - opens one room's right-sidebar tab by kind.
 * @returns the three contributions, in menu order.
 */
export function roomCommands(open: (kind: RoomKind) => void): CommandContribution[] {
  return [
    {
      name: 'desk',
      label: () => DESK_LABEL,
      description: () => '现在要采取什么行动：等你拍板、在办的事、缺什么',
      available: () => true,
      ui: { kind: 'action', run: () => { open('desk') } },
    },
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
}
