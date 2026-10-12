/** Transient viewing state, declared at the Slot. Business data stays in the reader.
 *  Selection is tagged: matters and unclaimed fragments are both first-class selectable items
 *  (principal direction, 2026-10-12), and exactly one selection exists at a time. The list
 *  filter narrows the board's matter list (全部/在办/已了结); the unclaimed inbox ignores it. */
export type ListFilter = 'all' | 'active' | 'settled'
export interface ProjectionView {
  selected: { kind: 'matter' | 'fragment'; id: string } | null
  pane: 'list' | 'detail'
  listScrollTop: number
  filter: ListFilter
}
export const projectionViewActions = {
  selectMatter(draft: ProjectionView, id: string): void { draft.selected = { kind: 'matter', id }; draft.pane = 'detail' },
  selectFragment(draft: ProjectionView, id: string): void { draft.selected = { kind: 'fragment', id }; draft.pane = 'detail' },
  showList(draft: ProjectionView): void { draft.pane = 'list' },
  rememberListPosition(draft: ProjectionView, position: number): void { draft.listScrollTop = Math.max(0, position) },
  setFilter(draft: ProjectionView, filter: ListFilter): void { draft.filter = filter },
}
export type ProjectionViewActions = typeof projectionViewActions
export type DefineProjectionViewStore = (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle
export interface ProjectionViewHandle {
  spec: { init(): ProjectionView; actions: ProjectionViewActions }
  create(): {
    getSnapshot(): ProjectionView
    subscribe(listener: () => void): () => void
    actions: { selectMatter(id: string): void; selectFragment(id: string): void; showList(): void; rememberListPosition(position: number): void; setFilter(filter: ListFilter): void }
  }
}

/**
 * @param define - Baseline platform defineStore, supplied by the Client factory.
 * @returns Nonpersistent handle shared across main Slot declaration lifetimes.
 */
export function createProjectionViewStore(define: (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle): ProjectionViewHandle {
  return define({ init: () => ({ selected: null, pane: 'list', listScrollTop: 0, filter: 'all' as const }), actions: projectionViewActions })
}
