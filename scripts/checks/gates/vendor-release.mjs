/**
 * Gate cores about the pinned vendor tree and release posture: submodule pin,
 * dependency pose, vendor client freshness, and the exported install manual.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pinnedTagFrom } from '../../maintenance/sync-bookkeeping.mjs'
import { read } from './shared.mjs'

function tryGit(args, cwd) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

// ── submodule pin ────────────────────────────────────────────────────────────────────────────────

/**
 * The vendor/dsh pin against its bookkeeping. Checks four facts:
 *   1. the tree is checked out and declared (.gitmodules);
 *   2. `git describe --tags` matches the tag recorded in vendor/UPSTREAM.md;
 *   3. the checked-out HEAD is the exact SHA recorded in vendor/UPSTREAM.md;
 *   4. no tracked source file under vendor/dsh is modified (untracked build output is exempt —
 *      it is generated, not pinned).
 *
 * Parent gitlink semantics: a divergence between the parent's COMMITTED pointer (`git ls-tree
 * HEAD`) and the checkout is the normal pending tail of a `pnpm sync-dsh` run — the parent
 * commit lands last — so it is allowed exactly when the bookkeeping already matches the new
 * checkout (rule 3); any other divergence is reported by that rule.
 *
 * @param {string} repoRoot - repository root carrying vendor/dsh, vendor/UPSTREAM.md, .gitmodules.
 */
export function pinProblems(repoRoot) {
  const problems = []
  const vendorDsh = join(repoRoot, 'vendor', 'dsh')
  if (!existsSync(join(vendorDsh, 'packages', 'core', 'tools', 'src', 'index.ts'))) {
    return ['vendor/dsh is not checked out — run `git submodule update --init`']
  }
  const gitmodules = existsSync(join(repoRoot, '.gitmodules')) ? read(join(repoRoot, '.gitmodules')) : ''
  if (!gitmodules.includes('vendor/dsh')) problems.push('.gitmodules does not declare vendor/dsh')
  const upstream = existsSync(join(repoRoot, 'vendor', 'UPSTREAM.md')) ? read(join(repoRoot, 'vendor', 'UPSTREAM.md')) : ''
  const tag = pinnedTagFrom(upstream)
  const sha = /`([0-9a-f]{40})`/.exec(upstream)?.[1]
  if (tag === undefined) problems.push('vendor/UPSTREAM.md does not record the pinned tag')
  if (sha === undefined) problems.push('vendor/UPSTREAM.md does not record the exact SHA')

  const status = tryGit(['status', '--porcelain'], vendorDsh) ?? ''
  for (const line of status.split('\n')) {
    if (line === '' || line.startsWith('??')) continue // untracked artifacts are generated, not pinned
    problems.push(`vendor/dsh has tracked-source changes (rule 4): ${line.trim()}`)
  }

  const head = tryGit(['rev-parse', 'HEAD'], vendorDsh)
  if (head === undefined) problems.push('could not read the submodule HEAD (git rev-parse failed)')
  if (tag !== undefined) {
    const described = tryGit(['describe', '--tags'], vendorDsh)
    if (described === undefined) problems.push('could not read the submodule revision (git describe failed)')
    else if (described !== tag) problems.push(`vendor/dsh is at ${described}, UPSTREAM.md records ${tag}`)
  }
  if (sha !== undefined && head !== undefined && sha !== head) {
    problems.push(`vendor/dsh is checked out at ${head.slice(0, 12)}, UPSTREAM.md records ${sha.slice(0, 12)} (rule 3) — finish or revert the upgrade via pnpm sync-dsh`)
  }
  return problems
}

/**
 * Harness packages are peers, never runtime dependencies (DSH: extension plugins depend on
 * Service Definitions, never concrete providers), the manifest declares machine-readable
 * compatibility, and the recorded verification history must name the pinned upstream tag so
 * "which release was verified" cannot drift from the submodule.
 *
 * `engines.dsh` is the machine range DSH enforces; `dsh.compatibility.dshReleases` remains the
 * historical typecheck ledger (sync-dsh writes it), not a second support promise.
 *
 * @param {string} packageJsonPath - the plugin package.json.
 * @param {string} upstreamPath - vendor/UPSTREAM.md bookkeeping.
 */
