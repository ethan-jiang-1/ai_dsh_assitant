/**
 * `assistantOperatingLedger`: the authoritative operating ledger service (desk-operating-entry
 * K3, slice A) — the single Host writer over the separate `assistant-operating` data directory.
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
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { hostname } from 'node:os'
import { join } from 'node:path'
import { EMPTY_LEDGER, applyOperation, type LedgerOperation, type LedgerState, type MatterRecord, type OperationReceipt, type UnclaimedMaterial } from '../../domain/operating/ledger.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    assistantOperatingLedger: AssistantOperatingLedger
  }
}

/** Deployment configuration for the ledger. */
export interface Config {
  /** Ledger root. Omitted resolves the separate `<dshHome>/assistant-operating` home. */
  readonly dataDir?: string
}

/** Resolved writer-lock holder identity. */
interface WriterLock {
  readonly hostname: string
  readonly pid: number
  readonly acquiredAt: string
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
  mkdirSync(dataDir, { recursive: true })
  if (activeWriters.has(dataDir)) {
    throw new Error(`operating ledger at ${dataDir} already has an active writer in this process; refusing a second writer`)
  }
  const lockPath = join(dataDir, 'writer.lock')
  const identity = `${JSON.stringify({ hostname: hostname(), pid: process.pid, acquiredAt: new Date().toISOString() })}\n`
  try {
    writeFileSync(lockPath, identity, { flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    const holder = readHolder(lockPath)
    if (holder !== undefined && holder.hostname === hostname() && !isProcessAlive(holder.pid)) {
      // The holder process is gone (crash); take the claim over so a restart is not blocked.
      const takeover = `${lockPath}.takeover`
      writeFileSync(takeover, identity, { flag: 'wx' })
      renameSync(takeover, lockPath)
    } else {
      const held = holder === undefined ? 'an unreadable lock file' : `host ${holder.hostname}, pid ${holder.pid}`
      throw new Error(`operating ledger at ${dataDir} is owned by another writer (${held}); refusing a second writer`)
    }
  }
  activeWriters.add(dataDir)
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
    const { hostname: holderHost, pid, acquiredAt } = parsed as Record<string, unknown>
    if (typeof holderHost !== 'string' || typeof pid !== 'number' || typeof acquiredAt !== 'string') return undefined
    return { hostname: holderHost, pid, acquiredAt }
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
  if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== 1) {
    throw new Error(`operating ledger state at ${path} is not a v1 ledger; refusing to treat it as empty`)
  }
  const state = parsed as LedgerState
  // Backfill fields added after the first slices; no released ledgers predate them.
  const matters = Object.fromEntries(Object.entries(state.matters).map(([id, matter]) => [id, { ...matter, proposals: matter.proposals ?? [] }]))
  return { ...state, matters, unclaimed: state.unclaimed ?? {}, nextUnclaimedSeq: state.nextUnclaimedSeq ?? 1 }
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

  /**
   * @param ctx - Owning context.
   * @param config - Deployment configuration; see {@link Config}.
   */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'assistantOperatingLedger')
    this.dataDir = config.dataDir === undefined || config.dataDir.trim() === ''
      ? join(resolveDshHome(), 'assistant-operating')
      : expandHomePath(config.dataDir)
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
    const { state, receipt } = applyOperation(this.state, operation, new Date().toISOString())
    if (state !== this.state) {
      this.persist(state)
      this.state = state
    }
    return receipt
  }

  /**
   * Read one operation's durable receipt.
   * @param operationId - Operation id.
   * @returns The receipt, or `undefined` when no such operation was submitted.
   */
  async readOperation(operationId: string): Promise<OperationReceipt | undefined> {
    return this.current().operations[operationId]?.receipt
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

  /**
   * Persist the next state atomically: temp file, fsync, rename over `ledger.json`.
   * @param state - The state to persist.
   */
  private persist(state: LedgerState): void {
    const tmp = join(this.dataDir, 'ledger.json.tmp')
    const fd = openSync(tmp, 'w')
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
