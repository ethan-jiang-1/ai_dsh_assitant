#!/usr/bin/env node
/**
 * Usage: node scripts/release/upgrade-smoke.mjs [--keep] [--old <previous-release tarball>]
 *
 * Without --old the predecessor is synthetic (current bytes, version rewritten); with --old a
 * real previous-release tarball is used, and its version is read from the tarball.
 *
 * Upgrade/uninstall smoke: prove that installing a newer tarball over an older one, and removing
 * the plugin, leave the two plugin-owned data directories alone.
 *
 * Without --old the "old" tarball is the current tarball with only its version changed: it proves
 * the install/remove data boundary, not a migration of production data. A release owner passes
 * the previous release's tarball with --old to exercise the real predecessor bytes.
 * Exit 0 = old installed, new installed, data survived, remove left data and no plugin row.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const keep = process.argv.includes('--keep')
const oldArg = process.argv.indexOf('--old')
const suppliedOld = oldArg >= 0 ? process.argv[oldArg + 1] : undefined
if (oldArg >= 0 && (suppliedOld === undefined || !existsSync(suppliedOld))) {
  console.error('upgrade-smoke: --old needs an existing tarball path')
  process.exit(2)
}
const root = mkTmpDir('upgrade-smoke', 'run-')
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options })
}

const current = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const version = current.version
const home = join(root, 'home')
const profile = 'upgrade-smoke'
const env = { ...process.env, DSH_HOME: home, TSX_TSCONFIG_PATH: join(repoRoot, 'tsconfig.tsx.json') }
const cli = ['--import', 'tsx/esm', join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')]
const dsh = args => run(process.execPath, [...cli, ...args], { cwd: repoRoot, env })

try {
  step('packing the current tarball and a synthetic predecessor')
  const packed = run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', root])
  const newTarball = join(root, `${current.name}-${version}.tgz`)
  if (packed.status !== 0 || !existsSync(newTarball)) fail(`pack failed: ${(packed.stderr ?? '').trim().slice(0, 300)}`)
  let oldTarball = suppliedOld
  let oldVersion = '0.1.0'
  if (oldTarball !== undefined) {
    // A real predecessor from the previous release. The caller keeps it; we only read the
    // version so the post-install assertion compares the actual bytes, not a hardcoded 0.1.0.
    const probe = run('tar', ['-xOzf', oldTarball, 'package/package.json'])
    try { oldVersion = JSON.parse(probe.stdout).version } catch { fail('cannot read the supplied predecessor manifest') }
    if (probe.status !== 0) fail('cannot read the supplied predecessor manifest')
    else ok(`real predecessor ${oldVersion} ready`)
  } else {
    const oldRoot = join(root, 'old')
    mkdirSync(oldRoot, { recursive: true })
    const unpack = run('tar', ['-xzf', newTarball, '-C', oldRoot])
    if (unpack.status !== 0) fail('cannot unpack the current tarball')
    const oldManifestPath = join(oldRoot, 'package', 'package.json')
    const oldManifest = JSON.parse(readFileSync(oldManifestPath, 'utf8'))
    oldManifest.version = oldVersion
    writeFileSync(oldManifestPath, `${JSON.stringify(oldManifest, null, 2)}\n`, 'utf8')
    oldTarball = join(root, `${current.name}-${oldVersion}-synthetic.tgz`)
    const repack = run('tar', ['-czf', oldTarball, '-C', oldRoot, 'package'])
    if (repack.status !== 0) fail('cannot repack the synthetic predecessor')
    else ok(`synthetic ${oldVersion} predecessor ready`)
  }

  step('installing the predecessor into a clean profile')
  dsh(['--profile', profile, '--from-default-profile', 'web', '--dump-config'])
  dsh(['plugin', '--profile', profile, 'add', oldTarball])
  const installedOld = JSON.parse(readFileSync(join(home, 'profiles', profile, 'node_modules', current.name, 'package.json'), 'utf8'))
  if (installedOld.version !== oldVersion) fail(`expected ${oldVersion} installed, got ${String(installedOld.version)}`)
  else ok('predecessor installed')

  step('writing user data through the two owned directories')
  mkdirSync(join(home, 'assistant', 'memory'), { recursive: true })
  mkdirSync(join(home, 'assistant-operating'), { recursive: true })
  writeFileSync(join(home, 'assistant', 'memory', 'upgrade-probe.md'), 'probe before upgrade\n', 'utf8')
  writeFileSync(join(home, 'assistant-operating', 'ledger.json'), '{"revision":7}\n', 'utf8')
  ok('probe data written')

  if (suppliedOld === undefined) {
    step('deleting the predecessor tarball before the upgrade')
    // A user often deletes the download after installing. pnpm resolves the installed tree from
    // its lockfile/store; retaining the old source must not be a prerequisite for an upgrade.
    rmSync(oldTarball, { force: true })
    if (existsSync(oldTarball)) fail('could not delete the predecessor tarball')
    else ok('predecessor tarball deleted')
  } else {
    ok('supplied predecessor kept in place (real-fixture mode)')
  }

  step(`upgrading to ${version}`)
  dsh(['plugin', '--profile', profile, 'add', newTarball])
  const installedNew = JSON.parse(readFileSync(join(home, 'profiles', profile, 'node_modules', current.name, 'package.json'), 'utf8'))
  if (installedNew.version !== version) fail(`expected ${version} installed, got ${String(installedNew.version)}`)
  else ok(`upgraded to ${version}`)
  if (readFileSync(join(home, 'assistant', 'memory', 'upgrade-probe.md'), 'utf8') !== 'probe before upgrade\n') fail('working-folder data changed across upgrade')
  else if (readFileSync(join(home, 'assistant-operating', 'ledger.json'), 'utf8') !== '{"revision":7}\n') fail('ledger data changed across upgrade')
  else ok('working folder and ledger survived the upgrade')
  const afterUpgrade = dsh(['--profile', profile, '--dump-config'])
  if (!afterUpgrade.stdout.includes('preset-assistant')) fail('dump after upgrade does not show preset-assistant')
  else ok('composition still carries preset-assistant')

  step('removing the plugin')
  dsh(['plugin', '--profile', profile, 'remove', current.name])
  const afterRemove = dsh(['--profile', profile, '--dump-config'])
  if (afterRemove.stdout.includes(current.name)) fail('dump still mentions the package after remove')
  else if (readFileSync(join(home, 'assistant', 'memory', 'upgrade-probe.md'), 'utf8') !== 'probe before upgrade\n') fail('remove deleted working-folder data')
  else if (readFileSync(join(home, 'assistant-operating', 'ledger.json'), 'utf8') !== '{"revision":7}\n') fail('remove deleted ledger data')
  else ok('remove left both data directories intact')

  step('re-adding the plugin (re-enable)')
  dsh(['plugin', '--profile', profile, 'add', newTarball])
  const afterReadd = dsh(['--profile', profile, '--dump-config'])
  if (!afterReadd.stdout.includes('preset-assistant')) fail('dump after re-add does not show preset-assistant')
  else if (readFileSync(join(home, 'assistant', 'memory', 'upgrade-probe.md'), 'utf8') !== 'probe before upgrade\n') fail('re-add changed working-folder data')
  else if (readFileSync(join(home, 'assistant-operating', 'ledger.json'), 'utf8') !== '{"revision":7}\n') fail('re-add changed ledger data')
  else ok('re-add restored the preset and left both data directories intact')
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (keep || failures.length > 0) console.log(`\nkept ${root}`)
  else rmSync(root, { recursive: true, force: true })
}

console.log('')
if (failures.length === 0) {
  console.log('upgrade-smoke: passed')
  process.exit(0)
}
console.log(`upgrade-smoke: ${failures.length} failure(s)`)
process.exit(1)
