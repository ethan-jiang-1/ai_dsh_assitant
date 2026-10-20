/**
 * The approval ledger of the home: one append-only JSONL line per governance transition
 * (`<dataDir>/audit/approvals.jsonl`) — a knowledge page promoted or deprecated, a skill
 * proposal landed. The line names what changed, when, and which lane caused it, so a flip can
 * never happen invisibly (BUG-004, 2026-10-07: the model path used to leave zero durable
 * records outside the session log, and the human lane's ledger sat empty).
 *
 * The ledger is detection, not prevention: a forged prompt can still cause a flip — full
 * prevention needs the direct-call seam (see the approve-direct-call card: strict codec and the
 * read-only workspaceFiles remote block it upstream). Model-turn lines correlate with their
 * session through the tool call in that session's log; panel lines carry the session id the
 * panel supplied.
 *
 * @module
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import type { ApprovalLine, ReceiptRoom } from '../domain/maintenance/receipt.ts'

/** Which lane caused a governance transition. */
export type ApprovalSource = 'assistant_reflect' | 'panel-direct'

/** Which transition one ledger line records. */
export type ApprovalKind = 'promote' | 'deprecate' | 'land' | 'correct' | 'retire'

/** Caller-supplied context for one ledger line. */
export interface ApprovalAuditOptions {
  readonly source?: ApprovalSource
  readonly sessionId?: string
  readonly title?: string
  /** State before the transition (panel direct writes); absent on older lines and model-path lines. */
  readonly before?: unknown
  /** State after the transition (panel direct writes); absent on older lines and model-path lines. */
  readonly after?: unknown
  /** Which room the transition belongs to (panel direct writes); absent on older lines. */
  readonly room?: ReceiptRoom
}

/** The structural slice of the home service the ledger writes under (layout-owned paths). */
interface AuditHost {
  readonly paths: { readonly auditDir: string; readonly approvalsLedgerFile: string }
}

/**
 * Append one transition to the approval ledger.
 * @param host - the home service whose layout carries the audit paths.
 * @param kind - which transition happened.
 * @param id - the page or skill id the transition applied to.
 * @param options - lane context; `source` defaults to the reflect tool's model turn.
 */
export async function recordApproval(host: AuditHost, kind: ApprovalKind, id: string, options: ApprovalAuditOptions = {}): Promise<void> {
  await mkdir(host.paths.auditDir, { recursive: true })
  const line = JSON.stringify({
    at: new Date().toISOString(),
    kind,
    id,
    ...(options.title !== undefined ? { title: options.title } : {}),
    ...(options.sessionId !== undefined ? { sessionId: options.sessionId } : {}),
    ...(options.before !== undefined ? { before: options.before } : {}),
    ...(options.after !== undefined ? { after: options.after } : {}),
    ...(options.room !== undefined ? { room: options.room } : {}),
    source: options.source ?? 'assistant_reflect',
  }) + '\n'
  await appendFile(host.paths.approvalsLedgerFile, line, 'utf8')
}

/**
 * Read the newest ledger lines for the maintenance receipt.
 * @param host - the home service whose layout carries the audit paths.
 * @param limit - maximum lines returned, newest last.
 * @returns Parsed lines; unreadable lines are skipped rather than failing the whole receipt.
 */
export async function readApprovals(host: AuditHost, limit: number = 200): Promise<readonly ApprovalLine[]> {
  const text = await readFile(host.paths.approvalsLedgerFile, 'utf8').catch(() => undefined)
  if (text === undefined) return []
  const lines: ApprovalLine[] = []
  for (const raw of text.split('\n')) {
    if (raw.trim().length === 0) continue
    try {
      const parsed = JSON.parse(raw) as Partial<ApprovalLine>
      if (typeof parsed.at === 'string' && typeof parsed.kind === 'string' && typeof parsed.id === 'string') {
        lines.push(parsed as ApprovalLine)
      }
    } catch { /* a corrupt line must not hide the rest of the receipt */ }
  }
  return lines.slice(-Math.max(1, limit))
}
