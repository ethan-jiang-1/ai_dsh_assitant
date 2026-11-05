/**
 * Fixtures for the dev environment scripts themselves (bash probe semantics,
 * env.sh isolation exits) — dev-env behavior, not verify-gate cores.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
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
  it('quantifies each step so "why was this start slow" is answerable from the output', () => {
    // 2026-11-05: one start took 36.8s against a 12.4s warm one; the script printed no per-step
    // numbers, so the attribution had to be reconstructed from session logs after the fact.
    expect(start).toContain('now_ms()')
    expect(start).toContain('⏱')
    expect(start).toMatch(/step "prepare/)
    expect(start).toMatch(/step "setup/)
  })
  it('hands over a healthy running instance instead of booting another one', () => {
    // Reuse is the difference between ~1.1s (preflight only) and ~12.4s (fresh boot) per start.
    expect(start).toContain('dev/env/instance.mjs')
    expect(start).toContain('--check')
    expect(start).toContain('--fresh')
  })
})

describe('plugin link guard: `dsh plugin add` is skipped only when nothing would change', () => {
  /**
   * The two `dsh plugin add` calls are ≈4s of a ≈12.4s warm start, and their result can only
   * differ when the profile row or the plugin manifest moved. A wrong "skip" would surface as
   * stale composition hours later, so the guard is pinned from both sides here.
   */
  const devEnv = join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env')
  const guard = () => import(pathToFileURL(join(devEnv, 'plugin-link.mjs')).href)

  const fixture = () => {
    const packageDir = temp('plugin-package-')
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'dsh-smart-assistant', version: '1.0.0' }))
    const profileDir = temp('dev-profile-')
    mkdirSync(join(profileDir, 'node_modules', 'dsh-smart-assistant'), { recursive: true })
    writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
      name: 'dsh-profile-dev',
      private: true,
      dependencies: { 'dsh-smart-assistant': `link:${packageDir}` },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-smart-assistant'] } },
    }))
    return { packageDir, profileDir }
  }

  it('accepts a linked profile whose plugin manifest has not moved', async () => {
    const { pluginLinkIsCurrent, writePluginStamp } = await guard()
    const { packageDir, profileDir } = fixture()
    // No stamp yet: the previous install cannot be assumed to match the current manifest.
    expect(pluginLinkIsCurrent({ profileDir, packageDir }).current).toBe(false)
    writePluginStamp(profileDir, packageDir)
    expect(pluginLinkIsCurrent({ profileDir, packageDir })).toEqual({ current: true, reasons: [] })
  })

  it('re-runs the install when the manifest, the link form or the bundle row changed', async () => {
    const { pluginLinkIsCurrent, writePluginStamp } = await guard()
    const { packageDir, profileDir } = fixture()
    writePluginStamp(profileDir, packageDir)

    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'dsh-smart-assistant', version: '1.0.1' }))
    expect(pluginLinkIsCurrent({ profileDir, packageDir }).reasons)
      .toContain('plugin manifest changed since the last plugin add')

    const { packageDir: otherDir, profileDir: otherProfile } = fixture()
    writePluginStamp(otherProfile, otherDir)
    const manifest = JSON.parse(readFileSync(join(otherProfile, 'package.json'), 'utf8'))
    manifest.dependencies['dsh-smart-assistant'] = `file:${otherDir}`
    writeFileSync(join(otherProfile, 'package.json'), JSON.stringify(manifest))
    expect(pluginLinkIsCurrent({ profileDir: otherProfile, packageDir: otherDir }).reasons.join('\n'))
      .toContain('expected link:')

    manifest.dependencies['dsh-smart-assistant'] = `link:${otherDir}`
    manifest.dsh.profile.bundles = ['@deepseek-ai/dsh-base']
    writeFileSync(join(otherProfile, 'package.json'), JSON.stringify(manifest))
    expect(pluginLinkIsCurrent({ profileDir: otherProfile, packageDir: otherDir }).reasons)
      .toContain('bundles does not list dsh-smart-assistant')
  })
})

