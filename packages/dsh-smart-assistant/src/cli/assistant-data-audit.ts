/**
 * One append-only audit line shared by purge and rotation. Kept tiny and dependency-free so the
 * maintenance modules do not import the whole data CLI.
 *
 * @module dsh-smart-assistant/cli/assistant-data-audit
 */
import { closeSync, fsyncSync, openSync, writeSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Append one line to a local audit ledger and fsync it before returning. */
export async function appendAuditLine(path: string, line: Readonly<Record<string, unknown>>): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const fd = openSync(path, 'a', 0o600)
  try {
    writeSync(fd, `${JSON.stringify(line)}\n`)
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}
