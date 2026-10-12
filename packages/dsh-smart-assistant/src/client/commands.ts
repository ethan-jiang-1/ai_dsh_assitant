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

/**
 * The rooms as discoverable commands.
 * @param open - opens one room's right-sidebar tab by kind.
 * @returns the contributions, in menu order. The desk room has no command: the session desk
 * is retired (principal decision, 2026-10-11) and the one "桌面" is the main-panel ledger desk.
 */
export function roomCommands(open: (kind: RoomKind) => void): CommandContribution[] {
  return [
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

/**
 * The desk's history view as a discoverable command (history views ③, card 261012): the
 * operations feed is the retrieval surface for "what has been done" — reachable without
 * remembering to open the desk first.
 * @param openActivity - opens the desk main panel switched to the activity feed.
 * @returns the contribution.
 */
export function deskCommands(openActivity: () => void): CommandContribution[] {
  return [
    {
      name: 'desk-activity',
      label: () => '打开桌面·流水',
      description: () => '做过的每一件事：账本操作的倒序流水，点条目跳到那件事',
      available: () => true,
      ui: { kind: 'action', run: openActivity },
    },
  ]
}
