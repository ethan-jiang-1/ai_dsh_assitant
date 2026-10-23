/**
 * The desk activity feed's pure view: newest-first order, the page window, local-day grouping,
 * and the pending-proposal count.
 *
 * The grouping loop used to live inside the 630-line panel; the rule is "group consecutive rows
 * that share the viewer's local day", and the only variable part is the date formatter. Passing
 * the two formatters in keeps this module pure and testable without a browser.
 *
 * @module dsh-smart-assistant/domain/desk/desk-activity-view
 */

/** A row with the one field the feed orders and groups by. */
export interface DatedRow {
  readonly submittedAt: string
}

/** One local-day group. */
export interface ActivityGroup<T> {
  readonly key: string
  readonly label: string
  readonly entries: readonly T[]
}

/** The derived activity view. */
export interface ActivityView<T> {
  /** Every row, newest first. */
  readonly entries: readonly T[]
  /** The rows inside the current page window. */
  readonly shown: readonly T[]
  /** The window grouped by local day, in display order. */
  readonly groups: readonly ActivityGroup<T>[]
  /** Whether rows remain past the window. */
  readonly hasMore: boolean
}

/**
 * Derive the activity feed.
 * @param entries - The receipts to show, in any order.
 * @param limit - The page window; at least one row is always shown.
 * @param dateKey - Local-day identity for one ISO timestamp.
 * @param dateLabel - Local-day label for one ISO timestamp.
 * @returns The sorted entries, the window, its groups, and whether more remain.
 */
export function deriveActivityView<T extends DatedRow>(
  entries: readonly T[],
  limit: number,
  dateKey: (iso: string) => string,
  dateLabel: (iso: string) => string,
): ActivityView<T> {
  const sorted = [...entries].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  const shown = sorted.slice(0, Math.max(1, limit))
  const groups: { key: string, label: string, entries: T[] }[] = []
  for (const receipt of shown) {
    const key = dateKey(receipt.submittedAt)
    const group = groups.at(-1)
    if (group !== undefined && group.key === key) group.entries.push(receipt)
    else groups.push({ key, label: dateLabel(receipt.submittedAt), entries: [receipt] })
  }
  return { entries: sorted, shown, groups, hasMore: sorted.length > shown.length }
}

/**
 * Count the proposals still waiting on the principal across every matter.
 * @param matters - The projected matters.
 * @returns The number of pending proposals.
 */
export function countPendingProposals(matters: readonly { readonly proposals: readonly { readonly status: string }[] }[]): number {
  return matters.reduce((count, matter) => count + matter.proposals.filter(proposal => proposal.status === 'pending').length, 0)
}
