#!/usr/bin/env node
/**
 * Product-mode proof: pack → extract → `bootstrap.mjs --workspace` with a wrapper `dsh` →
 * profile/dump assertions → real boot → Config persistence + workspace registration + an
 * in-process session cwd probe → stop. The binding must live in the profile Config, not in a
 * profile Config.
 *
 * The smoke never touches the daily `~/.dsh`: the product home and workspace live under `.tmp/`.
 * The wrapper exists only because this checkout's `dsh` is the pinned source CLI. The probe row
 * is written into the temporary profile (never into the package) and proves the two things a
 * `--dump-config` cannot: the boot-time `workspaceRegistry.create` and the session `header.cwd`.
 *
 * Usage: node scripts/release/product-smoke.mjs [--keep]
 * Exit 0 = profile/Config correct, workspace registered, session cwd = workspace, stop clean.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const keep = process.argv.includes('--keep')
const root = mkTmpDir('product-smoke', 'run-')
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

const bootstrapPath = join(packageDir, 'bootstrap.mjs')
const bootstrap = (args) => run(process.execPath, [bootstrapPath, ...args], { cwd: root, timeout: 300_000 })
const text = result => `${result.stdout ?? ''}${result.stderr ?? ''}`

const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const wrapperDir = join(root, 'bin')
const wrapper = join(wrapperDir, 'dsh')
const home = join(root, 'home')
const workspace = join(root, 'workspace')
const profilesDir = join(home, 'profiles', 'assistant')

try {
  step('packing and extracting the shipped package')
  const packed = run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', root])
  const tarball = join(root, `${packageJson.name}-${packageJson.version}.tgz`)
  if (packed.status !== 0 || !existsSync(tarball)) fail(`pack failed: ${(packed.stderr ?? '').trim().slice(0, 300)}`)
  else ok(`packed ${tarball}`)
  const extracted = join(root, 'pkg')
  mkdirSync(extracted, { recursive: true })
  const untar = run('tar', ['-xzf', tarball, '-C', extracted])
  const pkg = join(extracted, 'package')
  if (untar.status !== 0 || !existsSync(join(pkg, 'bootstrap.mjs'))) fail('extracted package has no bootstrap.mjs')
  else ok('extracted package has bootstrap.mjs')

  mkdirSync(wrapperDir, { recursive: true })
  const tsx = fileURLToPath(import.meta.resolve('tsx/esm'))
  const cli = join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  writeFileSync(wrapper, `#!/bin/sh\nexport TSX_TSCONFIG_PATH="${join(repoRoot, 'tsconfig.tsx.json')}"\nexec "${process.execPath}" --import "${tsx}" "${cli}" "$@"\n`, 'utf8')
  chmodSync(wrapper, 0o755)

  step('refusing a missing workspace before creating the product home')
  const badHome = join(root, 'bad-home')
  const missing = bootstrap(['--workspace', join(root, 'missing'), '--home', badHome, '--dsh', wrapper, '--no-start'])
  if (missing.status === 0) fail('bootstrap accepted a missing workspace')
  else if (existsSync(badHome)) fail('bootstrap created the home before rejecting the workspace')
  else ok('missing workspace refused before home creation')

  step(`creating the product profile and binding ${workspace}`)
  mkdirSync(workspace, { recursive: true })
  const prepared = bootstrap(['--workspace', workspace, '--home', home, '--dsh', wrapper, '--no-start'])
  if (prepared.status !== 0) fail(`product --no-start failed (exit ${String(prepared.status)}):\n${text(prepared).trim().split('\n').slice(-10).join('\n')}`)
  else ok('product --no-start exited 0')

  const profileManifest = join(profilesDir, 'package.json')
  if (!existsSync(profileManifest)) fail('profile manifest is missing')
  else {
    const manifest = JSON.parse(readFileSync(profileManifest, 'utf8'))
    const bundles = manifest.dsh?.profile?.bundles ?? []
    if (!bundles.includes('dsh-smart-assistant')) fail('profile bundles do not include dsh-smart-assistant')
    else ok('profile roster includes the package')
  }


  const dump = run(wrapper, ['--profile', 'assistant', '--dump-config'], {
    env: { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: join(home, 'agents-home') },
    timeout: 120_000,
  })
  if (dump.status !== 0) fail('dump-config failed')
  else if (!dump.stdout.includes('assistant-product') || !dump.stdout.includes('preset-assistant')) {
    fail('dump-config lacks assistant-product or preset-assistant')
  } else ok('dump-config has the product row and preset')

  step('refusing a foreign profile with the same name')
  const foreignHome = join(root, 'foreign-home')
  mkdirSync(join(foreignHome, 'profiles', 'assistant'), { recursive: true })
  writeFileSync(join(foreignHome, 'profiles', 'assistant', 'package.json'), JSON.stringify({
    name: 'dsh-profile-assistant',
    private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } },
  }), 'utf8')
  const foreign = bootstrap(['--product', '--home', foreignHome, '--workspace', workspace, '--dsh', wrapper, '--no-start'])
  if (foreign.status === 0) fail('bootstrap accepted a foreign profile')
  else ok('foreign profile refused')

  step('booting the product and probing the session cwd')
  writeFileSync(join(profilesDir, 'product-smoke-probe.mjs'), `import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const name = 'product-smoke-probe'
export const inject = ['workspaceRegistry', 'sessionController', 'sessions']

export function apply(ctx) {
  const home = process.env.DSH_HOME
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const main = async () => {
    let ws
    for (let index = 0; index < 100; index += 1) {
      ws = ctx.workspaceRegistry.list()[0]
      if (ws !== undefined) break
      await sleep(100)
    }
    if (ws === undefined) throw new Error('no registered workspace within 10s')
    const created = await ctx.sessionController.create({ workspaceId: ws.id, agentPreset: 'assistant' })
    const session = ctx.sessions.get(created.sessionId)
    writeFileSync(join(home, 'probe-result.json'), JSON.stringify({ workspacePath: ws.path, cwd: session?.header.cwd, preset: created.agentPreset }) + '\\n', { encoding: 'utf8', mode: 0o600 })
  }
  main().catch(error => {
    try { writeFileSync(join(home, 'probe-result.json'), JSON.stringify({ error: String(error?.stack ?? error) }) + '\\n', { encoding: 'utf8', mode: 0o600 }) } catch { /* best effort */ }
  })
}
`, 'utf8')
  const patchPath = join(profilesDir, 'cordis.patch.yml')
  writeFileSync(patchPath, `${readFileSync(patchPath, 'utf8').trimEnd()}
