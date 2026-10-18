#!/usr/bin/env node
/**
 * proactive-idle-probe — the「它替你看过」zero-cost witness (261018 proactive 片 1, acceptance row 4).
 *
 * What it proves: over a window longer than the desk's 30s projection poll, an idle-but-rendered
 * desk writes NOTHING — no new session logs (a model round is the only thing that creates one),
 * no ledger bytes, no schedule-storage bytes. The projection endpoint is contractually a fixed
 * read-only GET (docs/operating.md) and the catalog rides read-only RPCs, so file-level
 * invariance across the window is the honest zero-model-call/zero-write judgment.
 *
 * Usage: node dev/probes/web/proactive-idle-probe.mjs [--home <dsh-home>] [--window-ms 35000]
 * Exit 0 + JSON verdict on stdout; exit 1 if ANY watched surface moved (that is the red shape).
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..')
const args = process.argv.slice(2)
const option = (flag, fallback) => {
  const hit = args.findIndex(a => a === flag)
  return hit >= 0 && args[hit + 1] !== undefined ? args[hit + 1] : fallback
}
const home = option('--home', join(repoRoot, 'dev', 'harness-home'))
const windowMs = Number(option('--window-ms', '35000'))

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const fileState = (path) => {
  try { return sha256(path) } catch { return 'absent' }
}
const countSessionLogs = (root) => {
  // Layout: sessions/<workspace-dir>/<session-dir>/session.v*.jsonl[.zstd] — two directory levels.
  let count = 0
  const sessionsDir = join(root, 'sessions')
  try {
    for (const workspace of readdirSync(sessionsDir, { withFileTypes: true })) {
      if (!workspace.isDirectory()) continue
      for (const session of readdirSync(join(sessionsDir, workspace.name), { withFileTypes: true })) {
        if (!session.isDirectory()) continue
        for (const file of readdirSync(join(sessionsDir, workspace.name, session.name))) {
          if (/^session\.v\d+\.jsonl/.test(file)) count += 1
        }
      }
    }
  } catch { /* no sessions dir = 0 logs */ }
  return count
}
const sample = (label) => ({
  label,
  at: new Date().toISOString(),
  sessions: countSessionLogs(home),
  ledger: fileState(join(home, 'assistant-operating', 'ledger.json')),
  schedule: fileState(join(home, 'storages', 'schedule.json')),
})

const before = sample('before')
await new Promise(resolve => setTimeout(resolve, windowMs))
const after = sample('after')

const stable = before.sessions === after.sessions
  && before.ledger === after.ledger
  && before.schedule === after.schedule
const verdict = {
  probe: 'proactive-idle-probe',
  windowMs,
  home,
  before,
  after,
  verdict: stable ? 'PASS' : 'FAIL',
  meaning: stable
    ? 'idle desk wrote nothing across the window: zero model calls, zero ledger bytes, zero schedule bytes'
    : 'a watched surface moved during the idle window — treat as a regression',
}
console.log(JSON.stringify(verdict, null, 2))
process.exit(stable ? 0 : 1)
