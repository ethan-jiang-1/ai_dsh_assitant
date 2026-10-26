#!/usr/bin/env node
/**
 * One pnpm version in the install-environment matrix: prepare that pnpm with Corepack in a
 * throwaway home, install the packed plugin into a clean DSH home, and prove the expected outcome.
 *
 *   pnpm pnpm-matrix -- --pnpm 10.4.0 --expect reject
 *   pnpm pnpm-matrix -- --pnpm 10.6.0 --expect install
 *   pnpm pnpm-matrix -- --pnpm 11.28.5 --expect install
 *   pnpm pnpm-matrix -- --pnpm 12.15.0 --expect install
 *
 * This is release evidence, not a default gate: Corepack needs the network to fetch the requested
 * pnpm, and V8/registry conditions vary by machine. The supported floor is 10.6.0 (the first pnpm
 * that reads `nodeLinker`/`autoInstallPeers` from the profile's pnpm-workspace.yaml); 10.4 and
 * older fail the add with ERR_PNPM_ADDING_TO_ROOT. Reports land under .tmp/pnpm-matrix/reports/.
 *
 * Usage: pnpm pnpm-matrix -- --pnpm <version> --expect install|reject [--dsh <path>] [--keep]
 * Exit 0 = the expected install/reject outcome, and for install the composition carries the preset.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const argv = process.argv.slice(2)
const option = name => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const pnpmVersion = option('--pnpm')
const expect = option('--expect')
const dshArgument = option('--dsh')
const dsh = dshArgument === undefined ? 'dsh' : resolve(dshArgument)
const keep = argv.includes('--keep')
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', ...options })

if (pnpmVersion === undefined || !['install', 'reject'].includes(expect)) {
  console.error('usage: pnpm pnpm-matrix -- --pnpm <version> --expect install|reject [--dsh <path>] [--keep]')
  process.exit(2)
}
if (process.platform === 'win32') {
  console.log('pnpm-matrix: skipped — the Corepack shim is a POSIX shell script; Windows is a separate unverified matrix')
  process.exit(0)
}
if (dshArgument !== undefined && !existsSync(dsh)) {
  console.error(`pnpm-matrix: DSH CLI not found: ${dsh}`)
  process.exit(2)
}

const root = join(repoRoot, '.tmp', 'pnpm-matrix')
const corepackHome = join(root, 'corepack')
const versionDir = join(root, `pnpm-${pnpmVersion}`)
const home = join(versionDir, 'dsh-home')
const workspace = join(versionDir, 'workspace')
mkdirSync(root, { recursive: true })
mkdirSync(versionDir, { recursive: true })
mkdirSync(home, { recursive: true })
mkdirSync(workspace, { recursive: true })
// Stop pnpm's project-root search at this throwaway workspace: the repo root carries a
// packageManager pin for the development pnpm, and pnpm 12 refuses to run under a different one.
writeFileSync(join(workspace, 'package.json'), '{\n  "name": "pnpm-matrix-workspace",\n  "private": true\n}\n', 'utf8')

const env = {
  ...process.env,
  DSH_HOME: home,
  DSH_AGENTS_HOME: join(versionDir, 'agents-home'),
  COREPACK_HOME: corepackHome,
}

try {
  step(`preparing pnpm ${pnpmVersion} with Corepack`)
  const prepared = run('corepack', ['prepare', `pnpm@${pnpmVersion}`, '--activate'], { env, cwd: repoRoot })
  if (prepared.status !== 0) {
    fail(`corepack prepare failed: ${(prepared.stderr ?? prepared.stdout ?? '').trim().slice(-500)}`)
  } else {
    ok('prepared')
    const pnpmBin = [join(corepackHome, 'v1', 'pnpm', pnpmVersion, 'bin', 'pnpm.cjs'), join(corepackHome, 'v1', 'pnpm', pnpmVersion, 'bin', 'pnpm.mjs')]
      .find(candidate => existsSync(candidate))
    if (pnpmBin === undefined) {
      fail(`Corepack did not expose a pnpm entry point under ${join(corepackHome, 'v1', 'pnpm', pnpmVersion)}`)
    } else {
      const shimDir = join(versionDir, 'bin')
      mkdirSync(shimDir, { recursive: true })
      const shim = join(shimDir, 'pnpm')
      writeFileSync(shim, `#!/bin/sh\nexec "${process.execPath}" "${pnpmBin}" "$@"\n`, 'utf8')
      chmodSync(shim, 0o755)
      // Run from the throwaway workspace, not the repo: the root packageManager pin makes pnpm 12
      // try to materialize a user-level pnpm env directory on first use.
      let versionCheck = run(shim, ['--version'], { env, cwd: workspace })
      if (versionCheck.status !== 0 || versionCheck.stdout.trim() !== pnpmVersion) {
        versionCheck = run(shim, ['--version'], { env, cwd: workspace })
      }
      if (versionCheck.status !== 0 || versionCheck.stdout.trim() !== pnpmVersion) {
        fail(`the pnpm shim did not report ${pnpmVersion}: status ${String(versionCheck.status)} error ${versionCheck.error?.message ?? 'none'}; stdout ${JSON.stringify(versionCheck.stdout)}; stderr ${JSON.stringify((versionCheck.stderr ?? '').slice(0, 400))}`)
      } else {
        ok(`pnpm ${pnpmVersion} on PATH`)

        step('packing the current plugin')
        const packed = run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', versionDir], { cwd: repoRoot })
        const version = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).version
        const tarball = join(versionDir, `dsh-smart-assistant-${version}.tgz`)
        if (packed.status !== 0 || !existsSync(tarball)) {
          fail(`pack failed: ${(packed.stderr ?? '').trim().slice(0, 300)}`)
        } else {
          ok(`packed ${tarball}`)

          step(`installing with pnpm ${pnpmVersion} (expected: ${expect})`)
          const installEnv = { ...env, PATH: `${shimDir}:${process.env.PATH ?? ''}` }
          const added = run(dsh, ['plugin', '--profile', 'web', 'add', tarball], { env: installEnv, cwd: workspace })
          const text = `${added.stdout ?? ''}\n${added.stderr ?? ''}`
          if (expect === 'reject') {
            if (added.status === 0) fail(`pnpm ${pnpmVersion} accepted the install but rejection was expected`)
            else if (!/ERR_PNPM_ADDING_TO_ROOT|engines\.pnpm|incompatible/i.test(text)) {
              fail(`rejection did not name the pnpm floor: ${text.trim().slice(-500)}`)
            } else ok(`rejected with a pnpm-floor diagnostic`)
          } else if (added.status !== 0) {
            fail(`install failed: ${text.trim().slice(-700)}`)
          } else {
            ok('installed')
            const dump = run(dsh, ['--profile', 'web', '--dump-config'], { env: installEnv, cwd: workspace })
            if (dump.status !== 0) fail(`dump failed: ${(dump.stderr ?? dump.stdout ?? '').trim().slice(-500)}`)
            else if (!dump.stdout.includes('preset-assistant')) fail('composition has no preset-assistant row')
            else ok('composition carries preset-assistant')
          }

          const report = {
            generatedAt: new Date().toISOString(),
            pnpm: pnpmVersion,
            expect,
            status: failures.length === 0 ? 'passed' : 'failed',
            installExit: added.status,
            failures: [...failures],
          }
          mkdirSync(join(root, 'reports'), { recursive: true })
          writeFileSync(join(root, 'reports', `pnpm-${pnpmVersion}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
          console.log(`\nreport: ${join(root, 'reports', `pnpm-${pnpmVersion}.json`)}`)
        }
      }
    }
  }
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (!keep && failures.length === 0) rmSync(versionDir, { recursive: true, force: true })
  else console.log(`\nkept ${versionDir}`)
}

console.log('')
if (failures.length === 0) {
  console.log(`pnpm-matrix (${pnpmVersion}, ${expect}): passed`)
  process.exit(0)
}
console.log(`pnpm-matrix (${pnpmVersion}, ${expect}): ${failures.length} failure(s)`)
process.exit(1)
