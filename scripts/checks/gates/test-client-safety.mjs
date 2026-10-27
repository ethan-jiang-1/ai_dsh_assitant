/**
 * Gate cores for the tests-tree asset shapes and the client bundle's
 * classic-script safety.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { read } from './shared.mjs'

/**
 * Test-asset naming: the file shapes under the package tests tree and the web-face scene
 * tree must match the naming table in docs/testing.md ("新增测试资产形态先入本表再落文件").
 * Code files that are neither spec nor harness would still RUN or sit silently outside
 * every lane's vocabulary — the gate makes the table's rule mechanical. `fixtures/`-style
 * subdirectories are exempt (the upstream convention for fixture trees); they join the
 * table when one actually appears. Web-face scenes must carry their contract files
 * (snapshot.yml + README.md, per snapshots/AGENTS.md) or a year later nobody can replay
 * them.
 */
export function testAssetNamingProblems(repoRoot) {
  const problems = []
  const testsDir = join(repoRoot, 'packages', 'dsh-smart-assistant', 'tests')
  if (existsSync(testsDir)) {
    const inspect = (dir, relativeDir = '') => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const relativePath = relativeDir === '' ? entry.name : join(relativeDir, entry.name)
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          // Upstream fixture/support trees are containers, not test lanes. Their contents are
          // intentionally outside the naming vocabulary until a lane adopts them explicitly.
          if (entry.name === 'fixtures' || entry.name === 'support') continue
          inspect(full, relativePath)
          continue
        }
        if (!entry.isFile() || !/\.(ts|mjs|tsx|js)$/.test(entry.name)) continue
        if (/\.spec\.(ts|mjs|tsx|js)$/.test(entry.name)) continue
        if (/harness\.(ts|mjs)$/.test(entry.name)) continue
        problems.push(`packages/dsh-smart-assistant/tests/${relativePath}: not an admitted test-asset shape (*.spec.* / *harness.*) — enter the naming table in docs/testing.md first`)
      }
    }
    inspect(testsDir)
  }
  const webFace = join(repoRoot, 'snapshots', 'web-face')
  if (existsSync(webFace)) {
    for (const scenario of readdirSync(webFace)) {
      const dir = join(webFace, scenario)
      if (!statSync(dir).isDirectory()) {
        problems.push(`snapshots/web-face/${scenario}: a scene is a directory, not a loose file`)
        continue
      }
      for (const required of ['snapshot.yml', 'README.md']) {
        if (!existsSync(join(dir, required))) {
          problems.push(`snapshots/web-face/${scenario}: missing ${required} — the scene contract must be recorded beside the fixture (snapshots/AGENTS.md)`)
        }
      }
    }
  }
  return problems
}

/**
 * A committed web-face expectation is a baseline, not a screenshot: it must be a complete,
 * quiet, non-empty capture, and the scenario's readiness token must actually appear in it.
 * The refresh path has its own health gate; this is the other side — a bad baseline that
 * slipped in earlier should fail verify, not quietly become the reference forever.
 *
 * A scene without `expected.dom.json` is a draft, not a runnable scenario; skip it here
 * (the naming gate above still requires its contract files). The token is read from the
 * `runner:` line of `snapshot.yml`; the README remains the executable contract owner.
 *
 * @param {string} repoRoot - repository root.
 * @returns {string[]} problem strings (empty = pass).
 */
export function webFaceExpectedHealthProblems(repoRoot) {
  const problems = []
  const webFace = join(repoRoot, 'snapshots', 'web-face')
  if (!existsSync(webFace)) return problems
  for (const scenario of readdirSync(webFace)) {
    const dir = join(webFace, scenario)
    if (!statSync(dir).isDirectory()) continue
    const expectedPath = join(dir, 'expected.dom.json')
    if (!existsSync(expectedPath)) continue
    let evidence
    try {
      evidence = JSON.parse(read(expectedPath))
    } catch {
      problems.push(`snapshots/web-face/${scenario}/expected.dom.json: not valid JSON`)
      continue
    }
    const where = `snapshots/web-face/${scenario}/expected.dom.json`
    if (evidence?.readyState !== 'complete') {
      problems.push(`${where}: readyState is ${JSON.stringify(evidence?.readyState)}, expected "complete"`)
    }
    for (const field of ['consoleErrors', 'networkFailures']) {
      if (!Array.isArray(evidence?.[field]) || evidence[field].length > 0) {
        problems.push(`${where}: ${field} must be an empty array`)
      }
    }
    if (typeof evidence?.visibleText !== 'string' || evidence.visibleText.trim() === '') {
      problems.push(`${where}: visibleText is empty — a blank page is not a baseline`)
    }
    if (!Array.isArray(evidence?.controls) || evidence.controls.length === 0) {
      problems.push(`${where}: controls is empty — the capture does not look like a rendered page`)
    }
    const snapshotPath = join(dir, 'snapshot.yml')
    if (existsSync(snapshotPath)) {
      const snapshot = read(snapshotPath)
      // `wait_text` is the machine-readable field. The runner fallback keeps a pre-2026-10-28
      // draft readable, but the runner line is now only a README pointer, not a command.
      const token = /^wait_text:\s*'([^']+)'/mu.exec(snapshot)?.[1]
        ?? /^runner:.*--wait-text\s+'([^']+)'/mu.exec(snapshot)?.[1]
      if (token !== undefined && typeof evidence?.visibleText === 'string' && !evidence.visibleText.includes(token)) {
        problems.push(`${where}: wait token ${JSON.stringify(token)} from snapshot.yml is not in visibleText`)
      }
    }
  }
  return problems
}