export function dependencyPoseProblems(packageJsonPath, upstreamPath) {
  const problems = []
  const pkg = JSON.parse(read(packageJsonPath))
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (name.startsWith('@deepseek-ai/')) {
        problems.push(`${field}.${name} — harness packages stay peerDependencies so the deployment owns the version`)
      }
    }
  }
  if (typeof pkg.engines?.dsh !== 'string' || pkg.engines.dsh.trim() === '') {
    problems.push('engines.dsh is missing — DSH cannot judge plugin compatibility from a declaration it cannot read')
  }
  if (typeof pkg.engines?.node !== 'string' || pkg.engines.node.trim() === '') {
    problems.push('engines.node is missing — the supported Node range is part of the install contract')
  }
  const tag = pinnedTagFrom(read(upstreamPath))
  const pinned = tag === undefined ? undefined : tag.replace(/^dsh-v/, '')
  const releases = Object.keys(pkg.dsh?.compatibility?.dshReleases ?? {})
  if (pinned !== undefined && !releases.includes(pinned)) {
    problems.push(`dsh.compatibility.dshReleases (${releases.join(', ')}) does not name the pinned upstream tag ${pinned}`)
  }
  return problems
}

// ── vendor client-face freshness ────────────────────────────────────────────────────────────────

/** Newest mtime (ms) among `src/**` .ts/.tsx files under one package; undefined when there is no src. */
function newestSrcMtime(packageDir) {
  const srcDir = join(packageDir, 'src')
  if (!existsSync(srcDir)) return undefined
  let newest
  const visit = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) visit(path)
      else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        const mtime = statSync(path).mtimeMs
        newest = newest === undefined ? mtime : Math.max(newest, mtime)
      }
    }
  }
  visit(srcDir)
  return newest
}

/**
 * Vendored browser artifacts must not be older than the sources they were built from. A pin
 * switch rewrites vendor sources and leaves the gitignored `lib/client.js` builds behind, and a
 * partially rebuilt client face set fractures the web boot (new client bundles against a stale
 * `api/remotes` assembly left a fresh home on a full-screen "Failed to load plugins" — evidence:
 * notes/archived/2026-09-30-dsh-0-2-0-rc-2-pin.md, 2026-10-03 补正). Skips, and why:
 *   - a package without `lib/client.js` has no built face yet (fresh clone; `prepare.sh` owns that);
 *   - `packages/experimental/` hosts preview-only faces whose packages declare no `bundle` script,
 *     so the rebuild playbook cannot refresh them and they are not in the served composition;
 *   - a missing `apps/web/dist/index.html` means the shell was never built here (`prepare.sh`).
 *
 * @param {string} vendorPackagesRoot - path of `vendor/dsh/packages`.
 * @param {string} webAppRoot - path of `vendor/dsh/apps/web` (its `src` and `dist` are compared).
 * @returns {string[]} problem strings; empty = every present client face and the web dist are fresh.
 */
