/**
 * `assistantOperatingLedger`: the authoritative operating ledger service (the operating desk's
 * ledger contract, [desk-operating-entry](../../../../../notes/implemented/2026-10-06-desk-operating-entry.md)) — the single Host writer over the separate `assistant-operating` data directory.
 *
 * Business semantics are the settled CEO operating-loop card's V1–V5/V7 via the pure core in
 * `src/domain/operating/ledger.ts`; this service owns the writer claim, persistence, and the
 * clock. Every state change is an operation with a caller-supplied identity and yields a
 * durable receipt; materials survive conflicts; a second writer on the same directory is
 * refused.
 *
 * Writer exclusivity (V2: "not merely in-process"): a `writer.lock` file carries
 * `{hostname, pid, acquiredAt}`; a second claim is refused while the holder process is alive,
 * and a lock left by a dead process on this host is taken over. Carrier: one `ledger.json`
 * state file written atomically (temp file, fsync, rename) — the event-sourcing carrier was
 * deferred by the settled card's route comparison.
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { expandHomePath, resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs'
import { hostname } from 'node:os'
import { join, resolve } from 'node:path'
import { EMPTY_LEDGER, applyOperation, canonicalJson, reviveLedgerState, type LedgerOperation, type LedgerState, type MatterRecord, type OperationReceipt, type OperationRecord, type UnclaimedMaterial } from '../../domain/operating/ledger.ts'
import { OPERATIONS_ARCHIVE_FILE, mergeOperations, parseOperationsArchive, serializeOperationRecord } from './archive.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    assistantOperatingLedger: AssistantOperatingLedger
  }
}

/** Deployment configuration for the ledger. */
export interface Config {
  /** Ledger root. Omitted resolves the separate `<dshHome>/assistant-operating` home. */
  readonly dataDir?: string
  /**
   * Recent operations kept in `ledger.json` before older ones move to the archive. Compaction
   * runs at twice this value, leaving this many. Defaults to {@link MAX_RECENT_OPERATIONS}.
   */
  readonly keepOperations?: number
}

/** Default recent-operation window; the file stays bounded while receipts remain readable. */
export const MAX_RECENT_OPERATIONS = 256

/** Resolved writer-lock holder identity. */
interface WriterLock {
  readonly hostname: string
  readonly pid: number
  readonly acquiredAt: string
  /** The holder's working directory at claim time; absent on locks written before 2026-10-25. */
  readonly cwd?: string
}

/** Ledger data directories claimed by a live service in this process. */
const activeWriters = new Set<string>()

/**
 * Whether `pid` names a live process. `EPERM` means alive under another user (fail closed).
 * @param pid - Process id to probe.
 * @returns `true` when the process exists.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Claim the single-writer role for `dataDir`: refuse live holders, take over dead ones.
 * @param dataDir - Ledger directory to claim.
 * @throws When this process already claims the directory, or a live foreign writer does.
 */
