#!/usr/bin/env node
/**
 * Move the pinned harness source to another release tag, with the bookkeeping that makes the pin
 * meaningful. Run with `pnpm sync-dsh -- --tag dsh-v0.1.6-rc.1`.
 *
 * The upgrade ring is: fetch and check out the tag, record the exact SHA and tag commit date in
 * `vendor/UPSTREAM.md`, then typecheck — which resolves `@deepseek-ai/*` through the workspace
 * to the pinned `src`, so API drift surfaces at compile time rather than at run time. Skipping
 * the typecheck would defeat the point of pinning.
 *
 * The `dsh.compatibility.dshReleases` "verified" column is written only AFTER a typecheck that
 * ran and passed (scripts/sync-bookkeeping.mjs releaseClaim): under --no-typecheck or on
 * typecheck failure, no claim is recorded — "verified" is a fact about a passed check, not a
 * side effect of moving the pin.
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
import { applyUpstreamRecord, releaseClaim } from './sync-bookkeeping.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vendorDsh = join(repoRoot, 'vendor', 'dsh')
const upstreamFile = join(repoRoot, 'vendor', 'UPSTREAM.md')
const packageManifest = join(repoRoot, 'packages', 'dsh-smart-assistant', 'package.json')

/** Parse the CLI arguments this tool accepts. */
function parseArguments(argv) {
  return {
    tag: argv.includes('--tag') ? argv[argv.indexOf('--tag') + 1] : undefined,
    remote: argv.includes('--remote') ? argv[argv.indexOf('--remote') + 1] : undefined,
    typecheck: !argv.includes('--no-typecheck'),
  }
}

/**
 * Build the `git fetch` arguments for pinning a tag. The remote is required: without it git reads
 * the first non-option argument as the repository name and fails with
 * `fatal: 'tag' does not appear to be a git repository` — which is exactly how this tool broke the
 * first time it was invoked without `--remote` (2026-09-25, the 0.1.7-rc.2 upgrade).
 *
 * @param tag - Release tag to fetch.
 * @param remote - Remote name or URL; defaults to `origin`.
 */
export function fetchArguments(tag, remote = 'origin') {
  return ['fetch', '--depth', '1', '--force', remote, 'tag', tag]
}

const git = args => execFileSync('git', ['-C', vendorDsh, ...args], { encoding: 'utf8' }).trim()
const run = (command, args) => execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit' })

/** Run the pin move: fetch, check out, record the pin, typecheck, then claim compatibility. */
export function main(argv = process.argv.slice(2)) {
  const { tag, remote, typecheck } = parseArguments(argv)
  if (tag === undefined || tag.trim().length === 0) {
    console.error('usage: pnpm sync-dsh -- --tag <dsh-release-tag> [--remote <url>] [--no-typecheck]')
    process.exit(2)
  }

  console.log(`\n▸ fetching ${tag}`)
  // A shallow pin only carries the tag it was cloned at, so the next tag must be fetched explicitly.
  git(fetchArguments(tag, remote))
  git(['checkout', '--detach', tag])
  const sha = git(['rev-parse', 'HEAD'])
  const committed = git(['log', '-1', '--format=%cs'])
  console.log(`  ok   ${tag} → ${sha} (${committed})`)

  console.log('\n▸ recording the pin in vendor/UPSTREAM.md')
  const upstream = readFileSync(upstreamFile, 'utf8')
  let updated
  try {
    updated = applyUpstreamRecord(upstream, { tag, sha, committed })
  } catch (error) {
    console.error(`\n  FAIL ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
  writeFileSync(upstreamFile, updated, 'utf8')
  console.log('  ok   UPSTREAM.md updated')

  if (typecheck) {
    console.log('\n▸ typechecking against the new pin')
    try {
      run('pnpm', ['run', 'typecheck'])
      console.log('  ok   no API drift')
    } catch {
      console.error('\n  FAIL typecheck failed: the new pin changed an API this plugin uses.')
      console.error('       Fix the call sites, then re-run `pnpm typecheck`. The pin stays where it is')
      console.error('       until the code compiles against it. No compatibility claim was recorded.')
      process.exit(1)
    }
  }

  // The "verified" claim is a fact about a passed typecheck, written only after one — never a
  // side effect of moving the pin (scripts/sync-bookkeeping.mjs releaseClaim pins this rule).
  const claim = releaseClaim({ typecheckRequested: typecheck, typecheckPassed: true })
  if (claim.value !== undefined) {
    console.log('\n▸ adding a compatibility column')
    const manifest = JSON.parse(readFileSync(packageManifest, 'utf8'))
    const release = tag.replace(/^dsh-v/, '')
    manifest.dsh.compatibility.dshReleases[release] = claim.value
    writeFileSync(packageManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    console.log(`  ok   dsh.compatibility.dshReleases["${release}"] = ${claim.value}`)
  } else {
    console.log('\n▸ compatibility column NOT written')
    console.log(`  ${claim.reason}`)
  }

  console.log(`
sync-dsh: pinned ${tag} (${sha})

Next, in the same change:
  0. REBUILD THE VENDOR TREE — vendor lib/ is gitignored build output, so after moving the pin it is
     stale (and a newly added package has no lib/ at all). Anything that resolves @deepseek-ai/*
     through node_modules — vitest, plugin-added profiles — would silently run the OLD pin:
       pnpm --dir vendor/dsh install
       pnpm --dir vendor/dsh run build:native-system && pnpm --dir vendor/dsh run build:lib
     (dev/setup.sh checks this; the runtime launch resolves vendor src via tsconfig.tsx.json, which is
     why a stale lib/ does not show up until the tests or a boot.)
  1. Re-run the mechanism checks this plugin depends on, e.g.
       git -C vendor/dsh grep -c customSkillDirs ${tag} -- packages/skill/skill-filesystem/src/index.ts
  2. pnpm verify && pnpm test
  3. pnpm build && pnpm release-smoke
  4. Re-check the inherited discipline table row by row against the new pin: docs/discipline.md
      (DSH's own practices evolve; the inheritance must move with the pin).
  5. Move the note in notes/proposed/ to notes/implemented/ if this upgrade was its subject.
`)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
