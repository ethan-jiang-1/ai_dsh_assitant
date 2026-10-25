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

/**
 * Paths a build or a run creates. A tracked one carries this machine's state into every clone:
 * it either differs from what another machine builds, or silently shadows a rebuild.
 */
const RESIDUE_PATH = /^(?:packages\/[^/]+\/(?:lib|dist)\/|node_modules\/|\.pnpm-store\/|\.tmp\/|coverage\/|dev\/harness-home\/|dev\/trial-home[^/]*\/|\.desk\/|\.pi\/)|(?:^|\/)\.DS_Store$|\.tsbuildinfo$/

/**
 * Judge the tracked list against the residue shape and the size ceiling: a file that only exists
 * after a build or a run, or one big enough to be a dump, is not content the repo owns. The
 * allowlist is for pinned evidence whose size is the point (it needs a reason at the call site).
 * @param {{ files: Array<{path: string, size: number}>, limitBytes?: number, allow?: string[] }} inputs
 * @returns {string[]} one problem per tracked residue path or oversized blob.
 */
export function trackedContentProblems({ files, limitBytes = 1024 * 1024, allow = [] }) {
  const allowed = new Set(allow)
  const problems = []
  for (const { path, size } of files) {
    if (allowed.has(path)) continue
    if (RESIDUE_PATH.test(path)) {
      problems.push(`${path} is build or runtime residue — keep it ignored and recreate it with the documented command`)
      continue
    }
    if (size > limitBytes) {
      problems.push(`${path} is ${size} bytes, above the ${limitBytes}-byte ceiling — large blobs need a deliberate allowlist entry`)
    }
  }
  return problems
}

/**
 * Data/config files are parsed or compared on someone else's machine, so a host-absolute path in
 * one breaks portability. Recorded session corpora are the documented exception: they keep what
 * the recorder saw, and their consumers derive assistant turns rather than compare request text.
 * @param {string[]} tracked - repo-relative paths as reported by git.
 * @returns {string[]} the subset that must stay machine-independent.
 */
export function trackedDataPaths(tracked) {
  return tracked.filter(path =>
    /\.(?:json|jsonl|ya?ml)$/.test(path)
    && !/^dev\/fixtures\/.+\/session\.[^/]+\.jsonl$/.test(path))
}
