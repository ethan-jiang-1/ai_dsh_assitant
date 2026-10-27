/**
 * Read-only deployment status: tree/ledger health, retention readings, and the problems an
 * operator should act on. Split from the data CLI so `status`/`check` can be reviewed alone.
 *
 * @module dsh-smart-assistant/cli/assistant-data-status
 */
import { existsSync } from 'node:fs'
import { lstat, readFile, readdir, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { HOME_MANUAL_VERSION } from '../domain/home/home-map.ts'
import { credentialShapeLabels } from '../domain/skills/audit.ts'
import { OPERATIONS_ARCHIVE_FILE, parseOperationsArchive } from '../host/operating-ledger/archive.ts'

/** A read-only `check` warning threshold for the approval ledger. */
const ARCHIVE_WARN_BYTES = 64 * 1024 * 1024

const APPROVALS_WARN_BYTES = 16 * 1024 * 1024

/** A read-only `check` warning threshold for the two owned directories as one backup. */
const BACKUP_WARN_BYTES = 512 * 1024 * 1024

/** One owned directory as `status` sees it. */
export interface DataTreeStatus {
  readonly exists: boolean
  readonly files: number
  readonly bytes: number
}

/** The authoritative ledger file as `status` sees it. */
export interface DataLedgerStatus {
  readonly exists: boolean
  readonly bytes: number
  /** `missing` = no ledger yet; `invalid` = unreadable or not a v1 state. */
  readonly state: 'missing' | 'ok' | 'invalid'
  readonly version?: number
  readonly operations?: number
}

/** Retention readings for the append-only parts of the working folder. */
export interface DataRetentionStatus {
  readonly memoryArchive: DataTreeStatus
  readonly researchArchive: DataTreeStatus
  readonly skillsArchive: DataTreeStatus
  readonly skillProposals: DataTreeStatus
  readonly approvals?: { readonly bytes: number, readonly lines: number }
}

/** A read-only snapshot of the two owned directories, for deployment support. */
export interface DataStatus {
  readonly assistantDir: string
  readonly operatingDir: string
  readonly assistant: DataTreeStatus & { readonly manualVersion?: number }
  readonly operating: DataTreeStatus
  readonly ledger: DataLedgerStatus
  /** Append-only surfaces an operator may want to rotate; counts only, never a deletion plan. */
  readonly retention: DataRetentionStatus
  /** The append-only operation history, when a compacted ledger has one. */
  readonly archive?: { readonly bytes: number, readonly operations: number, readonly corruptLines: number }
}

/** A read-only diagnosis: the status plus every problem an operator should act on. */
export interface DataCheck {
  readonly status: DataStatus
  readonly problems: readonly string[]
}

async function fileCount(dir: string): Promise<{ files: number, bytes: number }> {
  if (!existsSync(dir)) return { files: 0, bytes: 0 }
  let files = 0
  let bytes = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await fileCount(path)
      files += nested.files
      bytes += nested.bytes
    } else {
      const info = await stat(path)
      files += 1
      bytes += info.size
    }
  }
  return { files, bytes }
}

function manualVersionOf(text: string): number | undefined {
  const match = /^<!--\s*home-manual v(\d+)\s*-->/u.exec(text.trimStart())
  return match?.[1] === undefined ? undefined : Number(match[1])
}

async function treeStatus(dir: string): Promise<DataTreeStatus> {
  if (!existsSync(dir)) return { exists: false, files: 0, bytes: 0 }
  return { exists: true, ...await fileCount(dir) }
}

/**
 * Read the two owned directories without changing them. Intended for the deployment support path:
 * it names the paths, sizes, manual generation, and whether the ledger parses as a v1 state.
 *
 * @param options - The two resolved directories.
 * @returns A read-only status snapshot.
 */
export async function statusData(options: { readonly assistantDir: string, readonly operatingDir: string }): Promise<DataStatus> {
  const assistantDir = resolve(options.assistantDir)
  const operatingDir = resolve(options.operatingDir)
  const assistant = await treeStatus(assistantDir)
  const operating = await treeStatus(operatingDir)
  let manualVersion: number | undefined
  try {
    manualVersion = manualVersionOf(await readFile(join(assistantDir, 'AGENTS.md'), 'utf8'))
  } catch { /* missing/unreadable manual is reported by curate, not by status */ }

  const ledgerPath = join(operatingDir, 'ledger.json')
  let ledger: DataLedgerStatus = { exists: false, bytes: 0, state: 'missing' }
  if (existsSync(ledgerPath)) {
    const bytes = (await stat(ledgerPath)).size
    try {
      const parsed: unknown = JSON.parse(await readFile(ledgerPath, 'utf8'))
      if (typeof parsed === 'object' && parsed !== null && (parsed as { version?: unknown }).version === 1) {
        const operations = (parsed as { operations?: unknown }).operations
        ledger = {
          exists: true,
          bytes,
          state: 'ok',
          version: 1,
          operations: typeof operations === 'object' && operations !== null ? Object.keys(operations).length : 0,
        }
      } else {
        ledger = { exists: true, bytes, state: 'invalid' }
      }
    } catch {
      ledger = { exists: true, bytes, state: 'invalid' }
    }
  }
  const archivePath = join(operatingDir, OPERATIONS_ARCHIVE_FILE)
  let archive: DataStatus['archive']
  if (existsSync(archivePath)) {
    const bytes = (await stat(archivePath)).size
    const parsed = parseOperationsArchive(await readFile(archivePath, 'utf8'))
    archive = { bytes, operations: parsed.records.length, corruptLines: parsed.corruptLines }
  }
  const retention: DataRetentionStatus = {
    memoryArchive: await treeStatus(join(assistantDir, 'memory', 'archive')),
    researchArchive: await treeStatus(join(assistantDir, 'research', 'archive')),
    skillsArchive: await treeStatus(join(assistantDir, 'skills', 'archive')),
    skillProposals: await treeStatus(join(assistantDir, 'skill-proposals')),
  }
  const approvalsPath = join(assistantDir, 'audit', 'approvals.jsonl')
  const approvals = existsSync(approvalsPath)
    ? {
        bytes: (await stat(approvalsPath)).size,
        lines: (await readFile(approvalsPath, 'utf8')).split('\n').filter(line => line.trim() !== '').length,
      }
    : undefined
  return {
    assistantDir,
    operatingDir,
    assistant: { ...assistant, ...(manualVersion === undefined ? {} : { manualVersion }) },
    operating,
    ledger,
    retention: { ...retention, ...(approvals === undefined ? {} : { approvals }) },
    ...(archive === undefined ? {} : { archive }),
  }
}

