#!/usr/bin/env node
/**
 * Run the real DSH compatibility matrix against one prepared CLI:
 *
 *   pnpm compat-matrix -- --dsh /path/to/dsh --version 0.2.1-rc.2 --expect install
 *   pnpm compat-matrix -- --dsh /path/to/dsh --version 0.2.0-rc.2 --expect reject
 *
 * The script packs the current plugin, creates a clean home/profile with the target DSH, then
 * either proves install + composition (`preset-assistant`) or proves the target rejects the range
 * without changing the profile. It does not install DSH itself and does not call a model: that is
 * the difference between this matrix and the range test / release smoke.
 *
 * Reports go to .tmp/compat-matrix/<version>.json; a failed run keeps its home for inspection.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const option = name => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const dsh = option('--dsh')
const expectedVersion = option('--version')
const expect = option('--expect')
const keep = argv.includes('--keep')
if (dsh === undefined || expectedVersion === undefined || !['install', 'reject'].includes(expect)) {
  console.error('usage: pnpm compat-matrix -- --dsh <path> --version <dsh-version> --expect install|reject [--keep]')
  process.exit(2)
}
const dshPath = resolve(dsh)
if (!existsSync(dshPath)) {
  console.error(`compat-matrix: DSH CLI not found: ${dshPath}`)
  process.exit(2)
}

const root = join(repoRoot, '.tmp', 'compat-matrix')
mkdirSync(root, { recursive: true })
const home = mkdtempSync(join(root, 'home-'))
const agentsHome = join(home, 'agents-home')
const env = { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: agentsHome }
const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const runDsh = args => spawnSync(dshPath, args, { cwd: repoRoot, env, encoding: 'utf8', timeout: 180_000 })

try {
  step(`checking the target DSH (${expectedVersion})`)
  const version = runDsh(['--version'])
  if (version.status !== 0 || version.stdout.trim() !== expectedVersion) {
    fail(`dsh --version returned ${JSON.stringify(version.stdout.trim())}, expected ${expectedVersion}`)
  } else ok(version.stdout.trim())

  step('packing the current plugin')
  execFileSync('pnpm', ['--dir', join(repoRoot, 'packages', 'dsh-smart-assistant'), 'pack', '--pack-destination', root], { encoding: 'utf8' })
  const tarball = join(root, `dsh-smart-assistant-${JSON.parse(readFileSync(join(repoRoot, 'packages', 'dsh-smart-assistant', 'package.json'), 'utf8')).version}.tgz`)
  if (!existsSync(tarball)) fail(`pack did not produce ${tarball}`)
  else ok(tarball.replace(`${repoRoot}/`, ''))

  step('creating a clean headless profile')
  const created = runDsh(['--profile', 'matrix', '--from-default-profile', 'headless', '--dump-config'])
  if (created.status !== 0) fail(`profile creation failed: ${(created.stderr || created.stdout).trim().slice(0, 400)}`)
  else ok('profile created')

  step(`installing with expected outcome: ${expect}`)
  const added = runDsh(['plugin', '--profile', 'matrix', 'add', tarball])
  const text = `${added.stdout}\n${added.stderr}`
  if (expect === 'reject') {
    if (added.status === 0) fail('target accepted the plugin but rejection was expected')
    else if (!/incompatible|engines\.dsh|peerDependencies/i.test(text)) fail('rejection message does not name compatibility')
    else {
      ok('target rejected the range with a compatibility diagnostic')
      const restored = runDsh(['--profile', 'matrix', '--dump-config'])
      if (restored.status !== 0) fail(`dump after rejection failed: ${(restored.stderr || restored.stdout).trim().slice(0, 400)}`)
      else if (restored.stdout.includes('dsh-smart-assistant')) fail('profile still mentions the plugin after rejection')
      else ok('profile restored after rejection')
    }
  } else if (added.status !== 0) {
    fail(`install failed: ${text.trim().slice(-600)}`)
  } else {
    ok('target installed the plugin')
    const dump = runDsh(['--profile', 'matrix', '--dump-config'])
    if (dump.status !== 0) fail(`dump failed: ${(dump.stderr || dump.stdout).trim().slice(0, 400)}`)
    else if (!dump.stdout.includes('preset-assistant')) fail('composition has no preset-assistant row')
    else ok('composition carries preset-assistant')
    if (existsSync(join(home, 'assistant'))) fail('install created a working folder')
    else ok('install wrote no working folder')
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dsh: expectedVersion,
    expect,
    status: failures.length === 0 ? 'passed' : 'failed',
    installExit: added.status,
    failures,
  }
  mkdirSync(join(root, 'reports'), { recursive: true })
  writeFileSync(join(root, 'reports', `${expectedVersion}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`\nreport: ${join(root, 'reports', `${expectedVersion}.json`)}`)
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (keep || failures.length > 0) console.log(`kept ${home}`)
  else rmSync(home, { recursive: true, force: true })
}

console.log('')
if (failures.length === 0) {
  console.log('compat-matrix: passed')
  process.exit(0)
}
console.log(`compat-matrix: ${failures.length} failure(s)`)
process.exit(1)