function claimWriter(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  if (activeWriters.has(dataDir)) {
    throw new Error(`operating ledger at ${dataDir} already has an active writer in this process; refusing a second writer`)
  }
  const lockPath = join(dataDir, 'writer.lock')
  const identity = `${JSON.stringify({ hostname: hostname(), pid: process.pid, acquiredAt: new Date().toISOString(), cwd: process.cwd() })}\n`
  try {
    writeFileSync(lockPath, identity, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    const holder = readHolder(lockPath)
    if (holder !== undefined && holder.hostname === hostname() && !isProcessAlive(holder.pid)) {
      // The holder process is gone (crash); take the claim over so a restart is not blocked.
      const takeover = `${lockPath}.takeover`
      writeFileSync(takeover, identity, { flag: 'wx', mode: 0o600 })
      renameSync(takeover, lockPath)
    } else {
      throw new Error(refusalMessage(dataDir, lockPath, holder))
    }
  }
  activeWriters.add(dataDir)
}

/**
 * The refusal a second writer sees. A bare "refusing" leaves the principal with a dead button and
 * no way out (BUG-026: a long-lived experiment held the lock and the live instance could not
 * write for an hour). Name the holder and give the one safe recovery; never invite deleting the
 * lock while the holder may still write — two writers lose updates.
 * @param dataDir - Ledger directory.
 * @param lockPath - Lock file path.
 * @param holder - Parsed holder, or undefined for an unreadable lock.
 * @returns The error message.
 */
function refusalMessage(dataDir: string, lockPath: string, holder: WriterLock | undefined): string {
  if (holder === undefined) {
    return [
      `operating ledger at ${dataDir} is owned by another writer; refusing a second writer.`,
      `lock: ${lockPath} (unreadable)`,
      'if no other process is writing this ledger, move that file aside and retry; otherwise leave it alone.',
    ].join('\n')
  }
  const who = `host ${holder.hostname}, pid ${holder.pid}${holder.cwd === undefined ? '' : `, cwd ${holder.cwd}`}, holding since ${holder.acquiredAt}`
  if (holder.hostname !== hostname()) {
    return [
      `operating ledger at ${dataDir} is owned by another writer (${who}); refusing a second writer.`,
      `lock: ${lockPath}`,
      'that host is not this machine: confirm it is gone before moving the lock file aside.',
    ].join('\n')
  }
  return [
    `operating ledger at ${dataDir} is owned by another writer (${who}); refusing a second writer.`,
    `lock: ${lockPath}`,
    `if pid ${holder.pid} is idle, stop it with \`kill -TERM ${holder.pid}\` and retry; a dead holder is taken over on the next write.`,
    'do not delete the lock file while the holder may still write — two writers lose updates.',
  ].join('\n')
}

/**
 * Parse the holder identity out of a lock file.
 * @param lockPath - Lock file to read.
 * @returns The holder, or `undefined` when the file is unreadable or not a valid identity.
 */
function readHolder(lockPath: string): WriterLock | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(lockPath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) return undefined
    const { hostname: holderHost, pid, acquiredAt, cwd } = parsed as Record<string, unknown>
    if (typeof holderHost !== 'string' || typeof pid !== 'number' || typeof acquiredAt !== 'string') return undefined
    return { hostname: holderHost, pid, acquiredAt, ...(typeof cwd === 'string' && cwd !== '' ? { cwd } : {}) }
  } catch {
    // A lock file we cannot parse is treated as a live foreign holder (fail closed).
    return undefined
  }
}

/**
 * Release the writer claim for `dataDir`; safe to call more than once.
 * @param dataDir - Claimed ledger directory.
 */
function releaseWriter(dataDir: string): void {
  if (!activeWriters.has(dataDir)) return
  activeWriters.delete(dataDir)
  rmSync(join(dataDir, 'writer.lock'), { force: true })
}

/**
 * Load the ledger state file; a missing file is an empty ledger, a corrupt one fails loud.
 * @param dataDir - Ledger directory.
 * @returns The persisted state, or the empty ledger.
 * @throws When the state file exists but is not readable v1 ledger JSON.
 */
function loadState(dataDir: string): LedgerState {
  const path = join(dataDir, 'ledger.json')
  if (!existsSync(path)) return EMPTY_LEDGER
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`operating ledger state at ${path} is corrupt (${(error as Error).message}); refusing to treat it as empty`)
  }
  try {
    return reviveLedgerState(parsed)
  } catch {
    throw new Error(`operating ledger state at ${path} is not a v1 ledger; refusing to treat it as empty`)
  }
}

/**
 * The operating ledger service. One instance per process, mounted from the host composition.
 * Boot is side-effect free: the writer claim is taken at the first mutating operation (so a
 * web profile and a one-shot task on the same home coexist until one of them writes), and
 * reads always reload the persisted state.
 */
export class AssistantOperatingLedger extends Service {
  /** Resolved ledger directory. */
  readonly dataDir: string

  private state: LedgerState

  private claimed = false

