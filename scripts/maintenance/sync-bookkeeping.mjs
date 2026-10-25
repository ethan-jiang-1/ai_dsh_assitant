/**
 * Pure bookkeeping transforms for `pnpm sync-dsh`, extracted so the upgrade script's two
 * fragile spots are fixture-testable without ever really moving the pin
 * (packages/dsh-smart-assistant/tests/tooling/sync-bookkeeping.spec.mjs):
 *   · applyUpstreamRecord — rewriting the vendor/UPSTREAM.md bookkeeping rows. A missing row
 *     means the table drifted; silently returning unchanged text would record a lie, so the
 *     transform refuses instead of no-oping.
 *   · releaseClaim — the rule that `release-verification.json`'s "verified" value is a claim
 *     about a passed typecheck, and therefore only exists after one. A skipped (--no-typecheck)
 *     or failed check records no claim at all — never a success declaration
 *     (development-foundation remediation, direction 五-1, 2026-09-24).
 */

/**
 * Rewrite the pin rows of a vendor/UPSTREAM.md table: pinned tag, exact SHA, tag commit date.
 *
 * @param {string} text - current UPSTREAM.md content.
 * @param {{ tag: string, sha: string, committed: string }} record - the new pin facts.
 * @returns {string} the updated content.
 * @throws when any bookkeeping row is missing (refuses to write silently-wrong bookkeeping).
 */
export function applyUpstreamRecord(text, { tag, sha, committed }) {
  const rules = [
    [/(\| 钉住的 tag \| )`[^`]*`( \|)/, `$1\`${tag}\`$2`, '钉住的 tag'],
    [/(\| 精确 SHA \| )`[^`]*`( \|)/, `$1\`${sha}\`$2`, '精确 SHA'],
    [/(\| tag 提交时间 \| )[^|]*(\|)/, `$1${committed} $2`, 'tag 提交时间'],
  ]
  let updated = text
  for (const [pattern, replacement, row] of rules) {
    if (!pattern.test(updated)) {
      throw new Error(`vendor/UPSTREAM.md is missing the "${row}" row — update scripts/sync-bookkeeping.mjs for the new table shape`)
    }
    updated = updated.replace(pattern, replacement)
  }
  return updated
}

/**
 * Decide what the repo-only `release-verification.json` should claim about a release.
 * "verified" is only recorded after a typecheck that ran and passed; a skipped or failed check
 * records no claim (the caller prints the reason instead).
 *
 * @param {{ typecheckRequested: boolean, typecheckPassed: boolean }} outcome.
 * @returns {{ value: 'verified' | undefined, reason: string | undefined }}
 */
export function releaseClaim({ typecheckRequested, typecheckPassed }) {
  if (!typecheckRequested) {
    return { value: undefined, reason: '--no-typecheck: nothing was verified, so release-verification.json records no claim — run `pnpm typecheck` against this pin, then re-run sync-dsh without --no-typecheck' }
  }
  if (!typecheckPassed) {
    return { value: undefined, reason: 'typecheck failed — release-verification.json records no claim until the code compiles against the new pin' }
  }
  return { value: 'verified', reason: undefined }
}

/**
 * Whether the repo's pinned pnpm matches the one the new pin declares, and what to change if not.
 *
 * Why this is here: the vendor packages run their own `bundle` scripts through corepack, which
 * refuses `run` when `packageManager` disagrees with the workspace it is invoked in. On the
 * 0.2.1-rc.2 move (2026-10-19) that surfaced as 12 client packages failing to rebuild under
 * `[ERROR] This project is configured to use 11.28.5 of pnpm. Your current pnpm is v11.7.0`, a
 * symptom whose cause is nowhere near the code being rebuilt. Aligning the root pin before the
 * typecheck keeps the failure from being misread as API drift.
 *
 * @param {{ root: string | undefined, vendor: string | undefined }} versions - the two
 *   `packageManager` fields, verbatim (e.g. `pnpm@11.28.5`).
 * @returns {{ aligned: boolean, target: string | undefined }} `target` is the root value to adopt
 *   when unaligned; undefined when the vendor side declares nothing to align to.
 */
export function pnpmAlignment({ root, vendor }) {
  if (vendor === undefined || vendor.trim().length === 0) return { aligned: true, target: undefined }
  if (root === vendor) return { aligned: true, target: vendor }
  return { aligned: false, target: vendor.trim() }
}

/**
 * The pinned DSH tag from a vendor/UPSTREAM.md bookkeeping table, or undefined.
 *
 * Single owner of that row's parse: five call sites had grown three handwritten regexes for
 * the same fact (verify's pin and dependency-pose gates, the export manual, gen-catalog), so
 * a table-shape change would have rotted them at three different speeds. The strict full-row
 * form is the one the export manual and its verify gate already required; the looser forms
 * agreed with it on every well-formed file and only diverged on files that were already red.
 *
 * @param {string} text - vendor/UPSTREAM.md content.
 * @returns {string | undefined} the tag inside the `钉住的 tag` row.
 */
export function pinnedTagFrom(text) {
  return /^\| 钉住的 tag \| `([^`|]+)` \|$/m.exec(text)?.[1]?.trim()
}
