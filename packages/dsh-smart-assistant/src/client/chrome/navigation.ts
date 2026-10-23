/**
 * Browser navigation seams: the one place that knows how to return the principal to a
 * conversation.
 *
 * The entry used to fuse three mechanisms in one click handler: the platform's
 * `uiConversation` activation, a DOM search for the tab whose text is `对话`, and the layout's
 * panel reset. The DOM search was both locale-fragile and untestable; here it is an explicit
 * adapter (`revealChatTab`) behind one function, so the entry only passes the session id.
 *
 * @module dsh-smart-assistant/client/navigation
 */

/** The platform faces this module needs; structural, so the entry's context fits unchanged. */
export interface ConversationNavigationFaces {
  readonly uiConversation?: { binding(sessionId: string): { activate(view: 'chat'): void } }
  readonly layout?: { selectPanel(id: null): void }
}

/** What to do after activating the conversation. */
export interface ReturnToConversationOptions {
  /** The page document, when one exists; absent in headless compositions. */
  readonly document?: Document
  /** Test seam for the tab reveal; defaults to {@link revealChatTab}. */
  readonly reveal?: (document: Document) => boolean
}

/**
 * Click the shell tab whose label is the conversation's. The shell localizes that label, so
 * this is deliberately one named adapter (and one test), not a condition inside the entry.
 * @param document - The page document.
 * @param label - The localized conversation tab label.
 * @returns Whether a matching, clickable tab was found.
 */
export function revealChatTab(document: Document, label = '对话'): boolean {
  const tab = [...document.querySelectorAll('[role=tab]')]
    .find(element => element.textContent?.trim() === label)
  if (tab === undefined) return false
  const click = (tab as { click?: () => void }).click
  if (typeof click !== 'function') return false
  click.call(tab)
  return true
}

/**
 * Return the principal to the conversation: activate it for the given session, reveal the
 * shell tab when a document exists, and drop the main panel back to the conversation.
 * @param faces - The platform's conversation and layout faces.
 * @param sessionId - The conversation to activate; absent when the slot has no session.
 * @param options - The document and the tab-reveal adapter.
 */
export function returnToConversation(
  faces: ConversationNavigationFaces,
  sessionId: string | undefined,
  options: ReturnToConversationOptions = {},
): void {
  if (sessionId !== undefined) faces.uiConversation?.binding(sessionId).activate('chat')
  const document = options.document
  if (document !== undefined) (options.reveal ?? revealChatTab)(document)
  faces.layout?.selectPanel(null)
}
