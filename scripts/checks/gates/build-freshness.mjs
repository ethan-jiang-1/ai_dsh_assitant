/**
 * Gate cores for one question: **does the artifact the presets load still match the sources?**
 *
 * Why the family exists: every preset row and every `exports` entry points at the BUILT `lib/`,
 * while the specs that run in `pnpm test` import `src/`. A source change that was never rebuilt is
 * therefore invisible to the test suite and silently serves the previous behaviour — the artifact
 * registry in `docs/dev.md` §二 admitted this row had 「无独立 freshness 门禁」 and left the
 * reminder in prose ("改 src 后必跑 `pnpm build`"), which is exactly the kind of fact this repo
 * makes a machine answer instead of a person remembering.
 *
 * Why CONTENT and never mtime — the reason this core is *not* shaped like its vendor sibling
 * (`vendorClientFreshnessProblems`, which compares mtimes and is right to: those faces are rebuilt
 * wholesale by `prepare.sh` and nothing touches their sources in between):
 *   · `tsc -b` records a sha256 of every input in `tsconfig.tsbuildinfo`, so a file that was
 *     touched but not edited leaves the build up to date. Measured 2026-10-18: an mtime sweep of
 *     `src/` against `lib/` reported 9 stale files, and all 9 were false — the sources had merely
 *     been rewritten with identical content at some point.
 *   · `lib/client/*.js` outside the bundle are dead files by design (tsdown runs `clean: false`
 *     and emits only `index.js`), so any sweep that walks them will report drift forever.
 * So this family asks the two builders themselves: `tsc -b --dry` answers for the host face in its
 * own words, and the client face is settled by rebuilding the bundle and comparing bytes.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Report the faces of one package whose built `lib/` no longer matches `src/`.
 *
 * A package with no `lib/` at all is *unprepared*, not stale: a fresh clone has no artifacts until
 * `pnpm build`, and `dev/env/prepare.sh` / `release-smoke` own that state. Same carve-out the
 * vendor sibling and the client-script gate make, and it keeps `pnpm verify` green on a fresh clone.
 *
 * @param {object} input
 * @param {string} input.packageDir - absolute path of the package whose `lib/` is loaded.
 * @param {string} input.scratchDir - absolute directory the bundle comparison may build into
 *   (the caller owns where scratch lives; under this repo that is always `.tmp/` — hard rule 8).
 * @param {string} [input.binDir] - directory holding the `tsc` / `tsdown` binaries; defaults to the
 *   package's own `node_modules/.bin`, and fixtures point it at the repo's copy.
 * @param {string} [input.label] - how the package is named in diagnostics (a repo-relative path).
 * @returns {string[]} problem strings; empty = every built face matches its sources.
 */
export function packageBuildFreshnessProblems({
  packageDir,
  scratchDir,
  binDir = join(packageDir, 'node_modules', '.bin'),
  label = packageDir,
}) {
  if (!existsSync(join(packageDir, 'lib'))) return []
  return [
    ...hostFaceProblems({ packageDir, binDir, label }),
    ...clientFaceProblems({ packageDir, binDir, scratchDir, label }),
  ]
}

/**
 * The host face: `lib/**` from `tsc -b`. `--dry` is the compiler's own up-to-date judgment and
 * distinguishes the two states an mtime probe conflates —
 *   `would build project …`            → inputs differ from what was emitted (real drift)
 *   `would update timestamps for …`    → content matches, only mtime bookkeeping (benign)
 * A missing verdict is reported instead of passing: an unrunnable check is not a green one
 * (`scripts/AGENTS.md` 纪律 3).
 */
function hostFaceProblems({ packageDir, binDir, label }) {
  const tsconfig = join(packageDir, 'tsconfig.json')
  if (!existsSync(tsconfig)) return []
  const tsc = join(binDir, 'tsc')
  const argv = ['-b', tsconfig, '--dry']
  // The verdict is matched by the QUOTED PROJECT PATH, not by a phrase: tsc spells the up-to-date
  // case "Project '…' is up to date" (capital P) and the stale case "A non-dry build would build
  // project '…'" (lowercase) — matching either word misses the other state, and the miss lands in
  // the UNKNOWN branch looking exactly like a blocked check.
  const marker = `'${resolve(tsconfig)}'`
  let output = ''
  try {
    output = execFileSync(tsc, argv, { cwd: packageDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    // A non-zero exit still carries the report; read it before giving up on a verdict.
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`
    if (!output.includes(marker)) {
      return [`\`${label}\`: \`tsc -b … --dry\` could not report a verdict (${String(error.message).split('\n')[0]}) — the host face's freshness is UNKNOWN, fix that first`]
    }
  }
  const verdict = output.split('\n').find(line => line.includes(marker))
  if (verdict === undefined) {
    return [`\`${label}\`: \`tsc -b … --dry\` named no verdict for ${label}/tsconfig.json — the host face's freshness is UNKNOWN`]
  }
  if (verdict.includes('would build project')) {
    return [`\`${label}/lib\` is behind \`src\` — the compiler would rebuild it, so anything loading this package (preset rows, composition tests, release-smoke) is serving the previous source: run \`pnpm build\``]
  }
  return []
}

/**
 * The client face: `lib/client/index.js`, the single classic-script bundle the web shell
 * concatenates. It has no incremental record — tsdown rebuilds it whole — so the only honest
 * freshness question is "would a fresh build produce these same bytes?", and the answer is cheap
 * (≈100 ms, deterministic: the bundle carries no timestamps). Only `index.js` is compared: the
 * emitted `.map` names `sources` relative to the output directory, so it differs across output
 * paths by construction.
 */
function clientFaceProblems({ packageDir, binDir, scratchDir, label }) {
  const entry = join(packageDir, 'src', 'client', 'index.ts')
  const built = join(packageDir, 'lib', 'client', 'index.js')
  if (!existsSync(entry) || !existsSync(built)) return []
  const tsdown = join(binDir, 'tsdown')
  try {
    execFileSync(tsdown, ['--out-dir', scratchDir, '--logLevel', 'silent'], { cwd: packageDir, stdio: 'ignore' })
  } catch (error) {
    return [`\`${label}\`: the client bundle could not be rebuilt for comparison (${String(error.message).split('\n')[0]}) — its freshness is UNKNOWN`]
  }
  const rebuilt = join(scratchDir, 'index.js')
  if (!existsSync(rebuilt)) {
    return [`\`${label}\`: rebuilding the client bundle into the scratch directory produced no index.js — its freshness is UNKNOWN`]
  }
  if (!readFileSync(rebuilt).equals(readFileSync(built))) {
    return [`\`${label}/lib/client/index.js\` does not match a fresh build of \`src/client\` — the browser face serves the previous bundle. This is also what a bare \`pnpm typecheck\` leaves behind (it re-emits ESM over the classic bundle): run \`pnpm build\``]
  }
  return []
}