describe('instance registry: reuse a live instance only while its artifacts are older than it', () => {
  /**
   * Reuse turns a ≈12.4s start into a ≈1.1s preflight — but only if the instance is really live
   * and really newer than the code it loaded. Both halves are pinned here because a false "yes"
   * hands out an instance running last build's `lib/`.
   */
  const devEnv = join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env')
  const registry = () => import(pathToFileURL(join(devEnv, 'instance.mjs')).href)
  const entryFor = (overrides = {}) => ({
    profile: 'dev',
    url: 'http://127.0.0.1:51212/?token=abc',
    pid: process.pid,
    startedAt: Date.now() + 60_000,
    ...overrides,
  })
  const repoWithLib = () => {
    const repoRoot = temp('instance-repo-')
    const lib = join(repoRoot, 'packages', 'dsh-smart-assistant', 'lib')
    mkdirSync(lib, { recursive: true })
    writeFileSync(join(lib, 'index.js'), 'export {}\n')
    return repoRoot
  }

  it('accepts a live pid whose artifacts predate the instance', async () => {
    const { instanceReusable } = await registry()
    const repoRoot = repoWithLib()
    expect(instanceReusable({ repoRoot, profile: 'dev', entry: entryFor() })).toEqual({ reusable: true, reasons: [] })
  })

  it('refuses a dead pid, another profile, or artifacts written after the start', async () => {
    const { instanceReusable } = await registry()
    const repoRoot = repoWithLib()
    expect(instanceReusable({ repoRoot, profile: 'dev', entry: entryFor({ pid: 2_147_483_646 }) }).reasons.join('\n'))
      .toMatch(/is not running/)
    expect(instanceReusable({ repoRoot, profile: 'dev', entry: entryFor({ profile: 'dev-task' }) }).reasons.join('\n'))
      .toMatch(/recorded profile/)
    const stale = instanceReusable({ repoRoot, profile: 'dev', entry: entryFor({ startedAt: Date.now() - 60_000 }) })
    expect(stale.reusable).toBe(false)
    expect(stale.reasons.join('\n')).toMatch(/artifacts changed after the instance started/)
    expect(instanceReusable({ repoRoot, profile: 'dev', entry: entryFor({ url: 'http://127.0.0.1:51212/' }) }).reusable)
      .toBe(false)
  })

  it('keeps the instance when only skill text changed — skills are a live root, not loaded code', async () => {
    // A SKILL.md edit is picked up by the running provider (watched / rescanned per request), so a
    // restart here would be pure loss — it is the most common edit in this repo.
    const { instanceReusable } = await registry()
    const repoRoot = repoWithLib()
    const entry = entryFor({ startedAt: Date.now() })
    // The built face predates the instance; only the skill text arrives afterwards.
    const past = new Date(Date.now() - 60_000)
    utimesSync(join(repoRoot, 'packages', 'dsh-smart-assistant', 'lib', 'index.js'), past, past)
    const skillDir = join(repoRoot, 'packages', 'dsh-smart-assistant', 'presets', 'assistant', 'skills', 'demo')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '# demo\n')
    expect(instanceReusable({ repoRoot, profile: 'dev', entry })).toEqual({ reusable: true, reasons: [] })
  })
})

describe('setup.sh: the plugin install is skipped through the same guard', () => {
  const setup = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env', 'setup.sh'), 'utf8')
  it('checks the guard before `plugin add` and stamps after it', () => {
    expect(setup).toContain('dev/env/plugin-link.mjs')
    expect(setup).toMatch(/plugin_link --check/)
    expect(setup).toMatch(/plugin_link --stamp/)
    expect(setup).toContain('ASSISTANT_FORCE_PLUGIN_ADD')
  })
  it('does not re-touch the overlay when its content is unchanged (instance reuse reads its mtime)', () => {
    expect(setup).toContain('unchanged')
    expect(setup).toMatch(/\[ "\$\(cat "\$overlay"\)" = "\$content" \]/)
  })
})

describe('launch mode: built lib only while it provably belongs to the pinned source', () => {
  /**
   * Booting the built CLI measured ~1s of CPU and ~0.3-0.8s of wall time less than booting the
   * pinned source through tsx (2026-11-05). The saving is only safe while lib/ belongs to the
   * checked-out pin, so every uncertain state must fall back to the source launch — that is the
   * whole decision table.
   */
  const devEnv = join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env')
  const mode = () => import(pathToFileURL(join(devEnv, 'launch-mode.mjs')).href)
  const sha = 'a'.repeat(40)

  it('boots the built CLI when lib/ is newer than the pin record and HEAD matches it', async () => {
    const { chooseLaunchMode } = await mode()
    expect(chooseLaunchMode({
      fromSource: false, built: true, builtMtime: 2_000, recordMtime: 1_000, recordedSha: sha, headSha: sha,
    })).toEqual({ mode: 'built', reason: '' })
  })

  it('falls back to the source launch for every uncertain state', async () => {
    const { chooseLaunchMode } = await mode()
    const base = { fromSource: false, built: true, builtMtime: 2_000, recordMtime: 1_000, recordedSha: sha, headSha: sha }
    expect(chooseLaunchMode({ ...base, fromSource: true }).reason).toBe('ASSISTANT_DSH_FROM_SOURCE=1')
    expect(chooseLaunchMode({ ...base, built: false }).mode).toBe('source')
    expect(chooseLaunchMode({ ...base, recordMtime: undefined }).reason).toMatch(/UPSTREAM\.md is missing/)
    expect(chooseLaunchMode({ ...base, headSha: undefined }).reason).toMatch(/cannot read the vendor\/dsh HEAD/)
    expect(chooseLaunchMode({ ...base, headSha: 'b'.repeat(40) }).reason).toMatch(/does not match/)
    expect(chooseLaunchMode({ ...base, builtMtime: 500 }).reason).toMatch(/older than the pin record/)
  })
})

describe('the launcher wires the launch-mode judgment', () => {
  const launcher = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env', 'dsh.mjs'), 'utf8')
  it('decides through the shared module and keeps a source escape hatch', () => {
    expect(launcher).toContain("from './launch-mode.mjs'")
    expect(launcher).toContain('ASSISTANT_DSH_FROM_SOURCE')
    expect(launcher).toContain('apps/cli/lib/bin.js')
  })
})
