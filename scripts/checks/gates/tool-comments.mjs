/**
 * Gate core: tool names mentioned in composition comments must exist in the generated catalog.
 *
 * Why: `cordis.patch.yml` carried a hand-written list of the self-owned tools, and it went two
 * tools short when `assistant_operating` and `assistant_recall` shipped. The list is now a pointer
 * (one fact, one home), but comments still name tools; a rename that misses one leaves a stale
 * name a reader will trust. The catalog is generated from the tool rows, so it is the authority.
 *
 * Scope is comment lines only: YAML row ids are hyphenated (`assistant-memory-tool`) and prose
 * descriptions may name tools as part of their text; neither is a second list. The check is
 * deliberately narrow so it cannot fire on a legitimate mention.
 *
 * @param options - `{ yamlText, catalogText, yamlPath, catalogPath }`.
 * @returns problem strings, empty when every comment name is in the catalog.
 */
export function toolCommentNameProblems({
  yamlText,
  catalogText,
  yamlPath = 'cordis.patch.yml',
  catalogPath = 'docs/package-catalog.md',
}) {
  const known = new Set(
    [...String(catalogText).matchAll(/^\|\s*`(assistant_[a-z0-9_]+)`\s*\|/gmu)].map(match => match[1]),
  )
  if (known.size === 0) {
    return [`${catalogPath} lists no assistant_* tool rows — the catalog's tool table changed shape, so comment names cannot be checked`]
  }
  const problems = []
  for (const [index, line] of String(yamlText).split('\n').entries()) {
    if (!/^\s*#/u.test(line)) continue
    for (const match of line.matchAll(/\bassistant_[a-z0-9_]+\b/gu)) {
      if (!known.has(match[0])) {
        problems.push(`${yamlPath}:${index + 1} names \`${match[0]}\` in a comment, but ${catalogPath} lists no such tool — the comment outlived the tool`)
      }
    }
  }
  return problems
}
