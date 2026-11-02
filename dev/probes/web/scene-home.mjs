/**
 * Write profile rows into a scene's throwaway dev profile.
 *
 * Why this exists: `dev/env/setup.sh` seeds a fresh profile's user patch as the header comment
 * plus a YAML **flow sequence** `[]`. A YAML stream cannot contain `[]` followed by block
 * entries, so every scene that appended `- id: …` after the placeholder produced an unparseable
 * patch and the service died before printing its URL (2026-11-03; the whole seeded web-face
 * lane was dark). Five copies of the append logic drifted; this is the one writer.
 *
 * The helper validates the result with the same `yaml` package the loader uses, so a bad row
 * fails at seed time with a parse error instead of at boot with a stack tail.
 *
 * Style: scripts/AGENTS.md — pure ESM, Node built-ins only.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'

/**
 * Append block entries to a profile patch, replacing the fresh-profile `[]` placeholder.
 * @param {string} patchPath - the `profiles/<name>/cordis.patch.yml` to update.
 * @param {readonly string[]} rows - one YAML block entry per string (comments allowed).
 * @returns {string} the text written.
 * @throws when the resulting document is not a parseable YAML stream; the file is left untouched.
 */
export function addProfileRows(patchPath, rows) {
  const current = readFileSync(patchPath, 'utf8')
  const block = rows.join('\n').replace(/\n*$/, '')
  const base = current.replace(/\n*$/, '\n')
  // The placeholder is a whole line; replace it rather than appending after it. A patch that
  // already has entries gets one blank line before the new block (readability, not syntax).
  const next = /^\s*\[\]\s*$/m.test(base)
    ? base.replace(/^\s*\[\]\s*$/m, block)
    : `${base}${/\n\n$/.test(base) ? '' : '\n'}${block}\n`
  // Fail loud before writing: the loader parses this file at boot and a bad patch is opaque there.
  parse(next)
  writeFileSync(patchPath, next)
  return next
}
