#!/usr/bin/env node
/**
 * Dev-loop parity lane: the user's install breakpoint on real tarball bytes.
 *
 * The dev fast loop installs this package as a pnpm link and runs vendor source, so the `files`
 * whitelist, the packed manifest and the profile's dependency closure are never exercised there —
 * a package that works from the symlink can still fail the way a user installs it. The release
 * smokes do cross that boundary, but they run at release time (this repo has no in-repo CI).
 * This lane is the cheap half: build self-check → `pnpm pack` → clean web profile →
 * `dsh plugin add <tgz>` → read the composition back. No boot, no browser, no model.
 *
 * What it cannot prove: boot, client rendering, data boundaries, upgrade/remove, or product
 * behavior. Those stay with `release-smoke` / `product-smoke` / `product-native-smoke` /
 * `web-install-smoke` (docs/release.md §七). The parity table in docs/dev.md §十 names which
 * mechanism point each command owns.
 *
 * Usage: node scripts/release/install-parity.mjs [--keep] [--dsh <command>]
 * Exit 0 = tarball shape + clean-home install + composition assertions pass.
 * Exit 1 = a check failed. Exit 2 = the lane could not run (no vendor checkout / no pnpm).
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const argv = process.argv.slice(2)
const keep = argv.includes('--keep')
const dshOverride = argv.includes('--dsh') ? argv[argv.indexOf('--dsh') + 1] : undefined
const PACKAGE_NAME = 'dsh-smart-assistant'

const failures = []
const step = message => console.log(`\n▸ ${message}`)
const ok = message => console.log(`  ok   ${message}`)
const fail = message => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options })
}

/** Harness launcher: the pinned source checkout unless the caller names another. */
function dshCommand() {
  if (dshOverride !== undefined) return { command: dshOverride, prefix: [] }
  const bin = join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  if (!existsSync(bin)) {
    console.error(`✗ vendor/dsh is not checked out (${bin} missing) — run \`git submodule update --init\``)
    process.exit(2)
  }
  return { command: process.execPath, prefix: ['--import', 'tsx/esm', bin] }
}

const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const home = mkTmpDir('install-parity', 'run-')
const profile = 'parity'
const env = {
  ...process.env,
  DSH_HOME: home,
  TSX_TSCONFIG_PATH: join(repoRoot, 'tsconfig.tsx.json'),
}
const { command, prefix } = dshCommand()
const dsh = args => run(command, [...prefix, ...args], { cwd: repoRoot, env })

