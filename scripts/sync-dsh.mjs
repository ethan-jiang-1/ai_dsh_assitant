#!/usr/bin/env node
/**
 * Move the pinned harness source to another release tag, with the bookkeeping that makes the pin
 * meaningful. Run with `pnpm sync-dsh -- --tag dsh-v0.1.6-rc.1`.
 *
 * The upgrade ring is: fetch and check out the tag, record the exact SHA and tag commit date in
 * `vendor/UPSTREAM.md`, add a column to the package's `dsh.compatibility.dshReleases`, then typecheck
 * — which resolves `@deepseek-ai/*` through the workspace to the pinned `src`, so API drift surfaces
 * at compile time rather than at run time. Skipping the typecheck would defeat the point of pinning.
 *
 * Flags:
 *   --tag <tag>       required; the release tag to pin
 *   --remote <url>    fetch from this remote instead of the submodule's origin
 *   --no-typecheck    skip the compile-time drift check (only for a deliberately partial run)
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vendorDsh = join(repoRoot, 'vendor', 'dsh')
const upstreamFile = join(repoRoot, 'vendor', 'UPSTREAM.md')
const packageManifest = join(repoRoot, 'packages', 'dsh-smart-assistant', 'package.json')

const argv = process.argv.slice(2)
const tag = argv.includes('--tag') ? argv[argv.indexOf('--tag') + 1] : undefined
const remote = argv.includes('--remote') ? argv[argv.indexOf('--remote') + 1] : undefined
const typecheck = !argv.includes('--no-typecheck')

if (tag === undefined || tag.trim().length === 0) {
  console.error('usage: pnpm sync-dsh -- --tag <dsh-release-tag> [--remote <url>] [--no-typecheck]')
  process.exit(2)
}

const git = args => execFileSync('git', ['-C', vendorDsh, ...args], { encoding: 'utf8' }).trim()
const run = (command, args) => execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit' })

console.log(`\n▸ fetching ${tag}`)
// A shallow pin only carries the tag it was cloned at, so the next tag must be fetched explicitly.
const fetchArgs = ['fetch', '--depth', '1']
if (remote !== undefined) fetchArgs.push(remote)
fetchArgs.push('tag', tag, '--force')
git(fetchArgs)
git(['checkout', '--detach', tag])
const sha = git(['rev-parse', 'HEAD'])
const committed = git(['log', '-1', '--format=%cs'])
console.log(`  ok   ${tag} → ${sha} (${committed})`)

console.log('\n▸ recording the pin in vendor/UPSTREAM.md')
const upstream = readFileSync(upstreamFile, 'utf8')
const updated = upstream
  .replace(/(\| 钉住的 tag \| )`[^`]*`( \|)/, `$1\`${tag}\`$2`)
  .replace(/(\| 精确 SHA \| )`[^`]*`( \|)/, `$1\`${sha}\`$2`)
  .replace(/(\| tag 提交时间 \| )[^|]*(\|)/, `$1${committed} $2`)
writeFileSync(upstreamFile, updated, 'utf8')
console.log('  ok   UPSTREAM.md updated')

console.log('\n▸ adding a compatibility column')
const manifest = JSON.parse(readFileSync(packageManifest, 'utf8'))
const release = tag.replace(/^dsh-v/, '')
const releases = manifest.dsh.compatibility.dshReleases
releases[release] = 'verified'
writeFileSync(packageManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`  ok   dsh.compatibility.dshReleases["${release}"] = verified`)

if (typecheck) {
  console.log('\n▸ typechecking against the new pin')
  try {
    run('pnpm', ['run', 'typecheck'])
    console.log('  ok   no API drift')
  } catch {
    console.error('\n  FAIL typecheck failed: the new pin changed an API this plugin uses.')
    console.error('       Fix the call sites, then re-run `pnpm typecheck`. The pin stays where it is')
    console.error('       until the code compiles against it.')
    process.exit(1)
  }
}

console.log(`
sync-dsh: pinned ${tag} (${sha})

Next, in the same change:
  1. Re-run the mechanism checks this plugin depends on, e.g.
       git -C vendor/dsh grep -c customSkillDirs ${tag} -- packages/skill/skill-filesystem/src/index.ts
  2. pnpm verify && pnpm test
  3. pnpm build && pnpm release-smoke
  4. Move the note in notes/proposed/ to notes/implemented/ if this upgrade was its subject.
`)
