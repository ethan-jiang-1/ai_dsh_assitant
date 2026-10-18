/** Transient viewing state, declared at the Slot. Business data stays in the reader.
 *  Selection is tagged: matters and unclaimed fragments are both first-class selectable items
 *  (principal direction, 2026-10-12), and exactly one selection exists at a time. The list
 *  filter narrows the board's matter list (全部/在办/已了结); the unclaimed inbox ignores it.
 *  `mode` switches the desk's top level: `board` (盯) vs `activity` (the operations feed, 查);
 *  `activityLimit` is the feed's client-side progressive-reveal cursor (the whole ledger is
 *  already downloaded — revealing is pure rendering). */
export type ListFilter = 'all' | 'active' | 'settled'
export type DeskMode = 'board' | 'activity'

/**
 * The delivery receipt of one line the principal typed into the desk's capture row (261018 片 1).
 *
 * A **delivery receipt, not a content truth**: it says "the assistant's inbox accepted this line
 * and the ledger has not moved yet". It lives and dies with the page on purpose — the words
 * themselves are durable in the conversation, and the ledger stays the only authority on what
 * exists. Rendering it as anything resembling a matter or a fragment would be the desk claiming
 * something it cannot back.
 */
export interface DeskCaptureReceipt {
  readonly requestId: string
  readonly sessionId: string
  /** The principal's words as delivered — echoed back in the in-flight row, never re-authored. */
  readonly text: string
  /** The projection revision observed when the line was sent; the row clears once it moves past. */
  readonly observedRevision: number
}

export interface ProjectionView {
  selected: { kind: 'matter' | 'fragment'; id: string } | null
  pane: 'list' | 'detail'
  listScrollTop: number
  filter: ListFilter
  mode: DeskMode
  activityLimit: number
  /** The principal's un-sent words in the desk's capture row. */
  captureDraft: string
  /** The line delivered but not yet read back from the ledger; null = nothing in flight. */
  captureReceipt: DeskCaptureReceipt | null
}
export const projectionViewActions = {
  selectMatter(draft: ProjectionView, id: string): void { draft.selected = { kind: 'matter', id }; draft.pane = 'detail' },
  selectFragment(draft: ProjectionView, id: string): void { draft.selected = { kind: 'fragment', id }; draft.pane = 'detail' },
  showList(draft: ProjectionView): void { draft.pane = 'list' },
  rememberListPosition(draft: ProjectionView, position: number): void { draft.listScrollTop = Math.max(0, position) },
  setFilter(draft: ProjectionView, filter: ListFilter): void { draft.filter = filter },
  setMode(draft: ProjectionView, mode: DeskMode): void { draft.mode = mode },
  revealMoreActivity(draft: ProjectionView): void { draft.activityLimit = draft.activityLimit + 50 },
  setCaptureDraft(draft: ProjectionView, text: string): void { draft.captureDraft = text },
  setCaptureReceipt(draft: ProjectionView, receipt: DeskCaptureReceipt | null): void { draft.captureReceipt = receipt },
}
export type ProjectionViewActions = typeof projectionViewActions
export type DefineProjectionViewStore = (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle
export interface ProjectionViewHandle {
  spec: { init(): ProjectionView; actions: ProjectionViewActions }
  create(): {
    getSnapshot(): ProjectionView
    subscribe(listener: () => void): () => void
    actions: { selectMatter(id: string): void; selectFragment(id: string): void; showList(): void; rememberListPosition(position: number): void; setFilter(filter: ListFilter): void; setMode(mode: DeskMode): void; revealMoreActivity(): void; setCaptureDraft(text: string): void; setCaptureReceipt(receipt: DeskCaptureReceipt | null): void }
  }
}

/**
 * @param define - Baseline platform defineStore, supplied by the Client factory.
 * @returns Nonpersistent handle shared across main Slot declaration lifetimes.
 */
export function createProjectionViewStore(define: (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle): ProjectionViewHandle {
  return define({ init: () => ({ selected: null, pane: 'list', listScrollTop: 0, filter: 'all' as const, mode: 'board' as const, activityLimit: 50, captureDraft: '', captureReceipt: null }), actions: projectionViewActions })
}
