#!/usr/bin/env node
/**
 * One command for the stage-close evidence lane: the fast floor plus the lanes that
 * `pnpm check` deliberately leaves out (real Chrome/DOM, upgrade data boundary, release
 * install shape). The point is not to replace `verify` — it is to stop the hand-rolled
 * four-command sequence from being remembered differently on every stage close.
 *
 * Status semantics follow the repo's evidence policy:
 *   0 = PASS, 2 = BLOCKED (environment missing; not green, not a product red), anything else = FAIL.
 * A failing floor stops the run: the later lanes would only diagnose a tree that cannot build.
 * A blocked lane does not stop the run; the summary still names every lane's state.
 *
 * Usage:
 *   pnpm check:full [--list]
 *
 * `--list` prints the lane order and exits without running anything. Every lane is a normal
 * package script, so the command that actually ran is visible in the output.
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const args = process.argv.slice(2)

const LANES = [
  { name: 'floor', script: 'check', detail: 'typecheck + full vitest + verify' },
  { name: 'web-face', script: 'web-face-check', args: ['--all'], detail: 'real Chrome/DOM, customer + product + viki' },
  { name: 'upgrade', script: 'upgrade-smoke', detail: 'upgrade/remove/re-add keeps both data directories' },
  { name: 'release', script: 'release-smoke', detail: 'tarball install + composition (live turn may be BLOCKED)' },
]

if (args.includes('--list')) {
  for (const lane of LANES) console.log(`${lane.name.padEnd(9)} pnpm ${lane.script}${lane.args === undefined ? '' : ` ${lane.args.join(' ')}`} — ${lane.detail}`)
  process.exit(0)
}

/** Classify one child status under the repo's PASS/BLOCKED/FAIL policy. */
export function classify(status) {
  if (status === 0) return 'pass'
  if (status === 2) return 'blocked'
  return 'fail'
}

const results = []
for (const lane of LANES) {
  console.log(`\n── check-full: ${lane.name} (pnpm ${lane.script}${lane.args === undefined ? '' : ` ${lane.args.join(' ')}`})`)
  const result = spawnSync('pnpm', [lane.script, ...(lane.args ?? [])], { cwd: root, stdio: 'inherit' })
  const state = result.error === undefined ? classify(result.status ?? 1) : 'fail'
  results.push({ ...lane, state, status: result.status })
  if (lane.name === 'floor' && state === 'fail') break
}

const passed = results.filter(result => result.state === 'pass')
const blocked = results.filter(result => result.state === 'blocked')
const failed = results.filter(result => result.state === 'fail')
console.log('\n── check-full summary')
for (const result of results) console.log(`  ${result.state.padEnd(7)} ${result.name}${result.status === undefined ? '' : ` (exit ${String(result.status)})`}`)
if (failed.length > 0) {
  console.error(`check-full: FAIL — ${passed.length} passed, ${blocked.length} blocked, ${failed.length} failed`)
  process.exit(1)
}
if (blocked.length > 0) {
  console.error(`check-full: BLOCKED — ${passed.length} passed, ${blocked.length} blocked; no lane failed`)
  process.exit(2)
}
console.log(`check-full: PASS — ${passed.length} lane(s) passed`)