export function vendorClientFreshnessProblems({ vendorPackagesRoot, webAppRoot }) {
  const problems = []
  for (const group of readdirSync(vendorPackagesRoot).sort()) {
    if (group === 'experimental') continue
    const groupDir = join(vendorPackagesRoot, group)
    if (!statSync(groupDir).isDirectory()) continue
    for (const pkg of readdirSync(groupDir).sort()) {
      const packageDir = join(groupDir, pkg)
      const libClient = join(packageDir, 'lib', 'client.js')
      if (!statSync(packageDir).isDirectory() || !existsSync(libClient)) continue
      const newest = newestSrcMtime(packageDir)
      if (newest !== undefined && statSync(libClient).mtimeMs < newest) {
        const face = `${join('vendor/dsh/packages', group, pkg)}/lib/client.js`
        problems.push(`${face} is older than its sources — rebuild the WHOLE stale set, then the web shell (a partial rebuild fractures the client): pnpm --dir <pkg> run bundle && pnpm --dir vendor/dsh/apps/web run build`)
      }
    }
  }
  const distIndex = join(webAppRoot, 'dist', 'index.html')
  if (existsSync(distIndex)) {
    let newest = newestSrcMtime(join(webAppRoot))
    for (const pkg of readdirSync(join(vendorPackagesRoot, 'client')).sort()) {
      const mtime = newestSrcMtime(join(vendorPackagesRoot, 'client', pkg))
      if (mtime !== undefined) newest = newest === undefined ? mtime : Math.max(newest, mtime)
    }
    if (newest !== undefined && statSync(distIndex).mtimeMs < newest) {
      problems.push('vendor/dsh/apps/web/dist is older than client sources — rebuild the web shell: pnpm --dir vendor/dsh/apps/web run build')
    }
  }
  return problems
}

// ── manual export ────────────────────────────────────────────────────────────────────────────────

/**
 * The exported install manual (`_dist/安装手册.md`) is the only tracked artifact of a manual
 * distribution: the tarball next to it is gitignored, so a version bump without a re-export would
 * otherwise leave a manual advertising a tarball that no longer exists. This gate pins the manual's
 * header table to the package manifest. No manual = nothing exported yet = nothing to check (the
 * gate must stay green on fresh clones, where `_dist/` does not exist).
 */
export function exportManualProblems({ manualPath, manifest, upstreamTag }) {
  if (!existsSync(manualPath)) return []
  const text = read(manualPath)
  const problems = []
  const version = /^\| 版本 \| `?([^`|\n]+?)`? \|$/m.exec(text)?.[1]?.trim()
  if (version !== manifest.version) {
    problems.push(`manual 版本 row says ${version ?? 'nothing'}, package.json says ${manifest.version} — rerun \`pnpm export-dist\``)
  }
  const expected = `${manifest.name}-${manifest.version}.tgz`
  // The generator appends a suffix（与本手册同目录）after the filename, so only the backticked
  // token itself is pinned — anchoring the row end red-lined the real artifact (the fixtures
  // mirror the generated shape, so this cannot regress silently).
  const tarball = /^\| 安装包 \| `([^`]+)`/m.exec(text)?.[1]?.trim()
  if (tarball !== expected) {
    problems.push(`manual 安装包 row says ${tarball ?? 'nothing'}, expected ${expected}`)
  }
  // The 验证基线 row pins the DSH tag the manual was verified against. It went stale once for
  // real (0.1.7 → 0.2.0 pin bump without a re-export) because only the version row was gated.
  const baseline = /^\| 验证基线 \| DSH `([^`|]+)`/m.exec(text)?.[1]?.trim()
  if (!baseline) {
    problems.push('manual 验证基线 row is missing — rerun `pnpm export-dist`')
  } else if (upstreamTag && baseline !== upstreamTag) {
    problems.push(`manual 验证基线 row says ${baseline}, vendor/UPSTREAM.md pins ${upstreamTag} — rerun \`pnpm export-dist\``)
  }
  return problems
}

// ── tag / version alignment ──────────────────────────────────────────────────────────────────────

/**
 * A tag is the name of a release, so it has to name the package version inside the commit it
 * marks: `0.1.0` on a commit whose manifest still says `0.0.0` advertises an artifact that never
 * existed. The runner resolves each tag to the manifest version at that commit (git I/O); the
 * core only judges the pairs.
 * @param {{ tags: Array<{name: string, version: string | undefined}> }} inputs
 * @returns {string[]} one problem per tag whose name is not the version it points at.
 */
export function tagVersionProblems({ tags }) {
  return tags.flatMap(({ name, version }) =>
    name === version
      ? []
      : [`tag ${name} points at package version ${version ?? 'nothing'} — a tag names the release it marks, so version the commit and retag`])
}
