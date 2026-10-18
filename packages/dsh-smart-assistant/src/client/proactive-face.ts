/**
 * Proactive face pure core (261018 片1): the desk's「它替你看过」rows, derived from
 * two READ-ONLY sources (operating projection v2 + the platform schedule catalog)
 * plus a caller-supplied `now`. Zero model calls, zero writes, zero persistence —
 * the schedule facts stay owned by the platform schedule storage (no second truth).
 *
 * Row contract (frozen by the 261018 adjudication):
 * - 行 1 due-no-result: active matter past `nextCheckpoint`/`promisedDeadline`
 *   with NO receipt after that moment; several overdue matters collapse to the
 *   most overdue one plus `extraCount`. Settled matters never appear.
 * - 行 2 waiting-for-you: pending proposals + unclaimed fragments (+ open
 *   questions once 片2 lands) aggregated into ONE row, split from the capture
 *   in-flight row by the "matter vs session" division the adjudication fixed.
 * - 行 3 next-look: earliest active schedule; a late delivery (fact only, no
 *   attribution) and same-title-same-instant duplicates are stated, never acted on.
 * - An undefined catalog degrades to an explicit marker — the desk never guesses.
 */

/** Delivery later than its target by more than this gets the honest late note (10 min). */
export const LATE_DELIVERY_MS = 10 * 60_000

/** Narrow structural view of the platform catalog entry this core consumes. */
export interface ProactiveCatalogEntry {
  readonly id: string
  readonly title: string
  readonly kind: string
  /** Canonical UTC instant of the next occurrence, present on every stored rule variant. */
  readonly scheduledAt: string
  readonly status: 'active' | 'inactive'
  /** The delivered prompt; duplicates are same-title OR same-prompt at the same instant —
   * the 10-13 incident was two different titles carrying one identical prompt. */
  readonly prompt?: string
  readonly lastDelivery?: { readonly scheduledAt: string, readonly deliveredAt: string }
}

/** Structural view of the desk projection this core reads — kept narrow and v1/v2-neutral. */
export interface ProactiveProjectionView {
  readonly matters: readonly {
    readonly id: string
    readonly title: string
    readonly status: string
    readonly times: { readonly promisedDeadline?: string, readonly forecastAt?: string, readonly nextCheckpoint?: string, readonly completedAt?: string }
    readonly proposals: readonly { readonly status: string }[]
  }[]
  readonly receipts: readonly { readonly matterId: string, readonly submittedAt: string }[]
  readonly unclaimed: readonly unknown[]
}

export interface ProactiveFaceInput {
  /** The desk's read-only projection; absent means the desk has nothing yet (empty state). */
  readonly projection?: ProactiveProjectionView
  /** Platform schedule catalog; absent means the subface did not materialize (explicit degrade). */
  readonly catalog?: readonly ProactiveCatalogEntry[]
  /** Unanswered proactive questions (片2 lands the producer; the core only counts). */
  readonly openQuestions?: number
  readonly now: Date
}

export type ProactiveRow =
  | { readonly kind: 'due-no-result', readonly matterId: string, readonly title: string, readonly dueAt: string, readonly daysOverdue: number, readonly extraCount?: number }
  | { readonly kind: 'waiting-for-you', readonly pendingProposals: number, readonly unclaimed: number, readonly openQuestions: number }
  | { readonly kind: 'next-look', readonly title: string, readonly nextAt: string, readonly lateByMs?: number, readonly duplicates?: number }
  | { readonly kind: 'next-look-unavailable' }

const DAY_MS = 86_400_000

/**
 * Derive the proactive face rows. Pure: same inputs, same rows, no clock reads.
 * @param input - projection subset, catalog (or undefined), and the evaluation instant.
 * @returns The row model, sparse by design — empty input yields no rows at all.
 */
export function deriveProactiveFace(input: ProactiveFaceInput): ProactiveRow[] {
  const { projection, catalog, now } = input
  if (projection === undefined) return []
  const nowMs = now.getTime()
  const rows: ProactiveRow[] = []

  // 行 1 — due, no result. Instants (not lexical strings) decide "past" and "after".
  const overdue = projection.matters
    .map(matter => {
      if (matter.status !== 'active') return undefined
      const passed = [matter.times.nextCheckpoint, matter.times.promisedDeadline]
        .filter((value): value is string => value !== undefined && Date.parse(value) <= nowMs)
        .sort((left, right) => Date.parse(left) - Date.parse(right))
      const dueAt = passed[0]
      if (dueAt === undefined) return undefined
      const settledAfterDue = projection.receipts.some(receipt =>
        receipt.matterId === matter.id && Date.parse(receipt.submittedAt) > Date.parse(dueAt))
      if (settledAfterDue) return undefined
      return { matter, dueAt }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt))
  const worst = overdue[0]
  if (worst !== undefined) {
    const extraCount = overdue.length - 1
    rows.push({
      kind: 'due-no-result',
      matterId: worst.matter.id,
      title: worst.matter.title,
      dueAt: worst.dueAt,
      daysOverdue: Math.floor((nowMs - Date.parse(worst.dueAt)) / DAY_MS),
      ...(extraCount > 0 ? { extraCount } : {}),
    })
  }

  // 行 2 — waiting for you (the "matter" half; the capture in-flight row owns the "session" half).
  const pendingProposals = projection.matters.reduce(
    (count, matter) => count + matter.proposals.filter(proposal => proposal.status === 'pending').length, 0)
  const unclaimed = projection.unclaimed.length
  const openQuestions = input.openQuestions ?? 0
  if (pendingProposals + unclaimed + openQuestions > 0) {
    rows.push({ kind: 'waiting-for-you', pendingProposals, unclaimed, openQuestions })
  }

  // 行 3 — when it looks next. `scheduledAt` rides every stored rule variant, so no
  // rule arithmetic here: earliest active wins; late delivery states the fact only.
  if (catalog === undefined) {
    rows.push({ kind: 'next-look-unavailable' })
  } else {
    const active = catalog.filter(entry => entry.status === 'active' && !Number.isNaN(Date.parse(entry.scheduledAt)))
    const earliest = active.reduce<ProactiveCatalogEntry | undefined>(
      (best, entry) => best === undefined || Date.parse(entry.scheduledAt) < Date.parse(best.scheduledAt) ? entry : best,
      undefined)
    if (earliest !== undefined) {
      const earliestAt = Date.parse(earliest.scheduledAt)
      const duplicates = active.filter(entry =>
        Date.parse(entry.scheduledAt) === earliestAt
        && (entry.title === earliest.title || (entry.prompt !== undefined && entry.prompt === earliest.prompt))).length
      const lateByMs = earliest.lastDelivery !== undefined
        ? Date.parse(earliest.lastDelivery.deliveredAt) - Date.parse(earliest.lastDelivery.scheduledAt)
        : 0
      rows.push({
        kind: 'next-look',
        title: earliest.title,
        nextAt: earliest.scheduledAt,
        ...(lateByMs > LATE_DELIVERY_MS ? { lateByMs } : {}),
        ...(duplicates >= 2 ? { duplicates } : {}),
      })
    }
  }

  return rows
}