- insert:
    - id: product-smoke-probe
      name: './product-smoke-probe.mjs'
`, 'utf8')
  rmSync(join(home, 'probe-result.json'), { force: true })
  const started = bootstrap(['--workspace', workspace, '--home', home, '--dsh', wrapper])
  if (started.status !== 0) fail(`product boot failed (exit ${String(started.status)}):\n${text(started).trim().split('\n').slice(-12).join('\n')}`)
  else ok('product instance handed over a URL')

  const resultPath = join(home, 'probe-result.json')
  const deadline = Date.now() + 90_000
  while (!existsSync(resultPath) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!existsSync(resultPath)) fail('probe result did not appear within 90s')
  else {
    let result
    try {
      result = JSON.parse(readFileSync(resultPath, 'utf8'))
    } catch {
      result = undefined
    }
    if (result?.error !== undefined) fail(`probe failed: ${String(result.error).slice(0, 400)}`)
    else if (result?.cwd !== realpathSync(workspace)) fail(`session cwd mismatch: ${JSON.stringify(result)}`)
    else if (result?.preset !== 'assistant') fail(`session preset mismatch: ${JSON.stringify(result)}`)
    else ok('session header.cwd equals the workspace')
  }

  const registryPath = join(home, 'storages', 'workspace.json')
  if (!existsSync(registryPath)) fail('storages/workspace.json is missing')
  else {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
    const found = Object.entries(registry.tables?.workspaces ?? {}).find(([, row]) => row.path === realpathSync(workspace))
    if (found === undefined) fail('the workspace is not registered in storages/workspace.json')
    else ok(`workspace registered (${found[0]})`)
  }

  const patchText = readFileSync(join(profilesDir, 'cordis.patch.yml'), 'utf8')
  if (!new RegExp(`workspaceDir:.*${realpathSync(workspace).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(patchText)) {
    fail(`profile patch does not persist workspaceDir: ${patchText.slice(-500)}`)
  } else ok('profile Config persists the canonical workspace')

  const statePath = join(home, 'bootstrap.json')
  if (!existsSync(statePath)) fail('bootstrap.json is missing')
  else {
    const state = JSON.parse(readFileSync(statePath, 'utf8'))
    if (state.mode !== 'product' || state.profile !== 'assistant') fail(`state mismatch: ${JSON.stringify({ mode: state.mode, profile: state.profile })}`)
    else ok('bootstrap state names product mode and the assistant profile')
  }

  step('stopping the product instance')
  const stopped = bootstrap(['--stop', '--home', home, '--product'])
  if (stopped.status !== 0) fail(`stop failed (exit ${String(stopped.status)}): ${text(stopped).trim().slice(0, 300)}`)
  else if (existsSync(join(home, 'bootstrap.pid'))) fail('pid file survived stop')
  else ok('stop removed the pid and exited 0')
} finally {
  if (existsSync(join(home, 'bootstrap.pid'))) {
    bootstrap(['--stop', '--home', home, '--product'])
  }
  if (!keep) rmSync(root, { recursive: true, force: true })
  else console.log(`\nkept ${root}`)
}

if (failures.length > 0) {
  console.log(`\nproduct-smoke: ${failures.length} failure(s)`)
  process.exit(1)
}
console.log('\nproduct-smoke: passed')