/** Collect symbolic links under a root; backup/restore refuses them, so diagnosis should name them. */
async function findSymlinks(root: string, found: string[] = []): Promise<string[]> {
  if (!existsSync(root)) return found
  const info = await lstat(root)
  if (info.isSymbolicLink()) {
    found.push(root)
    return found
  }
  if (!info.isDirectory()) return found
  for (const entry of await readdir(root)) {
    await findSymlinks(join(root, entry), found)
  }
  return found
}

/**
 * Read-only deployment diagnosis: path shape, ledger/archive readability, manual generation, and
 * symbolic links. It never writes; a non-empty problem list is what `assistant-data check` exits on.
 * @param options - The two directories as the operator typed them.
 * @returns The status plus actionable problems.
 */
export async function checkData(options: { readonly assistantDir: string, readonly operatingDir: string }): Promise<DataCheck> {
  const problems: string[] = []
  if (!isAbsolute(options.assistantDir)) problems.push(`working folder path is relative: ${options.assistantDir} (use an absolute path or ~)`)
  if (!isAbsolute(options.operatingDir)) problems.push(`ledger path is relative: ${options.operatingDir} (use an absolute path or ~)`)
  const status = await statusData(options)
  if (status.ledger.state === 'invalid') {
    problems.push(`ledger.json is unreadable or not a v1 state: ${join(status.operatingDir, 'ledger.json')}`)
  }
  if (status.archive !== undefined && status.archive.corruptLines > 0) {
    problems.push(`${String(status.archive.corruptLines)} unreadable line(s) in ${join(status.operatingDir, OPERATIONS_ARCHIVE_FILE)}`)
  }
  if (status.archive !== undefined && status.archive.bytes > ARCHIVE_WARN_BYTES) {
    problems.push(`operation archive is ${String(status.archive.bytes)} byte(s); export and rotate it, or expect slower reads`)
  }
  // The fixture is a simulation input. If it sits in a real operating directory, the desktop will
  // serve it as if it were the authoritative ledger whenever no ledger exists.
  const fixture = join(status.operatingDir, 'desk-projection.json')
  if (existsSync(fixture)) {
    problems.push(`desk-projection.json fixture is present at ${fixture}; it is served only when allowFixture is true — remove it unless this home is an evaluation fixture`)
  }
  if (status.retention.approvals !== undefined && status.retention.approvals.bytes > APPROVALS_WARN_BYTES) {
    problems.push(`approval ledger is larger than ${String(APPROVALS_WARN_BYTES)} byte(s); archive/rotate ${join(status.assistantDir, 'audit', 'approvals.jsonl')}`)
  }
  if (status.retention.skillProposals.files > 200) {
    problems.push(`skill-proposals inbox has ${String(status.retention.skillProposals.files)} file(s); archive landed/rejected proposals`)
  }
  const backupBytes = status.assistant.bytes + status.operating.bytes
  if (backupBytes > BACKUP_WARN_BYTES) {
    problems.push(`plugin data is ${String(backupBytes)} byte(s); a backup copies all of it (deliverables included) — export/archive by hand if this is unexpected`)
  }
  for (const path of [join(status.operatingDir, 'ledger.json'), join(status.operatingDir, OPERATIONS_ARCHIVE_FILE)]) {
    if (!existsSync(path)) continue
    const text = await readFile(path, 'utf8').catch(() => '')
    const labels = credentialShapeLabels(text)
    if (labels.length > 0) problems.push(`ledger surface ${path} carries what looks like ${labels.join(', ')} — strip it and rotate the credential if it was real`)
  }
  if (status.assistant.manualVersion !== undefined
    && status.assistant.manualVersion > 0
    && status.assistant.manualVersion < HOME_MANUAL_VERSION) {
    problems.push(`working folder manual is v${String(status.assistant.manualVersion)}; current is v${String(HOME_MANUAL_VERSION)} (the next launch migrates known text, or the prompt marks it stale)`)
  }
  for (const link of [...await findSymlinks(status.assistantDir), ...await findSymlinks(status.operatingDir)]) {
    problems.push(`symbolic link in owned data: ${link}`)
  }
  return { status, problems }
}