try {
  // The packed bytes load `lib/`, and this lane may be the first thing a slice runs — a stale
  // build would make the lane assert yesterday's package (the reason `pnpm build` is in the
  // release checklist). Reuse the same freshness core + fix action the launcher runs.
  step('build self-check (lib/ matches src/)')
  const buildCheck = spawnSync(process.execPath, [join(repoRoot, 'dev', 'env', 'ensure-build.mjs')], { encoding: 'utf8' })
  if (buildCheck.status !== 0) {
    fail(`build self-check failed: ${`${buildCheck.stdout ?? ''}${buildCheck.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')}`)
  } else {
    ok('packed artifacts are current')
  }

  step(`packing ${packageDir}`)
  // `pnpm pack`, not `npm pack`: only pnpm rewrites the `workspace:` protocol into concrete
  // ranges. The published artifact is a pnpm pack; the lane judges those bytes.
  let tarball
  try {
    const packed = run('pnpm', ['pack', '--pack-destination', home], { cwd: packageDir }).trim().split('\n').filter(Boolean).pop()
    tarball = isAbsolute(packed) ? packed : join(home, packed)
    ok(`packed ${packed}`)
  } catch (error) {
    fail(`pnpm pack failed: ${error instanceof Error ? error.message : String(error)}`)
    throw new Error('cannot continue without a tarball')
  }

  step('tarball carries the runtime surface (files whitelist)')
  const listing = run('tar', ['-tzf', tarball]).split('\n').filter(Boolean)
  const required = [
    'package/package.json',
    'package/cordis.patch.yml',
    'package/lib/index.js',
    'package/lib/client/index.js',
    'package/presets/assistant/skills/first-conversation/SKILL.md',
    'package/seeds/management/management-lens-ceo.md',
    'package/locale/en.json',
    'package/locale/zh.json',
    'package/icon.svg',
    'package/LICENSE',
    'package/README.md',
    'package/bin/assistant-data.mjs',
    'package/bin/expert-setup.mjs',
    'package/bin/ov-doctor.mjs',
  ]
  const missing = required.filter(entry => !listing.includes(entry))
  if (missing.length > 0) fail(`tarball is missing ${missing.join(', ')} — did \`pnpm build\` run?`)
  else ok(`${listing.length} files; the runtime surface is inside the whitelist`)

  const shippedSource = listing.filter(entry => entry.endsWith('.map') || /(^|\/)src\//.test(entry))
  if (shippedSource.length > 0) fail(`tarball ships source payload: ${shippedSource.slice(0, 3).join(', ')}`)
  else ok('no sourcemaps or src/ payloads')

  if (listing.includes('package/bootstrap.mjs')) fail('tarball still ships bootstrap.mjs — the installer is a separate release asset')
  else ok('the installer is not inside the bundle')

  step('packed manifest keeps the install gate and concrete ranges')
  const manifest = JSON.parse(run('tar', ['-xzOf', tarball, 'package/package.json']))
  const workspaceRanges = [...Object.entries(manifest.peerDependencies ?? {}), ...Object.entries(manifest.dependencies ?? {})]
    .filter(([, range]) => String(range).startsWith('workspace:'))
  if (workspaceRanges.length > 0) fail(`packed manifest still carries workspace: ranges (${workspaceRanges.slice(0, 3).map(([name]) => name).join(', ')})`)
  else if (manifest.private === true) fail('packed manifest is still private — npm publish would refuse')
  else if (typeof manifest.engines?.dsh !== 'string' || manifest.engines.dsh.trim() === '') fail('packed manifest declares no engines.dsh')
  else if (manifest.dsh?.bundle?.patch === undefined) fail('packed manifest declares no dsh.bundle.patch')
  else if (manifest.name !== PACKAGE_NAME || manifest.version !== packageJson.version) fail(`packed manifest is ${manifest.name}@${manifest.version}, expected ${PACKAGE_NAME}@${packageJson.version}`)
  else ok('name/version, engines.dsh, bundle patch and peer ranges all survive packing')

  step("clean web profile: the same init command a user runs")
  const profileDir = join(home, 'profiles', profile)
  const profilePatchPath = join(profileDir, 'cordis.patch.yml')
  dsh(['--profile', profile, '--from-default-profile', 'web', '--dump-config'])
  if (!existsSync(join(profileDir, 'package.json'))) throw new Error('the profile was not created from the shipped web template')
  const patchBefore = existsSync(profilePatchPath) ? readFileSync(profilePatchPath, 'utf8') : undefined
  ok('profile created from the shipped web template')

  step("installing the tarball (the same install command a user runs)")
  dsh(['plugin', '--profile', profile, 'add', tarball])
  const installedDir = join(profileDir, 'node_modules', PACKAGE_NAME)
  if (!existsSync(join(installedDir, 'cordis.patch.yml'))) fail(`installed package has no cordis.patch.yml at ${installedDir}`)
  else if (!readFileSync(join(installedDir, 'cordis.patch.yml'), 'utf8').includes('preset-assistant')) fail('installed bundle patch declares no preset-assistant row')
  else ok('dsh plugin add installed the bundle with its preset row')

  // The link fast loop never installs the package's own dependencies; the tarball install must.
  const yamlResolved = existsSync(join(profileDir, 'node_modules', 'yaml', 'package.json'))
    || existsSync(join(installedDir, 'node_modules', 'yaml', 'package.json'))
  if (!yamlResolved) fail('the profile did not get the package runtime dependency (yaml) — the dependency closure is not installable')
  else ok('the profile owns the runtime dependency (yaml)')

  if (existsSync(join(installedDir, 'src'))) fail('the installed package carries src/ — the whitelist leaked')
  else ok('the installed package has no source tree')

  step('composition: the tarball alone lights the product (no profile patch)')
  const dump = dsh(['--profile', profile, '--dump-config'])
  if (!dump.includes('preset-assistant')) fail('dump has no preset-assistant row')
  else if (!/default:\s*assistant/.test(dump)) fail('dump does not default to the product preset (the bundle lost its agent-preset-registry override)')
  else if (!dump.includes('assistant-memory') || !dump.includes('assistant-product')) fail('dump has no host-plane rows (assistant-memory / assistant-product)')
  else ok('preset-assistant + default: assistant + host-plane rows are in the composition')

  const patchAfter = existsSync(profilePatchPath) ? readFileSync(profilePatchPath, 'utf8') : undefined
  if (patchAfter !== patchBefore) fail(`install wrote the profile user layer: ${String(patchAfter).slice(0, 120)}`)
  else ok('install did not write the profile user layer')
} catch (error) {
  if (failures.length === 0) fail(error instanceof Error ? error.message : String(error))
} finally {
  if (failures.length > 0) {
    console.error(`\ninstall-parity: ${failures.length} check(s) failed`)
    if (keep) console.error(`kept ${home}`)
    process.exit(1)
  }
  console.log(`\ninstall-parity: green${keep ? ` (kept ${home})` : ''}`)
  if (keep) console.log(`  inspect: ${home}`)
}
