/**
 * Gate core about what a commit must and must not carry: development residue (dev home, sessions,
 * installed modules, built lib) and credentials stay ignored, while the files the repo depends on
 * stay tracked. The runner supplies the lists and the ignore predicate (a `git check-ignore` call,
 * which is I/O); the core only judges the answers.
 */

/**
 * Judge the two lists against one ignore predicate.
 * @param {{ mustIgnore: string[], mustTrack: string[], isIgnored: (path: string) => boolean }} inputs -
 * paths that must be ignored, paths that must be tracked, and the predicate answering for one path.
 * @returns {string[]} one problem per wrongly-unignored or wrongly-ignored path.
 */
export function commitSafetyProblems({ mustIgnore, mustTrack, isIgnored }) {
  const problems = []
  for (const path of mustIgnore) if (!isIgnored(path)) problems.push(`${path} must be ignored but is not`)
  for (const path of mustTrack) if (isIgnored(path)) problems.push(`${path} must be tracked but is ignored`)
  return problems
}
