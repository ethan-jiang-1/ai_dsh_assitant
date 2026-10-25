#!/usr/bin/env node
/**
 * Real-install smoke: pack the plugin, install it into a clean harness home, and assert the
 * composition actually carries it. Run with `pnpm release-smoke`.
 *
 * Source-checkout tests hide dependency-declaration mistakes — a missing runtime dependency or a
 * peer range that is too narrow only shows up when the package is installed the way a user installs
 * it. So this script never runs from the workspace: it packs a tarball, points `DSH_HOME` at a
 * throwaway home, installs the tarball with `dsh plugin add`, points the preset roster at the
 * *installed* `presets/` directory, and reads the composed tree back with `--dump-config`.
 *
 * The profile is created from the shipped `headless` template: the one-shot runner row and the
 * positional-task parsing both live in the headless bundle, so a base/web-only profile could not
 * run a one-shot turn at all. The preset roster is then INSERTED (the headless template has no
 * roster row to replace) pointing at the *installed* `presets/` directory, mirroring
 * `dev/profiles/profile-patch-headless.yml`.
 *
 * A live model turn is optional: without `DEEPSEEK_API_KEY`, that step self-skips and every
 * composition assertion still runs — including the patched dump proving the preset-mounted
 * runner is in the composition. The turn runs through `dsh-smart-assistant/preset-runner`
 * (the same driver `dev/probes/session/preset-runner.patch.yml` mounts in dev), so a keyed run joins the
 * assistant preset instead of the shipped bare-agent one-shot — this is what "the live turn"
 * can honestly claim to verify.
 *
 * Flags:
 *   --keep        keep the throwaway home for inspection (prints its path)
 *   --dsh <cmd>   harness launcher to use (default: the pinned source checkout via tsx)
 */

import { execFile, execFileSync, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const argv = process.argv.slice(2)
const keep = argv.includes('--keep')
const dshOverride = argv.includes('--dsh') ? argv[argv.indexOf('--dsh') + 1] : undefined
const profile = 'smoke'
const PACKAGE_NAME = 'dsh-smart-assistant'

const failures = []
const execFileAsync = promisify(execFile)
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
    console.error(`vendor/dsh is not checked out (${bin} missing) — run \`git submodule update --init\``)
    process.exit(2)
  }
  // The runtime facade is what lets tsx load the pinned sources instead of unbuilt lib/ output.
  return { command: process.execPath, prefix: ['--import', 'tsx/esm', bin] }
}

const home = mkTmpDir('release-smoke', 'assistant-smoke-')
const env = {
  ...process.env,
  DSH_HOME: home,
  TSX_TSCONFIG_PATH: join(repoRoot, 'tsconfig.tsx.json'),
}
const { command, prefix } = dshCommand()
const dsh = args => run(command, [...prefix, ...args], { cwd: repoRoot, env })

