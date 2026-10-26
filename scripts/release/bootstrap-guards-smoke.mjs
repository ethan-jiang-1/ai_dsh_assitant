#!/usr/bin/env node
/**
 * Guard smoke for the shipped `bootstrap.mjs`: invalid profile names must never reach the
 * profile-repair `rmSync`, shipped profile names (including Desktop's reserved `desktop`) must be
 * refused, and the pnpm/npm prerequisites must fail before the home is created.
 *
 * The test packs the package and runs the *shipped* bootstrap from the extracted tarball. Every
 * case uses a stub `dsh` that exits 97, so reaching the launcher is observable: the guards must
 * stop before it. POSIX only (the stubs are shell scripts); Windows behaviour is a separate,
 * explicitly unverified matrix.
 *
 * Usage: pnpm bootstrap-guards-smoke [--keep]
 * Exit 0 = every guard refused the input without touching the victim or creating the home.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const keep = process.argv.includes('--keep')
const root = mkTmpDir('bootstrap-guards-smoke', 'run-')
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}

if (process.platform === 'win32') {
  console.log('bootstrap-guards-smoke: skipped — POSIX shell stubs; Windows is a separate unverified matrix')
  process.exit(0)
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options })
}

function output(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

let bootstrap
try {
  step('packing and extracting the shipped package')
  const packed = run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', root])
  const tarball = join(root, `dsh-smart-assistant-${JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).version}.tgz`)
  if (packed.status !== 0 || !existsSync(tarball)) fail(`pack failed: ${output(packed).trim().slice(0, 300)}`)
  else {
    const extracted = join(root, 'pkg')
    mkdirSync(extracted, { recursive: true })
    const untar = run('tar', ['-xzf', tarball, '-C', extracted])
    bootstrap = join(extracted, 'package', 'bootstrap.mjs')
    if (untar.status !== 0 || !existsSync(bootstrap)) fail('extracted package has no bootstrap.mjs')
    else ok('shipped bootstrap extracted')
  }

  const stubDir = join(root, 'stub-bin')
  mkdirSync(stubDir, { recursive: true })
  const stub = join(stubDir, 'dsh')
  writeFileSync(stub, '#!/bin/sh\necho "stub dsh reached: $*" >&2\nexit 97\n', 'utf8')
  chmodSync(stub, 0o755)

  const call = (home, profile, extra = [], env = {}) => run(process.execPath, [
    bootstrap, '--home', home, '--profile', profile, '--no-start', '--dsh', stub, ...extra,
  ], { cwd: root, env: { ...process.env, ...env } })

  step('a traversal profile name refuses before the profile repair can delete outside the home')
  const victim = join(root, 'victim')
  mkdirSync(victim, { recursive: true })
  writeFileSync(join(victim, 'package.json'), '{ broken\n', 'utf8')
  writeFileSync(join(victim, 'keep.txt'), 'do not delete me\n', 'utf8')
  const traversalHome = join(root, 'home-traversal')
  const traversal = call(traversalHome, '../../victim')
  if (traversal.status === 0) fail('traversal profile name was accepted')
  else if (!/invalid profile name/i.test(output(traversal))) fail(`traversal refusal did not name the profile name: ${output(traversal).trim().slice(0, 300)}`)
  else if (!existsSync(join(victim, 'keep.txt'))) fail('profile repair deleted a directory outside the home')
  else if (existsSync(traversalHome)) fail('home was created before the profile name was validated')
  else ok('traversal refused; victim intact; no home created')

  step('the reserved desktop profile is refused')
  const desktopHome = join(root, 'home-desktop')
  const desktop = call(desktopHome, 'desktop')
  if (desktop.status === 0) fail('desktop profile was accepted')
  else if (!/shipped profile/i.test(output(desktop))) fail(`desktop refusal did not name the reserved profile: ${output(desktop).trim().slice(0, 300)}`)
  else if (existsSync(desktopHome)) fail('home was created before the reserved profile was validated')
  else ok('desktop refused; no home created')

  step('a home inside the package is refused')
  const insideHome = join(root, 'pkg', 'package', 'data')
  const inside = call(insideHome, 'guards-ok')
  if (inside.status === 0) fail('inside-package home was accepted')
  else if (!/outside the package/i.test(output(inside))) fail(`inside-package refusal is unclear: ${output(inside).trim().slice(0, 300)}`)
  else if (existsSync(insideHome)) fail('inside-package home was created')
  else ok('inside-package home refused')

  step('missing pnpm fails before the home is created')
  const emptyBin = join(root, 'empty-bin')
  mkdirSync(emptyBin, { recursive: true })
  const noPnpmHome = join(root, 'home-no-pnpm')
  const noPnpm = call(noPnpmHome, 'guards-ok', [], { PATH: emptyBin })
  if (noPnpm.status === 0) fail('bootstrap ran without pnpm')
  else if (!/pnpm was not found/i.test(output(noPnpm))) fail(`missing-pnpm refusal is unclear: ${output(noPnpm).trim().slice(0, 300)}`)
  else if (existsSync(noPnpmHome)) fail('home was created before the pnpm precheck')
  else ok('missing pnpm refused; no home created')

  step('pnpm older than 10.6 fails with the version floor')
  const oldBin = join(root, 'old-pnpm-bin')
  mkdirSync(oldBin, { recursive: true })
  const oldPnpm = join(oldBin, 'pnpm')
  writeFileSync(oldPnpm, '#!/bin/sh\necho 10.4.0\n', 'utf8')
  chmodSync(oldPnpm, 0o755)
  const oldHome = join(root, 'home-old-pnpm')
  const old = call(oldHome, 'guards-ok', [], { PATH: `${oldBin}:/usr/bin:/bin` })
  if (old.status === 0) fail('bootstrap accepted pnpm 10.4.0')
  else if (!/10\.6\.0|too old/i.test(output(old))) fail(`old-pnpm refusal is unclear: ${output(old).trim().slice(0, 300)}`)
  else if (existsSync(oldHome)) fail('home was created before the pnpm version precheck')
  else ok('pnpm 10.4 refused; no home created')

  step('missing npm fails before the home is created')
  const npmBin = join(root, 'pnpm-only-bin')
  mkdirSync(npmBin, { recursive: true })
  const fakePnpm = join(npmBin, 'pnpm')
  writeFileSync(fakePnpm, '#!/bin/sh\necho 11.28.5\n', 'utf8')
  chmodSync(fakePnpm, 0o755)
  const noNpmHome = join(root, 'home-no-npm')
  const noNpm = call(noNpmHome, 'guards-ok', [], { PATH: npmBin })
  if (noNpm.status === 0) fail('bootstrap ran without npm')
  else if (!/npm was not found/i.test(output(noNpm))) fail(`missing-npm refusal is unclear: ${output(noNpm).trim().slice(0, 300)}`)
  else if (existsSync(noNpmHome)) fail('home was created before the npm precheck')
  else ok('missing npm refused; no home created')

  step('a valid profile name still reaches the launcher (the guard is not over-broad)')
  const validHome = join(root, 'home-valid')
  const valid = call(validHome, 'guards-ok')
  if (!/stub dsh reached/i.test(output(valid))) {
    fail(`a valid profile did not reach the launcher: ${output(valid).trim().slice(0, 400)}`)
  } else {
    ok('valid profile reached the stub launcher')
  }
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (keep || failures.length > 0) console.log(`\nkept ${root}`)
  else rmSync(root, { recursive: true, force: true })
}

console.log('')
if (failures.length === 0) {
  console.log('bootstrap-guards-smoke: passed')
  process.exit(0)
}
console.log(`bootstrap-guards-smoke: ${failures.length} failure(s)`)
process.exit(1)
