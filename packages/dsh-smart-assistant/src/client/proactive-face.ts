/**
 * Proactive face pure core (261018 片1): the desk's「它替你看过」rows, derived from
 * two READ-ONLY sources (operating projection v2 + the platform schedule catalog)
 * plus a caller-supplied `now`. Zero model calls, zero writes, zero persistence —
 * the schedule facts stay owned by the platform schedule storage (no second truth).
 *
 * Row contract (frozen by the 261018 adjudication, 行 1 refined 2026-10-19):
 * - 行 1 due-no-result: active matter past `nextCheckpoint`/`promisedDeadline`
 *   with NO committed RESULT after that moment (a claim or a status update is not a
 *   result); several overdue matters collapse to the most overdue one plus `extraCount`.
 *   Settled matters never appear.
 * - 行 2 waiting-for-you: pending proposals + unclaimed fragments (+ unanswered
 *   questions from sessions the capture row does not own) aggregated into ONE row,
 *   split from the capture in-flight row by the "matter vs session" division the
 *   adjudication fixed.
 * - 行 3 next-look: earliest active schedule; a late delivery (fact only, no
 *   attribution) and same-title-same-instant duplicates are stated, never acted on.
 * - An undefined catalog degrades to an explicit marker — the desk never guesses.
 */

/** Delivery later than its target by more than this gets the honest late note (10 min). */
export const LATE_DELIVERY_MS = 10 * 60_000

/** Operation kinds that can make a due matter "have a result". A claim moves a fragment into a
 *  matter; an update reports status (often "still nothing"); a rejected/conflicting operation
 *  changed nothing. Only a committed completion answers "到期没结果" (261019, BUG-017). */
const RESULT_RECEIPT_KINDS: ReadonlySet<string> = new Set(['complete'])

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
  readonly receipts: readonly {
    readonly matterId: string
    readonly submittedAt: string
    /** The operation's semantic kind (the projection carries it; older ones may omit it). */
    readonly kind?: string
    /** The operation outcome; only `committed` operations can be results. */
    readonly status?: string
  }[]
  readonly unclaimed: readonly unknown[]
}

/** A locally remembered "替我盯上" acceptance — the Q5 mismatch check's input (片 2). */
export interface AcceptedWatch {
  readonly id: string
  readonly title: string
  readonly at: string
}

/** Client-local proactive UI state: dismissed suggestions + remembered acceptances (片 2).
 * Deliberately NOT a second truth about schedules — it only remembers the principal's own
 * clicks; the schedule facts stay in the platform storage. */
export interface ProactiveUiState {
  readonly ignored: readonly string[]
  readonly accepted: readonly AcceptedWatch[]
}

/** The three named watch suggestions, in the adjudicated order ②③① (Q3 拍板 2026-10-18). */
export const PROACTIVE_SUGGESTIONS: readonly {
  readonly id: string
  readonly name: string
  readonly hint: string
  /** Carries the informed-consent note: denser than the principal's "每周一坐" rhythm. */
  readonly dense?: boolean
}[] = [
  { id: 'due-check', name: '到期日到了替我核一遍账', hint: '到期那天替你核一遍：账上有结果没说一声，没有也来说一声' },
  { id: 'weekly-recon', name: '每周一替我对一次账', hint: '贴合你的每周一坐——周一早上先把料备好' },
  { id: 'daily-look', name: '每个早上替我看一遍桌面', hint: '比「每周一坐」密——点了就是你自己把节律改成每天', dense: true },
]

export interface ProactiveFaceInput {
  /** The desk's read-only projection; absent means the desk has nothing yet (empty state). */
  readonly projection?: ProactiveProjectionView
  /** Platform schedule catalog; absent means the subface did not materialize (explicit degrade). */
  readonly catalog?: readonly ProactiveCatalogEntry[]
  /** Locally remembered watch acceptances; each one whose title never appears in the catalog
   * renders the honest "说了替你盯但没盯上" row (Q5 minimal failure visibility). */
  readonly acceptedWatches?: readonly AcceptedWatch[]
  /** Unanswered questions in sessions the capture row does NOT own (261019). The capture row
   *  keeps its own session's pending interaction to avoid a double count; the panel wires these
   *  from the platform's SessionStatus map. */
  readonly openQuestions?: number
  readonly now: Date
}