  /** Recent-operation window; older records live in the append-only archive. */
  private readonly keepOperations: number

  /** Parsed archive cache keyed by file size+mtime, so reads do not rescan on every call. */
  private archiveCache: { readonly stamp: string, readonly records: readonly OperationRecord[] } | undefined

  /**
   * @param ctx - Owning context.
   * @param config - Deployment configuration; see {@link Config}.
   */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'assistantOperatingLedger')
    this.dataDir = config.dataDir === undefined || config.dataDir.trim() === ''
      ? join(resolveDshHome(), 'assistant-operating')
      : resolve(expandHomePath(config.dataDir))
    this.keepOperations = config.keepOperations !== undefined && Number.isSafeInteger(config.keepOperations) && config.keepOperations > 0
      ? config.keepOperations
      : MAX_RECENT_OPERATIONS
    this.state = loadState(this.dataDir)
    ctx.effect(() => () => {
      if (this.claimed) releaseWriter(this.dataDir)
    })
  }

  /**
   * Submit one operation; the receipt is durable once returned. The first mutating call takes
   * the single-writer claim; a second writer (this process or a live foreign one) is refused
   * here with a clear report.
   * @param operation - The caller-submitted operation; `operationId` is the idempotency key.
   * @returns The receipt for this submission.
   */
  async submitOperation(operation: LedgerOperation): Promise<OperationReceipt> {
    if (!this.claimed) {
      claimWriter(this.dataDir)
      this.claimed = true
    }
    const now = new Date().toISOString()
    // A retry may name an operation that compaction moved out of `ledger.json`. Replay the
    // archived identity exactly as the state path would, instead of applying it a second time.
    const known = this.lookupOperation(operation.operationId)
    if (known !== undefined) {
      if (canonicalJson(known.operation) === canonicalJson(operation)) return known.receipt
      return {
        operationId: operation.operationId,
        matterId: known.receipt.matterId,
        submittedAt: now,
        outcome: { status: 'rejected', reason: 'operation-content-mismatch' },
      }
    }
    const { state, receipt } = applyOperation(this.state, operation, now)
    if (state !== this.state) {
      this.persist(state)
      this.state = state
      this.compactIfNeeded()
    }
    return receipt
  }

  /**
   * Read one operation's durable receipt.
   * @param operationId - Operation id.
   * @returns The receipt, or `undefined` when no such operation was submitted.
   */
  async readOperation(operationId: string): Promise<OperationReceipt | undefined> {
    return this.lookupOperation(operationId)?.receipt
  }

  /**
   * Read the durable operation and its receipt, including the source needed for audit.
   * @param operationId - Operation id.
   * @returns The submitted operation and receipt, or `undefined` when no such operation exists.
   */
  async readOperationRecord(operationId: string): Promise<OperationRecord | undefined> {
    return this.lookupOperation(operationId)
  }

  /**
   * Read one matter by id.
   * @param id - Matter id.
   * @returns The matter, or `undefined` when no such matter exists.
   */
  async readMatter(id: string): Promise<MatterRecord | undefined> {
    return this.current().matters[id]
  }

  /**
   * Read a matter with its durable operation history from one ledger revision.
   * @param matterId - Matter whose snapshot is requested.
   * @returns The matter and only its ordered operation records, or `undefined` when absent.
   */
  async readMatterSnapshot(matterId: string): Promise<{
    readonly matter: MatterRecord
    readonly operations: readonly OperationRecord[]
  } | undefined> {
    const state = this.current()
    const matter = state.matters[matterId]
    if (matter === undefined) return undefined
    const operations = this.allOperationRecords()
      .filter(record => record.receipt.matterId === matterId)
      .sort((left, right) => left.receipt.submittedAt.localeCompare(right.receipt.submittedAt)
        || left.receipt.operationId.localeCompare(right.receipt.operationId))
    return { matter, operations }
  }

  /**
   * List all matters in creation order.
   * @returns Every matter in the ledger.
   */
  async listMatters(): Promise<readonly MatterRecord[]> {
    return Object.values(this.current().matters)
  }

  /**
   * List retained materials that no explicit claim has attached to a matter yet.
   * @returns Every unclaimed material in retention order.
   */
  async readUnclaimed(): Promise<readonly UnclaimedMaterial[]> {
    return Object.values(this.current().unclaimed)
  }

  /**
   * Release the writer role; safe to call more than once and when never claimed.
   */
  async stop(): Promise<void> {
    if (this.claimed) {
      releaseWriter(this.dataDir)
      this.claimed = false
    }
  }

  /**
   * Reload the persisted state, so reads see the latest durable truth even when another
   * process wrote since this instance booted.
   * @returns The freshly loaded state.
   */
  private current(): LedgerState {
    this.state = loadState(this.dataDir)
    return this.state
  }

  /** The archive path beside `ledger.json`. */
  private archivePath(): string {
    return join(this.dataDir, OPERATIONS_ARCHIVE_FILE)
  }

  /**
   * Read the append-only archive, cached by size+mtime. A corrupt line is counted by the parser
   * and skipped; one torn append must not make every older receipt unreadable.
   */
  private readArchive(): readonly OperationRecord[] {
    const path = this.archivePath()
    if (!existsSync(path)) return []
    const info = statSync(path)
    const stamp = `${info.size}:${info.mtimeMs}`
    if (this.archiveCache?.stamp === stamp) return this.archiveCache.records
    const parsed = parseOperationsArchive(readFileSync(path, 'utf8'))
    this.archiveCache = { stamp, records: parsed.records }
    return parsed.records
  }

  /** Current-state record first, then the archive; the state copy is the freshest. */
  private lookupOperation(operationId: string): OperationRecord | undefined {
    const fromState = this.current().operations[operationId]
    if (fromState !== undefined) return fromState
    return this.readArchive().find(record => record.operation.operationId === operationId)
  }

  /** Every operation the ledger has ever applied, state and archive merged by identity. */
  private allOperationRecords(): OperationRecord[] {
    return mergeOperations(Object.values(this.current().operations), this.readArchive())
  }

  /**
   * Move the oldest operations into the append-only archive when the current state has grown past
   * twice the recent window. The archive is fsynced before the reduced state replaces the full
   * one, so an interrupted compaction leaves at worst duplicate archive lines, never a lost
   * receipt.
   */
  private compactIfNeeded(): void {
    const entries = Object.entries(this.state.operations)
    if (entries.length <= this.keepOperations * 2) return
    const sorted = entries.sort(([, left], [, right]) => left.receipt.submittedAt.localeCompare(right.receipt.submittedAt)
      || left.receipt.operationId.localeCompare(right.receipt.operationId))
    const archived = sorted.slice(0, sorted.length - this.keepOperations).map(([, record]) => record)
    this.appendArchive(archived)
    const next: LedgerState = {
      ...this.state,
      operations: Object.fromEntries(sorted.slice(-this.keepOperations)),
    }
    this.persist(next)
    this.state = next
    this.archiveCache = undefined
  }

  /** Append operation records to the archive and fsync before returning. */
  private appendArchive(records: readonly OperationRecord[]): void {
    if (records.length === 0) return
    mkdirSync(this.dataDir, { recursive: true, mode: 0o700 })
    const fd = openSync(this.archivePath(), 'a', 0o600)
    try {
      writeSync(fd, `${records.map(serializeOperationRecord).join('\n')}\n`)
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
  }

  /**
   * Persist the next state atomically: temp file, fsync, rename over `ledger.json`.
   * @param state - The state to persist.
   */
  private persist(state: LedgerState): void {
    const tmp = join(this.dataDir, 'ledger.json.tmp')
    const fd = openSync(tmp, 'w', 0o600)
    try {
      writeSync(fd, JSON.stringify(state))
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tmp, join(this.dataDir, 'ledger.json'))
  }
}

export default AssistantOperatingLedger
