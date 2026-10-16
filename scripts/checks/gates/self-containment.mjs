import { dirname, relative, resolve } from 'node:path'

/**
 * Gate core about the published package's self-containment: the tarball has no repo around it,
 * so nothing under the published surface may reach outside the package directory, and no published
 * file may depend on the `vendor/` submodule (which is not shipped).
 */

/**
 * Judge the published file set for escapes: a relative import resolving outside the package
 * directory, or any mention of `vendor/`, breaks the tarball a user installs.
 * @param {{ repoRoot: string, packageDir: string, files: { path: string, text: string }[] }} inputs -
 * the published files, already read by the runner.
 * @returns {string[]} one problem per escaping import or vendor mention.
 */
export function selfContainmentProblems({ repoRoot, packageDir, files }) {
  const problems = []
  for (const file of files) {
    const where = relative(repoRoot, file.path)
    // Relative imports are fine as long as they resolve inside the package: `../../` past the
    // package root is the failure being checked.
    for (const match of file.text.matchAll(/from\s+'(\.[^']+)'/g)) {
      const target = resolve(dirname(file.path), match[1])
      if (target !== packageDir && !target.startsWith(`${packageDir}/`)) {
        problems.push(`${where} imports ${match[1]}, which escapes the package`)
      }
    }
    if (/\bvendor\//.test(file.text)) {
      problems.push(`${where} mentions vendor/ — the published package must not depend on the submodule`)
    }
  }
  return problems
}
