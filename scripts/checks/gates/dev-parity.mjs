/**
 * Dev-channel parity: the fast loop's differences from the user's install path are registered in
 * one table, and the two mechanisms the table names stay wired — a dev-only `--patch` overlay
 * (no profile user-layer writes) and a tarball lane for the install breakpoint.
 *
 * The table is prose and its rows are reviewed by people; this core only owns what a machine can
 * answer: the section exists, it carries enough mechanism rows, it names the lane and the overlay,
 * and the scripts it names still exist and are still shaped that way. Keep the judgments out.
 *
 * @param {object} input
 * @param {string} input.devDoc - docs/dev.md text.
 * @param {string} input.setupScript - dev/env/setup.sh text.
 * @param {string} input.launcher - dev/env/dsh.mjs text.
 * @param {string} input.commandsDoc - docs/commands.md text.
 * @param {string} input.testingDoc - docs/testing.md text.
 * @param {boolean} input.laneExists - scripts/release/install-parity.mjs exists.
 * @param {Record<string, string>} input.scripts - root package.json scripts.
 * @returns {string[]} one problem per broken invariant; empty means the contract is wired.
 */
export function devParityProblems({ devDoc, setupScript, launcher, commandsDoc, testingDoc, laneExists, scripts }) {
  const problems = []
  const heading = '## 十、与产品安装路径的 parity'
  const start = devDoc.indexOf(heading)
  if (start === -1) {
    return [`docs/dev.md has no "${heading}" section — the dev-channel differences need one registered home`]
  }
  const rest = devDoc.slice(start + heading.length)
  const nextHeading = rest.search(/^## /m)
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading)

  // Header + separator are not mechanism rows; every other pipe line in the section is one.
  const rows = section.split('\n').filter(line => /^\|/.test(line.trim()) && !/^\|[\s:|-]+\|$/.test(line.trim()))
  const mechanismRows = rows.filter(line => !line.includes('机制点'))
  // The load-bearing set, by the words each row's first column uses. A count alone would let a
  // reworded or deleted row hide behind a spare one, so the judge pins the eight mechanisms the
  // user's install path actually goes through (2026-11-02).
  const loadBearing = [
    ['profile 创建', 'profile creation'],
    ['安装源', 'install source'],
    ['包字节', 'package bytes'],
    ['依赖闭包', 'dependency closure'],
    ['写入者', 'roster/bundles writer'],
    ['默认 preset', 'default preset'],
    ['profile 用户层', 'profile user layer'],
    ['引擎门', 'engine gate'],
  ]
  for (const [word, label] of loadBearing) {
    if (!mechanismRows.some(line => line.includes(word))) {
      problems.push(`docs/dev.md's parity table has no row for ${label} ("${word}") — the eight mechanisms the install path goes through must each stay registered`)
    }
  }
  if (mechanismRows.length < 8) {
    problems.push(`docs/dev.md's parity table carries ${mechanismRows.length} mechanism row(s); the load-bearing set is install source, package bytes, dependency closure, roster writer, default preset, profile user layer, engine gate and runtime (>= 8)`)
  }
  for (const required of ['install-parity', 'dev-overlay-', 'dev-parity']) {
    if (!section.includes(required)) {
      problems.push(`the parity section does not name ${required} — each row's enforcement/evidence must be answerable from the table`)
    }
  }

  // The old shape wrote the profile user layer directly; the overlay is what replaced it. A
  // regression normally restores one of these two lines, which is what the fixture pins.
  if (/>>\s*"\$dir\/cordis\.patch\.yml"/.test(setupScript) || /cp\s+[^\n]*"\$dir\/cordis\.patch\.yml"/.test(setupScript)) {
    problems.push('dev/env/setup.sh writes the profile cordis.patch.yml directly — dev-only rows belong in the --patch overlay')
  }
  if (!setupScript.includes('dev-overlay-')) problems.push('dev/env/setup.sh does not generate a dev overlay')
  if (!launcher.includes('dev-overlay-') || !launcher.includes('--patch')) {
    problems.push('dev/env/dsh.mjs does not inject the dev overlay as --patch')
  }

  if (!laneExists) problems.push('scripts/release/install-parity.mjs is missing — the install breakpoint has no dev-loop lane')
  if (typeof scripts?.['install-parity'] !== 'string') problems.push('package.json has no install-parity script')
  if (!commandsDoc.includes('install-parity')) problems.push('docs/commands.md does not list install-parity')
  if (!testingDoc.includes('install-parity')) problems.push('docs/testing.md evidence map does not name install-parity')
  return problems
}
