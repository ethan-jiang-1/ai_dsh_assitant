/**
 * Pure bookkeeping transforms for `pnpm sync-dsh`, extracted so the upgrade script's two
 * fragile spots are fixture-testable without ever really moving the pin
 * (packages/dsh-smart-assistant/tests/tooling/sync-bookkeeping.spec.mjs):
 *   · applyUpstreamRecord — rewriting the vendor/UPSTREAM.md bookkeeping rows. A missing row
 *     means the table drifted; silently returning unchanged text would record a lie, so the
 *     transform refuses instead of no-oping.
 *   · releaseClaim — the rule that the manifest's `dsh.compatibility.dshReleases` "verified"
 *     value is a claim about a passed typecheck, and therefore only exists after one. A
 *     skipped (--no-typecheck) or failed check records no claim at all — never a success
 *     declaration (development-foundation remediation, direction 五-1, 2026-09-24).
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
 * Decide what the package manifest's `dsh.compatibility.dshReleases` should claim about a
 * release. "verified" is only recorded after a typecheck that ran and passed; a skipped or
 * failed check records no claim (the caller prints the reason instead).
 *
 * @param {{ typecheckRequested: boolean, typecheckPassed: boolean }} outcome.
 * @returns {{ value: 'verified' | undefined, reason: string | undefined }}
 */
export function releaseClaim({ typecheckRequested, typecheckPassed }) {
  if (!typecheckRequested) {
    return { value: undefined, reason: '--no-typecheck: nothing was verified, so the manifest records no claim — run `pnpm typecheck` against this pin, then add dsh.compatibility.dshReleases yourself (or re-run sync-dsh without --no-typecheck)' }
  }
  if (!typecheckPassed) {
    return { value: undefined, reason: 'typecheck failed — the manifest records no claim until the code compiles against the new pin' }
  }
  return { value: 'verified', reason: undefined }
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
