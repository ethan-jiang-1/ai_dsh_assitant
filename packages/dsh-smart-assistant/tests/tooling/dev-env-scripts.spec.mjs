/**
 * Fixtures for the dev environment scripts themselves (bash probe semantics,
 * env.sh isolation exits) — dev-env behavior, not verify-gate cores.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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

describe('package scripts: the floor commands are self-sufficient', () => {
  /**
   * `pnpm test` used to run the composition specs against whatever `lib/` happened to be
   * present: red on a clean clone, green-but-stale after a source edit. The root script now
   * builds first, and the composition lane runs the whole directory instead of one spec.
   */
  const scripts = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'package.json'), 'utf8')).scripts
  it('builds before the full suite', () => {
    expect(scripts.test).toContain('pnpm build')
    expect(scripts.test).not.toContain('pretest')
  })
  it('runs every composition spec, not one hardcoded file', () => {
    expect(scripts['test:composition']).toContain('tests/composition')
    expect(scripts['test:composition']).not.toMatch(/tests\/composition\/[^ ]+\.spec\./)
  })
})

describe('start.sh covers the fresh-clone prerequisites', () => {
  /**
   * AGENTS.md promises one `pnpm start` from a fresh clone. The script previously assumed the
   * submodule and root install were already there; the first failure was prepare.sh's
   * "vendor/dsh is empty" or pnpm's "no package.json". The guards below are the promise.
   */
  const start = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env', 'start.sh'), 'utf8')
  it('pulls the submodule and installs root deps when missing', () => {
    expect(start).toContain('git submodule update --init')
    expect(start).toContain('pnpm install')
    expect(start).toMatch(/if \[ ! -f vendor\/dsh\/package\.json \]; then/)
    expect(start).toMatch(/if \[ ! -f node_modules\/\.modules\.yaml \]; then/)
  })
})
