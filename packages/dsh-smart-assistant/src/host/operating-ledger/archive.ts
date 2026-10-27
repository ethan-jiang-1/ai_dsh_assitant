/**
 * The operation archive: the ledger's full history after the current state file stops carrying
 * every operation. One JSON object per line, append-only. The line format is the same
 * `OperationRecord` the state used to hold, so an archived receipt is readable without a second
 * vocabulary.
 *
 * Reading is deliberately tolerant of duplicate ids (a compaction interrupted after the append
 * but before the reduced state write leaves the same record in both places); the state copy always
 * wins in {@link mergeOperations}.
 *
 * @module dsh-smart-assistant/host/operating-ledger/archive
 */
import type { OperationRecord } from '../../domain/operating/types.ts'

/** File name of the append-only operation history beside `ledger.json`. */
export const OPERATIONS_ARCHIVE_FILE = 'operations-archive.jsonl'

/** A parsed archive, including lines a reader could not understand. */
export interface ParsedArchive {
  readonly records: readonly OperationRecord[]
  /** Non-empty lines that did not parse as an operation record; surfaced for diagnosis. */
  readonly corruptLines: number
}

/** Whether a value has the two ids every receipt needs. */
function isOperationRecord(value: unknown): value is OperationRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as { operation?: unknown, receipt?: unknown }
  if (typeof record.operation !== 'object' || record.operation === null) return false
  if (typeof record.receipt !== 'object' || record.receipt === null) return false
  const operation = record.operation as { operationId?: unknown }
  const receipt = record.receipt as { operationId?: unknown }
  return typeof operation.operationId === 'string' && typeof receipt.operationId === 'string'
    && operation.operationId === receipt.operationId
}

/**
 * Parse the archive file. A corrupt line is counted, not thrown: one torn append must not make
 * every historical receipt unreadable.
 * @param text - The archive file contents.
 * @returns The readable records and the corrupt-line count.
 */
export function parseOperationsArchive(text: string): ParsedArchive {
  const records: OperationRecord[] = []
  let corruptLines = 0
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      corruptLines += 1
      continue
    }
    if (!isOperationRecord(parsed)) {
      corruptLines += 1
      continue
    }
    records.push(parsed)
  }
  return { records, corruptLines }
}

/** Serialize one record as one archive line (no trailing newline). */
export function serializeOperationRecord(record: OperationRecord): string {
  return JSON.stringify(record)
}

/**
 * Merge state and archive records for reads. The state copy wins on a duplicate id, so an
 * interrupted compaction cannot serve an older receipt for the same identity.
 * @param stateRecords - Records still in `ledger.json`.
 * @param archiveRecords - Records read from the archive.
 * @returns A deduplicated record list.
 */
export function mergeOperations(
  stateRecords: readonly OperationRecord[],
  archiveRecords: readonly OperationRecord[],
): OperationRecord[] {
  const byId = new Map<string, OperationRecord>()
  for (const record of archiveRecords) if (!byId.has(record.operation.operationId)) byId.set(record.operation.operationId, record)
  for (const record of stateRecords) byId.set(record.operation.operationId, record)
  return [...byId.values()]
}
