/** Transient viewing state, declared at the Slot. Business data stays in the reader.
 *  Selection is tagged: matters and unclaimed fragments are both first-class selectable items
 *  (principal direction, 2026-10-12), and exactly one selection exists at a time. The list
 *  filter narrows the board's matter list (全部/在办/已了结); the unclaimed inbox ignores it.
 *  `mode` switches the desk's top level: `board` (盯) vs `activity` (the operations feed, 查);
 *  `activityLimit` is the feed's client-side progressive-reveal cursor (the whole ledger is
 *  already downloaded — revealing is pure rendering). */
import type { OperatingReceipt } from './operating-projection'

export type ListFilter = 'all' | 'active' | 'settled'
export type DeskMode = 'board' | 'activity'

/**
 * The delivery receipt of one line the principal typed into the desk's capture row (desk-side capture, 2026-10-18).
 *
 * A **delivery receipt, not a content truth**: it says "the assistant's inbox accepted this line
 * and the ledger has not moved yet". It is per-tab and survives a reload through `sessionStorage`
 * (261019, BUG-016) — the words themselves are durable in the conversation, and the ledger stays
 * the only authority on what exists. Rendering it as anything resembling a matter or a fragment
 * would be the desk claiming something it cannot back.
 */
export interface DeskCaptureReceipt {
  readonly requestId: string
  readonly sessionId: string
  /** The principal's words as delivered — echoed back in the in-flight row, never re-authored. */
  readonly text: string
  /** The projection revision observed when the line was sent; the row clears once it moves past. */
  readonly observedRevision: number
  /** Which door produced the line (261019). `action` = a desk button (先试跑/替我盯上), whose
   *  turn is expected to write no ledger entry — its terminal copy must not claim "还没进账". */
  readonly lane?: 'capture' | 'action'
  /** A human label for an action lane (the button the principal pressed). When present the row
   *  echoes this instead of the canned instruction text, which is prompt engineering, not their words. */
  readonly label?: string
}

export interface ProjectionView {
  selected: { kind: 'matter' | 'fragment'; id: string } | null
  pane: 'list' | 'detail'
  listScrollTop: number
  filter: ListFilter
  /** The human list's search text; client-local, not persisted. */
  query: string
  mode: DeskMode
  activityLimit: number
  /** Receipts paged from the archive after the recent projection window. */
  olderReceipts?: readonly OperatingReceipt[]
  /** The principal's un-sent words in the desk's capture row. */
  captureDraft: string
  /** The line delivered but not yet read back from the ledger; null = nothing in flight. */
  captureReceipt: DeskCaptureReceipt | null
}
/**
 * The delivery receipt survives a page reload through `sessionStorage` (261019, BUG-016).
 * It is still per-tab and still a DELIVERY fact, not a content truth — but it used to be the
 * only pointer to a turn that asked a question, and a reload silently erased it. The stored
 * shape is re-validated on read; anything malformed is treated as "nothing in flight".
 */
const CAPTURE_RECEIPT_KEY = 'dsha-capture-receipt-v1'
function readStoredReceipt(): DeskCaptureReceipt | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(CAPTURE_RECEIPT_KEY)
    if (raw === null) return null
    const value = JSON.parse(raw) as Partial<DeskCaptureReceipt> | null
    if (value === null || typeof value !== 'object') return null
    if (typeof value.requestId !== 'string' || typeof value.sessionId !== 'string'
      || typeof value.text !== 'string' || typeof value.observedRevision !== 'number') return null
    return {
      requestId: value.requestId, sessionId: value.sessionId, text: value.text, observedRevision: value.observedRevision,
      ...(value.lane === 'action' || value.lane === 'capture' ? { lane: value.lane } : {}),
      ...(typeof value.label === 'string' ? { label: value.label } : {}),
    }
  } catch {
    return null
  }
}
function writeStoredReceipt(receipt: DeskCaptureReceipt | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    if (receipt === null) sessionStorage.removeItem(CAPTURE_RECEIPT_KEY)
    else sessionStorage.setItem(CAPTURE_RECEIPT_KEY, JSON.stringify(receipt))
  } catch {
    // Storage is a convenience; the in-memory receipt still works without it.
  }
}
const projectionViewActions = {
  selectMatter(draft: ProjectionView, id: string): void { draft.selected = { kind: 'matter', id }; draft.pane = 'detail' },
  selectFragment(draft: ProjectionView, id: string): void { draft.selected = { kind: 'fragment', id }; draft.pane = 'detail' },
  showList(draft: ProjectionView): void { draft.pane = 'list' },
  rememberListPosition(draft: ProjectionView, position: number): void { draft.listScrollTop = Math.max(0, position) },
  setFilter(draft: ProjectionView, filter: ListFilter): void { draft.filter = filter },
  setQuery(draft: ProjectionView, query: string): void { draft.query = query },
  setMode(draft: ProjectionView, mode: DeskMode): void { draft.mode = mode },
  revealMoreActivity(draft: ProjectionView): void { draft.activityLimit = draft.activityLimit + 50 },
  appendOlderReceipts(draft: ProjectionView, receipts: readonly OperatingReceipt[]): void {
    const seen = new Set((draft.olderReceipts ?? []).map(receipt => receipt.operationId))
    draft.olderReceipts = [...(draft.olderReceipts ?? []), ...receipts.filter(receipt => !seen.has(receipt.operationId))]
  },
  setCaptureDraft(draft: ProjectionView, text: string): void { draft.captureDraft = text },
  setCaptureReceipt(draft: ProjectionView, receipt: DeskCaptureReceipt | null): void { draft.captureReceipt = receipt; writeStoredReceipt(receipt) },
}
export type ProjectionViewActions = typeof projectionViewActions
export type DefineProjectionViewStore = (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle
/** The bound actions a concrete view store exposes to its component. */
export interface ProjectionViewBoundActions {
  selectMatter(id: string): void
  selectFragment(id: string): void
  showList(): void
  rememberListPosition(position: number): void
  setFilter(filter: ListFilter): void
  setQuery(query: string): void
  setMode(mode: DeskMode): void
  revealMoreActivity(): void
  appendOlderReceipts(receipts: readonly OperatingReceipt[]): void
  setCaptureDraft(text: string): void
  setCaptureReceipt(receipt: DeskCaptureReceipt | null): void
}

export interface ProjectionViewHandle {
  spec: { init(): ProjectionView; actions: ProjectionViewActions }
  create(): {
    getSnapshot(): ProjectionView
    subscribe(listener: () => void): () => void
    actions: ProjectionViewBoundActions
  }
}

/**
 * @param define - Baseline platform defineStore, supplied by the Client factory.
 * @returns Nonpersistent handle shared across main Slot declaration lifetimes.
 */
export function createProjectionViewStore(define: (spec: { init(): ProjectionView; actions: ProjectionViewActions }) => ProjectionViewHandle): ProjectionViewHandle {
  return define({ init: () => ({ selected: null, pane: 'list', listScrollTop: 0, filter: 'all' as const, query: '', mode: 'board' as const, activityLimit: 50, olderReceipts: [], captureDraft: '', captureReceipt: readStoredReceipt() }), actions: projectionViewActions })
}