export type ProactiveRow =
  | { readonly kind: 'due-no-result', readonly matterId: string, readonly title: string, readonly dueAt: string, readonly daysOverdue: number, readonly extraCount?: number }
  | { readonly kind: 'waiting-for-you', readonly pendingProposals: number, readonly unclaimed: number, readonly openQuestions: number }
  | { readonly kind: 'next-look', readonly title: string, readonly nextAt: string, readonly lateByMs?: number, readonly overdueByMs?: number, readonly duplicates?: number }
  | { readonly kind: 'watch-mismatch', readonly title: string }
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
      // 261019: "no result in the ledger" means no committed RESULT, not no activity. The live
      // m-1 case had a claim and two updates after its promised date — all saying "still not
      // arrived" — and the old any-receipt rule hid exactly the row this feature exists to show.
      const resultAfterDue = projection.receipts.some(receipt =>
        receipt.matterId === matter.id
        && (receipt.status === undefined || receipt.status === 'committed')
        && receipt.kind !== undefined && RESULT_RECEIPT_KINDS.has(receipt.kind)
        && Date.parse(receipt.submittedAt) > Date.parse(dueAt))
      if (resultAfterDue) return undefined
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
      // 261019 (BUG-023): an active rule whose stored instant is already past and that has no
      // delivery record would otherwise be announced as "它下次替你看：… · <past>". State the
      // fact (the look is late) instead of claiming a future look; the desk never acts on it.
      const overdueByMs = nowMs - earliestAt
      rows.push({
        kind: 'next-look',
        title: earliest.title,
        nextAt: earliest.scheduledAt,
        ...(lateByMs > LATE_DELIVERY_MS ? { lateByMs } : {}),
        ...(overdueByMs > 0 ? { overdueByMs } : {}),
        ...(duplicates >= 2 ? { duplicates } : {}),
      })
    }
  }

  // Q5 (adjudicated minimal failure visibility): a remembered acceptance whose title never
  // shows up in the catalog says so — one honest row per orphaned acceptance, no attribution.
  // 261019: one row per TITLE, not per click. Retrying appended another acceptance for the same
  // title, which stacked identical rows (and collided on their React keys) with no way to clear
  // them; repeated acceptances of one watch are still one watch.
  if (catalog !== undefined && input.acceptedWatches !== undefined) {
    const knownTitles = new Set(catalog.map(entry => entry.title))
    const reported = new Set<string>()
    for (const accepted of input.acceptedWatches) {
      if (knownTitles.has(accepted.title) || reported.has(accepted.title)) continue
      reported.add(accepted.title)
      rows.push({ kind: 'watch-mismatch', title: accepted.title })
    }
  }

  return rows
}

/**
 * Remember one watch acceptance, keeping at most one per title (261019). Re-accepting the same
 * watch replaces the remembered click instead of appending a second identical failure row.
 * @param state - The current client-local UI state.
 * @param watch - The acceptance just recorded (the retry lane's id carries the title itself).
 * @returns A new state; `ignored` is carried through unchanged.
 */
export function rememberAcceptedWatch(state: ProactiveUiState, watch: AcceptedWatch): ProactiveUiState {
  return { ignored: state.ignored, accepted: [...state.accepted.filter(item => item.title !== watch.title), watch] }
}

/**
 * Drop every remembered acceptance for one title — the mismatch row's 忽略. The schedules
 * themselves are untouched: only the client's memory of a failed acceptance is forgotten.
 * @param state - The current client-local UI state.
 * @param title - The watch title to forget.
 * @returns A new state without that title; `ignored` is carried through unchanged.
 */
export function forgetAcceptedWatch(state: ProactiveUiState, title: string): ProactiveUiState {
  return { ignored: state.ignored, accepted: state.accepted.filter(item => item.title !== title) }
}