// ── client classic-script safety ─────────────────────────────────────────────────────────────────

/** Recursively collect .ts files under a directory (the client source tree is flat today). */
function collectTsFiles(directory) {
  const out = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...collectTsFiles(full))
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

/**
 * The browser half's classic-script safety, end to end (S2, 261007 bigfile-split).
 *
 * Since tsdown took over the client build, `src/client` is a multi-module source tree and the
 * served artifact is the ONE classic script the entry compiles to (`lib/client/index.js`).
 * The old per-file "no imports/exports at all" shape is gone; what still breaks the page is:
 *   1. an empty src/client — package.json's dsh.client declaration promises a browser half;
 *   2. a BARE EXTERNAL runtime import in any module (`from '<not ./ ../>'`, or a bare
 *      `import '<not ./ ../>'`): every runtime dependency must come through the factory's
 *      module-table require (runtime.ts), or the bundle either leaves it external (parse
 *      error in the combo) or inlines code the page already carries. Relative imports are
 *      expected — the bundler inlines them. Type-only imports in the `import type` form are
 *      erased at emit and stay allowed (inline `{ type X }` specifiers are NOT exempt — the
 *      unambiguous form is the gate). Runtime exports between modules are fine: the bundler
 *      inlines them, and only the entry submits its surface, through `__ModuleLoader__.load`,
 *      which the entry module must still name;
 *   3. a bundle that exists but does not parse as a classic script or lost the facade call —
 *      `new Function` is the honest check (`node --check` is a false negative under Node's
 *      module-syntax detection). A missing lib is not a failure: verify runs on fresh clones
 *      before the first build, and the source gate above is always active.
 *
 * @param {{ clientDir: string, bundlePath: string }} paths - the client source tree and the
 *   expected single-file bundle.
 * @returns {string[]} problem strings (empty = pass).
 */
export function clientScriptSafetyProblems({ clientDir, bundlePath }) {
  const problems = []
  const files = existsSync(clientDir) ? collectTsFiles(clientDir) : []
  if (files.length === 0) {
    return ['src/client is empty — the dsh.client declaration in package.json promises a browser half']
  }
  for (const path of files) {
    const where = `src/client/${relative(clientDir, path)}`
    const text = read(path)
    // Clause imports: `import x from 'y'` / `import * as ns from 'y'` / `import { a } from 'y'`
    // (braces may span lines, hence the [^'"]+ which crosses newlines). `import type` is exempt.
    for (const match of text.matchAll(/^[ \t]*import\s+(?!type\b)[^'"]+?from\s*['"]([^'"]+)['"]/gm)) {
      if (!/^[.]{1,2}\//.test(match[1])) {
        problems.push(`${where} has a bare external runtime import ('${match[1]}') — the browser half takes every runtime dependency through the factory require; only relative imports and import type are allowed`)
      }
    }
    // Bare side-effect imports: `import 'y'`.
    for (const match of text.matchAll(/^[ \t]*import\s*['"]([^'"]+)['"]/gm)) {
      if (!/^[.]{1,2}\//.test(match[1])) {
        problems.push(`${where} has a bare external side-effect import ('${match[1]}') — the browser half takes every runtime dependency through the factory require`)
      }
    }
    if (path === join(clientDir, 'index.ts') && !text.includes('__ModuleLoader__')) {
      problems.push(`${where} never touches __ModuleLoader__ — the entry must submit a factory registration through the page-global facade`)
    }
  }
  // A missing bundle is not a failure (fresh clones have no lib yet); when it exists it must
  // carry the facade call and parse as a classic script.
  if (existsSync(bundlePath)) {
    const bundle = read(bundlePath)
    if (!bundle.includes('__ModuleLoader__')) {
      problems.push('lib/client/index.js never touches __ModuleLoader__ — run pnpm build after changing the browser half')
    }
    try {
      void new Function(bundle)
    } catch (error) {
      problems.push(`lib/client/index.js does not parse as a classic script (${String(error)}) — the combo it rides in would kill every later registration at browser boot`)
    }
  }
  return problems
}
