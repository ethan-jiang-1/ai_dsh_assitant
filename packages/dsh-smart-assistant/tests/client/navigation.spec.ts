/**
 * The browser navigation seam (`src/client/chrome/navigation.ts`): returning to a conversation
 * without the entry scanning the DOM by label.
 *
 * Acceptance points:
 * - the tab adapter clicks the matching `[role=tab]` and reports whether it found one;
 * - the return activates the given session, resets the main panel, and does not activate when
 *   the slot carries no session;
 * - the reveal adapter is injectable, so the fallback is testable without a browser.
 */
import { describe, expect, it, vi } from 'vitest'
import { returnToConversation, revealChatTab } from '../../src/client/chrome/navigation'

function fakeDocument(labels: string[], clicks: string[]): Document {
  const tabs = labels.map(label => ({
    textContent: ` ${label} `,
    click: () => { clicks.push(label) },
  }))
  return { querySelectorAll: () => tabs } as unknown as Document
}

describe('revealChatTab', () => {
  it('clicks the matching localized tab only', () => {
    const clicks: string[] = []
    expect(revealChatTab(fakeDocument(['轨迹', '对话'], clicks))).toBe(true)
    expect(clicks).toEqual(['对话'])
  })

  it('reports a miss instead of guessing the first tab', () => {
    const clicks: string[] = []
    expect(revealChatTab(fakeDocument(['轨迹', 'Chat'], clicks))).toBe(false)
    expect(clicks).toEqual([])
  })
})

describe('returnToConversation', () => {
  it('activates the session, resets the panel, and reveals the tab', () => {
    const activated: string[] = []
    const selected: (string | null)[] = []
    const doc = fakeDocument(['对话'], [])
    returnToConversation({
      uiConversation: { binding: (sessionId: string) => ({ activate: (view: string) => { activated.push(`${sessionId}:${view}`) } }) },
      layout: { selectPanel: (id: string | null) => { selected.push(id) } },
    }, 's1', { document: doc })
    expect(activated).toEqual(['s1:chat'])
    expect(selected).toEqual([null])
  })

  it('still reveals and resets when the slot carries no session', () => {
    const reveal = vi.fn(() => true)
    const selected: (string | null)[] = []
    const doc = fakeDocument(['对话'], [])
    returnToConversation({ layout: { selectPanel: (id: string | null) => { selected.push(id) } } }, undefined, { document: doc, reveal })
    expect(reveal).toHaveBeenCalledWith(doc)
    expect(selected).toEqual([null])
  })
})
