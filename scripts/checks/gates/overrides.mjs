/**
 * Vendor-row override ledger judge.
 *
 * Why it exists: a bundle patch that names a vendor row by bare `id` is an **override target**. When
 * the target is missing (the row was renamed, moved to another bundle, or the profile does not carry
 * that bundle) the loader prints one `entry not found` warning and the row simply does not exist —
 * the bundle stays in the roster and looks installed. That silence is the failure this gate denies:
 * every bare-id override must have a ledger entry that states what it changes, how to re-check it,
 * and when to retire it, so a pin bump cannot quietly strand one.
 *
 * The judged contract lives in `docs/product.md` §十 (the ledger table). Rows re-declared under
 * `insert:` with a vendor id are listed there for humans, but they are not the risky class: an insert
 * creates its row, so a missing target cannot hide.
 *
 * @module scripts/checks/gates/overrides
 */

/** Row ids a top-level bare `- id:` names — override targets, not inserted rows. */
function bareOverrideIds(patchText) {
  const ids = []
  let inserted = false
  for (const line of patchText.split('\n')) {
    if (/^- insert:\s*$/.test(line)) { inserted = true; continue }
    const top = /^- id:\s*(\S+)\s*$/.exec(line)
    if (top !== null) {
      inserted = false
      ids.push(top[1])
      continue
    }
    // A new top-level mapping that is not an insert ends the inserted block.
    if (/^-\s/.test(line) && !/^-\s+id:/.test(line)) inserted = false
  }
  return ids
}

/** Ids named in the ledger table's first column (`| \`row-id\` | …`). */
function ledgerIds(docText) {
  const ids = []
  for (const line of docText.split('\n')) {
    const cell = /^\|\s*`([a-z0-9][a-z0-9-]*)`\s*\|/.exec(line)
    if (cell !== null && !ids.includes(cell[1])) ids.push(cell[1])
  }
  return ids
}

/**
 * @param input - `{ patchText, docText }` for this package's patch and the product contract.
 * @returns problem strings; empty means every bare override is accounted for.
 */
export function overrideLedgerProblems({ patchText, docText }) {
  const problems = []
  const bare = bareOverrideIds(patchText)
  const ledger = ledgerIds(docText)
  for (const id of bare) {
    if (!ledger.includes(id)) {
      problems.push(`cordis.patch.yml overrides "${id}" by bare id but docs/product.md §十 has no ledger entry — a missing target would only warn`)
    }
  }
  for (const id of ledger) {
    if (!patchText.includes(`- id: ${id}`) && !patchText.includes(`- id: '${id}'`)) {
      problems.push(`docs/product.md §十 lists "${id}" but cordis.patch.yml never declares it — the ledger has drifted from the patch`)
    }
  }
  return problems
}
