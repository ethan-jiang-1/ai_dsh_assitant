/**
 * Fixtures for the dev environment scripts themselves (bash probe semantics,
 * env.sh isolation exits) — dev-env behavior, not verify-gate cores.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('dev script probes: a presence check must answer both ways under bash 3.2', () => {
  /**
   * The first draft of `dev/prepare.sh` probed with `[ -e "$glob" ]`, which never expands a glob and
   * is true for any non-empty string — so every step it owned was silently skipped on a fresh clone
   * (`vendor/dsh/node_modules` was still absent) and the failure surfaced at boot as dozens of
   * "client bundle not found". `[[ -e glob ]]` is not the fix either: this repo's scripts run under
   * macOS's bash 3.2, where that does not expand globs. Only `compgen -G` answers both ways there.
   */
  const probe = pattern => {
    const script = `present() { compgen -G "$1" > /dev/null 2>&1; }; present ${JSON.stringify(pattern)}`
    try {
      execFileSync('bash', ['-c', script], { stdio: 'ignore', env: { PATH: process.env.PATH ?? '' } })
      return true
    } catch {
      return false
    }
  }

  it('answers present for a real path and missing for a glob that matches nothing', () => {
    expect(probe(join(import.meta.dirname, 'dev-env-scripts.spec.mjs'))).toBe(true)
    expect(probe('definitely/not/here/*.js')).toBe(false)
  })
})

describe('dev env.sh: the isolation exit is honoured by the shell scripts too', () => {
  /**
   * `scripts/dsh.mjs` has always honoured `ASSISTANT_DSH_HOME`; `dev/env.sh` used to overwrite
   * `DSH_HOME` unconditionally, so an isolated run built profiles in one home while the launcher
   * read another — and the only symptom was `profile "dev" does not exist`. Exercised in a real
   * bash subprocess, against a throwaway ASSISTANT_REPO so nothing of the repo is touched.
   */
  const envSh = join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env', 'env.sh')
  const resolvedHome = (assistantDshHome, extraEnv = {}) => {
    const probeHome = temp('env-home-')
    const scratchRepo = temp('env-repo-')
    const script = `source ${JSON.stringify(envSh)}\nprintf 'RESOLVED=%s\\n' "$DSH_HOME"`
    const env = { PATH: process.env.PATH ?? '', HOME: probeHome, ASSISTANT_REPO: scratchRepo, ...extraEnv }
    if (assistantDshHome !== undefined) env.ASSISTANT_DSH_HOME = assistantDshHome
    return execFileSync('bash', ['-c', script], { encoding: 'utf8', env })
  }

  it('uses ASSISTANT_DSH_HOME when set, and the repo dev home when unset', () => {
    const isolated = join(temp('env-iso-'), 'home')
    expect(resolvedHome(isolated)).toContain(`RESOLVED=${isolated}`)
    // The unset case is the safety net: whatever DSH_HOME the calling shell had, the default wins.
    const fallback = resolvedHome(undefined, { DSH_HOME: '.tmp/env-should-not-win' })
    expect(fallback).toContain('RESOLVED=')
    expect(fallback).not.toContain('RESOLVED=.tmp/env-should-not-win')
    expect(fallback).toMatch(/RESOLVED=\S*\/dev\/harness-home\n/)
  })
})
