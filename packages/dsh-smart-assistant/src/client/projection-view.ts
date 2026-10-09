/** Transient viewing state, declared at the Slot. Business data stays in the reader. */
export interface ProjectionView {
  selectedId: string | null
  pane: 'list' | 'detail'
  listScrollTop: number
}
export const projectionViewActions = {
  selectMatter(draft: ProjectionView, id: string): void { draft.selectedId = id; draft.pane = 'detail' },
  showList(draft: ProjectionView): void { draft.pane = 'list' },
  rememberListPosition(draft: ProjectionView, position: number): void { draft.listScrollTop = Math.max(0, position) },
}
export type ProjectionViewActions = typeof projectionViewActions
export type DefineProjectionViewStore = (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle
export interface ProjectionViewHandle {
  spec: { init(): ProjectionView; actions: ProjectionViewActions }
  create(): {
    getSnapshot(): ProjectionView
    subscribe(listener: () => void): () => void
    actions: { selectMatter(id: string): void; showList(): void; rememberListPosition(position: number): void }
  }
}

/**
 * @param define - Baseline platform defineStore, supplied by the Client factory.
 * @returns Nonpersistent handle shared across main Slot declaration lifetimes.
 */
export function createProjectionViewStore(define: (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle): ProjectionViewHandle {
  return define({ init: () => ({ selectedId: null, pane: 'list', listScrollTop: 0 }), actions: projectionViewActions })
}
