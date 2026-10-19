/**
 * The maintenance receipt: "what changed in the four rooms since the principal last looked".
 *
 * Pure arithmetic over two durable facts — the room rows' own `updated`/`learnedAt` stamps and
 * the approval ledger's `at` lines. It deliberately ignores skills' `lastUsedAt` (a load is not a
 * content change), deduplicates a ledger line against the room row it produced, and never asks a
 * model to phrase the result: the grouped counts are the human sentence.
 *
 * No new SessionEvent, no server-side baseline. The caller owns the `since` marker (the client
 * stores it in localStorage) and passes it in.
 *
 * @module dsh-smart-assistant/domain/maintenance/receipt
 */

/** One room in the receipt. */
export type ReceiptRoom = 'memory' | 'knowledge' | 'research' | 'skills'

/** The four rooms' row slice the receipt needs (structural subset of the client's `DeskData`). */
export interface ReceiptRow {
  readonly id?: string
  readonly name?: string
  readonly title?: string
  readonly question?: string
  readonly text?: string
  readonly status?: string
  readonly kind?: string
  /** Memory/knowledge/research content stamp. */
  readonly updated?: string
  /** Learned-skill content stamp (not `lastUsedAt`). */
  readonly learnedAt?: string
  /** Present on skills but deliberately ignored: a load is not a content change. */
  readonly lastUsedAt?: string
}

/** A rooms projection as the receipt sees it. */
export interface ReceiptSnapshot {
  readonly generatedAt?: string
  readonly revision?: string
  readonly memories?: readonly ReceiptRow[]
  readonly knowledge?: readonly ReceiptRow[]
  readonly research?: readonly ReceiptRow[]
  readonly skills?: readonly ReceiptRow[]
}

/** One approval ledger line (the subset shared by the host and the client). */
export interface ApprovalLine {
  readonly at: string
  readonly kind: string
  readonly id: string
  readonly title?: string
  readonly sessionId?: string
  readonly room?: ReceiptRoom
  readonly source?: string
  readonly before?: unknown
  readonly after?: unknown
}

/** One change the receipt reports. */
export interface ReceiptChange {
  readonly room: ReceiptRoom
  readonly kind: string
  readonly id: string
  readonly title?: string
  readonly at: string
  readonly detail?: string
}

/** The grouped receipt. */
export interface Receipt {
  readonly since?: string
  readonly generatedAt?: string
  readonly changes: readonly ReceiptChange[]
  readonly counts: Readonly<Record<ReceiptRoom, number>>
  readonly total: number
}

const EMPTY_COUNTS: Readonly<Record<ReceiptRoom, number>> = { memory: 0, knowledge: 0, research: 0, skills: 0 }

function stamp(value: string | undefined): number | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function rowId(row: ReceiptRow): string {
  return row.id ?? row.name ?? ''
}

function rowTitle(row: ReceiptRow): string | undefined {
  return row.title ?? row.question ?? row.text ?? row.name
}

/** Which room a ledger line belongs to; explicit `room` first, then the kind, then the id shape. */
function roomOf(line: ApprovalLine, snapshot: ReceiptSnapshot): ReceiptRoom {
  if (line.room !== undefined) return line.room
  if (line.kind === 'promote' || line.kind === 'deprecate') return 'knowledge'
  if (line.kind === 'correct') return 'memory'
  if (line.kind === 'land') return 'skills'
  if (line.kind === 'retire') {
    const skills = snapshot.skills ?? []
    return skills.some(skill => rowId(skill) === line.id) ? 'skills' : 'memory'
  }
  return 'memory'
}

function ledgerKind(line: ApprovalLine): string {
  switch (line.kind) {
    case 'promote': return 'approved'
    case 'deprecate': return 'deprecated'
    case 'correct': return 'corrected'
    case 'retire': return 'retired'
    case 'land': return 'landed'
    default: return line.kind
  }
}

/**
 * Build the receipt since one marker.
 * @param snapshot - The four rooms as the route/client currently sees them.
 * @param ledger - The approval ledger lines (oldest first or any order; sorted here).
 * @param since - ISO marker; `undefined` means "first look", which yields an empty receipt.
 * @returns Grouped changes, per-room counts and the total.
 */
export function buildReceipt(
  snapshot: ReceiptSnapshot,
  ledger: readonly ApprovalLine[] | undefined,
  since: string | undefined,
): Receipt {
  const sinceMs = stamp(since)
  if (sinceMs === undefined) return {
    ...(snapshot.generatedAt === undefined ? {} : { generatedAt: snapshot.generatedAt }),
    changes: [], counts: EMPTY_COUNTS, total: 0,
  }
  const counts: Record<ReceiptRoom, number> = { ...EMPTY_COUNTS }
  const changes: ReceiptChange[] = []
  const seen = new Set<string>()

  for (const line of ledger ?? []) {
    const at = stamp(line.at)
    if (at === undefined || at <= sinceMs) continue
    const room = roomOf(line, snapshot)
    const key = `${room}:${line.id}`
    if (seen.has(key)) continue
    seen.add(key)
    counts[room] += 1
    // A correct line's human title is the corrected text; the A2 route may omit `title`, so the
    // ledger's own `after.text` is the honest fallback.
    const afterText = line.after !== null && typeof line.after === 'object' && 'text' in line.after
      && typeof (line.after as { text?: unknown }).text === 'string' ? (line.after as { text: string }).text : undefined
    const title = line.title ?? afterText
    changes.push({
      room,
      kind: ledgerKind(line),
      id: line.id,
      ...(title === undefined ? {} : { title }),
      at: line.at,
    })
  }

  const rooms: readonly [ReceiptRoom, readonly ReceiptRow[] | undefined, (row: ReceiptRow) => string | undefined][] = [
    ['memory', snapshot.memories, row => row.updated],
    ['knowledge', snapshot.knowledge, row => row.updated],
    ['research', snapshot.research, row => row.updated],
    ['skills', snapshot.skills, row => row.learnedAt],
  ]
  for (const [room, rows, field] of rooms) {
    for (const row of rows ?? []) {
      const id = rowId(row)
      if (id.length === 0) continue
      const at = field(row)
      const atMs = stamp(at)
      if (at === undefined || atMs === undefined || atMs <= sinceMs) continue
      const key = `${room}:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      counts[room] += 1
      const title = rowTitle(row)
      changes.push({
        room,
        kind: 'updated',
        id,
        ...(title === undefined ? {} : { title }),
        at,
        ...(row.status !== undefined ? { detail: row.status } : {}),
      })
    }
  }

  changes.sort((left, right) => (Date.parse(right.at) - Date.parse(left.at)))
  return {
    ...(since === undefined ? {} : { since }),
    ...(snapshot.generatedAt === undefined ? {} : { generatedAt: snapshot.generatedAt }),
    changes,
    counts,
    total: changes.length,
  }
}