try {
  step(`packing ${packageDir}`)
  // `pnpm pack`, not `npm pack`: only pnpm rewrites the `workspace:` protocol into concrete ranges.
  // Packing with npm would ship `"@deepseek-ai/dsh-tools": "workspace:^"` verbatim, which no
  // consumer can resolve — so this is also the check that the published manifest is installable.
  const packed = run('pnpm', ['pack', '--pack-destination', home], { cwd: packageDir })
    .trim().split('\n').filter(Boolean).pop()
  // pnpm prints an absolute path where npm prints a bare file name.
  const tarball = isAbsolute(packed) ? packed : join(home, packed)
  ok(`packed ${packed}`)

  step('inspecting the tarball for self-containment and rewritten peer ranges')
  const listing = run('tar', ['-tzf', tarball]).split('\n').filter(Boolean)
  for (const required of ['package/package.json', 'package/cordis.patch.yml', 'package/lib/index.js', 'package/bin/ov-doctor.mjs']) {
    if (!listing.includes(required)) fail(`tarball is missing ${required} — did \`pnpm build\` run?`)
  }
  if (listing.some(entry => entry.includes('/vendor/'))) fail('tarball contains a vendor/ path')
  const manifest = JSON.parse(run('tar', ['-xzOf', tarball, 'package/package.json']))
  for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
    if (String(range).startsWith('workspace:')) {
      fail(`peerDependencies.${name} still says ${range} after packing — pack with pnpm, never with npm`)
    }
    if (!/^[\^~]?\d/.test(String(range))) {
      fail(`peerDependencies.${name} is "${range}", which is not a concrete semver range`)
    }
  }
  ok(`${listing.length} files; peer ranges are concrete`)

  step('refusing an incompatible DSH range by the manifest, not a peer fallback')
  // The real tarball's successful install below proves the declared range covers this runtime.
  // This copy proves the negative: an own engines.dsh that excludes the runtime is refused
  // before installation, with the compatibility requirement named. Without it, a future DSH pin
  // can skip the bundle silently (the OpenViking 0.5.8 failure mode).
  if (typeof manifest.engines?.dsh !== 'string' || manifest.engines.dsh.trim() === '') {
    fail('packed manifest has no engines.dsh — DSH cannot judge compatibility')
  } else if (typeof manifest.engines?.node !== 'string' || manifest.engines.node.trim() === '') {
    fail('packed manifest has no engines.node — the supported Node range is part of the install contract')
  } else {
    try {
      const incompatibleDir = join(home, 'incompatible-package')
      mkdirSync(incompatibleDir, { recursive: true })
      run('tar', ['-xzf', tarball, '-C', incompatibleDir])
      const incompatibleManifestPath = join(incompatibleDir, 'package', 'package.json')
      const incompatibleManifest = JSON.parse(readFileSync(incompatibleManifestPath, 'utf8'))
      incompatibleManifest.engines = { ...incompatibleManifest.engines, dsh: '>=999.0.0' }
      writeFileSync(incompatibleManifestPath, `${JSON.stringify(incompatibleManifest, null, 2)}\n`, 'utf8')
      const incompatibleTarball = join(home, 'dsh-smart-assistant-incompatible.tgz')
      run('tar', ['-czf', incompatibleTarball, '-C', incompatibleDir, 'package'])
      const refused = spawnSync(command, [...prefix, 'plugin', '--profile', 'compat-smoke', 'add', incompatibleTarball], {
        cwd: repoRoot, env, encoding: 'utf8',
      })
      const output = `${refused.stdout ?? ''}${refused.stderr ?? ''}`
      if (refused.status === 0) fail('an incompatible engines.dsh install was accepted')
      else if (!/incompatible|engines\.dsh/i.test(output)) fail(`incompatible install failed without naming compatibility: ${output.trim().slice(0, 400)}`)
      else ok('incompatible engines.dsh is refused and named')
    } catch (error) {
      fail(`incompatible-range probe threw: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  step(`creating a clean profile from the shipped headless template at ${home}`)
  // The profile directory must NOT pre-exist: `--from-default-profile` refuses to initialize over one.
  // The headless template carries the one-shot runner and positional-task parsing; the roster
  // row it lacks is inserted below (replace semantics would patch nothing and only warn).
  writeFileSync(join(home, '.credentials.yaml'), '# no key here: the live turn self-skips\n', 'utf8')
  dsh(['--profile', profile, '--from-default-profile', 'headless', '--dump-config'])
  if (!existsSync(join(home, 'profiles', profile, 'package.json'))) {
    fail('the profile was not created from the headless template')
  } else {
    ok('profile created from the headless template (one-shot runner + positional parsing)')
  }

  step('installing the tarball')
  dsh(['plugin', '--profile', profile, 'add', tarball])
  // 0.1.7: the preset definition ships inside the bundle patch (`cordis.patch.yml`), so the
  // install assertion follows that file instead of a presets/ directory.
  const installedPatch = join(home, 'profiles', profile, 'node_modules', PACKAGE_NAME, 'cordis.patch.yml')
  if (!existsSync(installedPatch)) fail(`installed package has no cordis.patch.yml at ${installedPatch}`)
  else if (!readFileSync(installedPatch, 'utf8').includes('preset-assistant')) fail('installed bundle patch declares no preset-assistant row')
  else ok('dsh plugin add installed the package with its preset row')

  step('selecting the installed preset as the profile default (the shape a user gets)')
  // insert semantics — the headless template has no registry row to replace
  // (dev/profiles/profile-patch-headless.yml is the same shape in dev). The definition itself arrives with
  // the plugin's bundle patch, so nothing here points at a directory.
  writeFileSync(join(home, 'profiles', profile, 'cordis.patch.yml'), `# Written by scripts/release-smoke.mjs
- insert:
    - id: agent-preset-registry
      name: '@deepseek-ai/dsh-agent-preset-registry'
      config:
        default: assistant
`, 'utf8')

  step('reading the composed tree back')
  const dump = dsh(['--profile', profile, '--dump-config'])
  if (!dump.includes('assistant-memory')) fail('--dump-config does not show the host-plane row assistant-memory')
  if (!dump.includes(PACKAGE_NAME)) fail(`--dump-config does not mention ${PACKAGE_NAME}`)
  else ok('host-plane row is in the composition')
  if (!dump.includes('assistant')) fail('--dump-config does not show the preset roster default')
  else ok('the preset is the profile default')

  step('clean-home web profile: the install-manual path (install + preset default)')
  // The manual installs into the shipped `web` profile and then replaces the registry default.
  // This second profile proves that exact path on the same throwaway home; the headless profile
  // above remains the one-shot/live-turn carrier.
  const webProfile = 'web-smoke'
  dsh(['--profile', webProfile, '--from-default-profile', 'web', '--dump-config'])
  dsh(['plugin', '--profile', webProfile, 'add', tarball])
  const webBefore = dsh(['--profile', webProfile, '--dump-config'])
  if (!/default:\s*standard/.test(webBefore)) fail('web profile did not start on the standard preset default')
  else ok('web profile installs on the standard default (the preset is not assistant yet)')
  writeFileSync(join(home, 'profiles', webProfile, 'cordis.patch.yml'), `# Written by scripts/release-smoke.mjs — the step the install manual documents
- id: agent-preset-registry
  config:
    default: assistant
`, 'utf8')
  const webAfter = dsh(['--profile', webProfile, '--dump-config'])
  if (!webAfter.includes('preset-assistant')) fail('web profile dump does not show preset-assistant')
  else if (!/default:\s*assistant/.test(webAfter)) fail('web profile dump does not show the assistant default')
  else ok('web profile: install + preset default is the documented path')

  step('installed ov-doctor: the bin a user actually gets')
  const doctorBin = join(home, 'profiles', webProfile, 'node_modules', PACKAGE_NAME, 'bin', 'ov-doctor.mjs')
  if (!existsSync(doctorBin)) {
    fail(`installed package has no bin/ov-doctor.mjs at ${doctorBin}`)
  } else {
    const help = spawnSync(process.execPath, [doctorBin, '--help'], { encoding: 'utf8' })
    if (help.status !== 0 || !`${help.stdout}${help.stderr}`.includes('ov-doctor')) fail('installed ov-doctor --help did not run')
    else ok('installed ov-doctor --help runs')
    const fakeConfig = join(home, 'ov-doctor.conf.json')
    writeFileSync(fakeConfig, JSON.stringify({
      vlm: { provider: 'openai', api_base: 'http://127.0.0.1:1/v1', api_key: 'sk-test-not-a-key', model: 'test' },
      embedding: { dense: { provider: 'openai', api_base: 'http://127.0.0.1:1/v1', api_key: 'sk-test-not-a-key', model: 'test', dimension: 8 } },
    }), { mode: 0o600 })
    const absent = spawnSync(process.execPath, [doctorBin, '--dsh-home', home, '--profile', webProfile, '--config', fakeConfig, '--base-url', 'http://127.0.0.1:1'], { encoding: 'utf8' })
    if (absent.status !== 2) fail(`installed ov-doctor should exit 2 with the optional layer absent; got ${String(absent.status)}: ${absent.stdout}${absent.stderr}`)
    else ok('installed ov-doctor degrades with exit 2 when the optional layer is absent')
  }

  step('clean-home OV present: install the pinned plugin, mock the server, doctor exits 0')
  const ovTgz = join(repoRoot, 'vendor', 'thirdparty', 'openviking', 'dsh-memory-plugin-0.5.26.tgz')
  if (!existsSync(ovTgz)) {
    fail(`missing pinned OpenViking plugin tarball at ${ovTgz}`)
  } else {
    try {
      dsh(['plugin', '--profile', webProfile, 'add', ovTgz])
      const mock = createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (url.pathname === '/health') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok', healthy: true, version: '0.5.1.1', auth_mode: 'dev' }))
          return
        }
        if (url.pathname === '/api/v1/search/find') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok', result: [] }))
          return
        }
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ status: 'error' }))
      })
      await new Promise((resolve, reject) => {
        mock.once('error', reject)
        mock.listen(0, '127.0.0.1', resolve)
      })
      const mockAddress = mock.address()
      const mockPort = typeof mockAddress === 'object' && mockAddress !== null ? mockAddress.port : 0
      const mockBase = `http://127.0.0.1:${String(mockPort)}`
      try {
        const presentConfig = join(home, 'ov-present.conf.json')
        writeFileSync(presentConfig, JSON.stringify({
          vlm: { provider: 'openai', api_base: 'http://127.0.0.1:9/v1', api_key: 'sk-test-not-a-key', model: 'test' },
          embedding: { dense: { provider: 'openai', api_base: 'http://127.0.0.1:9/v1', api_key: 'sk-test-not-a-key', model: 'test', dimension: 8 } },
        }), { mode: 0o600 })
        try {
          await execFileAsync(process.execPath, [
            doctorBin, '--dsh-home', home, '--profile', webProfile,
            '--config', presentConfig, '--base-url', mockBase, '--no-upstream',
          ], {
            encoding: 'utf8',
            env: { ...process.env, OPENVIKING_CAPTURE_TOOL_RESULTS: 'false', OPENVIKING_URL: mockBase },
          })
          ok('installed doctor: OV present + mock server exits 0')
        } catch (error) {
          fail(`installed doctor with OV present should exit 0; got ${String(error?.code ?? error)}: ${error?.stdout ?? ''}${error?.stderr ?? ''}`)
        }
      } finally {
        await new Promise(resolve => mock.close(resolve))
      }
    } catch (error) {
      fail(`OV-present smoke threw: ${String(error)}`)
    }
  }

  step('keyless check: the preset-mounted one-shot entry is in the composition')
  // The runner patch mirrors dev/probes/session/preset-runner.patch.yml: disable the shipped bare-agent
  // runner, insert ours — which joins the preset from the profile's roster.
  const runnerPatch = join(home, 'preset-runner.patch.yml')
  writeFileSync(runnerPatch, `# Written by scripts/release-smoke.mjs
- id: headless-runner
  disabled: true
- insert:
    - id: assistant-preset-runner
      name: dsh-smart-assistant/preset-runner
      inject: [headlessStartup]
      config:
        task: !!js ctx.headlessStartup.task
`, 'utf8')
  const patched = dsh(['--profile', profile, '--patch', runnerPatch, '--dump-config'])
  if (!patched.includes('assistant-preset-runner')) fail('--patch does not bring the preset-mounted runner into the composition')
  else ok('preset-mounted runner composes (the live turn would join the assistant preset)')

  step('live turn on the assistant preset (self-skips without a key)')
  const key = (process.env.DEEPSEEK_API_KEY ?? '').trim()
  if (key.length === 0) {
    ok('skipped: no DEEPSEEK_API_KEY in the environment — the entry shape above was still checked keylessly')
  } else {
    writeFileSync(join(home, '.credentials.yaml'), `DEEPSEEK_API_KEY: ${key}\n`, 'utf8')
    // The preset-mounted runner prints the turn's final text and exits 0 on completion.
    const answer = dsh(['--profile', profile, '--patch', runnerPatch, 'reply with the single word ready'])
    if (!/ready/i.test(answer)) fail(`live turn did not answer as expected: ${answer.slice(0, 200)}`)
    else ok('live turn answered through the joined assistant preset')
  }
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
  for (const stream of ['stdout', 'stderr']) {
    const text = error?.[stream]?.toString?.()
    if (text && text.trim().length > 0) {
      console.log(`  --- ${stream} ---`)
      console.log(text.split('\n').slice(-20).join('\n'))
    }
  }
} finally {
  if (keep) console.log(`\nkept ${home}`)
  else rmSync(home, { recursive: true, force: true })
}

console.log('')
if (failures.length === 0) {
  console.log('release-smoke: passed')
  process.exit(0)
}
console.log(`release-smoke: ${failures.length} failure(s)`)
process.exit(1)
